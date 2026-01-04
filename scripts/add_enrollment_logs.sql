-- 8. Enrollment Logs Table (수강 이력 기록)
-- Tracks all additions, removals, and changes to enrollments
CREATE TABLE enrollment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'enrolled', 'cancelled', 'changed', 'system_sync'
    reason TEXT, -- 'Admin manual', 'Parent request', 'System repair'
    metadata JSONB DEFAULT '{}'::jsonb, -- Store previous values or extra info
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
