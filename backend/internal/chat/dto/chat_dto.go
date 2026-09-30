package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateDirectChatRequest initiates or retrieves a 1-on-1 direct conversation
type CreateDirectChatRequest struct {
	TargetUserID uuid.UUID `json:"target_user_id" validate:"required"`
}

// UserSearchResponse represents a student/peer found in database user search
type UserSearchResponse struct {
	ID        uuid.UUID `json:"id"`
	Username  string    `json:"username"`
	FullName  string    `json:"full_name"`
	Email     string    `json:"email,omitempty"`
	AvatarURL string    `json:"avatar_url"`
}

// SendMessageRequest payload for REST and WebSocket message sending
type SendMessageRequest struct {
	Content                string     `json:"content"`
	MessageType            string     `json:"message_type" validate:"omitempty,oneof=text image video file audio system"`
	MediaKey               string     `json:"media_key,omitempty"`
	MediaMimeType          string     `json:"media_mime_type,omitempty"`
	MediaSizeBytes         *int64     `json:"media_size_bytes,omitempty"`
	ReplyToID              *uuid.UUID `json:"reply_to_id,omitempty"`
	ForwardedFromMessageID *uuid.UUID `json:"forwarded_from_message_id,omitempty"`
	ReplyToContent         string     `json:"reply_to_content,omitempty"`
	ReplyToSenderName      string     `json:"reply_to_sender_name,omitempty"`
	ForwardedFromContent   string     `json:"forwarded_from_content,omitempty"`
	ForwardedFromName      string     `json:"forwarded_from_name,omitempty"`
}

// BlockUserRequest payload to block or unblock a user
type BlockUserRequest struct {
	TargetUserID uuid.UUID `json:"target_user_id" validate:"required"`
}

// BlockStatusResponse represents current blocking relationship
type BlockStatusResponse struct {
	TargetUserID uuid.UUID `json:"target_user_id"`
	IsBlocked    bool      `json:"is_blocked"`
}

// UserSummaryDTO provides sender or peer identification with CDN avatar resolution
type UserSummaryDTO struct {
	ID         uuid.UUID  `json:"id"`
	FullName   string     `json:"full_name"`
	Username   string     `json:"username"`
	AvatarURL  string     `json:"avatar_url"`
	IsOnline   bool       `json:"is_online"`
	LastSeenAt *time.Time `json:"last_seen_at,omitempty"`
	IsBlocked  bool       `json:"is_blocked,omitempty"`
}

// MessageResponse represents a single message with populated sender profile and delivery status
type MessageResponse struct {
	ID                     uuid.UUID       `json:"id"`
	ConversationID         uuid.UUID       `json:"conversation_id"`
	SenderID               uuid.UUID       `json:"sender_id"`
	Sender                 *UserSummaryDTO `json:"sender,omitempty"`
	Content                string          `json:"content"`
	MessageType            string          `json:"message_type"`
	MediaKey               string          `json:"media_key,omitempty"`
	MediaURL               string          `json:"media_url,omitempty"`
	MediaMimeType          string          `json:"media_mime_type,omitempty"`
	MediaSizeBytes         *int64          `json:"media_size_bytes,omitempty"`
	ReplyToID              *uuid.UUID      `json:"reply_to_id,omitempty"`
	ReplyToContent         string          `json:"reply_to_content,omitempty"`
	ReplyToSenderName      string          `json:"reply_to_sender_name,omitempty"`
	ForwardedFromMessageID *uuid.UUID      `json:"forwarded_from_message_id,omitempty"`
	ForwardedFromContent   string          `json:"forwarded_from_content,omitempty"`
	ForwardedFromName      string          `json:"forwarded_from_name,omitempty"`
	IsDelivered            bool            `json:"is_delivered"`
	IsRead                 bool            `json:"is_read"`
	CreatedAt              time.Time       `json:"created_at"`
	EditedAt               *time.Time      `json:"edited_at,omitempty"`
}

// ConversationResponse represents an inbox conversation item with unread badge count
type ConversationResponse struct {
	ID                 uuid.UUID       `json:"id"`
	Type               string          `json:"type"`
	Title              string          `json:"title"`
	AvatarKey          string          `json:"avatar_key,omitempty"`
	AvatarURL          string          `json:"avatar_url"`
	LastMessagePreview string          `json:"last_message_preview"`
	LastMessageAt      *time.Time      `json:"last_message_at,omitempty"`
	UnreadCount        int             `json:"unread_count"`
	IsMuted            bool            `json:"is_muted"`
	IsPinned           bool            `json:"is_pinned"`
	IsBlocked          bool            `json:"is_blocked,omitempty"`
	Peer               *UserSummaryDTO `json:"peer,omitempty"` // For direct 1-on-1 chats, details of the other user
}

// CursorPaginationQuery query parameters for high-performance message fetching
type CursorPaginationQuery struct {
	Limit  int    `query:"limit"`
	Before string `query:"before"` // ISO8601 timestamp string
}

// MessagesPageResponse cursor-paginated messages container
type MessagesPageResponse struct {
	Messages   []MessageResponse `json:"messages"`
	NextCursor *string           `json:"next_cursor,omitempty"`
	HasMore    bool              `json:"has_more"`
}

type EditMessageRequest struct {
	Content string `json:"content" validate:"required,min=1"`
}

// WebSocket Event Constants
const (
	WSEventNewMessage       = "chat:new_message"
	WSEventSendMessage      = "chat:send_message"
	WSEventMessageDelivered = "chat:delivered"
	WSEventReadReceipt      = "chat:read"
	WSEventTyping           = "chat:typing"
	WSEventPresence         = "chat:presence"
	WSEventError            = "chat:error"
	WSEventMessageEdited    = "chat:message_edited"
	WSEventMessageDeleted   = "chat:message_deleted"
)

// WSEvent wrapper for all client/server WebSocket events
type WSEvent struct {
	Type           string     `json:"type"`
	ConversationID *uuid.UUID `json:"conversation_id,omitempty"`
	Payload        any        `json:"payload"`
}

// WSTypingPayload broadcast when a user starts/stops typing
type WSTypingPayload struct {
	ConversationID uuid.UUID `json:"conversation_id"`
	UserID         uuid.UUID `json:"user_id"`
	Username       string    `json:"username"`
	IsTyping       bool      `json:"is_typing"`
}

// WSReadPayload broadcast when messages are marked as read
type WSReadPayload struct {
	ConversationID uuid.UUID `json:"conversation_id"`
	UserID         uuid.UUID `json:"user_id"`
	ReadAt         time.Time `json:"read_at"`
}

// WSDeliveredPayload broadcast when message is delivered to online recipient
type WSDeliveredPayload struct {
	ConversationID uuid.UUID `json:"conversation_id"`
	MessageID      uuid.UUID `json:"message_id"`
	UserID         uuid.UUID `json:"user_id"`
	DeliveredAt    time.Time `json:"delivered_at"`
}
