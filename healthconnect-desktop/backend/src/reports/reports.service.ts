import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Sale, SaleItem } from '../sales/entities/sale.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { Prescription } from '../prescriptions/entities/prescription.entity';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { ReportQueryDto, ExportReportQueryDto } from './dto/report-query.dto';
import { ActivityService } from '../activity/activity.service';
import { ActivityResourceType } from '../activity/entities/activity-log.entity';
import { User } from '../common/entities/user.entity';

interface DateRange {
  from: Date;
  to: Date;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Sale) private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SaleItem) private readonly saleItemRepo: Repository<SaleItem>,
    @InjectRepository(InventoryItem) private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(Prescription) private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(Pharmacy) private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly activityService: ActivityService,
  ) {}

  async getOverview(pharmacyId: string, query: ReportQueryDto) {
    const pharmacy = await this.ensurePharmacy(pharmacyId);
    const range = this.resolveRange(query);
    const [sales, inventory, prescriptions] = await Promise.all([
      this.buildSalesSummary(pharmacyId, range),
      this.buildInventorySummary(pharmacyId),
      this.buildPrescriptionSummary(pharmacyId, range),
    ]);

    return {
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      metadata: {
        pharmacy: {
          id: pharmacy.id,
          name: pharmacy.name,
        },
      },
      sales,
      inventory,
      prescriptions,
    };
  }

  async export(pharmacyId: string, query: ExportReportQueryDto, userId?: string) {
    const pharmacy = await this.ensurePharmacy(pharmacyId);
    const range = this.resolveRange(query);
    if (query.type === 'sales') {
      return this.exportSalesCsv(pharmacy, range, userId);
    }
    return this.exportInventoryCsv(pharmacy, range, userId);
  }

  private resolveRange(query: ReportQueryDto): DateRange {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new NotFoundException('Invalid date range');
    }

    if (from > to) {
      return { from: to, to: from };
    }

    // Ensure "to" includes end-of-day
    const adjustedTo = new Date(to);
    adjustedTo.setHours(23, 59, 59, 999);

    return { from, to: adjustedTo };
  }

  private async ensurePharmacy(pharmacyId: string) {
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { id: pharmacyId },
      relations: ['organization'],
    });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }
    return pharmacy;
  }

  private async buildSalesSummary(pharmacyId: string, range: DateRange) {
    const totals = await this.saleRepo
      .createQueryBuilder('sale')
      .select('COALESCE(SUM(sale.totalAmount), 0)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .where('sale.pharmacy_id = :pharmacyId', { pharmacyId })
      .andWhere('sale.created_at BETWEEN :from AND :to', { from: range.from, to: range.to })
      .getRawOne();

    const byDayRaw = await this.saleRepo
      .createQueryBuilder('sale')
      .select(`to_char(date_trunc('day', sale.created_at), 'YYYY-MM-DD')`, 'day')
      .addSelect('COALESCE(SUM(sale.totalAmount), 0)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .where('sale.pharmacy_id = :pharmacyId', { pharmacyId })
      .andWhere('sale.created_at BETWEEN :from AND :to', { from: range.from, to: range.to })
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    const byCategoryRaw = await this.saleItemRepo
      .createQueryBuilder('item')
      .leftJoin('item.sale', 'sale')
      .select(`CASE WHEN item.inventory_item_id IS NULL THEN 'service' ELSE 'inventory' END`, 'kind')
      .addSelect('COALESCE(SUM(item.totalPrice), 0)', 'revenue')
      .where('sale.pharmacy_id = :pharmacyId', { pharmacyId })
      .andWhere('sale.created_at BETWEEN :from AND :to', { from: range.from, to: range.to })
      .groupBy('kind')
      .getRawMany();

    const topItemsRaw = await this.saleItemRepo
      .createQueryBuilder('item')
      .leftJoin('item.sale', 'sale')
      .leftJoin('item.inventoryItem', 'inventory')
      .leftJoin('item.service', 'service')
      .select(`COALESCE(inventory.name, service.name, 'Unknown')`, 'name')
      .addSelect(`CASE WHEN item.inventory_item_id IS NULL THEN 'service' ELSE 'inventory' END`, 'kind')
      .addSelect('SUM(item.quantity)', 'quantity')
      .addSelect('SUM(item.totalPrice)', 'revenue')
      .where('sale.pharmacy_id = :pharmacyId', { pharmacyId })
      .andWhere('sale.created_at BETWEEN :from AND :to', { from: range.from, to: range.to })
      .groupBy(`COALESCE(inventory.name, service.name, 'Unknown')`)
      .addGroupBy(`CASE WHEN item.inventory_item_id IS NULL THEN 'service' ELSE 'inventory' END`)
      .orderBy('revenue', 'DESC')
      .limit(5)
      .getRawMany();

    const totalRevenue = Number(totals?.revenue ?? 0);
    const orderCount = Number(totals?.orders ?? 0);
    return {
      totalRevenue,
      orderCount,
      averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
      byDay: byDayRaw.map((row) => ({
        day: row.day,
        revenue: Number(row.revenue),
        orders: Number(row.orders),
      })),
      byCategory: {
        inventory: Number(byCategoryRaw.find((row) => row.kind === 'inventory')?.revenue ?? 0),
        services: Number(byCategoryRaw.find((row) => row.kind === 'service')?.revenue ?? 0),
      },
      topItems: topItemsRaw.map((row) => ({
        name: row.name,
        kind: row.kind,
        quantity: Number(row.quantity),
        revenue: Number(row.revenue),
      })),
    };
  }

  private async buildInventorySummary(pharmacyId: string) {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const aggregates = await this.inventoryRepo
      .createQueryBuilder('item')
      .select('COUNT(*)', 'totalItems')
      .addSelect('COALESCE(SUM(item.quantityInStock * item.unitPrice), 0)', 'stockValue')
      .addSelect(`SUM(CASE WHEN item.quantityInStock <= item.reorderLevel THEN 1 ELSE 0 END)`, 'lowStock')
      .addSelect(`SUM(CASE WHEN item.quantityInStock = 0 THEN 1 ELSE 0 END)`, 'outOfStock')
      .addSelect(
        `SUM(CASE WHEN item.expiryDate IS NOT NULL AND item.expiryDate BETWEEN :now AND :soon THEN 1 ELSE 0 END)`,
        'expiringSoon',
      )
      .where('item.pharmacyId = :pharmacyId', { pharmacyId })
      .setParameters({ now, soon })
      .getRawOne();

    const expiringItems = await this.inventoryRepo.find({
      where: {
        pharmacy: { id: pharmacyId },
        expiryDate: Between(now, soon),
      },
      order: { expiryDate: 'ASC' },
      take: 5,
    });

    return {
      totalItems: Number(aggregates?.totalItems ?? 0),
      stockValue: Number(aggregates?.stockValue ?? 0),
      lowStockCount: Number(aggregates?.lowStock ?? 0),
      outOfStockCount: Number(aggregates?.outOfStock ?? 0),
      expiringSoonCount: Number(aggregates?.expiringSoon ?? 0),
      expiringItems: expiringItems.map((item) => {
        let expiryDate: string | null = null;
        if (item.expiryDate) {
          // Handle both Date objects and date strings
          const date = item.expiryDate instanceof Date 
            ? item.expiryDate 
            : new Date(item.expiryDate);
          if (!isNaN(date.getTime())) {
            expiryDate = date.toISOString();
          }
        }
        return {
          id: item.id,
          name: item.name,
          quantityInStock: item.quantityInStock,
          expiryDate,
        };
      }),
    };
  }

  private async buildPrescriptionSummary(pharmacyId: string, range: DateRange) {
    const baseQuery = this.prescriptionRepo
      .createQueryBuilder('prescription')
      .where('prescription.assignedPharmacyId = :pharmacyId', { pharmacyId });

    const pendingCount = await baseQuery.clone().andWhere('prescription.fulfilledAt IS NULL').getCount();
    const fulfilledCount = await baseQuery
      .clone()
      .andWhere('prescription.fulfilledAt IS NOT NULL')
      .andWhere('prescription.fulfilledAt BETWEEN :from AND :to', { from: range.from, to: range.to })
      .getCount();

    const fulfilledTrend = await baseQuery
      .clone()
      .select(`to_char(date_trunc('day', prescription.fulfilledAt), 'YYYY-MM-DD')`, 'day')
      .addSelect('COUNT(*)', 'count')
      .andWhere('prescription.fulfilledAt IS NOT NULL')
      .andWhere('prescription.fulfilledAt BETWEEN :from AND :to', { from: range.from, to: range.to })
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    const avgRow = await baseQuery
      .clone()
      .select(
        'AVG(EXTRACT(EPOCH FROM (prescription.fulfilledAt - prescription.created_at)) / 60)',
        'avgMinutes',
      )
      .andWhere('prescription.fulfilledAt IS NOT NULL')
      .getRawOne();

    const oldestPending = await baseQuery
      .clone()
      .andWhere('prescription.fulfilledAt IS NULL')
      .orderBy('prescription.created_at', 'ASC')
      .take(5)
      .getMany();

    return {
      pendingCount,
      fulfilledCount,
      averageFulfilmentMinutes: Number(avgRow?.avgMinutes ?? 0),
      fulfilmentTrend: fulfilledTrend.map((row) => ({
        day: row.day,
        count: Number(row.count),
      })),
      oldestPending: oldestPending.map((item) => ({
        id: item.id,
        verificationCode: item.verificationCode,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  private async exportSalesCsv(pharmacy: Pharmacy, range: DateRange, userId?: string) {
    const summary = await this.buildSalesSummary(pharmacy.id, range);
    const rows = [
      ['Date', 'Revenue (GHS)', 'Orders'],
      ...summary.byDay.map((row) => [row.day, row.revenue.toFixed(2), row.orders.toString()]),
    ];
    if (summary.byDay.length === 0) {
      rows.push([
        range.from.toISOString().slice(0, 10),
        summary.totalRevenue.toFixed(2),
        summary.orderCount.toString(),
      ]);
    }
    const csv = rows.map((row) => row.join(',')).join('\n');

    await this.logReportExport(pharmacy, userId, 'sales', range);

    return {
      filename: `sales-report-${pharmacy.id}-${Date.now()}.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf8'),
    };
  }

  private async exportInventoryCsv(pharmacy: Pharmacy, range: DateRange, userId?: string) {
    const items = await this.inventoryRepo.find({
      where: { pharmacy: { id: pharmacy.id } },
      order: { name: 'ASC' },
    });
    const header = [
      'Name',
      'Generic',
      'Category',
      'Form',
      'Strength',
      'Quantity',
      'Reorder Level',
      'Unit Cost',
      'Selling Price',
      'Expiry Date',
      'External ID',
    ];
    const rows = [header];
    for (const item of items) {
      rows.push([
        item.name,
        item.genericName ?? '',
        item.category,
        item.form,
        item.strength,
        item.quantityInStock.toString(),
        item.reorderLevel.toString(),
        Number(item.unitPrice).toFixed(2),
        Number(item.sellingPrice).toFixed(2),
        item.expiryDate ? item.expiryDate.toISOString().slice(0, 10) : '',
        item.externalId ?? '',
      ]);
    }

    await this.logReportExport(pharmacy, userId, 'inventory', range);

    return {
      filename: `inventory-export-${pharmacy.id}-${Date.now()}.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(rows.map((row) => row.join(',')).join('\n'), 'utf8'),
    };
  }

  private async logReportExport(pharmacy: Pharmacy, userId: string | undefined, type: string, range: DateRange) {
    const actor = userId ? await this.userRepo.findOne({ where: { id: userId } }) : null;
    await this.activityService.record({
      actor: actor ?? undefined,
      organization: pharmacy.organization ?? null,
      resourceType: ActivityResourceType.REPORT,
      resourceId: pharmacy.id,
      action: 'report.export',
      metadata: {
        pharmacyId: pharmacy.id,
        type,
        range: {
          from: range.from.toISOString(),
          to: range.to.toISOString(),
        },
      },
    });
  }
}


