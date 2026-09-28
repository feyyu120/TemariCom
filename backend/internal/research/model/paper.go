package model

import (
	"time"

	"github.com/google/uuid"
)

// ScholarXivPaper represents a research paper returned by the ScholarXiv API.
type ScholarXivPaper struct {
	ID              string   `json:"id"`
	ExtractedID     string   `json:"extractedID"`
	BaseArxivID     string   `json:"baseArxivID"`
	Title           string   `json:"title"`
	Summary         string   `json:"summary"`
	Authors         []string `json:"authors"`
	PrimaryCategory string   `json:"primaryCategory"`
	Category        []string `json:"category"`
	PDFLink         string   `json:"pdfLink"`
	ABSLink         string   `json:"absLink"`
	Published       string   `json:"published"`
	Updated         string   `json:"updated"`
	DOI             string   `json:"doi,omitempty"`
	JournalRef      string   `json:"journalRef,omitempty"`
	Comment         string   `json:"comment,omitempty"`
	LatestVersion   string   `json:"latestVersion,omitempty"`
	Submitter       string   `json:"submitter,omitempty"`

	// Enriched field indicating if the viewing user has bookmarked this paper
	IsSaved bool `json:"is_saved,omitempty"`
}

// ScholarXivPagination represents the pagination metadata returned by ScholarXiv.
type ScholarXivPagination struct {
	Page     int   `json:"page"`
	Limit    int   `json:"limit"`
	HasMore  bool  `json:"hasMore"`
	NextPage *int  `json:"nextPage"`
	Total    int64 `json:"total,omitempty"`
}

// ScholarXivSearchResponse represents the outer response from ScholarXiv API.
type ScholarXivSearchResponse struct {
	Data       []ScholarXivPaper    `json:"data"`
	Pagination ScholarXivPagination `json:"pagination"`
}

// SavedPaper represents a bookmarked research paper stored in PostgreSQL.
type SavedPaper struct {
	ID              uuid.UUID `json:"id" db:"id"`
	UserID          uuid.UUID `json:"user_id" db:"user_id"`
	ExternalPaperID string    `json:"external_paper_id" db:"external_paper_id"`
	Title           string    `json:"title" db:"title"`
	PaperURL        string    `json:"paper_url" db:"paper_url"`
	Authors         []string  `json:"authors" db:"authors"`
	Summary         string    `json:"summary" db:"summary"`
	PdfURL          string    `json:"pdf_url" db:"pdf_url"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}
