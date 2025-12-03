import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../common/entities/user.entity';
import { Pharmacy } from '../../pharmacy/entities/pharmacy.entity';

@Entity({ name: 'sync_sessions' })
export class SyncSession extends BaseEntity {
  @ManyToOne(() => User, (user) => user.syncSessions)
  user: User;

  @ManyToOne(() => Pharmacy)
  pharmacy: Pharmacy;

  @Column({ length: 16 })
  clientVersion: string;

  @Column({ type: 'timestamp', nullable: true })
  lastMutationAt?: Date;

  @Column({ default: false })
  hasConflicts: boolean;
}
