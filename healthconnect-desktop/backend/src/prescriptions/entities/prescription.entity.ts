import { Column, Entity, ManyToOne, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Pharmacy } from '../../pharmacy/entities/pharmacy.entity';
import { User } from '../../common/entities/user.entity';
import { PrescriptionMedication } from './prescription-medication.entity';

export enum PrescriptionStatus {
  RECEIVED = 'received',
  PREPARING = 'preparing',
  READY = 'ready',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'prescriptions' })
export class Prescription extends BaseEntity {
  @ManyToOne(() => User, { eager: true })
  patient: User;

  @ManyToOne(() => User, { eager: true })
  doctor: User;

  @ManyToOne(() => Pharmacy, { nullable: true })
  assignedPharmacy?: Pharmacy;

  @Index()
  @Column({ length: 32 })
  verificationCode: string;

  @Column({ default: false })
  sentToPharmacy: boolean;

  @Column({ type: 'enum', enum: PrescriptionStatus, default: PrescriptionStatus.RECEIVED })
  status: PrescriptionStatus;

  @Column({ type: 'timestamp', nullable: true })
  readyAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  pickedUpAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  fulfilledAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  statusNotes?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  substitutions?: Array<{
    medicationId: string;
    substituteDrugName: string;
    reason?: string;
  }>;

  @OneToMany(() => PrescriptionMedication, (med) => med.prescription, {
    cascade: true,
  })
  medications: PrescriptionMedication[];
}
