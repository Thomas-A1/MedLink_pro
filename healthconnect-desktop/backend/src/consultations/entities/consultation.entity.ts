import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../common/entities/user.entity';

export enum ConsultationStatus {
  REQUESTED = 'requested',
  QUEUED = 'queued',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum ConsultationType {
  VOICE = 'voice',
  VIDEO = 'video',
}

export enum UrgencyLevel {
  EMERGENCY = 'emergency',
  URGENT = 'urgent',
  ROUTINE = 'routine',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

@Entity({ name: 'consultations' })
export class Consultation extends BaseEntity {
  @ManyToOne(() => User)
  patient: User;

  @ManyToOne(() => User)
  doctor: User;

  @Column({ type: 'enum', enum: ConsultationStatus, default: ConsultationStatus.REQUESTED })
  status: ConsultationStatus;

  @Column({ type: 'enum', enum: UrgencyLevel, default: UrgencyLevel.ROUTINE })
  urgencyLevel: UrgencyLevel;

  @Column({ type: 'text', nullable: true })
  chiefComplaint?: string;

  @Column({ type: 'text', nullable: true })
  audioComplaintUrl?: string;

  @Column({ type: 'enum', enum: ConsultationType, default: ConsultationType.VIDEO })
  consultationType: ConsultationType;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  paymentAmount?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentTransactionId?: string;

  @Column({ type: 'int', nullable: true })
  queuePosition?: number;

  @Column({ type: 'timestamp', nullable: true })
  queueJoinedAt?: Date;

  @Column({ type: 'int', nullable: true })
  estimatedWaitTime?: number; // minutes

  @Column({ type: 'timestamp', nullable: true })
  callStartedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  callEndedAt?: Date;

  @Column({ type: 'int', nullable: true })
  callDuration?: number; // seconds

  @Column({ type: 'text', nullable: true })
  callRecordingUrl?: string;

  @Column({ type: 'text', nullable: true })
  transcript?: string;

  @Column({ type: 'text', nullable: true })
  doctorNotes?: string;

  @Column({ type: 'text', nullable: true })
  diagnosis?: string;

  @Column({ type: 'text', nullable: true })
  treatmentPlan?: string;

  @Column({ type: 'boolean', default: false })
  followUpRequired: boolean;

  @Column({ type: 'timestamp', nullable: true })
  followUpDate?: Date;
}

