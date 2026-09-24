package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"TemariCom/internal/profile/dto"
	"TemariCom/internal/profile/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrProfileNotFound   = errors.New("profile not found")
	ErrUserNotFound      = errors.New("user does not exist")
	ErrInvalidStudyLevel = errors.New("invalid study level")
	ErrDuplicateUsername = errors.New("username is already taken")
	ErrDuplicatePhone    = errors.New("phone number is already registered")
)

type StudentProfileRepository interface {
	GetFullProfile(ctx context.Context, userID uuid.UUID) (*model.FullStudentProfileResponse, error)
	UpsertPartialProfile(ctx context.Context, userID uuid.UUID, req *dto.UpdateProfileRequest) (*model.FullStudentProfileResponse, error)
	ListByInstitution(ctx context.Context, institutionID uuid.UUID, departmentID *uuid.UUID, studyLevel *string, limit, offset int) ([]model.FullStudentProfileResponse, error)
	Delete(ctx context.Context, userID uuid.UUID) error
	DeleteAccount(ctx context.Context, userID uuid.UUID) error
}

type pgxStudentProfileRepository struct {
	db *pgxpool.Pool
}

func NewStudentProfileRepository(db *pgxpool.Pool) StudentProfileRepository {
	return &pgxStudentProfileRepository{db: db}
}

// ----------------------------------------------------------------------------
// 1. GET FULL PROFILE (Single-Hop PK Index Join: 1 Round-Trip)
// ----------------------------------------------------------------------------
func (r *pgxStudentProfileRepository) GetFullProfile(ctx context.Context, userID uuid.UUID) (*model.FullStudentProfileResponse, error) {
	query := `
		SELECT 
			u.id,
			u.username,
			u.email,
			u.phone,
			u.full_name,
			u.avatar_key,
			u.bio,
			u.is_verified,
			sp.study_level,
			sp.academic_year,
			sp.institution_id,
			sp.department_id,
			sp.portfolio_url,
			sp.created_at,
			sp.updated_at
		FROM users u
		LEFT JOIN student_profiles sp ON sp.user_id = u.id
		WHERE u.id = $1;
	`

	var (
		res            model.FullStudentProfileResponse
		studyLevel     *model.StudyLevel
		academicYear   *int
		institutionID  *uuid.UUID
		departmentID   *uuid.UUID
		portfolioURL   *string
		profileCreated *timeNilCheck
		profileUpdated *timeNilCheck
	)

	err := r.db.QueryRow(ctx, query, userID).Scan(
		&res.User.ID,
		&res.User.Username,
		&res.User.Email,
		&res.User.Phone,
		&res.User.FullName,
		&res.User.AvatarURL,
		&res.User.Bio,
		&res.User.IsVerified,
		&studyLevel,
		&academicYear,
		&institutionID,
		&departmentID,
		&portfolioURL,
		&profileCreated,
		&profileUpdated,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get full profile: %w", err)
	}

	if profileCreated != nil {
		res.StudentProfile = &model.StudentProfile{
			UserID:        res.User.ID,
			StudyLevel:    studyLevel,
			AcademicYear:  academicYear,
			InstitutionID: institutionID,
			DepartmentID:  departmentID,
			PortfolioURL:  portfolioURL,
			CreatedAt:     profileCreated.Time,
			UpdatedAt:     profileUpdated.Time,
		}
	}

	return &res, nil
}

// ----------------------------------------------------------------------------
// 2. ATOMIC UPSERT PARTIAL PROFILE (CTE: Single Database Round-Trip)
// ----------------------------------------------------------------------------
func (r *pgxStudentProfileRepository) UpsertPartialProfile(
	ctx context.Context,
	userID uuid.UUID,
	req *dto.UpdateProfileRequest,
) (*model.FullStudentProfileResponse, error) {
	query := `
		WITH updated_user AS (
			UPDATE users
			SET
				username   = COALESCE($2, username),
				phone      = COALESCE($3, phone),
				full_name  = COALESCE($4, full_name),
				avatar_key = COALESCE($5, avatar_key),
				bio        = COALESCE($6, bio)
			WHERE id = $1
			RETURNING id, username, email, phone, full_name, avatar_key, bio, is_verified
		),
		upserted_profile AS (
			INSERT INTO student_profiles (
				user_id,
				study_level,
				academic_year,
				institution_id,
				department_id,
				portfolio_url
			) VALUES (
				$1,
				$7,
				$8,
				$9,
				$10,
				$11
			)
			ON CONFLICT (user_id) DO UPDATE SET
				study_level    = COALESCE(EXCLUDED.study_level, student_profiles.study_level),
				academic_year  = COALESCE(EXCLUDED.academic_year, student_profiles.academic_year),
				institution_id = COALESCE(EXCLUDED.institution_id, student_profiles.institution_id),
				department_id  = COALESCE(EXCLUDED.department_id, student_profiles.department_id),
				portfolio_url  = COALESCE(EXCLUDED.portfolio_url, student_profiles.portfolio_url)
			RETURNING user_id, study_level, academic_year, institution_id, department_id, portfolio_url, created_at, updated_at
		)
		SELECT 
			u.id, u.username, u.email, u.phone, u.full_name, u.avatar_key, u.bio, u.is_verified,
			p.study_level, p.academic_year, p.institution_id, p.department_id, p.portfolio_url, p.created_at, p.updated_at
		FROM updated_user u
		CROSS JOIN upserted_profile p;
	`

	var (
		res model.FullStudentProfileResponse
		sp  model.StudentProfile
	)

	err := r.db.QueryRow(
		ctx,
		query,
		userID,
		req.Username,
		req.Phone,
		req.FullName,
		req.AvatarURL,
		req.Bio,
		req.StudyLevel,
		req.AcademicYear,
		req.InstitutionID,
		req.DepartmentID,
		req.PortfolioURL,
	).Scan(
		&res.User.ID,
		&res.User.Username,
		&res.User.Email,
		&res.User.Phone,
		&res.User.FullName,
		&res.User.AvatarURL,
		&res.User.Bio,
		&res.User.IsVerified,
		&sp.StudyLevel,
		&sp.AcademicYear,
		&sp.InstitutionID,
		&sp.DepartmentID,
		&sp.PortfolioURL,
		&sp.CreatedAt,
		&sp.UpdatedAt,
	)

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			if pgErr.Code == "23505" {
				switch pgErr.ConstraintName {
				case "users_username_key":
					return nil, ErrDuplicateUsername
				case "users_phone_key":
					return nil, ErrDuplicatePhone
				}
			}
			switch pgErr.Code {
			case "23503":
				return nil, ErrUserNotFound
			case "23514":
				return nil, ErrInvalidStudyLevel
			}
		}
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to upsert profile: %w", err)
	}

	sp.UserID = res.User.ID
	res.StudentProfile = &sp

	return &res, nil
}

// ----------------------------------------------------------------------------
// 3. LIST BY INSTITUTION (Uses Partial Compound Index)
// ----------------------------------------------------------------------------
func (r *pgxStudentProfileRepository) ListByInstitution(
	ctx context.Context,
	institutionID uuid.UUID,
	departmentID *uuid.UUID,
	studyLevel *string,
	limit, offset int,
) ([]model.FullStudentProfileResponse, error) {
	query := `
		SELECT 
			u.id, u.username, u.email, u.phone, u.full_name, u.avatar_key, u.bio, u.is_verified,
			sp.study_level, sp.academic_year, sp.institution_id, sp.department_id, sp.portfolio_url, sp.created_at, sp.updated_at
		FROM student_profiles sp
		INNER JOIN users u ON u.id = sp.user_id
		WHERE sp.institution_id = $1
		  AND ($2::uuid IS NULL OR sp.department_id = $2)
		  AND ($3::varchar IS NULL OR sp.study_level = $3)
		ORDER BY sp.created_at DESC
		LIMIT $4 OFFSET $5;
	`

	rows, err := r.db.Query(ctx, query, institutionID, departmentID, studyLevel, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list student profiles: %w", err)
	}
	defer rows.Close()

	var results []model.FullStudentProfileResponse
	for rows.Next() {
		var (
			item model.FullStudentProfileResponse
			sp   model.StudentProfile
		)
		if err := rows.Scan(
			&item.User.ID,
			&item.User.Username,
			&item.User.Email,
			&item.User.Phone,
			&item.User.FullName,
			&item.User.AvatarURL,
			&item.User.Bio,
			&item.User.IsVerified,
			&sp.StudyLevel,
			&sp.AcademicYear,
			&sp.InstitutionID,
			&sp.DepartmentID,
			&sp.PortfolioURL,
			&sp.CreatedAt,
			&sp.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}
		sp.UserID = item.User.ID
		item.StudentProfile = &sp
		results = append(results, item)
	}

	return results, rows.Err()
}

// ----------------------------------------------------------------------------
// 4. DELETE STUDENT PROFILE ONLY
// ----------------------------------------------------------------------------
func (r *pgxStudentProfileRepository) Delete(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM student_profiles WHERE user_id = $1;`
	cmd, err := r.db.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete student profile: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrProfileNotFound
	}
	return nil
}

// ----------------------------------------------------------------------------
// 5. DELETE ENTIRE USER ACCOUNT (Cascades across all tables)
// ----------------------------------------------------------------------------
func (r *pgxStudentProfileRepository) DeleteAccount(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1;`
	cmd, err := r.db.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete user account from DB: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

type timeNilCheck struct {
	Time time.Time
}

func (t *timeNilCheck) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	if tm, ok := value.(time.Time); ok {
		t.Time = tm
		return nil
	}
	return fmt.Errorf("cannot scan %T into time.Time", value)
}
