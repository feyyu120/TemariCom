-- ============================================================================
-- TEMARICOM - PROFILE MODULE DATABASE MIGRATION (DOWN)
-- ============================================================================

DROP VIEW IF EXISTS student_profile CASCADE;
DROP TRIGGER IF EXISTS trigger_student_profiles_updated_at ON student_profiles;
DROP INDEX IF EXISTS idx_student_profiles_created_at;
DROP INDEX IF EXISTS idx_student_profiles_study_level;
DROP INDEX IF EXISTS idx_student_profiles_institution_department;
DROP INDEX IF EXISTS idx_student_profiles_institution_id;
DROP TABLE IF EXISTS student_profiles CASCADE;
