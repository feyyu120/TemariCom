package handler

import (
	"log"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
)

const (
	// MaxWSMessageSize limits the maximum allowable WebSocket payload (64 KB)
	MaxWSMessageSize = 64 * 1024

	// DefaultRateLimitTokensPerSec is the refill rate of the connection rate limiter
	DefaultRateLimitTokensPerSec = 20.0

	// DefaultRateLimitBurst is the burst capacity of the connection rate limiter
	DefaultRateLimitBurst = 30.0

	// DefaultTypingThrottleInterval is the minimum interval between typing notifications
	DefaultTypingThrottleInterval = 1500 * time.Millisecond
)

// MetricsSnapshot represents the exported telemetry and health status of the chat system
type MetricsSnapshot struct {
	ActiveConnections       int64             `json:"active_connections"`
	TotalConnections        uint64            `json:"total_connections"`
	TotalDisconnections     uint64            `json:"total_disconnections"`
	TotalEventsReceived     uint64            `json:"total_events_received"`
	TotalDroppedMessages    uint64            `json:"total_dropped_messages"`
	TotalBroadcasts         uint64            `json:"total_broadcasts"`
	AvgBroadcastDurationMs  float64           `json:"avg_broadcast_duration_ms"`
	LastBroadcastDurationMs float64           `json:"last_broadcast_duration_ms"`
	AvgParticipantCount     float64           `json:"avg_participant_count"`
	LastParticipantCount    int               `json:"last_participant_count"`
	EventRatePerSec         float64           `json:"event_rate_per_sec"`
	EventsByType            map[string]uint64 `json:"events_by_type"`
	DroppedReasons          map[string]uint64 `json:"dropped_reasons"`
	UptimeSeconds           float64           `json:"uptime_seconds"`
}

// ChatMetrics manages high-performance atomic counters and timing measurements for WebSocket activity
type ChatMetrics struct {
	activeConnections    atomic.Int64
	totalConnections     atomic.Uint64
	totalDisconnections  atomic.Uint64
	totalEventsReceived  atomic.Uint64
	totalDroppedMessages atomic.Uint64
	totalBroadcasts      atomic.Uint64

	mu                     sync.RWMutex
	totalBroadcastDuration time.Duration
	lastBroadcastDuration  time.Duration
	totalParticipants      int64
	lastParticipantCount   int

	eventsByType   map[string]*atomic.Uint64
	droppedReasons map[string]*atomic.Uint64
	mapMu          sync.RWMutex

	startTime time.Time
}

// NewChatMetrics initializes a new metrics collector
func NewChatMetrics() *ChatMetrics {
	return &ChatMetrics{
		eventsByType:   make(map[string]*atomic.Uint64),
		droppedReasons: make(map[string]*atomic.Uint64),
		startTime:      time.Now(),
	}
}

// RecordConnection increments the active and lifetime connection counters
func (m *ChatMetrics) RecordConnection() {
	m.activeConnections.Add(1)
	m.totalConnections.Add(1)
}

// RecordDisconnection decrements active connections and increments total disconnections
func (m *ChatMetrics) RecordDisconnection() {
	m.activeConnections.Add(-1)
	m.totalDisconnections.Add(1)
}

// RecordEvent increments the total events and per-event-type counter
func (m *ChatMetrics) RecordEvent(eventType string) {
	m.totalEventsReceived.Add(1)

	m.mapMu.RLock()
	counter, exists := m.eventsByType[eventType]
	m.mapMu.RUnlock()

	if !exists {
		m.mapMu.Lock()
		counter, exists = m.eventsByType[eventType]
		if !exists {
			counter = &atomic.Uint64{}
			m.eventsByType[eventType] = counter
		}
		m.mapMu.Unlock()
	}

	counter.Add(1)
}

// RecordDroppedMessage tracks messages dropped due to rate limit, size limit, or validation failure
func (m *ChatMetrics) RecordDroppedMessage(reason string) {
	m.totalDroppedMessages.Add(1)

	m.mapMu.RLock()
	counter, exists := m.droppedReasons[reason]
	m.mapMu.RUnlock()

	if !exists {
		m.mapMu.Lock()
		counter, exists = m.droppedReasons[reason]
		if !exists {
			counter = &atomic.Uint64{}
			m.droppedReasons[reason] = counter
		}
		m.mapMu.Unlock()
	}

	counter.Add(1)
}

// RecordBroadcast records participant count and latency for real-time broadcasts
func (m *ChatMetrics) RecordBroadcast(participantCount int, duration time.Duration) {
	m.totalBroadcasts.Add(1)

	m.mu.Lock()
	defer m.mu.Unlock()

	m.totalBroadcastDuration += duration
	m.lastBroadcastDuration = duration
	m.totalParticipants += int64(participantCount)
	m.lastParticipantCount = participantCount
}

// ActiveConnections returns the current active connection count
func (m *ChatMetrics) ActiveConnections() int64 {
	return m.activeConnections.Load()
}

// DroppedMessages returns the total count of dropped messages
func (m *ChatMetrics) DroppedMessages() uint64 {
	return m.totalDroppedMessages.Load()
}

// GetSnapshot captures a thread-safe snapshot of all metrics
func (m *ChatMetrics) GetSnapshot() MetricsSnapshot {
	uptime := time.Since(m.startTime).Seconds()
	if uptime <= 0 {
		uptime = 1
	}

	totalEvents := m.totalEventsReceived.Load()
	eventRate := float64(totalEvents) / uptime

	m.mu.RLock()
	broadcasts := m.totalBroadcasts.Load()
	var avgDurationMs float64
	var avgParticipants float64
	if broadcasts > 0 {
		avgDurationMs = float64(m.totalBroadcastDuration.Milliseconds()) / float64(broadcasts)
		avgParticipants = float64(m.totalParticipants) / float64(broadcasts)
	}
	lastDurationMs := float64(m.lastBroadcastDuration.Microseconds()) / 1000.0
	lastParticipants := m.lastParticipantCount
	m.mu.RUnlock()

	// Clone maps under read lock
	m.mapMu.RLock()
	eventsMap := make(map[string]uint64, len(m.eventsByType))
	for k, v := range m.eventsByType {
		eventsMap[k] = v.Load()
	}

	droppedMap := make(map[string]uint64, len(m.droppedReasons))
	for k, v := range m.droppedReasons {
		droppedMap[k] = v.Load()
	}
	m.mapMu.RUnlock()

	return MetricsSnapshot{
		ActiveConnections:       m.activeConnections.Load(),
		TotalConnections:        m.totalConnections.Load(),
		TotalDisconnections:     m.totalDisconnections.Load(),
		TotalEventsReceived:     totalEvents,
		TotalDroppedMessages:    m.totalDroppedMessages.Load(),
		TotalBroadcasts:         broadcasts,
		AvgBroadcastDurationMs:  avgDurationMs,
		LastBroadcastDurationMs: lastDurationMs,
		AvgParticipantCount:     avgParticipants,
		LastParticipantCount:    lastParticipants,
		EventRatePerSec:         eventRate,
		EventsByType:            eventsMap,
		DroppedReasons:          droppedMap,
		UptimeSeconds:           uptime,
	}
}

// ============================================================================
// RATE LIMITER & THROTTLER
// ============================================================================

// ConnectionRateLimiter implements a token bucket rate limiter for WebSocket connections
type ConnectionRateLimiter struct {
	mu       sync.Mutex
	tokens   float64
	capacity float64
	rate     float64 // tokens per second
	lastTime time.Time
}

// NewConnectionRateLimiter creates a new connection-scoped rate limiter
func NewConnectionRateLimiter(rate, capacity float64) *ConnectionRateLimiter {
	return &ConnectionRateLimiter{
		tokens:   capacity,
		capacity: capacity,
		rate:     rate,
		lastTime: time.Now(),
	}
}

// Allow returns true if a message is permitted under the rate limit
func (rl *ConnectionRateLimiter) Allow() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(rl.lastTime).Seconds()
	rl.lastTime = now

	rl.tokens += elapsed * rl.rate
	if rl.tokens > rl.capacity {
		rl.tokens = rl.capacity
	}

	if rl.tokens >= 1.0 {
		rl.tokens -= 1.0
		return true
	}

	return false
}

// TypingThrottler throttles typing event spam per (userID, conversationID)
type TypingThrottler struct {
	mu          sync.Mutex
	lastTyping  map[string]time.Time
	minInterval time.Duration
}

// NewTypingThrottler creates a typing event throttler with safe background cleanup
func NewTypingThrottler(minInterval time.Duration) *TypingThrottler {
	tt := &TypingThrottler{
		lastTyping:  make(map[string]time.Time),
		minInterval: minInterval,
	}

	// Periodic background cleanup with panic recovery
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[TypingThrottler] Recovered from panic in cleanup: %v", r)
			}
		}()
		tt.cleanupLoop()
	}()

	return tt
}

// ShouldThrottle checks if a typing event should be throttled
func (tt *TypingThrottler) ShouldThrottle(userID, convID uuid.UUID, isTyping bool) bool {
	key := userID.String() + ":" + convID.String()

	tt.mu.Lock()
	defer tt.mu.Unlock()

	now := time.Now()
	last, exists := tt.lastTyping[key]

	// Allow "stopped typing" (isTyping == false) with shorter threshold (300ms)
	interval := tt.minInterval
	if !isTyping {
		interval = 300 * time.Millisecond
	}

	if exists && now.Sub(last) < interval {
		return true // Throttle
	}

	tt.lastTyping[key] = now
	return false
}

func (tt *TypingThrottler) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		tt.mu.Lock()
		now := time.Now()
		for k, t := range tt.lastTyping {
			if now.Sub(t) > 10*time.Minute {
				delete(tt.lastTyping, k)
			}
		}
		tt.mu.Unlock()
	}
}
