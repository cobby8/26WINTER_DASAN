-- 1. Refresh Supabase Schema Cache (Fixes 'Relation not found' errors)
NOTIFY pgrst, 'reload config';

-- 2. Add Soft Delete & Status columns to Students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'; -- 'active', 'withdrawn', 'graduated'

-- 3. (Optional) Verify Enrollment Logs constraint
-- Ensure class_id on enrollment_logs is SET NULL on delete
-- You cannot easily 'ALTER CONSTRAINT' in one line, but assuming the previous create script was used, it is fine.
-- If you created the table manually differently, please ensure ON DELETE SET NULL is set.
