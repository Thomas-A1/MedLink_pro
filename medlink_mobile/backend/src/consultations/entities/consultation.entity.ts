import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';

export enum ConsultationStatus {
  REQUESTED = 'requested',
  QUEUED = 'queued',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum UrgencyLevel {
  EMERGENCY = 'emergency',
  URGENT = 'urgent',
  ROUTINE = 'routine',
}

export enum ConsultationType {
  VOICE = 'voice',
  VIDEO = 'video',
}

export enum ConsultationPaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

@Entity({ name: 'mobile_consultations' })
export class Consultation extends BaseEntity {
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'patient_id' })
  patient: User;

  @ManyToOne(() => Doctor, { eager: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({
    type: 'enum',
    enum: ConsultationStatus,
    default: ConsultationStatus.REQUESTED,
  })
  status: ConsultationStatus;

  @Column({
    type: 'enum',
    enum: UrgencyLevel,
    default: UrgencyLevel.ROUTINE,
  })
  urgencyLevel: UrgencyLevel;

  @Column({ type: 'enum', enum: ConsultationType, default: ConsultationType.VIDEO })
  consultationType: ConsultationType;

  @Column({
    type: 'enum',
    enum: ConsultationPaymentStatus,
    default: ConsultationPaymentStatus.PENDING,
  })
  paymentStatus: ConsultationPaymentStatus;

  @Column({ nullable: true })
  chiefComplaint?: string;

  @Column({ nullable: true })
  audioComplaintUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  complaintMetadata?: Record<string, any>;

  @Column({ type: 'double precision', nullable: true })
  paymentAmount?: number;

  @Column({ nullable: true })
  paymentTransactionId?: string;

  @Column({ type: 'integer', nullable: true })
  queuePosition?: number;

  @Column({ type: 'timestamp', nullable: true })
  queueJoinedAt?: Date;

  @Column({ type: 'integer', nullable: true })
  estimatedWaitTime?: number;

  @Column({ type: 'timestamp', nullable: true })
  callStartedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  callEndedAt?: Date;

  @Column({ type: 'integer', nullable: true })
  callDuration?: number;

  @Column({ nullable: true })
  callRecordingUrl?: string;

  @Column({ type: 'text', nullable: true })
  transcript?: string;

  @Column({ type: 'text', nullable: true })
  doctorNotes?: string;

  @Column({ type: 'text', nullable: true })
  diagnosis?: string;

  @Column({ type: 'text', nullable: true })
  treatmentPlan?: string;

  @Column({ default: false })
  followUpRequired: boolean;

  @Column({ type: 'timestamp', nullable: true })
  followUpDate?: Date;
}

