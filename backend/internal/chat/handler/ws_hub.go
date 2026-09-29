package handler

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"TemariCom/internal/chat/dto"

	"github.com/gofiber/contrib/v3/websocket/event"
	"github.com/google/uuid"
)

// WSHub manages active WebSocket connections per user, supporting multi-device messaging and telemetry
type WSHub struct {
	mu          sync.RWMutex
	connections map[uuid.UUID]map[*event.Websocket]struct{}
	metrics     *ChatMetrics
}

func NewWSHub() *WSHub {
	return &WSHub{
		connections: make(map[uuid.UUID]map[*event.Websocket]struct{}),
		metrics:     NewChatMetrics(),
	}
}

// Metrics returns the active telemetry collector for the hub
func (h *WSHub) Metrics() *ChatMetrics {
	return h.metrics
}

// Register adds a socket connection for a user and updates telemetry
func (h *WSHub) Register(userID uuid.UUID, kws *event.Websocket) {
	if kws == nil {
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	if _, exists := h.connections[userID]; !exists {
		h.connections[userID] = make(map[*event.Websocket]struct{})
	}
	h.connections[userID][kws] = struct{}{}

	h.metrics.RecordConnection()
}

// Unregister removes a socket connection for a user and updates telemetry
func (h *WSHub) Unregister(userID uuid.UUID, kws *event.Websocket) {
	if kws == nil {
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	if userConns, exists := h.connections[userID]; exists {
		delete(userConns, kws)
		if len(userConns) == 0 {
			delete(h.connections, userID)
		}
	}

	h.metrics.RecordDisconnection()
}

// IsUserOnline returns true if the user has at least one active connection
func (h *WSHub) IsUserOnline(userID uuid.UUID) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	conns, exists := h.connections[userID]
	return exists && len(conns) > 0
}

// safeEmit wraps WebSocket write operations with panic recovery
func safeEmit(kws *event.Websocket, data []byte) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[WSHub] Recovered from panic during WebSocket emit: %v", r)
		}
	}()

	if kws != nil && kws.IsAlive() {
		kws.Emit(data, event.TextMessage)
	}
}

// SendToUser emits a typed JSON event to all connected devices of a specific user
func (h *WSHub) SendToUser(userID uuid.UUID, eventType string, payload any) {
	start := time.Now()

	h.mu.RLock()
	userConns, exists := h.connections[userID]
	if !exists || len(userConns) == 0 {
		h.mu.RUnlock()
		return
	}

	// Copy socket pointers under read lock to prevent holding lock during network I/O
	conns := make([]*event.Websocket, 0, len(userConns))
	for kws := range userConns {
		if kws != nil {
			conns = append(conns, kws)
		}
	}
	h.mu.RUnlock()

	eventMsg := dto.WSEvent{
		Type:    eventType,
		Payload: payload,
	}

	data, err := json.Marshal(eventMsg)
	if err != nil {
		log.Printf("[WSHub] Failed to marshal event %s: %v", eventType, err)
		h.metrics.RecordDroppedMessage("marshal_error")
		return
	}

	for _, kws := range conns {
		safeEmit(kws, data)
	}

	h.metrics.RecordBroadcast(1, time.Since(start))
}

// SendToUsers emits an event to a list of users, optimized to serialize JSON once
func (h *WSHub) SendToUsers(userIDs []uuid.UUID, eventType string, payload any) {
	h.broadcastToUsers(userIDs, uuid.Nil, eventType, payload)
}

// SendToUsersExcept emits an event to a list of users, excluding a specific user (e.g. the sender)
func (h *WSHub) SendToUsersExcept(userIDs []uuid.UUID, exceptUserID uuid.UUID, eventType string, payload any) {
	h.broadcastToUsers(userIDs, exceptUserID, eventType, payload)
}

// broadcastToUsers performs atomic payload marshaling and multi-user message distribution
func (h *WSHub) broadcastToUsers(userIDs []uuid.UUID, exceptUserID uuid.UUID, eventType string, payload any) {
	start := time.Now()

	eventMsg := dto.WSEvent{
		Type:    eventType,
		Payload: payload,
	}

	data, err := json.Marshal(eventMsg)
	if err != nil {
		log.Printf("[WSHub] Failed to marshal broadcast event %s: %v", eventType, err)
		h.metrics.RecordDroppedMessage("marshal_error")
		return
	}

	// Collect all target sockets under a single read lock
	var targetSockets []*event.Websocket
	participantCount := 0

	h.mu.RLock()
	for _, uid := range userIDs {
		if uid == exceptUserID {
			continue
		}
		participantCount++
		if conns, exists := h.connections[uid]; exists {
			for kws := range conns {
				if kws != nil {
					targetSockets = append(targetSockets, kws)
				}
			}
		}
	}
	h.mu.RUnlock()

	// Emit messages outside the lock to prevent socket I/O from blocking other threads
	for _, kws := range targetSockets {
		safeEmit(kws, data)
	}

	h.metrics.RecordBroadcast(participantCount, time.Since(start))
}
