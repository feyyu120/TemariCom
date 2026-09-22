package repository

import (
	"context"
	"fmt"

	"TemariCom/internal/auth/model"

	"github.com/jackc/pgx/v5/pgxpool"
)

type LoginAttemptRepository interface {
	Record(ctx context.Context, attempt *model.LoginAttempt) error
}

type pgxLoginAttemptRepository struct {
	db *pgxpool.Pool
}

func NewLoginAttemptRepository(db *pgxpool.Pool) LoginAttemptRepository {
	return &pgxLoginAttemptRepository{db: db}
}

// Record inserts a new login audit record into login_attempts.
func (r *pgxLoginAttemptRepository) Record(ctx context.Context, attempt *model.LoginAttempt) error {
	query := `
		INSERT INTO login_attempts (
			user_id,
			identifier,
			ip_address,
			user_agent,
			success,
			failure_reason
		) VALUES (
			$1, $2, $3, $4, $5, $6
		)
		RETURNING id, created_at
	`

	err := r.db.QueryRow(
		ctx,
		query,
		attempt.UserID,
		attempt.Identifier,
		attempt.IPAddress,
		attempt.UserAgent,
		attempt.Success,
		attempt.FailureReason,
	).Scan(&attempt.ID, &attempt.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to record login attempt: %w", err)
	}

	return nil
}
