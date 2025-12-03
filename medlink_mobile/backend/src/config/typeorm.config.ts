import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { PatientProfile } from '../users/entities/patient-profile.entity';
import { OrganizationLink } from '../users/entities/organization-link.entity';
import { Pharmacy } from '../locations/entities/pharmacy.entity';
import { Hospital } from '../locations/entities/hospital.entity';
import { Drug } from '../inventory/entities/drug.entity';
import { PharmacyInventory } from '../inventory/entities/pharmacy-inventory.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Consultation } from '../consultations/entities/consultation.entity';
import { QueueEntry } from '../queue/entities/queue-entry.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Review } from '../reviews/entities/review.entity';
import { Message } from '../messages/entities/message.entity';

export const buildTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  url:
    configService.get<string>('DATABASE_URL') ??
    'postgres://medlink:medlink@127.0.0.1:5445/medlink_mobile',
  entities: [
    User,
    PatientProfile,
    OrganizationLink,
    Pharmacy,
    Hospital,
    Drug,
    PharmacyInventory,
    Doctor,
    Consultation,
    QueueEntry,
    Payment,
    Review,
    Message,
  ],
  synchronize: false, // Never use synchronize in production - use migrations instead
  migrationsRun: true,
  migrations: ['dist/migrations/*.js'],
  ssl: false, // Disable SSL for local Docker setup
});

