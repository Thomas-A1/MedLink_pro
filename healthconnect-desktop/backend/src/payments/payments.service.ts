import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentIntent, PaymentPurpose } from './entities/payment-intent.entity';
import { ConfigService } from '@nestjs/config';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { SalesService } from '../sales/sales.service';
import { PrescriptionsService } from '../prescriptions/prescriptions.service';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { User } from '../common/entities/user.entity';
import { PharmacyService as PharmacyServiceEntity } from '../pharmacy/entities/pharmacy-service.entity';
import { ConsultationsService } from '../consultations/consultations.service';
import { Consultation } from '../consultations/entities/consultation.entity';
import { ChargeConsultationDto } from '../consultations/dto/charge-consultation.dto';

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly paystackSecret: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(
    @InjectRepository(PaymentIntent) private readonly intentRepo: Repository<PaymentIntent>,
    @InjectRepository(InventoryItem) private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(Pharmacy) private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(PharmacyServiceEntity) private readonly pharmacyServiceRepo: Repository<PharmacyServiceEntity>,
    @InjectRepository(Consultation) private readonly consultationRepo: Repository<Consultation>,
    private readonly configService: ConfigService,
    private readonly salesService: SalesService,
    private readonly prescriptionsService: PrescriptionsService,
    private readonly consultationsService: ConsultationsService,
  ) {
    this.paystackSecret = this.configService.get<string>('integrations.paystackSecret', '');
  }

  async initiate(pharmacyId: string, dto: InitiatePaymentDto, actorUserId?: string) {
    if (!this.paystackSecret) {
      throw new BadRequestException('Paystack not configured');
    }
    const { purpose } = dto;

    let amount = 0;
    let payload: Record<string, unknown> = {};
    const cashierUserId = actorUserId;

    if (purpose === 'sale') {
      if ((!dto.items || dto.items.length === 0) && (!dto.serviceItems || dto.serviceItems.length === 0)) {
        throw new BadRequestException('Items or serviceItems required for sale payment');
      }
      const computed = await this.computeSaleAmount(pharmacyId, dto);
      amount = computed.amount;
      payload = { items: computed.serializedItems, serviceItems: computed.serializedServiceItems };
    } else if (purpose === 'prescription') {
      if (!dto.prescriptionId) {
        throw new BadRequestException('prescriptionId required');
      }
      // For MVP, collect a flat amount entered on client? Here we compute amount by 1 unit per matched item at sellingPrice.
      // Let prescriptions fulfilment reduce stock by 1 per medication name if available. Charge a nominal 1.00 per item as placeholder if prices unknown.
      // Prefer using inventory price for matched medication names.
      const estimate = await this.estimatePrescriptionAmount(pharmacyId, dto.prescriptionId);
      amount = estimate.amount;
      payload = { prescriptionId: dto.prescriptionId, dispensedMedicationIds: estimate.dispensedMedicationIds };
    } else if (purpose === 'service') {
      if (!dto.serviceId) {
        throw new BadRequestException('serviceId required');
      }
      // Fetch service price from catalog using injected repository
      const service = await this.pharmacyServiceRepo.findOne({
        where: { id: dto.serviceId, pharmacy: { id: pharmacyId } } as any,
      });
      if (!service || !service.isActive) {
        throw new BadRequestException('Service not found or inactive');
      }
      const servicePrice = service.price !== null && service.price !== undefined ? Number(service.price) : null;
      if (servicePrice === null || Number.isNaN(servicePrice)) {
        throw new BadRequestException('Service price not set');
      }
      amount = servicePrice;
      payload = { serviceId: dto.serviceId };
    }

    // Paystack expects amount in kobo/pesewas (minor units)
    const amountMinorUnits = Math.round(amount * 100);

    const headers = {
      Authorization: `Bearer ${this.paystackSecret}`,
      'Content-Type': 'application/json',
    };
    // Attach admin phone for this organization (for audit/settlement context)
    const pharmacy = await this.pharmacyRepo.findOne({ where: { id: pharmacyId }, relations: ['organization'] });
    const admin = pharmacy
      ? await this.userRepo.findOne({
          where: { organization: { id: pharmacy.organization?.id }, role: 'hospital_admin' as any },
          order: { createdAt: 'ASC' },
        })
      : null;
    const adminPhone = admin?.phoneNumber ?? null;

    // If organization has a Paystack subaccount configured, set it for settlement
    const subaccount = (pharmacy?.organization?.settings as any)?.integrations?.paystackSubaccount ?? null;
    const body: any = {
      email: dto.customerEmail ?? 'customer@medlink.com',
      amount: amountMinorUnits,
      currency: 'GHS',
      channels: ['mobile_money', 'card'],
      metadata: {
        pharmacyId,
        purpose,
        payload,
        customerPhone: dto.customerPhone ?? null,
        adminPhone,
        cashierUserId: cashierUserId ?? null,
      },
    };
    if (subaccount) {
      body.subaccount = subaccount;
      body.bearer = 'subaccount';
    }

    const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data: PaystackInitResponse = await res.json();
    if (!data.status || !data.data) {
      this.logger.error(`Paystack init failed: ${data.message}`);
      throw new BadRequestException('Failed to initialize payment');
    }

    const intent = this.intentRepo.create({
      reference: data.data.reference,
      provider: 'paystack',
      purpose: purpose as PaymentPurpose,
      pharmacyId,
      amount,
      currency: 'GHS',
      status: 'initialized',
      payload: { ...payload, adminPhone, cashierUserId: cashierUserId ?? null },
      customerEmail: dto.customerEmail ?? null,
      customerPhone: dto.customerPhone ?? null,
    });
    await this.intentRepo.save(intent);

    return { authorizationUrl: data.data.authorization_url, reference: data.data.reference, amount, currency: 'GHS' };
  }

  async handlePaystackWebhook(signature: string | undefined, bodyRaw: string) {
    if (!this.paystackSecret) {
      // ignore if not configured
      return { ok: true };
    }
    const expected = await this.computeHmac(bodyRaw, this.paystackSecret);
    if (!signature || signature !== expected) {
      this.logger.warn('Invalid Paystack webhook signature');
      return { ok: false };
    }
    const body = JSON.parse(bodyRaw);
    if (body?.event !== 'charge.success') {
      return { ok: true };
    }
    const reference: string | undefined = body?.data?.reference;
    if (!reference) {
      return { ok: false };
    }

    const intent = await this.intentRepo.findOne({ where: { reference } });
    if (!intent || intent.status === 'paid') {
      return { ok: true };
    }
    intent.status = 'paid';
    await this.intentRepo.save(intent);

    // Fulfil based on purpose (idempotent-ish because we mark paid)
    try {
      if (intent.purpose === 'sale') {
        const items = (intent.payload.items as Array<{ inventoryItemId: string; quantity: number; unitPrice?: number }>) ?? [];
        await this.salesService.create(intent.pharmacyId, {
          items,
          customerName: intent.customerEmail ?? 'Customer',
          customerPhone: intent.customerPhone ?? undefined,
          paymentMethod: 'paystack',
          currency: intent.currency,
        } as any, (intent.payload as any)?.cashierUserId ?? undefined);
      } else if (intent.purpose === 'prescription') {
        const { prescriptionId, dispensedMedicationIds } = intent.payload as any;
        await this.prescriptionsService.fulfil(intent.pharmacyId, prescriptionId, {
          dispensedMedications: dispensedMedicationIds ?? [],
          pharmacistId: undefined as any,
        } as any);
      } else if (intent.purpose === 'service') {
        // Record service purchase as a zero-item sale for audit trail
        await this.salesService.create(intent.pharmacyId, {
          items: [],
          customerName: intent.customerEmail ?? 'Customer',
          customerPhone: intent.customerPhone ?? undefined,
          paymentMethod: 'paystack',
          currency: intent.currency,
          notes: `Service paid: ${(intent.payload as any)?.serviceId ?? ''}`,
        } as any, (intent.payload as any)?.cashierUserId ?? undefined);
      } else if (intent.purpose === 'consultation') {
        const { consultationId } = intent.payload as any;
        if (consultationId) {
          await this.consultationsService.markAsPaid(consultationId, reference);
          await this.consultationsService.addToQueue(consultationId);
        }
      }
    } catch (e) {
      this.logger.error(`Post-payment processing failed for ${reference}`, e as any);
    }
    return { ok: true };
  }

  private async computeSaleAmount(pharmacyId: string, dto: InitiatePaymentDto) {
    let amount = 0;
    const serializedItems: Array<{ inventoryItemId: string; quantity: number; unitPrice?: number }> = [];
    const serializedServiceItems: Array<{ serviceId: string; quantity: number; unitPrice?: number }> = [];
    for (const i of dto.items ?? []) {
      const inv = await this.inventoryRepo.findOne({ where: { id: i.inventoryItemId, pharmacy: { id: pharmacyId } } });
      if (!inv) {
        throw new BadRequestException(`Inventory item ${i.inventoryItemId} not found`);
      }
      const unitPrice = i.unitPrice ?? Number(inv.sellingPrice);
      amount += unitPrice * i.quantity;
      serializedItems.push({ inventoryItemId: i.inventoryItemId, quantity: i.quantity, unitPrice });
    }
    for (const s of dto.serviceItems ?? []) {
      const svc = await this.pharmacyServiceRepo.findOne({ where: { id: s.serviceId, pharmacy: { id: pharmacyId } } as any });
      if (!svc || !svc.isActive) {
        throw new BadRequestException(`Service ${s.serviceId} not found or inactive`);
      }
      const unitPrice = s.unitPrice ?? Number(svc.price ?? 0);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        throw new BadRequestException('Service price not set');
      }
      const qty = s.quantity ?? 1;
      amount += unitPrice * qty;
      serializedServiceItems.push({ serviceId: s.serviceId, quantity: qty, unitPrice });
    }
    return { amount, serializedItems, serializedServiceItems };
  }

  private async estimatePrescriptionAmount(pharmacyId: string, prescriptionId: string) {
    // Heuristic: attempt to match each medication by name to inventory item sellingPrice, otherwise default to 1.00
    // Note: PrescriptionsService will reduce stock by 1 per medication
    const meds = await this.prescriptionsService['prescriptionRepo'].findOne({
      where: { id: prescriptionId, assignedPharmacy: { id: pharmacyId } },
      relations: ['medications'],
    });
    if (!meds) {
      throw new BadRequestException('Prescription not found for pharmacy');
    }
    let amount = 0;
    for (const med of meds.medications ?? []) {
      const inv = await this.inventoryRepo.findOne({
        where: { pharmacy: { id: pharmacyId }, name: med.drugName },
      });
      amount += inv ? Number(inv.sellingPrice) : 1.0;
    }
    return { amount, dispensedMedicationIds: (meds.medications ?? []).map((m) => m.id) };
  }

  async chargeConsultation(dto: ChargeConsultationDto, patientId?: string) {
    if (!this.paystackSecret) {
      throw new BadRequestException('Paystack not configured');
    }

    const consultation = await this.consultationRepo.findOne({
      where: { id: dto.consultationId },
      relations: ['patient', 'doctor'],
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    if (patientId && consultation.patient.id !== patientId) {
      throw new BadRequestException('Unauthorized');
    }

    // Paystack expects amount in kobo/pesewas (minor units)
    const amountMinorUnits = Math.round(dto.amount * 100);

    const headers = {
      Authorization: `Bearer ${this.paystackSecret}`,
      'Content-Type': 'application/json',
    };

    const body: any = {
      email: consultation.patient.email ?? 'patient@medlink.com',
      amount: amountMinorUnits,
      currency: 'GHS',
      channels: dto.method === 'mobile_money' ? ['mobile_money'] : ['card', 'mobile_money'],
      metadata: {
        consultationId: dto.consultationId,
        patientId: consultation.patient.id,
        doctorId: consultation.doctor.id,
      },
    };

    if (dto.method === 'mobile_money' && dto.mobileMoneyNumber) {
      body.mobile_money = {
        phone: dto.mobileMoneyNumber,
      };
    }

    const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data: PaystackInitResponse = await res.json();
    if (!data.status || !data.data) {
      this.logger.error(`Paystack init failed: ${data.message}`);
      throw new BadRequestException('Failed to initialize payment');
    }

    // Create payment intent
    const intent = this.intentRepo.create({
      reference: data.data.reference,
      provider: 'paystack',
      purpose: 'consultation' as PaymentPurpose,
      pharmacyId: null, // Consultations don't have pharmacy
      amount: dto.amount,
      currency: 'GHS',
      status: 'initialized',
      payload: {
        consultationId: dto.consultationId,
        patientId: consultation.patient.id,
        doctorId: consultation.doctor.id,
      },
      customerEmail: consultation.patient.email ?? null,
      customerPhone: consultation.patient.phoneNumber ?? null,
    });
    await this.intentRepo.save(intent);

    return {
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
      amount: dto.amount,
      currency: 'GHS',
    };
  }

  async verifyPayment(reference: string) {
    if (!this.paystackSecret) {
      throw new BadRequestException('Paystack not configured');
    }

    const headers = {
      Authorization: `Bearer ${this.paystackSecret}`,
    };

    const res = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
      method: 'GET',
      headers,
    });

    const data = await res.json();
    if (!data.status || !data.data) {
      throw new BadRequestException('Payment verification failed');
    }

    const transaction = data.data;
    const isSuccessful = transaction.status === 'success';

    if (isSuccessful) {
      // Find payment intent
      const intent = await this.intentRepo.findOne({ where: { reference } });
      if (intent && intent.status !== 'paid') {
        intent.status = 'paid';
        await this.intentRepo.save(intent);

        // Handle consultation payment
        if (intent.purpose === 'consultation' && intent.payload) {
          const { consultationId } = intent.payload as any;
          if (consultationId) {
            await this.consultationsService.markAsPaid(consultationId, reference);
            const consultation = await this.consultationsService.findById(consultationId);
            const queueEntry = await this.consultationsService.addToQueue(consultationId);
            
            // Calculate estimated wait time (simple: position * 15 minutes)
            const estimatedWaitTime = queueEntry.priority * 15;
            
            return {
              success: true,
              paid: true,
              queueEntry: {
                id: queueEntry.id,
                doctorId: consultation.doctor.id,
                patientId: consultation.patient.id,
                consultationId,
                position: queueEntry.priority,
                joinedAt: queueEntry.createdAt.toISOString(),
                estimatedWaitTime,
                status: queueEntry.status === 'pending' ? 'waiting' : queueEntry.status,
                urgencyLevel: consultation.urgencyLevel,
              },
            };
          }
        }
      }
    }

    return {
      success: isSuccessful,
      paid: isSuccessful,
      transaction: {
        status: transaction.status,
        amount: transaction.amount / 100, // Convert from pesewas
        currency: transaction.currency,
        reference: transaction.reference,
      },
    };
  }

  private async computeHmac(payload: string, secret: string) {
    const crypto = await import('crypto');
    const hmac = crypto.createHmac('sha512', secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }
}


