package dto

import (
	"net/netip"
	"time"

	"github.com/google/uuid"
)

// UserResponse represents safe user details exposed to clients.
type UserResponse struct {
	ID             uuid.UUID   `json:"id"`
	Email          *string     `json:"email,omitempty"`
	Phone          *string     `json:"phone,omitempty"`
	Username       *string     `json:"username,omitempty"`
	FullName       *string     `json:"full_name,omitempty"`
	AvatarURL      *string     `json:"avatar_url,omitempty"`
	Bio            *string     `json:"bio,omitempty"`
	IsVerified     bool        `json:"is_verified"`
	AccountStatus  string      `json:"account_status"`
	Roles          []string    `json:"roles"`
	TwoStepEnabled bool        `json:"two_step_enabled"`
	LastLoginAt    *time.Time  `json:"last_login_at,omitempty"`
	LastLoginIP    *netip.Addr `json:"last_login_ip,omitempty"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

// SendOTPResponse is returned after generating an OTP code.
type SendOTPResponse struct {
	Identifier        string `json:"identifier"`
	Purpose           string `json:"purpose"`
	Channel           string `json:"channel"` // "app" or "email"
	HasActiveSessions bool   `json:"has_active_sessions"`
	ExpiresIn         int64  `json:"expires_in"` // Duration in seconds
	Message           string `json:"message"`
}

// SessionResponse represents metadata about an active session/device.
type SessionResponse struct {
	ID         uuid.UUID   `json:"id"`
	DeviceName *string     `json:"device_name,omitempty"`
	DeviceType *string     `json:"device_type,omitempty"`
	IPAddress  *netip.Addr `json:"ip_address,omitempty"`
	UserAgent  *string     `json:"user_agent,omitempty"`
	LastUsedAt time.Time   `json:"last_used_at"`
	CreatedAt  time.Time   `json:"created_at"`
	IsCurrent  bool        `json:"is_current,omitempty"`
}

// AuthSessionResponse is returned upon successful authentication (Telegram-like session response).
type AuthSessionResponse struct {
	SessionToken    string          `json:"session_token,omitempty"`
	RequiresTwoStep bool            `json:"requires_two_step"`
	User            UserResponse    `json:"user"`
	Session         SessionResponse `json:"session,omitempty"`
}

// LoginRequestResponse represents a cross-device login approval request.
type LoginRequestResponse struct {
	ID                   uuid.UUID   `json:"id"`
	RequestingDeviceName *string     `json:"requesting_device_name,omitempty"`
	RequestingDeviceType *string     `json:"requesting_device_type,omitempty"`
	RequestingIP         *netip.Addr `json:"requesting_ip,omitempty"`
	Status               string      `json:"status"`
	ExpiresAt            time.Time   `json:"expires_at"`
	CreatedAt            time.Time   `json:"created_at"`
}

// MessageResponse represents a generic success/acknowledgement response.
type MessageResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}
