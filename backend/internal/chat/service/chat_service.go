package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"TemariCom/internal/chat/dto"
	"TemariCom/internal/chat/model"
	"TemariCom/internal/chat/repository"
	"TemariCom/pkg/storage"

	"github.com/google/uuid"
)

var (
	ErrEmptyMessage       = errors.New("message content or media is required")
	ErrInvalidMessageType = errors.New("invalid message type")
)

type ChatService interface {
	CreateDirectChat(ctx context.Context, currentUserID, targetUserID uuid.UUID) (*dto.ConversationResponse, error)
	GetUserConversations(ctx context.Context, currentUserID uuid.UUID, limit, offset int) ([]dto.ConversationResponse, error)
	GetMessages(ctx context.Context, conversationID, currentUserID uuid.UUID, limit int, beforeStr string) (*dto.MessagesPageResponse, error)
	SendMessage(ctx context.Context, conversationID, senderID uuid.UUID, req dto.SendMessageRequest) (*dto.MessageResponse, []uuid.UUID, error)
	MarkMessageDelivered(ctx context.Context, messageID, recipientID uuid.UUID) error
	MarkAsRead(ctx context.Context, conversationID, currentUserID uuid.UUID) error
	GetParticipantUserIDs(ctx context.Context, conversationID uuid.UUID) ([]uuid.UUID, error)
	IsParticipant(ctx context.Context, conversationID, userID uuid.UUID) (bool, error)
	SearchUsers(ctx context.Context, currentUserID uuid.UUID, query string, limit int) ([]dto.UserSearchResponse, error)
	EditMessage(ctx context.Context, conversationID, messageID, userID uuid.UUID, content string) (*dto.MessageResponse, []uuid.UUID, error)
	DeleteMessage(ctx context.Context, conversationID, messageID, userID uuid.UUID, forAll bool) ([]uuid.UUID, error)
	DeleteConversation(ctx context.Context, conversationID, userID uuid.UUID) error
	BlockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error
	UnblockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error
	GetBlockedUsers(ctx context.Context, blockerID uuid.UUID) ([]uuid.UUID, error)
	UpdateUserLastSeen(ctx context.Context, userID uuid.UUID) error
}

type chatService struct {
	repo      repository.ChatRepository
	r2Storage *storage.R2Client
}

func NewChatService(repo repository.ChatRepository, r2Storage *storage.R2Client) ChatService {
	return &chatService{
		repo:      repo,
		r2Storage: r2Storage,
	}
}

// resolveMediaURL converts relative storage keys into full CDN URLs
func (s *chatService) resolveMediaURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") || strings.HasPrefix(raw, "data:") {
		return raw
	}
	if s.r2Storage != nil {
		return s.r2Storage.AvatarURL(raw)
	}
	return raw
}

// CreateDirectChat finds or creates a direct conversation between two users
func (s *chatService) CreateDirectChat(ctx context.Context, currentUserID, targetUserID uuid.UUID) (*dto.ConversationResponse, error) {
	if currentUserID == targetUserID {
		return nil, repository.ErrCannotChatSelf
	}

	conv, err := s.repo.GetOrCreateDirectConversation(ctx, currentUserID, targetUserID)
	if err != nil {
		return nil, err
	}

	// Fetch conversation from user's perspective
	convs, err := s.repo.GetUserConversations(ctx, currentUserID, 50, 0)
	if err != nil {
		return nil, err
	}

	for _, c := range convs {
		if c.ID == conv.ID {
			if c.Peer != nil {
				c.Peer.AvatarURL = s.resolveMediaURL(c.Peer.AvatarURL)
				c.AvatarURL = c.Peer.AvatarURL
			}
			return &c, nil
		}
	}

	// Fallback response if just created with 0 messages
	title := ""
	if conv.Title != nil {
		title = *conv.Title
	}
	avatarURL := ""
	if conv.AvatarKey != nil {
		avatarURL = s.resolveMediaURL(*conv.AvatarKey)
	}
	return &dto.ConversationResponse{
		ID:            conv.ID,
		Type:          string(conv.Type),
		Title:         title,
		AvatarURL:     avatarURL,
		LastMessageAt: conv.LastMessageAt,
	}, nil
}

// GetUserConversations fetches user inbox items with resolved avatars
func (s *chatService) GetUserConversations(ctx context.Context, currentUserID uuid.UUID, limit, offset int) ([]dto.ConversationResponse, error) {
	convs, err := s.repo.GetUserConversations(ctx, currentUserID, limit, offset)
	if err != nil {
		return nil, err
	}

	for i := range convs {
		if convs[i].Peer != nil {
			convs[i].Peer.AvatarURL = s.resolveMediaURL(convs[i].Peer.AvatarURL)
			if convs[i].AvatarURL == "" {
				convs[i].AvatarURL = convs[i].Peer.AvatarURL
			}
		} else if convs[i].AvatarKey != "" {
			convs[i].AvatarURL = s.resolveMediaURL(convs[i].AvatarKey)
		}
	}

	return convs, nil
}

// GetMessages fetches messages using cursor-based pagination
func (s *chatService) GetMessages(ctx context.Context, conversationID, currentUserID uuid.UUID, limit int, beforeStr string) (*dto.MessagesPageResponse, error) {
	// Verify user is a participant
	isPart, err := s.repo.IsParticipant(ctx, conversationID, currentUserID)
	if err != nil {
		return nil, err
	}
	if !isPart {
		return nil, repository.ErrForbidden
	}

	var before *time.Time
	if beforeStr != "" {
		parsed, err := time.Parse(time.RFC3339Nano, beforeStr)
		if err != nil {
			// Fallback to standard RFC3339
			parsed, err = time.Parse(time.RFC3339, beforeStr)
		}
		if err == nil {
			before = &parsed
		}
	}

	if limit <= 0 || limit > 100 {
		limit = 30
	}

	// Fetch limit + 1 to determine has_more
	messages, err := s.repo.GetMessages(ctx, conversationID, currentUserID, limit+1, before)
	if err != nil {
		return nil, err
	}

	hasMore := false
	if len(messages) > limit {
		hasMore = true
		messages = messages[len(messages)-limit:]
	}

	// Resolve avatars and media URLs
	for i := range messages {
		if messages[i].Sender != nil {
			messages[i].Sender.AvatarURL = s.resolveMediaURL(messages[i].Sender.AvatarURL)
		}
		if messages[i].MediaKey != "" {
			messages[i].MediaURL = s.resolveMediaURL(messages[i].MediaKey)
		}
	}

	var nextCursor *string
	if hasMore && len(messages) > 0 {
		cursorStr := messages[0].CreatedAt.Format(time.RFC3339Nano)
		nextCursor = &cursorStr
	}

	return &dto.MessagesPageResponse{
		Messages:   messages,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}

// SendMessage validates and persists a new message in the conversation and returns recipients
func (s *chatService) SendMessage(ctx context.Context, conversationID, senderID uuid.UUID, req dto.SendMessageRequest) (*dto.MessageResponse, []uuid.UUID, error) {
	// Verify sender is participant
	isPart, err := s.repo.IsParticipant(ctx, conversationID, senderID)
	if err != nil {
		return nil, nil, err
	}
	if !isPart {
		return nil, nil, repository.ErrForbidden
	}

	content := strings.TrimSpace(req.Content)
	if content == "" && req.MediaKey == "" {
		return nil, nil, ErrEmptyMessage
	}

	msgType := model.MessageType(req.MessageType)
	if msgType == "" {
		if req.MediaKey != "" {
			msgType = model.MessageTypeImage
		} else {
			msgType = model.MessageTypeText
		}
	}
	switch msgType {
	case model.MessageTypeText, model.MessageTypeImage, model.MessageTypeVideo,
		model.MessageTypeFile, model.MessageTypeAudio, model.MessageTypeSystem:
	default:
		return nil, nil, ErrInvalidMessageType
	}

	var contentPtr *string
	if content != "" {
		contentPtr = &content
	}

	var mediaKeyPtr *string
	if req.MediaKey != "" {
		mediaKeyPtr = &req.MediaKey
	}

	var mediaMimePtr *string
	if req.MediaMimeType != "" {
		mediaMimePtr = &req.MediaMimeType
	}

	msgModel := &model.Message{
		ConversationID:         conversationID,
		SenderID:               senderID,
		Content:                contentPtr,
		MessageType:            msgType,
		MediaKey:               mediaKeyPtr,
		MediaMimeType:          mediaMimePtr,
		MediaSizeBytes:         req.MediaSizeBytes,
		ReplyToID:              req.ReplyToID,
		ForwardedFromMessageID: req.ForwardedFromMessageID,
	}

	created, recipientIDs, err := s.repo.CreateMessage(ctx, msgModel)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to save message: %w", err)
	}

	if created.Sender != nil {
		created.Sender.AvatarURL = s.resolveMediaURL(created.Sender.AvatarURL)
	}
	if created.MediaKey != "" {
		created.MediaURL = s.resolveMediaURL(created.MediaKey)
	}

	return created, recipientIDs, nil
}

// MarkMessageDelivered sets delivered_at for a message receipt
func (s *chatService) MarkMessageDelivered(ctx context.Context, messageID, recipientID uuid.UUID) error {
	return s.repo.MarkMessageDelivered(ctx, messageID, recipientID)
}

// MarkAsRead marks all unread incoming messages as read
func (s *chatService) MarkAsRead(ctx context.Context, conversationID, currentUserID uuid.UUID) error {
	isPart, err := s.repo.IsParticipant(ctx, conversationID, currentUserID)
	if err != nil {
		return err
	}
	if !isPart {
		return repository.ErrForbidden
	}

	return s.repo.MarkConversationAsRead(ctx, conversationID, currentUserID)
}

// GetParticipantUserIDs retrieves participant user IDs for broadcast
func (s *chatService) GetParticipantUserIDs(ctx context.Context, conversationID uuid.UUID) ([]uuid.UUID, error) {
	return s.repo.GetParticipantUserIDs(ctx, conversationID)
}

// IsParticipant verifies if a user belongs to a conversation
func (s *chatService) IsParticipant(ctx context.Context, conversationID, userID uuid.UUID) (bool, error) {
	return s.repo.IsParticipant(ctx, conversationID, userID)
}

// SearchUsers searches students/users and resolves their avatar URLs
func (s *chatService) SearchUsers(ctx context.Context, currentUserID uuid.UUID, query string, limit int) ([]dto.UserSearchResponse, error) {
	users, err := s.repo.SearchUsers(ctx, currentUserID, query, limit)
	if err != nil {
		return nil, err
	}

	for i := range users {
		if users[i].AvatarURL != "" {
			users[i].AvatarURL = s.resolveMediaURL(users[i].AvatarURL)
		}
	}

	return users, nil
}

// EditMessage updates message content and returns the updated message with participant IDs
func (s *chatService) EditMessage(ctx context.Context, conversationID, messageID, userID uuid.UUID, content string) (*dto.MessageResponse, []uuid.UUID, error) {
	content = strings.TrimSpace(content)
	if content == "" {
		return nil, nil, ErrEmptyMessage
	}

	msg, partIDs, err := s.repo.UpdateMessageContent(ctx, conversationID, messageID, userID, content)
	if err != nil {
		return nil, nil, err
	}

	if msg.Sender != nil {
		msg.Sender.AvatarURL = s.resolveMediaURL(msg.Sender.AvatarURL)
	}
	if msg.MediaKey != "" {
		msg.MediaURL = s.resolveMediaURL(msg.MediaKey)
	}

	return msg, partIDs, nil
}

// DeleteMessage delegates scope-aware deletion to the repository layer
func (s *chatService) DeleteMessage(ctx context.Context, conversationID, messageID, userID uuid.UUID, forAll bool) ([]uuid.UUID, error) {
	return s.repo.DeleteMessage(ctx, conversationID, messageID, userID, forAll)
}

// DeleteConversation hides / leaves the conversation for the user
func (s *chatService) DeleteConversation(ctx context.Context, conversationID, userID uuid.UUID) error {
	return s.repo.DeleteConversation(ctx, conversationID, userID)
}

// BlockUser blocks target user
func (s *chatService) BlockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error {
	return s.repo.BlockUser(ctx, blockerID, blockedID)
}

// UnblockUser unblocks target user
func (s *chatService) UnblockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error {
	return s.repo.UnblockUser(ctx, blockerID, blockedID)
}

// GetBlockedUsers returns list of blocked user IDs
func (s *chatService) GetBlockedUsers(ctx context.Context, blockerID uuid.UUID) ([]uuid.UUID, error) {
	return s.repo.GetBlockedUserIDs(ctx, blockerID)
}

// UpdateUserLastSeen updates user's last_login_at timestamp in database
func (s *chatService) UpdateUserLastSeen(ctx context.Context, userID uuid.UUID) error {
	return s.repo.UpdateUserLastSeen(ctx, userID)
}
