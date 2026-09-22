import { ENV } from '@/config/env';
import { tokenStorage } from './tokenStorage';
import { ApiResponse, RequestOptions, createApiError, isApiError } from './types';

// Module-scoped state
let baseUrl: string = ENV.API_BASE_URL.replace(/\/+$/, '');

type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;

/**
 * Registers a global callback when a 401 Unauthorized response is received.
 */
export function setUnauthorizedHandler(handler: UnauthorizedListener | null): void {
  unauthorizedListener = handler;
}

/**
 * Patterns matching database drivers, internal runtimes, stack traces, and filesystem paths.
 */
const SENSITIVE_ERROR_PATTERNS = [
  /sql/i,
  /pgx/i,
  /postgres/i,
  /pq:/i,
  /syntax error/i,
  /foreign key/i,
  /unique constraint/i,
  /deadlock/i,
  /context deadline/i,
  /timeout:/i,
  /panic/i,
  /nil dereference/i,
  /stack trace/i,
  /goroutine/i,
  /database/i,
  /relation "[^"]+"/i,
  /[a-z0-9_]+\.[a-z0-9_]+\(/i,
  /[\\/](?:cmd|internal|pkg|app|usr|var|Users)[\\/]/i,
];

function isSensitiveMessage(msg?: string): boolean {
  if (!msg) return false;
  return SENSITIVE_ERROR_PATTERNS.some((pattern) => pattern.test(msg));
}

function sanitizeErrorMessage(status: number, rawMessage?: string): string {
  // 1. All 5xx server-side errors must ALWAYS show a generic safe message
  if (status >= 500) {
    return 'An unexpected server error occurred. Please try again later.';
  }

  // 2. Specific HTTP status mappings
  if (status === 401) {
    return 'Session expired or invalid. Please log in again.';
  }
  if (status === 403) {
    return 'You do not have permission to perform this action.';
  }
  if (status === 404) {
    return 'The requested resource was not found.';
  }
  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // 3. User-safe 4xx client errors (strip if sensitive keywords found)
  if (rawMessage) {
    const trimmed = rawMessage.trim();
    if (trimmed && !isSensitiveMessage(trimmed)) {
      return trimmed;
    }
  }

  return 'Request could not be processed. Please check your input and try again.';
}

/**
 * Updates base URL dynamically if needed.
 */
export function setBaseUrl(url: string): void {
  baseUrl = url.replace(/\/+$/, '');
}

/**
 * Core request dispatcher (pure function).
 */
export async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    params,
    requiresAuth = true,
    headers: customHeaders = {},
    ...fetchOptions
  } = options;

  // 1. Build query parameters
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  let url = `${baseUrl}/${cleanEndpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // 2. Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  // 3. Inject Bearer token if required (unless useCookieOnly is explicitly requested)
  if (requiresAuth && !options.useCookieOnly) {
    const token = await tokenStorage.getSessionToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // 4. Execute fetch with dual-mode credentials (sends HttpOnly cookie automatically)
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: options.credentials || 'include',
    });

    // 5. Parse response body
    let rawData: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      rawData = await response.json();
    } else {
      const text = await response.text();
      rawData = text ? { message: text } : {};
    }

    // 6. Handle HTTP errors
    if (!response.ok) {
      if (response.status === 401 && requiresAuth) {
        unauthorizedListener?.();
      }

      const errorData = rawData as any;
      const rawErrorMsg = errorData?.error || errorData?.message;

      if (import.meta.env.DEV) {
        console.warn(`[ApiClient HTTP Error ${response.status}] ${url}:`, {
          rawError: rawErrorMsg,
          body: errorData,
        });
      }

      let userFacingMessage = sanitizeErrorMessage(response.status, rawErrorMsg);

      if (
        Array.isArray(errorData?.validation_errors) &&
        errorData.validation_errors.length > 0
      ) {
        const safeValidationMsgs = errorData.validation_errors
          .map((ve: any) => {
            const msg = ve.message || `${ve.field || 'Field'} is invalid`;
            return isSensitiveMessage(msg) ? 'Invalid input format' : msg;
          })
          .filter(Boolean);

        if (safeValidationMsgs.length > 0) {
          userFacingMessage = safeValidationMsgs.join(', ');
        }
      }

      throw createApiError(userFacingMessage, response.status, errorData);
    }

    // 7. Unwrap standard Go backend envelope ({ success: true, data: ... })
    const payload =
      rawData && typeof rawData === 'object' && 'data' in rawData && rawData.data !== undefined
        ? rawData.data
        : rawData;

    return {
      data: payload as T,
      status: response.status,
    };
  } catch (error: any) {
    if (isApiError(error)) {
      throw error;
    }

    if (import.meta.env.DEV) {
      console.warn(`[ApiClient Network Error] Failed to reach: ${url}`, error?.message);
    }

    let userMessage =
      'Unable to connect to server. Please check your internet connection and try again.';
    if (error?.name === 'AbortError') {
      userMessage = 'Connection timed out. Please try again.';
    }

    throw createApiError(userMessage, 0);
  }
}

// Convenience HTTP methods (Functional object)
export function get<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { ...options, method: 'GET' });
}

export function post<T = any>(
  endpoint: string,
  body?: any,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function put<T = any>(
  endpoint: string,
  body?: any,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function patch<T = any>(
  endpoint: string,
  body?: any,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function del<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { ...options, method: 'DELETE' });
}

// Public API functional object (zero classes)
export const apiClient = {
  setBaseUrl,
  setUnauthorizedHandler,
  request,
  get,
  post,
  put,
  patch,
  delete: del,
  del,
};

export default apiClient;

