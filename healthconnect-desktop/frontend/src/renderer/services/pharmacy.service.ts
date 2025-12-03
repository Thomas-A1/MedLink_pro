import { apiClient } from './apiClient';

export interface PharmacySummary {
  id: string;
  name: string;
  address: string;
  region: string;
  district: string;
  contactPhone: string;
  contactEmail?: string;
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  isVerified: boolean;
  isPartner: boolean;
  staff: Array<{
    id: string;
    role: string;
    isPrimaryLocation: boolean;
  }>;
}

export interface PharmacyStaffMember {
  id: string;
  invitedAt: string;
  role: string;
  isPrimaryLocation: boolean;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string;
    role: string;
    isActive: boolean;
  };
}

export const pharmacyService = {
  async listMine(): Promise<PharmacySummary[]> {
    const { data } = await apiClient.get<PharmacySummary[]>('/pharmacies/me');
    return data;
  },
  async inviteStaff(
    pharmacyId: string,
    payload: {
      email: string;
      phoneNumber: string;
      firstName: string;
      lastName: string;
      role: 'pharmacist' | 'clerk' | 'hospital_admin';
    },
  ): Promise<{ staff: any; inviteToken: string }> {
    const { data } = await apiClient.post(`/pharmacies/${pharmacyId}/invite`, payload);
    return data as { staff: any; inviteToken: string };
  },
  async listStaffMembers(pharmacyId: string): Promise<PharmacyStaffMember[]> {
    const { data } = await apiClient.get<PharmacyStaffMember[]>(`/pharmacies/${pharmacyId}/staff`);
    return data;
  },
  async removeStaffMember(pharmacyId: string, staffId: string, reason: string): Promise<void> {
    await apiClient.post(`/pharmacies/${pharmacyId}/staff/${staffId}/remove`, { reason });
  },
};

