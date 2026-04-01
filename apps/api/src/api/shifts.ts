import { assignShiftSchema, shiftSchema, shiftUpdateSchema } from '@shift-sync/shared';
import { Response, Router } from 'express';
import { z } from 'zod';
import { assignShift } from '../application/assignShift';
import { createShift } from '../application/createShift';
import { updateShift } from '../application/updateShift';
import { createAuditLog } from '../application/auditLog';
import { suggestAlternatives, validateAssignment } from '../domain/engine';
import { checkCutoffViolation } from '../infrastructure/cutoffValidation';
import db from '../infrastructure/database';
import { shiftRepository, staffRepository } from '../infrastructure/repositories';
import { ResponseUtils } from '../infrastructure/response';
import { emitAssignment, emitNotification, emitShiftUpdate, getIO } from '../infrastructure/socket';
import { authMiddleware, type AuthenticatedRequest } from './middleware/auth';

const router: Router = Router();

router.use(authMiddleware);

const getQueryString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return String(value[0]);
  if (typeof value === 'object') return undefined;
  return String(value);
};

async function getManagerLocationIds(user?: AuthenticatedRequest['user']) {
  if (!user || user.role !== 'MANAGER') {
    return null;
  }

  return staffRepository.findUserLocationIds(user.userId, true);
}

function isManagerUser(user?: AuthenticatedRequest['user']) {
  return user?.role === 'MANAGER';
}

async function authorizeShiftAccess(shiftId: string, user?: AuthenticatedRequest['user']) {
  const shift = await shiftRepository.findById(shiftId);
  if (!shift) {
    return { shift: null, error: 'Shift not found' };
  }

  if (isManagerUser(user)) {
    const allowedLocationIds = await getManagerLocationIds(user);
    if (!allowedLocationIds?.includes(shift.location_id)) {
      return { shift: null, error: 'Not authorized to access this shift' };
    }
  }

  return { shift, error: undefined };
}

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { locationId, status, startDate, endDate } = req.query;
    const requestedLocationId = getQueryString(locationId);
    const managerLocationIds = await getManagerLocationIds(req.user);

    if (
      managerLocationIds &&
      requestedLocationId &&
      !managerLocationIds.includes(requestedLocationId)
    ) {
      return ResponseUtils.forbidden(res, 'Not authorized to view shifts for this location');
    }

    const shifts = await shiftRepository.findMany({
      locationId: requestedLocationId,
      locationIds: managerLocationIds ?? undefined,
      status: getQueryString(status),
      startDate: getQueryString(startDate) ? new Date(getQueryString(startDate)!) : undefined,
      endDate: getQueryString(endDate) ? new Date(getQueryString(endDate)!) : undefined,
    });

    return ResponseUtils.success(res, shifts, 'Shifts fetched successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get('/my-shifts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return ResponseUtils.unauthorized(res, 'User not authenticated');
    }

    const shifts = await shiftRepository.findByStaffId(userId);

    return ResponseUtils.success(res, shifts, 'My shifts fetched successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get('/current', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const managerLocationIds = await getManagerLocationIds(req.user);
    const locationId = req.query.locationId as string | undefined;

    if (managerLocationIds && locationId && !managerLocationIds.includes(locationId)) {
      return ResponseUtils.forbidden(res, 'Not authorized to view shifts for this location');
    }

    const now = new Date();
    let query = db('shifts')
      .join('locations', 'shifts.location_id', 'locations.id')
      .leftJoin('skills as required_skill', 'shifts.required_skill_id', 'required_skill.id')
      .select(
        'shifts.id',
        'shifts.location_id',
        'locations.name as location_name',
        'locations.timezone',
        'shifts.start_time',
        'shifts.end_time',
        'shifts.status',
        'shifts.headcount',
        'required_skill.name as required_skill_name'
      )
      .where('shifts.status', 'PUBLISHED')
      .where('shifts.start_time', '<=', now)
      .where('shifts.end_time', '>=', now)
      .orderBy('shifts.start_time', 'asc');

    if (locationId) {
      query = query.where('shifts.location_id', locationId);
    }

    if (managerLocationIds) {
      query = query.whereIn('shifts.location_id', managerLocationIds);
    }

    const shifts = await query;
    const shiftIds = shifts.map((s) => s.id);
    let assignmentsQuery = db('shift_assignments')
      .join('users', 'shift_assignments.staff_id', 'users.id')
      .select(
        'shift_assignments.shift_id',
        'users.id as user_id',
        'users.name as user_name',
        'users.email'
      )
      .whereIn('shift_assignments.shift_id', shiftIds);

    const assignments = await assignmentsQuery;
    const assignmentsByShift = assignments.reduce(
      (acc, a) => {
        if (!acc[a.shift_id]) {
          acc[a.shift_id] = [];
        }

        acc[a.shift_id].push({
          userId: a.user_id,
          userName: a.user_name,
          userEmail: a.email,
        });

        return acc;
      },
      {} as Record<string, { userId: string; userName: string; userEmail: string }[]>
    );

    const result = shifts.map((shift) => ({
      ...shift,
      assignedStaff: assignmentsByShift[shift.id] || [],
    }));

    return ResponseUtils.success(res, result, 'Current shifts fetched successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get('/overtime-stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const locationId = req.query.locationId as string | undefined;
    const weekStart = req.query.weekStart as string | undefined;
    const managerLocationIds = await getManagerLocationIds(req.user);

    if (managerLocationIds && locationId && !managerLocationIds.includes(locationId)) {
      return ResponseUtils.forbidden(
        res,
        'Not authorized to view overtime stats for this location'
      );
    }

    const startOfWeek = weekStart
      ? new Date(weekStart)
      : new Date(new Date().setDate(new Date().getDate() - new Date().getDay()));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    let query = db('shift_assignments')
      .join('shifts', 'shift_assignments.shift_id', 'shifts.id')
      .join('users', 'shift_assignments.staff_id', 'users.id')
      .select(
        'shift_assignments.staff_id as staffId',
        'users.name as staffName',
        'shifts.start_time',
        'shifts.end_time',
        'shifts.location_id'
      )
      .where('shifts.start_time', '>=', startOfWeek)
      .where('shifts.start_time', '<', endOfWeek)
      .where('shifts.status', 'PUBLISHED');

    if (locationId) {
      query = query.where('shifts.location_id', locationId);
    }
    if (managerLocationIds) {
      if (managerLocationIds.length === 0) {
        query = query.whereRaw('1 = 0');
      } else {
        query = query.whereIn('shifts.location_id', managerLocationIds);
      }
    }

    const assignments = await query;

    const staffHours: Record<
      string,
      {
        staffId: string;
        staffName: string;
        weeklyHours: number;
        dailyHours: { date: string; hours: number }[];
      }
    > = {};

    const weeklyLimit = 40;
    const dailyLimit = 10;

    for (const assignment of assignments) {
      const staffId = assignment.staff_id;
      const start = new Date(assignment.start_time);
      const end = new Date(assignment.end_time);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const dateKey = start.toISOString().split('T')[0];

      if (!staffHours[staffId]) {
        staffHours[staffId] = {
          staffId,
          staffName: assignment.staff_name,
          weeklyHours: 0,
          dailyHours: [],
        };
      }

      staffHours[staffId].weeklyHours += hours;

      const existingDay = staffHours[staffId].dailyHours.find((d) => d.date === dateKey);
      if (existingDay) {
        existingDay.hours += hours;
      } else {
        staffHours[staffId].dailyHours.push({ date: dateKey, hours });
      }
    }

    const result = Object.values(staffHours).map((staff) => ({
      ...staff,
      isOvertime: staff.weeklyHours > weeklyLimit,
      isWarning: staff.weeklyHours >= 35,
      dailyOvertime: staff.dailyHours.some((d) => d.hours > dailyLimit),
    }));

    const totalHours = result.reduce((sum, s) => sum + s.weeklyHours, 0);
    const atLimitCount = result.filter((s) => s.isWarning && !s.isOvertime).length;
    const overLimitCount = result.filter((s) => s.isOvertime).length;

    return ResponseUtils.success(
      res,
      {
        staff: result,
        summary: {
          totalHours: Math.round(totalHours * 10) / 10,
          staffCount: result.length,
          atLimitCount,
          overLimitCount,
          weekStart: startOfWeek.toISOString(),
          weekEnd: endOfWeek.toISOString(),
        },
      },
      'Overtime stats fetched successfully'
    );
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { shift, error } = await authorizeShiftAccess(req.params.id as string, req.user);

    if (error) {
      if (error === 'Shift not found') {
        return ResponseUtils.notFound(res, error);
      }
      return ResponseUtils.forbidden(res, error);
    }

    return ResponseUtils.success(res, shift, 'Shift fetched successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = shiftSchema.parse(req.body);
    const userId = req.user?.userId || 'system';

    if (req.user?.role === 'STAFF') {
      return ResponseUtils.forbidden(res, 'Only managers and admins can create shifts');
    }

    if (req.user?.role === 'MANAGER') {
      const managerLocationIds = await getManagerLocationIds(req.user);
      if (!managerLocationIds?.includes(data.locationId)) {
        return ResponseUtils.forbidden(res, 'Not authorized to create shifts for this location');
      }
    }

    const result = await createShift({
      location_id: data.locationId,
      required_skill_id: data.requiredSkillId,
      start_time: new Date(data.startTime),
      end_time: new Date(data.endTime),
      headcount: data.headcount,
      status: data.status,
      userId,
    });

    if (!result.success) {
      return ResponseUtils.error(res, result.error || 'Failed to create shift', 400);
    }

    const io = getIO();
    if (io) {
      emitShiftUpdate(io, data.locationId, 'created', {
        shift: result.shift,
        createdBy: userId,
      });

      emitNotification(io, userId, {
        type: 'shift',
        message: `New shift created at ${new Date(data.startTime).toLocaleString()}`,
        data: { shiftId: (result.shift as { id: string }).id },
      });
    }

    return ResponseUtils.created(res, result.shift, 'Shift created successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseUtils.validationError(
        res,
        'Validation failed',
        error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
      );
    }
    return ResponseUtils.handleError(res, error);
  }
});

router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = shiftUpdateSchema.parse(req.body);
    const userId = req.user?.userId || 'system';

    const { error } = await authorizeShiftAccess(req.params.id as string, req.user);

    if (error) {
      if (error === 'Shift not found') {
        return ResponseUtils.notFound(res, error);
      }
      return ResponseUtils.forbidden(res, error);
    }

    if (req.user?.role === 'STAFF') {
      return ResponseUtils.forbidden(res, 'Only managers and admins can update shifts');
    }

    if (req.user?.role === 'MANAGER') {
      const managerLocationIds = await getManagerLocationIds(req.user);
      if (data.locationId && !managerLocationIds?.includes(data.locationId)) {
        return ResponseUtils.forbidden(res, 'Not authorized to update shifts for this location');
      }
    }

    const cutoffCheck = await checkCutoffViolation(req.params.id as string, 'edit');
    if (!cutoffCheck.allowed) {
      return ResponseUtils.forbidden(
        res,
        cutoffCheck.error || 'Cannot edit shift past cutoff time'
      );
    }

    const updates: {
      start_time?: Date;
      end_time?: Date;
      location_id?: string;
      required_skill_id?: string;
      headcount?: number;
      status?: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
    } = {
      location_id: data.locationId,
      required_skill_id: data.requiredSkillId,
      headcount: data.headcount,
    };

    if (data.status !== undefined) {
      updates.status = data.status;
    }
    if (data.startTime) {
      updates.start_time = new Date(data.startTime);
    }
    if (data.endTime) {
      updates.end_time = new Date(data.endTime);
    }

    const result = await updateShift({
      shiftId: req.params.id as string,
      updates,
      userId,
    });

    if (!result.success) {
      return ResponseUtils.error(res, result.error || 'Failed to update shift', 400);
    }

    const io = getIO();
    if (io && result.shift) {
      const updatedShift = result.shift as { id: string; location_id: string };
      emitShiftUpdate(io, updatedShift.location_id, 'updated', {
        shiftId: updatedShift.id,
        updatedBy: userId,
      });
    }

    return ResponseUtils.success(res, result.shift, 'Shift updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseUtils.validationError(
        res,
        'Validation failed',
        error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
      );
    }
    return ResponseUtils.handleError(res, error);
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { shift, error } = await authorizeShiftAccess(req.params.id as string, req.user);

    if (error) {
      if (error === 'Shift not found') {
        return ResponseUtils.notFound(res, error);
      }
      return ResponseUtils.forbidden(res, error);
    }

    const cutoffCheck = await checkCutoffViolation(req.params.id as string, 'delete');
    if (!cutoffCheck.allowed) {
      return ResponseUtils.forbidden(
        res,
        cutoffCheck.error || 'Cannot delete shift past cutoff time'
      );
    }

    await shiftRepository.delete(req.params.id as string);

    await createAuditLog(db, {
      userId: req.user?.userId || 'system',
      action: 'DELETE_SHIFT',
      entityType: 'Shift',
      entityId: req.params.id as string,
      oldValue: { location_id: shift?.location_id, status: shift?.status },
    });

    const io = getIO();
    if (io && shift) {
      emitShiftUpdate(io, shift.location_id, 'deleted', {
        shiftId: req.params.id as string,
      });
    }

    return ResponseUtils.noContent(res, 'Shift deleted successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.post('/:id/publish', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || 'system';
    const shiftId = req.params.id as string;

    const { shift, error } = await authorizeShiftAccess(shiftId, req.user);
    if (error) {
      if (error === 'Shift not found') {
        return ResponseUtils.notFound(res, error);
      }
      return ResponseUtils.forbidden(res, error);
    }

    if (req.user?.role === 'STAFF') {
      return ResponseUtils.forbidden(res, 'Only managers and admins can publish shifts');
    }

    const cutoffCheck = await checkCutoffViolation(shiftId, 'publish');
    if (!cutoffCheck.allowed) {
      return ResponseUtils.forbidden(
        res,
        cutoffCheck.error || 'Cannot publish shift past cutoff time'
      );
    }

    const shiftData = shift as {
      id: string;
      location_id: string;
      start_time: Date;
    };

    await db('shifts').where({ id: shiftId }).update({
      status: 'PUBLISHED',
      published_at: new Date(),
      updated_at: new Date(),
    });

    await createAuditLog(db, {
      userId,
      action: 'PUBLISH_SHIFT',
      entityType: 'Shift',
      entityId: shiftId,
      newValue: { status: 'PUBLISHED' },
    });

    const location = await db('locations').where({ id: shiftData.location_id }).first();
    const notificationMessage = `New shift published at ${location?.name || 'a location'}`;

    const [notification] = await db('notifications')
      .insert({
        user_id: userId,
        type: 'shift',
        message: notificationMessage,
        read: false,
        data: JSON.stringify({ shiftId, action: 'published' }),
      })
      .returning('*');

    const io = getIO();
    if (io) {
      emitShiftUpdate(io, shiftData.location_id, 'published', {
        shiftId,
        publishedBy: userId,
      });

      emitNotification(io, userId, {
        id: notification.id,
        type: 'shift',
        message: notificationMessage,
        data: { shiftId, action: 'published' },
        createdAt: notification.created_at,
      });
    }

    return ResponseUtils.success(res, shift, 'Shift published successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.post('/:id/assign', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role === 'STAFF') {
      return ResponseUtils.forbidden(res, 'Only managers and admins can assign staff to shifts');
    }

    const { staffId, version } = assignShiftSchema.parse(req.body);
    const assignedBy = req.user?.userId || 'system';

    const { shift, error } = await authorizeShiftAccess(req.params.id as string, req.user);
    if (error) {
      if (error === 'Shift not found') {
        return ResponseUtils.notFound(res, error);
      }
      return ResponseUtils.forbidden(res, error);
    }

    const result = await assignShift({
      shiftId: req.params.id as string,
      staffId,
      assignedBy,
      version,
    });

    if (!result.success) {
      return ResponseUtils.error(res, result.error || 'Failed to assign staff', 400);
    }

    const shiftData = shift as { location_id: string };
    const io = getIO();
    if (io && shiftData) {
      emitAssignment(io, shiftData.location_id, 'created', {
        shiftId: req.params.id as string,
        staffId,
        assignedBy,
      });

      emitNotification(io, staffId, {
        type: 'assignment',
        message: `You've been assigned to a shift`,
        data: { shiftId: req.params.id as string },
      });
    }

    return ResponseUtils.success(res, shift, 'Staff assigned successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseUtils.validationError(
        res,
        'Validation failed',
        error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
      );
    }
    return ResponseUtils.handleError(res, error);
  }
});

router.post('/:id/assign-with-override', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role === 'STAFF') {
      return ResponseUtils.forbidden(res, 'Only managers and admins can assign staff to shifts');
    }

    const { staffId, version, override } = req.body;

    if (!staffId) {
      return ResponseUtils.validationError(res, 'staffId is required');
    }

    if (!override || !override.reason || !override.managerId) {
      return ResponseUtils.validationError(res, 'Override reason and managerId are required');
    }

    const assignedBy = req.user?.userId || 'system';

    const { shift, error } = await authorizeShiftAccess(req.params.id as string, req.user);
    if (error) {
      if (error === 'Shift not found') {
        return ResponseUtils.notFound(res, error);
      }
      return ResponseUtils.forbidden(res, error);
    }

    const result = await assignShift({
      shiftId: req.params.id as string,
      staffId,
      assignedBy,
      version,
      override: {
        reason: override.reason,
        managerId: override.managerId,
      },
    });

    if (!result.success) {
      return ResponseUtils.error(res, result.error || 'Failed to assign staff with override', 400);
    }

    const shiftData = shift as { location_id: string };
    const io = getIO();
    if (io && shiftData) {
      emitAssignment(io, shiftData.location_id, 'created', {
        shiftId: req.params.id as string,
        staffId,
        assignedBy,
      });

      emitNotification(io, staffId, {
        type: 'assignment',
        message: `You've been assigned to a shift (override)`,
        data: { shiftId: req.params.id as string },
      });
    }

    return ResponseUtils.success(res, shift, 'Staff assigned successfully with override');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseUtils.validationError(
        res,
        'Validation failed',
        error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
      );
    }
    return ResponseUtils.handleError(res, error);
  }
});

router.post('/:id/validate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { staffId } = req.body;
    if (!staffId) {
      return ResponseUtils.validationError(res, 'staffId is required');
    }

    const { error } = await authorizeShiftAccess(req.params.id as string, req.user);
    if (error) {
      if (error === 'Shift not found') {
        return ResponseUtils.notFound(res, error);
      }
      return ResponseUtils.forbidden(res, error);
    }

    const result = await validateAssignment({
      db,
      staffId,
      shiftId: req.params.id as string,
    });

    if (!result.ok) {
      const suggestions = await suggestAlternatives({
        db,
        shiftId: req.params.id as string,
      });
      return ResponseUtils.success(res, { ...result, suggestions }, 'Validation failed');
    }

    return ResponseUtils.success(res, result, 'Validation successful');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get('/:id/suggestions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(getQueryString(req.query.limit) || '3');

    const { error } = await authorizeShiftAccess(req.params.id as string, req.user);
    if (error) {
      if (error === 'Shift not found') {
        return ResponseUtils.notFound(res, error);
      }
      return ResponseUtils.forbidden(res, error);
    }

    const suggestions = await suggestAlternatives({
      db,
      shiftId: req.params.id as string,
      limit,
    });

    return ResponseUtils.success(res, suggestions, 'Suggestions fetched successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get('/premium-stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const locationId = req.query.locationId as string | undefined;
    const startDateParam = req.query.startDate as string | undefined;
    const endDateParam = req.query.endDate as string | undefined;
    const managerLocationIds = await getManagerLocationIds(req.user);

    if (managerLocationIds && locationId && !managerLocationIds.includes(locationId)) {
      return ResponseUtils.forbidden(res, 'Not authorized to view premium stats for this location');
    }

    const startDate = startDateParam ? new Date(startDateParam) : new Date();
    startDate.setDate(startDate.getDate() - startDate.getDay());
    startDate.setHours(0, 0, 0, 0);

    const endDate = endDateParam ? new Date(endDateParam) : new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(23, 59, 59, 999);

    let query = db('shift_assignments')
      .join('shifts', 'shift_assignments.shift_id', 'shifts.id')
      .join('users', 'shift_assignments.staff_id', 'users.id')
      .join('locations', 'shifts.location_id', 'locations.id')
      .select(
        'shift_assignments.staff_id as staffId',
        'users.name as staffName',
        'shifts.start_time',
        'shifts.end_time',
        'shifts.location_id',
        'locations.timezone'
      )
      .where('shifts.start_time', '>=', startDate)
      .where('shifts.start_time', '<', endDate)
      .where('shifts.status', 'PUBLISHED');

    if (locationId) {
      query = query.where('shifts.location_id', locationId);
    }

    if (managerLocationIds) {
      query = query.whereIn('shifts.location_id', managerLocationIds);
    }

    const assignments = await query;

    const PREMIUM_DAYS = [5, 6];
    const PREMIUM_START_HOUR = 17;
    const PREMIUM_END_HOUR = 23;

    const staffPremiumCounts: Record<
      string,
      {
        staffId: string;
        staffName: string;
        premiumCount: number;
        totalHours: number;
      }
    > = {};
    for (const assignment of assignments) {
      const shiftStart = new Date(assignment.start_time);
      const shiftEnd = new Date(assignment.end_time);
      const timezone = assignment.timezone || 'America/New_York';
      const shiftDate = new Date(shiftStart.toLocaleString('en-US', { timeZone: timezone }));
      const hour = shiftDate.getHours();
      const day = shiftDate.getDay();

      const isPremium =
        PREMIUM_DAYS.includes(day) && hour >= PREMIUM_START_HOUR && hour < PREMIUM_END_HOUR;
      const hours = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);

      if (!staffPremiumCounts[assignment.staffId]) {
        staffPremiumCounts[assignment.staffId] = {
          staffId: assignment.staffId,
          staffName: assignment.staffName,
          premiumCount: 0,
          totalHours: 0,
        };
      }

      if (isPremium) {
        staffPremiumCounts[assignment.staffId].premiumCount++;
      }
      staffPremiumCounts[assignment.staffId].totalHours += hours;
    }

    const result = Object.values(staffPremiumCounts).map((s) => ({
      ...s,
      totalHours: Math.round(s.totalHours * 10) / 10,
    }));

    return ResponseUtils.success(res, result, 'Premium stats fetched successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

export default router;
