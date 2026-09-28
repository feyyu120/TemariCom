-- ============================================================================
-- TEMARICOM - LOST & FOUND MODULE DATABASE MIGRATION (DOWN)
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_lost_found_items_updated_at ON lost_found_items;
DROP TABLE IF EXISTS lost_found_items CASCADE;
