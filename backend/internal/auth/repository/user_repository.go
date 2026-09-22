package repository

import (
	"context"
	"errors"
	"fmt"
	"net/netip"
	"strings"

	"TemariCom/internal/auth/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrDuplicateEmail    = errors.New("email is already registered")
	ErrDuplicateUsername = errors.New("username is already taken")
	ErrDuplicatePhone    = errors.New("phone number is already registered")
	ErrUserNotFound      = errors.New("user not found")
	ErrRoleNotFound      = errors.New("role not found")
)

type UserRepository interface {
	Create(ctx context.Context, user *model.User) (*model.User, error)
	CreateWithRole(ctx context.Context, user *model.User, roleName string) (*model.User, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	GetByUsername(ctx context.Context, username string) (*model.User, error)
	GetByIdentifier(ctx context.Context, identifier string) (*model.User, error)
	GetUserRoles(ctx context.Context, userID uuid.UUID) ([]string, error)
	UpdateLastLogin(ctx context.Context, userID uuid.UUID, ip *netip.Addr) error
}

type pgxUserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) UserRepository {
	return &pgxUserRepository{db: db}
}

// Create inserts a new user record into PostgreSQL.
func (r *pgxUserRepository) Create(ctx context.Context, user *model.User) (*model.User, error) {
	query := `
		INSERT INTO users (
			email,
			username,
			phone,
			full_name,
			avatar_key,
			bio,
			is_verified,
			account_status
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8
		)
		RETURNING 
			id, email, username, phone, full_name, avatar_key, bio, is_verified, account_status, 
			last_login_at, last_login_ip, created_at, updated_at
	`

	var created model.User
	err := r.db.QueryRow(
		ctx,
		query,
		user.Email,
		user.Username,
		user.Phone,
		user.FullName,
		user.AvatarKey,
		user.Bio,
		user.IsVerified,
		user.AccountStatus,
	).Scan(
		&created.ID,
		&created.Email,
		&created.Username,
		&created.Phone,
		&created.FullName,
		&created.AvatarKey,
		&created.Bio,
		&created.IsVerified,
		&created.AccountStatus,
		&created.LastLoginAt,
		&created.LastLoginIP,
		&created.CreatedAt,
		&created.UpdatedAt,
	)

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			switch pgErr.ConstraintName {
			case "users_email_key":
				return nil, ErrDuplicateEmail
			case "users_username_key":
				return nil, ErrDuplicateUsername
			case "users_phone_key":
				return nil, ErrDuplicatePhone
			}
		}
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &created, nil
}

// CreateWithRole executes an atomic transaction with a CTE to insert the user and assign a default role in a single round-trip.
func (r *pgxUserRepository) CreateWithRole(ctx context.Context, user *model.User, roleName string) (*model.User, error) {
	cteQuery := `
		WITH new_user AS (
			INSERT INTO users (
				email,
				username,
				phone,
				full_name,
				avatar_key,
				bio,
				is_verified,
				account_status
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8
			)
			RETURNING 
				id, email, username, phone, full_name, avatar_key, bio, is_verified, account_status, 
				last_login_at, last_login_ip, created_at, updated_at
		),
		assigned_role AS (
			INSERT INTO user_roles (user_id, role_id)
			SELECT new_user.id, roles.id
			FROM new_user, roles
			WHERE roles.name = $9
		)
		SELECT 
			id, email, username, phone, full_name, avatar_key, bio, is_verified, account_status, 
			last_login_at, last_login_ip, created_at, updated_at
		FROM new_user
	`

	var created model.User
	err := r.db.QueryRow(
		ctx,
		cteQuery,
		user.Email,
		user.Username,
		user.Phone,
		user.FullName,
		user.AvatarKey,
		user.Bio,
		user.IsVerified,
		user.AccountStatus,
		roleName,
	).Scan(
		&created.ID,
		&created.Email,
		&created.Username,
		&created.Phone,
		&created.FullName,
		&created.AvatarKey,
		&created.Bio,
		&created.IsVerified,
		&created.AccountStatus,
		&created.LastLoginAt,
		&created.LastLoginIP,
		&created.CreatedAt,
		&created.UpdatedAt,
	)

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			switch pgErr.ConstraintName {
			case "users_email_key":
				return nil, ErrDuplicateEmail
			case "users_username_key":
				return nil, ErrDuplicateUsername
			case "users_phone_key":
				return nil, ErrDuplicatePhone
			}
		}
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("%w: '%s'", ErrRoleNotFound, roleName)
		}
		return nil, fmt.Errorf("failed to create user with role: %w", err)
	}

	return &created, nil
}

// GetByID retrieves a user by their UUID primary key.
func (r *pgxUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	query := `
		SELECT 
			id, email, username, phone, full_name, avatar_key, bio, is_verified, account_status, 
			last_login_at, last_login_ip, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var user model.User
	err := r.db.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.Phone,
		&user.FullName,
		&user.AvatarKey,
		&user.Bio,
		&user.IsVerified,
		&user.AccountStatus,
		&user.LastLoginAt,
		&user.LastLoginIP,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user by id: %w", err)
	}

	return &user, nil
}

// GetByEmail retrieves a user by their normalized lowercase email address.
func (r *pgxUserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	query := `
		SELECT 
			id, email, username, phone, full_name, avatar_key, bio, is_verified, account_status, 
			last_login_at, last_login_ip, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	var user model.User
	err := r.db.QueryRow(ctx, query, strings.ToLower(strings.TrimSpace(email))).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.Phone,
		&user.FullName,
		&user.AvatarKey,
		&user.Bio,
		&user.IsVerified,
		&user.AccountStatus,
		&user.LastLoginAt,
		&user.LastLoginIP,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	return &user, nil
}

// GetByUsername retrieves a user by their normalized lowercase username.
func (r *pgxUserRepository) GetByUsername(ctx context.Context, username string) (*model.User, error) {
	query := `
		SELECT 
			id, email, username, phone, full_name, avatar_key, bio, is_verified, account_status, 
			last_login_at, last_login_ip, created_at, updated_at
		FROM users
		WHERE username = $1
	`

	var user model.User
	err := r.db.QueryRow(ctx, query, strings.ToLower(strings.TrimSpace(username))).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.Phone,
		&user.FullName,
		&user.AvatarKey,
		&user.Bio,
		&user.IsVerified,
		&user.AccountStatus,
		&user.LastLoginAt,
		&user.LastLoginIP,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user by username: %w", err)
	}

	return &user, nil
}

// GetByIdentifier finds a user by email, username, or phone number.
func (r *pgxUserRepository) GetByIdentifier(ctx context.Context, identifier string) (*model.User, error) {
	raw := strings.TrimSpace(identifier)
	lower := strings.ToLower(raw)

	query := `
		SELECT 
			id, email, username, phone, full_name, avatar_key, bio, is_verified, account_status, 
			last_login_at, last_login_ip, created_at, updated_at
		FROM users
		WHERE email = $1 OR username = $1 OR phone = $2
		LIMIT 1
	`

	var user model.User
	err := r.db.QueryRow(ctx, query, lower, raw).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.Phone,
		&user.FullName,
		&user.AvatarKey,
		&user.Bio,
		&user.IsVerified,
		&user.AccountStatus,
		&user.LastLoginAt,
		&user.LastLoginIP,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user by identifier: %w", err)
	}

	return &user, nil
}

// GetUserRoles retrieves all assigned role names for a user.
func (r *pgxUserRepository) GetUserRoles(ctx context.Context, userID uuid.UUID) ([]string, error) {
	query := `
		SELECT r.name 
		FROM roles r
		JOIN user_roles ur ON ur.role_id = r.id
		WHERE ur.user_id = $1
		ORDER BY r.name ASC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user roles: %w", err)
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var roleName string
		if err := rows.Scan(&roleName); err != nil {
			return nil, fmt.Errorf("failed to scan role name: %w", err)
		}
		roles = append(roles, roleName)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading user roles: %w", err)
	}

	return roles, nil
}

// UpdateLastLogin records the timestamp and IP address using *netip.Addr.
func (r *pgxUserRepository) UpdateLastLogin(ctx context.Context, userID uuid.UUID, ip *netip.Addr) error {
	query := `
		UPDATE users
		SET last_login_at = NOW(),
		    last_login_ip = $1,
		    updated_at = NOW()
		WHERE id = $2
	`

	_, err := r.db.Exec(ctx, query, ip, userID)
	if err != nil {
		return fmt.Errorf("failed to update last login: %w", err)
	}

	return nil
}
