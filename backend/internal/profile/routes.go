package profile

import (
	authService "TemariCom/internal/auth/service"
	"TemariCom/internal/profile/handler"
	"TemariCom/internal/profile/repository"
	"TemariCom/internal/profile/service"
	"TemariCom/pkg/storage"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RegisterRoutes initializes the profile repository, service, handler, and mounts endpoints under /api/v1/profile
func RegisterRoutes(router fiber.Router, db *pgxpool.Pool, authSvc authService.AuthService, r2Storage *storage.R2Client) service.ProfileService {
	// Repository
	profileRepo := repository.NewStudentProfileRepository(db)

	// Service
	profileService := service.NewProfileService(profileRepo, r2Storage)

	// Handler
	profileHandler := handler.NewProfileHandler(profileService, authSvc)

	group := router.Group("/profile")

	// Health check
	group.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"module": "profile",
			"status": "ok",
		})
	})

	// Profile management endpoints
	group.Get("/me", profileHandler.GetMyProfile)
	group.Patch("/me", profileHandler.UpdateMyProfile)
	group.Delete("/me", profileHandler.DeleteAccount)
	group.Get("/campus/:institution_id", profileHandler.ListCampusStudents)
	group.Get("/:id", profileHandler.GetUserProfile)

	// Cloudflare R2 Avatar Upload Presigned URL
	group.Post("/avatar/presign", profileHandler.GenerateAvatarUploadURL)
	group.Post("/avatar/upload-url", profileHandler.GenerateAvatarUploadURL)

	return profileService
}
