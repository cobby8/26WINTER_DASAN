-- Phase 6: Class Period Management
-- Add start_date and end_date to classes table to manage lecture periods.

ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Optional: Add comment
COMMENT ON COLUMN classes.start_date IS '수업 시작일 (YYYY-MM-DD)';
COMMENT ON COLUMN classes.end_date IS '수업 종료일 (YYYY-MM-DD)';
