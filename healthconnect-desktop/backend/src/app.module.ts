import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { InventoryModule } from './inventory/inventory.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { SyncModule } from './sync/sync.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { QueueModule } from './queue/queue.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ActivityModule } from './activity/activity.module';
import { SalesModule } from './sales/sales.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { IntegrationModule } from './integration/integration.module';
import { BackupsModule } from './backups/backups.module';
import { AdminModule } from './admin/admin.module';
import { LocationsModule } from './locations/locations.module';
import { MobileApiModule } from './mobile-api/mobile-api.module';
import { ConsultationsModule } from './consultations/consultations.module';
import configuration from './config/configuration';
import { typeOrmModuleOptions } from './config/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => typeOrmModuleOptions(configService),
    }),
    AuthModule,
    InventoryModule,
    PrescriptionsModule,
    SyncModule,
    PharmacyModule,
    QueueModule,
    OrganizationsModule,
    ActivityModule,
    SalesModule,
    PaymentsModule,
    ReportsModule,
    IntegrationModule,
    BackupsModule,
    AdminModule,
    LocationsModule,
    MobileApiModule,
    ConsultationsModule,
  ],
})
export class AppModule {}
