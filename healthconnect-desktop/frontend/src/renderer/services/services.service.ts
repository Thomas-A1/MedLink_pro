import { apiClient } from './apiClient';

export interface PharmacyService {
  id: string;
  name: string;
  type: string;
  description?: string;
  price?: number;
  currency?: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceDto {
  name: string;
  type: string;
  description?: string;
  price?: number;
  currency?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateServiceDto {
  name?: string;
  type?: string;
  description?: string;
  price?: number;
  currency?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export const servicesService = {
  list: async (pharmacyId: string): Promise<PharmacyService[]> => {
    const response = await apiClient.get(`/pharmacies/${pharmacyId}/services`);
    return response.data;
  },

  create: async (pharmacyId: string, dto: CreateServiceDto): Promise<PharmacyService> => {
    const response = await apiClient.post(`/pharmacies/${pharmacyId}/services`, dto);
    return response.data;
  },

  update: async (
    pharmacyId: string,
    serviceId: string,
    dto: UpdateServiceDto,
  ): Promise<PharmacyService> => {
    const response = await apiClient.patch(`/pharmacies/${pharmacyId}/services/${serviceId}`, dto);
    return response.data;
  },

  delete: async (pharmacyId: string, serviceId: string): Promise<void> => {
    await apiClient.delete(`/pharmacies/${pharmacyId}/services/${serviceId}`);
  },
};

