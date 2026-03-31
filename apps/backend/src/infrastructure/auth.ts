import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';

const JWT_SECRET: string =
  process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as JWTPayload;
  } catch {
    return null;
  }
}

export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

export function isAdmin(role: string): boolean {
  return role === 'ADMIN';
}

export function isManager(role: string): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}
