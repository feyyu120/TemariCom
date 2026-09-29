package handler_test

import (
	"testing"
	"time"

	"TemariCom/internal/chat/handler"

	"github.com/google/uuid"
)

func TestChatMetrics(t *testing.T) {
	metrics := handler.NewChatMetrics()

	// 1. Connection tracking
	metrics.RecordConnection()
	metrics.RecordConnection()
	if metrics.ActiveConnections() != 2 {
		t.Fatalf("expected 2 active connections, got %d", metrics.ActiveConnections())
	}

	metrics.RecordDisconnection()
	if metrics.ActiveConnections() != 1 {
		t.Fatalf("expected 1 active connection, got %d", metrics.ActiveConnections())
	}

	// 2. Events & Dropped messages
	metrics.RecordEvent("chat:send")
	metrics.RecordEvent("chat:typing")
	metrics.RecordDroppedMessage("rate_limited")
	metrics.RecordDroppedMessage("unauthorized_typing")

	if metrics.DroppedMessages() != 2 {
		t.Fatalf("expected 2 dropped messages, got %d", metrics.DroppedMessages())
	}

	// 3. Broadcast latency & participant count
	metrics.RecordBroadcast(3, 5*time.Millisecond)
	metrics.RecordBroadcast(5, 10*time.Millisecond)

	snapshot := metrics.GetSnapshot()
	if snapshot.ActiveConnections != 1 {
		t.Errorf("expected 1 active connection in snapshot, got %d", snapshot.ActiveConnections)
	}
	if snapshot.TotalConnections != 2 {
		t.Errorf("expected 2 total connections in snapshot, got %d", snapshot.TotalConnections)
	}
	if snapshot.TotalBroadcasts != 2 {
		t.Errorf("expected 2 total broadcasts, got %d", snapshot.TotalBroadcasts)
	}
	if snapshot.LastParticipantCount != 5 {
		t.Errorf("expected last participant count 5, got %d", snapshot.LastParticipantCount)
	}
	if snapshot.AvgParticipantCount != 4.0 {
		t.Errorf("expected avg participant count 4.0, got %f", snapshot.AvgParticipantCount)
	}
	if snapshot.EventsByType["chat:send"] != 1 {
		t.Errorf("expected 1 chat:send event, got %d", snapshot.EventsByType["chat:send"])
	}
	if snapshot.DroppedReasons["rate_limited"] != 1 {
		t.Errorf("expected 1 rate_limited dropped reason, got %d", snapshot.DroppedReasons["rate_limited"])
	}
}

func TestConnectionRateLimiter(t *testing.T) {
	// Capacity = 3, Rate = 10 tokens/sec
	limiter := handler.NewConnectionRateLimiter(10.0, 3.0)

	// Consume capacity (3 tokens)
	for i := 0; i < 3; i++ {
		if !limiter.Allow() {
			t.Fatalf("expected token %d to be allowed", i+1)
		}
	}

	// Next token should be denied immediately
	if limiter.Allow() {
		t.Fatalf("expected token 4 to be rejected due to rate limit")
	}

	// Wait 150ms for refill (10 tokens/sec * 0.15s = 1.5 tokens)
	time.Sleep(150 * time.Millisecond)
	if !limiter.Allow() {
		t.Fatalf("expected token to be allowed after refill")
	}
}

func TestTypingThrottler(t *testing.T) {
	throttler := handler.NewTypingThrottler(500 * time.Millisecond)
	userID := uuid.New()
	convID := uuid.New()

	// First typing event should pass
	if throttler.ShouldThrottle(userID, convID, true) {
		t.Fatalf("expected initial typing event to NOT be throttled")
	}

	// Immediate second typing event for same conv should be throttled
	if !throttler.ShouldThrottle(userID, convID, true) {
		t.Fatalf("expected rapid consecutive typing event to be throttled")
	}

	// Different conversation for same user should NOT be throttled
	convID2 := uuid.New()
	if throttler.ShouldThrottle(userID, convID2, true) {
		t.Fatalf("expected typing event for different conversation to NOT be throttled")
	}

	// Wait past minInterval
	time.Sleep(550 * time.Millisecond)
	if throttler.ShouldThrottle(userID, convID, true) {
		t.Fatalf("expected typing event after interval to NOT be throttled")
	}
}
