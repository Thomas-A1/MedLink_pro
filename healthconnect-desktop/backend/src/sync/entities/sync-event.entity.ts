import { Column, Entity, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Pharmacy } from '../../pharmacy/entities/pharmacy.entity';
import { User } from '../../common/entities/user.entity';

export enum SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  FAILED = 'failed',
}

@Entity({ name: 'sync_events' })
export class SyncEvent extends BaseEntity {
  @ManyToOne(() => Pharmacy)
  pharmacy: Pharmacy;

  @ManyToOne(() => User, { nullable: true })
  user?: User;

  @Column({ length: 32 })
  source: string;

  @Column({ length: 64 })
  entityType: string;

  @Column({ nullable: true })
  entityId?: string;

  @Column({ length: 64 })
  payloadHash: string;

  @Index()
  @Column({ type: 'enum', enum: SyncStatus, default: SyncStatus.PENDING })
  status: SyncStatus;

  @Column({ type: 'text' })
  payload: string;

  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @Column({ type: 'timestamp', nullable: true })
  syncedAt?: Date;
}
