package service_test

import (
	"context"
	"testing"
	"time"

	"TemariCom/internal/lostfound/dto"
	"TemariCom/internal/lostfound/model"
	"TemariCom/internal/lostfound/repository"
	"TemariCom/internal/lostfound/service"

	"github.com/google/uuid"
)

// Mock repository
type mockLostFoundRepository struct {
	items map[uuid.UUID]*model.LostFoundItem
}

func newMockRepo() *mockLostFoundRepository {
	return &mockLostFoundRepository{
		items: make(map[uuid.UUID]*model.LostFoundItem),
	}
}

func (m *mockLostFoundRepository) Create(ctx context.Context, item *model.LostFoundItem) (*model.LostFoundItem, error) {
	item.ID = uuid.New()
	item.CreatedAt = time.Now()
	item.UpdatedAt = time.Now()
	m.items[item.ID] = item
	return item, nil
}

func (m *mockLostFoundRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.LostFoundItemDetail, error) {
	item, ok := m.items[id]
	if !ok {
		return nil, repository.ErrItemNotFound
	}
	return &model.LostFoundItemDetail{
		LostFoundItem: *item,
		Reporter: model.ReporterInfo{
			ID:        item.UserID,
			FullName:  "Test Student",
			Username:  "teststudent",
			AvatarURL: "avatars/test.jpg",
		},
	}, nil
}

func (m *mockLostFoundRepository) GetRawByID(ctx context.Context, id uuid.UUID) (*model.LostFoundItem, error) {
	item, ok := m.items[id]
	if !ok {
		return nil, repository.ErrItemNotFound
	}
	return item, nil
}

func (m *mockLostFoundRepository) List(ctx context.Context, filter dto.ItemFilterQuery) ([]model.LostFoundItemDetail, int64, error) {
	var list []model.LostFoundItemDetail
	for _, item := range m.items {
		if filter.Type != "" && string(item.Type) != filter.Type {
			continue
		}
		list = append(list, model.LostFoundItemDetail{
			LostFoundItem: *item,
			Reporter: model.ReporterInfo{
				ID:        item.UserID,
				FullName:  "Test Student",
				Username:  "teststudent",
				AvatarURL: "avatars/test.jpg",
			},
		})
	}
	return list, int64(len(list)), nil
}

func (m *mockLostFoundRepository) Update(ctx context.Context, item *model.LostFoundItem) (*model.LostFoundItem, error) {
	item.UpdatedAt = time.Now()
	m.items[item.ID] = item
	return item, nil
}

func (m *mockLostFoundRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if _, ok := m.items[id]; !ok {
		return repository.ErrItemNotFound
	}
	delete(m.items, id)
	return nil
}

func TestLostFoundService_CreateAndGet(t *testing.T) {
	repo := newMockRepo()
	svc := service.NewLostFoundService(repo, nil)

	ctx := context.Background()
	ownerID := uuid.New()

	dateStr := "2026-09-28"
	desc := "Left in the main library on 2nd floor"
	loc := "Main Campus Library"
	cat := "electronics"
	img := "lostfound/sample.jpg"

	createReq := &dto.CreateItemRequest{
		Type:        "lost",
		Title:       "MacBook Pro 14 M2",
		Description: &desc,
		Category:    &cat,
		Location:    &loc,
		EventDate:   &dateStr,
		ImageKey:    &img,
	}

	created, err := svc.CreateItem(ctx, ownerID, createReq)
	if err != nil {
		t.Fatalf("unexpected error creating item: %v", err)
	}

	if created.Title != "MacBook Pro 14 M2" {
		t.Errorf("expected title 'MacBook Pro 14 M2', got '%s'", created.Title)
	}
	if created.Type != model.TypeLost {
		t.Errorf("expected type 'lost', got '%s'", created.Type)
	}
	if created.Status != model.StatusActive {
		t.Errorf("expected status 'active', got '%s'", created.Status)
	}

	// Fetch item
	fetched, err := svc.GetItem(ctx, created.ID)
	if err != nil {
		t.Fatalf("unexpected error fetching item: %v", err)
	}
	if fetched.ID != created.ID {
		t.Errorf("expected ID '%s', got '%s'", created.ID, fetched.ID)
	}
}

func TestLostFoundService_UpdateOwnershipSecurity(t *testing.T) {
	repo := newMockRepo()
	svc := service.NewLostFoundService(repo, nil)

	ctx := context.Background()
	ownerID := uuid.New()
	otherUserID := uuid.New()

	createReq := &dto.CreateItemRequest{
		Type:  "found",
		Title: "Calculus Textbook",
	}

	created, err := svc.CreateItem(ctx, ownerID, createReq)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// 1. Unauthorized user tries to update
	newStatus := "resolved"
	updateReq := &dto.UpdateItemRequest{
		Status: &newStatus,
	}

	_, err = svc.UpdateItem(ctx, otherUserID, created.ID, updateReq)
	if err == nil {
		t.Fatalf("expected authorization error for non-owner, got nil")
	}

	// 2. Owner updates status to 'resolved'
	updated, err := svc.UpdateItem(ctx, ownerID, created.ID, updateReq)
	if err != nil {
		t.Fatalf("unexpected error updating as owner: %v", err)
	}
	if updated.Status != model.StatusResolved {
		t.Errorf("expected status 'resolved', got '%s'", updated.Status)
	}
}

func TestLostFoundService_DeleteOwnershipSecurity(t *testing.T) {
	repo := newMockRepo()
	svc := service.NewLostFoundService(repo, nil)

	ctx := context.Background()
	ownerID := uuid.New()
	otherUserID := uuid.New()

	createReq := &dto.CreateItemRequest{
		Type:  "lost",
		Title: "Student ID Card",
	}

	created, err := svc.CreateItem(ctx, ownerID, createReq)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// 1. Non-owner cannot delete
	err = svc.DeleteItem(ctx, otherUserID, created.ID)
	if err == nil {
		t.Fatalf("expected authorization error for non-owner delete, got nil")
	}

	// 2. Owner deletes successfully
	err = svc.DeleteItem(ctx, ownerID, created.ID)
	if err != nil {
		t.Fatalf("unexpected error deleting as owner: %v", err)
	}

	// 3. Subsequent get should return not found
	_, err = svc.GetItem(ctx, created.ID)
	if err == nil {
		t.Fatalf("expected not found error after deletion, got nil")
	}
}
