import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { ChargeDto } from './dto/charge.dto';
import {
  Consultation,
  ConsultationPaymentStatus,
} from '../consultations/entities/consultation.entity';
import { QueueService } from '../queue/queue.service';
import { User } from '../users/entities/user.entity';

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    status: string;
    reference: string;
    amount: number;
    customer: {
      email: string;
    };
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly paystackSecret: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Consultation)
    private readonly consultationRepo: Repository<Consultation>,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {
    this.paystackSecret = this.configService.get<string>('PAYSTACK_SECRET_KEY', '');
  }

  async charge(user: User, dto: ChargeDto) {
    if (!this.paystackSecret) {
      throw new BadRequestException('Paystack not configured');
    }

    const consultation = await this.consultationRepo.findOne({
      where: { id: dto.consultationId },
      relations: ['patient', 'doctor'],
    });
    if (!consultation) throw new NotFoundException('Consultation not found');
    if (consultation.patient.id !== user.id) throw new UnauthorizedException();

    // Paystack expects amount in pesewas (minor units)
    const amountMinorUnits = Math.round(dto.amount * 100);

    // Create payment intent first
    const reference = `ML-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const payment = this.paymentRepo.create({
      consultation,
      amount: dto.amount,
      method: dto.method,
      status: PaymentStatus.PENDING,
      reference,
      metadata: {
        mobileMoneyNumber: dto.mobileMoneyNumber,
        method: dto.method,
      },
    });
    await this.paymentRepo.save(payment);

    // Initialize Paystack payment
    const callbackUrl = `${this.configService.get<string>('APP_URL', 'http://localhost:4100')}/api/payments/callback`;
    
    const paystackPayload: any = {
      email: user.email || `${user.phoneNumber}@medlink.gh`,
      amount: amountMinorUnits,
      reference,
      callback_url: callbackUrl,
      metadata: {
        consultationId: consultation.id,
        patientId: user.id,
        doctorId: consultation.doctor.id,
      },
    };

    // Add mobile money number if provided
    if (dto.method === 'mobile_money' && dto.mobileMoneyNumber) {
      paystackPayload.mobile_money = {
        phone: dto.mobileMoneyNumber,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.paystackSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paystackPayload),
      });

      const data: PaystackInitResponse = await response.json();

      if (!data.status || !data.data) {
        this.logger.error(`Paystack init failed: ${data.message}`);
        throw new BadRequestException(`Payment initialization failed: ${data.message}`);
      }

      return {
        authorizationUrl: data.data.authorization_url,
        reference: data.data.reference,
      };
    } catch (error) {
      this.logger.error('Paystack initialization error', error);
      throw new BadRequestException('Failed to initialize payment');
    }
  }

  async verifyPayment(reference: string) {
    if (!this.paystackSecret) {
      throw new BadRequestException('Paystack not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.paystackSecret}`,
        },
      });

      const data: PaystackVerifyResponse = await response.json();

      if (!data.status || !data.data) {
        return { paid: false, message: data.message };
      }

      const isPaid = data.data.status === 'success';

      if (isPaid) {
        // Find payment by reference
        const payment = await this.paymentRepo.findOne({
          where: { reference },
          relations: ['consultation', 'consultation.patient', 'consultation.doctor'],
        });

        if (payment && payment.status === PaymentStatus.PENDING) {
          // Update payment status
          payment.status = PaymentStatus.SUCCESS;
          await this.paymentRepo.save(payment);

          // Update consultation
          const consultation = payment.consultation;
          consultation.paymentStatus = ConsultationPaymentStatus.PAID;
          consultation.paymentTransactionId = reference;
          await this.consultationRepo.save(consultation);

          // Add to queue
          const queueEntry = await this.queueService.enqueueConsultation(consultation.id);

          return {
            paid: true,
            queueEntry: {
              id: queueEntry.id,
              consultationId: consultation.id,
              position: queueEntry.position,
              estimatedWaitTime: queueEntry.estimatedWaitTime,
              status: queueEntry.status,
            },
          };
        }
      }

      return { paid: isPaid, message: data.data.status };
    } catch (error) {
      this.logger.error('Paystack verification error', error);
      throw new BadRequestException('Failed to verify payment');
    }
  }
}

