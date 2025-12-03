import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { PharmacyInventory } from './pharmacy-inventory.entity';

@Entity({ name: 'mobile_drugs' })
export class Drug extends BaseEntity {
  @Column({ length: 160 })
  name: string;

  @Column({ length: 160, nullable: true })
  genericName?: string;

  @Column({ length: 80, nullable: true })
  category?: string;

  @Column({ length: 40, nullable: true })
  form?: string;

  @Column({ length: 40, nullable: true })
  strength?: string;

  @OneToMany(() => PharmacyInventory, (inventory) => inventory.drug)
  inventoryItems: PharmacyInventory[];
}

