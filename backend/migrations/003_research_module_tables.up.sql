-- ============================================================================
-- TEMARICOM - RESEARCH MODULE DATABASE MIGRATION (UP)
-- ============================================================================

-- 1. SAVED_PAPERS TABLE
CREATE TABLE IF NOT EXISTS saved_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    external_paper_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    paper_url TEXT NOT NULL,
    authors TEXT[] NOT NULL DEFAULT '{}',
    summary TEXT NOT NULL DEFAULT '',
    pdf_url TEXT NOT NULL DEFAULT '',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_saved_paper
        UNIQUE (user_id, external_paper_id)
);

-- 2. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_saved_papers_user_id
    ON saved_papers(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_papers_user_created
    ON saved_papers(user_id, created_at DESC);
