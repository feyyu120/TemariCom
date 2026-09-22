package model

import (
	"net/netip"
	"time"

	"github.com/google/uuid"
)

// AccountStatus represents the status of a user's account.
type AccountStatus string

const (
	AccountStatusPending     AccountStatus = "pending"
	AccountStatusActive      AccountStatus = "active"
	AccountStatusSuspended   AccountStatus = "suspended"
	AccountStatusBanned      AccountStatus = "banned"
	AccountStatusDeactivated AccountStatus = "deactivated"
)

// Standard System Roles
const (
	RoleStudent      = "student"
	RoleTutor        = "tutor"
	RoleOrganization = "organization"
	RoleAdmin        = "admin"
	RoleSuperAdmin   = "superadmin"
)

// User represents a user account in PostgreSQL.
// PasswordHash is optional and used only when two-step verification is enabled.
type User struct {
	ID            uuid.UUID     `json:"id" db:"id"`
	Email         *string       `json:"email" db:"email"`
	Phone         *string       `json:"phone,omitempty" db:"phone"`
	Username      *string       `json:"username,omitempty" db:"username"`
	FullName      *string       `json:"full_name,omitempty" db:"full_name"`
	AvatarKey     *string       `json:"avatar_key,omitempty" db:"avatar_key"`
	Bio           *string       `json:"bio,omitempty" db:"bio"`
	IsVerified    bool          `json:"is_verified" db:"is_verified"`
	PasswordHash  *string       `json:"-" db:"password_hash"`
	AccountStatus AccountStatus `json:"account_status" db:"account_status"`
	LastLoginAt   *time.Time    `json:"last_login_at,omitempty" db:"last_login_at"`
	LastLoginIP   *netip.Addr   `json:"last_login_ip,omitempty" db:"last_login_ip"`
	CreatedAt     time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at" db:"updated_at"`
}

// Role represents a system role in PostgreSQL.
type Role struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// UserRole represents the many-to-many relationship between users and roles.
type UserRole struct {
	UserID     uuid.UUID  `json:"user_id" db:"user_id"`
	RoleID     uuid.UUID  `json:"role_id" db:"role_id"`
	AssignedAt time.Time  `json:"assigned_at" db:"assigned_at"`
	AssignedBy *uuid.UUID `json:"assigned_by,omitempty" db:"assigned_by"`
}

// UserSecurity stores optional two-step verification settings for a user.
type UserSecurity struct {
	UserID         uuid.UUID `json:"user_id" db:"user_id"`
	TwoStepEnabled bool      `json:"two_step_enabled" db:"two_step_enabled"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}
