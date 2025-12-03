import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Consultation, UrgencyLevel } from '../../consultations/entities/consultation.entity';

export enum QueueStatus {
  WAITING = 'waiting',
  READY = 'ready',
  CALLING = 'calling',
  TIMED_OUT = 'timed_out',
  REMOVED = 'removed',
}

@Entity({ name: 'mobile_queue_entries' })
export class QueueEntry extends BaseEntity {
  @ManyToOne(() => Consultation, { eager: true })
  @JoinColumn({ name: 'consultation_id' })
  consultation: Consultation;

  @Column({ type: 'integer' })
  position: number;

  @Column({ type: 'timestamp' })
  joinedAt: Date;

  @Column({ type: 'integer', default: 5 })
  estimatedWaitTime: number;

  @Column({ type: 'timestamp', nullable: true })
  readyAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  timeoutAt?: Date;

  @Column({ type: 'enum', enum: QueueStatus, default: QueueStatus.WAITING })
  status: QueueStatus;

  @Column({ type: 'enum', enum: UrgencyLevel, default: UrgencyLevel.ROUTINE })
  urgencyLevel: UrgencyLevel;
}

