import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Pharmacy } from './pharmacy.entity';

export enum ServiceType {
  LAB_TEST = 'lab_test',
  BLOOD_TRANSFUSION = 'blood_transfusion',
  BLOOD_TEST = 'blood_test',
  X_RAY = 'x_ray',
  ULTRASOUND = 'ultrasound',
  ECG = 'ecg',
  CONSULTATION = 'consultation',
  VACCINATION = 'vaccination',
  PHARMACY = 'pharmacy',
  EMERGENCY = 'emergency',
  MATERNITY = 'maternity',
  PEDIATRICS = 'pediatrics',
  SURGERY = 'surgery',
  DENTAL = 'dental',
  PHYSIOTHERAPY = 'physiotherapy',
  OTHER = 'other',
}

@Entity({ name: 'pharmacy_services' })
export class PharmacyService extends BaseEntity {
  @ManyToOne(() => Pharmacy, (pharmacy) => pharmacy.services, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pharmacy_id' })
  pharmacy: Pharmacy;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ type: 'enum', enum: ServiceType })
  type: ServiceType;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price?: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency?: string;

  @Column({ name: 'isActive', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;
}

