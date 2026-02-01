-- =============================================
-- IT Helpdesk - Supabase Database Schema
-- วิธีใช้: คัดลอก SQL นี้ไปรันใน Supabase SQL Editor
-- =============================================

-- 1. สร้างตาราง tickets
CREATE TABLE IF NOT EXISTS tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id TEXT UNIQUE NOT NULL,
    submitter_name TEXT NOT NULL,
    department TEXT,
    problem_type TEXT,
    problem_details TEXT,
    status TEXT DEFAULT 'Open',
    submission_date TEXT,
    submission_time TEXT,
    closed_date TEXT,
    closed_time TEXT,
    resolution_comment TEXT,
    contact_number TEXT,
    last_updated BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
    closed_by TEXT,
    email_status TEXT,
    score_q INTEGER,
    score_d INTEGER,
    score_c INTEGER,
    evaluation_comment TEXT,
    last_email_sent_date TEXT,
    last_email_sent_time TEXT,
    email_send_count INTEGER DEFAULT 0,
    email_problem_status TEXT,
    comment_problem TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. สร้างตาราง users (สำหรับ admin login)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. สร้าง index สำหรับ performance
CREATE INDEX IF NOT EXISTS idx_tickets_case_id ON tickets(case_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_last_updated ON tickets(last_updated);

-- 4. เปิด Row Level Security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 5. สร้าง Policies สำหรับ tickets
-- อนุญาตให้ทุกคนอ่านและเขียน tickets (สำหรับ public helpdesk)
CREATE POLICY "Allow public read tickets" ON tickets
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert tickets" ON tickets
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update tickets" ON tickets
    FOR UPDATE USING (true);

-- 6. สร้าง Policies สำหรับ users (เฉพาะ service role)
CREATE POLICY "Allow service role access users" ON users
    FOR ALL USING (true);

-- 7. เพิ่ม admin user เริ่มต้น (เปลี่ยนรหัสผ่านหลังจาก login ครั้งแรก!)
INSERT INTO users (username, password) VALUES 
    ('admin', 'admin123')
ON CONFLICT (username) DO NOTHING;

-- =============================================
-- เสร็จสิ้น! ถัดไปให้คัดลอก:
-- 1. Project URL (Settings > API > Project URL)
-- 2. Anon Key (Settings > API > anon/public key)
-- =============================================
