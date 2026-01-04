-- Winter Vacation Management System SQL Schema

-- 1. Students Table
CREATE TABLE students (
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
    registration_source TEXT, -- '가입경로' e.g., 'Instagram', 'Friend', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, parent_phone)
);

-- 2. Classes Table (강좌 정보)
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- e.g., '농구 A반'
    day_of_week TEXT NOT NULL, -- 'Mon', 'Tue', etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INTEGER DEFAULT 20,
    tuition INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enrollments Table (수강 신청 정보)
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    type TEXT, -- '신규', '재등록' 등
    status TEXT DEFAULT 'active', -- 'active', 'cancelled'
    shuttle_use BOOLEAN DEFAULT false,
    shuttle_boarding TEXT,
    shuttle_time TEXT,
    shuttle_dropoff TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, class_id)
);

-- 4. Attendance Table (출석부)
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL, -- 'present', 'late', 'absent', 'makeup'
    makeup_enrollment_id UUID, -- If status is 'makeup', link to the original enrollment if needed or just track logically
    note TEXT, -- Reason for absence or makeup details
    is_makeup_ticket_used BOOLEAN DEFAULT false, -- If this attendance is a makeup class for a previous absence
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Payments Table (수납 관리)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    tuition_fee INTEGER NOT NULL,
    shuttle_fee INTEGER DEFAULT 0,
    discount_amount INTEGER DEFAULT 0,
    carry_over_deduction INTEGER DEFAULT 0, -- Deduction from previous month's absences
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
    payment_method TEXT, -- 'Card', 'Transfer', etc.
    payment_date DATE,
    billing_month DATE, -- e.g., '2026-01-01' for January tuition
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. MakeupTickets Table (보강권 관리)
CREATE TABLE makeup_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    original_attendance_id UUID REFERENCES attendance(id), -- The absence that generated this ticket
    issued_date DATE DEFAULT CURRENT_DATE,
    used_date DATE,
    status TEXT DEFAULT 'available', -- 'available', 'used', 'expired'
    expiry_date DATE
);

-- 7. Google Sheet Map Table (for syncing status)
CREATE TABLE sheet_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT,
    records_processed INTEGER,
    error_message TEXT
);
