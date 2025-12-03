import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Sale, SaleItem } from './entities/sale.entity';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { PharmacyService as PharmacyServiceEntity } from '../pharmacy/entities/pharmacy-service.entity';
import { User } from '../common/entities/user.entity';
import { StockMovement, StockMovementType } from '../inventory/entities/stock-movement.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ActivityService } from '../activity/activity.service';
import { ActivityResourceType } from '../activity/entities/activity-log.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale) private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SaleItem) private readonly saleItemRepo: Repository<SaleItem>,
    @InjectRepository(Pharmacy) private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(InventoryItem) private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(PharmacyServiceEntity) private readonly pharmacyServiceRepo: Repository<PharmacyServiceEntity>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(StockMovement) private readonly movementRepo: Repository<StockMovement>,
    private readonly dataSource: DataSource,
    private readonly activityService: ActivityService,
  ) {}

  async list(pharmacyId: string, limit = 50) {
    return this.saleRepo.find({
      where: { pharmacy: { id: pharmacyId } },
      relations: ['soldBy', 'items', 'items.inventoryItem', 'items.service'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async create(pharmacyId: string, dto: CreateSaleDto, userId?: string) {
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { id: pharmacyId },
      relations: ['organization'],
    });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    const soldBy = userId ? await this.userRepo.findOne({ where: { id: userId } }) : null;

    // Validate and check inventory availability
    const inventoryItemsToSell: Array<{ item: InventoryItem; quantity: number; unitPrice: number }> = [];
    const serviceItemsToSell: Array<{ service: PharmacyServiceEntity; quantity: number; unitPrice: number }> = [];
    let totalAmount = 0;

    for (const saleItem of dto.items) {
      if (saleItem.inventoryItemId) {
        const inventoryItem = await this.inventoryRepo.findOne({
          where: { id: saleItem.inventoryItemId, pharmacy: { id: pharmacyId } },
        });
        if (!inventoryItem) {
          throw new NotFoundException(`Inventory item ${saleItem.inventoryItemId} not found`);
        }
        if (inventoryItem.quantityInStock < saleItem.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${inventoryItem.name}. Available: ${inventoryItem.quantityInStock}, Requested: ${saleItem.quantity}`,
          );
        }
        const unitPrice = saleItem.unitPrice ?? inventoryItem.sellingPrice;
        const itemTotal = unitPrice * saleItem.quantity;
        totalAmount += itemTotal;
        inventoryItemsToSell.push({
          item: inventoryItem,
          quantity: saleItem.quantity,
          unitPrice,
        });
      } else if (saleItem.serviceId) {
        const service = await this.pharmacyServiceRepo.findOne({
          where: { id: saleItem.serviceId, pharmacy: { id: pharmacyId } } as any,
        });
        if (!service || !service.isActive) {
          throw new NotFoundException(`Service ${saleItem.serviceId} not found or inactive`);
        }
        const quantity = saleItem.quantity ?? 1;
        const unitPrice = saleItem.unitPrice ?? Number(service.price ?? 0);
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
          throw new BadRequestException('Service price not set');
        }
        const itemTotal = unitPrice * quantity;
        totalAmount += itemTotal;
        serviceItemsToSell.push({
          service,
          quantity,
          unitPrice,
        });
      } else {
        throw new BadRequestException('Each sale item must have either inventoryItemId or serviceId');
      }
    }

    // Create sale transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sale = queryRunner.manager.create(Sale, {
        pharmacy,
        soldBy: soldBy ?? undefined,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        totalAmount,
        currency: dto.currency ?? 'GHS',
        paymentMethod: dto.paymentMethod ?? 'cash',
        notes: dto.notes,
      });
      const savedSale = await queryRunner.manager.save(Sale, sale);

      // Create sale items and update inventory
      const saleItems: SaleItem[] = [];
      for (const { item, quantity, unitPrice } of inventoryItemsToSell) {
        const saleItem = queryRunner.manager.create(SaleItem, {
          sale: savedSale,
          inventoryItem: item,
          service: null,
          quantity,
          unitPrice,
          totalPrice: unitPrice * quantity,
        });
        saleItems.push(await queryRunner.manager.save(SaleItem, saleItem));

        // Update inventory quantity
        item.quantityInStock -= quantity;
        await queryRunner.manager.save(InventoryItem, item);

        // Create stock movement record
        const movement = queryRunner.manager.create(StockMovement, {
          inventoryItem: item,
          movementType: StockMovementType.SALE,
          quantity: -quantity,
          balanceAfter: item.quantityInStock,
          createdBy: soldBy ?? undefined,
          notes: `Sale #${savedSale.id.substring(0, 8)}`,
        });
        await queryRunner.manager.save(StockMovement, movement);

        // Check for low stock alert
        if (item.quantityInStock <= item.reorderLevel) {
          // Log low stock activity
          await this.activityService.record({
            actor: soldBy ?? undefined,
            organization: pharmacy.organization ?? null,
            resourceType: ActivityResourceType.INVENTORY_ITEM,
            resourceId: item.id,
            action: 'inventory.low_stock',
            metadata: {
              pharmacyId,
              itemName: item.name,
              quantityInStock: item.quantityInStock,
              reorderLevel: item.reorderLevel,
            },
          });
        }
      }
      // Persist service sale items (no stock movement)
      for (const { service, quantity, unitPrice } of serviceItemsToSell) {
        const saleItem = queryRunner.manager.create(SaleItem, {
          sale: savedSale,
          inventoryItem: null,
          service,
          quantity,
          unitPrice,
          totalPrice: unitPrice * quantity,
        });
        saleItems.push(await queryRunner.manager.save(SaleItem, saleItem));
      }

      // Fetch complete sale with relations before commit to ensure consistency
      const completeSale = await this.saleRepo.findOne({
        where: { id: savedSale.id },
        relations: ['soldBy', 'items', 'items.inventoryItem', 'items.service'],
      });

      await queryRunner.commitTransaction();

      // Log sale activity (post-commit; failures here should not affect the sale)
      try {
        await this.activityService.record({
          actor: soldBy ?? undefined,
          organization: pharmacy.organization ?? null,
          resourceType: ActivityResourceType.SALE,
          resourceId: savedSale.id,
          action: 'sale.create',
          metadata: {
            pharmacyId,
            totalAmount,
            itemCount: saleItems.length,
            customerName: dto.customerName,
          },
        });
      } catch {
        // Best-effort logging; ignore failures
      }

      return completeSale;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getLowStockItems(pharmacyId: string) {
    return this.inventoryRepo.find({
      where: {
        pharmacy: { id: pharmacyId },
      },
    }).then((items) =>
      items.filter((item) => item.quantityInStock <= item.reorderLevel && item.isAvailable),
    );
  }
}

