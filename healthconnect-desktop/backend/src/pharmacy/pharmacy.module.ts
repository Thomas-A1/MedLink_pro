import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pharmacy } from './entities/pharmacy.entity';
import { PharmacyStaff } from './entities/pharmacy-staff.entity';
import { PharmacyService as PharmacyServiceEntity } from './entities/pharmacy-service.entity';
import { PharmacyService } from './pharmacy.service';
import { PharmacyController } from './pharmacy.controller';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { User } from '../common/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { AuthModule } from '../auth/auth.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pharmacy, PharmacyStaff, PharmacyServiceEntity, User, Organization]),
    AuthModule,
    ActivityModule,
  ],
  providers: [PharmacyService, ServicesService],
  controllers: [PharmacyController, ServicesController],
  exports: [PharmacyService, ServicesService],
})
export class PharmacyModule {}
