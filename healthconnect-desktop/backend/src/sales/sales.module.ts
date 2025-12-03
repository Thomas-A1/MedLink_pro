import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale, SaleItem } from './entities/sale.entity';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { User } from '../common/entities/user.entity';
import { ActivityModule } from '../activity/activity.module';
import { PharmacyService as PharmacyServiceEntity } from '../pharmacy/entities/pharmacy-service.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem, Pharmacy, InventoryItem, StockMovement, User, PharmacyServiceEntity]),
    ActivityModule,
  ],
  providers: [SalesService],
  controllers: [SalesController],
  exports: [SalesService],
})
export class SalesModule {}

