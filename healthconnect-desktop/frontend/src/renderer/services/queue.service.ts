import { apiClient } from './apiClient';

export const queueService = {
  async fetchQueue(pharmacyId: string) {
    const { data } = await apiClient.get(`/pharmacies/${pharmacyId}/queue`);
    return data;
  },
  async enqueue(pharmacyId: string, payload: { patientId?: string; patientName?: string; patientEmail?: string }) {
    const { data } = await apiClient.post(`/pharmacies/${pharmacyId}/queue`, payload);
    return data;
  },
  async updateStatus(pharmacyId: string, entryId: string, status: string) {
    const { data } = await apiClient.patch(`/pharmacies/${pharmacyId}/queue/${entryId}`, { status });
    return data;
  },
};
