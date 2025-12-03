import { apiClient } from './apiClient';

export const prescriptionsService = {
  async fetchOpen(pharmacyId: string) {
    const { data } = await apiClient.get(`/pharmacies/${pharmacyId}/prescriptions/open`);
    return data;
  },
  async assignByCode(pharmacyId: string, verificationCode: string) {
    const { data } = await apiClient.post(`/pharmacies/${pharmacyId}/prescriptions/assign-by-code`, {
      verificationCode,
    });
    return data;
  },
  async fulfil(
    pharmacyId: string,
    prescriptionId: string,
    payload: { dispensedMedications?: string[]; notes?: string; pharmacistId: string },
  ) {
    const { data } = await apiClient.post(
      `/pharmacies/${pharmacyId}/prescriptions/${prescriptionId}/fulfil`,
      payload,
    );
    return data;
  },
  async updateStatus(
    pharmacyId: string,
    prescriptionId: string,
    payload: { status: string; notes?: string },
  ) {
    const { data } = await apiClient.patch(
      `/pharmacies/${pharmacyId}/prescriptions/${prescriptionId}/status`,
      payload,
    );
    return data;
  },
};
