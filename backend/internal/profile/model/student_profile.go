package model

import (
	"time"

	"github.com/google/uuid"
)

// StudyLevel represents the academic degree/school level
type StudyLevel string

const (
	StudyLevelElementary    StudyLevel = "elementary"
	StudyLevelHighSchool    StudyLevel = "high_school"
	StudyLevelUndergraduate StudyLevel = "undergraduate"
	StudyLevelPostgraduate  StudyLevel = "postgraduate"
	StudyLevelMasters       StudyLevel = "masters"
	StudyLevelPhD           StudyLevel = "phd"
	StudyLevelDiploma       StudyLevel = "diploma"
	StudyLevelOther         StudyLevel = "other"
)

// StudentProfile represents student_profiles table in PostgreSQL.
type StudentProfile struct {
	UserID        uuid.UUID   `json:"user_id" db:"user_id"`
	StudyLevel    *StudyLevel `json:"study_level,omitempty" db:"study_level"`
	AcademicYear  *int        `json:"academic_year,omitempty" db:"academic_year"`
	InstitutionID *uuid.UUID  `json:"institution_id,omitempty" db:"institution_id"`
	DepartmentID  *uuid.UUID  `json:"department_id,omitempty" db:"department_id"`
	PortfolioURL  *string     `json:"portfolio_url,omitempty" db:"portfolio_url"`
	CreatedAt     time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at" db:"updated_at"`
}

// UserProfileSummary represents the safe user identity portion returned for profile views.
// Sensitive fields like password_hash or internal flags are strictly excluded.
type UserProfileSummary struct {
	ID         uuid.UUID `json:"id"`
	Username   *string   `json:"username,omitempty"`
	Email      *string   `json:"email,omitempty"`
	Phone      *string   `json:"phone,omitempty"`
	FullName   *string   `json:"full_name,omitempty"`
	AvatarURL  *string   `json:"avatar_url,omitempty"`
	Bio        *string   `json:"bio,omitempty"`
	IsVerified bool      `json:"is_verified"`
}

// SocialCounts represents follower and following metrics
type SocialCounts struct {
	FollowersCount int64 `json:"followers_count"`
	FollowingCount int64 `json:"following_count"`
}

// FullStudentProfileResponse is the aggregated response for the Profile view
type FullStudentProfileResponse struct {
	User           UserProfileSummary `json:"user"`
	StudentProfile *StudentProfile    `json:"student_profile,omitempty"`
	SocialCounts   SocialCounts       `json:"social_counts"`
	IsFollowing    bool               `json:"is_following"`
	IsOwnProfile   bool               `json:"is_own_profile"`
}
