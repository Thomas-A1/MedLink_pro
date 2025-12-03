import { Column, Entity, ManyToOne, OneToMany, Index, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Pharmacy } from '../../pharmacy/entities/pharmacy.entity';
import { StockMovement } from './stock-movement.entity';
import { User } from '../../common/entities/user.entity';
import { InventoryBatch } from './inventory-batch.entity';

@Entity({ name: 'inventory_items' })
export class InventoryItem extends BaseEntity {
  @ManyToOne(() => Pharmacy, (pharmacy) => pharmacy.inventoryItems)
  @JoinColumn({ name: 'pharmacyId' })
  pharmacy: Pharmacy;

  @Index()
  @Column({ length: 160 })
  name: string;

  @Column({ length: 160, nullable: true })
  genericName?: string;

  @Column({ length: 120 })
  category: string;

  @Column({ length: 64 })
  form: string;

  @Column({ length: 64 })
  strength: string;

  @Column({ length: 160, nullable: true })
  manufacturer?: string;

  @Column({ length: 64, nullable: true })
  batchNumber?: string;

  @Index('inventory_external_id_idx')
  @Column({ name: 'external_id', type: 'varchar', length: 120, nullable: true })
  externalId?: string | null;

  @Column({ type: 'date', nullable: true })
  expiryDate?: Date;

  @Column({ type: 'int', default: 0 })
  quantityInStock: number;

  @Column({ type: 'int', default: 0 })
  reorderLevel: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  sellingPrice: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  barcode?: string;

  @Column({ default: false })
  requiresPrescription: boolean;

  @Column({ default: true })
  isAvailable: boolean;

  @OneToMany(() => StockMovement, (movement) => movement.inventoryItem)
  movements: StockMovement[];

  @OneToMany(() => InventoryBatch, (batch) => batch.inventoryItem)
  batches: InventoryBatch[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User | null;
}
