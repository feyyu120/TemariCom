-- ============================================================================
-- TEMARICOM - LOST & FOUND MODULE DATABASE MIGRATION (UP)
-- ============================================================================

-- 1. LOST_FOUND_ITEMS TABLE
CREATE TABLE IF NOT EXISTS lost_found_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    type VARCHAR(10) NOT NULL
        CHECK (type IN ('lost', 'found')),

    title VARCHAR(150) NOT NULL,

    description TEXT,

    category VARCHAR(50),

    location TEXT,

    event_date DATE,

    phone_number VARCHAR(30),

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'resolved', 'closed')),

    image_key TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT check_title_not_empty
        CHECK (LENGTH(TRIM(title)) > 0)
);

-- 2. PERFORMANCE OPTIMIZED INDEXES
CREATE INDEX IF NOT EXISTS idx_lost_found_items_user_id
    ON lost_found_items(user_id);

CREATE INDEX IF NOT EXISTS idx_lost_found_items_type
    ON lost_found_items(type);

CREATE INDEX IF NOT EXISTS idx_lost_found_items_status
    ON lost_found_items(status);

CREATE INDEX IF NOT EXISTS idx_lost_found_items_category
    ON lost_found_items(category)
    WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lost_found_items_created_at
    ON lost_found_items(created_at DESC);

-- Composite index for the most common feed query (type + status + recency)
CREATE INDEX IF NOT EXISTS idx_lost_found_items_feed
    ON lost_found_items(type, status, created_at DESC);

-- 3. UPDATED_AT TRIGGER
DROP TRIGGER IF EXISTS trigger_lost_found_items_updated_at ON lost_found_items;
CREATE TRIGGER trigger_lost_found_items_updated_at
    BEFORE UPDATE ON lost_found_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
