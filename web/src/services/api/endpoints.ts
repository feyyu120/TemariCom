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
    SWITCH_ACCOUNT: '/auth/switch-account',
  },
  PROFILE: {
    ME: '/profile/me',
    BY_ID: (id: string) => `/profile/${id}`,
    UPDATE: '/profile/me',
    PRESIGN_AVATAR: '/profile/avatar/presign',
    DELETE_ACCOUNT: '/profile/me',
    CAMPUS: (institutionId: string) => `/profile/campus/${institutionId}`,
  },
} as const;

export default ENDPOINTS;

