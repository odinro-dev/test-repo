import { Response } from "express";

/**
 * Standardized API response wrapper.
 * All v2 endpoints return responses in this format.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta: {
    timestamp: string;
    requestId?: string;
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
  res.status(statusCode).json(response);
}

export function sendError(res: Response, message: string, statusCode = 500): void {
  const response: ApiResponse<null> = {
    success: false,
    data: null,
    error: message,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
  res.status(statusCode).json(response);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: { total: number; page: number; totalPages: number; limit: number }
): void {
  const response = {
    success: true,
    data,
    error: null,
    pagination,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
  res.json(response);
}
