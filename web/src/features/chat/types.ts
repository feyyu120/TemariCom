/**
 * Domain types for TemariCom Web Chat feature
 */

export interface PeerUser {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  avatar_url: string;
  is_online?: boolean;
  last_seen_at?: string | null;
  is_blocked?: boolean;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'channel';
  title: string;
  avatar_key?: string;
  avatar_url: string;
  last_message_preview: string;
  last_message_at?: string;
  unread_count: number;
  is_muted: boolean;
  is_pinned: boolean;
  is_blocked?: boolean;
  peer?: PeerUser;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: PeerUser;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'file' | 'audio' | 'system';
  media_key?: string;
  media_url?: string;
  media_mime_type?: string;
  media_size_bytes?: number;
  reply_to_id?: string;
  forwarded_from_message_id?: string;
  reply_to_content?: string;
  reply_to_sender_name?: string;
  forwarded_from_content?: string;
  forwarded_from_name?: string;
  is_delivered: boolean;
  is_read: boolean;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'error';
  created_at: string;
  edited_at?: string;
}

export interface UserSearchResult {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  avatar_url: string;
}

export interface StoryItem {
  id: string;
  name: string;
  avatar_url?: string;
  is_online?: boolean;
  is_user_story?: boolean;
  has_unseen?: boolean;
  badge_text?: string;
}

export interface MessagesPage {
  messages: ChatMessage[];
  next_cursor?: string;
  has_more: boolean;
}

export interface WSEvent<T = any> {
  type: string;
  conversation_id?: string;
  payload: T;
}

export interface WSTypingPayload {
  conversation_id: string;
  user_id: string;
  username: string;
  is_typing: boolean;
}

export interface WSReadPayload {
  conversation_id: string;
  user_id: string;
  read_at: string;
}

export interface WSDeliveredPayload {
  conversation_id: string;
  message_id: string;
  user_id: string;
  delivered_at: string;
}

export interface WSDeletedPayload {
  conversation_id: string;
  message_id: string;
}
