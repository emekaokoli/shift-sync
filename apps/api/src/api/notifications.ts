import { Router } from 'express';
import db from '../infrastructure/database';
import { ResponseUtils } from '../infrastructure/response';
import { verifyToken, extractToken } from '../infrastructure/auth';

const router: Router = Router();

router.get('/', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    if (!token) {
      return ResponseUtils.unauthorized(res, 'No token provided');
    }

    const payload = verifyToken(token);
    if (!payload) {
      return ResponseUtils.unauthorized(res, 'Invalid token');
    }

    const { read, limit = '50', offset = '0' } = req.query;

    let query = db('notifications')
      .where({ user_id: payload.userId })
      .orderBy('created_at', 'desc')
      .limit(Number(limit))
      .offset(Number(offset));

    if (read !== undefined) {
      query = query.where({ read: read === 'true' });
    }

    const notifications = await query;
    const total = await db('notifications')
      .where({ user_id: payload.userId })
      .count('* as count')
      .first();

    return ResponseUtils.success(res, {
      notifications,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: Number(total?.count || 0),
      },
    });
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    if (!token) {
      return ResponseUtils.unauthorized(res, 'No token provided');
    }

    const payload = verifyToken(token);
    if (!payload) {
      return ResponseUtils.unauthorized(res, 'Invalid token');
    }

    const { id } = req.params;

    const updated = await db('notifications')
      .where({ id, user_id: payload.userId })
      .update({ read: true, updated_at: db.fn.now() })
      .returning('*');

    if (!updated.length) {
      return ResponseUtils.notFound(res, 'Notification not found');
    }

    return ResponseUtils.success(res, updated[0]);
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.patch('/read-all', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    if (!token) {
      return ResponseUtils.unauthorized(res, 'No token provided');
    }

    const payload = verifyToken(token);
    if (!payload) {
      return ResponseUtils.unauthorized(res, 'Invalid token');
    }

    await db('notifications')
      .where({ user_id: payload.userId, read: false })
      .update({ read: true, updated_at: db.fn.now() });

    return ResponseUtils.success(res, {
      message: 'All notifications marked as read',
    });
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

export default router;
