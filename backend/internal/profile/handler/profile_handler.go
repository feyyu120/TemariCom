package handler

import (
	"errors"
	"log"
	"strconv"

	authRepo "TemariCom/internal/auth/repository"
	authService "TemariCom/internal/auth/service"
	"TemariCom/internal/profile/dto"
	"TemariCom/internal/profile/repository"
	"TemariCom/internal/profile/service"
	"TemariCom/pkg/middleware"
	"TemariCom/pkg/validator"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type ProfileHandler struct {
	profileService service.ProfileService
	authService    authService.AuthService
}

func NewProfileHandler(profileService service.ProfileService, authService authService.AuthService) *ProfileHandler {
	return &ProfileHandler{
		profileService: profileService,
		authService:    authService,
	}
}

// helper to extract authenticated user from Bearer header or HttpOnly cookie
func (h *ProfileHandler) extractAuthUser(c fiber.Ctx) (uuid.UUID, error) {
	token := middleware.ExtractSessionToken(c)
	if token == "" {
		return uuid.Nil, errors.New("unauthorized: missing token")
	}

	user, err := h.authService.ValidateSession(c.Context(), token)
	if err != nil {
		return uuid.Nil, err
	}

	return user.ID, nil
}

// GetMyProfile: GET /api/v1/profile/me
func (h *ProfileHandler) GetMyProfile(c fiber.Ctx) error {
	userID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Unauthorized session",
		})
	}

	res, err := h.profileService.GetMyProfile(c.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"error":   "User not found",
			})
		}
		log.Printf("[ProfileHandler.GetMyProfile] error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to load profile",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    res,
	})
}

// GetUserProfile: GET /api/v1/profile/:id
func (h *ProfileHandler) GetUserProfile(c fiber.Ctx) error {
	targetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid user ID format",
		})
	}

	var viewerID *uuid.UUID
	if vID, err := h.extractAuthUser(c); err == nil {
		viewerID = &vID
	}

	res, err := h.profileService.GetUserProfile(c.Context(), viewerID, targetID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"error":   "User not found",
			})
		}
		log.Printf("[ProfileHandler.GetUserProfile] error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to retrieve user profile",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    res,
	})
}

// UpdateMyProfile: PATCH /api/v1/profile/me
// Handles atomic partial updates with field validation
func (h *ProfileHandler) UpdateMyProfile(c fiber.Ctx) error {
	userID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Unauthorized session",
		})
	}

	var req dto.UpdateProfileRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body format",
		})
	}

	if valErrors := validator.ValidateStruct(req); len(valErrors) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success":           false,
			"error":             "Validation failed",
			"validation_errors": valErrors,
		})
	}

	res, err := h.profileService.UpdateProfile(c.Context(), userID, req)
	if err != nil {
		if errors.Is(err, repository.ErrDuplicateUsername) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"success": false,
				"error":   "This username is already taken. Please choose another.",
			})
		}
		if errors.Is(err, repository.ErrDuplicatePhone) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"success": false,
				"error":   "This phone number is already registered to another account.",
			})
		}
		if errors.Is(err, repository.ErrInvalidStudyLevel) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid study level degree specified",
			})
		}
		if errors.Is(err, repository.ErrUserNotFound) || errors.Is(err, authRepo.ErrUserNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"error":   "User account not found",
			})
		}
		log.Printf("[ProfileHandler.UpdateMyProfile] error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to update profile",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Profile updated successfully",
		"data":    res,
	})
}

// DeleteAccount: DELETE /api/v1/profile/me
// Permanently deletes user account from DB, cascading across all tables
func (h *ProfileHandler) DeleteAccount(c fiber.Ctx) error {
	userID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Unauthorized session",
		})
	}

	if err := h.profileService.DeleteAccount(c.Context(), userID); err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"error":   "User account not found",
			})
		}
		log.Printf("[ProfileHandler.DeleteAccount] error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to delete account from database",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "User account and all associated profile data have been permanently deleted.",
	})
}

// ListCampusStudents: GET /api/v1/profile/campus/:institution_id
func (h *ProfileHandler) ListCampusStudents(c fiber.Ctx) error {
	instID, err := uuid.Parse(c.Params("institution_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid institution ID format",
		})
	}

	var deptID *uuid.UUID
	if deptStr := c.Query("department_id"); deptStr != "" {
		if parsed, err := uuid.Parse(deptStr); err == nil {
			deptID = &parsed
		}
	}

	var studyLevel *string
	if sl := c.Query("study_level"); sl != "" {
		studyLevel = &sl
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	students, err := h.profileService.ListCampusStudents(c.Context(), instID, deptID, studyLevel, page, limit)
	if err != nil {
		log.Printf("[ProfileHandler.ListCampusStudents] error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to retrieve campus students",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    students,
	})
}

// GenerateAvatarUploadURL: POST /api/v1/profile/avatar/presign
func (h *ProfileHandler) GenerateAvatarUploadURL(c fiber.Ctx) error {
	userID, err := h.extractAuthUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Unauthorized session",
		})
	}

	var req dto.PresignAvatarRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body format",
		})
	}

	if valErrors := validator.ValidateStruct(req); len(valErrors) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   valErrors[0].Message,
		})
	}

	res, err := h.profileService.GenerateAvatarUploadURL(c.Context(), userID, req.Extension, req.ContentType)
	if err != nil {
		log.Printf("[ProfileHandler.GenerateAvatarUploadURL] error: %v", err)
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
