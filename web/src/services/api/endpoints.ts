/**
 * Centralized API Endpoints for TemariCom Web
 */

export const ENDPOINTS = {
  AUTH: {
    HEALTH: '/auth/health',
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    VERIFY_OTP: '/auth/verify-otp',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
  },
} as const;

export default ENDPOINTS;
