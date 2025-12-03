import { Column, Entity, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Pharmacy } from '../../pharmacy/entities/pharmacy.entity';
import { User } from '../../common/entities/user.entity';

export enum OrganizationType {
  PHARMACY = 'pharmacy',
  HOSPITAL = 'hospital',
}

@Entity({ name: 'organizations' })
export class Organization extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 160 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 160 })
  slug: string;

  @Column({ type: 'enum', enum: OrganizationType, default: OrganizationType.PHARMACY })
  type: OrganizationType;

  @Column({ name: 'contact_email', length: 120, nullable: true })
  contactEmail?: string;

  @Column({ name: 'contact_phone', length: 32, nullable: true })
  contactPhone?: string;

  @Column({ length: 64, nullable: true })
  timezone?: string;

  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, unknown>;

  @Column({ name: 'brand_color', length: 7, nullable: true })
  brandColor?: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl?: string;

  @OneToMany(() => Pharmacy, (pharmacy) => pharmacy.organization)
  pharmacies: Pharmacy[];

  @OneToMany(() => User, (user) => user.organization)
  users: User[];
}

