package lostfound

import (
	authService "TemariCom/internal/auth/service"
	"TemariCom/internal/lostfound/handler"
	"TemariCom/internal/lostfound/repository"
	"TemariCom/internal/lostfound/service"
	"TemariCom/pkg/storage"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RegisterRoutes initializes the repository, service, handler, and mounts lost & found endpoints under /api/v1/lost-found
func RegisterRoutes(
	router fiber.Router,
	db *pgxpool.Pool,
	authSvc authService.AuthService,
	r2Storage *storage.R2Client,
) service.LostFoundService {
	repo := repository.NewLostFoundRepository(db)
	svc := service.NewLostFoundService(repo, r2Storage)
	h := handler.NewLostFoundHandler(svc, authSvc)

	group := router.Group("/lost-found")

	// Module Health Check
	group.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"module": "lostfound",
			"status": "ok",
		})
	})

	// Cloudflare R2 Image Upload (Presigned URL & Multipart fallback)
	group.Post("/upload-url", h.GenerateUploadURL)
	group.Post("/upload", h.UploadImage)

	// Lost & Found Items CRUD
	group.Get("/items", h.GetItems)
	group.Get("/items/:id", h.GetItem)
	group.Post("/items", h.CreateItem)
	group.Patch("/items/:id", h.UpdateItem)
	group.Delete("/items/:id", h.DeleteItem)

	return svc
}
