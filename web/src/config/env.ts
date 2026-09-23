/**
 * Environment configuration for TemariCom Web
 */

function resolveApiUrl(rawUrl?: string): string {
  const trimmed = rawUrl?.trim();
  if (trimmed) {
    return trimmed.replace(/\/+$/, '');
  }
  // Safe local fallback when VITE_API_URL is undefined or missing
  return 'http://localhost:3000/api/v1';
}

export const ENV = {
  API_BASE_URL: resolveApiUrl(import.meta.env.VITE_API_URL),
  IS_DEV: import.meta.env.DEV,
} as const;

export default ENV;
