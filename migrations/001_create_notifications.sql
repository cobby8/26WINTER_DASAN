-- Drop table first to ensure fresh creation (Fixes potential schema mismatch errors)
DROP TABLE IF EXISTS notifications CASCADE;

-- Create Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'attendance', 'shuttle', 'payment', 'notice'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_student ON notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(student_id) WHERE is_read = FALSE;

-- Enable RLS (Optional, depending on policy, but good for security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own notifications (via student_id linking to auth if applicable, 
-- but currently portal uses simple ID cookie. We might leave RLS open for service_role or add simple policy if auth exists)
-- For now, allowing public read if not strictly auth-gated, or assuming service role access.
