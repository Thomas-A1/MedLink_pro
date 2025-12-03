import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity({ name: 'mobile_doctors' })
export class Doctor extends BaseEntity {
  @Column({ length: 160 })
  name: string;

  @Column({ length: 120 })
  specialty: string;

  @Column({ length: 160 })
  facility: string;

  @Column({ type: 'double precision', default: 0 })
  rating: number;

  @Column({ type: 'integer', default: 0 })
  reviewCount: number;

  @Column({ type: 'double precision', default: 0 })
  consultationFee: number;

  @Column({ type: 'integer', default: 5 })
  waitTimeMinutes: number;

  @Column({ default: true })
  isOnline: boolean;

  @Column({ type: 'timestamp', name: 'last_seen_at', nullable: true })
  lastSeenAt?: Date;

  @Column({ type: 'text', array: true, nullable: true })
  languages?: string[];

  @Column({ type: 'integer', default: 1 })
  experienceYears: number;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;
}

