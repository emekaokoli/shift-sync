import { swapRequestSchema } from '@shift-sync/shared';
import { Response, Router } from 'express';
import { z } from 'zod';
import { approveSwap } from '../application/approveSwap';
import { requestSwap } from '../application/requestSwap';
import db from '../infrastructure/database';
import {
  staffRepository,
  swapRepository,
} from '../infrastructure/repositories';
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

async function getManagerLocationIds(user?: AuthenticatedRequest['user']) {
  if (!user || user.role !== 'MANAGER') {
    return null;
  }

  return staffRepository.findUserLocationIds(user.userId, true);
}

async function authorizeSwapAccess(
  swapId: string,
  user?: AuthenticatedRequest['user'],
) {
  const swap = await swapRepository.findById(swapId);
  if (!swap) {
    return { swap: null, error: 'Swap request not found' };
  }

  if (user?.role === 'MANAGER') {
    const allowedLocationIds = await getManagerLocationIds(user);
    if (allowedLocationIds?.length === 0) {
      return {
        swap: null,
        error: 'Not authorized to access this swap request',
      };
    }

    const shift = await db('shifts')
      .where({ id: swap.shift_id })
      .select('location_id')
      .first();

    if (!shift || !allowedLocationIds?.includes(shift.location_id)) {
      return {
        swap: null,
        error: 'Not authorized to access this swap request',
      };
    }
  }

  return { swap, error: undefined };
}

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, userId, shiftId } = req.query;
    const requestedUserId = getQueryString(userId);
    const managerLocationIds = await getManagerLocationIds(req.user);

    const swaps = await swapRepository.findManyWithRelations({
      status: getQueryString(status),
      shiftId: getQueryString(shiftId),
      userId: requestedUserId,
      locationIds: managerLocationIds ?? undefined,
    });

    return ResponseUtils.success(
      res,
      swaps,
      'Swap requests fetched successfully',
    );
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { swap, error } = await authorizeSwapAccess(
      req.params.id as string,
      req.user,
    );

    if (error) {
      if (error === 'Swap request not found') {
        return ResponseUtils.notFound(res, error);
      }
      return ResponseUtils.forbidden(res, error);
    }

    return ResponseUtils.success(
      res,
      swap,
      'Swap request fetched successfully',
    );
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = swapRequestSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return ResponseUtils.unauthorized(res, 'User ID required');
    }

    const result = await requestSwap({
      shiftId: data.shiftId,
      requesterId: userId,
      targetId: data.targetId,
    });

    if (!result.success) {
      return ResponseUtils.error(
        res,
        result.error || 'Failed to create swap request',
        400,
      );
    }

    const swap = await swapRepository.findById(
      (result.swap as { id: string }).id,
    );
    return ResponseUtils.created(
      res,
      swap,
      'Swap request created successfully',
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

router.post(
  '/:id/respond',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actionSchema = z.object({
        action: z.enum(['accept', 'reject', 'approve', 'cancel']),
      });
      const { action } = actionSchema.parse(req.body);
      const userId = req.user?.userId;
      const overrideReason = req.headers['x-override-reason'] as
        | string
        | undefined;

      if (!userId) {
        return ResponseUtils.unauthorized(res, 'User ID required');
      }

      const swap = await swapRepository.findById(req.params.id as string);
      if (!swap) {
        return ResponseUtils.notFound(res, 'Swap request not found');
      }

      if (action === 'approve') {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
          return ResponseUtils.forbidden(
            res,
            'Only managers or admins can approve swap requests',
          );
        }
        if (req.user?.role === 'MANAGER') {
          const managerLocationIds = await getManagerLocationIds(req.user);
          const shift = await db('shifts')
            .where({ id: swap.shift_id })
            .select('location_id')
            .first();
          if (!shift || !managerLocationIds?.includes(shift.location_id)) {
            return ResponseUtils.forbidden(
              res,
              'Not authorized to approve swap requests for this location',
            );
          }
        }
      }

      if (action === 'accept' || action === 'reject') {
        if (swap.target_id !== userId) {
          return ResponseUtils.forbidden(
            res,
            'Only the target user may accept or reject this swap request',
          );
        }
      }

      if (action === 'cancel') {
        if (swap.requester_id !== userId) {
          return ResponseUtils.forbidden(
            res,
            'Only the requester may cancel this swap request',
          );
        }
      }

      const result = await approveSwap({
        swapId: req.params.id as string,
        action,
        userId,
        overrideReason,
      });

      if (!result.success) {
        return ResponseUtils.error(
          res,
          result.error || 'Failed to respond to swap request',
          400,
        );
      }

      return ResponseUtils.success(
        res,
        result.swap,
        'Swap request responded successfully',
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
  },
);

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return ResponseUtils.unauthorized(res, 'User ID required');
    }

    const swap = await swapRepository.findById(req.params.id as string);

    if (!swap) {
      return ResponseUtils.notFound(res, 'Swap request not found');
    }

    if (swap.requester_id !== userId) {
      return ResponseUtils.forbidden(
        res,
        'Not authorized to cancel this request',
      );
    }

    if (swap.status !== 'PENDING') {
      return ResponseUtils.error(res, 'Can only cancel pending requests', 400);
    }

    await swapRepository.update(req.params.id as string, {
      status: 'CANCELLED',
    });

    return ResponseUtils.noContent(res, 'Swap request cancelled successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

export default router;
