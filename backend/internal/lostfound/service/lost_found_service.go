package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"strings"
	"time"

	"TemariCom/internal/lostfound/dto"
	"TemariCom/internal/lostfound/model"
	"TemariCom/internal/lostfound/repository"
	"TemariCom/pkg/storage"

	"github.com/google/uuid"
)

var (
	ErrUnauthorized    = errors.New("forbidden: you can only modify your own items")
	ErrStorageDisabled = errors.New("cloud image storage is not configured")
)

type LostFoundService interface {
	CreateItem(ctx context.Context, userID uuid.UUID, req *dto.CreateItemRequest) (*model.LostFoundItemDetail, error)
	GetItem(ctx context.Context, id uuid.UUID) (*model.LostFoundItemDetail, error)
	ListItems(ctx context.Context, filter dto.ItemFilterQuery) (*dto.ItemListResponse, error)
	UpdateItem(ctx context.Context, userID uuid.UUID, id uuid.UUID, req *dto.UpdateItemRequest) (*model.LostFoundItemDetail, error)
	DeleteItem(ctx context.Context, userID uuid.UUID, id uuid.UUID) error
	GenerateUploadURL(ctx context.Context, userID uuid.UUID, req *dto.PresignImageRequest) (*dto.PresignImageResponse, error)
	UploadImage(ctx context.Context, userID uuid.UUID, extension string, contentType string, reader io.Reader, size int64) (*dto.PresignImageResponse, error)
}

type lostFoundServiceImpl struct {
	repo      repository.LostFoundRepository
	r2Storage *storage.R2Client
}

func NewLostFoundService(
	repo repository.LostFoundRepository,
	r2Storage *storage.R2Client,
) LostFoundService {
	return &lostFoundServiceImpl{
		repo:      repo,
		r2Storage: r2Storage,
	}
}

// helper to populate CDN media URLs
func (s *lostFoundServiceImpl) enrichItemURLs(item *model.LostFoundItemDetail) {
	if s.r2Storage != nil {
		if item.ImageKey != nil && *item.ImageKey != "" {
			url := s.r2Storage.MediaURL(*item.ImageKey)
			item.ImageURL = &url
		}
		if item.Reporter.AvatarURL != "" {
			item.Reporter.AvatarURL = s.r2Storage.AvatarURL(item.Reporter.AvatarURL)
		}
	} else {
		if item.ImageKey != nil && *item.ImageKey != "" {
			item.ImageURL = item.ImageKey
		}
	}
}

// CreateItem validates and stores a new lost or found post.
func (s *lostFoundServiceImpl) CreateItem(
	ctx context.Context,
	userID uuid.UUID,
	req *dto.CreateItemRequest,
) (*model.LostFoundItemDetail, error) {
	var eventDate *time.Time
	if req.EventDate != nil && strings.TrimSpace(*req.EventDate) != "" {
		t, err := time.Parse("2006-01-02", strings.TrimSpace(*req.EventDate))
		if err != nil {
			return nil, fmt.Errorf("invalid event_date format (expected YYYY-MM-DD): %w", err)
		}
		eventDate = &t
	}

	var imageKey *string
	if req.ImageKey != nil && strings.TrimSpace(*req.ImageKey) != "" {
		clean := strings.TrimSpace(*req.ImageKey)
		if s.r2Storage != nil {
			clean = s.r2Storage.ExtractKey(clean)
		}
		imageKey = &clean
	}

	itemToCreate := &model.LostFoundItem{
		UserID:      userID,
		Type:        model.ItemType(req.Type),
		Title:       strings.TrimSpace(req.Title),
		Description: req.Description,
		Category:    req.Category,
		Location:    req.Location,
		EventDate:   eventDate,
		PhoneNumber: req.PhoneNumber,
		Status:      model.StatusActive,
		ImageKey:    imageKey,
	}

	created, err := s.repo.Create(ctx, itemToCreate)
	if err != nil {
		return nil, err
	}

	detail, err := s.repo.GetByID(ctx, created.ID)
	if err != nil {
		return nil, err
	}

	s.enrichItemURLs(detail)
	return detail, nil
}

// GetItem retrieves a single item with reporter details and CDN image URLs.
func (s *lostFoundServiceImpl) GetItem(ctx context.Context, id uuid.UUID) (*model.LostFoundItemDetail, error) {
	detail, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	s.enrichItemURLs(detail)
	return detail, nil
}

// ListItems queries items with filtering, search, pagination, and media URL enrichment.
func (s *lostFoundServiceImpl) ListItems(ctx context.Context, filter dto.ItemFilterQuery) (*dto.ItemListResponse, error) {
	if filter.Limit <= 0 || filter.Limit > 100 {
		filter.Limit = 20
	}
	if filter.Page < 0 {
		filter.Page = 0
	}

	items, total, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, err
	}

	for i := range items {
		s.enrichItemURLs(&items[i])
	}

	hasMore := int64((filter.Page+1)*filter.Limit) < total

	return &dto.ItemListResponse{
		Items: items,
		Pagination: dto.PaginationMeta{
			Total:   total,
			Page:    filter.Page,
			Limit:   filter.Limit,
			HasMore: hasMore,
		},
	}, nil
}

// UpdateItem verifies ownership before applying partial modifications.
func (s *lostFoundServiceImpl) UpdateItem(
	ctx context.Context,
	userID uuid.UUID,
	id uuid.UUID,
	req *dto.UpdateItemRequest,
) (*model.LostFoundItemDetail, error) {
	raw, err := s.repo.GetRawByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Security: Only the post owner can update it
	if raw.UserID != userID {
		return nil, ErrUnauthorized
	}

	if req.Title != nil && strings.TrimSpace(*req.Title) != "" {
		raw.Title = strings.TrimSpace(*req.Title)
	}
	if req.Description != nil {
		raw.Description = req.Description
	}
	if req.Category != nil {
		raw.Category = req.Category
	}
	if req.Location != nil {
		raw.Location = req.Location
	}
	if req.PhoneNumber != nil {
		raw.PhoneNumber = req.PhoneNumber
	}
	if req.Status != nil && *req.Status != "" {
		raw.Status = model.ItemStatus(*req.Status)
	}

	if req.EventDate != nil {
		if strings.TrimSpace(*req.EventDate) == "" {
			raw.EventDate = nil
		} else {
			t, err := time.Parse("2006-01-02", strings.TrimSpace(*req.EventDate))
			if err != nil {
				return nil, fmt.Errorf("invalid event_date format: %w", err)
			}
			raw.EventDate = &t
		}
	}

	if req.ImageKey != nil {
		if strings.TrimSpace(*req.ImageKey) == "" {
			raw.ImageKey = nil
		} else {
			clean := strings.TrimSpace(*req.ImageKey)
			if s.r2Storage != nil {
				clean = s.r2Storage.ExtractKey(clean)
			}
			raw.ImageKey = &clean
		}
	}

	_, err = s.repo.Update(ctx, raw)
	if err != nil {
		return nil, err
	}

	detail, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	s.enrichItemURLs(detail)
	return detail, nil
}

// DeleteItem verifies ownership, removes from DB, and deletes the photo from Cloudflare R2.
func (s *lostFoundServiceImpl) DeleteItem(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	raw, err := s.repo.GetRawByID(ctx, id)
	if err != nil {
		return err
	}

	// Security: Only the post owner can delete it
	if raw.UserID != userID {
		return ErrUnauthorized
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}

	// Clean up image from R2 in background
	if raw.ImageKey != nil && *raw.ImageKey != "" && s.r2Storage != nil {
		imageKey := *raw.ImageKey
		go func() {
			delCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer cancel()
			if err := s.r2Storage.DeleteObject(delCtx, imageKey); err != nil {
				log.Printf("[Warning] Failed to delete R2 image key '%s': %v", imageKey, err)
			}
		}()
	}

	return nil
}

// GenerateUploadURL creates a presigned upload URL for item photos to Cloudflare R2.
func (s *lostFoundServiceImpl) GenerateUploadURL(
	ctx context.Context,
	userID uuid.UUID,
	req *dto.PresignImageRequest,
) (*dto.PresignImageResponse, error) {
	if s.r2Storage == nil {
		return nil, ErrStorageDisabled
	}

	key := s.r2Storage.GenerateLostFoundKey(userID.String(), req.Extension)
	uploadURL, err := s.r2Storage.GenerateAvatarUploadURL(ctx, key, req.ContentType)
	if err != nil {
		return nil, fmt.Errorf("failed to generate upload url: %w", err)
	}

	return &dto.PresignImageResponse{
		UploadURL: uploadURL,
		Key:       key,
		PublicURL: s.r2Storage.MediaURL(key),
	}, nil
}

// UploadImage streams image directly into Cloudflare R2 on server side.
func (s *lostFoundServiceImpl) UploadImage(
	ctx context.Context,
	userID uuid.UUID,
	extension string,
	contentType string,
	reader io.Reader,
	size int64,
) (*dto.PresignImageResponse, error) {
	if s.r2Storage == nil {
		return nil, ErrStorageDisabled
	}

	key := s.r2Storage.GenerateLostFoundKey(userID.String(), extension)
	if err := s.r2Storage.UploadObject(ctx, key, contentType, reader, size); err != nil {
		return nil, fmt.Errorf("failed to upload image to storage: %w", err)
	}

	return &dto.PresignImageResponse{
		Key:       key,
		PublicURL: s.r2Storage.MediaURL(key),
	}, nil
}
