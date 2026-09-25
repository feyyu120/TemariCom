package dto

import (
	"TemariCom/internal/research/model"

	"github.com/google/uuid"
)

// SearchPapersQuery captures URL query parameters for simple paper searches.
type SearchPapersQuery struct {
	Q     string `query:"q" validate:"required,min=1,max=200"`
	Page  int    `query:"page" validate:"min=0"`
	Limit int    `query:"limit" validate:"min=1,max=100"`
}

// AdvancedSearchRequest captures payload for fielded multi-parameter search.
type AdvancedSearchRequest struct {
	SearchFilterString map[string]string `json:"searchFilterString" validate:"required"`
	Page               int               `json:"page" validate:"min=0"`
	Limit              int               `json:"limit" validate:"min=1,max=100"`
	SortBy             string            `json:"sortBy" validate:"omitempty,oneof=relevance submittedDate lastUpdatedDate"`
	SortOrder          string            `json:"sortOrder" validate:"omitempty,oneof=ascending descending asc desc"`
}

// SavePaperRequest captures payload when a user bookmarks a research paper.
type SavePaperRequest struct {
	ExternalPaperID string   `json:"external_paper_id" validate:"required,min=1,max=255"`
	Title           string   `json:"title" validate:"required,min=1"`
	PaperURL        string   `json:"paper_url" validate:"required,url"`
	Authors         []string `json:"authors"`
	Summary         string   `json:"summary"`
	PdfURL          string   `json:"pdf_url"`
}

// CheckSavedResponse returns whether a paper is saved and its saved record ID.
type CheckSavedResponse struct {
	IsSaved      bool       `json:"is_saved"`
	SavedPaperID *uuid.UUID `json:"saved_paper_id,omitempty"`
}

// SavedPapersListResponse represents paginated saved papers list.
type SavedPapersListResponse struct {
	Papers  []model.SavedPaper `json:"papers"`
	Total   int64              `json:"total"`
	Page    int                `json:"page"`
	Limit   int                `json:"limit"`
	HasMore bool               `json:"has_more"`
}
