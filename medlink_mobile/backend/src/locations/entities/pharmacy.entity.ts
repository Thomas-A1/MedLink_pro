import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity({ name: 'mobile_pharmacies' })
export class Pharmacy extends BaseEntity {
  @Column({ length: 160 })
  name: string;

  @Column({ length: 200 })
  address: string;

  @Column({ nullable: true, length: 32 })
  phone?: string;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ type: 'double precision', nullable: true })
  rating?: number;

  @Column({ default: false })
  isPartner: boolean;

  @Column({ default: true })
  isOpen: boolean;

  @Column({ nullable: true, length: 120 })
  openingHours?: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ type: 'text', array: true, nullable: true })
  services?: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}

