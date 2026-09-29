package chat

import (
	authService "TemariCom/internal/auth/service"
	"TemariCom/internal/chat/handler"
	"TemariCom/internal/chat/repository"
	"TemariCom/internal/chat/service"
	"TemariCom/pkg/storage"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RegisterRoutes(
	app *fiber.App,
	api fiber.Router,
	db *pgxpool.Pool,
	authSvc authService.AuthService,
	r2Storage *storage.R2Client,
) service.ChatService {
	// 1. Initialize Clean Architecture Dependencies
	chatRepo := repository.NewChatRepository(db)
	chatSvc := service.NewChatService(chatRepo, r2Storage)
	wsHub := handler.NewWSHub()
	chatHandler := handler.NewChatHandler(chatSvc, authSvc, wsHub)

	// 2. WebSocket Real-Time Endpoints (GoFiber contrib websocket/event)
	// Supports /ws/chat and /api/v1/chat/ws with ?token=<token> or Bearer auth
	app.Use("/ws/chat", chatHandler.WSUpgradeMiddleware)
	app.Get("/ws/chat", chatHandler.WSConnectionHandler())

	api.Use("/chat/ws", chatHandler.WSUpgradeMiddleware)
	api.Get("/chat/ws", chatHandler.WSConnectionHandler())

	// 3. REST Endpoints under /api/v1/chat
	chatGroup := api.Group("/chat")

	// Health Check & Telemetry
	chatGroup.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"module": "chat",
			"status": "ok",
		})
	})
	chatGroup.Get("/metrics", chatHandler.GetMetrics)

	// Conversations
	chatGroup.Get("/conversations", chatHandler.GetUserConversations)
	chatGroup.Post("/conversations/direct", chatHandler.CreateDirectChat)
	chatGroup.Post("/direct", chatHandler.CreateDirectChat)

	// Messages with Cursor-Based Pagination, Editing & Deletion
	chatGroup.Get("/conversations/:id/messages", chatHandler.GetMessages)
	chatGroup.Post("/conversations/:id/messages", chatHandler.SendMessage)
	chatGroup.Put("/conversations/:id/messages/:msgId", chatHandler.EditMessage)
	chatGroup.Delete("/conversations/:id/messages/:msgId", chatHandler.DeleteMessage)

	// Read Receipts
	chatGroup.Post("/conversations/:id/read", chatHandler.MarkAsRead)

	// User Search for Starting Chats
	chatGroup.Get("/users/search", chatHandler.SearchUsers)

	return chatSvc
}
