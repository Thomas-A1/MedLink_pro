import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Sale, SaleItem } from '../sales/entities/sale.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { Prescription } from '../prescriptions/entities/prescription.entity';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { User } from '../common/entities/user.entity';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem, InventoryItem, Prescription, Pharmacy, User]),
    ActivityModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}


