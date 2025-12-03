import { apiClient } from './apiClient';

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  type: string;
  contactEmail?: string;
  contactPhone?: string;
  timezone?: string;
  brandColor?: string;
  logoUrl?: string;
  createdAt: string;
  settings?: Record<string, unknown> | null;
  primaryLocation?: {
    id: string;
    name: string;
    address: string;
    region: string;
    district: string;
    contactPhone: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  admin?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    temporaryPassword?: string;
  };
}

export const organizationsService = {
  async fetchAll(): Promise<OrganizationSummary[]> {
    const { data } = await apiClient.get('/organizations');
    return data;
  },
  async create(payload: {
    name: string;
    type: string;
    primaryLocationName?: string;
    primaryLocationAddress?: string;
    primaryLocationRegion?: string;
    primaryLocationDistrict?: string;
    primaryLocationCountry?: string;
    primaryLocationPhone: string;
    primaryLocationLatitude: number;
    primaryLocationLongitude: number;
    timezone: string;
    brandColor: string;
    logoUrl?: string;
    adminEmail: string;
    adminFirstName: string;
    adminLastName?: string;
    adminPassword?: string;
  }): Promise<OrganizationSummary> {
    const { data } = await apiClient.post('/organizations', payload);
    return data;
  },
  async update(id: string, payload: {
    name?: string;
    type?: string;
    primaryLocationName?: string;
    primaryLocationAddress?: string;
    primaryLocationRegion?: string;
    primaryLocationDistrict?: string;
    primaryLocationCountry?: string;
    primaryLocationPhone?: string;
    primaryLocationLatitude?: number;
    primaryLocationLongitude?: number;
    timezone?: string;
    brandColor?: string;
    logoUrl?: string;
    adminEmail?: string;
    adminFirstName?: string;
    adminLastName?: string;
  }): Promise<OrganizationSummary> {
    const { data } = await apiClient.put(`/organizations/${id}`, payload);
    return data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/organizations/${id}`);
  },

  async updateSettings(id: string, payload: {
    themePrimaryColor?: string;
    themeAccentColor?: string;
    logoUrl?: string;
    tagline?: string;
    brandColor?: string;
    timezone?: string;
    features?: Record<string, boolean>;
  }): Promise<OrganizationSummary> {
    const { data } = await apiClient.patch(`/organizations/${id}/settings`, payload);
    return data;
  },
};

