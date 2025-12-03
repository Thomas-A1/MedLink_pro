import { apiClient } from "./apiClient";

export interface ReportRange {
  from: string;
  to: string;
}

export interface SalesSummary {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  byDay: Array<{ day: string; revenue: number; orders: number }>;
  byCategory: { inventory: number; services: number };
  topItems: Array<{ name: string; kind: string; quantity: number; revenue: number }>;
}

export interface InventorySummary {
  totalItems: number;
  stockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringSoonCount: number;
  expiringItems: Array<{ id: string; name: string; quantityInStock: number; expiryDate: string | null }>;
}

export interface PrescriptionSummary {
  pendingCount: number;
  fulfilledCount: number;
  averageFulfilmentMinutes: number;
  fulfilmentTrend: Array<{ day: string; count: number }>;
  oldestPending: Array<{ id: string; verificationCode: string; createdAt: string }>;
}

export interface ReportsOverview {
  range: ReportRange;
  metadata: { pharmacy: { id: string; name: string } };
  sales: SalesSummary;
  inventory: InventorySummary;
  prescriptions: PrescriptionSummary;
}

export const reportsService = {
  async getOverview(pharmacyId: string, params?: { from?: string; to?: string }) {
    const { data } = await apiClient.get<ReportsOverview>(`/pharmacies/${pharmacyId}/reports/overview`, {
      params,
    });
    return data;
  },
  async export(pharmacyId: string, type: "sales" | "inventory", params?: { from?: string; to?: string }) {
    const response = await apiClient.get(`/pharmacies/${pharmacyId}/reports/export`, {
      params: { type, ...params },
      responseType: "blob",
    });
    return response;
  },
};


