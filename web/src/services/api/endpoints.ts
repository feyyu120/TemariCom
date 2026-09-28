/**
 * Centralized API Endpoints for TemariCom Web
 */

export const ENDPOINTS = {
  AUTH: {
    HEALTH: '/auth/health',
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    VERIFY_OTP: '/auth/verify-otp',
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
  RESEARCH: {
    HEALTH: '/research/health',
    SEARCH: '/research/search',
    PAPER_BY_ID: (id: string) => `/research/papers/${id}`,
    SAVED: '/research/saved',
    SAVE: '/research/saved',
    REMOVE_SAVED: (id: string) => `/research/saved/${id}`,
    REMOVE_SAVED_BY_EXTERNAL: (externalId: string) => `/research/saved/paper/${externalId}`,
    CHECK_SAVED: (externalId: string) => `/research/saved/check/${externalId}`,
  },
} as const;

export default ENDPOINTS;

