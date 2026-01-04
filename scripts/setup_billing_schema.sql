
-- 1. Create Rules Table for Tuition Logic
CREATE TABLE IF NOT EXISTS tuition_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_type TEXT NOT NULL,         -- 'new' (신규), 'existing' (기존)
    frequency_type TEXT NOT NULL,      -- '2x', '3x', '5x'
    session_1_price INTEGER DEFAULT 0, -- 1차 수강료
    session_2_price INTEGER DEFAULT 0, -- 2차 수강료
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default Rules (Based on Excel Logic/Previous Context)
-- NOTE: values here are placeholders based on KIs, user can update them in UI
INSERT INTO tuition_rules (status_type, frequency_type, session_1_price, session_2_price) VALUES
('new', '2x', 230000, 190000),
('new', '3x', 310000, 260000),
('new', '5x', 450000, 390000),
('existing', '2x', 200000, 170000),
('existing', '3x', 280000, 240000),
('existing', '5x', 400000, 350000)
ON CONFLICT DO NOTHING; 
-- Note: 'ON CONFLICT' needs a unique constraint to work, we can add one or just trust initial run.
-- Let's add a unique constraint for safety.
ALTER TABLE tuition_rules ADD CONSTRAINT unique_rule UNIQUE (status_type, frequency_type);


-- 2. Enhance Payments Table
-- We add columns to store the breakdown of the calculation
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS tuition_fee INTEGER DEFAULT 0,      -- Base Tuition
ADD COLUMN IF NOT EXISTS shuttle_fee INTEGER DEFAULT 0,      -- Calculated Shuttle
ADD COLUMN IF NOT EXISTS sibling_discount INTEGER DEFAULT 0, -- Discount Amount
ADD COLUMN IF NOT EXISTS manual_adjustment INTEGER DEFAULT 0,-- Override (+/-)
ADD COLUMN IF NOT EXISTS calculation_log JSONB,              -- Store how we arrived at this (snapshot)
ADD COLUMN IF NOT EXISTS sessions TEXT;                      -- '1차', '2차', '1차,2차' (Snapshot)

