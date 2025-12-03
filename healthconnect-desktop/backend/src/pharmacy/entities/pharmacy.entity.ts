import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Point } from 'geojson';
import { BaseEntity } from '../../common/entities/base.entity';
import { PharmacyStaff } from './pharmacy-staff.entity';
import { InventoryItem } from '../../inventory/entities/inventory-item.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { PharmacyService } from './pharmacy-service.entity';

@Entity({ name: 'pharmacies' })
export class Pharmacy extends BaseEntity {
  @ManyToOne(() => Organization, (organization) => organization.pharmacies, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @Column({ length: 160 })
  name: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ length: 64 })
  region: string;

  @Column({ length: 64 })
  district: string;

  @Column({ length: 20 })
  contactPhone: string;

  @Column({ nullable: true })
  contactEmail?: string;

  @Column({ type: 'double precision', nullable: true })
  latitude?: number;

  @Column({ type: 'double precision', nullable: true })
  longitude?: number;

  @Column({ length: 120, nullable: true })
  country?: string;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  location?: Point;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  isPartner: boolean;

  @OneToMany(() => PharmacyStaff, (staff) => staff.pharmacy)
  staff: PharmacyStaff[];

  @OneToMany(() => InventoryItem, (item) => item.pharmacy)
  inventoryItems: InventoryItem[];

  @OneToMany(() => PharmacyService, (service) => service.pharmacy)
  services: PharmacyService[];
}
