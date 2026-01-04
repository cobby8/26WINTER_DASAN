-- Phase 6: Sync Schema Correction
-- Add missing columns to classes table to support Google Sheet Sync and Branch/Session management.

ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS branch TEXT,
ADD COLUMN IF NOT EXISTS session TEXT;

-- Update comments
COMMENT ON COLUMN classes.branch IS '지점 (1호점, 2호점 등)';
COMMENT ON COLUMN classes.session IS '차수 (1차, 2차 등)';

-- Ensure tuition column exists (added in Phase 1-2 but good to be sure)
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS tuition INTEGER DEFAULT 0;

-- Optional: Add a combined index for Sync Service performance
CREATE INDEX IF NOT EXISTS idx_classes_composite_sync 
ON classes(day_of_week, start_time, branch, session);
