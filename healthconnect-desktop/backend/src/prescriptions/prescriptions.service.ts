import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Prescription, PrescriptionStatus } from './entities/prescription.entity';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { FulfilPrescriptionDto } from './dto/fulfil-prescription.dto';
import { StockMovementType } from '../inventory/entities/stock-movement.entity';
import { InventoryService } from '../inventory/inventory.service';
import { PrescriptionMedication } from './entities/prescription-medication.entity';
import { User } from '../common/entities/user.entity';
import { UserRole } from '../common/enums/role.enum';
import * as bcrypt from 'bcryptjs';
import { ActivityService } from '../activity/activity.service';
import { ActivityResourceType } from '../activity/entities/activity-log.entity';
import { UpdatePrescriptionStatusDto } from './dto/update-prescription-status.dto';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(Pharmacy)
    private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(PrescriptionMedication)
    private readonly medicationRepo: Repository<PrescriptionMedication>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly inventoryService: InventoryService,
    private readonly activityService: ActivityService,
  ) {}

  async listOpen(pharmacyId: string) {
    const prescriptions = await this.prescriptionRepo.find({
      where: {
        assignedPharmacy: { id: pharmacyId },
        sentToPharmacy: true,
        status: In([
          PrescriptionStatus.RECEIVED,
          PrescriptionStatus.PREPARING,
          PrescriptionStatus.READY,
        ]),
      },
      relations: ['patient', 'doctor', 'medications'],
      order: { createdAt: 'DESC' },
    });

    return prescriptions.map((prescription) => this.toPrescriptionResponse(prescription));
  }

  async assign(pharmacyId: string, prescriptionId: string, actorId?: string) {
    const pharmacy = await this.pharmacyRepo.findOne({ where: { id: pharmacyId }, relations: ['organization'] });
    const prescription = await this.prescriptionRepo.findOne({ where: { id: prescriptionId } });
    if (!pharmacy || !prescription) {
      throw new NotFoundException('Pharmacy or prescription not found');
    }

    prescription.assignedPharmacy = pharmacy;
    prescription.sentToPharmacy = true;
    prescription.status = PrescriptionStatus.RECEIVED;
    const updated = await this.prescriptionRepo.save(prescription);
    const actor = actorId ? await this.userRepo.findOne({ where: { id: actorId } }) : null;
    await this.activityService.record({
      actor: actor ?? undefined,
      organization: pharmacy.organization,
      resourceType: ActivityResourceType.PRESCRIPTION,
      resourceId: prescription.id,
      action: 'prescription.assign',
      metadata: {
        pharmacyId,
        prescriptionId,
      },
    });
    return this.toPrescriptionResponse(updated);
  }

  async assignByVerificationCode(pharmacyId: string, verificationCode: string, actorId?: string) {
    const prescription = await this.prescriptionRepo.findOne({
      where: { verificationCode },
      relations: ['assignedPharmacy'],
    });
    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return this.assign(pharmacyId, prescription.id, actorId);
  }

  async fulfil(pharmacyId: string, prescriptionId: string, dto: FulfilPrescriptionDto, actorId?: string) {
    const prescription = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId, assignedPharmacy: { id: pharmacyId } },
      relations: ['medications', 'assignedPharmacy'],
    });
    if (!prescription) {
      throw new NotFoundException('Prescription not found for pharmacy');
    }
    if (
      prescription.status !== PrescriptionStatus.READY &&
      prescription.status !== PrescriptionStatus.PREPARING &&
      prescription.status !== PrescriptionStatus.RECEIVED
    ) {
      throw new BadRequestException('Prescription is not ready to be fulfilled.');
    }

    const dispensedIds = dto.dispensedMedications ?? [];
    const hasSelection = dispensedIds.length > 0;
    const medicationsToDispense = hasSelection
      ? prescription.medications.filter((med) => dispensedIds.includes(med.id))
      : prescription.medications;

    for (const medication of medicationsToDispense) {
      const inventoryItem = await this.inventoryRepo.findOne({
        where: { pharmacy: { id: pharmacyId }, name: medication.drugName },
      });

      if (inventoryItem) {
        await this.inventoryService.adjustQuantity(
          pharmacyId,
          inventoryItem.id,
          -1,
          StockMovementType.SALE,
          dto.pharmacistId,
          `Fulfilled prescription ${prescription.verificationCode}`,
        );
      }
    }

    prescription.fulfilledAt = new Date();
    prescription.pickedUpAt = new Date();
    prescription.status = PrescriptionStatus.COMPLETED;
    prescription.statusNotes = dto.pickupNotes ?? dto.notes ?? null;
    prescription.substitutions = dto.substitutions ?? [];
    const saved = await this.prescriptionRepo.save(prescription);
    const actor = actorId ? await this.userRepo.findOne({ where: { id: actorId } }) : null;
    await this.activityService.record({
      actor: actor ?? undefined,
      organization: prescription.assignedPharmacy?.organization,
      resourceType: ActivityResourceType.PRESCRIPTION,
      resourceId: prescription.id,
      action: 'prescription.fulfil',
      metadata: {
        pharmacyId,
        dispensedMedicationIds: dispensedIds,
        substitutions: dto.substitutions ?? [],
      },
    });
    return this.toPrescriptionResponse(saved);
  }

  async updateStatus(
    pharmacyId: string,
    prescriptionId: string,
    dto: UpdatePrescriptionStatusDto,
    actorId?: string,
  ) {
    const prescription = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId, assignedPharmacy: { id: pharmacyId } },
      relations: ['assignedPharmacy'],
    });
    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }
    if (prescription.status === PrescriptionStatus.COMPLETED) {
      throw new BadRequestException('Prescription already completed.');
    }
    this.ensureValidTransition(prescription.status, dto.status);

    prescription.status = dto.status;
    if (dto.status === PrescriptionStatus.READY) {
      prescription.readyAt = new Date();
    }
    if (dto.status === PrescriptionStatus.CANCELLED) {
      prescription.pickedUpAt = null;
    }
    prescription.statusNotes = dto.notes ?? null;
    const saved = await this.prescriptionRepo.save(prescription);

    const actor = actorId ? await this.userRepo.findOne({ where: { id: actorId } }) : null;
    await this.activityService.record({
      actor: actor ?? undefined,
      organization: prescription.assignedPharmacy?.organization ?? null,
      resourceType: ActivityResourceType.PRESCRIPTION,
      resourceId: prescription.id,
      action: `prescription.status.${dto.status}`,
      metadata: {
        pharmacyId,
        notes: dto.notes ?? null,
      },
    });

    return this.toPrescriptionResponse(saved);
  }

  async seedSamplePrescriptions(pharmacyId: string) {
    const existing = await this.prescriptionRepo.count({
      where: { assignedPharmacy: { id: pharmacyId } },
    });

    if (existing > 0) {
      return;
    }

    const pharmacy = await this.pharmacyRepo.findOne({ where: { id: pharmacyId } });
    if (!pharmacy) {
      return;
    }

    const patient = await this.ensureSampleUser({
      email: 'patient@medlink.com',
      firstName: 'Ama',
      lastName: 'Mensah',
      phoneNumber: '+233200000101',
      role: UserRole.SUPPORT,
    });
    const doctor = await this.ensureSampleUser({
      email: 'dr.quartey@medlink.com',
      firstName: 'Dr. Kweku',
      lastName: 'Quartey',
      phoneNumber: '+233200000201',
      role: UserRole.SUPPORT,
    });

    const samples = [
      {
        verificationCode: 'RX-1001',
        medications: [
          {
            drugName: 'Amoxicillin 500mg Capsules',
            strength: '500mg',
            dosage: '1 capsule',
            frequency: 'TDS',
            duration: '7 days',
            instructions: 'Take after meals with water.',
          },
          {
            drugName: 'Paracetamol Suspension 120mg/5ml',
            strength: '120mg/5ml',
            dosage: '10ml',
            frequency: 'TDS',
            duration: '5 days',
            instructions: 'Shake well before use.',
          },
        ],
      },
      {
        verificationCode: 'RX-1002',
        medications: [
          {
            drugName: 'Metformin 850mg Tablets',
            strength: '850mg',
            dosage: '1 tablet',
            frequency: 'BID',
            duration: '30 days',
            instructions: 'Take with meals.',
          },
        ],
      },
      {
        verificationCode: 'RX-1003',
        medications: [
          {
            drugName: 'Amoxicillin 500mg Capsules',
            strength: '500mg',
            dosage: '1 capsule',
            frequency: 'BID',
            duration: '5 days',
            instructions: 'Take with a full glass of water.',
          },
        ],
      },
    ];

    for (const sample of samples) {
      const entity = this.prescriptionRepo.create({
        patient,
        doctor,
        assignedPharmacy: pharmacy,
        verificationCode: sample.verificationCode,
        sentToPharmacy: true,
        medications: sample.medications.map((med) =>
          this.medicationRepo.create({
            drugName: med.drugName,
            strength: med.strength,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions,
          }),
        ),
      });

      await this.prescriptionRepo.save(entity);
    }
  }

  private async ensureSampleUser(details: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    role: UserRole;
  }) {
    let user = await this.userRepo.findOne({ where: { email: details.email } });
    if (!user) {
      user = this.userRepo.create({
        email: details.email,
        phoneNumber: details.phoneNumber,
        firstName: details.firstName,
        lastName: details.lastName,
        role: details.role,
        passwordHash: await bcrypt.hash('Password123!', 10),
      });
      await this.userRepo.save(user);
    }
    return user;
  }

  private ensureValidTransition(current: PrescriptionStatus, next: PrescriptionStatus) {
    const map: Record<PrescriptionStatus, PrescriptionStatus[]> = {
      [PrescriptionStatus.RECEIVED]: [PrescriptionStatus.PREPARING, PrescriptionStatus.READY, PrescriptionStatus.CANCELLED],
      [PrescriptionStatus.PREPARING]: [PrescriptionStatus.READY, PrescriptionStatus.CANCELLED],
      [PrescriptionStatus.READY]: [PrescriptionStatus.COMPLETED, PrescriptionStatus.CANCELLED],
      [PrescriptionStatus.COMPLETED]: [],
      [PrescriptionStatus.CANCELLED]: [],
    };
    if (!map[current].includes(next)) {
      throw new BadRequestException(`Cannot move prescription from ${current} to ${next}`);
    }
  }

  private toPrescriptionResponse(prescription: Prescription) {
    return {
      id: prescription.id,
      verificationCode: prescription.verificationCode,
      createdAt: prescription.createdAt,
      fulfilledAt: prescription.fulfilledAt,
      status: prescription.status,
      sentToPharmacy: prescription.sentToPharmacy,
      assignedPharmacyId: prescription.assignedPharmacy?.id ?? null,
      readyAt: prescription.readyAt,
      pickedUpAt: prescription.pickedUpAt,
      statusNotes: prescription.statusNotes,
      substitutions: prescription.substitutions ?? [],
      patient: prescription.patient
        ? {
            id: prescription.patient.id,
            name: `${prescription.patient.firstName ?? ''} ${prescription.patient.lastName ?? ''}`.trim(),
            email: prescription.patient.email,
          }
        : null,
      doctor: prescription.doctor
        ? {
            id: prescription.doctor.id,
            name: `${prescription.doctor.firstName ?? ''} ${prescription.doctor.lastName ?? ''}`.trim(),
            email: prescription.doctor.email,
          }
        : null,
      medications: (prescription.medications ?? []).map((medication) => ({
        id: medication.id,
        drugName: medication.drugName,
        strength: medication.strength,
        dosage: medication.dosage,
        frequency: medication.frequency,
        duration: medication.duration,
        instructions: medication.instructions,
      })),
    };
  }
}
