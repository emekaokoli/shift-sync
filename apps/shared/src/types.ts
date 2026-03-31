export type Role = 'ADMIN' | 'MANAGER' | 'STAFF';

export type ShiftStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';

export type SwapStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type DropStatus = 'PENDING' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  timezone: string;
  desiredHours: number;
  locations?: { id: string; name: string; isManager: boolean }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserWithRelations extends User {
  skills: Skill[];
  locationCertifications: Location[];
  availability: Availability[];
}

export interface Location {
  id: string;
  name: string;
  address: string;
  timezone: string;
  cutoffHours: number;
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string | null;
}

export interface UserSkill {
  id: string;
  userId: string;
  skillId: string;
}

export interface UserLocation {
  id: string;
  userId: string;
  locationId: string;
  isManager: boolean;
}

export interface Availability {
  id: string;
  userId: string;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  specificDate: string | null;
}

export interface Shift {
  id: string;
  locationId: string;
  startTime: string;
  endTime: string;
  requiredSkillId: string;
  headcount: number;
  status: ShiftStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftWithRelations extends Shift {
  location: Location;
  requiredSkill: Skill;
  assignments: Assignment[];
}

export interface Assignment {
  id: string;
  shiftId: string;
  staffId: string;
  assignedBy: string;
  version: number;
  createdAt: string;
}

export interface AssignmentWithStaff extends Assignment {
  staff: User;
}

export interface SwapRequest {
  id: string;
  shiftId: string;
  requesterId: string;
  targetId: string | null;
  status: SwapStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SwapRequestWithRelations extends SwapRequest {
  shift: Shift;
  requester: User;
  target: User | null;
}

export interface DropRequest {
  id: string;
  shiftId: string;
  requesterId: string;
  status: DropStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
}

export type ViolationCode =
  | 'OVERLAP'
  | 'INSUFFICIENT_REST'
  | 'SKILL_MISMATCH'
  | 'UNAVAILABLE'
  | 'LOCATION_NOT_ALLOWED'
  | 'OVERTIME_WARNING'
  | 'OVERTIME_BLOCK'
  | 'DAILY_OVERTIME_WARNING'
  | 'DAILY_OVERTIME_BLOCK'
  | 'CONSECUTIVE_DAYS_WARNING'
  | 'CONSECUTIVE_DAYS_BLOCK'
  | 'STAFF_NOT_FOUND'
  | 'SHIFT_NOT_FOUND';

export interface Violation {
  code: ViolationCode;
  message: string;
  details?: Record<string, unknown>;
}

export type ValidationResult = { ok: true } | { ok: false; violations: Violation[] };

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedData<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
