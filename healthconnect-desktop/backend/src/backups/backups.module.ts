import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BackupRecord } from './entities/backup-record.entity';
import { BackupsController } from './backups.controller';
import { BackupsService } from './backups.service';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Prescription } from '../prescriptions/entities/prescription.entity';
import { PharmacyService } from '../pharmacy/entities/pharmacy-service.entity';
import { PharmacyStaff } from '../pharmacy/entities/pharmacy-staff.entity';
import { ActivityModule } from '../activity/activity.module';
import { User } from '../common/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BackupRecord, Pharmacy, InventoryItem, Sale, Prescription, PharmacyService, PharmacyStaff, User]),
    ActivityModule,
  ],
  controllers: [BackupsController],
  providers: [BackupsService],
})
export class BackupsModule {}


