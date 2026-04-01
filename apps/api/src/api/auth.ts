import { Router } from 'express';
import { z } from 'zod';
import {
  extractToken,
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken,
} from '../infrastructure/auth';
import db from '../infrastructure/database';
import { ResponseUtils } from '../infrastructure/response';
import { createAuditLog } from '../application/auditLog';

const router: Router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']).optional().default('STAFF'),
  timezone: z.string().optional().default('America/New_York'),
  desiredHours: z.number().min(0).max(60).optional().default(40),
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await db('users').where({ email }).first();

    if (!user) {
      return ResponseUtils.unauthorized(res, 'Invalid email or password');
    }

    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
      return ResponseUtils.unauthorized(res, 'Invalid email or password');
    }

    const tokens = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await createAuditLog(db, {
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      newValue: { email: user.email },
    });

    return ResponseUtils.success(
      res,
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          timezone: user.timezone,
          desiredHours: user.desired_hours,
        },
      },
      'Login successful'
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseUtils.validationError(
        res,
        'Validation failed',
        error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
      );
    }
    return ResponseUtils.handleError(res, error);
  }
});

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await db('users').where({ email: data.email }).first();

    if (existing) {
      return ResponseUtils.conflict(res, 'Email already registered');
    }

    const passwordHash = await hashPassword(data.password);

    const [user] = await db('users')
      .insert({
        email: data.email,
        name: data.name,
        password_hash: passwordHash,
        role: data.role,
        timezone: data.timezone,
        desired_hours: data.desiredHours,
      })
      .returning(['id', 'email', 'name', 'role', 'timezone', 'desired_hours']);

    const tokens = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await createAuditLog(db, {
      userId: user.id,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user.id,
      newValue: {
        email: user.email,
        name: user.name,
        role: user.role,
        timezone: user.timezone,
      },
    });

    return ResponseUtils.created(
      res,
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          timezone: user.timezone,
          desiredHours: user.desired_hours,
        },
      },
      'Registration successful'
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseUtils.validationError(
        res,
        'Validation failed',
        error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
      );
    }
    return ResponseUtils.handleError(res, error);
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = extractToken(req.headers.authorization);

    if (!refreshToken) {
      return ResponseUtils.unauthorized(res, 'No refresh token provided');
    }

    const payload = verifyToken(refreshToken);

    if (!payload) {
      return ResponseUtils.unauthorized(res, 'Invalid or expired refresh token');
    }

    const user = await db('users')
      .where({ id: payload.userId })
      .select('id', 'email', 'name', 'role', 'timezone', 'desired_hours')
      .first();

    if (!user) {
      return ResponseUtils.unauthorized(res, 'User not found');
    }

    const tokens = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return ResponseUtils.success(
      res,
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      'Token refreshed successfully'
    );
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      return ResponseUtils.unauthorized(res, 'No token provided');
    }

    const payload = verifyToken(token);

    if (!payload) {
      return ResponseUtils.unauthorized(res, 'Invalid token');
    }

    const user = await db('users')
      .where({ id: payload.userId })
      .select('id', 'email', 'name', 'role', 'timezone', 'desired_hours', 'created_at')
      .first();

    if (!user) {
      return ResponseUtils.notFound(res, 'User not found');
    }

    const locations = await db('user_locations')
      .where({ user_id: user.id })
      .join('locations', 'locations.id', 'user_locations.location_id')
      .select('locations.id', 'locations.name', 'user_locations.is_manager');

    return ResponseUtils.success(
      res,
      {
        ...user,
        desiredHours: user.desired_hours,
        locations,
      },
      'User fetched successfully'
    );
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

export default router;
