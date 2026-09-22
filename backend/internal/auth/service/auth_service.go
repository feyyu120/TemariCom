package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"TemariCom/internal/auth/dto"
	"TemariCom/internal/auth/model"
	"TemariCom/internal/auth/repository"
	"TemariCom/pkg/email"
	"TemariCom/pkg/storage"
	"TemariCom/pkg/utils"

	"github.com/google/uuid"
)

const (
	OTPExpiryDuration       = 5 * time.Minute
	MaxOTPAttempts          = 5
	MaxDailyRegistrationOTP = 5 // Max 5 verification codes per 3h per identifier
	MaxDailyLoginOTP        = 3 // Max 3 verification codes per 3h per identifier
	OTPRateLimitWindow      = 3 * time.Hour
)

type AuthService interface {
	RequestRegistrationOTP(ctx context.Context, req dto.RegisterRequest, ip, userAgent string) (*dto.SendOTPResponse, error)
	RequestLoginOTP(ctx context.Context, req dto.LoginRequest, ip, userAgent string) (*dto.SendOTPResponse, error)
	VerifyOTP(ctx context.Context, req dto.VerifyOTPRequest, ip, userAgent string) (*dto.AuthSessionResponse, error)
	ValidateSession(ctx context.Context, sessionToken string) (*dto.UserResponse, error)
	Logout(ctx context.Context, sessionToken string) error
	GetActiveSessions(ctx context.Context, userID uuid.UUID) ([]model.Session, error)
}

type authService struct {
	userRepo         repository.UserRepository
	verificationRepo repository.VerificationCodeRepository
	sessionRepo      repository.SessionRepository
	loginAttemptRepo repository.LoginAttemptRepository
	emailService     email.EmailService
	r2Storage        *storage.R2Client
}

func NewAuthService(
	userRepo repository.UserRepository,
	verificationRepo repository.VerificationCodeRepository,
	sessionRepo repository.SessionRepository,
	loginAttemptRepo repository.LoginAttemptRepository,
	emailService email.EmailService,
	r2Storage *storage.R2Client,
) AuthService {
	return &authService{
		userRepo:         userRepo,
		verificationRepo: verificationRepo,
		sessionRepo:      sessionRepo,
		loginAttemptRepo: loginAttemptRepo,
		emailService:     emailService,
		r2Storage:        r2Storage,
	}
}

// RequestRegistrationOTP generates an OTP for registration, stores the hash, and delivers it via Brevo email.
// Rate limited to a maximum of 5 requests per 3 hours per identifier.
func (s *authService) RequestRegistrationOTP(ctx context.Context, req dto.RegisterRequest, ip, userAgent string) (*dto.SendOTPResponse, error) {
	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))
	if cleanEmail == "" {
		_ = s.recordLoginAttempt(ctx, nil, "unknown", ip, userAgent, false, "Invalid email in registration")
		return nil, ErrInvalidIdentifier
	}

	// 1. Check if user is already registered with this email
	existingByEmail, err := s.userRepo.GetByEmail(ctx, cleanEmail)
	if err == nil && existingByEmail != nil {
		_ = s.recordLoginAttempt(ctx, &existingByEmail.ID, cleanEmail, ip, userAgent, false, "Duplicate registration attempt by email")
		return nil, repository.ErrDuplicateEmail
	}

	// 2. Check rate limit (maximum 5 registration codes per 3h window)
	recentCount, err := s.verificationRepo.CountRecentCodes(ctx, cleanEmail, model.PurposeRegistration, OTPRateLimitWindow)
	if err != nil {
		log.Printf("[AuthService.RequestRegistrationOTP] Warning: Failed to check recent code count: %v", err)
	} else if recentCount >= MaxDailyRegistrationOTP {
		_ = s.recordLoginAttempt(ctx, nil, cleanEmail, ip, userAgent, false, "Registration code limit exceeded (5 requests)")
		return nil, ErrDailyRegistrationLimitExceeded
	}

	// 3. Invalidate any previously generated active codes for this email
	_ = s.verificationRepo.InvalidateActiveCodes(ctx, cleanEmail, model.PurposeRegistration)

	// 4. Generate cryptographically secure 6-digit OTP
	otpCode, err := utils.GenerateOTP()
	if err != nil {
		return nil, fmt.Errorf("failed to generate verification code: %w", err)
	}

	// 5. Hash the OTP with SHA-256 for secure database storage
	codeHash := utils.HashOTP(otpCode)

	// 6. Store hashed OTP in verification_codes table
	verificationCode := &model.VerificationCode{
		Identifier: cleanEmail,
		CodeHash:   codeHash,
		Purpose:    model.PurposeRegistration,
		Channel:    model.ChannelEmail,
		Attempts:   0,
		ExpiresAt:  time.Now().UTC().Add(OTPExpiryDuration),
	}

	if err := s.verificationRepo.Create(ctx, verificationCode); err != nil {
		return nil, fmt.Errorf("failed to save verification code: %w", err)
	}

	// 7. Deliver OTP code via Brevo email
	if s.emailService != nil {
		if _, err := s.emailService.SendOTP(cleanEmail, otpCode, "registration"); err != nil {
			log.Printf("[AuthService.RequestRegistrationOTP] Error sending email via Brevo: %v", err)
			_ = s.recordLoginAttempt(ctx, nil, cleanEmail, ip, userAgent, false, "Email send failed")
			return nil, ErrEmailSendFailed
		}
	} else {
		log.Printf("[AuthService] Registration OTP for '%s': %s", cleanEmail, otpCode)
	}

	return &dto.SendOTPResponse{
		Identifier:        cleanEmail,
		Purpose:           string(model.PurposeRegistration),
		Channel:           "email",
		HasActiveSessions: false,
		ExpiresIn:         int64(OTPExpiryDuration.Seconds()),
		Message:           fmt.Sprintf("Verification code sent successfully to %s", cleanEmail),
	}, nil
}

// RequestLoginOTP initiates login: checks user existence, active sessions, saves hashed OTP, and delivers it.
// Rate limited to a maximum of 3 requests per 24 hours per identifier.
func (s *authService) RequestLoginOTP(ctx context.Context, req dto.LoginRequest, ip, userAgent string) (*dto.SendOTPResponse, error) {
	identifier := strings.TrimSpace(req.Identifier)
	if identifier == "" {
		_ = s.recordLoginAttempt(ctx, nil, "unknown", ip, userAgent, false, "Empty login identifier")
		return nil, ErrInvalidIdentifier
	}

	// 1. Check if user exists
	user, err := s.userRepo.GetByIdentifier(ctx, identifier)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			_ = s.recordLoginAttempt(ctx, nil, identifier, ip, userAgent, false, "User not found")
			return nil, repository.ErrUserNotFound
		}
		return nil, fmt.Errorf("database error looking up user: %w", err)
	}

	// 2. Check account status
	if user.AccountStatus == model.AccountStatusSuspended {
		_ = s.recordLoginAttempt(ctx, &user.ID, identifier, ip, userAgent, false, "Account suspended")
		return nil, ErrAccountSuspended
	}
	if user.AccountStatus == model.AccountStatusBanned {
		_ = s.recordLoginAttempt(ctx, &user.ID, identifier, ip, userAgent, false, "Account banned")
		return nil, ErrAccountBanned
	}

	// 3. Check 3-hour rate limit (maximum 3 login codes per 3 hours)
	recentCount, err := s.verificationRepo.CountRecentCodes(ctx, identifier, model.PurposeLogin, OTPRateLimitWindow)
	if err != nil {
		log.Printf("[AuthService.RequestLoginOTP] Warning: Failed to check recent code count: %v", err)
	} else if recentCount >= MaxDailyLoginOTP {
		_ = s.recordLoginAttempt(ctx, &user.ID, identifier, ip, userAgent, false, "24h login code limit exceeded (3 requests)")
		return nil, ErrDailyLoginLimitExceeded
	}

	// 4. Check for existing active sessions on other devices (revoked_at IS NULL)
	activeSessionCount, err := s.sessionRepo.CountActiveSessionsForUser(ctx, user.ID)
	if err != nil {
		log.Printf("[AuthService.RequestLoginOTP] Warning: Failed to count active sessions: %v", err)
	}
	hasActiveSessions := activeSessionCount > 0

	// 5. Invalidate any previously generated active login codes for this identifier
	_ = s.verificationRepo.InvalidateActiveCodes(ctx, identifier, model.PurposeLogin)

	// 6. Generate secure 6-digit OTP
	otpCode, err := utils.GenerateOTP()
	if err != nil {
		return nil, fmt.Errorf("failed to generate login code: %w", err)
	}

	// 7. Hash OTP with SHA-256
	codeHash := utils.HashOTP(otpCode)

	// Determine delivery channel
	channelType := model.ChannelEmail
	if hasActiveSessions {
		channelType = model.ChannelApp
	}

	// 8. Save hashed verification code
	verificationCode := &model.VerificationCode{
		UserID:     &user.ID,
		Identifier: identifier,
		CodeHash:   codeHash,
		Purpose:    model.PurposeLogin,
		Channel:    channelType,
		Attempts:   0,
		ExpiresAt:  time.Now().UTC().Add(OTPExpiryDuration),
	}

	if err := s.verificationRepo.Create(ctx, verificationCode); err != nil {
		return nil, fmt.Errorf("failed to save login verification code: %w", err)
	}

	// 8. Smart Delivery Routing:
	// - If user has active session(s) on other device(s) -> Do NOT send email; route code to in-app.
	// - If no active sessions exist (user logged out / expired) -> Send code to email via Resend.
	var message string
	var channel string

	if hasActiveSessions {
		channel = "app"
		log.Printf("[TemariCom In-App Notification] Login OTP for user '%s' (%s): %s", user.ID, identifier, otpCode)
		message = "We have sent a verification code to your TemariCom app on your other device(s). Please check your app to continue."
	} else {
		channel = "email"
		if user.Email != nil && *user.Email != "" && s.emailService != nil {
			if _, err := s.emailService.SendOTP(*user.Email, otpCode, "login"); err != nil {
				log.Printf("[AuthService.RequestLoginOTP] Error sending login email via Resend: %v", err)
				_ = s.recordLoginAttempt(ctx, &user.ID, identifier, ip, userAgent, false, "Email send failed")
				return nil, ErrEmailSendFailed
			}
		} else {
			log.Printf("[AuthService] Fallback Login OTP for user '%s' (%s): %s", user.ID, identifier, otpCode)
		}
		message = fmt.Sprintf("We have sent a verification code to your email (%s).", identifier)
	}

	return &dto.SendOTPResponse{
		Identifier:        identifier,
		Purpose:           string(model.PurposeLogin),
		Channel:           channel,
		HasActiveSessions: hasActiveSessions,
		ExpiresIn:         int64(OTPExpiryDuration.Seconds()),
		Message:           message,
	}, nil
}

// VerifyOTP verifies the OTP code, creates an authenticated session, records audit logs, and returns session data.
func (s *authService) VerifyOTP(ctx context.Context, req dto.VerifyOTPRequest, ip, userAgent string) (*dto.AuthSessionResponse, error) {
	identifier := strings.ToLower(strings.TrimSpace(req.Identifier))
	code := strings.TrimSpace(req.Code)
	purpose := model.VerificationPurpose(strings.ToLower(strings.TrimSpace(req.Purpose)))

	if purpose == "" {
		purpose = model.PurposeRegistration
	}

	if code == "" {
		_ = s.recordLoginAttempt(ctx, nil, identifier, ip, userAgent, false, "Missing verification code")
		return nil, ErrInvalidOTP
	}

	// 1. Retrieve the latest valid verification code record
	codeRecord, err := s.verificationRepo.GetLatestValid(ctx, identifier, purpose)
	if err != nil {
		if errors.Is(err, repository.ErrVerificationCodeNotFound) {
			_ = s.recordLoginAttempt(ctx, nil, identifier, ip, userAgent, false, "Expired or missing OTP")
			return nil, ErrExpiredOTP
		}
		return nil, fmt.Errorf("error verifying code: %w", err)
	}

	// 2. Rate-limiting check for failed attempts
	if codeRecord.Attempts >= MaxOTPAttempts {
		_ = s.verificationRepo.MarkUsed(ctx, codeRecord.ID) // Invalidate abused code
		_ = s.recordLoginAttempt(ctx, codeRecord.UserID, identifier, ip, userAgent, false, "Max OTP attempts exceeded")
		return nil, ErrMaxAttemptsExceeded
	}

	// 3. Verify OTP hash in constant time
	if !utils.VerifyOTP(code, codeRecord.CodeHash) {
		_ = s.verificationRepo.IncrementAttempts(ctx, codeRecord.ID)
		_ = s.recordLoginAttempt(ctx, codeRecord.UserID, identifier, ip, userAgent, false, "Invalid OTP code")
		return nil, ErrInvalidOTP
	}

	// 4. Mark verification code as used
	if err := s.verificationRepo.MarkUsed(ctx, codeRecord.ID); err != nil {
		log.Printf("[AuthService] Warning: Failed to mark code as used: %v", err)
	}

	// 5. Look up or create user record
	user, err := s.userRepo.GetByIdentifier(ctx, identifier)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			if purpose == model.PurposeLogin {
				_ = s.recordLoginAttempt(ctx, nil, identifier, ip, userAgent, false, "User not found during login verification")
				return nil, repository.ErrUserNotFound
			}

			// New registration: create user in transaction with email only and default 'student' role.
			// Profile details (username, phone, campus, department) will be completed in Profile Setup.
			cleanEmail := strings.ToLower(strings.TrimSpace(identifier))
			if req.Email != nil && strings.TrimSpace(*req.Email) != "" {
				cleanEmail = strings.ToLower(strings.TrimSpace(*req.Email))
			}

			userToCreate := &model.User{
				Email:         &cleanEmail,
				Phone:         nil, // Set during profile setup
				Username:      nil, // Set during profile setup
				AccountStatus: model.AccountStatusActive,
			}

			createdUser, createErr := s.userRepo.CreateWithRole(ctx, userToCreate, model.RoleStudent)
			if createErr != nil {
				_ = s.recordLoginAttempt(ctx, nil, identifier, ip, userAgent, false, "Failed to create user in DB")
				return nil, fmt.Errorf("failed to register user: %w", createErr)
			}
			user = createdUser
		} else {
			return nil, fmt.Errorf("database error checking user: %w", err)
		}
	}

	// 6. Check account status
	if user.AccountStatus == model.AccountStatusSuspended {
		_ = s.recordLoginAttempt(ctx, &user.ID, identifier, ip, userAgent, false, "Account suspended")
		return nil, ErrAccountSuspended
	}
	if user.AccountStatus == model.AccountStatusBanned {
		_ = s.recordLoginAttempt(ctx, &user.ID, identifier, ip, userAgent, false, "Account banned")
		return nil, ErrAccountBanned
	}

	// 7. Parse client IP with robust parser
	ipAddr := utils.ParseIPAddress(ip)

	// 8. Generate 32-byte cryptographically secure random session token
	rawSessionToken, err := utils.GenerateSessionToken(32)
	if err != nil {
		return nil, fmt.Errorf("failed to generate session token: %w", err)
	}

	// 9. Store SHA-256 session token hash in database
	tokenHash := utils.HashSessionToken(rawSessionToken)

	var uaPtr *string
	if cleanUA := strings.TrimSpace(userAgent); cleanUA != "" {
		uaPtr = &cleanUA
	}

	// Automatically extract device name and device type from User-Agent
	deviceName, deviceType := utils.ParseUserAgent(userAgent)

	sessionModel := &model.Session{
		UserID:     user.ID,
		TokenHash:  tokenHash,
		DeviceName: &deviceName,
		DeviceType: &deviceType,
		IPAddress:  ipAddr,
		UserAgent:  uaPtr,
	}

	if err := s.sessionRepo.Create(ctx, sessionModel); err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	// 10. Update user last login and record successful audit log
	_ = s.userRepo.UpdateLastLogin(ctx, user.ID, ipAddr)
	_ = s.recordLoginAttempt(ctx, &user.ID, identifier, ip, userAgent, true, "")

	// 11. Retrieve user assigned roles
	roles, err := s.userRepo.GetUserRoles(ctx, user.ID)
	if err != nil || len(roles) == 0 {
		roles = []string{model.RoleStudent}
	}

	return &dto.AuthSessionResponse{
		SessionToken:    rawSessionToken,
		RequiresTwoStep: false,
		User:            s.toUserResponse(user, roles),
		Session: dto.SessionResponse{
			ID:         sessionModel.ID,
			DeviceName: sessionModel.DeviceName,
			DeviceType: sessionModel.DeviceType,
			IPAddress:  sessionModel.IPAddress,
			UserAgent:  sessionModel.UserAgent,
			LastUsedAt: sessionModel.LastUsedAt,
			CreatedAt:  sessionModel.CreatedAt,
			IsCurrent:  true,
		},
	}, nil
}

// ValidateSession verifies the raw session token, updates its last_used_at timestamp, and returns the current user profile.
func (s *authService) ValidateSession(ctx context.Context, rawSessionToken string) (*dto.UserResponse, error) {
	token := strings.TrimSpace(rawSessionToken)
	if token == "" {
		return nil, repository.ErrSessionNotFound
	}

	tokenHash := utils.HashSessionToken(token)
	session, err := s.sessionRepo.GetByTokenHash(ctx, tokenHash)
	if err != nil {
		return nil, err
	}

	user, err := s.userRepo.GetByID(ctx, session.UserID)
	if err != nil {
		return nil, err
	}

	roles, err := s.userRepo.GetUserRoles(ctx, user.ID)
	if err != nil || len(roles) == 0 {
		roles = []string{model.RoleStudent}
	}

	resp := s.toUserResponse(user, roles)
	return &resp, nil
}

func (s *authService) resolveAvatarURL(avatarKey *string) *string {
	if avatarKey == nil || *avatarKey == "" {
		return nil
	}
	if s.r2Storage != nil {
		resolved := s.r2Storage.AvatarURL(*avatarKey)
		return &resolved
	}
	return avatarKey
}

func (s *authService) toUserResponse(user *model.User, roles []string) dto.UserResponse {
	return dto.UserResponse{
		ID:            user.ID,
		Email:         user.Email,
		Phone:         user.Phone,
		Username:      user.Username,
		FullName:      user.FullName,
		AvatarURL:     s.resolveAvatarURL(user.AvatarKey),
		Bio:           user.Bio,
		IsVerified:    user.IsVerified,
		AccountStatus: string(user.AccountStatus),
		Roles:         roles,
		LastLoginAt:   user.LastLoginAt,
		LastLoginIP:   user.LastLoginIP,
		CreatedAt:     user.CreatedAt,
		UpdatedAt:     user.UpdatedAt,
	}
}

// Logout revokes the session associated with the provided raw session token (sets revoked_at = NOW()).
func (s *authService) Logout(ctx context.Context, rawSessionToken string) error {
	token := strings.TrimSpace(rawSessionToken)
	if token == "" {
		return errors.New("empty session token")
	}

	tokenHash := utils.HashSessionToken(token)
	session, err := s.sessionRepo.GetByTokenHash(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, repository.ErrSessionNotFound) {
			// Session already revoked or non-existent
			return nil
		}
		return fmt.Errorf("failed to look up session: %w", err)
	}

	if err := s.sessionRepo.Revoke(ctx, session.ID); err != nil {
		return fmt.Errorf("failed to revoke session: %w", err)
	}

	log.Printf("[AuthService] Session '%s' for user '%s' revoked successfully on logout", session.ID, session.UserID)
	return nil
}

// GetActiveSessions returns all active sessions for a user.
func (s *authService) GetActiveSessions(ctx context.Context, userID uuid.UUID) ([]model.Session, error) {
	return s.sessionRepo.GetActiveSessionsForUser(ctx, userID)
}

// recordLoginAttempt persists audit logs to PostgreSQL with safe IP parsing.
func (s *authService) recordLoginAttempt(
	ctx context.Context,
	userID *uuid.UUID,
	identifier string,
	ip string,
	userAgent string,
	success bool,
	failureReason string,
) error {
	var reason *string
	if failureReason != "" {
		reason = &failureReason
	}

	ipAddr := utils.ParseIPAddress(ip)

	var uaPtr *string
	if cleanUA := strings.TrimSpace(userAgent); cleanUA != "" {
		uaPtr = &cleanUA
	}

	attempt := &model.LoginAttempt{
		UserID:        userID,
		Identifier:    identifier,
		IPAddress:     ipAddr,
		UserAgent:     uaPtr,
		Success:       success,
		FailureReason: reason,
	}

	auditCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := s.loginAttemptRepo.Record(auditCtx, attempt); err != nil {
		log.Printf("[AuthService.recordLoginAttempt] Warning: Failed to record login attempt in database: %v", err)
		return err
	}

	return nil
}
