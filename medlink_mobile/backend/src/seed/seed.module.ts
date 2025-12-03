import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Pharmacy } from '../locations/entities/pharmacy.entity';
import { Hospital } from '../locations/entities/hospital.entity';
import { Drug } from '../inventory/entities/drug.entity';
import { PharmacyInventory } from '../inventory/entities/pharmacy-inventory.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, Pharmacy, Hospital, Drug, PharmacyInventory])],
  providers: [SeedService],
})
export class SeedModule {}

