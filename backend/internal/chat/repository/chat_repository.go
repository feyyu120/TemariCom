package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"TemariCom/internal/chat/dto"
	"TemariCom/internal/chat/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound       = errors.New("chat resource not found")
	ErrForbidden      = errors.New("not a participant in this conversation")
	ErrDuplicateChat  = errors.New("conversation already exists")
	ErrCannotChatSelf = errors.New("cannot create direct chat with yourself")
	ErrUserBlocked    = errors.New("cannot send message: user is blocked")
)

type ChatRepository interface {
	GetOrCreateDirectConversation(ctx context.Context, user1ID, user2ID uuid.UUID) (*model.Conversation, error)
	GetOrCreateSavedConversation(ctx context.Context, userID uuid.UUID) (*dto.ConversationResponse, error)
	GetUserConversations(ctx context.Context, userID uuid.UUID, limit, offset int) ([]dto.ConversationResponse, error)
	GetConversationByID(ctx context.Context, conversationID, userID uuid.UUID) (*model.Conversation, error)
	DeleteConversation(ctx context.Context, conversationID, userID uuid.UUID) error
	GetMessages(ctx context.Context, conversationID, currentUserID uuid.UUID, limit int, before *time.Time) ([]dto.MessageResponse, error)
	CreateMessage(ctx context.Context, msg *model.Message) (*dto.MessageResponse, []uuid.UUID, error)
	MarkMessageDelivered(ctx context.Context, messageID, userID uuid.UUID) error
	MarkConversationAsRead(ctx context.Context, conversationID, userID uuid.UUID) error
	GetParticipantUserIDs(ctx context.Context, conversationID uuid.UUID) ([]uuid.UUID, error)
	IsParticipant(ctx context.Context, conversationID, userID uuid.UUID) (bool, error)
	SearchUsers(ctx context.Context, currentUserID uuid.UUID, query string, limit int) ([]dto.UserSearchResponse, error)
	UpdateMessageContent(ctx context.Context, conversationID, messageID, userID uuid.UUID, newContent string) (*dto.MessageResponse, []uuid.UUID, error)
	DeleteMessage(ctx context.Context, conversationID, messageID, userID uuid.UUID, forAll bool) ([]uuid.UUID, error)
	BlockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error
	UnblockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error
	IsUserBlocked(ctx context.Context, user1ID, user2ID uuid.UUID) (bool, error)
	GetBlockedUserIDs(ctx context.Context, blockerID uuid.UUID) ([]uuid.UUID, error)
}

type pgChatRepository struct {
	db *pgxpool.Pool
}

func NewChatRepository(db *pgxpool.Pool) ChatRepository {
	// Ensure user_blocks table exists on repository startup
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		createTableQuery := `
			CREATE TABLE IF NOT EXISTS user_blocks (
				blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				PRIMARY KEY (blocker_id, blocked_id)
			);
			CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
			CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
		`
		_, _ = db.Exec(ctx, createTableQuery)
	}()

	return &pgChatRepository{db: db}
}

// GetOrCreateDirectConversation finds an existing 1-on-1 chat or atomically creates one with race-condition protection
func (r *pgChatRepository) GetOrCreateDirectConversation(ctx context.Context, user1ID, user2ID uuid.UUID) (*model.Conversation, error) {
	if user1ID == user2ID {
		return nil, ErrCannotChatSelf
	}

	// 1. Check if direct chat already exists
	findQuery := `
		SELECT c.id, c.type, c.title, c.avatar_key, c.created_by,
		       c.last_message_id, c.last_message_preview, c.last_message_at,
		       c.created_at, c.updated_at
		FROM conversations c
		JOIN conversation_participants p1 ON c.id = p1.conversation_id AND p1.user_id = $1 AND p1.left_at IS NULL
		JOIN conversation_participants p2 ON c.id = p2.conversation_id AND p2.user_id = $2 AND p2.left_at IS NULL
		WHERE c.type = 'direct'
		LIMIT 1;
	`

	var conv model.Conversation
	err := r.db.QueryRow(ctx, findQuery, user1ID, user2ID).Scan(
		&conv.ID, &conv.Type, &conv.Title, &conv.AvatarKey, &conv.CreatedBy,
		&conv.LastMessageID, &conv.LastMessagePreview, &conv.LastMessageAt,
		&conv.CreatedAt, &conv.UpdatedAt,
	)
	if err == nil {
		return &conv, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("failed to query existing direct conversation: %w", err)
	}

	// 2. Deterministic lock ordering to avoid deadlocks in concurrent creations
	firstUser, secondUser := user1ID, user2ID
	if firstUser.String() > secondUser.String() {
		firstUser, secondUser = secondUser, firstUser
	}

	// 3. Atomically create new direct conversation in transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Re-check within transaction under lock
	err = tx.QueryRow(ctx, findQuery, user1ID, user2ID).Scan(
		&conv.ID, &conv.Type, &conv.Title, &conv.AvatarKey, &conv.CreatedBy,
		&conv.LastMessageID, &conv.LastMessagePreview, &conv.LastMessageAt,
		&conv.CreatedAt, &conv.UpdatedAt,
	)
	if err == nil {
		_ = tx.Commit(ctx)
		return &conv, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("failed to verify direct conversation in tx: %w", err)
	}

	insertConvQuery := `
		INSERT INTO conversations (type, created_by, last_message_at, created_at, updated_at)
		VALUES ('direct', $1, NOW(), NOW(), NOW())
		RETURNING id, type, title, avatar_key, created_by, last_message_id, last_message_preview, last_message_at, created_at, updated_at;
	`
	err = tx.QueryRow(ctx, insertConvQuery, user1ID).Scan(
		&conv.ID, &conv.Type, &conv.Title, &conv.AvatarKey, &conv.CreatedBy,
		&conv.LastMessageID, &conv.LastMessagePreview, &conv.LastMessageAt,
		&conv.CreatedAt, &conv.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create conversation: %w", err)
	}

	// Add both participants in deterministic order
	insertParticipantsQuery := `
		INSERT INTO conversation_participants (conversation_id, user_id, role, last_read_at, joined_at)
		VALUES 
			($1, $2, 'member', NOW(), NOW()),
			($1, $3, 'member', NOW(), NOW());
	`
	_, err = tx.Exec(ctx, insertParticipantsQuery, conv.ID, firstUser, secondUser)
	if err != nil {
		return nil, fmt.Errorf("failed to insert participants: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return &conv, nil
}

// GetUserConversations fetches user inbox items with unread count and peer profiles
func (r *pgChatRepository) GetUserConversations(ctx context.Context, userID uuid.UUID, limit, offset int) ([]dto.ConversationResponse, error) {
	if limit <= 0 || limit > 100 {
		limit = 30
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT 
			c.id, c.type, COALESCE(c.title, ''), COALESCE(c.avatar_key, ''),
			COALESCE(c.last_message_preview, ''), c.last_message_at,
			cp.is_muted, cp.is_pinned,
			COALESCE(unread.count, 0) AS unread_count,
			peer.id, COALESCE(peer.full_name, ''), COALESCE(peer.username, ''), COALESCE(peer.avatar_key, ''), peer.last_login_at,
			COALESCE(blk.is_blocked, FALSE) AS is_blocked
		FROM conversation_participants cp
		JOIN conversations c ON cp.conversation_id = c.id
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::INT AS count
			FROM messages m
			WHERE m.conversation_id = c.id
			  AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
			  AND m.sender_id != $1
			  AND m.deleted_at IS NULL
			  AND NOT EXISTS (
			        SELECT 1 FROM message_deletions mdi
			        WHERE mdi.message_id = m.id AND mdi.user_id = $1
			  )
		) unread ON true
		LEFT JOIN LATERAL (
			SELECT u.id, u.full_name, u.username, u.avatar_key, u.last_login_at
			FROM conversation_participants p_other
			JOIN users u ON p_other.user_id = u.id
			WHERE p_other.conversation_id = c.id
			  AND p_other.user_id != $1
			LIMIT 1
		) peer ON c.type = 'direct'
		LEFT JOIN LATERAL (
			SELECT EXISTS (
				SELECT 1 FROM user_blocks ub
				WHERE (ub.blocker_id = $1 AND ub.blocked_id = peer.id)
				   OR (ub.blocker_id = peer.id AND ub.blocked_id = $1)
			) AS is_blocked
		) blk ON peer.id IS NOT NULL
		WHERE cp.user_id = $1
		  AND cp.left_at IS NULL
		ORDER BY cp.is_pinned DESC, c.last_message_at DESC NULLS LAST
		LIMIT $2 OFFSET $3;
	`

	rows, err := r.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user conversations: %w", err)
	}
	defer rows.Close()

	var result []dto.ConversationResponse
	for rows.Next() {
		var item dto.ConversationResponse
		var peerID *uuid.UUID
		var peerFullName, peerUsername, peerAvatar string
		var peerLastLoginAt *time.Time
		var isBlocked bool

		err := rows.Scan(
			&item.ID, &item.Type, &item.Title, &item.AvatarKey,
			&item.LastMessagePreview, &item.LastMessageAt,
			&item.IsMuted, &item.IsPinned,
			&item.UnreadCount,
			&peerID, &peerFullName, &peerUsername, &peerAvatar, &peerLastLoginAt,
			&isBlocked,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan conversation row: %w", err)
		}

		if peerID == nil || item.Title == "Saved Messages" {
			item.Title = "Saved Messages"
			item.IsSavedMessages = true
			item.IsPinned = true
		} else if *peerID != uuid.Nil {
			item.Peer = &dto.UserSummaryDTO{
				ID:         *peerID,
				FullName:   peerFullName,
				Username:   peerUsername,
				AvatarURL:  peerAvatar,
				LastSeenAt: peerLastLoginAt,
				IsBlocked:  isBlocked,
			}
			item.IsBlocked = isBlocked
			if item.Title == "" {
				if peerFullName != "" {
					item.Title = peerFullName
				} else {
					item.Title = peerUsername
				}
			}
		}

		result = append(result, item)
	}

	if result == nil {
		result = []dto.ConversationResponse{}
	}

	return result, nil
}

// GetConversationByID returns conversation if user is a participant
func (r *pgChatRepository) GetConversationByID(ctx context.Context, conversationID, userID uuid.UUID) (*model.Conversation, error) {
	query := `
		SELECT c.id, c.type, c.title, c.avatar_key, c.created_by,
		       c.last_message_id, c.last_message_preview, c.last_message_at,
		       c.created_at, c.updated_at
		FROM conversations c
		JOIN conversation_participants cp ON c.id = cp.conversation_id
		WHERE c.id = $1 AND cp.user_id = $2 AND cp.left_at IS NULL
		LIMIT 1;
	`

	var conv model.Conversation
	err := r.db.QueryRow(ctx, query, conversationID, userID).Scan(
		&conv.ID, &conv.Type, &conv.Title, &conv.AvatarKey, &conv.CreatedBy,
		&conv.LastMessageID, &conv.LastMessagePreview, &conv.LastMessageAt,
		&conv.CreatedAt, &conv.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrForbidden
		}
		return nil, fmt.Errorf("failed to get conversation: %w", err)
	}

	return &conv, nil
}

// GetMessages retrieves messages using cursor pagination (created_at < before) with receipt status
func (r *pgChatRepository) GetMessages(ctx context.Context, conversationID, currentUserID uuid.UUID, limit int, before *time.Time) ([]dto.MessageResponse, error) {
	if limit <= 0 || limit > 100 {
		limit = 30
	}

	query := `
		SELECT 
			m.id, m.conversation_id, m.sender_id, COALESCE(m.content, ''),
			m.message_type, COALESCE(m.media_key, ''), COALESCE(m.media_mime_type, ''), m.media_size_bytes,
			m.reply_to_id, m.forwarded_from_message_id,
			m.created_at, m.edited_at,
			u.id, COALESCE(u.full_name, ''), COALESCE(u.username, ''), COALESCE(u.avatar_key, ''),
			COALESCE(deliv.is_delivered, false) AS is_delivered,
			COALESCE(read_rcpt.is_read, false) AS is_read,
			COALESCE(rm.content, '') AS reply_to_content,
			COALESCE(ru.full_name, ru.username, '') AS reply_to_sender_name,
			COALESCE(fm.content, '') AS forwarded_from_content,
			COALESCE(fu.full_name, fu.username, '') AS forwarded_from_name
		FROM messages m
		JOIN users u ON m.sender_id = u.id
		LEFT JOIN LATERAL (
			SELECT TRUE AS is_delivered
			FROM message_receipts mr
			WHERE mr.message_id = m.id AND mr.delivered_at IS NOT NULL
			LIMIT 1
		) deliv ON true
		LEFT JOIN LATERAL (
			SELECT TRUE AS is_read
			FROM message_receipts mr
			WHERE mr.message_id = m.id AND mr.read_at IS NOT NULL
			LIMIT 1
		) read_rcpt ON true
		LEFT JOIN messages rm ON m.reply_to_id = rm.id
		LEFT JOIN users ru ON rm.sender_id = ru.id
		LEFT JOIN messages fm ON m.forwarded_from_message_id = fm.id
		LEFT JOIN users fu ON fm.sender_id = fu.id
		WHERE m.conversation_id = $1
		  AND m.deleted_at IS NULL
		  AND ($2::timestamptz IS NULL OR m.created_at < $2)
		  AND NOT EXISTS (
		        SELECT 1 FROM message_deletions md
		        WHERE md.message_id = m.id AND md.user_id = $3
		  )
		ORDER BY m.created_at DESC
		LIMIT $4;
	`

	rows, err := r.db.Query(ctx, query, conversationID, before, currentUserID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch messages: %w", err)
	}
	defer rows.Close()

	var messages []dto.MessageResponse
	for rows.Next() {
		var m dto.MessageResponse
		var sender dto.UserSummaryDTO
		var msgType string

		err := rows.Scan(
			&m.ID, &m.ConversationID, &m.SenderID, &m.Content,
			&msgType, &m.MediaKey, &m.MediaMimeType, &m.MediaSizeBytes,
			&m.ReplyToID, &m.ForwardedFromMessageID,
			&m.CreatedAt, &m.EditedAt,
			&sender.ID, &sender.FullName, &sender.Username, &sender.AvatarURL,
			&m.IsDelivered, &m.IsRead,
			&m.ReplyToContent, &m.ReplyToSenderName,
			&m.ForwardedFromContent, &m.ForwardedFromName,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan message row: %w", err)
		}

		m.MessageType = msgType
		m.Sender = &sender
		messages = append(messages, m)
	}

	if messages == nil {
		messages = []dto.MessageResponse{}
	}

	// Reverse to deliver in chronological order (oldest -> newest)
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}

// CreateMessage creates a message record, updates conversation metadata, and returns recipient user IDs
func (r *pgChatRepository) CreateMessage(ctx context.Context, msg *model.Message) (*dto.MessageResponse, []uuid.UUID, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Verify sender is participant
	var isMember bool
	checkQuery := `
		SELECT EXISTS(
			SELECT 1 FROM conversation_participants 
			WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL
		);
	`
	if err := tx.QueryRow(ctx, checkQuery, msg.ConversationID, msg.SenderID).Scan(&isMember); err != nil {
		return nil, nil, fmt.Errorf("failed to check participant status: %w", err)
	}
	if !isMember {
		return nil, nil, ErrForbidden
	}

	insertMsgQuery := `
		INSERT INTO messages (
			conversation_id, sender_id, content, message_type,
			media_key, media_mime_type, media_size_bytes,
			reply_to_id, forwarded_from_message_id, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
		RETURNING id, created_at, updated_at;
	`
	err = tx.QueryRow(
		ctx, insertMsgQuery,
		msg.ConversationID, msg.SenderID, msg.Content, msg.MessageType,
		msg.MediaKey, msg.MediaMimeType, msg.MediaSizeBytes,
		msg.ReplyToID, msg.ForwardedFromMessageID,
	).Scan(&msg.ID, &msg.CreatedAt, &msg.UpdatedAt)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to insert message: %w", err)
	}

	// Determine preview text for inbox
	preview := ""
	if msg.Content != nil && *msg.Content != "" {
		preview = *msg.Content
		if len(preview) > 100 {
			preview = preview[:97] + "..."
		}
	} else if msg.MediaKey != nil {
		preview = fmt.Sprintf("[%s message]", msg.MessageType)
	}

	// Update conversation's last message info
	updateConvQuery := `
		UPDATE conversations
		SET last_message_id = $1,
		    last_message_preview = $2,
		    last_message_at = $3,
		    updated_at = NOW()
		WHERE id = $4;
	`
	_, err = tx.Exec(ctx, updateConvQuery, msg.ID, preview, msg.CreatedAt, msg.ConversationID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to update conversation last message: %w", err)
	}

	// Update sender's last_read_at
	updateReadQuery := `
		UPDATE conversation_participants
		SET last_read_at = $1
		WHERE conversation_id = $2 AND user_id = $3;
	`
	_, err = tx.Exec(ctx, updateReadQuery, msg.CreatedAt, msg.ConversationID, msg.SenderID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to update sender last_read_at: %w", err)
	}

	// Fetch all other participant IDs in the conversation
	partQuery := `
		SELECT user_id
		FROM conversation_participants
		WHERE conversation_id = $1 AND user_id != $2 AND left_at IS NULL;
	`
	rows, err := tx.Query(ctx, partQuery, msg.ConversationID, msg.SenderID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to query participants: %w", err)
	}
	defer rows.Close()

	var recipientIDs []uuid.UUID
	for rows.Next() {
		var uid uuid.UUID
		if err := rows.Scan(&uid); err != nil {
			return nil, nil, err
		}
		recipientIDs = append(recipientIDs, uid)
	}
	rows.Close()

	// Verify neither party has blocked the other
	for _, recID := range recipientIDs {
		blocked, _ := r.IsUserBlocked(ctx, msg.SenderID, recID)
		if blocked {
			return nil, nil, ErrUserBlocked
		}
	}

	// Pre-insert receipt records for other participants
	if len(recipientIDs) > 0 {
		receiptQuery := `
			INSERT INTO message_receipts (message_id, user_id)
			VALUES ($1, $2)
			ON CONFLICT (message_id, user_id) DO NOTHING;
		`
		for _, recipientID := range recipientIDs {
			_, err = tx.Exec(ctx, receiptQuery, msg.ID, recipientID)
			if err != nil {
				return nil, nil, fmt.Errorf("failed to insert message receipt: %w", err)
			}
		}
	}

	// Fetch sender details
	var sender dto.UserSummaryDTO
	fetchSenderQuery := `
		SELECT id, COALESCE(full_name, ''), COALESCE(username, ''), COALESCE(avatar_key, '')
		FROM users
		WHERE id = $1;
	`
	err = tx.QueryRow(ctx, fetchSenderQuery, msg.SenderID).Scan(
		&sender.ID, &sender.FullName, &sender.Username, &sender.AvatarURL,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch sender info: %w", err)
	}

	replyToContent := ""
	replyToSenderName := ""
	forwardedFromContent := ""
	forwardedFromName := ""

	if msg.ReplyToID != nil || msg.ForwardedFromMessageID != nil {
		fetchRefQuery := `
			SELECT 
				COALESCE(rm.content, ''),
				COALESCE(ru.full_name, ru.username, ''),
				COALESCE(fm.content, ''),
				COALESCE(fu.full_name, fu.username, '')
			FROM (SELECT $1::uuid AS rep_id, $2::uuid AS fwd_id) p
			LEFT JOIN messages rm ON p.rep_id = rm.id
			LEFT JOIN users ru ON rm.sender_id = ru.id
			LEFT JOIN messages fm ON p.fwd_id = fm.id
			LEFT JOIN users fu ON fm.sender_id = fu.id;
		`
		_ = tx.QueryRow(ctx, fetchRefQuery, msg.ReplyToID, msg.ForwardedFromMessageID).Scan(
			&replyToContent, &replyToSenderName, &forwardedFromContent, &forwardedFromName,
		)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, fmt.Errorf("failed to commit message creation: %w", err)
	}

	contentStr := ""
	if msg.Content != nil {
		contentStr = *msg.Content
	}
	mediaKeyStr := ""
	if msg.MediaKey != nil {
		mediaKeyStr = *msg.MediaKey
	}
	mediaMimeStr := ""
	if msg.MediaMimeType != nil {
		mediaMimeStr = *msg.MediaMimeType
	}

	response := &dto.MessageResponse{
		ID:                     msg.ID,
		ConversationID:         msg.ConversationID,
		SenderID:               msg.SenderID,
		Sender:                 &sender,
		Content:                contentStr,
		MessageType:            string(msg.MessageType),
		MediaKey:               mediaKeyStr,
		MediaMimeType:          mediaMimeStr,
		MediaSizeBytes:         msg.MediaSizeBytes,
		ReplyToID:              msg.ReplyToID,
		ReplyToContent:         replyToContent,
		ReplyToSenderName:      replyToSenderName,
		ForwardedFromMessageID: msg.ForwardedFromMessageID,
		ForwardedFromContent:   forwardedFromContent,
		ForwardedFromName:      forwardedFromName,
		IsDelivered:            false,
		IsRead:                 false,
		CreatedAt:              msg.CreatedAt,
	}

	return response, recipientIDs, nil
}

// MarkMessageDelivered sets delivered_at timestamp for message recipient
func (r *pgChatRepository) MarkMessageDelivered(ctx context.Context, messageID, userID uuid.UUID) error {
	query := `
		INSERT INTO message_receipts (message_id, user_id, delivered_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (message_id, user_id) 
		DO UPDATE SET delivered_at = COALESCE(message_receipts.delivered_at, EXCLUDED.delivered_at);
	`
	_, err := r.db.Exec(ctx, query, messageID, userID)
	return err
}

// MarkConversationAsRead marks all unread incoming messages as read and updates participant read timestamp
func (r *pgChatRepository) MarkConversationAsRead(ctx context.Context, conversationID, userID uuid.UUID) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to start read transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Verify participant
	var isMember bool
	checkQuery := `
		SELECT EXISTS(
			SELECT 1 FROM conversation_participants 
			WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL
		);
	`
	if err := tx.QueryRow(ctx, checkQuery, conversationID, userID).Scan(&isMember); err != nil {
		return fmt.Errorf("failed to check participant status: %w", err)
	}
	if !isMember {
		return ErrForbidden
	}

	// Update participant's last_read_at
	updatePartQuery := `
		UPDATE conversation_participants
		SET last_read_at = NOW()
		WHERE conversation_id = $1 AND user_id = $2;
	`
	if _, err := tx.Exec(ctx, updatePartQuery, conversationID, userID); err != nil {
		return fmt.Errorf("failed to update participant last_read_at: %w", err)
	}

	// Update all unread receipts for this user in this conversation
	updateReceiptsQuery := `
		UPDATE message_receipts mr
		SET read_at = NOW()
		FROM messages m
		WHERE mr.message_id = m.id
		  AND m.conversation_id = $1
		  AND mr.user_id = $2
		  AND mr.read_at IS NULL;
	`
	if _, err := tx.Exec(ctx, updateReceiptsQuery, conversationID, userID); err != nil {
		return fmt.Errorf("failed to update message receipts: %w", err)
	}

	return tx.Commit(ctx)
}

// GetParticipantUserIDs returns all active participant user IDs in a conversation
func (r *pgChatRepository) GetParticipantUserIDs(ctx context.Context, conversationID uuid.UUID) ([]uuid.UUID, error) {
	query := `
		SELECT user_id
		FROM conversation_participants
		WHERE conversation_id = $1 AND left_at IS NULL;
	`
	rows, err := r.db.Query(ctx, query, conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to query participant IDs: %w", err)
	}
	defer rows.Close()

	var userIDs []uuid.UUID
	for rows.Next() {
		var uid uuid.UUID
		if err := rows.Scan(&uid); err != nil {
			return nil, err
		}
		userIDs = append(userIDs, uid)
	}

	if userIDs == nil {
		userIDs = []uuid.UUID{}
	}

	return userIDs, nil
}

// IsParticipant checks if a user is currently an active participant in a conversation
func (r *pgChatRepository) IsParticipant(ctx context.Context, conversationID, userID uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM conversation_participants
			WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL
		);
	`
	var exists bool
	err := r.db.QueryRow(ctx, query, conversationID, userID).Scan(&exists)
	return exists, err
}

// SearchUsers searches for students/users by username or full name excluding current user
func (r *pgChatRepository) SearchUsers(ctx context.Context, currentUserID uuid.UUID, query string, limit int) ([]dto.UserSearchResponse, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	cleanQuery := strings.TrimPrefix(strings.TrimSpace(query), "@")
	if cleanQuery == "" {
		return []dto.UserSearchResponse{}, nil
	}

	sqlQuery := `
		SELECT
			u.id,
			COALESCE(NULLIF(u.username, ''), split_part(u.email, '@', 1)) AS username,
			COALESCE(NULLIF(u.full_name, ''), split_part(u.email, '@', 1)) AS full_name,
			COALESCE(u.email, ''),
			COALESCE(u.avatar_key, '')
		FROM users u
		WHERE (
		        COALESCE(u.username, '') ILIKE $1
		        OR COALESCE(u.full_name, '') ILIKE $1
		        OR COALESCE(u.email, '') ILIKE $1
		        OR split_part(u.email, '@', 1) ILIKE $1
		  )
		ORDER BY 
			(CASE 
				WHEN LOWER(COALESCE(u.email, '')) = LOWER($2) THEN 0
				WHEN LOWER(COALESCE(u.username, '')) = LOWER($2) THEN 1 
				WHEN LOWER(COALESCE(u.full_name, '')) = LOWER($2) THEN 2
				WHEN u.id = $3 THEN 4
				ELSE 3 
			END),
			u.username ASC
		LIMIT $4;
	`

	pattern := "%" + cleanQuery + "%"
	rows, err := r.db.Query(ctx, sqlQuery, pattern, cleanQuery, currentUserID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search users: %w", err)
	}
	defer rows.Close()

	var users []dto.UserSearchResponse
	for rows.Next() {
		var u dto.UserSearchResponse
		if err := rows.Scan(&u.ID, &u.Username, &u.FullName, &u.Email, &u.AvatarURL); err != nil {
			return nil, err
		}
		users = append(users, u)
	}

	if users == nil {
		users = []dto.UserSearchResponse{}
	}

	return users, nil
}

// UpdateMessageContent updates message text content and sets edited_at = NOW()
func (r *pgChatRepository) UpdateMessageContent(ctx context.Context, conversationID, messageID, userID uuid.UUID, newContent string) (*dto.MessageResponse, []uuid.UUID, error) {
	isPart, err := r.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to verify participant status: %w", err)
	}
	if !isPart {
		return nil, nil, ErrForbidden
	}

	// Verify message exists and belongs to caller
	var senderID uuid.UUID
	checkQuery := `SELECT sender_id FROM messages WHERE id = $1 AND conversation_id = $2 AND deleted_at IS NULL;`
	err = r.db.QueryRow(ctx, checkQuery, messageID, conversationID).Scan(&senderID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, ErrNotFound
		}
		return nil, nil, fmt.Errorf("failed to check message: %w", err)
	}
	if senderID != userID {
		return nil, nil, ErrForbidden
	}

	updateQuery := `
		UPDATE messages
		SET content = $1,
		    edited_at = NOW(),
		    updated_at = NOW()
		WHERE id = $2 AND conversation_id = $3 AND sender_id = $4 AND deleted_at IS NULL
		RETURNING id, conversation_id, sender_id, content, message_type,
		          COALESCE(media_key, ''), COALESCE(media_mime_type, ''), media_size_bytes,
		          reply_to_id, forwarded_from_message_id, created_at, edited_at;
	`

	var m dto.MessageResponse
	var msgType string
	err = r.db.QueryRow(ctx, updateQuery, newContent, messageID, conversationID, userID).Scan(
		&m.ID, &m.ConversationID, &m.SenderID, &m.Content, &msgType,
		&m.MediaKey, &m.MediaMimeType, &m.MediaSizeBytes,
		&m.ReplyToID, &m.ForwardedFromMessageID, &m.CreatedAt, &m.EditedAt,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to update message: %w", err)
	}
	m.MessageType = msgType

	// Update conversation preview if this was the last message
	updateConvPreviewQuery := `
		UPDATE conversations
		SET last_message_preview = $1,
		    updated_at = NOW()
		WHERE id = $2 AND last_message_id = $3;
	`
	preview := newContent
	if len(preview) > 100 {
		preview = preview[:97] + "..."
	}
	_, _ = r.db.Exec(ctx, updateConvPreviewQuery, preview, conversationID, messageID)

	// Fetch sender profile
	var sender dto.UserSummaryDTO
	fetchSenderQuery := `
		SELECT id, COALESCE(full_name, ''), COALESCE(username, ''), COALESCE(avatar_key, '')
		FROM users
		WHERE id = $1;
	`
	if err := r.db.QueryRow(ctx, fetchSenderQuery, m.SenderID).Scan(
		&sender.ID, &sender.FullName, &sender.Username, &sender.AvatarURL,
	); err == nil {
		m.Sender = &sender
	}

	// Fetch reply & forward details if present
	if m.ReplyToID != nil || m.ForwardedFromMessageID != nil {
		fetchRefQuery := `
			SELECT 
				COALESCE(rm.content, ''),
				COALESCE(ru.full_name, ru.username, ''),
				COALESCE(fm.content, ''),
				COALESCE(fu.full_name, fu.username, '')
			FROM (SELECT $1::uuid AS rep_id, $2::uuid AS fwd_id) p
			LEFT JOIN messages rm ON p.rep_id = rm.id
			LEFT JOIN users ru ON rm.sender_id = ru.id
			LEFT JOIN messages fm ON p.fwd_id = fm.id
			LEFT JOIN users fu ON fm.sender_id = fu.id;
		`
		_ = r.db.QueryRow(ctx, fetchRefQuery, m.ReplyToID, m.ForwardedFromMessageID).Scan(
			&m.ReplyToContent, &m.ReplyToSenderName, &m.ForwardedFromContent, &m.ForwardedFromName,
		)
	}

	// Fetch participant user IDs to broadcast update
	partIDs, _ := r.GetParticipantUserIDs(ctx, conversationID)
	return &m, partIDs, nil
}

// DeleteMessage removes a message with scope control:
//   - forAll=true: Soft-deletes from the messages table (sender only). Notified to all participants.
//   - forAll=false: Inserts into message_deletions so the message is hidden only for this user.
func (r *pgChatRepository) DeleteMessage(ctx context.Context, conversationID, messageID, userID uuid.UUID, forAll bool) ([]uuid.UUID, error) {
	isPart, err := r.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify participant status: %w", err)
	}
	if !isPart {
		return nil, ErrForbidden
	}

	// Verify message exists in this conversation
	var senderID uuid.UUID
	checkQuery := `SELECT sender_id FROM messages WHERE id = $1 AND conversation_id = $2 AND deleted_at IS NULL;`
	err = r.db.QueryRow(ctx, checkQuery, messageID, conversationID).Scan(&senderID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to query message: %w", err)
	}

	if forAll {
		// Only the original sender may delete for everyone
		if senderID != userID {
			return nil, ErrForbidden
		}

		query := `
			UPDATE messages
			SET deleted_at = NOW(),
			    updated_at = NOW()
			WHERE id = $1 AND conversation_id = $2 AND sender_id = $3 AND deleted_at IS NULL;
		`
		cmd, err := r.db.Exec(ctx, query, messageID, conversationID, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to delete message for everyone: %w", err)
		}
		if cmd.RowsAffected() == 0 {
			return nil, ErrNotFound
		}

		// Update conversation preview if this was the last message
		updateLastQuery := `
			UPDATE conversations
			SET last_message_preview = COALESCE(
			    (SELECT COALESCE(content, '[' || message_type || ' message]')
			     FROM messages
			     WHERE conversation_id = $1 AND deleted_at IS NULL
			     ORDER BY created_at DESC LIMIT 1),
			    ''
			),
			updated_at = NOW()
			WHERE id = $1 AND last_message_id = $2;
		`
		_, _ = r.db.Exec(ctx, updateLastQuery, conversationID, messageID)
	} else {
		// Delete for me only — insert hidden record into message_deletions
		insertQuery := `
			INSERT INTO message_deletions (message_id, user_id)
			VALUES ($1, $2)
			ON CONFLICT (message_id, user_id) DO NOTHING;
		`
		if _, err := r.db.Exec(ctx, insertQuery, messageID, userID); err != nil {
			return nil, fmt.Errorf("failed to hide message for user: %w", err)
		}
	}

	partIDs, _ := r.GetParticipantUserIDs(ctx, conversationID)
	return partIDs, nil
}

// GetOrCreateSavedConversation returns or creates the user's private Telegram-style Saved Messages conversation
func (r *pgChatRepository) GetOrCreateSavedConversation(ctx context.Context, userID uuid.UUID) (*dto.ConversationResponse, error) {
	// 1. Check if user already has a saved messages conversation
	findQuery := `
		SELECT c.id, c.type, COALESCE(c.title, 'Saved Messages'), COALESCE(c.avatar_key, ''),
		       COALESCE(c.last_message_preview, ''), c.last_message_at,
		       cp.is_muted, cp.is_pinned,
		       COALESCE(unread.count, 0) AS unread_count
		FROM conversations c
		JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = $1 AND cp.left_at IS NULL
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::INT AS count
			FROM messages m
			WHERE m.conversation_id = c.id
			  AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
			  AND m.sender_id != $1
			  AND m.deleted_at IS NULL
		) unread ON true
		WHERE c.created_by = $1 AND (c.title = 'Saved Messages' OR (
			SELECT COUNT(*) FROM conversation_participants p WHERE p.conversation_id = c.id AND p.left_at IS NULL
		) = 1)
		ORDER BY c.created_at ASC
		LIMIT 1;
	`

	var item dto.ConversationResponse
	err := r.db.QueryRow(ctx, findQuery, userID).Scan(
		&item.ID, &item.Type, &item.Title, &item.AvatarKey,
		&item.LastMessagePreview, &item.LastMessageAt,
		&item.IsMuted, &item.IsPinned,
		&item.UnreadCount,
	)
	if err == nil {
		item.Title = "Saved Messages"
		item.IsSavedMessages = true
		item.IsPinned = true
		return &item, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("failed to query saved messages conversation: %w", err)
	}

	// 2. Create new saved messages conversation atomically
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	insertConv := `
		INSERT INTO conversations (type, title, created_by, last_message_at, created_at, updated_at)
		VALUES ('direct', 'Saved Messages', $1, NOW(), NOW(), NOW())
		RETURNING id, type, title, avatar_key, last_message_preview, last_message_at;
	`
	err = tx.QueryRow(ctx, insertConv, userID).Scan(
		&item.ID, &item.Type, &item.Title, &item.AvatarKey,
		&item.LastMessagePreview, &item.LastMessageAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create saved messages conversation: %w", err)
	}

	insertPart := `
		INSERT INTO conversation_participants (conversation_id, user_id, role, is_pinned, last_read_at, joined_at)
		VALUES ($1, $2, 'admin', TRUE, NOW(), NOW());
	`
	if _, err := tx.Exec(ctx, insertPart, item.ID, userID); err != nil {
		return nil, fmt.Errorf("failed to insert saved participant: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	item.Title = "Saved Messages"
	item.IsSavedMessages = true
	item.IsPinned = true
	item.UnreadCount = 0
	return &item, nil
}

// DeleteConversation deletes / leaves the conversation for the current user
func (r *pgChatRepository) DeleteConversation(ctx context.Context, conversationID, userID uuid.UUID) error {
	isPart, err := r.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return err
	}
	if !isPart {
		return ErrForbidden
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Hide all current messages for this user in message_deletions
	hideMessagesQuery := `
		INSERT INTO message_deletions (message_id, user_id, created_at)
		SELECT id, $2, NOW()
		FROM messages
		WHERE conversation_id = $1
		ON CONFLICT (message_id, user_id) DO NOTHING;
	`
	_, err = tx.Exec(ctx, hideMessagesQuery, conversationID, userID)
	if err != nil {
		return fmt.Errorf("failed to hide messages on delete: %w", err)
	}

	// 2. Mark participant as left
	leaveQuery := `
		UPDATE conversation_participants
		SET left_at = NOW()
		WHERE conversation_id = $1 AND user_id = $2;
	`
	_, err = tx.Exec(ctx, leaveQuery, conversationID, userID)
	if err != nil {
		return fmt.Errorf("failed to mark participant left: %w", err)
	}

	return tx.Commit(ctx)
}

// BlockUser blocks target user
func (r *pgChatRepository) BlockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error {
	if blockerID == blockedID {
		return errors.New("cannot block yourself")
	}

	query := `
		INSERT INTO user_blocks (blocker_id, blocked_id, created_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
	`
	_, err := r.db.Exec(ctx, query, blockerID, blockedID)
	return err
}

// UnblockUser unblocks target user
func (r *pgChatRepository) UnblockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error {
	query := `
		DELETE FROM user_blocks
		WHERE blocker_id = $1 AND blocked_id = $2;
	`
	_, err := r.db.Exec(ctx, query, blockerID, blockedID)
	return err
}

// IsUserBlocked checks if either user has blocked the other
func (r *pgChatRepository) IsUserBlocked(ctx context.Context, user1ID, user2ID uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1 FROM user_blocks
			WHERE (blocker_id = $1 AND blocked_id = $2)
			   OR (blocker_id = $2 AND blocked_id = $1)
		);
	`
	var blocked bool
	err := r.db.QueryRow(ctx, query, user1ID, user2ID).Scan(&blocked)
	return blocked, err
}

// GetBlockedUserIDs returns all user IDs blocked by blockerID
func (r *pgChatRepository) GetBlockedUserIDs(ctx context.Context, blockerID uuid.UUID) ([]uuid.UUID, error) {
	query := `SELECT blocked_id FROM user_blocks WHERE blocker_id = $1;`
	rows, err := r.db.Query(ctx, query, blockerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var blockedIDs []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err == nil {
			blockedIDs = append(blockedIDs, id)
		}
	}
	if blockedIDs == nil {
		blockedIDs = []uuid.UUID{}
	}
	return blockedIDs, nil
}
