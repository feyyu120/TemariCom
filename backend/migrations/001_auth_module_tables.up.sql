-- ============================================================================
-- TEMARICOM - AUTH MODULE DATABASE
-- ============================================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================================
-- 1. USERS
-- ============================================================================
-- Stores the permanent identity/account of a user.
-- Email OR phone can be used for authentication.
-- Password is optional initially because TemariCom uses OTP-first login.
-- It can be set later when the user enables two-step verification.
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    username VARCHAR(50)  UNIQUE,

    full_name VARCHAR(100),
    avatar_key VARCHAR(500),
    bio VARCHAR(255),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,

    password_hash TEXT,

    account_status VARCHAR(30) NOT NULL DEFAULT 'pending',

    last_login_at TIMESTAMPTZ,
    last_login_ip INET,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- At least one authentication identifier is required.
    CONSTRAINT check_email_or_phone
        CHECK (email IS NOT NULL OR phone IS NOT NULL),

    CONSTRAINT check_valid_email
        CHECK (
            email IS NULL OR
            email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        ),

    CONSTRAINT check_valid_phone
        CHECK (
            phone IS NULL OR
            phone ~ '^\+?[0-9\s\-()]{7,20}$'
        ),

    CONSTRAINT check_valid_username
        CHECK (
            username ~ '^[a-zA-Z0-9_-]{3,50}$'
        ),

    CONSTRAINT check_valid_account_status
        CHECK (
            account_status IN (
                'pending',
                'active',
                'suspended',
                'banned',
                'deactivated'
            )
        )
);


-- Useful for admin/user listing and sorting.
CREATE INDEX idx_users_created_at
    ON users(created_at DESC);

-- Case-insensitive partial index for searching users by full name
CREATE INDEX idx_users_full_name
    ON users(full_name)
    WHERE full_name IS NOT NULL;


-- ============================================================================
-- 2. ROLES
-- ============================================================================
-- Defines the roles available in TemariCom.
-- ============================================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(50) NOT NULL UNIQUE,

    description TEXT NOT NULL DEFAULT '',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT check_role_name_valid
        CHECK (
            name IN (
                'student',
                'tutor',
                'organization',
                'admin',
                'superadmin'
            )
        )
);


-- ============================================================================
-- 3. USER_ROLES
-- ============================================================================
-- Many-to-many relationship between users and roles.
-- One user can have multiple roles.
-- ============================================================================

CREATE TABLE user_roles (
    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    role_id UUID NOT NULL
        REFERENCES roles(id)
        ON DELETE CASCADE,

    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    assigned_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_role_id
    ON user_roles(role_id);


-- ============================================================================
-- 4. VERIFICATION_CODES
-- ============================================================================
-- Temporary OTP codes used during:
--   - First registration
--   - Login
--   - Account recovery
--
-- IMPORTANT:
-- The actual code is NOT stored.
-- Only a hash of the code is stored.
-- ============================================================================

CREATE TABLE verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES users(id)
        ON DELETE CASCADE,

    identifier VARCHAR(255) NOT NULL,

    code_hash TEXT NOT NULL,
    purpose VARCHAR(30) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'email',

    attempts INT NOT NULL DEFAULT 0,

    expires_at TIMESTAMPTZ NOT NULL,

    used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT check_verification_purpose
        CHECK (
            purpose IN (
                'registration',
                'login',
                'recovery'
            )
        ),

    CONSTRAINT check_verification_channel
        CHECK (
            channel IN (
                'app',
                'email'
            )
        ),

    CONSTRAINT check_verification_attempts
        CHECK (attempts >= 0)
);

CREATE INDEX idx_verification_codes_identifier
    ON verification_codes(identifier);

CREATE INDEX idx_verification_codes_identifier_purpose_created
    ON verification_codes(identifier, purpose, created_at DESC);

CREATE INDEX idx_verification_codes_user_id
    ON verification_codes(user_id);


-- ============================================================================
-- 5. SESSIONS
-- ============================================================================
-- Long-lived authenticated sessions.
--
-- This is the part that gives TemariCom the Telegram-like experience.
--
-- One user can have multiple sessions:
--   Android
--   Windows
--   Tablet
--
-- The actual session token is NOT stored.
-- Only its hash is stored.
-- ============================================================================

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    token_hash TEXT NOT NULL UNIQUE,

    device_name VARCHAR(100),
    device_type VARCHAR(30),
    ip_address INET,
    user_agent TEXT,

    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_id
    ON sessions(user_id);

CREATE INDEX idx_sessions_user_id_active
    ON sessions(user_id)
    WHERE revoked_at IS NULL;


-- ============================================================================
-- 6. LOGIN_REQUESTS
-- ============================================================================
-- Used when an existing user tries to log in from a new device.
--
-- Example:
--
-- Existing Android
--        ↓
-- New Windows login request
--        ↓
-- Android receives approval request
--        ↓
-- Approve / Reject
-- ============================================================================

CREATE TABLE login_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    requesting_device_name VARCHAR(100),
    requesting_device_type VARCHAR(30),
    requesting_ip INET,
    requesting_user_agent TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    expires_at TIMESTAMPTZ NOT NULL,

    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT check_login_request_status
        CHECK (
            status IN (
                'pending',
                'approved',
                'rejected',
                'expired'
            )
        )
);

CREATE INDEX idx_login_requests_user_id
    ON login_requests(user_id);

CREATE INDEX idx_login_requests_status
    ON login_requests(status);


-- ============================================================================
-- 7. USER_SECURITY
-- ============================================================================
-- Stores optional additional security settings.
--
-- The password itself is stored in users.password_hash.
-- This table only stores whether two-step verification is enabled.
-- ============================================================================

CREATE TABLE user_security (
    user_id UUID PRIMARY KEY
        REFERENCES users(id)
        ON DELETE CASCADE,

    two_step_enabled BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- 8. LOGIN_ATTEMPTS
-- ============================================================================
-- Security/audit information about authentication attempts.
-- ============================================================================

CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    identifier VARCHAR(255) NOT NULL,

    ip_address INET,

    user_agent TEXT,

    success BOOLEAN NOT NULL DEFAULT FALSE,

    failure_reason VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT check_identifier_not_empty
        CHECK (LENGTH(TRIM(identifier)) > 0)
);

CREATE INDEX idx_login_attempts_user_id
    ON login_attempts(user_id);

CREATE INDEX idx_login_attempts_identifier_created_at
    ON login_attempts(identifier, created_at DESC);


-- ============================================================================
-- 9. UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


CREATE TRIGGER trigger_user_security_updated_at
    BEFORE UPDATE ON user_security
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 10. DEFAULT ROLES
-- ============================================================================

INSERT INTO roles (name, description)
VALUES
    ('student', 'Regular TemariCom student'),
    ('tutor', 'Verified tutor'),
    ('organization', 'Organization account'),
    ('admin', 'Administrator'),
    ('superadmin', 'Super administrator')
ON CONFLICT (name) DO NOTHING;