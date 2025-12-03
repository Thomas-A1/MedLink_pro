import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../common/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export enum ActivityResourceType {
  INVENTORY_ITEM = 'inventory_item',
  STOCK_MOVEMENT = 'stock_movement',
  PRESCRIPTION = 'prescription',
  QUEUE_ENTRY = 'queue_entry',
  ORGANIZATION = 'organization',
  PHARMACY = 'pharmacy',
  AUTH = 'auth',
  SALE = 'sale',
  REPORT = 'report',
  BACKUP = 'backup',
  INTEGRATION = 'integration',
}

@Entity({ name: 'activity_logs' })
export class ActivityLog extends BaseEntity {
  @ManyToOne(() => User, { nullable: true })
  actor?: User | null;

  @ManyToOne(() => Organization, { nullable: true })
  organization?: Organization | null;

  @Index()
  @Column({ type: 'enum', enum: ActivityResourceType })
  resourceType: ActivityResourceType;

  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  resourceId?: string | null;

  @Column({ length: 160 })
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;
}

