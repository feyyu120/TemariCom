package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"TemariCom/internal/lostfound/dto"
	"TemariCom/internal/lostfound/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrItemNotFound = errors.New("lost and found item not found")
)

type LostFoundRepository interface {
	Create(ctx context.Context, item *model.LostFoundItem) (*model.LostFoundItem, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.LostFoundItemDetail, error)
	GetRawByID(ctx context.Context, id uuid.UUID) (*model.LostFoundItem, error)
	List(ctx context.Context, filter dto.ItemFilterQuery) ([]model.LostFoundItemDetail, int64, error)
	Update(ctx context.Context, item *model.LostFoundItem) (*model.LostFoundItem, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type postgresLostFoundRepository struct {
	db *pgxpool.Pool
}

func NewLostFoundRepository(db *pgxpool.Pool) LostFoundRepository {
	return &postgresLostFoundRepository{db: db}
}

// Create inserts a new lost or found record into PostgreSQL.
func (r *postgresLostFoundRepository) Create(ctx context.Context, item *model.LostFoundItem) (*model.LostFoundItem, error) {
	query := `
		INSERT INTO lost_found_items (
			user_id,
			type,
			title,
			description,
			category,
			location,
			event_date,
			phone_number,
			status,
			image_key
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING
			id,
			user_id,
			type,
			title,
			description,
			category,
			location,
			event_date,
			phone_number,
			status,
			image_key,
			created_at,
			updated_at
	`

	created := &model.LostFoundItem{}
	err := r.db.QueryRow(
		ctx,
		query,
		item.UserID,
		item.Type,
		item.Title,
		item.Description,
		item.Category,
		item.Location,
		item.EventDate,
		item.PhoneNumber,
		item.Status,
		item.ImageKey,
	).Scan(
		&created.ID,
		&created.UserID,
		&created.Type,
		&created.Title,
		&created.Description,
		&created.Category,
		&created.Location,
		&created.EventDate,
		&created.PhoneNumber,
		&created.Status,
		&created.ImageKey,
		&created.CreatedAt,
		&created.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("create lost found item: %w", err)
	}

	return created, nil
}

// GetByID returns the full item detail joined with the user who reported it.
func (r *postgresLostFoundRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.LostFoundItemDetail, error) {
	query := `
		SELECT
			l.id,
			l.user_id,
			l.type,
			l.title,
			l.description,
			l.category,
			l.location,
			l.event_date,
			l.phone_number,
			l.status,
			l.image_key,
			l.created_at,
			l.updated_at,
			u.id,
			COALESCE(u.full_name, ''),
			COALESCE(u.username, ''),
			COALESCE(u.avatar_key, ''),
			u.phone,
			u.email
		FROM lost_found_items l
		JOIN users u ON u.id = l.user_id
		WHERE l.id = $1
	`

	item := model.LostFoundItemDetail{}
	var reporterAvatarKey string

	err := r.db.QueryRow(ctx, query, id).Scan(
		&item.ID,
		&item.UserID,
		&item.Type,
		&item.Title,
		&item.Description,
		&item.Category,
		&item.Location,
		&item.EventDate,
		&item.PhoneNumber,
		&item.Status,
		&item.ImageKey,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.Reporter.ID,
		&item.Reporter.FullName,
		&item.Reporter.Username,
		&reporterAvatarKey,
		&item.Reporter.Phone,
		&item.Reporter.Email,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrItemNotFound
		}
		return nil, fmt.Errorf("get lost found item by id: %w", err)
	}

	sanitizeReporter(&item.Reporter, reporterAvatarKey)
	return &item, nil
}

// GetRawByID retrieves basic item record without user join (for fast ownership and permission checks).
func (r *postgresLostFoundRepository) GetRawByID(ctx context.Context, id uuid.UUID) (*model.LostFoundItem, error) {
	query := `
		SELECT
			id,
			user_id,
			type,
			title,
			description,
			category,
			location,
			event_date,
			phone_number,
			status,
			image_key,
			created_at,
			updated_at
		FROM lost_found_items
		WHERE id = $1
	`

	item := &model.LostFoundItem{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&item.ID,
		&item.UserID,
		&item.Type,
		&item.Title,
		&item.Description,
		&item.Category,
		&item.Location,
		&item.EventDate,
		&item.PhoneNumber,
		&item.Status,
		&item.ImageKey,
		&item.CreatedAt,
		&item.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrItemNotFound
		}
		return nil, fmt.Errorf("get raw item: %w", err)
	}

	return item, nil
}

// List queries items dynamically based on status, type, category, and keyword search with pagination.
func (r *postgresLostFoundRepository) List(ctx context.Context, filter dto.ItemFilterQuery) ([]model.LostFoundItemDetail, int64, error) {
	var conditions []string
	var args []any
	argIdx := 1

	// Type filter ('lost' or 'found')
	if filter.Type != "" && (filter.Type == string(model.TypeLost) || filter.Type == string(model.TypeFound)) {
		conditions = append(conditions, fmt.Sprintf("l.type = $%d", argIdx))
		args = append(args, filter.Type)
		argIdx++
	}

	// Status filter: defaults to 'active' unless 'all' or specific status requested
	if filter.Status == "" {
		conditions = append(conditions, fmt.Sprintf("l.status = $%d", argIdx))
		args = append(args, model.StatusActive)
		argIdx++
	} else if filter.Status != "all" {
		conditions = append(conditions, fmt.Sprintf("l.status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}

	// Category filter
	if strings.TrimSpace(filter.Category) != "" {
		conditions = append(conditions, fmt.Sprintf("LOWER(l.category) = LOWER($%d)", argIdx))
		args = append(args, strings.TrimSpace(filter.Category))
		argIdx++
	}

	// Keyword search on title, description, and location
	searchQuery := strings.TrimSpace(filter.Search)
	if searchQuery != "" {
		searchPattern := "%" + searchQuery + "%"
		conditions = append(conditions, fmt.Sprintf(
			"(l.title ILIKE $%d OR COALESCE(l.description, '') ILIKE $%d OR COALESCE(l.location, '') ILIKE $%d)",
			argIdx, argIdx, argIdx,
		))
		args = append(args, searchPattern)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total records
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM lost_found_items l %s", whereClause)
	var total int64
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count lost found items: %w", err)
	}

	// Pagination limits
	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	page := filter.Page
	if page < 0 {
		page = 0
	}
	offset := page * limit

	selectQuery := fmt.Sprintf(`
		SELECT
			l.id,
			l.user_id,
			l.type,
			l.title,
			l.description,
			l.category,
			l.location,
			l.event_date,
			l.phone_number,
			l.status,
			l.image_key,
			l.created_at,
			l.updated_at,
			u.id,
			COALESCE(u.full_name, ''),
			COALESCE(u.username, ''),
			COALESCE(u.avatar_key, ''),
			u.phone,
			u.email
		FROM lost_found_items l
		JOIN users u ON u.id = l.user_id
		%s
		ORDER BY l.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	queryArgs := append(args, limit, offset)

	rows, err := r.db.Query(ctx, selectQuery, queryArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("list lost found items: %w", err)
	}
	defer rows.Close()

	items := make([]model.LostFoundItemDetail, 0)
	for rows.Next() {
		var item model.LostFoundItemDetail
		var reporterAvatarKey string

		err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.Type,
			&item.Title,
			&item.Description,
			&item.Category,
			&item.Location,
			&item.EventDate,
			&item.PhoneNumber,
			&item.Status,
			&item.ImageKey,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.Reporter.ID,
			&item.Reporter.FullName,
			&item.Reporter.Username,
			&reporterAvatarKey,
			&item.Reporter.Phone,
			&item.Reporter.Email,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scan lost found item row: %w", err)
		}

		sanitizeReporter(&item.Reporter, reporterAvatarKey)
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return items, total, nil
}

// sanitizeReporter ensures reporter username and full name are populated from email if empty, and sets avatar key.
func sanitizeReporter(reporter *model.ReporterInfo, avatarKey string) {
	reporter.AvatarURL = avatarKey
	if reporter.Username == "" && reporter.Email != nil && *reporter.Email != "" {
		parts := strings.Split(*reporter.Email, "@")
		reporter.Username = parts[0]
	}
	if reporter.FullName == "" {
		if reporter.Username != "" {
			reporter.FullName = reporter.Username
		} else {
			reporter.FullName = "Campus Student"
		}
	}
}

// Update updates an existing lost or found item.
func (r *postgresLostFoundRepository) Update(ctx context.Context, item *model.LostFoundItem) (*model.LostFoundItem, error) {
	query := `
		UPDATE lost_found_items
		SET
			title = $1,
			description = $2,
			category = $3,
			location = $4,
			event_date = $5,
			phone_number = $6,
			status = $7,
			image_key = $8
		WHERE id = $9
		RETURNING
			id,
			user_id,
			type,
			title,
			description,
			category,
			location,
			event_date,
			phone_number,
			status,
			image_key,
			created_at,
			updated_at
	`

	updated := &model.LostFoundItem{}
	err := r.db.QueryRow(
		ctx,
		query,
		item.Title,
		item.Description,
		item.Category,
		item.Location,
		item.EventDate,
		item.PhoneNumber,
		item.Status,
		item.ImageKey,
		item.ID,
	).Scan(
		&updated.ID,
		&updated.UserID,
		&updated.Type,
		&updated.Title,
		&updated.Description,
		&updated.Category,
		&updated.Location,
		&updated.EventDate,
		&updated.PhoneNumber,
		&updated.Status,
		&updated.ImageKey,
		&updated.CreatedAt,
		&updated.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrItemNotFound
		}
		return nil, fmt.Errorf("update lost found item: %w", err)
	}

	return updated, nil
}

// Delete permanently removes a lost or found item from the database.
func (r *postgresLostFoundRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM lost_found_items WHERE id = $1`
	tag, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete lost found item: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrItemNotFound
	}
	return nil
}
