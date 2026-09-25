package service

import (
	"context"
	"testing"

	"TemariCom/internal/research/dto"
	"TemariCom/internal/research/model"

	"github.com/google/uuid"
)

type mockScholarXivClient struct{}

func (m *mockScholarXivClient) SimpleSearch(ctx context.Context, q string, page, limit int) (*model.ScholarXivSearchResponse, error) {
	return &model.ScholarXivSearchResponse{
		Data: []model.ScholarXivPaper{
			{
				ID:          "paper-1",
				ExtractedID: "2401.0001",
				Title:       "Test Paper 1",
			},
			{
				ID:          "paper-2",
				ExtractedID: "2401.0002",
				Title:       "Test Paper 2",
			},
		},
		Pagination: model.ScholarXivPagination{
			Page:    page,
			Limit:   limit,
			HasMore: false,
		},
	}, nil
}

func (m *mockScholarXivClient) AdvancedSearch(ctx context.Context, req *dto.AdvancedSearchRequest) (*model.ScholarXivSearchResponse, error) {
	return &model.ScholarXivSearchResponse{
		Data: []model.ScholarXivPaper{
			{
				ID:          "paper-adv",
				ExtractedID: "2401.0003",
				Title:       "Advanced Paper",
			},
		},
	}, nil
}

func (m *mockScholarXivClient) GetPaperByID(ctx context.Context, paperID string) (*model.ScholarXivPaper, error) {
	return &model.ScholarXivPaper{
		ID:          paperID,
		ExtractedID: paperID,
		Title:       "Detailed Paper",
	}, nil
}

type mockSavedPaperRepo struct {
	savedMap map[string]bool
}

func (m *mockSavedPaperRepo) SavePaper(ctx context.Context, userID uuid.UUID, req *dto.SavePaperRequest) (*model.SavedPaper, error) {
	return &model.SavedPaper{
		ID:              uuid.New(),
		UserID:          userID,
		ExternalPaperID: req.ExternalPaperID,
		Title:           req.Title,
		PaperURL:        req.PaperURL,
	}, nil
}

func (m *mockSavedPaperRepo) DeleteSavedPaper(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	return nil
}

func (m *mockSavedPaperRepo) DeleteSavedPaperByExternalID(ctx context.Context, userID uuid.UUID, externalPaperID string) error {
	return nil
}

func (m *mockSavedPaperRepo) ListSavedPapers(ctx context.Context, userID uuid.UUID, limit, offset int) ([]model.SavedPaper, int64, error) {
	return []model.SavedPaper{
		{
			ID:              uuid.New(),
			UserID:          userID,
			ExternalPaperID: "2401.0001",
			Title:           "Saved Paper 1",
		},
	}, 1, nil
}

func (m *mockSavedPaperRepo) IsPaperSaved(ctx context.Context, userID uuid.UUID, externalPaperID string) (bool, *uuid.UUID, error) {
	saved := m.savedMap[externalPaperID]
	id := uuid.New()
	return saved, &id, nil
}

func (m *mockSavedPaperRepo) GetSavedPaperIDs(ctx context.Context, userID uuid.UUID, externalPaperIDs []string) (map[string]bool, error) {
	result := make(map[string]bool)
	for _, id := range externalPaperIDs {
		if m.savedMap[id] {
			result[id] = true
		}
	}
	return result, nil
}

func TestSearchPapersEnrichment(t *testing.T) {
	client := &mockScholarXivClient{}
	repo := &mockSavedPaperRepo{
		savedMap: map[string]bool{
			"2401.0001": true,
		},
	}

	svc := NewResearchService(client, repo)
	userID := uuid.New()

	res, err := svc.SearchPapers(context.Background(), &userID, "test query", 0, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(res.Data) != 2 {
		t.Fatalf("expected 2 papers, got %d", len(res.Data))
	}

	// First paper should be marked IsSaved = true
	if !res.Data[0].IsSaved {
		t.Errorf("expected paper 1 to be marked as saved")
	}
	// Second paper should be IsSaved = false
	if res.Data[1].IsSaved {
		t.Errorf("expected paper 2 to NOT be marked as saved")
	}
}

func TestSavePaperValidation(t *testing.T) {
	client := &mockScholarXivClient{}
	repo := &mockSavedPaperRepo{savedMap: map[string]bool{}}
	svc := NewResearchService(client, repo)

	userID := uuid.New()

	// Missing external_paper_id
	_, err := svc.SavePaper(context.Background(), userID, &dto.SavePaperRequest{
		Title:    "Title",
		PaperURL: "https://arxiv.org/abs/123",
	})
	if err == nil {
		t.Fatalf("expected validation error for missing external_paper_id")
	}

	// Valid request
	saved, err := svc.SavePaper(context.Background(), userID, &dto.SavePaperRequest{
		ExternalPaperID: "123.456",
		Title:           "Valid Title",
		PaperURL:        "https://arxiv.org/abs/123.456",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if saved.Title != "Valid Title" {
		t.Errorf("expected title Valid Title, got %s", saved.Title)
	}
}
