package service

import (
	"context"
	"errors"
	"strings"

	"TemariCom/internal/research/client"
	"TemariCom/internal/research/dto"
	"TemariCom/internal/research/model"
	"TemariCom/internal/research/repository"

	"github.com/google/uuid"
)

type ResearchService interface {
	SearchPapers(ctx context.Context, viewerID *uuid.UUID, q string, page, limit int) (*model.ScholarXivSearchResponse, error)
	AdvancedSearch(ctx context.Context, viewerID *uuid.UUID, req *dto.AdvancedSearchRequest) (*model.ScholarXivSearchResponse, error)
	GetPaper(ctx context.Context, viewerID *uuid.UUID, paperID string) (*model.ScholarXivPaper, error)
	SavePaper(ctx context.Context, userID uuid.UUID, req *dto.SavePaperRequest) (*model.SavedPaper, error)
	RemoveSavedPaper(ctx context.Context, userID uuid.UUID, id uuid.UUID) error
	RemoveSavedPaperByExternalID(ctx context.Context, userID uuid.UUID, externalPaperID string) error
	ListSavedPapers(ctx context.Context, userID uuid.UUID, page, limit int) (*dto.SavedPapersListResponse, error)
	CheckIsPaperSaved(ctx context.Context, userID uuid.UUID, externalPaperID string) (*dto.CheckSavedResponse, error)
}

type researchService struct {
	scholarXivClient client.ScholarXivClient
	savedPaperRepo   repository.SavedPaperRepository
}

func NewResearchService(scholarXivClient client.ScholarXivClient, savedPaperRepo repository.SavedPaperRepository) ResearchService {
	return &researchService{
		scholarXivClient: scholarXivClient,
		savedPaperRepo:   savedPaperRepo,
	}
}

// SearchPapers executes a simple title/topic query against ScholarXiv and batch-enriches bookmarks.
func (s *researchService) SearchPapers(ctx context.Context, viewerID *uuid.UUID, q string, page, limit int) (*model.ScholarXivSearchResponse, error) {
	cleanQuery := strings.TrimSpace(q)
	if cleanQuery == "" {
		return &model.ScholarXivSearchResponse{
			Data: []model.ScholarXivPaper{},
			Pagination: model.ScholarXivPagination{
				Page:    page,
				Limit:   limit,
				HasMore: false,
			},
		}, nil
	}

	resp, err := s.scholarXivClient.SimpleSearch(ctx, cleanQuery, page, limit)
	if err != nil {
		return nil, err
	}

	if viewerID != nil && len(resp.Data) > 0 {
		s.enrichSavedStatus(ctx, *viewerID, resp.Data)
	}

	return resp, nil
}

// AdvancedSearch executes a fielded multi-criteria search and batch-enriches bookmarks.
func (s *researchService) AdvancedSearch(ctx context.Context, viewerID *uuid.UUID, req *dto.AdvancedSearchRequest) (*model.ScholarXivSearchResponse, error) {
	resp, err := s.scholarXivClient.AdvancedSearch(ctx, req)
	if err != nil {
		return nil, err
	}

	if viewerID != nil && len(resp.Data) > 0 {
		s.enrichSavedStatus(ctx, *viewerID, resp.Data)
	}

	return resp, nil
}

// GetPaper fetches details for a specific research paper by ID.
func (s *researchService) GetPaper(ctx context.Context, viewerID *uuid.UUID, paperID string) (*model.ScholarXivPaper, error) {
	paper, err := s.scholarXivClient.GetPaperByID(ctx, paperID)
	if err != nil {
		return nil, err
	}

	if viewerID != nil {
		extID := paper.ExtractedID
		if extID == "" {
			extID = paper.BaseArxivID
		}
		if extID == "" {
			extID = paper.ID
		}
		isSaved, _, _ := s.savedPaperRepo.IsPaperSaved(ctx, *viewerID, extID)
		paper.IsSaved = isSaved
	}

	return paper, nil
}

// SavePaper bookmarks a paper for the authenticated user.
func (s *researchService) SavePaper(ctx context.Context, userID uuid.UUID, req *dto.SavePaperRequest) (*model.SavedPaper, error) {
	if strings.TrimSpace(req.ExternalPaperID) == "" {
		return nil, errors.New("external_paper_id is required")
	}
	if strings.TrimSpace(req.Title) == "" {
		return nil, errors.New("title is required")
	}
	if strings.TrimSpace(req.PaperURL) == "" {
		return nil, errors.New("paper_url is required")
	}

	return s.savedPaperRepo.SavePaper(ctx, userID, req)
}

// RemoveSavedPaper removes a saved paper bookmark by its primary key ID.
func (s *researchService) RemoveSavedPaper(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	return s.savedPaperRepo.DeleteSavedPaper(ctx, userID, id)
}

// RemoveSavedPaperByExternalID removes a saved paper bookmark by external paper identifier.
func (s *researchService) RemoveSavedPaperByExternalID(ctx context.Context, userID uuid.UUID, externalPaperID string) error {
	cleanID := strings.TrimSpace(externalPaperID)
	if cleanID == "" {
		return errors.New("external_paper_id is required")
	}
	return s.savedPaperRepo.DeleteSavedPaperByExternalID(ctx, userID, cleanID)
}

// ListSavedPapers returns paginated bookmarked papers for a user.
func (s *researchService) ListSavedPapers(ctx context.Context, userID uuid.UUID, page, limit int) (*dto.SavedPapersListResponse, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if page < 0 {
		page = 0
	}

	offset := page * limit
	papers, total, err := s.savedPaperRepo.ListSavedPapers(ctx, userID, limit, offset)
	if err != nil {
		return nil, err
	}

	hasMore := int64(offset+len(papers)) < total

	return &dto.SavedPapersListResponse{
		Papers:  papers,
		Total:   total,
		Page:    page,
		Limit:   limit,
		HasMore: hasMore,
	}, nil
}

// CheckIsPaperSaved checks if an external paper is saved by the user.
func (s *researchService) CheckIsPaperSaved(ctx context.Context, userID uuid.UUID, externalPaperID string) (*dto.CheckSavedResponse, error) {
	cleanID := strings.TrimSpace(externalPaperID)
	if cleanID == "" {
		return &dto.CheckSavedResponse{IsSaved: false}, nil
	}

	isSaved, savedID, err := s.savedPaperRepo.IsPaperSaved(ctx, userID, cleanID)
	if err != nil {
		return nil, err
	}

	return &dto.CheckSavedResponse{
		IsSaved:      isSaved,
		SavedPaperID: savedID,
	}, nil
}

// enrichSavedStatus batch-checks which papers are saved by the user in a single round-trip.
func (s *researchService) enrichSavedStatus(ctx context.Context, userID uuid.UUID, papers []model.ScholarXivPaper) {
	extIDs := make([]string, 0, len(papers)*2)
	for _, p := range papers {
		if p.ExtractedID != "" {
			extIDs = append(extIDs, p.ExtractedID)
		}
		if p.BaseArxivID != "" {
			extIDs = append(extIDs, p.BaseArxivID)
		}
		if p.ID != "" {
			extIDs = append(extIDs, p.ID)
		}
	}

	savedMap, err := s.savedPaperRepo.GetSavedPaperIDs(ctx, userID, extIDs)
	if err != nil {
		return
	}

	for i := range papers {
		p := &papers[i]
		if savedMap[p.ExtractedID] || savedMap[p.BaseArxivID] || savedMap[p.ID] {
			p.IsSaved = true
		}
	}
}
