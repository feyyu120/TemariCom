package research

import (
	authService "TemariCom/internal/auth/service"
	"TemariCom/internal/research/client"
	"TemariCom/internal/research/handler"
	"TemariCom/internal/research/repository"
	"TemariCom/internal/research/service"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RegisterRoutes initializes the research client, repository, service, handler, and mounts endpoints under /api/v1/research
func RegisterRoutes(
	router fiber.Router,
	db *pgxpool.Pool,
	authSvc authService.AuthService,
	scholarXivBaseURL,
	scholarXivAPIKey string,
) service.ResearchService {
	// Client
	scholarXivClient := client.NewScholarXivClient(scholarXivBaseURL, scholarXivAPIKey)

	// Repository
	savedPaperRepo := repository.NewSavedPaperRepository(db)

	// Service
	researchService := service.NewResearchService(scholarXivClient, savedPaperRepo)

	// Handler
	researchHandler := handler.NewResearchHandler(researchService, authSvc)

	group := router.Group("/research")

	// Health check
	group.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"module": "research",
			"status": "ok",
		})
	})

	// Paper search and discovery endpoints
	group.Get("/search", researchHandler.Search)
	group.Post("/search", researchHandler.AdvancedSearch)
	group.Get("/papers/:id", researchHandler.GetPaper)

	// User saved papers library endpoints
	group.Get("/saved", researchHandler.ListSaved)
	group.Post("/saved", researchHandler.SavePaper)
	group.Delete("/saved/:id", researchHandler.RemoveSavedPaper)
	group.Delete("/saved/paper/:external_id", researchHandler.RemoveSavedPaperByExternalID)
	group.Get("/saved/check/:external_id", researchHandler.CheckSaved)

	return researchService
}
