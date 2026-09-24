-- ============================================================================
-- TEMARICOM - PROFILE MODULE DATABASE MIGRATION (UP)
-- ============================================================================

-- 1. STUDENT_PROFILES TABLE (1-to-1 with users via user_id PK)
CREATE TABLE IF NOT EXISTS student_profiles (
    user_id UUID PRIMARY KEY
        REFERENCES users(id)
        ON DELETE CASCADE,

    study_level   VARCHAR(50),
    academic_year INT,

    institution_id UUID,
    department_id  UUID,

    portfolio_url  VARCHAR(500),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Academic degree level constraint
    CONSTRAINT check_valid_study_level
        CHECK (
            study_level IS NULL OR
            study_level IN (
                'elementary',
                'high_school',
                'undergraduate',
                'postgraduate',
                'masters',
                'phd',
                'diploma',
                'other'
            )
        ),

    -- Academic year: 1..12 or NULL
    CONSTRAINT check_valid_academic_year
        CHECK (
            academic_year IS NULL OR
            (academic_year >= 1 AND academic_year <= 12)
        ),

    -- Portfolio URL: must be http/https or NULL
    CONSTRAINT check_valid_portfolio_url
        CHECK (
            portfolio_url IS NULL OR
            portfolio_url ~ '^https?://[^[:space:]]+$'
        )
);

-- 2. PERFORMANCE OPTIMIZED INDEXES

-- Partial index for Campus Feed / Institution queries — skips NULLs entirely
CREATE INDEX IF NOT EXISTS idx_student_profiles_institution_id
    ON student_profiles(institution_id)
    WHERE institution_id IS NOT NULL;

-- Compound partial index for department-scoped queries within an institution
CREATE INDEX IF NOT EXISTS idx_student_profiles_institution_department
    ON student_profiles(institution_id, department_id)
    WHERE institution_id IS NOT NULL AND department_id IS NOT NULL;

-- Index for filtering by academic degree level
CREATE INDEX IF NOT EXISTS idx_student_profiles_study_level
    ON student_profiles(study_level)
    WHERE study_level IS NOT NULL;

-- Index for ordering by registration date
CREATE INDEX IF NOT EXISTS idx_student_profiles_created_at
    ON student_profiles(created_at DESC);

-- 3. AUTOMATIC UPDATED_AT TRIGGER
DROP TRIGGER IF EXISTS trigger_student_profiles_updated_at ON student_profiles;
CREATE TRIGGER trigger_student_profiles_updated_at
    BEFORE UPDATE ON student_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. CONVENIENCE VIEW
CREATE OR REPLACE VIEW student_profile AS
    SELECT * FROM student_profiles;
