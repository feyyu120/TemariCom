package dto

import (
	"TemariCom/internal/profile/model"

	"github.com/google/uuid"
)

// UpdateProfileRequest supports partial updates (PATCH) from Profile Setup or Settings.
// Nil fields are ignored and will NOT overwrite existing values in PostgreSQL.
type UpdateProfileRequest struct {
	Username      *string           `json:"username" validate:"omitempty,min=3,max=50"`
	Phone         *string           `json:"phone" validate:"omitempty,min=7,max=20"`
	FullName      *string           `json:"full_name" validate:"omitempty,min=2,max=100"`
	AvatarURL     *string           `json:"avatar_url" validate:"omitempty,max=500"`
	Bio           *string           `json:"bio" validate:"omitempty,max=255"`
	StudyLevel    *model.StudyLevel `json:"study_level" validate:"omitempty,oneof=elementary high_school undergraduate postgraduate masters phd diploma other"`
	AcademicYear  *int              `json:"academic_year" validate:"omitempty,min=1,max=12"`
	InstitutionID *uuid.UUID        `json:"institution_id"`
	DepartmentID  *uuid.UUID        `json:"department_id"`
	PortfolioURL  *string           `json:"portfolio_url" validate:"omitempty,url,max=500"`
}

// ProfileStatusResponse informs clients whether user finished profile setup or skipped.
type ProfileStatusResponse struct {
	IsProfileCompleted bool `json:"is_profile_completed"`
}

// PresignAvatarRequest contains the file extension and MIME type to generate a presigned PUT URL.
type PresignAvatarRequest struct {
	Extension   string `json:"extension" validate:"omitempty,max=10"`
	ContentType string `json:"content_type" validate:"required,max=50"`
}

// PresignAvatarResponse contains the presigned PUT upload URL and the storage key to be saved in PostgreSQL.
type PresignAvatarResponse struct {
	UploadURL string `json:"upload_url"`
	Key       string `json:"key"`
	PublicURL string `json:"public_url"`
}
