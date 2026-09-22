package model

import (
	"net/netip"
	"time"

	"github.com/google/uuid"
)

// LoginRequestStatus defines the state of a cross-device login approval request.
type LoginRequestStatus string

const (
	LoginRequestPending  LoginRequestStatus = "pending"
	LoginRequestApproved LoginRequestStatus = "approved"
	LoginRequestRejected LoginRequestStatus = "rejected"
	LoginRequestExpired  LoginRequestStatus = "expired"
)

// LoginRequest represents a cross-device approval request (e.g. approving login from an existing device).
type LoginRequest struct {
	ID                   uuid.UUID          `json:"id" db:"id"`
	UserID               uuid.UUID          `json:"user_id" db:"user_id"`
	RequestingDeviceName *string            `json:"requesting_device_name,omitempty" db:"requesting_device_name"`
	RequestingDeviceType *string            `json:"requesting_device_type,omitempty" db:"requesting_device_type"`
	RequestingIP         *netip.Addr        `json:"requesting_ip,omitempty" db:"requesting_ip"`
	RequestingUserAgent  *string            `json:"requesting_user_agent,omitempty" db:"requesting_user_agent"`
	Status               LoginRequestStatus `json:"status" db:"status"`
	ExpiresAt            time.Time          `json:"expires_at" db:"expires_at"`
	ApprovedAt           *time.Time         `json:"approved_at,omitempty" db:"approved_at"`
	RejectedAt           *time.Time         `json:"rejected_at,omitempty" db:"rejected_at"`
	CreatedAt            time.Time          `json:"created_at" db:"created_at"`
}
