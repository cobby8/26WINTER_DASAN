
-- Add columns for manual exceptions in shuttle daily logs
ALTER TABLE shuttle_ops_logs
ADD COLUMN IF NOT EXISTS actual_time TIME DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE;

-- Notify change
DO $$
BEGIN
    RAISE NOTICE 'Added actual_time and is_cancelled to shuttle_ops_logs';
END $$;
