import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Pharmacy } from '../../locations/entities/pharmacy.entity';
import { Drug } from './drug.entity';

@Entity({ name: 'mobile_pharmacy_inventory' })
export class PharmacyInventory extends BaseEntity {
  @ManyToOne(() => Pharmacy, { eager: true })
  @JoinColumn({ name: 'pharmacy_id' })
  pharmacy: Pharmacy;

  @ManyToOne(() => Drug, (drug) => drug.inventoryItems, { eager: true })
  @JoinColumn({ name: 'drug_id' })
  drug: Drug;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'double precision', nullable: true })
  price?: number;

  @Column({ length: 40, nullable: true })
  dosage?: string;
}

