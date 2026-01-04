
-- 1. Shuttle Schedules Table (Regular Plan)
CREATE TABLE IF NOT EXISTS shuttle_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')),
    type TEXT NOT NULL CHECK (type IN ('boarding', 'dropoff')),
    time TIME NOT NULL,
    location_name TEXT NOT NULL,
    location_address TEXT,
    location_lat FLOAT,
    location_lng FLOAT,
    sequence_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster query by student or day
CREATE INDEX IF NOT EXISTS idx_shuttle_schedules_student_id ON shuttle_schedules(student_id);
CREATE INDEX IF NOT EXISTS idx_shuttle_schedules_day ON shuttle_schedules(day_of_week);

-- 2. Shuttle Info Columns in Student Table (Optional, for redundancy or quick access, but main logic is in schedules)
-- We already have `shuttle_route` text, we can keep it for legacy or summary, or migrate away.
-- For now, we will use the new tables for the main logic.

-- 3. Shuttle Operations Logs (Daily Execution)
CREATE TABLE IF NOT EXISTS shuttle_ops_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES shuttle_schedules(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE, -- Denormalized for query speed
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'boarded', 'dropped_off', 'missed', 'self_commute')),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    driver_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: On a specific date, a schedule item has one log status (unless we allow multiple updates? Latest prevails).
-- Let's stick to unique log per schedule per date to simplify logic.
CREATE UNIQUE INDEX IF NOT EXISTS idx_shuttle_ops_unique ON shuttle_ops_logs(schedule_id, date);

-- Enable RLS (if needed, but for now assuming admin all access)
ALTER TABLE shuttle_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shuttle_ops_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for admin" ON shuttle_schedules;
CREATE POLICY "Enable all for admin" ON shuttle_schedules FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for admin" ON shuttle_ops_logs;
CREATE POLICY "Enable all for admin" ON shuttle_ops_logs FOR ALL USING (true);
