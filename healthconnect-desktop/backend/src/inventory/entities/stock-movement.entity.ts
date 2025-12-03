import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { InventoryItem } from './inventory-item.entity';
import { User } from '../../common/entities/user.entity';

export enum StockMovementType {
  RESTOCK = 'restock',
  SALE = 'sale',
  RETURN = 'return',
  ADJUSTMENT = 'adjustment',
  EXPIRED = 'expired',
  DAMAGED = 'damaged',
  TRANSFER_OUT = 'transfer_out',
  TRANSFER_IN = 'transfer_in',
}

@Entity({ name: 'stock_movements' })
export class StockMovement extends BaseEntity {
  @ManyToOne(() => InventoryItem, (item) => item.movements)
  inventoryItem: InventoryItem;

  @ManyToOne(() => User, { nullable: true })
  createdBy?: User;

  @Column({ type: 'enum', enum: StockMovementType })
  movementType: StockMovementType;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int' })
  balanceAfter: number;

  @Column({ nullable: true })
  referenceId?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
