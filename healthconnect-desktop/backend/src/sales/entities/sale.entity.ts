import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Pharmacy } from '../../pharmacy/entities/pharmacy.entity';
import { InventoryItem } from '../../inventory/entities/inventory-item.entity';
import { User } from '../../common/entities/user.entity';
import { PharmacyService } from '../../pharmacy/entities/pharmacy-service.entity';

@Entity({ name: 'sales' })
export class Sale extends BaseEntity {
  @ManyToOne(() => Pharmacy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pharmacy_id' })
  pharmacy: Pharmacy;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'sold_by_id' })
  soldBy?: User;

  @Column({ name: 'customerName', type: 'varchar', length: 160, nullable: true })
  customerName?: string;

  @Column({ name: 'customerPhone', type: 'varchar', length: 20, nullable: true })
  customerPhone?: string;

  @Column({ name: 'totalAmount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'varchar', length: 10, default: 'GHS' })
  currency: string;

  @Column({ name: 'paymentMethod', type: 'varchar', length: 32, default: 'cash' })
  paymentMethod: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];
}

@Entity({ name: 'sale_items' })
export class SaleItem extends BaseEntity {
  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @ManyToOne(() => InventoryItem, { nullable: true })
  @JoinColumn({ name: 'inventory_item_id' })
  inventoryItem: InventoryItem | null;

  @ManyToOne(() => PharmacyService, { nullable: true })
  @JoinColumn({ name: 'service_id' })
  service: PharmacyService | null;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'unitPrice', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ name: 'totalPrice', type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;
}

