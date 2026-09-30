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
  LOST_FOUND: {
    HEALTH: '/lost-found/health',
    ITEMS: '/lost-found/items',
    ITEM_BY_ID: (id: string) => `/lost-found/items/${id}`,
    UPLOAD_URL: '/lost-found/upload-url',
    UPLOAD: '/lost-found/upload',
  },
  CHAT: {
    CONVERSATIONS: '/chat/conversations',
    CONVERSATION_BY_ID: (id: string) => `/chat/conversations/${id}`,
    DIRECT_CONVERSATION: '/chat/conversations/direct',
    SAVED: '/chat/saved',
    BLOCK: '/chat/block',
    UNBLOCK: '/chat/unblock',
    BLOCKED: '/chat/blocked',
    MESSAGES: (conversationId: string) => `/chat/conversations/${conversationId}/messages`,
    MESSAGE_ITEM: (conversationId: string, messageId: string) => `/chat/conversations/${conversationId}/messages/${messageId}`,
    MARK_READ: (conversationId: string) => `/chat/conversations/${conversationId}/read`,
    USERS_SEARCH: '/chat/users/search',
  },
} as const;

export default ENDPOINTS;

