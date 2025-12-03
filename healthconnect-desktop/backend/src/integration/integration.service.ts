import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { InventoryService } from '../inventory/inventory.service';
import { SyncInventoryDto } from './dto/sync-inventory.dto';
import { StockUpdateDto } from './dto/stock-update.dto';
import { IntegrationInventoryQueryDto } from './dto/list-inventory.dto';
import { StockMovementType } from '../inventory/entities/stock-movement.entity';
import { ActivityService } from '../activity/activity.service';
import { ActivityResourceType } from '../activity/entities/activity-log.entity';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { UserRole } from '../common/enums/role.enum';

@Injectable()
export class IntegrationService {
  constructor(
    @InjectRepository(InventoryItem) private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(Pharmacy) private readonly pharmacyRepo: Repository<Pharmacy>,
    private readonly inventoryService: InventoryService,
    private readonly activityService: ActivityService,
  ) {}

  async syncInventory(pharmacyId: string, dto: SyncInventoryDto, userId: string, role: UserRole) {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one item is required');
    }
    if (dto.items.length > 500) {
      throw new BadRequestException('You can sync up to 500 items per request.');
    }
    await this.ensurePharmacy(pharmacyId);

    let created = 0;
    let updated = 0;

    for (const item of dto.items) {
      const externalId = item.externalId.trim();
      let entity = await this.inventoryRepo.findOne({
        where: { pharmacy: { id: pharmacyId }, externalId },
      });

      if (!entity) {
        await this.inventoryService.create(pharmacyId, item, userId);
        created += 1;
        continue;
      }

      const { quantityInStock, ...rest } = item;
      await this.inventoryService.update(pharmacyId, entity.id, rest, userId, role);
      const delta = quantityInStock - entity.quantityInStock;
      if (delta !== 0) {
        await this.inventoryService.adjustQuantity(
          pharmacyId,
          entity.id,
          delta,
          delta > 0 ? StockMovementType.RESTOCK : StockMovementType.ADJUSTMENT,
          userId,
          'External sync',
        );
      }
      updated += 1;
    }

    await this.activityService.record({
      resourceType: ActivityResourceType.INTEGRATION,
      resourceId: pharmacyId,
      action: 'integration.inventory.sync',
      metadata: {
        pharmacyId,
        created,
        updated,
      },
    });

    return {
      message: 'Inventory synchronized successfully',
      created,
      updated,
    };
  }

  async applyStockUpdate(pharmacyId: string, dto: StockUpdateDto, userId: string) {
    if (!dto.inventoryItemId && !dto.externalId) {
      throw new BadRequestException('Provide either inventoryItemId or externalId.');
    }
    const item = await this.findInventoryItem(pharmacyId, dto.inventoryItemId, dto.externalId);
    await this.inventoryService.adjustQuantity(
      pharmacyId,
      item.id,
      dto.quantityChange,
      dto.quantityChange >= 0 ? StockMovementType.RESTOCK : StockMovementType.ADJUSTMENT,
      userId,
      dto.reference ?? 'Integration stock update',
    );

    await this.activityService.record({
      resourceType: ActivityResourceType.INTEGRATION,
      resourceId: pharmacyId,
      action: 'integration.inventory.stock_update',
      metadata: {
        pharmacyId,
        inventoryItemId: item.id,
        quantityChange: dto.quantityChange,
        reference: dto.reference ?? null,
      },
    });

    return { message: 'Stock updated' };
  }

  async listInventory(pharmacyId: string, query: IntegrationInventoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await this.inventoryRepo.findAndCount({
      where: { pharmacy: { id: pharmacyId } },
      order: { name: 'ASC' },
      skip,
      take: limit,
      relations: ['pharmacy'],
    });

    return {
      data: items.map((item) => this.inventoryService.toInventoryResponse(item)),
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  private async findInventoryItem(pharmacyId: string, itemId?: string, externalId?: string) {
    const where = itemId
      ? { id: itemId, pharmacy: { id: pharmacyId } }
      : { pharmacy: { id: pharmacyId }, externalId: externalId };

    const item = await this.inventoryRepo.findOne({ where });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
    return item;
  }

  private async ensurePharmacy(pharmacyId: string) {
    const pharmacy = await this.pharmacyRepo.findOne({ where: { id: pharmacyId } });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }
    return pharmacy;
  }
}


