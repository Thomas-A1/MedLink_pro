import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { QueueEntry, QueueStatus } from './entities/queue-entry.entity';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { User } from '../common/entities/user.entity';
import { CreateQueueEntryDto } from './dto/create-queue-entry.dto';
import { UserRole } from '../common/enums/role.enum';
import * as bcrypt from 'bcryptjs';
import { QueueEntryResponse } from './dto/queue-entry-response.dto';
import { Organization } from '../organizations/entities/organization.entity';
import { QueueGateway } from './queue.gateway';
import { ActivityService } from '../activity/activity.service';
import { ActivityResourceType } from '../activity/entities/activity-log.entity';

@Injectable()
export class QueueService {
  constructor(
    @InjectRepository(QueueEntry) private readonly queueRepo: Repository<QueueEntry>,
    @InjectRepository(Pharmacy) private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly queueGateway: QueueGateway,
    private readonly activityService: ActivityService,
  ) {}

  async list(pharmacyId: string): Promise<QueueEntryResponse[]> {
    const entries = await this.queueRepo.find({
      where: { pharmacy: { id: pharmacyId }, status: In(Object.values(QueueStatus)) },
      relations: ['patient'],
      order: { status: 'ASC', priority: 'DESC', createdAt: 'ASC' },
    });

    return entries.map((entry) => this.toQueueEntryResponse(entry));
  }

  async enqueue(pharmacyId: string, dto: CreateQueueEntryDto, actorId?: string): Promise<QueueEntryResponse> {
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { id: pharmacyId },
      relations: ['organization'],
    });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy or patient not found');
    }

    const patient = await this.resolvePatient(dto, pharmacy);

    const currentTop = await this.queueRepo.findOne({
      where: { pharmacy: { id: pharmacyId } },
      order: { priority: 'DESC' },
    });

    const priority =
      typeof dto.priority === 'number' ? dto.priority : currentTop ? currentTop.priority + 1 : 1;

    const entry = this.queueRepo.create({
      pharmacy,
      patient,
      status: QueueStatus.PENDING,
      priority,
    });

    const saved = await this.queueRepo.save(entry);
    await this.broadcast(pharmacyId);
    const actor = actorId ? await this.userRepo.findOne({ where: { id: actorId } }) : null;
    await this.activityService.record({
      actor: actor ?? undefined,
      organization: pharmacy.organization,
      resourceType: ActivityResourceType.QUEUE_ENTRY,
      resourceId: saved.id,
      action: 'queue.enqueue',
      metadata: {
        pharmacyId,
        patientId: patient.id,
        priority,
      },
    });
    return this.toQueueEntryResponse(saved);
  }

  async updateStatus(entryId: string, status: QueueStatus, actorId?: string): Promise<QueueEntryResponse> {
    const entry = await this.queueRepo.findOne({ where: { id: entryId }, relations: ['pharmacy', 'pharmacy.organization'] });
    if (!entry) {
      throw new NotFoundException('Queue entry not found');
    }

    entry.status = status;
    if (status === QueueStatus.ACTIVE) {
      entry.acknowledgedAt = new Date();
    }
    if (status === QueueStatus.COMPLETED) {
      entry.completedAt = new Date();
    }
    const saved = await this.queueRepo.save(entry);
    await this.broadcast(entry.pharmacy.id);
    const actor = actorId ? await this.userRepo.findOne({ where: { id: actorId } }) : null;
    await this.activityService.record({
      actor: actor ?? undefined,
      organization: entry.pharmacy.organization,
      resourceType: ActivityResourceType.QUEUE_ENTRY,
      resourceId: entry.id,
      action: 'queue.updateStatus',
      metadata: {
        status,
      },
    });
    return this.toQueueEntryResponse(saved);
  }

  async seedSampleQueue(pharmacyId: string) {
    const existing = await this.queueRepo.count({ where: { pharmacy: { id: pharmacyId } } });
    if (existing > 0) {
      return;
    }

    const pharmacy = await this.pharmacyRepo.findOne({ where: { id: pharmacyId } });
    if (!pharmacy) {
      return;
    }

    const patients = await Promise.all([
      this.ensurePatientUser({
        email: 'ama.patient@medlink.com',
        firstName: 'Ama',
        lastName: 'Mensah',
        phoneNumber: '+233201000001',
      }, pharmacy.organization),
      this.ensurePatientUser({
        email: 'kofi.patient@medlink.com',
        firstName: 'Kofi',
        lastName: 'Boateng',
        phoneNumber: '+233201000002',
      }, pharmacy.organization),
      this.ensurePatientUser({
        email: 'efua.patient@medlink.com',
        firstName: 'Efua',
        lastName: 'Owusu',
        phoneNumber: '+233201000003',
      }, pharmacy.organization),
    ]);

    const samples = [
      { patient: patients[0], status: QueueStatus.PENDING, priority: 3 },
      { patient: patients[1], status: QueueStatus.ACTIVE, priority: 2 },
      { patient: patients[2], status: QueueStatus.PENDING, priority: 1 },
    ];

    for (const sample of samples) {
      const entry = this.queueRepo.create({
        pharmacy,
        patient: sample.patient,
        status: sample.status,
        priority: sample.priority,
        acknowledgedAt: sample.status === QueueStatus.ACTIVE ? new Date() : undefined,
      });
      await this.queueRepo.save(entry);
    }
    await this.broadcast(pharmacyId);
  }

  private toQueueEntryResponse(entry: QueueEntry): QueueEntryResponse {
    const now = Date.now();
    const waitTimeMinutes = Math.max(
      Math.floor((now - new Date(entry.createdAt).getTime()) / (1000 * 60)),
      0,
    );

    return {
      id: entry.id,
      status: entry.status,
      priority: entry.priority,
      createdAt: entry.createdAt,
      acknowledgedAt: entry.acknowledgedAt,
      completedAt: entry.completedAt,
      waitTimeMinutes,
      patient: {
        id: entry.patient.id,
        name: `${entry.patient.firstName ?? ''} ${entry.patient.lastName ?? ''}`.trim() || 'Unknown',
        email: entry.patient.email,
        phoneNumber: entry.patient.phoneNumber ?? '',
      },
    };
  }

  private async resolvePatient(dto: CreateQueueEntryDto, pharmacy: Pharmacy) {
    if (dto.patientId) {
      const patient = await this.userRepo.findOne({ where: { id: dto.patientId } });
      if (patient) {
        if (!patient.organization && pharmacy.organization) {
          patient.organization = pharmacy.organization;
          await this.userRepo.save(patient);
        }
        return patient;
      }
    }

    if (dto.patientEmail) {
      const existing = await this.userRepo.findOne({ where: { email: dto.patientEmail } });
      if (existing) {
        if (!existing.organization && pharmacy.organization) {
          existing.organization = pharmacy.organization;
          await this.userRepo.save(existing);
        }
        return existing;
      }
    }

    if (!dto.patientName) {
      throw new NotFoundException('Patient details missing');
    }

    const [firstName, ...rest] = dto.patientName.split(' ');
    const lastName = rest.join(' ');

    const patient = this.userRepo.create({
      email: dto.patientEmail ?? `walkin+${Date.now()}@medlink.local`,
      phoneNumber: dto.patientPhone ?? '',
      firstName,
      lastName,
      role: UserRole.SUPPORT,
      organization: pharmacy.organization,
      passwordHash: await bcrypt.hash('Password123!', 10),
    });
    return this.userRepo.save(patient);
  }

  private async ensurePatientUser(details: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  }, organization?: Organization) {
    let user = await this.userRepo.findOne({ where: { email: details.email } });
    if (!user) {
      user = this.userRepo.create({
        email: details.email,
        phoneNumber: details.phoneNumber,
        firstName: details.firstName,
        lastName: details.lastName,
        role: UserRole.SUPPORT,
        organization,
        passwordHash: await bcrypt.hash('Password123!', 10),
      });
      await this.userRepo.save(user);
    } else if (!user.organization && organization) {
      user.organization = organization;
      await this.userRepo.save(user);
    }
    return user;
  }

  private async broadcast(pharmacyId: string) {
    const snapshot = await this.list(pharmacyId);
    this.queueGateway.emitQueueUpdate(pharmacyId, snapshot);
  }
}
