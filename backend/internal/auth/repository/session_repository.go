package repository

import (
	"context"
	"errors"
	"fmt"
	"net/netip"

	"TemariCom/internal/auth/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrSessionNotFound = errors.New("session not found or has been revoked")
)

type SessionRepository interface {
	Create(ctx context.Context, session *model.Session) error
	GetByTokenHash(ctx context.Context, tokenHash string) (*model.Session, error)
	GetActiveSessionsForUser(ctx context.Context, userID uuid.UUID) ([]model.Session, error)
	CountActiveSessionsForUser(ctx context.Context, userID uuid.UUID) (int, error)
	UpdateLastUsed(ctx context.Context, sessionID uuid.UUID, ip *netip.Addr) error
	Revoke(ctx context.Context, sessionID uuid.UUID) error
	RevokeAllForUser(ctx context.Context, userID uuid.UUID) error
}

type pgxSessionRepository struct {
	db *pgxpool.Pool
}

func NewSessionRepository(db *pgxpool.Pool) SessionRepository {
	return &pgxSessionRepository{db: db}
}

// Create inserts a new authenticated device session.
func (r *pgxSessionRepository) Create(ctx context.Context, session *model.Session) error {
	query := `
		INSERT INTO sessions (
			user_id,
			token_hash,
			device_name,
			device_type,
			ip_address,
			user_agent,
			last_used_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, NOW()
		)
		RETURNING id, created_at, last_used_at
	`

	err := r.db.QueryRow(
		ctx,
		query,
		session.UserID,
		session.TokenHash,
		session.DeviceName,
		session.DeviceType,
		session.IPAddress,
		session.UserAgent,
	).Scan(&session.ID, &session.CreatedAt, &session.LastUsedAt)

	if err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}

	return nil
}

// GetByTokenHash looks up an active session by its SHA-256 token hash.
func (r *pgxSessionRepository) GetByTokenHash(ctx context.Context, tokenHash string) (*model.Session, error) {
	query := `
		SELECT 
			id, user_id, token_hash, device_name, device_type, 
			ip_address, user_agent, last_used_at, created_at, revoked_at
		FROM sessions
		WHERE token_hash = $1 AND revoked_at IS NULL
	`

	var session model.Session
	err := r.db.QueryRow(ctx, query, tokenHash).Scan(
		&session.ID,
		&session.UserID,
		&session.TokenHash,
		&session.DeviceName,
		&session.DeviceType,
		&session.IPAddress,
		&session.UserAgent,
		&session.LastUsedAt,
		&session.CreatedAt,
		&session.RevokedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSessionNotFound
		}
		return nil, fmt.Errorf("failed to retrieve session: %w", err)
	}

	return &session, nil
}

// GetActiveSessionsForUser returns all active sessions for a user.
func (r *pgxSessionRepository) GetActiveSessionsForUser(ctx context.Context, userID uuid.UUID) ([]model.Session, error) {
	query := `
		SELECT 
			id, user_id, token_hash, device_name, device_type, 
			ip_address, user_agent, last_used_at, created_at, revoked_at
		FROM sessions
		WHERE user_id = $1 AND revoked_at IS NULL
		ORDER BY last_used_at DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user sessions: %w", err)
	}
	defer rows.Close()

	var sessions []model.Session
	for rows.Next() {
		var s model.Session
		if err := rows.Scan(
			&s.ID,
			&s.UserID,
			&s.TokenHash,
			&s.DeviceName,
			&s.DeviceType,
			&s.IPAddress,
			&s.UserAgent,
			&s.LastUsedAt,
			&s.CreatedAt,
			&s.RevokedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan session row: %w", err)
		}
		sessions = append(sessions, s)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading user sessions: %w", err)
	}

	return sessions, nil
}

// CountActiveSessionsForUser counts how many non-revoked active sessions exist for a user.
func (r *pgxSessionRepository) CountActiveSessionsForUser(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM sessions
		WHERE user_id = $1 AND revoked_at IS NULL
	`

	var count int
	err := r.db.QueryRow(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count active sessions: %w", err)
	}

	return count, nil
}

// UpdateLastUsed updates session activity timestamp and IP.
func (r *pgxSessionRepository) UpdateLastUsed(ctx context.Context, sessionID uuid.UUID, ip *netip.Addr) error {
	query := `
		UPDATE sessions
		SET last_used_at = NOW(),
		    ip_address = COALESCE($1, ip_address)
		WHERE id = $2 AND revoked_at IS NULL
	`

	_, err := r.db.Exec(ctx, query, ip, sessionID)
	if err != nil {
		return fmt.Errorf("failed to update session activity: %w", err)
	}

	return nil
}

// Revoke invalidates a single session.
func (r *pgxSessionRepository) Revoke(ctx context.Context, sessionID uuid.UUID) error {
	query := `
		UPDATE sessions
		SET revoked_at = NOW()
		WHERE id = $1 AND revoked_at IS NULL
	`

	_, err := r.db.Exec(ctx, query, sessionID)
	if err != nil {
		return fmt.Errorf("failed to revoke session: %w", err)
	}

	return nil
}

// RevokeAllForUser terminates all active sessions for a user.
func (r *pgxSessionRepository) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE sessions
		SET revoked_at = NOW()
		WHERE user_id = $1 AND revoked_at IS NULL
	`

	_, err := r.db.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to revoke all sessions for user: %w", err)
	}

	return nil
}
