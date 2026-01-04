
-- Phase 5 Shuttle Migration
-- 1. Allow schedules without a specific student (for 'Return to Academy' or 'Depot' stops)
ALTER TABLE shuttle_schedules ALTER COLUMN student_id DROP NOT NULL;

-- 2. Allow 'return' type in check constraint
-- Drop existing constraint safely
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shuttle_schedules_type_check') THEN 
        ALTER TABLE shuttle_schedules DROP CONSTRAINT shuttle_schedules_type_check; 
    END IF; 
END $$;

-- Re-add with new type
ALTER TABLE shuttle_schedules ADD CONSTRAINT shuttle_schedules_type_check CHECK (type IN ('boarding', 'dropoff', 'return'));

-- 3. Add Section ID for grouping routes
ALTER TABLE shuttle_schedules ADD COLUMN IF NOT EXISTS section_id INTEGER DEFAULT 1;

-- 4. Update logs table to allow null student_id too (if we log return stops)
ALTER TABLE shuttle_ops_logs ALTER COLUMN student_id DROP NOT NULL;
