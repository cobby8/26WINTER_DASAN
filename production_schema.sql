
-- Winter Vacation Management System - Consolidated Production Schema (Supabase)

-- 1. Students Table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    gender TEXT, -- '남' or '여'
    grade TEXT,
    birth_date DATE,
    school TEXT,
    parent_name TEXT,
    student_phone TEXT,
    parent_phone TEXT,
    address TEXT,
    note TEXT,
    registration_source TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'inactive'
    shuttle_route TEXT, -- Summary field
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(name, parent_phone)
);

-- 2. Classes Table
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    branch TEXT, -- '1호점', '2호점'
    session TEXT, -- '1차', '2차'
    capacity INTEGER DEFAULT 20,
    tuition INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_classes_composite_sync ON classes(day_of_week, start_time, branch, session);

-- 3. Enrollments Table
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    type TEXT, -- '신규', '재등록'
    status TEXT DEFAULT 'active',
    shuttle_use BOOLEAN DEFAULT false,
    shuttle_boarding TEXT,
    shuttle_time TEXT,
    shuttle_dropoff TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, class_id)
);

-- 4. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL, -- 'present', 'late', 'absent', 'makeup'
    note TEXT,
    is_makeup_ticket_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    tuition_fee INTEGER NOT NULL,
    shuttle_fee INTEGER DEFAULT 0,
    discount_amount INTEGER DEFAULT 0,
    carry_over_deduction INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid'
    payment_method TEXT,
    payment_date DATE,
    billing_month DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Shuttle Schedules Table (Master Data)
CREATE TABLE IF NOT EXISTS shuttle_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL, -- 'Mon', 'Tue', etc.
    type TEXT NOT NULL, -- 'boarding', 'dropoff', 'academy_start', 'academy_end'
    time TIME NOT NULL,
    location_name TEXT NOT NULL,
    location_address TEXT,
    location_lat FLOAT,
    location_lng FLOAT,
    sequence_order INTEGER DEFAULT 0,
    section_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Ensure unique index to prevent duplicate schedules for same student/day/type
-- DROP INDEX IF EXISTS idx_shuttle_unique_v2;
-- CREATE UNIQUE INDEX idx_shuttle_unique_v2 ON shuttle_schedules (student_id, day_of_week, type) WHERE student_id IS NOT NULL;

-- 7. Shuttle Operations Logs (Daily Logs)
CREATE TABLE IF NOT EXISTS shuttle_ops_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES shuttle_schedules(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'boarded', 'missed', 'self_commute', 'dropped_off')),
    actual_time TIME,
    is_cancelled BOOLEAN DEFAULT FALSE,
    driver_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shuttle_ops_unique ON shuttle_ops_logs(schedule_id, date);

-- 8. Sheet Sync Log
CREATE TABLE IF NOT EXISTS sheet_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    records_processed INTEGER,
    status TEXT,
    error_message TEXT
);

-- RLS (Row Level Security) - Basic Enable
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shuttle_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shuttle_ops_logs ENABLE ROW LEVEL SECURITY;

-- Simple All Access Policies for Admin (Assuming service_role or authenticated admin)
-- Replace with specific roles if needed
CREATE POLICY "Admin All Access" ON students FOR ALL USING (true);
CREATE POLICY "Admin All Access" ON classes FOR ALL USING (true);
CREATE POLICY "Admin All Access" ON enrollments FOR ALL USING (true);
CREATE POLICY "Admin All Access" ON attendance FOR ALL USING (true);
CREATE POLICY "Admin All Access" ON payments FOR ALL USING (true);
CREATE POLICY "Admin All Access" ON shuttle_schedules FOR ALL USING (true);
CREATE POLICY "Admin All Access" ON shuttle_ops_logs FOR ALL USING (true);
