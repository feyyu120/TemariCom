export interface ApiResponse<T = any> {
  data: T;
  status: number;
}

export interface ApiErrorResponse {
  error?: string;
  message?: string;
  details?: Record<string, string[]>;
  validation_errors?: Array<{ field: string; message: string }>;
}

export interface ApiError extends Error {
  status: number;
  data?: ApiErrorResponse;
  _isApiError: true;
}

/**
 * Functional error factory (zero class keyword used)
 */
export function createApiError(
  message: string,
  status: number,
  data?: ApiErrorResponse
): ApiError {
  const err = new Error(message) as ApiError;
  err.name = 'ApiError';
  err.status = status;
  err.data = data;
  err._isApiError = true;
  return err;
}

export function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null && (err as any)._isApiError === true;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  requiresAuth?: boolean;
}
