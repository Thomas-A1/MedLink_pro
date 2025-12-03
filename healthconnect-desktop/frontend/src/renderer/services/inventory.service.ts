import { apiClient } from './apiClient';

export type StockMovementType =
  | 'restock'
  | 'sale'
  | 'return'
  | 'adjustment'
  | 'expired'
  | 'damaged'
  | 'transfer_out'
  | 'transfer_in';

export interface InventoryItemMeta {
  isLowStock: boolean;
  isOutOfStock: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  expiresInDays: number | null;
  statusTags: string[];
  batchCount?: number;
}

export interface InventoryListItem {
  id: string;
  pharmacyId: string | null;
  name: string;
  genericName?: string | null;
  category: string;
  form: string;
  strength: string;
  manufacturer?: string | null;
  batchNumber?: string | null;
  expiryDate: string | null;
  quantityInStock: number;
  reorderLevel: number;
  unitPrice: number;
  sellingPrice: number;
  barcode?: string | null;
  requiresPrescription: boolean;
  isAvailable: boolean;
  meta: InventoryItemMeta;
}

export interface InventoryBatch {
  id: string;
  lotNumber: string;
  quantity: number;
  expiryDate: string | null;
  createdAt: string;
}

export interface CreateInventoryPayload {
  name: string;
  genericName?: string;
  category: string;
  form: string;
  strength: string;
  manufacturer?: string;
  batchNumber?: string;
  expiryDate?: string | null;
  quantityInStock: number;
  reorderLevel: number;
  unitPrice: number;
  sellingPrice: number;
  barcode?: string;
  requiresPrescription: boolean;
  externalId?: string;
}

export interface AdjustInventoryPayload {
  quantityDelta: number;
  movementType: StockMovementType;
  notes?: string;
}

export interface StockMovementEntry {
  id: string;
  movementType: StockMovementType;
  quantity: number;
  balanceAfter: number;
  notes: string | null;
  referenceId: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  } | null;
}

export interface ImportSummary {
  message: string;
  processed: number;
  summary: Array<{ id: string; action: string }>;
}

export const inventoryService = {
  async fetchInventory(pharmacyId: string): Promise<InventoryListItem[]> {
    const { data } = await apiClient.get<InventoryListItem[]>(`/pharmacies/${pharmacyId}/inventory`);
    return data;
  },

  async createItem(pharmacyId: string, payload: CreateInventoryPayload): Promise<InventoryListItem> {
    const { data } = await apiClient.post<InventoryListItem>(`/pharmacies/${pharmacyId}/inventory`, payload);
    return data;
  },

  async updateItem(
    pharmacyId: string,
    itemId: string,
    payload: Partial<CreateInventoryPayload>,
  ): Promise<InventoryListItem> {
    const { data } = await apiClient.patch<InventoryListItem>(
      `/pharmacies/${pharmacyId}/inventory/${itemId}`,
      payload,
    );
    return data;
  },

  async deleteItem(pharmacyId: string, itemId: string): Promise<void> {
    await apiClient.delete(`/pharmacies/${pharmacyId}/inventory/${itemId}`);
  },

  async adjustStock(
    pharmacyId: string,
    itemId: string,
    payload: AdjustInventoryPayload,
  ): Promise<InventoryListItem> {
    const { data } = await apiClient.post<InventoryListItem>(
      `/pharmacies/${pharmacyId}/inventory/${itemId}/adjust`,
      payload,
    );
    return data;
  },

  async fetchMovements(pharmacyId: string, itemId: string): Promise<StockMovementEntry[]> {
    const { data } = await apiClient.get<StockMovementEntry[]>(
      `/pharmacies/${pharmacyId}/inventory/${itemId}/movements`,
    );
    return data;
  },
  async importBulk(
    pharmacyId: string,
    payload: { items: CreateInventoryPayload[] },
  ): Promise<ImportSummary> {
    const { data } = await apiClient.post<ImportSummary>(
      `/pharmacies/${pharmacyId}/inventory/import`,
      payload,
    );
    return data;
  },
  async exportCsv(pharmacyId: string) {
    return apiClient.get(`/pharmacies/${pharmacyId}/inventory/export`, { responseType: 'blob' });
  },
  async listBatches(pharmacyId: string, itemId: string): Promise<InventoryBatch[]> {
    const { data } = await apiClient.get<InventoryBatch[]>(
      `/pharmacies/${pharmacyId}/inventory/${itemId}/batches`,
    );
    return data;
  },
  async addBatch(
    pharmacyId: string,
    itemId: string,
    payload: { lotNumber: string; quantity: number; expiryDate?: string | null },
  ) {
    const { data } = await apiClient.post(`/pharmacies/${pharmacyId}/inventory/${itemId}/batches`, payload);
    return data;
  },
};
