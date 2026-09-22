/**
 * Environment configuration for TemariCom Web
 */

function normalizeApiUrl(rawUrl?: string): string {
  const isDev = import.meta.env.DEV;
  const trimmed = rawUrl?.trim();

  // In production, ensure secure HTTPS
  if (!isDev && trimmed && !trimmed.startsWith('https://')) {
    console.warn(
      `[Security Warning] Insecure HTTP URL used in production (${trimmed}). Production should use HTTPS.`
    );
  }

  // Development fallback to local Go Fiber backend (Port 3000)
  let url = (trimmed || 'http://localhost:3000/api/v1').replace(/\/+$/, '');

  // Normalize /api/v1 prefix
  if (!url.includes('/api/v1')) {
    if (url.endsWith('/api')) {
      url = `${url}/v1`;
    } else {
      url = `${url}/api/v1`;
    }
  }

  return url;
}

export const ENV = {
  API_BASE_URL: normalizeApiUrl(import.meta.env.VITE_API_URL),
  IS_DEV: import.meta.env.DEV,
} as const;

export default ENV;

