import { apiClient } from './apiClient';

export interface ActivityLog {
  id: string;
  createdAt: string;
  resourceType: string;
  resourceId?: string | null;
  action: string;
  metadata?: Record<string, unknown> | null;
  actor?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  } | null;
}

export interface ActivityLogResponse {
  items: ActivityLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const activityService = {
  async list(params?: {
    organizationId?: string;
    limit?: number;
    page?: number;
    actorId?: string;
    actorEmail?: string;
    from?: string;
    to?: string;
    resourceType?: string;
    action?: string;
    pharmacyId?: string;
    q?: string;
  }): Promise<ActivityLogResponse> {
    const { data } = await apiClient.get<ActivityLogResponse>('/activity', {
      params,
    });
    return data;
  },
};
