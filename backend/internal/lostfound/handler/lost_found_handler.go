package handler

import (
	"errors"
	"log"
	"strconv"
	"strings"

	authService "TemariCom/internal/auth/service"
	"TemariCom/internal/lostfound/dto"
	"TemariCom/internal/lostfound/repository"
	"TemariCom/internal/lostfound/service"
	"TemariCom/pkg/middleware"
	"TemariCom/pkg/validator"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type LostFoundHandler struct {
	service     service.LostFoundService
	authService authService.AuthService
}

func NewLostFoundHandler(
	service service.LostFoundService,
	authService authService.AuthService,
) *LostFoundHandler {
	return &LostFoundHandler{
		service:     service,
		authService: authService,
	}
}

// extractAuthUser strictly validates the active session token from Bearer header or cookie.
func (h *LostFoundHandler) extractAuthUser(c fiber.Ctx) (uuid.UUID, error) {
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

// GetItems: GET /api/v1/lost-found/items
func (h *LostFoundHandler) GetItems(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "0"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}

	filter := dto.ItemFilterQuery{
		Type:     strings.ToLower(strings.TrimSpace(c.Query("type"))),
		Status:   strings.ToLower(strings.TrimSpace(c.Query("status"))),
		Category: strings.TrimSpace(c.Query("category")),
		Search:   strings.TrimSpace(search),
		Page:     page,
		Limit:    limit,
	}

	res, err := h.service.ListItems(c.Context(), filter)
	if err != nil {
		log.Printf("[LostFoundHandler.GetItems] error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to load lost and found items",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":    true,
		"data":       res.Items,
		"pagination": res.Pagination,
	})
}

// GetItem: GET /api/v1/lost-found/items/:id
func (h *LostFoundHandler) GetItem(c fiber.Ctx) error {
	idParam := c.Params("id")
	itemID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid item UUID parameter",
		})
	}

	item, err := h.service.GetItem(c.Context(), itemID)
	if err != nil {
		if errors.Is(err, repository.ErrItemNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"error":   "Lost or found item not found",
			})
		}
		log.Printf("[LostFoundHandler.GetItem] error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to retrieve item",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    item,
	})
}

// CreateItem: POST /api/v1/lost-found/items
func (h *LostFoundHandler) CreateItem(c fiber.Ctx) error {
	userID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Authentication required to post an item",
		})
	}

	var req dto.CreateItemRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	if validationErrors := validator.ValidateStruct(&req); len(validationErrors) > 0 {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"success": false,
			"errors":  validationErrors,
		})
	}

	item, err := h.service.CreateItem(c.Context(), userID, &req)
	if err != nil {
		log.Printf("[LostFoundHandler.CreateItem] error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to create lost or found item",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    item,
	})
}

// UpdateItem: PATCH /api/v1/lost-found/items/:id
func (h *LostFoundHandler) UpdateItem(c fiber.Ctx) error {
	userID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Authentication required",
		})
	}

	idParam := c.Params("id")
	itemID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid item UUID parameter",
		})
	}

	var req dto.UpdateItemRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request payload",
		})
	}

	if validationErrors := validator.ValidateStruct(&req); len(validationErrors) > 0 {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"success": false,
			"errors":  validationErrors,
		})
	}

	updated, err := h.service.UpdateItem(c.Context(), userID, itemID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrItemNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"error":   "Lost or found item not found",
			})
		}
		if errors.Is(err, service.ErrUnauthorized) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error":   "You do not have permission to modify this item",
			})
		}
		log.Printf("[LostFoundHandler.UpdateItem] error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to update item",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    updated,
	})
}

// DeleteItem: DELETE /api/v1/lost-found/items/:id
func (h *LostFoundHandler) DeleteItem(c fiber.Ctx) error {
	userID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Authentication required",
		})
	}

	idParam := c.Params("id")
	itemID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid item UUID parameter",
		})
	}

	err = h.service.DeleteItem(c.Context(), userID, itemID)
	if err != nil {
		if errors.Is(err, repository.ErrItemNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"error":   "Lost or found item not found",
			})
		}
		if errors.Is(err, service.ErrUnauthorized) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error":   "You do not have permission to delete this item",
			})
		}
		log.Printf("[LostFoundHandler.DeleteItem] error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to delete item",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Item deleted successfully",
	})
}

// GenerateUploadURL: POST /api/v1/lost-found/upload-url
func (h *LostFoundHandler) GenerateUploadURL(c fiber.Ctx) error {
	userID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Authentication required",
		})
	}

	var req dto.PresignImageRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request payload",
		})
	}

	if validationErrors := validator.ValidateStruct(&req); len(validationErrors) > 0 {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"success": false,
			"errors":  validationErrors,
		})
	}

	res, err := h.service.GenerateUploadURL(c.Context(), userID, &req)
	if err != nil {
		if errors.Is(err, service.ErrStorageDisabled) {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"success": false,
				"error":   "Cloud image storage is not configured",
			})
		}
		log.Printf("[LostFoundHandler.GenerateUploadURL] error: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    res,
	})
}

// UploadImage: POST /api/v1/lost-found/upload (multipart form upload)
func (h *LostFoundHandler) UploadImage(c fiber.Ctx) error {
	userID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Authentication required",
		})
	}

	file, err := c.FormFile("image")
	if err != nil {
		file, err = c.FormFile("file")
	}
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "No image file uploaded in 'image' or 'file' form field",
		})
	}

	if file.Size > 10*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Image size exceeds 10MB limit",
		})
	}

	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}

	src, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to open uploaded file",
		})
	}
	defer src.Close()

	ext := "jpg"
	if parts := strings.Split(file.Filename, "."); len(parts) > 1 {
		ext = parts[len(parts)-1]
	}

	res, err := h.service.UploadImage(c.Context(), userID, ext, contentType, src, file.Size)
	if err != nil {
		if errors.Is(err, service.ErrStorageDisabled) {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"success": false,
				"error":   "Cloud image storage is not configured",
			})
		}
		log.Printf("[LostFoundHandler.UploadImage] error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to store uploaded image",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    res,
	})
}
