package model

import (
	"time"

	"github.com/google/uuid"
)

// VerificationPurpose defines the intent of a temporary OTP code.
type VerificationPurpose string

const (
	PurposeRegistration VerificationPurpose = "registration"
	PurposeLogin        VerificationPurpose = "login"
	PurposeRecovery     VerificationPurpose = "recovery"
)

// VerificationChannel defines the delivery medium for the OTP code.
type VerificationChannel string

const (
	ChannelApp   VerificationChannel = "app"
	ChannelEmail VerificationChannel = "email"
)

// VerificationCode stores temporary hashed OTP codes.
// The plaintext code is never stored in the database.
type VerificationCode struct {
	ID         uuid.UUID           `json:"id" db:"id"`
	UserID     *uuid.UUID          `json:"user_id,omitempty" db:"user_id"`
	Identifier string              `json:"identifier" db:"identifier"`
	CodeHash   string              `json:"-" db:"code_hash"`
	Purpose    VerificationPurpose `json:"purpose" db:"purpose"`
	Channel    VerificationChannel `json:"channel" db:"channel"`
	Attempts   int                 `json:"attempts" db:"attempts"`
	ExpiresAt  time.Time           `json:"expires_at" db:"expires_at"`
	UsedAt     *time.Time          `json:"used_at,omitempty" db:"used_at"`
	CreatedAt  time.Time           `json:"created_at" db:"created_at"`
}
