import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Pharmacy } from '../../pharmacy/entities/pharmacy.entity';
import { User } from '../../common/entities/user.entity';

export enum BackupStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum BackupType {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
}

@Entity({ name: 'backup_records' })
export class BackupRecord extends BaseEntity {
  @ManyToOne(() => Pharmacy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pharmacy_id' })
  pharmacy: Pharmacy;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User | null;

  @Column({ type: 'enum', enum: BackupType, default: BackupType.MANUAL })
  type: BackupType;

  @Column({ type: 'enum', enum: BackupStatus, default: BackupStatus.COMPLETED })
  status: BackupStatus;

  @Column({ type: 'bigint', default: 0 })
  size: number;

  @Column({ name: 'storage_path', length: 255 })
  storagePath: string;

  @Column({ length: 64, nullable: true })
  checksum?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;
}


