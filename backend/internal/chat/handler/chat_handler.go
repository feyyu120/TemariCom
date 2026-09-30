package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"strconv"
	"strings"
	"time"

	authService "TemariCom/internal/auth/service"
	"TemariCom/internal/chat/dto"
	"TemariCom/internal/chat/repository"
	"TemariCom/internal/chat/service"
	"TemariCom/pkg/validator"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/gofiber/contrib/v3/websocket/event"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type ChatHandler struct {
	chatService     service.ChatService
	authService     authService.AuthService
	hub             *WSHub
	typingThrottler *TypingThrottler
}

func NewChatHandler(chatService service.ChatService, authService authService.AuthService, hub *WSHub) *ChatHandler {
	return &ChatHandler{
		chatService:     chatService,
		authService:     authService,
		hub:             hub,
		typingThrottler: NewTypingThrottler(DefaultTypingThrottleInterval),
	}
}

// safeGo executes a function in a new goroutine with panic recovery protection
func safeGo(fn func()) {
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[ChatHandler] Panic recovered in background task: %v", r)
			}
		}()
		fn()
	}()
}

// extractAuthUser extracts the authenticated user ID from Bearer token or ?token= query parameter
func (h *ChatHandler) extractAuthUser(c fiber.Ctx) (uuid.UUID, error) {
	token := ""
	authHeader := c.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		token = strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	}
	if token == "" {
		token = c.Query("token")
	}

	if token == "" {
		return uuid.Nil, errors.New("unauthorized: missing session token")
	}

	user, err := h.authService.ValidateSession(c.Context(), token)
	if err != nil {
		return uuid.Nil, err
	}

	return user.ID, nil
}

// dispatchRealtimeMessage delivers message to online recipients and records receipts
func (h *ChatHandler) dispatchRealtimeMessage(ctx context.Context, convID, senderID uuid.UUID, msg *dto.MessageResponse, recipientIDs []uuid.UUID) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[ChatHandler] Panic recovered in dispatchRealtimeMessage: %v", r)
		}
	}()

	for _, recipientID := range recipientIDs {
		if h.hub.IsUserOnline(recipientID) {
			// Recipient is online: Deliver via WebSocket immediately
			h.hub.SendToUser(recipientID, dto.WSEventNewMessage, msg)

			// Record delivery timestamp in DB
			_ = h.chatService.MarkMessageDelivered(ctx, msg.ID, recipientID)

			// Notify sender with delivery receipt
			deliveredPayload := dto.WSDeliveredPayload{
				ConversationID: convID,
				MessageID:      msg.ID,
				UserID:         recipientID,
				DeliveredAt:    time.Now(),
			}
			h.hub.SendToUser(senderID, dto.WSEventMessageDelivered, deliveredPayload)
		}
	}
}

// ============================================================================
// REST HANDLERS
// ============================================================================

// CreateDirectChat handles starting or fetching an existing 1-on-1 direct chat
func (h *ChatHandler) CreateDirectChat(c fiber.Ctx) error {
	currentUserID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Unauthorized session",
		})
	}

	var req dto.CreateDirectChatRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	if errs := validator.ValidateStruct(&req); len(errs) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"errors":  errs,
		})
	}

	conv, err := h.chatService.CreateDirectChat(c.Context(), currentUserID, req.TargetUserID)
	if err != nil {
		if errors.Is(err, repository.ErrCannotChatSelf) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error":   "Cannot start a chat with yourself",
			})
		}
		log.Printf("[ChatHandler] CreateDirectChat error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to create direct conversation",
		})
	}

	if conv.Peer != nil {
		conv.Peer.IsOnline = h.hub.IsUserOnline(conv.Peer.ID)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":      true,
		"data":         conv,
		"conversation": conv,
	})
}

// GetUserConversations returns user inbox conversations with unread counts
func (h *ChatHandler) GetUserConversations(c fiber.Ctx) error {
	currentUserID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Unauthorized session",
		})
	}

	limit, _ := strconv.Atoi(c.Query("limit", "30"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	convs, err := h.chatService.GetUserConversations(c.Context(), currentUserID, limit, offset)
	if err != nil {
		log.Printf("[ChatHandler] GetUserConversations error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch conversations",
		})
	}

	// Enrich with real-time online presence status from WebSocket Hub
	for i := range convs {
		if convs[i].Peer != nil {
			convs[i].Peer.IsOnline = h.hub.IsUserOnline(convs[i].Peer.ID)
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":       true,
		"data":          convs,
		"conversations": convs,
	})
}

// GetMessages returns paginated messages using cursor pagination
func (h *ChatHandler) GetMessages(c fiber.Ctx) error {
	currentUserID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Unauthorized session",
		})
	}

	convIDStr := c.Params("id")
	convID, err := uuid.Parse(convIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid conversation ID",
		})
	}

	limit, _ := strconv.Atoi(c.Query("limit", "30"))
	before := c.Query("before", "")

	page, err := h.chatService.GetMessages(c.Context(), convID, currentUserID, limit, before)
	if err != nil {
		if errors.Is(err, repository.ErrForbidden) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error":   "You are not a participant in this conversation",
			})
		}
		log.Printf("[ChatHandler] GetMessages error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch messages",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":     true,
		"data":        page.Messages,
		"messages":    page.Messages,
		"next_cursor": page.NextCursor,
		"has_more":    page.HasMore,
	})
}

// SendMessage creates and sends a new message in a conversation via REST
func (h *ChatHandler) SendMessage(c fiber.Ctx) error {
	currentUserID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Unauthorized session",
		})
	}

	convIDStr := c.Params("id")
	convID, err := uuid.Parse(convIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid conversation ID",
		})
	}

	var req dto.SendMessageRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	if errs := validator.ValidateStruct(&req); len(errs) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"errors":  errs,
		})
	}

	msg, recipientIDs, err := h.chatService.SendMessage(c.Context(), convID, currentUserID, req)
	if err != nil {
		if errors.Is(err, repository.ErrForbidden) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error":   "You are not a participant in this conversation",
			})
		}
		if errors.Is(err, service.ErrEmptyMessage) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error":   "Message content or media is required",
			})
		}
		log.Printf("[ChatHandler] SendMessage error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to send message",
		})
	}

	// Dispatch WebSocket delivery to online users asynchronously
	safeGo(func() {
		h.dispatchRealtimeMessage(context.Background(), convID, currentUserID, msg, recipientIDs)
	})

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    msg,
		"message": msg,
	})
}

// EditMessage updates message content
func (h *ChatHandler) EditMessage(c fiber.Ctx) error {
	currentUserID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Unauthorized session",
		})
	}

	convID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid conversation ID",
		})
	}

	msgID, err := uuid.Parse(c.Params("msgId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid message ID",
		})
	}

	var req dto.EditMessageRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	if errs := validator.ValidateStruct(&req); len(errs) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"errors":  errs,
		})
	}

	updatedMsg, recipientIDs, err := h.chatService.EditMessage(c.Context(), convID, msgID, currentUserID, req.Content)
	if err != nil {
		if errors.Is(err, repository.ErrForbidden) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error":   "You are not authorized to edit this message",
			})
		}
		if errors.Is(err, repository.ErrNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"error":   "Message not found",
			})
		}
		log.Printf("[ChatHandler] EditMessage error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to update message",
		})
	}

	// Notify other participants via WebSocket
	safeGo(func() {
		h.hub.SendToUsersExcept(recipientIDs, currentUserID, dto.WSEventMessageEdited, updatedMsg)
	})

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    updatedMsg,
	})
}

// DeleteMessage removes a message with scope control:
//   - forAll=true: Soft-deletes from the messages table (sender only). Notified to all participants.
//   - forAll=false: Inserts into message_deletions so the message is hidden only for this user.
func (h *ChatHandler) DeleteMessage(c fiber.Ctx) error {
	currentUserID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Unauthorized session",
		})
	}

	convID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid conversation ID",
		})
	}

	msgID, err := uuid.Parse(c.Params("msgId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid message ID",
		})
	}

	// Parse scope from request body
	var body struct {
		Scope string `json:"scope"` // "everyone" or "me"
	}
	_ = c.Bind().Body(&body)

	forAll := body.Scope == "everyone"

	recipientIDs, err := h.chatService.DeleteMessage(c.Context(), convID, msgID, currentUserID, forAll)
	if err != nil {
		if errors.Is(err, repository.ErrForbidden) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error":   "You are not authorized to delete this message",
			})
		}
		if errors.Is(err, repository.ErrNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"error":   "Message not found",
			})
		}
		log.Printf("[ChatHandler] DeleteMessage error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to delete message",
		})
	}

	// Only broadcast WebSocket event for delete-for-everyone
	if forAll {
		safeGo(func() {
			deletePayload := map[string]interface{}{
				"conversation_id": convID,
				"message_id":      msgID,
			}
			h.hub.SendToUsersExcept(recipientIDs, currentUserID, dto.WSEventMessageDeleted, deletePayload)
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":    true,
		"message_id": msgID,
		"scope":      body.Scope,
	})
}

// MarkAsRead marks a conversation as read
func (h *ChatHandler) MarkAsRead(c fiber.Ctx) error {
	currentUserID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Unauthorized session",
		})
	}

	convIDStr := c.Params("id")
	convID, err := uuid.Parse(convIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid conversation ID",
		})
	}

	if err := h.chatService.MarkAsRead(c.Context(), convID, currentUserID); err != nil {
		if errors.Is(err, repository.ErrForbidden) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error":   "You are not a participant in this conversation",
			})
		}
		if errors.Is(err, repository.ErrNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"error":   "Conversation not found",
			})
		}
		log.Printf("[ChatHandler] MarkAsRead error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to mark messages as read",
		})
	}

	// Notify other participants that messages were read
	safeGo(func() {
		participantIDs, err := h.chatService.GetParticipantUserIDs(context.Background(), convID)
		if err == nil {
			readPayload := dto.WSReadPayload{
				ConversationID: convID,
				UserID:         currentUserID,
				ReadAt:         time.Now(),
			}
			h.hub.SendToUsersExcept(participantIDs, currentUserID, dto.WSEventReadReceipt, readPayload)
		}
	})

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
	})
}

// SearchUsers searches students/users by username, full name, or email to initiate new chats
func (h *ChatHandler) SearchUsers(c fiber.Ctx) error {
	currentUserID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Unauthorized session",
		})
	}

	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Search query is required",
		})
	}
	limit := 20
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 50 {
			limit = parsed
		}
	}

	users, err := h.chatService.SearchUsers(c.Context(), currentUserID, q, limit)
	if err != nil {
		log.Printf("[ChatHandler] SearchUsers error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to search users",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    users,
	})
}

// ============================================================================
// WEBSOCKET REAL-TIME HANDLERS (GoFiber contrib websocket/event)
// ============================================================================

// WSUpgradeMiddleware validates the session during the HTTP upgrade handshake
func (h *ChatHandler) WSUpgradeMiddleware(c fiber.Ctx) error {
	if !websocket.IsWebSocketUpgrade(c) {
		return fiber.ErrUpgradeRequired
	}

	token := ""
	authHeader := c.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		token = strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	}
	if token == "" {
		token = c.Query("token")
	}

	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized: missing token query param or authorization header",
		})
	}

	user, err := h.authService.ValidateSession(c.Context(), token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized: invalid or expired session",
		})
	}

	usernameStr := ""
	if user.Username != nil {
		usernameStr = *user.Username
	}
	c.Locals("user_id", user.ID.String())
	c.Locals("username", usernameStr)

	return c.Next()
}

// WSConnectionHandler establishes event-driven WebSocket communication
func (h *ChatHandler) WSConnectionHandler() fiber.Handler {
	eventCfg := event.Config{
		PingInterval:    30 * time.Second,
		ReadIdleTimeout: 10 * time.Minute,
		WriteTimeout:    10 * time.Second,
	}

	return event.NewWithConfig(func(kws *event.Websocket) {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[WS] Connection panic recovered: %v", r)
			}
		}()

		var userID uuid.UUID
		var username string

		// Attempt 1: From Locals (set during upgrade middleware)
		userIDStr, _ := kws.Locals("user_id").(string)
		if userIDStr != "" {
			if parsed, err := uuid.Parse(userIDStr); err == nil {
				userID = parsed
			}
			username, _ = kws.Locals("username").(string)
		}

		// Attempt 2: Fallback to token query param if Locals was not preserved across upgrade
		if userID == uuid.Nil {
			token := kws.Query("token")
			if token != "" {
				user, err := h.authService.ValidateSession(context.Background(), token)
				if err == nil {
					userID = user.ID
					if user.Username != nil {
						username = *user.Username
					}
				} else {
					log.Printf("[WS] Session validation failed for query token: %v", err)
				}
			}
		}

		if userID == uuid.Nil {
			log.Printf("[WS] Unauthorized connection rejected (could not resolve user)")
			kws.Close()
			return
		}

		log.Printf("[WS] Connection authenticated: user_id=%s, username=%s", userID, username)
		kws.SetAttribute("user_id", userID.String())
		kws.SetAttribute("username", username)

		// Register connection in hub
		h.hub.Register(userID, kws)

		// Broadcast online presence to peers
		safeGo(func() {
			convs, err := h.chatService.GetUserConversations(context.Background(), userID, 50, 0)
			if err == nil {
				for _, conv := range convs {
					if conv.Peer != nil {
						h.hub.SendToUser(conv.Peer.ID, dto.WSEventPresence, map[string]interface{}{
							"user_id":   userID,
							"is_online": true,
						})
					}
				}
			}
		})

		// Connection-scoped token bucket rate limiter
		limiter := NewConnectionRateLimiter(DefaultRateLimitTokensPerSec, DefaultRateLimitBurst)

		// 1. Handle incoming text/event messages
		kws.On(event.EventMessage, func(ep *event.EventPayload) {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[WS] Panic recovered while handling EventMessage from user %s: %v", userID, r)
				}
			}()

			// Message-size limit check
			if len(ep.Data) > MaxWSMessageSize {
				h.hub.Metrics().RecordDroppedMessage("payload_too_large")
				kws.Emit([]byte(`{"type":"chat:error","payload":"message size exceeds maximum limit of 64KB"}`), event.TextMessage)
				return
			}

			// Connection rate limit check
			if !limiter.Allow() {
				h.hub.Metrics().RecordDroppedMessage("rate_limited")
				kws.Emit([]byte(`{"type":"chat:error","payload":"rate limit exceeded, please slow down"}`), event.TextMessage)
				return
			}

			var rawEvent struct {
				Type           string          `json:"type"`
				ConversationID *uuid.UUID      `json:"conversation_id,omitempty"`
				Payload        json.RawMessage `json:"payload"`
			}

			if err := json.Unmarshal(ep.Data, &rawEvent); err != nil {
				log.Printf("[WS] Malformed JSON received from user %s: %s", userID, string(ep.Data))
				h.hub.Metrics().RecordDroppedMessage("invalid_json")
				kws.Emit([]byte(`{"type":"chat:error","payload":"malformed JSON event payload"}`), event.TextMessage)
				return
			}

			switch rawEvent.Type {
			case dto.WSEventSendMessage:
				if rawEvent.ConversationID == nil {
					log.Printf("[WS] SendMessage rejected: missing conversation_id from user %s", userID)
					h.hub.Metrics().RecordDroppedMessage("missing_conversation_id")
					kws.Emit([]byte(`{"type":"chat:error","payload":"conversation_id is required"}`), event.TextMessage)
					return
				}
				h.hub.Metrics().RecordEvent(dto.WSEventSendMessage)

				var req dto.SendMessageRequest
				if err := json.Unmarshal(rawEvent.Payload, &req); err != nil {
					log.Printf("[WS] SendMessage rejected: invalid payload struct from user %s: %v", userID, err)
					h.hub.Metrics().RecordDroppedMessage("invalid_send_payload")
					kws.Emit([]byte(`{"type":"chat:error","payload":"invalid send message payload format"}`), event.TextMessage)
					return
				}

				msg, recipientIDs, err := h.chatService.SendMessage(context.Background(), *rawEvent.ConversationID, userID, req)
				if err != nil {
					log.Printf("[WS] SendMessage error from user %s in conv %s: %v", userID, *rawEvent.ConversationID, err)
					h.hub.Metrics().RecordDroppedMessage("send_failed")
					kws.Emit([]byte(`{"type":"chat:error","payload":"message could not be sent"}`), event.TextMessage)
					return
				}

				log.Printf("[WS] Message %s created by user %s in conv %s (delivering to %d recipients)", msg.ID, userID, *rawEvent.ConversationID, len(recipientIDs))

				// Dispatch real-time delivery to online users
				safeGo(func() {
					h.dispatchRealtimeMessage(context.Background(), *rawEvent.ConversationID, userID, msg, recipientIDs)
				})

			case dto.WSEventTyping:
				if rawEvent.ConversationID == nil {
					h.hub.Metrics().RecordDroppedMessage("missing_conversation_id")
					return
				}
				h.hub.Metrics().RecordEvent(dto.WSEventTyping)

				var typingReq struct {
					IsTyping bool `json:"is_typing"`
				}
				if err := json.Unmarshal(rawEvent.Payload, &typingReq); err != nil {
					h.hub.Metrics().RecordDroppedMessage("invalid_typing_payload")
					return
				}

				// Authorization check: Verify sender is a participant
				isPart, err := h.chatService.IsParticipant(context.Background(), *rawEvent.ConversationID, userID)
				if err != nil || !isPart {
					h.hub.Metrics().RecordDroppedMessage("unauthorized_typing")
					return
				}

				// Throttle typing events to prevent spam
				if h.typingThrottler.ShouldThrottle(userID, *rawEvent.ConversationID, typingReq.IsTyping) {
					h.hub.Metrics().RecordDroppedMessage("throttled_typing")
					return
				}

				participantIDs, err := h.chatService.GetParticipantUserIDs(context.Background(), *rawEvent.ConversationID)
				if err == nil {
					payload := dto.WSTypingPayload{
						ConversationID: *rawEvent.ConversationID,
						UserID:         userID,
						Username:       username,
						IsTyping:       typingReq.IsTyping,
					}
					h.hub.SendToUsersExcept(participantIDs, userID, dto.WSEventTyping, payload)
				}

			case dto.WSEventReadReceipt:
				if rawEvent.ConversationID == nil {
					h.hub.Metrics().RecordDroppedMessage("missing_conversation_id")
					return
				}
				h.hub.Metrics().RecordEvent(dto.WSEventReadReceipt)

				if err := h.chatService.MarkAsRead(context.Background(), *rawEvent.ConversationID, userID); err != nil {
					h.hub.Metrics().RecordDroppedMessage("unauthorized_or_failed_read_receipt")
					return
				}

				participantIDs, err := h.chatService.GetParticipantUserIDs(context.Background(), *rawEvent.ConversationID)
				if err == nil {
					payload := dto.WSReadPayload{
						ConversationID: *rawEvent.ConversationID,
						UserID:         userID,
						ReadAt:         time.Now(),
					}
					h.hub.SendToUsersExcept(participantIDs, userID, dto.WSEventReadReceipt, payload)
				}

			default:
				h.hub.Metrics().RecordDroppedMessage("unknown_event_type")
			}
		})

		// 2. Handle disconnection
		kws.On(event.EventDisconnect, func(ep *event.EventPayload) {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[WS] Panic recovered on EventDisconnect: %v", r)
				}
			}()
			log.Printf("[WS] Connection closed: user_id=%s, err=%v", userID, ep.Error)
			h.hub.Unregister(userID, kws)

			if !h.hub.IsUserOnline(userID) {
				safeGo(func() {
					now := time.Now()
					convs, err := h.chatService.GetUserConversations(context.Background(), userID, 50, 0)
					if err == nil {
						for _, conv := range convs {
							if conv.Peer != nil {
								h.hub.SendToUser(conv.Peer.ID, dto.WSEventPresence, map[string]interface{}{
									"user_id":      userID,
									"is_online":    false,
									"last_seen_at": now,
								})
							}
						}
					}
				})
			}
		})
	}, eventCfg)
}

// GetMetrics returns real-time WebSocket telemetry and performance metrics
func (h *ChatHandler) GetMetrics(c fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"success": true,
		"data":    h.hub.Metrics().GetSnapshot(),
	})
}
