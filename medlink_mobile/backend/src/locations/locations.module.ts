import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { Pharmacy } from './entities/pharmacy.entity';
import { Hospital } from './entities/hospital.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pharmacy, Hospital]),
    ConfigModule,
  ],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}

