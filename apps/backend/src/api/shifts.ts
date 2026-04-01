import {
  assignShiftSchema,
  shiftSchema,
  shiftUpdateSchema,
} from '@shift-sync/shared';
import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { assignShift } from '../application/assignShift';
import { createShift } from '../application/createShift';
import { updateShift } from '../application/updateShift';
import { suggestAlternatives, validateAssignment } from '../domain/engine';
import { shiftRepository } from '../infrastructure/repositories';
import { ResponseUtils } from '../infrastructure/response';
import { getIO, emitShiftUpdate, emitNotification, emitAssignment } from '../infrastructure/socket';
import db from '../infrastructure/database';
import { authMiddleware, type AuthenticatedRequest } from './middleware/auth';

const router: Router = Router();

router.use(authMiddleware);

const getQueryString = (
  value: unknown,
): string | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return String(value[0]);
  if (typeof value === 'object') return undefined;
  return String(value);
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const { locationId, status, startDate, endDate } = req.query;

    const shifts = await shiftRepository.findMany({
      locationId: getQueryString(locationId),
      status: getQueryString(status),
      startDate: getQueryString(startDate)
        ? new Date(getQueryString(startDate)!)
        : undefined,
      endDate: getQueryString(endDate)
        ? new Date(getQueryString(endDate)!)
        : undefined,
    });

    return ResponseUtils.success(res, shifts, 'Shifts fetched successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get('/my-shifts', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return ResponseUtils.unauthorized(res, 'User not authenticated');
    }

    const shifts = await shiftRepository.findByStaffId(userId);

    return ResponseUtils.success(res, shifts, 'My shifts fetched successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get('/overtime-stats', async (req: Request, res: Response) => {
  try {
    const locationId = req.query.locationId as string | undefined;
    const weekStart = req.query.weekStart as string | undefined;
    
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

    const assignments = await query;

    const staffHours: Record<string, {
      staffId: string;
      staffName: string;
      weeklyHours: number;
      dailyHours: { date: string; hours: number }[];
    }> = {};

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

      const existingDay = staffHours[staffId].dailyHours.find(d => d.date === dateKey);
      if (existingDay) {
        existingDay.hours += hours;
      } else {
        staffHours[staffId].dailyHours.push({ date: dateKey, hours });
      }
    }

    const result = Object.values(staffHours).map(staff => ({
      ...staff,
      isOvertime: staff.weeklyHours > weeklyLimit,
      isWarning: staff.weeklyHours >= 35,
      dailyOvertime: staff.dailyHours.some(d => d.hours > dailyLimit),
    }));

    const totalHours = result.reduce((sum, s) => sum + s.weeklyHours, 0);
    const atLimitCount = result.filter(s => s.isWarning && !s.isOvertime).length;
    const overLimitCount = result.filter(s => s.isOvertime).length;

    return ResponseUtils.success(res, {
      staff: result,
      summary: {
        totalHours: Math.round(totalHours * 10) / 10,
        staffCount: result.length,
        atLimitCount,
        overLimitCount,
        weekStart: startOfWeek.toISOString(),
        weekEnd: endOfWeek.toISOString(),
      },
    }, 'Overtime stats fetched successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const shift = await shiftRepository.findById(req.params.id as string);

    if (!shift) {
      return ResponseUtils.notFound(res, 'Shift not found');
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
        error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(', '),
      );
    }
    return ResponseUtils.handleError(res, error);
  }
});

router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = shiftUpdateSchema.parse(req.body);
    const userId = req.user?.userId || 'system';

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
      return ResponseUtils.error(
        res,
        result.error || 'Failed to update shift',
        400,
      );
    }

    return ResponseUtils.success(
      res,
      result.shift,
      'Shift updated successfully',
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseUtils.validationError(
        res,
        'Validation failed',
        error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(', '),
      );
    }
    return ResponseUtils.handleError(res, error);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await shiftRepository.delete(req.params.id as string);
    return ResponseUtils.noContent(res, 'Shift deleted successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.post('/:id/publish', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || 'system';
    const shiftId = req.params.id as string;
    
    const shift = await shiftRepository.findById(shiftId);
    if (!shift) {
      return ResponseUtils.notFound(res, 'Shift not found');
    }

    const shiftData = shift as { id: string; location_id: string; start_time: Date };
    
    await db('shifts')
      .where({ id: shiftId })
      .update({
        status: 'PUBLISHED',
        published_at: new Date(),
        updated_at: new Date(),
      });

    await db('audit_logs').insert({
      user_id: userId,
      action: 'PUBLISH_SHIFT',
      entity_type: 'Shift',
      entity_id: shiftId,
      new_value: JSON.stringify({ status: 'PUBLISHED' }),
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
    const { staffId, version } = assignShiftSchema.parse(req.body);
    const assignedBy = req.user?.userId || 'system';

    const result = await assignShift({
      shiftId: req.params.id as string,
      staffId,
      assignedBy,
      version,
    });

    if (!result.success) {
      return ResponseUtils.error(
        res,
        result.error || 'Failed to assign staff',
        400,
      );
    }

    const shift = await shiftRepository.findById(req.params.id as string);
    
    const io = getIO();
    if (io && shift) {
      const shiftData = shift as { location_id: string };
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
        error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(', '),
      );
    }
    return ResponseUtils.handleError(res, error);
  }
});

router.post('/:id/validate', async (req: Request, res: Response) => {
  try {
    const { staffId } = req.body;
    if (!staffId) {
      return ResponseUtils.validationError(res, 'staffId is required');
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
      return ResponseUtils.success(
        res,
        { ...result, suggestions },
        'Validation failed',
      );
    }

    return ResponseUtils.success(res, result, 'Validation successful');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get('/:id/suggestions', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(getQueryString(req.query.limit) || '3');

    const suggestions = await suggestAlternatives({
      db,
      shiftId: req.params.id as string,
      limit,
    });

    return ResponseUtils.success(
      res,
      suggestions,
      'Suggestions fetched successfully',
    );
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

export default router;
