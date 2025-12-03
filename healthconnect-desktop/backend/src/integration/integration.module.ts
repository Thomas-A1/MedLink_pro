import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryItem, Pharmacy]), InventoryModule, ActivityModule],
  controllers: [IntegrationController],
  providers: [IntegrationService],
})
export class IntegrationModule {}


