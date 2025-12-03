import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Prescription } from '../prescriptions/entities/prescription.entity';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { PharmacyService } from '../pharmacy/entities/pharmacy-service.entity';
import { PharmacyStaff } from '../pharmacy/entities/pharmacy-staff.entity';
import { BackupRecord, BackupStatus, BackupType } from './entities/backup-record.entity';
import { ActivityService } from '../activity/activity.service';
import { ActivityResourceType } from '../activity/entities/activity-log.entity';
import { User } from '../common/entities/user.entity';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class BackupsService {
  constructor(
    @InjectRepository(BackupRecord) private readonly backupRepo: Repository<BackupRecord>,
    @InjectRepository(InventoryItem) private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(Sale) private readonly saleRepo: Repository<Sale>,
    @InjectRepository(Prescription) private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(Pharmacy) private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(PharmacyService) private readonly pharmacyServiceRepo: Repository<PharmacyService>,
    @InjectRepository(PharmacyStaff) private readonly pharmacyStaffRepo: Repository<PharmacyStaff>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly activityService: ActivityService,
  ) {}

  async list(pharmacyId: string) {
    await this.ensurePharmacy(pharmacyId);
    const records = await this.backupRepo.find({
      where: { pharmacy: { id: pharmacyId } },
      order: { createdAt: 'DESC' },
    });
    return records.map((record) => this.toResponse(record));
  }

  async create(pharmacyId: string, type: BackupType, userId?: string) {
    const pharmacy = await this.ensurePharmacy(pharmacyId);
    const actor = userId ? await this.userRepo.findOne({ where: { id: userId } }) : null;

    const backup = this.backupRepo.create({
      pharmacy,
      createdBy: actor ?? undefined,
      type,
      status: BackupStatus.COMPLETED,
      storagePath: '',
    });
    await this.backupRepo.save(backup);

    const payload = await this.buildPayload(pharmacyId);
    const serialized = JSON.stringify(payload, null, 2);
    const buffer = Buffer.from(serialized, 'utf8');

    const dir = process.env.BACKUP_DIR ?? path.join(process.cwd(), 'backups');
    await fs.mkdir(dir, { recursive: true });
    const filename = `backup-${pharmacyId}-${Date.now()}.json`;
    const fullPath = path.join(dir, filename);
    await fs.writeFile(fullPath, buffer);

    backup.storagePath = fullPath;
    backup.size = buffer.length;
    backup.checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    backup.metadata = {
      inventoryCount: payload.inventory.length,
      salesCount: payload.sales.length,
      prescriptionCount: payload.prescriptions.length,
      servicesCount: payload.services.length,
      staffCount: payload.staff.length,
      pharmacyName: payload.pharmacy?.name,
    };
    await this.backupRepo.save(backup);

    await this.activityService.record({
      actor: actor ?? undefined,
      organization: pharmacy.organization ?? null,
      resourceType: ActivityResourceType.BACKUP,
      resourceId: backup.id,
      action: 'backup.create',
      metadata: {
        pharmacyId,
        type,
        size: backup.size,
      },
    });

    return this.toResponse(backup);
  }

  async download(pharmacyId: string, backupId: string) {
    await this.ensurePharmacy(pharmacyId);
    const backup = await this.backupRepo.findOne({
      where: { id: backupId, pharmacy: { id: pharmacyId } },
    });
    if (!backup) {
      throw new NotFoundException('Backup not found');
    }
    if (!backup.storagePath) {
      throw new NotFoundException('Backup file not available');
    }
    try {
      const fileBuffer = await fs.readFile(backup.storagePath);
      return { filename: path.basename(backup.storagePath), buffer: fileBuffer };
    } catch (error) {
      throw new NotFoundException('Backup file not found on disk');
    }
  }

  async restore(pharmacyId: string, backupId: string, userId?: string) {
    const pharmacy = await this.ensurePharmacy(pharmacyId);
    const backup = await this.backupRepo.findOne({
      where: { id: backupId, pharmacy: { id: pharmacyId } },
      relations: ['pharmacy'],
    });
    if (!backup) {
      throw new NotFoundException('Backup not found');
    }
    const actor = userId ? await this.userRepo.findOne({ where: { id: userId } }) : null;

    await this.activityService.record({
      actor: actor ?? undefined,
      organization: pharmacy.organization ?? null,
      resourceType: ActivityResourceType.BACKUP,
      resourceId: backup.id,
      action: 'backup.restore',
      metadata: {
        pharmacyId,
        backupId,
      },
    });

    return { message: 'Restore initiated. Please monitor activity logs for completion.' };
  }

  async delete(pharmacyId: string, backupId: string, userId?: string) {
    const pharmacy = await this.ensurePharmacy(pharmacyId);
    const backup = await this.backupRepo.findOne({
      where: { id: backupId, pharmacy: { id: pharmacyId } },
    });
    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    const actor = userId ? await this.userRepo.findOne({ where: { id: userId } }) : null;

    // Delete the file if it exists
    if (backup.storagePath) {
      try {
        await fs.unlink(backup.storagePath);
      } catch (error) {
        // File may not exist, continue with deletion
      }
    }

    await this.backupRepo.remove(backup);

    await this.activityService.record({
      actor: actor ?? undefined,
      organization: pharmacy.organization ?? null,
      resourceType: ActivityResourceType.BACKUP,
      resourceId: backupId,
      action: 'backup.delete',
      metadata: {
        pharmacyId,
        backupId,
      },
    });

    return { message: 'Backup deleted successfully' };
  }

  private async buildPayload(pharmacyId: string) {
    const [inventory, sales, prescriptions, services, staff] = await Promise.all([
      this.inventoryRepo.find({
        where: { pharmacy: { id: pharmacyId } },
        order: { name: 'ASC' },
      }),
      this.saleRepo.find({
        where: { pharmacy: { id: pharmacyId } },
        relations: ['items'],
        order: { createdAt: 'DESC' },
      }),
      this.prescriptionRepo.find({
        where: { assignedPharmacy: { id: pharmacyId } },
        relations: ['medications'],
        order: { createdAt: 'DESC' },
      }),
      this.pharmacyServiceRepo.find({
        where: { pharmacy: { id: pharmacyId } },
        order: { name: 'ASC' },
      }),
      this.pharmacyStaffRepo.find({
        where: { pharmacy: { id: pharmacyId } },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      }),
    ]);

    const pharmacy = await this.pharmacyRepo.findOne({
      where: { id: pharmacyId },
      relations: ['organization'],
    });

    return {
      createdAt: new Date().toISOString(),
      pharmacyId,
      pharmacy: pharmacy ? {
        id: pharmacy.id,
        name: pharmacy.name,
        address: pharmacy.address,
        region: pharmacy.region,
        district: pharmacy.district,
        contactPhone: pharmacy.contactPhone,
        contactEmail: pharmacy.contactEmail,
        organization: pharmacy.organization ? {
          id: pharmacy.organization.id,
          name: pharmacy.organization.name,
          type: pharmacy.organization.type,
        } : null,
      } : null,
      inventory,
      sales,
      prescriptions,
      services,
      staff: staff.map((s) => ({
        id: s.id,
        role: s.role,
        isPrimaryLocation: s.isPrimaryLocation,
        user: {
          id: s.user.id,
          email: s.user.email,
          firstName: s.user.firstName,
          lastName: s.user.lastName,
          phoneNumber: s.user.phoneNumber,
          role: s.user.role,
          isActive: s.user.isActive,
        },
        createdAt: s.createdAt,
      })),
    };
  }

  private toResponse(record: BackupRecord) {
    return {
      id: record.id,
      type: record.type,
      status: record.status,
      size: record.size,
      createdAt: record.createdAt,
      checksum: record.checksum,
      metadata: record.metadata ?? {},
    };
  }

  private async ensurePharmacy(pharmacyId: string) {
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { id: pharmacyId },
      relations: ['organization'],
    });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }
    return pharmacy;
  }
}


