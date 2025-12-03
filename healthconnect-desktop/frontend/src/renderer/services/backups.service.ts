import { apiClient } from "./apiClient";

export interface BackupRecord {
  id: string;
  type: "automatic" | "manual";
  status: "completed" | "failed";
  size: number;
  createdAt: string;
  checksum?: string;
  metadata?: Record<string, unknown>;
}

export const backupsService = {
  async list(pharmacyId: string): Promise<BackupRecord[]> {
    const { data } = await apiClient.get<BackupRecord[]>(
      `/pharmacies/${pharmacyId}/backups`
    );
    return data;
  },
  async create(pharmacyId: string): Promise<BackupRecord> {
    const { data } = await apiClient.post<BackupRecord>(
      `/pharmacies/${pharmacyId}/backups`
    );
    return data;
  },
  async restore(pharmacyId: string, backupId: string) {
    const { data } = await apiClient.post<{ message: string }>(
      `/pharmacies/${pharmacyId}/backups/${backupId}/restore`
    );
    return data;
  },
  async download(pharmacyId: string, backupId: string) {
    return apiClient.get(`/pharmacies/${pharmacyId}/backups/${backupId}/download`, {
      responseType: "blob",
    });
  },
  async delete(pharmacyId: string, backupId: string) {
    const { data } = await apiClient.post<{ message: string }>(
      `/pharmacies/${pharmacyId}/backups/${backupId}/delete`
    );
    return data;
  },
};


