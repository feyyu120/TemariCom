package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"TemariCom/internal/auth/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrVerificationCodeNotFound = errors.New("verification code not found or expired")
)

type VerificationCodeRepository interface {
	Create(ctx context.Context, code *model.VerificationCode) error
	GetLatestValid(ctx context.Context, identifier string, purpose model.VerificationPurpose) (*model.VerificationCode, error)
	IncrementAttempts(ctx context.Context, id uuid.UUID) error
	MarkUsed(ctx context.Context, id uuid.UUID) error
	InvalidateActiveCodes(ctx context.Context, identifier string, purpose model.VerificationPurpose) error
	CountRecentCodes(ctx context.Context, identifier string, purpose model.VerificationPurpose, duration time.Duration) (int, error)
}

type pgxVerificationCodeRepository struct {
	db *pgxpool.Pool
}

func NewVerificationCodeRepository(db *pgxpool.Pool) VerificationCodeRepository {
	return &pgxVerificationCodeRepository{db: db}
}

// Create inserts a new hashed verification code record.
func (r *pgxVerificationCodeRepository) Create(ctx context.Context, code *model.VerificationCode) error {
	query := `
		INSERT INTO verification_codes (
			user_id,
			identifier,
			code_hash,
			purpose,
			channel,
			attempts,
			expires_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7
		)
		RETURNING id, created_at
	`

	err := r.db.QueryRow(
		ctx,
		query,
		code.UserID,
		code.Identifier,
		code.CodeHash,
		code.Purpose,
		code.Channel,
		code.Attempts,
		code.ExpiresAt,
	).Scan(&code.ID, &code.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to insert verification code: %w", err)
	}

	return nil
}

// GetLatestValid retrieves the newest unexpired, unused verification code for an identifier and purpose.
func (r *pgxVerificationCodeRepository) GetLatestValid(ctx context.Context, identifier string, purpose model.VerificationPurpose) (*model.VerificationCode, error) {
	query := `
		SELECT 
			id, user_id, identifier, code_hash, purpose, channel, attempts, 
			expires_at, used_at, created_at
		FROM verification_codes
		WHERE identifier = $1 
		  AND purpose = $2 
		  AND used_at IS NULL 
		  AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
	`

	var code model.VerificationCode
	err := r.db.QueryRow(ctx, query, identifier, purpose).Scan(
		&code.ID,
		&code.UserID,
		&code.Identifier,
		&code.CodeHash,
		&code.Purpose,
		&code.Channel,
		&code.Attempts,
		&code.ExpiresAt,
		&code.UsedAt,
		&code.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrVerificationCodeNotFound
		}
		return nil, fmt.Errorf("failed to query latest valid verification code: %w", err)
	}

	return &code, nil
}

// IncrementAttempts tracks failed verification submissions.
func (r *pgxVerificationCodeRepository) IncrementAttempts(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE verification_codes
		SET attempts = attempts + 1
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to increment verification attempts: %w", err)
	}

	return nil
}

// MarkUsed flags a verification code as consumed upon successful verification.
func (r *pgxVerificationCodeRepository) MarkUsed(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE verification_codes
		SET used_at = NOW()
		WHERE id = $1 AND used_at IS NULL
	`

	_, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to mark verification code as used: %w", err)
	}

	return nil
}

// InvalidateActiveCodes invalidates existing unconsumed codes before generating a fresh OTP.
func (r *pgxVerificationCodeRepository) InvalidateActiveCodes(ctx context.Context, identifier string, purpose model.VerificationPurpose) error {
	query := `
		UPDATE verification_codes
		SET used_at = NOW()
		WHERE identifier = $1 
		  AND purpose = $2 
		  AND used_at IS NULL
	`

	_, err := r.db.Exec(ctx, query, identifier, purpose)
	if err != nil {
		return fmt.Errorf("failed to invalidate active verification codes: %w", err)
	}

	return nil
}

// CountRecentCodes counts how many verification codes were requested for an identifier and purpose within a time window (e.g. 24h).
func (r *pgxVerificationCodeRepository) CountRecentCodes(ctx context.Context, identifier string, purpose model.VerificationPurpose, duration time.Duration) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM verification_codes
		WHERE identifier = $1
		  AND purpose = $2
		  AND created_at >= $3
	`

	cutoff := time.Now().UTC().Add(-duration)

	var count int
	err := r.db.QueryRow(ctx, query, identifier, purpose, cutoff).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count recent verification codes: %w", err)
	}

	return count, nil
}
