import type { Response } from 'express';
import type { ApiResponse, PaginatedData } from '@shift-sync/shared';
import { DomainError } from './error';

export class ResponseUtils {
  private constructor() {
    // Utility class; prevent instantiation.
  }

  static handleError(res: Response, error: unknown): Response {
    if (error instanceof DomainError) {
      return this.error(res, error.message, error.statusCode);
    }
    if (error instanceof Error) {
      return this.error(res, error.message, 500);
    }
    return this.error(res, 'Internal server error', 500);
  }

  static success<T>(res: Response, data: T, message = 'Success', statusCode = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static error(res: Response, message: string, statusCode = 400, error?: string): Response {
    const response: ApiResponse = {
      success: false,
      message,
      error: error || undefined,
    };
    return res.status(statusCode).json(response);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message = 'Success'
  ): Response {
    if (page < 1 || limit < 1) {
      return this.validationError(
        res,
        'Invalid pagination parameters. Page and limit must be greater than 0.'
      );
    }

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.min(page, totalPages);

    const response: ApiResponse<PaginatedData<T>> = {
      success: true,
      message,
      data: {
        data,
        pagination: {
          page: currentPage,
          limit,
          total,
          totalPages,
        },
      },
    };

    return res.status(200).json(response);
  }

  static created<T>(res: Response, data: T, message = 'Created successfully'): Response {
    return this.success(res, data, message, 201);
  }

  static noContent(res: Response, message = 'No content'): Response {
    return res.status(204).json({
      success: true,
      message,
    });
  }

  static unauthorized(res: Response, message = 'Unauthorized'): Response {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message = 'Forbidden'): Response {
    return this.error(res, message, 403);
  }

  static notFound(res: Response, message = 'Not found'): Response {
    return this.error(res, message, 404);
  }

  static conflict(res: Response, message = 'Conflict'): Response {
    return this.error(res, message, 409);
  }

  static validationError(res: Response, message = 'Validation error', errors?: string): Response {
    return this.error(res, message, 422, errors);
  }

  static internalError(res: Response, message = 'Internal server error'): Response {
    return this.error(res, message, 500);
  }
}
