import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../../api/audit';

const queryKeys = {
  auditLogs: (params?: Record<string, string | number>) => ['audit-logs', params] as const,
  shiftAuditHistory: (shiftId: string) => ['shift-audit-history', shiftId] as const,
};

export function useAuditLogs(
  params?: {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    locationId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  },
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.auditLogs(params),
    queryFn: () => auditApi.getAuditLogs(params),
    enabled,
  });
}

export function useShiftAuditHistory(shiftId: string) {
  return useQuery({
    queryKey: queryKeys.shiftAuditHistory(shiftId),
    queryFn: () => auditApi.getShiftAuditHistory(shiftId),
    enabled: !!shiftId,
  });
}
