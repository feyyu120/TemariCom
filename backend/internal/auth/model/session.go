package model

import (
	"net/netip"
	"time"

	"github.com/google/uuid"
)

// Session represents a long-lived authenticated device session.
// The plaintext session token is never stored in the database.
type Session struct {
	ID         uuid.UUID   `json:"id" db:"id"`
	UserID     uuid.UUID   `json:"user_id" db:"user_id"`
	TokenHash  string      `json:"-" db:"token_hash"`
	DeviceName *string     `json:"device_name,omitempty" db:"device_name"`
	DeviceType *string     `json:"device_type,omitempty" db:"device_type"`
	IPAddress  *netip.Addr `json:"ip_address,omitempty" db:"ip_address"`
	UserAgent  *string     `json:"user_agent,omitempty" db:"user_agent"`
	LastUsedAt time.Time   `json:"last_used_at" db:"last_used_at"`
	CreatedAt  time.Time   `json:"created_at" db:"created_at"`
	RevokedAt  *time.Time  `json:"revoked_at,omitempty" db:"revoked_at"`
}
