-- ============================================================================
-- TEMARICOM - AUTH MODULE DATABASE (DOWN MIGRATION)
-- ============================================================================

-- 1. Drop triggers
DROP TRIGGER IF EXISTS trigger_user_security_updated_at ON user_security;
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;

-- 2. Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 3. Drop tables in reverse dependency order
DROP TABLE IF EXISTS login_attempts CASCADE;
DROP TABLE IF EXISTS user_security CASCADE;
DROP TABLE IF EXISTS login_requests CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS verification_codes CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
