import { get, post, put, del } from '@/services/api/apiClient';
import { ENDPOINTS } from '@/services/api/endpoints';
import { ChatMessage, Conversation, MessagesPage, UserSearchResult } from '@/features/chat/types';

export const chatQueryKeys = {
  all: ['chat'] as const,
  conversations: () => ['chat', 'conversations'] as const,
  messages: (conversationId: string, limit = 50, before?: string) =>
    ['chat', 'messages', conversationId, { limit, before: before ?? null }] as const,
  userSearch: (query: string, limit = 20) =>
    ['chat', 'user-search', { query: query.trim().toLowerCase(), limit }] as const,
};

export const chatApiService = {
  /**
   * Fetch active inbox conversations for current user
   */
  async getConversations(limit = 50, offset = 0): Promise<Conversation[]> {
    const response = await get<any>(
      `${ENDPOINTS.CHAT.CONVERSATIONS}?limit=${limit}&offset=${offset}`
    );
    const raw = response.data;
    let result: Conversation[] = [];
    if (Array.isArray(raw)) result = raw;
    else if (raw && Array.isArray(raw.conversations)) result = raw.conversations;
    else if (raw && Array.isArray(raw.data)) result = raw.data;
    return result;
  },

  /**
   * Find or create a direct 1-on-1 conversation with another user
   */
  async createDirectConversation(targetUserId: string): Promise<Conversation> {
    const response = await post<any>(ENDPOINTS.CHAT.DIRECT_CONVERSATION, {
      target_user_id: targetUserId,
    });
    const raw = response.data;
    return (raw && raw.conversation) || (raw && raw.data) || raw;
  },

  /**
   * Get cursor-paginated messages for a conversation
   */
  async getMessages(conversationId: string, limit = 50, before?: string): Promise<MessagesPage> {
    let url = `${ENDPOINTS.CHAT.MESSAGES(conversationId)}?limit=${limit}`;
    if (before) {
      url += `&before=${encodeURIComponent(before)}`;
    }
    const response = await get<any>(url);
    const raw = response.data;
    let page: MessagesPage = { messages: [], has_more: false };

    if (raw && Array.isArray(raw.messages)) {
      page = {
        messages: raw.messages,
        next_cursor: raw.next_cursor,
        has_more: Boolean(raw.has_more),
      };
    } else if (raw && raw.data && Array.isArray(raw.data.messages)) {
      page = raw.data;
    } else if (Array.isArray(raw)) {
      page = { messages: raw, has_more: false };
    }

    return page;
  },

  /**
   * Send a new message
   */
  async sendMessage(
    conversationId: string,
    content: string,
    messageType: string = 'text',
    extra?: {
      reply_to_id?: string;
      forwarded_from_message_id?: string;
      reply_to_content?: string;
      reply_to_sender_name?: string;
      forwarded_from_content?: string;
      forwarded_from_name?: string;
    }
  ): Promise<ChatMessage> {
    const response = await post<any>(ENDPOINTS.CHAT.MESSAGES(conversationId), {
      content,
      message_type: messageType,
      ...extra,
    });
    const raw = response.data;
    return (raw && raw.data) || (raw && raw.message) || raw;
  },

  /**
   * Edit a sent message text content
   */
  async editMessage(
    conversationId: string,
    messageId: string,
    content: string
  ): Promise<ChatMessage> {
    const response = await put<any>(ENDPOINTS.CHAT.MESSAGE_ITEM(conversationId, messageId), {
      content,
    });
    const raw = response.data;
    return (raw && raw.data) || raw;
  },

  /**
   * Delete a sent message (scope: 'me' or 'everyone')
   */
  async deleteMessage(
    conversationId: string,
    messageId: string,
    scope: 'me' | 'everyone'
  ): Promise<void> {
    await del(ENDPOINTS.CHAT.MESSAGE_ITEM(conversationId, messageId), { scope });
  },

  /**
   * Mark all unread incoming messages in a conversation as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    await post(ENDPOINTS.CHAT.MARK_READ(conversationId));
  },

  /**
   * Search real database users by username or full name
   */
  async searchUsers(query: string, limit = 20): Promise<UserSearchResult[]> {
    if (!query.trim()) {
      return [];
    }
    try {
      const response = await get<any>(
        `${ENDPOINTS.CHAT.USERS_SEARCH}?q=${encodeURIComponent(query.trim())}&limit=${limit}`
      );
      const raw = response.data;
      if (Array.isArray(raw)) return raw;
      if (raw && Array.isArray(raw.users)) return raw.users;
      if (raw && Array.isArray(raw.data)) return raw.data;
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Delete / leave conversation for the current user
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await del(ENDPOINTS.CHAT.CONVERSATION_BY_ID(conversationId));
  },

  /**
   * Block a user
   */
  async blockUser(targetUserId: string): Promise<void> {
    await post(ENDPOINTS.CHAT.BLOCK, { target_user_id: targetUserId });
  },

  /**
   * Unblock a user
   */
  async unblockUser(targetUserId: string): Promise<void> {
    await post(ENDPOINTS.CHAT.UNBLOCK, { target_user_id: targetUserId });
  },

  /**
   * Get list of blocked user IDs
   */
  async getBlockedUsers(): Promise<string[]> {
    try {
      const response = await get<any>(ENDPOINTS.CHAT.BLOCKED);
      const raw = response.data;
      if (Array.isArray(raw)) return raw;
      if (raw && Array.isArray(raw.data)) return raw.data;
      return [];
    } catch {
      return [];
    }
  },
};

export default chatApiService;
