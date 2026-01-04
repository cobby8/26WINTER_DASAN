-- Add shuttle_route column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS shuttle_route TEXT;

COMMENT ON COLUMN students.shuttle_route IS 'Suhuttle route info. Presence implies shuttle usage.';
