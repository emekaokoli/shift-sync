import { availabilitySchema, userUpdateSchema } from '@shift-sync/shared';
import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { createAuditLog } from '../application/auditLog';
import db from '../infrastructure/database';
import { staffRepository } from '../infrastructure/repositories';
import { ResponseUtils } from '../infrastructure/response';
import { authMiddleware, type AuthenticatedRequest } from './middleware/auth';

const router: Router = Router();

router.use(authMiddleware);

const getQueryString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return String(value[0]);
  if (typeof value === 'object') return undefined;
  return String(value);
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const { locationId, role, skillId } = req.query;

    const staff = await staffRepository.findMany({
      role: getQueryString(role),
      locationId: getQueryString(locationId),
      skillId: getQueryString(skillId),
    });

    return ResponseUtils.success(res, staff, 'Staff fetched successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const staff = await staffRepository.findById(req.params.id as string);

    if (!staff) {
      return ResponseUtils.notFound(res, 'Staff not found');
    }

    return ResponseUtils.success(res, staff, 'Staff fetched successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = await staffRepository.findById(req.params.id as string);
    if (!existing) {
      return ResponseUtils.notFound(res, 'Staff not found');
    }

    const data = userUpdateSchema.parse(req.body);

    const updates: Record<string, unknown> = {};
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};

    if (data.name && data.name !== existing.name) {
      updates.name = data.name;
      oldValue.name = existing.name;
      newValue.name = data.name;
    }
    if (data.email && data.email !== existing.email) {
      updates.email = data.email;
      oldValue.email = existing.email;
      newValue.email = data.email;
    }
    if (data.timezone && data.timezone !== existing.timezone) {
      updates.timezone = data.timezone;
      oldValue.timezone = existing.timezone;
      newValue.timezone = data.timezone;
    }
    if (data.desiredHours !== undefined && data.desiredHours !== existing.desired_hours) {
      updates.desired_hours = data.desiredHours;
      oldValue.desired_hours = existing.desired_hours;
      newValue.desired_hours = data.desiredHours;
    }

    const staff = await staffRepository.update(req.params.id as string, updates);

    if (Object.keys(newValue).length > 0) {
      await createAuditLog(db, {
        userId: req.user?.userId || 'system',
        action: 'UPDATE_USER',
        entityType: 'User',
        entityId: req.params.id as string,
        oldValue: Object.keys(oldValue).length ? oldValue : undefined,
        newValue,
      });
    }

    return ResponseUtils.success(res, staff, 'Staff updated successfully');
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

router.patch('/:id/notifications', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { inApp, email } = req.body;

    if (typeof inApp !== 'boolean' && typeof email !== 'boolean') {
      return ResponseUtils.validationError(res, 'inApp or email must be a boolean');
    }

    const supportsNotificationPreferences =
      await staffRepository.hasNotificationPreferencesColumn();
    if (!supportsNotificationPreferences) {
      return ResponseUtils.error(
        res,
        'Notification preferences are not configured in the database schema. Run migrations and ensure the users table includes notification_preferences.',
        500
      );
    }

    const existing = await staffRepository.findById(req.params.id as string);
    if (!existing) {
      return ResponseUtils.notFound(res, 'Staff not found');
    }

    const existingPrefs = existing.notification_preferences || { inApp: true, email: false };
    const newPrefs = {
      inApp: inApp !== undefined ? inApp : existingPrefs.inApp,
      email: email !== undefined ? email : existingPrefs.email,
    };

    await staffRepository.update(req.params.id as string, {
      notification_preferences: newPrefs as Record<string, boolean>,
    });

    await createAuditLog(db, {
      userId: req.user?.userId || 'system',
      action: 'UPDATE_NOTIFICATION_PREFERENCES',
      entityType: 'User',
      entityId: req.params.id as string,
      oldValue: existingPrefs,
      newValue: newPrefs,
    });

    return ResponseUtils.success(
      res,
      { notificationPreferences: newPrefs },
      'Notification preferences updated successfully'
    );
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.post('/:id/skills', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { skillId } = req.body;
    if (!skillId) {
      return ResponseUtils.validationError(res, 'skillId is required');
    }

    const userSkill = await staffRepository.addSkill(req.params.id as string, skillId);

    await createAuditLog(db, {
      userId: req.user?.userId || 'system',
      action: 'ADD_SKILL',
      entityType: 'UserSkill',
      entityId: req.params.id as string,
      newValue: { skillId },
    });

    return ResponseUtils.success(res, userSkill, 'Skill added successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.delete('/:id/skills/:skillId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await staffRepository.removeSkill(req.params.id as string, req.params.skillId as string);

    await createAuditLog(db, {
      userId: req.user?.userId || 'system',
      action: 'REMOVE_SKILL',
      entityType: 'UserSkill',
      entityId: req.params.id as string,
      oldValue: { skillId: req.params.skillId as string },
    });

    return ResponseUtils.noContent(res, 'Skill removed successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.post('/:id/locations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { locationId, isManager } = req.body;
    if (!locationId) {
      return ResponseUtils.validationError(res, 'locationId is required');
    }

    const userLocation = await staffRepository.addLocation(
      req.params.id as string,
      locationId,
      isManager
    );

    await createAuditLog(db, {
      userId: req.user?.userId || 'system',
      action: 'ADD_LOCATION_TO_USER',
      entityType: 'UserLocation',
      entityId: req.params.id as string,
      newValue: { locationId, isManager },
    });

    return ResponseUtils.success(res, userLocation, 'Location added successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.delete('/:id/locations/:locationId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await staffRepository.removeLocation(req.params.id as string, req.params.locationId as string);

    await createAuditLog(db, {
      userId: req.user?.userId || 'system',
      action: 'REMOVE_LOCATION_FROM_USER',
      entityType: 'UserLocation',
      entityId: req.params.id as string,
      oldValue: { locationId: req.params.locationId as string },
    });

    return ResponseUtils.noContent(res, 'Location removed successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.post('/:id/availability', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = availabilitySchema.parse(req.body);

    const availability = await staffRepository.addAvailability(req.params.id as string, {
      day_of_week: data.dayOfWeek,
      start_time: data.startTime,
      end_time: data.endTime,
      is_recurring: data.isRecurring,
      specific_date: data.specificDate || null,
    });

    await createAuditLog(db, {
      userId: req.user?.userId || 'system',
      action: 'SET_AVAILABILITY',
      entityType: 'Availability',
      entityId: req.params.id as string,
      newValue: {
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        isRecurring: data.isRecurring,
        specificDate: data.specificDate || null,
      },
    });

    return ResponseUtils.created(res, availability, 'Availability set successfully');
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

router.delete('/availability/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await staffRepository.deleteAvailability(req.params.id as string);

    await createAuditLog(db, {
      userId: req.user?.userId || 'system',
      action: 'DELETE_AVAILABILITY',
      entityType: 'Availability',
      entityId: req.params.id as string,
    });

    return ResponseUtils.noContent(res, 'Availability deleted successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

export default router;
