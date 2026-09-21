package dto

import "github.com/google/uuid"

// RegisterRequest holds registration data (email only).
type RegisterRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// LoginRequest initiates login by providing an existing email or phone number.
type LoginRequest struct {
	Identifier string `json:"identifier" validate:"required"`
}

// SendOTPRequest requests a temporary verification code to be sent to email or phone.
type SendOTPRequest struct {
	Identifier string `json:"identifier" validate:"required"`
	Purpose    string `json:"purpose" validate:"required,oneof=registration login recovery"`
}

// VerifyOTPRequest submits the OTP code to authenticate or complete registration/login.
// Device name and type are automatically extracted from the HTTP User-Agent header.
type VerifyOTPRequest struct {
	Identifier string  `json:"identifier" validate:"required"`
	Code       string  `json:"code" validate:"required,len=6"`
	Purpose    string  `json:"purpose" validate:"required,oneof=registration login recovery"`
	Email      *string `json:"email,omitempty"`
	Phone      *string `json:"phone,omitempty"`
}

// ApproveLoginRequest is used by an existing device to approve or reject a new device login request.
type ApproveLoginRequest struct {
	RequestID uuid.UUID `json:"request_id" validate:"required"`
	Approved  bool      `json:"approved"`
}

// EnableTwoStepRequest sets a password for two-step verification.
type EnableTwoStepRequest struct {
	Password string `json:"password" validate:"required,min=8,max=72"`
}

// VerifyTwoStepRequest submits the optional two-step verification password.
type VerifyTwoStepRequest struct {
	Password string `json:"password" validate:"required"`
}

// CreateRoleRequest is used by admins to define a system role.
type CreateRoleRequest struct {
	Name        string `json:"name" validate:"required,min=2,max=50"`
	Description string `json:"description,omitempty"`
}

// AssignRoleRequest is used by admins to assign a role to a user.
type AssignRoleRequest struct {
	UserID uuid.UUID `json:"user_id" validate:"required"`
	RoleID uuid.UUID `json:"role_id" validate:"required"`
}
