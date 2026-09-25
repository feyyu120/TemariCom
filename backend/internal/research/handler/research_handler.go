package handler

import (
	"errors"
	"log"
	"strconv"

	authService "TemariCom/internal/auth/service"
	"TemariCom/internal/research/dto"
	"TemariCom/internal/research/repository"
	"TemariCom/internal/research/service"
	"TemariCom/pkg/middleware"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type ResearchHandler struct {
	researchService service.ResearchService
	authService     authService.AuthService
}

func NewResearchHandler(researchService service.ResearchService, authService authService.AuthService) *ResearchHandler {
	return &ResearchHandler{
		researchService: researchService,
		authService:     authService,
	}
}

// extractAuthUser strictly validates active session token (via Bearer header or HttpOnly cookie).
func (h *ResearchHandler) extractAuthUser(c fiber.Ctx) (uuid.UUID, error) {
	token := middleware.ExtractSessionToken(c)
	if token == "" {
		return uuid.Nil, errors.New("unauthorized: missing session token")
	}

	user, err := h.authService.ValidateSession(c.Context(), token)
	if err != nil {
		return uuid.Nil, err
	}

	return user.ID, nil
}

// extractOptionalAuthUser returns user UUID if logged in, or nil if guest.
func (h *ResearchHandler) extractOptionalAuthUser(c fiber.Ctx) *uuid.UUID {
	token := middleware.ExtractSessionToken(c)
	if token == "" {
		return nil
	}

	user, err := h.authService.ValidateSession(c.Context(), token)
	if err != nil {
		return nil
	}

	return &user.ID
}

// Search: GET /api/v1/research/search?q=...&page=0&limit=20
func (h *ResearchHandler) Search(c fiber.Ctx) error {
	q := c.Query("q")
	page, _ := strconv.Atoi(c.Query("page", "0"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	viewerID := h.extractOptionalAuthUser(c)

	res, err := h.researchService.SearchPapers(c.Context(), viewerID, q, page, limit)
	if err != nil {
		log.Printf("[ResearchHandler.Search] error: %v", err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to search research papers",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":    true,
		"data":       res.Data,
		"pagination": res.Pagination,
	})
}

// AdvancedSearch: POST /api/v1/research/search
func (h *ResearchHandler) AdvancedSearch(c fiber.Ctx) error {
	var req dto.AdvancedSearchRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid search payload",
		})
	}

	viewerID := h.extractOptionalAuthUser(c)

	res, err := h.researchService.AdvancedSearch(c.Context(), viewerID, &req)
	if err != nil {
		log.Printf("[ResearchHandler.AdvancedSearch] error: %v", err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to execute advanced research search",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":    true,
		"data":       res.Data,
		"pagination": res.Pagination,
	})
}

// GetPaper: GET /api/v1/research/papers/:id
func (h *ResearchHandler) GetPaper(c fiber.Ctx) error {
	paperID := c.Params("id")
	if paperID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Paper ID parameter is required",
		})
	}

	viewerID := h.extractOptionalAuthUser(c)

	paper, err := h.researchService.GetPaper(c.Context(), viewerID, paperID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Research paper not found",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    paper,
	})
}

// SavePaper: POST /api/v1/research/saved
func (h *ResearchHandler) SavePaper(c fiber.Ctx) error {
	userID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Unauthorized: please sign in to save papers",
		})
	}

	var req dto.SavePaperRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	if req.ExternalPaperID == "" || req.Title == "" || req.PaperURL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "external_paper_id, title, and paper_url are required",
		})
	}

	saved, err := h.researchService.SavePaper(c.Context(), userID, &req)
	if err != nil {
		log.Printf("[ResearchHandler.SavePaper] error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to save research paper",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    saved,
		"message": "Paper saved to research library successfully",
	})
}

// RemoveSavedPaper: DELETE /api/v1/research/saved/:id
func (h *ResearchHandler) RemoveSavedPaper(c fiber.Ctx) error {
	userID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Unauthorized",
		})
	}

	paperUUID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid saved paper UUID",
		})
	}

	if err := h.researchService.RemoveSavedPaper(c.Context(), userID, paperUUID); err != nil {
		if errors.Is(err, repository.ErrSavedPaperNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"error":   "Saved paper not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to remove paper from saved library",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Paper removed from saved library",
	})
}

// RemoveSavedPaperByExternalID: DELETE /api/v1/research/saved/paper/:external_id
func (h *ResearchHandler) RemoveSavedPaperByExternalID(c fiber.Ctx) error {
	userID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Unauthorized",
		})
	}

	extID := c.Params("external_id")
	if extID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "external_id is required",
		})
	}

	if err := h.researchService.RemoveSavedPaperByExternalID(c.Context(), userID, extID); err != nil {
		if errors.Is(err, repository.ErrSavedPaperNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"error":   "Saved paper not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to remove paper from saved library",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Paper removed from saved library",
	})
}

// ListSaved: GET /api/v1/research/saved?page=0&limit=20
func (h *ResearchHandler) ListSaved(c fiber.Ctx) error {
	userID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Unauthorized: please sign in to view saved papers",
		})
	}

	page, _ := strconv.Atoi(c.Query("page", "0"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	res, err := h.researchService.ListSavedPapers(c.Context(), userID, page, limit)
	if err != nil {
		log.Printf("[ResearchHandler.ListSaved] error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to retrieve saved research papers",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    res.Papers,
		"pagination": fiber.Map{
			"page":     res.Page,
			"limit":    res.Limit,
			"total":    res.Total,
			"has_more": res.HasMore,
		},
	})
}

// CheckSaved: GET /api/v1/research/saved/check/:external_id
func (h *ResearchHandler) CheckSaved(c fiber.Ctx) error {
	userID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"success": true,
			"data": fiber.Map{
				"is_saved": false,
			},
		})
	}

	extID := c.Params("external_id")
	res, err := h.researchService.CheckIsPaperSaved(c.Context(), userID, extID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to check saved status",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    res,
	})
}
