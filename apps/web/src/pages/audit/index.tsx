import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuditLogs, useShiftAuditHistory } from '@/hooks/audit';
import { useAuthStore } from '@/lib/stores';
import { useLocations } from '@/hooks/locations';
import { showError, showSuccess } from '@/lib/toast';
import { ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { auditApi } from '@/api/audit';

export function AuditLogViewer() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER' || isAdmin;

  const location = useLocation();
  const { data: locations } = useLocations();

  const [filters, setFilters] = useState(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      userId: searchParams.get('userId') || '',
      action: searchParams.get('action') || '',
      entityType: searchParams.get('entityType') || '',
      entityId: searchParams.get('entityId') || '',
      locationId: searchParams.get('locationId') || '',
      startDate: searchParams.get('startDate') || '',
      endDate: searchParams.get('endDate') || '',
    };
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const shiftHistoryEnabled = Boolean(filters.entityType?.toUpperCase() === 'SHIFT' && filters.entityId);
  const shiftHistoryQuery = useShiftAuditHistory(shiftHistoryEnabled ? filters.entityId : '');
  const {
    data: auditData,
    isLoading: isAuditLoading,
    error: auditError,
  } = useAuditLogs(
    {
      ...filters,
      page,
      limit,
    },
    isAdmin
  );

  useEffect(() => {
    if (auditError) {
      showError('Failed to load audit logs', auditError.message);
    }
  }, [auditError]);

  useEffect(() => {
    if (shiftHistoryQuery.error) {
      showError('Failed to load shift history', shiftHistoryQuery.error.message);
    }
  }, [shiftHistoryQuery.error]);

  const handleExport = async () => {
    try {
      const csvData = await auditApi.exportAuditLogs(filters);

      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccess('Export completed', 'Audit logs exported successfully');
    } catch (error) {
      showError(
        'Export failed',
        error instanceof Error ? error.message : 'Failed to export audit logs'
      );
    }
  };

  const handleFilterChange = (key: string, value: string | null) => {
    setFilters((prev) => ({ ...prev, [key]: value ?? '' }));
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      action: '',
      entityType: '',
      entityId: '',
      locationId: '',
      startDate: '',
      endDate: '',
    });
    setPage(1);
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-green-100 text-green-800';
    if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-800';
    if (action.includes('DELETE')) return 'bg-red-100 text-red-800';
    if (action.includes('ASSIGN')) return 'bg-purple-100 text-purple-800';
    if (action.includes('PUBLISH')) return 'bg-orange-100 text-orange-800';
    if (action.includes('APPROVE')) return 'bg-emerald-100 text-emerald-800';
    if (action.includes('REJECT')) return 'bg-rose-100 text-rose-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatJsonValue = (value: unknown) => {
    if (value === null || value === undefined) return null;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  const auditLogs = shiftHistoryEnabled
    ? shiftHistoryQuery.data || []
    : auditData?.data || [];
  const pagination = shiftHistoryEnabled ? undefined : auditData?.pagination;
  const isLoadingLogs = shiftHistoryEnabled ? shiftHistoryQuery.isLoading : isAuditLoading;

  if (!isAdmin && !isManager) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You do not have permission to view audit logs.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">View and export system activity logs</p>
        </div>
        {isAdmin && (
          <Button onClick={handleExport} variant="outline">
            <Download data-icon="inline-start" />
            Export CSV
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Logs</CardTitle>
          <CardDescription>Search and filter audit logs by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-1 block">User ID</label>
              <Input
                placeholder="Enter user ID"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Action</label>
              <Select
                value={filters.action}
                onValueChange={(value) => handleFilterChange('action', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  <SelectItem value="CREATE_SHIFT">Create Shift</SelectItem>
                  <SelectItem value="UPDATE_SHIFT">Update Shift</SelectItem>
                  <SelectItem value="DELETE_SHIFT">Delete Shift</SelectItem>
                  <SelectItem value="PUBLISH_SHIFT">Publish Shift</SelectItem>
                  <SelectItem value="ASSIGN_STAFF">Assign Staff</SelectItem>
                  <SelectItem value="REMOVE_ASSIGNMENT">Remove Assignment</SelectItem>
                  <SelectItem value="REQUEST_SWAP">Request Swap</SelectItem>
                  <SelectItem value="APPROVE_SWAP">Approve Swap</SelectItem>
                  <SelectItem value="REJECT_SWAP">Reject Swap</SelectItem>
                  <SelectItem value="CANCEL_SWAP">Cancel Swap</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Entity Type</label>
              <Select
                value={filters.entityType}
                onValueChange={(value) => handleFilterChange('entityType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="Shift">Shift</SelectItem>
                  <SelectItem value="Assignment">Assignment</SelectItem>
                  <SelectItem value="SwapRequest">Swap Request</SelectItem>
                  <SelectItem value="User">User</SelectItem>
                  <SelectItem value="Location">Location</SelectItem>
                  <SelectItem value="Skill">Skill</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Entity ID</label>
              <Input
                placeholder="Enter entity ID"
                value={filters.entityId}
                onChange={(e) => handleFilterChange('entityId', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Location</label>
              <Select
                value={filters.locationId}
                onValueChange={(value) => handleFilterChange('locationId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All locations</SelectItem>
                  {locations?.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={clearFilters} variant="outline" size="sm">
              <Filter data-icon="inline-start" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>
            System activity and changes
            {pagination && <span className="ml-2 text-xs">({pagination.total} total records)</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLogs ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading audit logs...</p>
            </div>
          ) : !isAdmin && !shiftHistoryEnabled ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-lg font-semibold">Shift history view only</p>
              <p className="text-sm text-muted-foreground mt-2">
                Managers can view audit history for individual shifts. Select a shift by setting
                Entity Type to <strong>SHIFT</strong> and entering a Shift ID, or use the schedule page
                to jump directly to shift history.
              </p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">
                {shiftHistoryEnabled ? 'No shift audit history found' : 'No audit logs found'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Changes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell
                          className="font-mono text-xs max-w-[100px] truncate"
                          title={log.userId}
                        >
                          {log.userId}
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                        </TableCell>
                        <TableCell>{log.entityType}</TableCell>
                        <TableCell
                          className="font-mono text-xs max-w-[100px] truncate"
                          title={log.entityId}
                        >
                          {log.entityId}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1 max-w-[300px]">
                            {log.oldValue && (
                              <div className="text-red-600">
                                <span className="font-medium">Before:</span>
                                <pre className="text-xs mt-1 p-1 bg-red-50 rounded overflow-x-auto">
                                  {formatJsonValue(log.oldValue)}
                                </pre>
                              </div>
                            )}
                            {log.newValue && (
                              <div className="text-green-600">
                                <span className="font-medium">After:</span>
                                <pre className="text-xs mt-1 p-1 bg-green-50 rounded overflow-x-auto">
                                  {formatJsonValue(log.newValue)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)}{' '}
                    of {pagination.total} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft data-icon="inline-start" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                      disabled={page >= pagination.totalPages}
                    >
                      Next
                      <ChevronRight data-icon="inline-end" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
