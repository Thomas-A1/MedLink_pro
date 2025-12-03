import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../common/entities/user.entity';
import { Pharmacy } from '../../pharmacy/entities/pharmacy.entity';

export enum QueueStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  SKIPPED = 'skipped',
}

@Entity({ name: 'queue_entries' })
export class QueueEntry extends BaseEntity {
  @ManyToOne(() => Pharmacy)
  pharmacy: Pharmacy;

  @ManyToOne(() => User)
  patient: User;

  @Index()
  @Column({ type: 'enum', enum: QueueStatus, default: QueueStatus.PENDING })
  status: QueueStatus;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;
}
