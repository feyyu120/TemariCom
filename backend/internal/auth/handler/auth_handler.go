package handler

import (
	"errors"
	"log"
	"strings"

	"TemariCom/internal/auth/dto"
	"TemariCom/internal/auth/repository"
	"TemariCom/internal/auth/service"
	"TemariCom/pkg/validator"

	"github.com/gofiber/fiber/v3"
)

type AuthHandler struct {
	authService service.AuthService
}

func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Register handles user registration: POST /api/v1/auth/register
// Sends a 6-digit OTP verification code to the provided email.
func (h *AuthHandler) Register(c fiber.Ctx) error {
	var req dto.RegisterRequest

	// 1. Parse JSON body
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body format",
		})
	}

	// 2. Validate request payload (email required & valid format)
	if valErrors := validator.ValidateStruct(req); len(valErrors) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success":           false,
			"error":             "Validation failed",
			"validation_errors": valErrors,
		})
	}

	// 3. Extract metadata
	ip := c.IP()
	userAgent := c.Get("User-Agent")

	// 4. Request registration OTP
	response, err := h.authService.RequestRegistrationOTP(c.Context(), req, ip, userAgent)
	if err != nil {
		if errors.Is(err, repository.ErrDuplicateEmail) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"success": false,
				"error":   "An account with this email already exists. Please log in.",
			})
		}

		if errors.Is(err, service.ErrDailyRegistrationLimitExceeded) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success": false,
				"error":   err.Error(),
			})
		}

		if errors.Is(err, service.ErrEmailSendFailed) {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"success": false,
				"error":   "Failed to send verification email. Please verify your email address and try again.",
			})
		}

		log.Printf("[AuthHandler.Register] Internal error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "An unexpected error occurred while generating verification code.",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": response.Message,
		"data":    response,
	})
}

// Login handles user login initiation: POST /api/v1/auth/login
// Looks up existing user, checks active sessions, and sends OTP.
func (h *AuthHandler) Login(c fiber.Ctx) error {
	var req dto.LoginRequest

	// 1. Parse JSON body
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body format",
		})
	}

	// 2. Validate request payload
	if valErrors := validator.ValidateStruct(req); len(valErrors) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success":           false,
			"error":             "Validation failed",
			"validation_errors": valErrors,
		})
	}

	// 3. Extract metadata
	ip := c.IP()
	userAgent := c.Get("User-Agent")

	// 4. Request login OTP
	response, err := h.authService.RequestLoginOTP(c.Context(), req, ip, userAgent)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"error":   "No account found with this identifier. Please register first.",
			})
		}

		if errors.Is(err, service.ErrDailyLoginLimitExceeded) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success": false,
				"error":   err.Error(),
			})
		}

		if errors.Is(err, service.ErrAccountSuspended) || errors.Is(err, service.ErrAccountBanned) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error":   err.Error(),
			})
		}

		if errors.Is(err, service.ErrEmailSendFailed) {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"success": false,
				"error":   "Failed to send login verification email. Please try again later.",
			})
		}

		log.Printf("[AuthHandler.Login] Internal error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "An unexpected error occurred during login. Please try again.",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": response.Message,
		"data":    response,
	})
}

// VerifyOTP handles OTP verification
// Verifies OTP for registration/login, creates a session, and returns authentication metadata.
func (h *AuthHandler) VerifyOTP(c fiber.Ctx) error {
	var req dto.VerifyOTPRequest

	// 1. Parse JSON body
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body format",
		})
	}

	// 2. Validate request payload
	if valErrors := validator.ValidateStruct(req); len(valErrors) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success":           false,
			"error":             "Validation failed",
			"validation_errors": valErrors,
		})
	}

	// 3. Extract client metadata
	ip := c.IP()
	userAgent := c.Get("User-Agent")

	// 4. Verify OTP and create authenticated session
	authSession, err := h.authService.VerifyOTP(c.Context(), req, ip, userAgent)
	if err != nil {
		if errors.Is(err, service.ErrInvalidOTP) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid verification code. Please check and try again.",
			})
		}

		if errors.Is(err, service.ErrExpiredOTP) {
			return c.Status(fiber.StatusGone).JSON(fiber.Map{
				"success": false,
				"error":   "Verification code has expired. Please request a new one.",
			})
		}

		if errors.Is(err, service.ErrMaxAttemptsExceeded) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success": false,
				"error":   "Too many failed attempts. This code has been invalidated. Please request a new code.",
			})
		}

		if errors.Is(err, repository.ErrUserNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"error":   "User account not found.",
			})
		}

		if errors.Is(err, service.ErrAccountSuspended) || errors.Is(err, service.ErrAccountBanned) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error":   err.Error(),
			})
		}

		log.Printf("[AuthHandler.VerifyOTP] Internal error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "An unexpected error occurred during verification. Please try again.",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Authentication successful",
		"data":    authSession,
	})
}

// Me validates the active session token and returns current user data: GET
func (h *AuthHandler) Me(c fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	var token string
	if strings.HasPrefix(authHeader, "Bearer ") {
		token = strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	}

	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Missing or invalid session authorization token",
		})
	}

	user, err := h.authService.ValidateSession(c.Context(), token)
	if err != nil {
		if errors.Is(err, repository.ErrSessionNotFound) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Session has expired or was revoked",
			})
		}
		log.Printf("[AuthHandler.Me] Error validating session: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to validate session",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    user,
	})
}

// Logout revokes the current session: POST /
func (h *AuthHandler) Logout(c fiber.Ctx) error {
	// Extract Bearer token from Authorization header or body
	authHeader := c.Get("Authorization")
	var token string
	if strings.HasPrefix(authHeader, "Bearer ") {
		token = strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	}

	if token == "" {
		var body struct {
			SessionToken string `json:"session_token"`
		}
		if err := c.Bind().Body(&body); err == nil && body.SessionToken != "" {
			token = strings.TrimSpace(body.SessionToken)
		}
	}

	if token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Missing session token to logout",
		})
	}

	if err := h.authService.Logout(c.Context(), token); err != nil {
		log.Printf("[AuthHandler.Logout] Error revoking session: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to revoke session",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Logged out successfully",
	})
}
