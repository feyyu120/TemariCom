package repository

import (
	"context"
	"errors"
	"fmt"

	"TemariCom/internal/research/dto"
	"TemariCom/internal/research/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrSavedPaperNotFound  = errors.New("saved paper not found")
	ErrDuplicateSavedPaper = errors.New("paper is already saved")
)

type SavedPaperRepository interface {
	SavePaper(ctx context.Context, userID uuid.UUID, req *dto.SavePaperRequest) (*model.SavedPaper, error)
	DeleteSavedPaper(ctx context.Context, userID uuid.UUID, id uuid.UUID) error
	DeleteSavedPaperByExternalID(ctx context.Context, userID uuid.UUID, externalPaperID string) error
	ListSavedPapers(ctx context.Context, userID uuid.UUID, limit, offset int) ([]model.SavedPaper, int64, error)
	IsPaperSaved(ctx context.Context, userID uuid.UUID, externalPaperID string) (bool, *uuid.UUID, error)
	GetSavedPaperIDs(ctx context.Context, userID uuid.UUID, externalPaperIDs []string) (map[string]bool, error)
}

type pgxSavedPaperRepository struct {
	db *pgxpool.Pool
}

func NewSavedPaperRepository(db *pgxpool.Pool) SavedPaperRepository {
	return &pgxSavedPaperRepository{db: db}
}

// SavePaper inserts or updates a saved paper bookmark in PostgreSQL.
func (r *pgxSavedPaperRepository) SavePaper(ctx context.Context, userID uuid.UUID, req *dto.SavePaperRequest) (*model.SavedPaper, error) {
	query := `
		INSERT INTO saved_papers (
			user_id,
			external_paper_id,
			title,
			paper_url,
			authors,
			summary,
			pdf_url
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (user_id, external_paper_id)
		DO UPDATE SET
			title = EXCLUDED.title,
			paper_url = EXCLUDED.paper_url,
			authors = EXCLUDED.authors,
			summary = EXCLUDED.summary,
			pdf_url = EXCLUDED.pdf_url
		RETURNING
			id,
			user_id,
			external_paper_id,
			title,
			paper_url,
			authors,
			summary,
			pdf_url,
			created_at
	`

	authors := req.Authors
	if authors == nil {
		authors = []string{}
	}

	var p model.SavedPaper
	err := r.db.QueryRow(
		ctx,
		query,
		userID,
		req.ExternalPaperID,
		req.Title,
		req.PaperURL,
		authors,
		req.Summary,
		req.PdfURL,
	).Scan(
		&p.ID,
		&p.UserID,
		&p.ExternalPaperID,
		&p.Title,
		&p.PaperURL,
		&p.Authors,
		&p.Summary,
		&p.PdfURL,
		&p.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to save paper: %w", err)
	}

	return &p, nil
}

// DeleteSavedPaper deletes a saved paper by its UUID primary key and user_id.
func (r *pgxSavedPaperRepository) DeleteSavedPaper(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	query := `DELETE FROM saved_papers WHERE id = $1 AND user_id = $2`
	tag, err := r.db.Exec(ctx, query, id, userID)
	if err != nil {
		return fmt.Errorf("failed to delete saved paper: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrSavedPaperNotFound
	}
	return nil
}

// DeleteSavedPaperByExternalID deletes a saved paper bookmark by external paper identifier.
func (r *pgxSavedPaperRepository) DeleteSavedPaperByExternalID(ctx context.Context, userID uuid.UUID, externalPaperID string) error {
	query := `DELETE FROM saved_papers WHERE user_id = $1 AND external_paper_id = $2`
	tag, err := r.db.Exec(ctx, query, userID, externalPaperID)
	if err != nil {
		return fmt.Errorf("failed to delete saved paper by external id: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrSavedPaperNotFound
	}
	return nil
}

// ListSavedPapers retrieves paginated saved papers for a user, ordered by creation date descending.
func (r *pgxSavedPaperRepository) ListSavedPapers(ctx context.Context, userID uuid.UUID, limit, offset int) ([]model.SavedPaper, int64, error) {
	var total int64
	countQuery := `SELECT COUNT(*) FROM saved_papers WHERE user_id = $1`
	if err := r.db.QueryRow(ctx, countQuery, userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count saved papers: %w", err)
	}

	if total == 0 {
		return []model.SavedPaper{}, 0, nil
	}

	query := `
		SELECT
			id,
			user_id,
			external_paper_id,
			title,
			paper_url,
			authors,
			summary,
			pdf_url,
			created_at
		FROM saved_papers
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list saved papers: %w", err)
	}
	defer rows.Close()

	papers := make([]model.SavedPaper, 0, limit)
	for rows.Next() {
		var p model.SavedPaper
		if err := rows.Scan(
			&p.ID,
			&p.UserID,
			&p.ExternalPaperID,
			&p.Title,
			&p.PaperURL,
			&p.Authors,
			&p.Summary,
			&p.PdfURL,
			&p.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan saved paper row: %w", err)
		}
		papers = append(papers, p)
	}

	return papers, total, nil
}

// IsPaperSaved checks if an external paper is bookmarked by a user.
func (r *pgxSavedPaperRepository) IsPaperSaved(ctx context.Context, userID uuid.UUID, externalPaperID string) (bool, *uuid.UUID, error) {
	query := `SELECT id FROM saved_papers WHERE user_id = $1 AND external_paper_id = $2 LIMIT 1`
	var id uuid.UUID
	err := r.db.QueryRow(ctx, query, userID, externalPaperID).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil, nil
		}
		return false, nil, fmt.Errorf("failed to check if paper is saved: %w", err)
	}
	return true, &id, nil
}

// GetSavedPaperIDs returns a map set of external paper IDs that are saved by the user (batch lookup).
func (r *pgxSavedPaperRepository) GetSavedPaperIDs(ctx context.Context, userID uuid.UUID, externalPaperIDs []string) (map[string]bool, error) {
	if len(externalPaperIDs) == 0 {
		return map[string]bool{}, nil
	}

	query := `SELECT external_paper_id FROM saved_papers WHERE user_id = $1 AND external_paper_id = ANY($2)`
	rows, err := r.db.Query(ctx, query, userID, externalPaperIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to query batch saved paper ids: %w", err)
	}
	defer rows.Close()

	savedMap := make(map[string]bool, len(externalPaperIDs))
	for rows.Next() {
		var extID string
		if err := rows.Scan(&extID); err == nil {
			savedMap[extID] = true
		}
	}

	return savedMap, nil
}
