import { apiClient } from './apiClient';

export interface SaleItem {
  id: string;
  inventoryItem: {
    id: string;
    name: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Sale {
  id: string;
  pharmacyId: string;
  soldBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  customerName?: string;
  customerPhone?: string;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  notes?: string;
  items: SaleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SaleItemDto {
  inventoryItemId?: string;
  serviceId?: string;
  quantity: number;
  unitPrice?: number;
}

export interface CreateSaleDto {
  items: SaleItemDto[];
  customerName?: string;
  customerPhone?: string;
  currency?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface LowStockItem {
  id: string;
  name: string;
  quantityInStock: number;
  reorderLevel: number;
  unitPrice: number;
}

export const salesService = {
  list: async (pharmacyId: string, limit = 50): Promise<Sale[]> => {
    const response = await apiClient.get(`/pharmacies/${pharmacyId}/sales?limit=${limit}`);
    return response.data;
  },

  create: async (pharmacyId: string, dto: CreateSaleDto): Promise<Sale> => {
    const response = await apiClient.post(`/pharmacies/${pharmacyId}/sales`, dto);
    return response.data;
  },

  getLowStockItems: async (pharmacyId: string): Promise<LowStockItem[]> => {
    const response = await apiClient.get(`/pharmacies/${pharmacyId}/sales/low-stock`);
    return response.data;
  },
};

