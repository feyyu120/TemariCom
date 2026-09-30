package service_test

import (
	"context"
	"testing"
	"time"

	"TemariCom/internal/chat/dto"
	"TemariCom/internal/chat/model"
	"TemariCom/internal/chat/repository"
	"TemariCom/internal/chat/service"

	"github.com/google/uuid"
)

// MockChatRepository implements repository.ChatRepository for unit testing
type MockChatRepository struct {
	DirectConvFn        func(ctx context.Context, user1ID, user2ID uuid.UUID) (*model.Conversation, error)
	GetUserConvsFn      func(ctx context.Context, userID uuid.UUID, limit, offset int) ([]dto.ConversationResponse, error)
	GetConvByIDFn       func(ctx context.Context, convID, userID uuid.UUID) (*model.Conversation, error)
	GetMessagesFn       func(ctx context.Context, convID, currentUserID uuid.UUID, limit int, before *time.Time) ([]dto.MessageResponse, error)
	CreateMessageFn     func(ctx context.Context, msg *model.Message) (*dto.MessageResponse, []uuid.UUID, error)
	MarkMessageDelivFn  func(ctx context.Context, messageID, userID uuid.UUID) error
	MarkAsReadFn        func(ctx context.Context, convID, userID uuid.UUID) error
	GetParticipantIDsFn func(ctx context.Context, convID uuid.UUID) ([]uuid.UUID, error)
	IsParticipantFn     func(ctx context.Context, convID, userID uuid.UUID) (bool, error)
	SearchUsersFn       func(ctx context.Context, currentUserID uuid.UUID, query string, limit int) ([]dto.UserSearchResponse, error)
	UpdateMessageFn     func(ctx context.Context, conversationID, messageID, userID uuid.UUID, newContent string) (*dto.MessageResponse, []uuid.UUID, error)
	DeleteMessageFn     func(ctx context.Context, conversationID, messageID, userID uuid.UUID, forAll bool) ([]uuid.UUID, error)
}

func (m *MockChatRepository) GetOrCreateDirectConversation(ctx context.Context, user1ID, user2ID uuid.UUID) (*model.Conversation, error) {
	if m.DirectConvFn != nil {
		return m.DirectConvFn(ctx, user1ID, user2ID)
	}
	return &model.Conversation{ID: uuid.New(), Type: model.ConversationTypeDirect}, nil
}

func (m *MockChatRepository) GetUserConversations(ctx context.Context, userID uuid.UUID, limit, offset int) ([]dto.ConversationResponse, error) {
	if m.GetUserConvsFn != nil {
		return m.GetUserConvsFn(ctx, userID, limit, offset)
	}
	return nil, nil
}

func (m *MockChatRepository) GetConversationByID(ctx context.Context, convID, userID uuid.UUID) (*model.Conversation, error) {
	if m.GetConvByIDFn != nil {
		return m.GetConvByIDFn(ctx, convID, userID)
	}
	return &model.Conversation{ID: convID}, nil
}

func (m *MockChatRepository) GetMessages(ctx context.Context, convID, currentUserID uuid.UUID, limit int, before *time.Time) ([]dto.MessageResponse, error) {
	if m.GetMessagesFn != nil {
		return m.GetMessagesFn(ctx, convID, currentUserID, limit, before)
	}
	return nil, nil
}

func (m *MockChatRepository) CreateMessage(ctx context.Context, msg *model.Message) (*dto.MessageResponse, []uuid.UUID, error) {
	if m.CreateMessageFn != nil {
		return m.CreateMessageFn(ctx, msg)
	}
	contentStr := ""
	if msg.Content != nil {
		contentStr = *msg.Content
	}
	return &dto.MessageResponse{
		ID:             uuid.New(),
		ConversationID: msg.ConversationID,
		SenderID:       msg.SenderID,
		Content:        contentStr,
		MessageType:    string(msg.MessageType),
		CreatedAt:      time.Now(),
	}, []uuid.UUID{uuid.New()}, nil
}

func (m *MockChatRepository) MarkMessageDelivered(ctx context.Context, messageID, userID uuid.UUID) error {
	if m.MarkMessageDelivFn != nil {
		return m.MarkMessageDelivFn(ctx, messageID, userID)
	}
	return nil
}

func (m *MockChatRepository) MarkConversationAsRead(ctx context.Context, convID, userID uuid.UUID) error {
	if m.MarkAsReadFn != nil {
		return m.MarkAsReadFn(ctx, convID, userID)
	}
	return nil
}

func (m *MockChatRepository) GetParticipantUserIDs(ctx context.Context, convID uuid.UUID) ([]uuid.UUID, error) {
	if m.GetParticipantIDsFn != nil {
		return m.GetParticipantIDsFn(ctx, convID)
	}
	return []uuid.UUID{}, nil
}

func (m *MockChatRepository) IsParticipant(ctx context.Context, convID, userID uuid.UUID) (bool, error) {
	if m.IsParticipantFn != nil {
		return m.IsParticipantFn(ctx, convID, userID)
	}
	return true, nil
}

func (m *MockChatRepository) SearchUsers(ctx context.Context, currentUserID uuid.UUID, query string, limit int) ([]dto.UserSearchResponse, error) {
	if m.SearchUsersFn != nil {
		return m.SearchUsersFn(ctx, currentUserID, query, limit)
	}
	return []dto.UserSearchResponse{}, nil
}

func (m *MockChatRepository) UpdateMessageContent(ctx context.Context, conversationID, messageID, userID uuid.UUID, newContent string) (*dto.MessageResponse, []uuid.UUID, error) {
	if m.UpdateMessageFn != nil {
		return m.UpdateMessageFn(ctx, conversationID, messageID, userID, newContent)
	}
	return &dto.MessageResponse{ID: messageID, Content: newContent}, []uuid.UUID{uuid.New()}, nil
}

func (m *MockChatRepository) DeleteMessage(ctx context.Context, conversationID, messageID, userID uuid.UUID, forAll bool) ([]uuid.UUID, error) {
	if m.DeleteMessageFn != nil {
		return m.DeleteMessageFn(ctx, conversationID, messageID, userID, forAll)
	}
	return []uuid.UUID{uuid.New()}, nil
}

func (m *MockChatRepository) BlockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error {
	return nil
}

func (m *MockChatRepository) UnblockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error {
	return nil
}

func (m *MockChatRepository) IsUserBlocked(ctx context.Context, user1ID, user2ID uuid.UUID) (bool, error) {
	return false, nil
}

func (m *MockChatRepository) DeleteConversation(ctx context.Context, conversationID, userID uuid.UUID) error {
	return nil
}

func (m *MockChatRepository) GetBlockedUserIDs(ctx context.Context, blockerID uuid.UUID) ([]uuid.UUID, error) {
	return []uuid.UUID{}, nil
}

func (m *MockChatRepository) UpdateUserLastSeen(ctx context.Context, userID uuid.UUID) error {
	return nil
}

func TestCannotChatWithSelf(t *testing.T) {
	mockRepo := &MockChatRepository{}
	svc := service.NewChatService(mockRepo, nil)

	userID := uuid.New()
	_, err := svc.CreateDirectChat(context.Background(), userID, userID)
	if err == nil {
		t.Fatalf("expected error when chatting with self, got nil")
	}
	if err != repository.ErrCannotChatSelf {
		t.Fatalf("expected ErrCannotChatSelf, got %v", err)
	}
}

func TestSendMessageValidation(t *testing.T) {
	mockRepo := &MockChatRepository{}
	svc := service.NewChatService(mockRepo, nil)

	convID := uuid.New()
	senderID := uuid.New()

	// 1. Empty content and empty media should fail
	_, _, err := svc.SendMessage(context.Background(), convID, senderID, dto.SendMessageRequest{
		Content: "",
	})
	if err == nil {
		t.Fatalf("expected error on empty message, got nil")
	}
	if err != service.ErrEmptyMessage {
		t.Fatalf("expected ErrEmptyMessage, got %v", err)
	}

	// 2. Valid message should succeed
	msg, recipients, err := svc.SendMessage(context.Background(), convID, senderID, dto.SendMessageRequest{
		Content: "Hello World",
	})
	if err != nil {
		t.Fatalf("unexpected error on valid message: %v", err)
	}
	if msg.Content != "Hello World" {
		t.Fatalf("expected content 'Hello World', got '%s'", msg.Content)
	}
	if len(recipients) == 0 {
		t.Fatalf("expected recipients slice to have elements")
	}
}

func TestCursorPagination(t *testing.T) {
	now := time.Now()
	mockRepo := &MockChatRepository{
		GetMessagesFn: func(ctx context.Context, convID, currentUserID uuid.UUID, limit int, before *time.Time) ([]dto.MessageResponse, error) {
			// Return 3 items when limit requested is 2 (simulates limit+1)
			return []dto.MessageResponse{
				{ID: uuid.New(), Content: "msg3", CreatedAt: now},
				{ID: uuid.New(), Content: "msg2", CreatedAt: now.Add(-time.Minute)},
				{ID: uuid.New(), Content: "msg1", CreatedAt: now.Add(-2 * time.Minute)},
			}, nil
		},
	}
	svc := service.NewChatService(mockRepo, nil)

	page, err := svc.GetMessages(context.Background(), uuid.New(), uuid.New(), 2, "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !page.HasMore {
		t.Fatalf("expected HasMore to be true")
	}
	if len(page.Messages) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(page.Messages))
	}
	if page.NextCursor == nil {
		t.Fatalf("expected non-nil NextCursor")
	}
}

func TestIsParticipant(t *testing.T) {
	convID := uuid.New()
	user1 := uuid.New()
	user2 := uuid.New()

	mockRepo := &MockChatRepository{
		IsParticipantFn: func(ctx context.Context, cID, uID uuid.UUID) (bool, error) {
			if cID == convID && uID == user1 {
				return true, nil
			}
			return false, nil
		},
	}
	svc := service.NewChatService(mockRepo, nil)

	isPart1, err := svc.IsParticipant(context.Background(), convID, user1)
	if err != nil || !isPart1 {
		t.Fatalf("expected user1 to be participant, got %v, err=%v", isPart1, err)
	}

	isPart2, err := svc.IsParticipant(context.Background(), convID, user2)
	if err != nil || isPart2 {
		t.Fatalf("expected user2 to NOT be participant, got %v, err=%v", isPart2, err)
	}
}

func TestSearchUsers(t *testing.T) {
	currentUserID := uuid.New()
	targetID := uuid.New()

	mockRepo := &MockChatRepository{
		SearchUsersFn: func(ctx context.Context, uID uuid.UUID, query string, limit int) ([]dto.UserSearchResponse, error) {
			return []dto.UserSearchResponse{
				{
					ID:        targetID,
					Username:  "nebi_test",
					FullName:  "Nebiyu Tadesse",
					AvatarURL: "avatars/nebi.jpg",
				},
			}, nil
		},
	}
	svc := service.NewChatService(mockRepo, nil)

	users, err := svc.SearchUsers(context.Background(), currentUserID, "nebi", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(users) != 1 {
		t.Fatalf("expected 1 user, got %d", len(users))
	}
	if users[0].Username != "nebi_test" {
		t.Fatalf("expected username nebi_test, got %s", users[0].Username)
	}
}
