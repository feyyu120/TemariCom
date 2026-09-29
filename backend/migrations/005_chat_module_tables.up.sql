-- ============================================================================
-- TEMARICOM - CHAT MODULE DATABASE MIGRATION (UP)
-- ============================================================================

-- 1. CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    type VARCHAR(20) NOT NULL DEFAULT 'direct'
        CHECK (type IN ('direct', 'group')),

    title VARCHAR(100),

    avatar_key TEXT,

    created_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    last_message_id UUID,

    last_message_preview TEXT,

    last_message_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CONVERSATION PARTICIPANTS
CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id UUID NOT NULL
        REFERENCES conversations(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    role VARCHAR(20) NOT NULL DEFAULT 'member'
        CHECK (role IN ('admin', 'member')),

    last_read_at TIMESTAMPTZ,

    is_muted BOOLEAN NOT NULL DEFAULT FALSE,

    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,

    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    left_at TIMESTAMPTZ,

    PRIMARY KEY (conversation_id, user_id)
);

-- 3. MESSAGES
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    conversation_id UUID NOT NULL
        REFERENCES conversations(id)
        ON DELETE CASCADE,

    sender_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    content TEXT,

    message_type VARCHAR(20) NOT NULL DEFAULT 'text'
        CHECK (
            message_type IN (
                'text',
                'image',
                'video',
                'file',
                'audio',
                'system'
            )
        ),

    media_key TEXT,

    media_mime_type VARCHAR(100),

    media_size_bytes BIGINT,

    reply_to_id UUID
        REFERENCES messages(id)
        ON DELETE SET NULL,

    forwarded_from_message_id UUID
        REFERENCES messages(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    edited_at TIMESTAMPTZ,

    deleted_at TIMESTAMPTZ
);

-- 4. MESSAGE RECEIPTS
CREATE TABLE IF NOT EXISTS message_receipts (
    message_id UUID NOT NULL
        REFERENCES messages(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    delivered_at TIMESTAMPTZ,

    read_at TIMESTAMPTZ,

    PRIMARY KEY (message_id, user_id)
);

-- 5. MESSAGE DELETIONS (Per-user "Delete for Me" hides)
CREATE TABLE IF NOT EXISTS message_deletions (
    message_id UUID NOT NULL
        REFERENCES messages(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (message_id, user_id)
);

-- 6. FOREIGN KEY FOR LAST MESSAGE
ALTER TABLE conversations
    DROP CONSTRAINT IF EXISTS fk_conversations_last_message;

ALTER TABLE conversations
    ADD CONSTRAINT fk_conversations_last_message
    FOREIGN KEY (last_message_id)
    REFERENCES messages(id)
    ON DELETE SET NULL;

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_conversations_last_message
    ON conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user
    ON conversation_participants(user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_conv_participants_active_user
    ON conversation_participants(user_id, conversation_id)
    WHERE left_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON messages(conversation_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_sender
    ON messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_reply_to
    ON messages(reply_to_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_forwarded_from
    ON messages(forwarded_from_message_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_receipts_user
    ON message_receipts(user_id, message_id);

CREATE INDEX IF NOT EXISTS idx_message_deletions_user
    ON message_deletions(user_id, message_id);
