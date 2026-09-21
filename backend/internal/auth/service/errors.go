package service

import "errors"

var (
	ErrInvalidCredentials             = errors.New("invalid credentials")
	ErrAccountSuspended               = errors.New("account has been suspended, please contact support")
	ErrAccountBanned                  = errors.New("account has been permanently banned")
	ErrAccountDeactivated             = errors.New("account is deactivated")
	ErrInvalidIdentifier              = errors.New("please provide a valid email address or phone number")
	ErrInvalidOTP                     = errors.New("invalid verification code")
	ErrExpiredOTP                     = errors.New("verification code has expired, please request a new one")
	ErrMaxAttemptsExceeded            = errors.New("too many failed verification attempts, please request a new code")
	ErrEmailSendFailed                = errors.New("failed to send verification email")
	ErrUserAlreadyExists              = errors.New("a user with this email or phone already exists")
	ErrDailyRegistrationLimitExceeded = errors.New("registration verification code request limit reached . Please try again tomorrow.")
	ErrDailyLoginLimitExceeded        = errors.New("login verification code request limit reached . Please try again tomorrow.")
)
