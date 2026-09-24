package service

import (
	"context"
	"errors"

	"TemariCom/internal/profile/dto"
	"TemariCom/internal/profile/model"
	"TemariCom/internal/profile/repository"
	"TemariCom/pkg/storage"

	"github.com/google/uuid"
)

var (
	ErrInvalidInput = errors.New("invalid profile input")
)

type ProfileService interface {
	GetMyProfile(ctx context.Context, userID uuid.UUID) (*model.FullStudentProfileResponse, error)
	GetUserProfile(ctx context.Context, viewerID *uuid.UUID, targetUserID uuid.UUID) (*model.FullStudentProfileResponse, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, req dto.UpdateProfileRequest) (*model.FullStudentProfileResponse, error)
	ListCampusStudents(ctx context.Context, institutionID uuid.UUID, departmentID *uuid.UUID, studyLevel *string, page, limit int) ([]model.FullStudentProfileResponse, error)
	DeleteAccount(ctx context.Context, userID uuid.UUID) error
	GenerateAvatarUploadURL(ctx context.Context, userID uuid.UUID, extension, contentType string) (*dto.PresignAvatarResponse, error)
}

type profileService struct {
	repo    repository.StudentProfileRepository
	storage *storage.R2Client
}

func NewProfileService(repo repository.StudentProfileRepository, r2Storage *storage.R2Client) ProfileService {
	return &profileService{repo: repo, storage: r2Storage}
}

func (s *profileService) resolveAvatarURL(res *model.FullStudentProfileResponse) {
	if res == nil || s.storage == nil {
		return
	}
	if res.User.AvatarURL != nil && *res.User.AvatarURL != "" {
		resolved := s.storage.AvatarURL(*res.User.AvatarURL)
		res.User.AvatarURL = &resolved
	}
}

func (s *profileService) GetMyProfile(ctx context.Context, userID uuid.UUID) (*model.FullStudentProfileResponse, error) {
	res, err := s.repo.GetFullProfile(ctx, userID)
	if err != nil {
		return nil, err
	}
	res.IsOwnProfile = true
	s.resolveAvatarURL(res)
	return res, nil
}

func (s *profileService) GetUserProfile(ctx context.Context, viewerID *uuid.UUID, targetUserID uuid.UUID) (*model.FullStudentProfileResponse, error) {
	res, err := s.repo.GetFullProfile(ctx, targetUserID)
	if err != nil {
		return nil, err
	}

	if viewerID != nil && *viewerID == targetUserID {
		res.IsOwnProfile = true
	} else {
		// Security & Privacy Best Practice:
		// Do not leak private contact details (phone, email) to other viewers on public profiles
		res.IsOwnProfile = false
		res.User.Email = nil
		res.User.Phone = nil
	}

	s.resolveAvatarURL(res)
	return res, nil
}

func (s *profileService) UpdateProfile(ctx context.Context, userID uuid.UUID, req dto.UpdateProfileRequest) (*model.FullStudentProfileResponse, error) {
	// Normalize avatar_url to storage key before persisting in PostgreSQL
	if req.AvatarURL != nil && *req.AvatarURL != "" && s.storage != nil {
		key := s.storage.ExtractKey(*req.AvatarURL)
		req.AvatarURL = &key
	}

	res, err := s.repo.UpsertPartialProfile(ctx, userID, &req)
	if err != nil {
		return nil, err
	}
	res.IsOwnProfile = true
	s.resolveAvatarURL(res)
	return res, nil
}

func (s *profileService) ListCampusStudents(
	ctx context.Context,
	institutionID uuid.UUID,
	departmentID *uuid.UUID,
	studyLevel *string,
	page, limit int,
) ([]model.FullStudentProfileResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	list, err := s.repo.ListByInstitution(ctx, institutionID, departmentID, studyLevel, limit, offset)
	if err != nil {
		return nil, err
	}

	for i := range list {
		// Omit private contact info in directory lists
		list[i].User.Email = nil
		list[i].User.Phone = nil
		s.resolveAvatarURL(&list[i])
	}

	return list, nil
}

func (s *profileService) DeleteAccount(ctx context.Context, userID uuid.UUID) error {
	return s.repo.DeleteAccount(ctx, userID)
}

func (s *profileService) GenerateAvatarUploadURL(
	ctx context.Context,
	userID uuid.UUID,
	extension, contentType string,
) (*dto.PresignAvatarResponse, error) {
	if s.storage == nil {
		return nil, errors.New("cloud storage is not configured")
	}

	key := s.storage.GenerateAvatarKey(userID.String(), extension)
	uploadURL, err := s.storage.GenerateAvatarUploadURL(ctx, key, contentType)
	if err != nil {
		return nil, err
	}

	publicURL := s.storage.AvatarURL(key)

	return &dto.PresignAvatarResponse{
		UploadURL: uploadURL,
		Key:       key,
		PublicURL: publicURL,
	}, nil
}
