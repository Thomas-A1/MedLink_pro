import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { StockMovement, StockMovementType } from './entities/stock-movement.entity';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { User } from '../common/entities/user.entity';
import { UserRole } from '../common/enums/role.enum';
import { ActivityService } from '../activity/activity.service';
import { ActivityResourceType } from '../activity/entities/activity-log.entity';
import { InventoryBatch } from './entities/inventory-batch.entity';
import { CreateInventoryBatchDto } from './dto/create-batch.dto';
import { ImportInventoryDto } from './dto/import-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem) private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(StockMovement) private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(InventoryBatch) private readonly batchRepo: Repository<InventoryBatch>,
    @InjectRepository(Pharmacy) private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly activityService: ActivityService,
  ) {}

  async list(pharmacyId: string) {
    const items = await this.inventoryRepo.find({
      where: { pharmacy: { id: pharmacyId } },
      relations: ['pharmacy', 'batches'],
      order: { name: 'ASC' },
    });

    return items.map((item) => this.toInventoryResponse(item));
  }

  async create(pharmacyId: string, dto: CreateInventoryItemDto, userId?: string) {
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { id: pharmacyId },
      relations: ['organization'],
    });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }
    const user = userId ? await this.userRepo.findOne({ where: { id: userId } }) : null;

    const { expiryDate, externalId, ...rest } = dto;
    const item = this.inventoryRepo.create({
      ...rest,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      pharmacy,
      createdBy: user ?? undefined,
      externalId: externalId?.trim() || null,
    });
    item.quantityInStock = dto.quantityInStock;
    await this.inventoryRepo.save(item);

    const movement = this.movementRepo.create({
      inventoryItem: item,
      movementType: StockMovementType.RESTOCK,
      quantity: dto.quantityInStock,
      balanceAfter: dto.quantityInStock,
      createdBy: user ?? undefined,
      notes: 'Initial stock',
    });
    await this.movementRepo.save(movement);

    const created = await this.inventoryRepo.findOne({
      where: { id: item.id },
      relations: ['pharmacy', 'batches'],
    });

    await this.activityService.record({
      actor: user ?? undefined,
      organization: pharmacy.organization,
      resourceType: ActivityResourceType.INVENTORY_ITEM,
      resourceId: item.id,
      action: 'inventory.create',
      metadata: {
        pharmacyId,
        name: dto.name,
        quantity: dto.quantityInStock,
      },
    });

    return this.toInventoryResponse(created!);
  }

  async update(pharmacyId: string, itemId: string, dto: UpdateInventoryItemDto, userId: string, role: UserRole) {
    const item = await this.inventoryRepo.findOne({
      where: { id: itemId, pharmacy: { id: pharmacyId } },
      relations: ['pharmacy', 'createdBy', 'pharmacy.organization'],
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    // Permission: super_admin and hospital_admin can edit; others only if they created it
    if (role !== UserRole.SUPER_ADMIN && role !== UserRole.HOSPITAL_ADMIN) {
      if (!item.createdBy || item.createdBy.id !== userId) {
        throw new (await import('@nestjs/common')).ForbiddenException('You can only edit items you created');
      }
    }

    const { expiryDate, externalId, ...rest } = dto;
    const merged = this.inventoryRepo.merge(item, {
      ...rest,
      expiryDate: expiryDate ? new Date(expiryDate) : item.expiryDate,
      externalId: externalId !== undefined ? externalId?.trim() || null : item.externalId ?? null,
    });
    await this.inventoryRepo.save(merged);

    const updated = await this.inventoryRepo.findOne({
      where: { id: item.id },
      relations: ['pharmacy', 'batches'],
    });

    if (updated) {
      await this.activityService.record({
        organization: updated.pharmacy?.organization,
        resourceType: ActivityResourceType.INVENTORY_ITEM,
        resourceId: updated.id,
        action: 'inventory.update',
        metadata: {
          pharmacyId,
          updates: dto,
        },
      });
    }

    return this.toInventoryResponse(updated!);
  }

  async delete(pharmacyId: string, itemId: string, userId: string, role: UserRole) {
    const item = await this.inventoryRepo.findOne({
      where: { id: itemId, pharmacy: { id: pharmacyId } },
      relations: ['pharmacy', 'createdBy', 'pharmacy.organization'],
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
    if (role !== UserRole.SUPER_ADMIN && role !== UserRole.HOSPITAL_ADMIN) {
      if (!item.createdBy || item.createdBy.id !== userId) {
        throw new (await import('@nestjs/common')).ForbiddenException('You can only delete items you created');
      }
    }
    await this.inventoryRepo.remove(item);
    await this.activityService.record({
      actor: await this.userRepo.findOne({ where: { id: userId } }) ?? undefined,
      organization: item.pharmacy?.organization ?? null,
      resourceType: ActivityResourceType.INVENTORY_ITEM,
      resourceId: item.id,
      action: 'inventory.delete',
      metadata: { pharmacyId, name: item.name },
    });
    return { message: 'Inventory item deleted' };
  }

  async adjustQuantity(
    pharmacyId: string,
    itemId: string,
    quantityDelta: number,
    movementType: StockMovementType,
    userId: string,
    notes?: string,
  ) {
    const item = await this.inventoryRepo.findOne({
      where: { id: itemId, pharmacy: { id: pharmacyId } },
      relations: ['pharmacy', 'pharmacy.organization'],
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    const newBalance = item.quantityInStock + quantityDelta;
    item.quantityInStock = Math.max(newBalance, 0);
    await this.inventoryRepo.save(item);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    const movement = this.movementRepo.create({
      inventoryItem: item,
      movementType,
      quantity: quantityDelta,
      balanceAfter: item.quantityInStock,
      createdBy: user ?? undefined,
      notes,
    });
    await this.movementRepo.save(movement);

    const updated = await this.inventoryRepo.findOne({
      where: { id: item.id },
      relations: ['pharmacy', 'batches'],
    });

    await this.activityService.record({
      actor: user ?? undefined,
      organization: item.pharmacy?.organization,
      resourceType: ActivityResourceType.STOCK_MOVEMENT,
      resourceId: movement.id,
      action: 'inventory.adjust',
      metadata: {
        pharmacyId,
        itemId,
        movementType,
        quantityDelta,
        balanceAfter: item.quantityInStock,
        notes,
      },
    });

    return this.toInventoryResponse(updated!);
  }

  async getMovements(pharmacyId: string, itemId: string, limit = 25) {
    const item = await this.inventoryRepo.findOne({
      where: { id: itemId, pharmacy: { id: pharmacyId } },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    const movements = await this.movementRepo.find({
      where: { inventoryItem: { id: itemId } },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return movements.map((movement) => ({
      id: movement.id,
      movementType: movement.movementType,
      quantity: movement.quantity,
      balanceAfter: movement.balanceAfter,
      notes: movement.notes,
      referenceId: movement.referenceId ?? null,
      createdAt: movement.createdAt,
      createdBy: movement.createdBy
        ? {
            id: movement.createdBy.id,
            email: movement.createdBy.email,
            firstName: movement.createdBy.firstName,
            lastName: movement.createdBy.lastName,
          }
        : null,
    }));
  }

  async seedSampleInventory(pharmacyId: string) {
    const existingCount = await this.inventoryRepo.count({
      where: { pharmacy: { id: pharmacyId } },
    });

    if (existingCount > 0) {
      return;
    }

    const pharmacy = await this.pharmacyRepo.findOne({ where: { id: pharmacyId } });
    if (!pharmacy) {
      return;
    }

    const admin = await this.userRepo.findOne({
      where: { role: UserRole.HOSPITAL_ADMIN },
    });

    const examples: CreateInventoryItemDto[] = [
      {
        name: 'Amoxicillin 500mg Capsules',
        genericName: 'Amoxicillin',
        category: 'Antibiotics',
        form: 'Capsule',
        strength: '500mg',
        manufacturer: 'Sandoz',
        batchNumber: 'AMX-2309',
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        quantityInStock: 180,
        reorderLevel: 60,
        unitPrice: 4.5,
        sellingPrice: 6.75,
        barcode: '8945632100456',
        requiresPrescription: true,
      },
      {
        name: 'Paracetamol Suspension 120mg/5ml',
        genericName: 'Acetaminophen',
        category: 'Analgesics',
        form: 'Syrup',
        strength: '120mg/5ml',
        manufacturer: 'Kinapharma',
        batchNumber: 'PCM-2310',
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        quantityInStock: 90,
        reorderLevel: 30,
        unitPrice: 8.0,
        sellingPrice: 11.5,
        barcode: '8945632100782',
        requiresPrescription: false,
      },
      {
        name: 'Metformin 850mg Tablets',
        genericName: 'Metformin Hydrochloride',
        category: 'Antidiabetics',
        form: 'Tablet',
        strength: '850mg',
        manufacturer: 'Nicholas',
        batchNumber: 'MET-2311',
        expiryDate: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000).toISOString(),
        quantityInStock: 220,
        reorderLevel: 100,
        unitPrice: 2.6,
        sellingPrice: 4.2,
        barcode: '8945632100998',
        requiresPrescription: true,
      },
    ];

    for (const sample of examples) {
      await this.create(pharmacy.id, sample, admin?.id ?? '');
    }
  }

  async listBatches(pharmacyId: string, itemId: string) {
    const item = await this.inventoryRepo.findOne({
      where: { id: itemId, pharmacy: { id: pharmacyId } },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
    const batches = await this.batchRepo.find({
      where: { inventoryItem: { id: itemId } },
      order: { createdAt: 'DESC' },
    });
    return batches.map((batch) => ({
      id: batch.id,
      lotNumber: batch.lotNumber,
      quantity: batch.quantity,
      expiryDate: batch.expiryDate ? batch.expiryDate.toISOString().slice(0, 10) : null,
      createdAt: batch.createdAt.toISOString(),
    }));
  }

  async addBatch(
    pharmacyId: string,
    itemId: string,
    dto: CreateInventoryBatchDto,
    userId: string,
  ) {
    const item = await this.inventoryRepo.findOne({
      where: { id: itemId, pharmacy: { id: pharmacyId } },
      relations: ['pharmacy', 'pharmacy.organization'],
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    const batch = this.batchRepo.create({
      inventoryItem: item,
      lotNumber: dto.lotNumber,
      quantity: dto.quantity,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
    });
    await this.batchRepo.save(batch);

    await this.adjustQuantity(
      pharmacyId,
      itemId,
      dto.quantity,
      StockMovementType.RESTOCK,
      userId,
      `Batch ${dto.lotNumber}`,
    );

    await this.activityService.record({
      actor: await this.userRepo.findOne({ where: { id: userId } }) ?? undefined,
      organization: item.pharmacy?.organization ?? null,
      resourceType: ActivityResourceType.INVENTORY_ITEM,
      resourceId: item.id,
      action: 'inventory.batch.create',
      metadata: {
        pharmacyId,
        itemId,
        lotNumber: dto.lotNumber,
        quantity: dto.quantity,
      },
    });

    return { message: 'Batch recorded successfully' };
  }

  async importInventory(pharmacyId: string, dto: ImportInventoryDto, userId: string) {
    const results = [];
    for (const payload of dto.items) {
      const whereClauses = [];
      const normalizedBarcode = payload.barcode?.trim();
      const normalizedExternalId = payload.externalId?.trim();
      if (normalizedBarcode) {
        whereClauses.push({ pharmacy: { id: pharmacyId }, barcode: normalizedBarcode });
      }
      if (normalizedExternalId) {
        whereClauses.push({ pharmacy: { id: pharmacyId }, externalId: normalizedExternalId });
      }

      let existing: InventoryItem | null = null;
      if (whereClauses.length > 0) {
        existing = await this.inventoryRepo.findOne({
          where: whereClauses,
        });
      }

      if (existing) {
        await this.update(pharmacyId, existing.id, payload, userId, UserRole.HOSPITAL_ADMIN);
        results.push({ id: existing.id, action: 'updated' });
      } else {
        const created = await this.create(pharmacyId, payload, userId);
        results.push({ id: created.id, action: 'created' });
      }
    }
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { id: pharmacyId },
      relations: ['organization'],
    });
    const actor = await this.userRepo.findOne({ where: { id: userId } });
    await this.activityService.record({
      actor: actor ?? undefined,
      organization: pharmacy?.organization ?? null,
      resourceType: ActivityResourceType.INVENTORY_ITEM,
      resourceId: pharmacyId,
      action: 'inventory.import',
      metadata: {
        pharmacyId,
        processed: results.length,
      },
    });

    return {
      message: 'Inventory import completed',
      processed: results.length,
      summary: results,
    };
  }

  async exportInventory(pharmacyId: string) {
    const items = await this.inventoryRepo.find({
      where: { pharmacy: { id: pharmacyId } },
      order: { name: 'ASC' },
    });
    const rows = [
      [
        'Name',
        'Generic',
        'Category',
        'Form',
        'Strength',
        'Quantity',
        'Reorder Level',
        'Unit Price',
        'Selling Price',
        'Barcode',
        'External ID',
        'Expiry Date',
      ],
      ...items.map((item) => [
        item.name,
        item.genericName ?? '',
        item.category,
        item.form,
        item.strength,
        item.quantityInStock.toString(),
        item.reorderLevel.toString(),
        Number(item.unitPrice).toFixed(2),
        Number(item.sellingPrice).toFixed(2),
        item.barcode ?? '',
        item.externalId ?? '',
        item.expiryDate ? item.expiryDate.toISOString().slice(0, 10) : '',
      ]),
    ];
    return buildCsv(rows);
  }

  public toInventoryResponse(item: InventoryItem) {
    const now = new Date();
    const expiry = item.expiryDate ? new Date(item.expiryDate) : null;
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const expiresInDays = expiry
      ? Math.round((expiry.getTime() - now.getTime()) / millisecondsPerDay)
      : null;

    const isExpired = expiresInDays !== null && expiresInDays < 0;
    const isExpiringSoon = expiresInDays !== null && expiresInDays >= 0 && expiresInDays <= 30;
    const isLowStock = item.quantityInStock <= item.reorderLevel;
    const isOutOfStock = item.quantityInStock === 0;

    const statusTags: string[] = [];
    if (isOutOfStock) {
      statusTags.push('out-of-stock');
    } else if (isLowStock) {
      statusTags.push('low-stock');
    }
    if (isExpired) {
      statusTags.push('expired');
    } else if (isExpiringSoon) {
      statusTags.push('expiring-soon');
    }

    return {
      id: item.id,
      pharmacyId: item.pharmacy?.id ?? null,
      name: item.name,
      genericName: item.genericName,
      category: item.category,
      form: item.form,
      strength: item.strength,
      manufacturer: item.manufacturer,
      batchNumber: item.batchNumber,
      expiryDate: expiry ? expiry.toISOString() : null,
      quantityInStock: item.quantityInStock,
      reorderLevel: item.reorderLevel,
      unitPrice: Number(item.unitPrice),
      sellingPrice: Number(item.sellingPrice),
      barcode: item.barcode,
      externalId: item.externalId ?? null,
      requiresPrescription: item.requiresPrescription,
      isAvailable: item.isAvailable,
      meta: {
        isLowStock,
        isOutOfStock,
        isExpired,
        isExpiringSoon,
        expiresInDays,
        statusTags,
        batchCount: Array.isArray((item as any).batches) ? (item as any).batches.length : undefined,
      },
    };
  }
}

function escapeCsvCell(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => escapeCsvCell(cell ?? '')).join(',')).join('\n');
}
