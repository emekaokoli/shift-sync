import { Router } from 'express';
import type { Knex } from 'knex';
import { db } from '../infrastructure/database';
import { ResponseUtils } from '../infrastructure/response';
import { authMiddleware, type AuthenticatedRequest } from './middleware/auth';

const router: Router = Router();
router.use(authMiddleware);

type AuditLogRow = {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
};

function hasRole(user: AuthenticatedRequest['user'] | undefined, roles: string[]): boolean {
  return Boolean(user && roles.includes(user.role));
}

function applyAuditFilters(query: Knex.QueryBuilder, params: Record<string, unknown>) {
  const { userId, action, entityType, entityId, startDate, endDate, locationId } = params;

  if (userId) {
    query = query.where('user_id', userId as string);
  }
  if (action) {
    query = query.where('action', action as string);
  }
  if (entityType) {
    query = query.where('entity_type', entityType as string);
  }
  if (entityId) {
    query = query.where('entity_id', entityId as string);
  }
  if (locationId) {
    query = query.where(function () {
      this.where({ entity_type: 'LOCATION', entity_id: locationId as string }).orWhere(function () {
        this.where('entity_type', 'SHIFT').whereIn(
          'entity_id',
          db('shifts')
            .select('id')
            .where('location_id', locationId as string)
        );
      });
    });
  }
  if (startDate) {
    query = query.where('created_at', '>=', new Date(startDate as string));
  }
  if (endDate) {
    query = query.where('created_at', '<=', new Date(endDate as string));
  }

  return query;
}

// Get audit logs with filters - Admin only
router.get('/', async (req: AuthenticatedRequest, res) => {
  if (!hasRole(req.user, ['ADMIN'])) {
    return ResponseUtils.forbidden(res, 'Admin access required');
  }
  try {
    const {
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      locationId,
      page = '1',
      limit = '50',
    } = req.query;

    const queryParams = { userId, action, entityType, entityId, startDate, endDate, locationId };

    const baseQuery = db('audit_logs').select('*').orderBy('created_at', 'desc');
    const filteredQuery = applyAuditFilters(baseQuery, queryParams);

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const logs = (await filteredQuery.limit(limitNum).offset(offset)) as AuditLogRow[];
    const total = await applyAuditFilters(
      db('audit_logs').count('* as count'),
      queryParams
    ).first();

    const totalCount = parseInt(total?.count as string) || 0;
    const totalPages = Math.ceil(totalCount / limitNum);

    // Parse JSON values
    const parsedLogs = logs.map((log) => ({
      ...log,
      oldValue: log.old_value ? JSON.parse(log.old_value) : null,
      newValue: log.new_value ? JSON.parse(log.new_value) : null,
    }));

    return ResponseUtils.success(res, {
      data: parsedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

// Get audit history for a specific shift - Manager+
router.get('/shifts/:shiftId', async (req: AuthenticatedRequest, res) => {
  if (!hasRole(req.user, ['MANAGER', 'ADMIN'])) {
    return ResponseUtils.forbidden(res, 'Manager or admin access required');
  }

  try {
    const { shiftId } = req.params;

    const logs = await db('audit_logs')
      .select('*')
      .where('entity_id', shiftId)
      .andWhere('entity_type', 'SHIFT')
      .orderBy('created_at', 'desc');

    // Parse JSON values
    const parsedLogs = logs.map((log) => ({
      ...log,
      oldValue: log.old_value ? JSON.parse(log.old_value) : null,
      newValue: log.new_value ? JSON.parse(log.new_value) : null,
    }));

    return ResponseUtils.success(res, parsedLogs);
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

// Export audit logs as CSV - Admin only
router.get('/export', async (req: AuthenticatedRequest, res) => {
  if (!hasRole(req.user, ['ADMIN'])) {
    return ResponseUtils.forbidden(res, 'Admin access required');
  }

  try {
    const { userId, action, entityType, entityId, startDate, endDate, locationId } = req.query;
    const queryParams = { userId, action, entityType, entityId, startDate, endDate, locationId };

    const logs = (await applyAuditFilters(
      db('audit_logs').select('*').orderBy('created_at', 'desc'),
      queryParams
    )) as AuditLogRow[];

    // Generate CSV
    const csvHeaders = [
      'ID',
      'User ID',
      'Action',
      'Entity Type',
      'Entity ID',
      'Old Value',
      'New Value',
      'Created At',
    ];
    const csvRows: string[][] = logs.map((log) => [
      log.id,
      log.user_id,
      log.action,
      log.entity_type,
      log.entity_id,
      log.old_value || '',
      log.new_value || '',
      log.created_at,
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map((field: string) => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.send(csvContent);
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

export default router;
