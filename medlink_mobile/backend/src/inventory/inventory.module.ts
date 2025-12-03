import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PharmacyInventory } from './entities/pharmacy-inventory.entity';
import { Drug } from './entities/drug.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PharmacyInventory, Drug])],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}

