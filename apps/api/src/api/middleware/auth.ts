import { Request, Response, NextFunction, Router } from 'express';
import { verifyToken, extractToken } from '../../infrastructure/auth';
import { ResponseUtils } from '../../infrastructure/response';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  console.log('[Auth Middleware] Headers:', req.headers.authorization ? 'Token present' : 'No token');
  
  const token = extractToken(req.headers.authorization);

  if (!token) {
    console.log('[Auth Middleware] No token provided');
    return ResponseUtils.unauthorized(res, 'No token provided');
  }

  const payload = verifyToken(token);

  if (!payload) {
    console.log('[Auth Middleware] Invalid token');
    return ResponseUtils.unauthorized(res, 'Invalid token');
  }

  console.log('[Auth Middleware] Token valid, user:', payload.userId);
  req.user = payload;
  next();
}