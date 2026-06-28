-- ============================================
-- Math Kids Game — Supabase Leaderboard Setup
-- ============================================
-- วิธีใช้:
-- 1. สร้าง Supabase project ที่ https://supabase.com
-- 2. ไปที่ SQL Editor → New Query
-- 3. วาง SQL นี้แล้วกด Run
-- 4. ไป Project Settings → API → คัดลอก URL + anon key
-- 5. อัปเดตค่าใน config/game-config.json

-- สร้างตาราง leaderboard
CREATE TABLE IF NOT EXISTS leaderboard (
    id          TEXT PRIMARY KEY,
    playerName  TEXT NOT NULL,
    score       INTEGER NOT NULL,
    difficulty      INTEGER NOT NULL,
    difficultyName  TEXT,
    maxLevel        INTEGER DEFAULT 1,
    playedAt        TIMESTAMPTZ DEFAULT NOW()
);

-- Index สำหรับ sort
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard (score DESC, maxLevel DESC);

-- เปิด Row Level Security
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- อนุญาต anonymous insert (ผู้เล่นส่งคะแนน)
DROP POLICY IF EXISTS allow_anon_insert ON leaderboard;
CREATE POLICY allow_anon_insert ON leaderboard
    FOR INSERT TO anon
    WITH CHECK (true);

-- อนุญาต anonymous select (อ่าน leaderboard)
DROP POLICY IF EXISTS allow_anon_select ON leaderboard;
CREATE POLICY allow_anon_select ON leaderboard
    FOR SELECT TO anon
    USING (true);