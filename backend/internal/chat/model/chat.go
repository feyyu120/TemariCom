package model

import (
	"time"

	"github.com/google/uuid"
)

type ConversationType string

const (
	ConversationTypeDirect ConversationType = "direct"
	ConversationTypeGroup  ConversationType = "group"
)

type MessageType string

const (
	MessageTypeText   MessageType = "text"
	MessageTypeImage  MessageType = "image"
	MessageTypeVideo  MessageType = "video"
	MessageTypeFile   MessageType = "file"
	MessageTypeAudio  MessageType = "audio"
	MessageTypeSystem MessageType = "system"
)

type ParticipantRole string

const (
	ParticipantRoleAdmin  ParticipantRole = "admin"
	ParticipantRoleMember ParticipantRole = "member"
)

type Conversation struct {
	ID                 uuid.UUID        `json:"id"`
	Type               ConversationType `json:"type"`
	Title              *string          `json:"title,omitempty"`
	AvatarKey          *string          `json:"avatar_key,omitempty"`
	CreatedBy          *uuid.UUID       `json:"created_by,omitempty"`
	LastMessageID      *uuid.UUID       `json:"last_message_id,omitempty"`
	LastMessagePreview *string          `json:"last_message_preview,omitempty"`
	LastMessageAt      *time.Time       `json:"last_message_at,omitempty"`
	CreatedAt          time.Time        `json:"created_at"`
	UpdatedAt          time.Time        `json:"updated_at"`
}

type Participant struct {
	ConversationID uuid.UUID       `json:"conversation_id"`
	UserID         uuid.UUID       `json:"user_id"`
	Role           ParticipantRole `json:"role"`
	LastReadAt     *time.Time      `json:"last_read_at,omitempty"`
	IsMuted        bool            `json:"is_muted"`
	IsPinned       bool            `json:"is_pinned"`
	JoinedAt       time.Time       `json:"joined_at"`
	LeftAt         *time.Time      `json:"left_at,omitempty"`
}

type Message struct {
	ID                     uuid.UUID   `json:"id"`
	ConversationID         uuid.UUID   `json:"conversation_id"`
	SenderID               uuid.UUID   `json:"sender_id"`
	Content                *string     `json:"content,omitempty"`
	MessageType            MessageType `json:"message_type"`
	MediaKey               *string     `json:"media_key,omitempty"`
	MediaMimeType          *string     `json:"media_mime_type,omitempty"`
	MediaSizeBytes         *int64      `json:"media_size_bytes,omitempty"`
	ReplyToID              *uuid.UUID  `json:"reply_to_id,omitempty"`
	ForwardedFromMessageID *uuid.UUID  `json:"forwarded_from_message_id,omitempty"`
	CreatedAt              time.Time   `json:"created_at"`
	UpdatedAt              time.Time   `json:"updated_at"`
	EditedAt               *time.Time  `json:"edited_at,omitempty"`
	DeletedAt              *time.Time  `json:"deleted_at,omitempty"`
}

type MessageReceipt struct {
	MessageID   uuid.UUID  `json:"message_id"`
	UserID      uuid.UUID  `json:"user_id"`
	DeliveredAt *time.Time `json:"delivered_at,omitempty"`
	ReadAt      *time.Time `json:"read_at,omitempty"`
}

type MessageDeletion struct {
	MessageID uuid.UUID `json:"message_id"`
	UserID    uuid.UUID `json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
}
