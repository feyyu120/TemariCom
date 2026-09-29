-- ============================================================================
-- TEMARICOM - CHAT MODULE ROLLBACK MIGRATION (DOWN)
-- ============================================================================

ALTER TABLE IF EXISTS conversations DROP CONSTRAINT IF EXISTS fk_conversations_last_message;

DROP TABLE IF EXISTS message_deletions CASCADE;
DROP TABLE IF EXISTS message_receipts CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
