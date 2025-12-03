import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentIntent } from './entities/payment-intent.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { User } from '../common/entities/user.entity';
import { SalesModule } from '../sales/sales.module';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';
import { PharmacyService as PharmacyServiceEntity } from '../pharmacy/entities/pharmacy-service.entity';
import { ConsultationsModule } from '../consultations/consultations.module';
import { Consultation } from '../consultations/entities/consultation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentIntent, InventoryItem, Pharmacy, User, PharmacyServiceEntity, Consultation]),
    SalesModule,
    PrescriptionsModule,
    ConsultationsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}


