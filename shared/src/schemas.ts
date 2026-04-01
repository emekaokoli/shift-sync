import { z } from 'zod';
import { ROLES, SHIFT_STATUS } from './constants';

export const roleSchema = z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF]);

export const shiftStatusSchema = z.enum([
  SHIFT_STATUS.DRAFT,
  SHIFT_STATUS.PUBLISHED,
  SHIFT_STATUS.CANCELLED,
]);

export const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: roleSchema.default('STAFF'),
  timezone: z.string().default('America/New_York'),
  desiredHours: z.number().min(0).max(60).default(40),
});

export const userUpdateSchema = userSchema.partial();

export const locationSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(255),
  timezone: z.string(),
  cutoffHours: z.number().min(0).max(168).default(48),
});

export const skillSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(255).optional(),
});

export const availabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isRecurring: z.boolean().default(true),
  specificDate: z.string().datetime().optional(),
});

export const shiftSchema = z.object({
  locationId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  requiredSkillId: z.string(),
  headcount: z.number().min(1).max(20).default(1),
  status: shiftStatusSchema.default(SHIFT_STATUS.DRAFT),
});

export const shiftUpdateSchema = shiftSchema.partial();

export const assignShiftSchema = z.object({
  shiftId: z.string(),
  staffId: z.string(),
  version: z.number().optional(),
});

export const swapRequestSchema = z.object({
  shiftId: z.string(),
  targetId: z.string().optional(),
});

export const swapResponseSchema = z.object({
  swapId: z.string(),
  action: z.enum(['accept', 'reject', 'approve', 'cancel']),
});

export const dropClaimSchema = z.object({
  dropId: z.string(),
});

export const idParamSchema = z.object({
  id: z.string(),
});

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const locationFilterSchema = z.object({
  locationId: z.string().optional(),
});

export const userIdParamSchema = z.object({
  userId: z.string(),
});
