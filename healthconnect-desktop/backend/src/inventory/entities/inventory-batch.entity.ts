import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { InventoryItem } from './inventory-item.entity';

@Entity({ name: 'inventory_batches' })
export class InventoryBatch extends BaseEntity {
  @ManyToOne(() => InventoryItem, (item) => item.batches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventory_item_id' })
  inventoryItem: InventoryItem;

  @Column({ length: 64 })
  lotNumber: string;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'date', nullable: true })
  expiryDate?: Date;
}


