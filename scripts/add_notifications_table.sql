-- 9. Notifications Table (알림 발송 이력)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_phone TEXT NOT NULL, -- 수신자 번호
    recipient_name TEXT, -- 수신자 이름 (학생 or 학부모)
    message_content TEXT NOT NULL, -- 발송 내용
    template_type TEXT, -- 'attendance', 'notice', 'marketing'
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    result_code TEXT, -- SMS API Result Code
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    student_id UUID REFERENCES students(id) ON DELETE SET NULL -- 연관 학생 (Optional)
);
