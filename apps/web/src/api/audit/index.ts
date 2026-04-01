import type { AuditLog } from '@shift-sync/shared';
import { fetchApi } from '../client';

export const auditApi = {
  getAuditLogs: (params?: {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    locationId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.set('userId', params.userId);
    if (params?.action) searchParams.set('action', params.action);
    if (params?.entityType) searchParams.set('entityType', params.entityType);
    if (params?.entityId) searchParams.set('entityId', params.entityId);
    if (params?.locationId) searchParams.set('locationId', params.locationId);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return fetchApi<{ data: AuditLog[]; pagination: any }>(
      `/api/v1/audit${query ? `?${query}` : ''}`
    );
  },

  getShiftAuditHistory: (shiftId: string) =>
    fetchApi<AuditLog[]>(`/api/v1/audit/shifts/${shiftId}`),

  exportAuditLogs: (params?: {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    locationId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.set('userId', params.userId);
    if (params?.action) searchParams.set('action', params.action);
    if (params?.entityType) searchParams.set('entityType', params.entityType);
    if (params?.entityId) searchParams.set('entityId', params.entityId);
    if (params?.locationId) searchParams.set('locationId', params.locationId);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);

    const query = searchParams.toString();
    return fetchApi<string>(`/api/v1/audit/export${query ? `?${query}` : ''}`, {
      headers: {
        Accept: 'text/csv',
      },
    });
  },
};
