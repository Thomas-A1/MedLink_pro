import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Pharmacy } from '../../pharmacy/entities/pharmacy.entity';

export type PaymentPurpose = 'sale' | 'prescription' | 'service' | 'consultation';
export type PaymentStatus = 'initialized' | 'paid' | 'failed';

@Entity({ name: 'payment_intents' })
export class PaymentIntent extends BaseEntity {
  @Index('IDX_payment_intents_reference', { unique: true })
  @Column({ type: 'varchar', length: 64 })
  reference!: string;

  @Column({ type: 'varchar', length: 64 })
  provider!: 'paystack';

  @Column({ type: 'varchar', length: 16 })
  purpose!: PaymentPurpose;

  @Column({ type: 'uuid', nullable: true })
  pharmacyId?: Pharmacy['id'] | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 8, default: 'GHS' })
  currency!: string;

  @Column({ type: 'varchar', length: 24, default: 'initialized' })
  status!: PaymentStatus;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 160, nullable: true })
  customerEmail?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  customerPhone?: string | null;
}


