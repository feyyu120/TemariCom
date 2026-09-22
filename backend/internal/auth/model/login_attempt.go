package model

import (
	"net/netip"
	"time"

	"github.com/google/uuid"
)

// LoginAttempt represents an audit log entry for security and rate limiting.
type LoginAttempt struct {
	ID            uuid.UUID   `json:"id" db:"id"`
	UserID        *uuid.UUID  `json:"user_id,omitempty" db:"user_id"`
	Identifier    string      `json:"identifier" db:"identifier"`
	IPAddress     *netip.Addr `json:"ip_address,omitempty" db:"ip_address"`
	UserAgent     *string     `json:"user_agent,omitempty" db:"user_agent"`
	Success       bool        `json:"success" db:"success"`
	FailureReason *string     `json:"failure_reason,omitempty" db:"failure_reason"`
	CreatedAt     time.Time   `json:"created_at" db:"created_at"`
}
