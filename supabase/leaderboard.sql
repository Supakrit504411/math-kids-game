-- ============================================================
-- Math Kids Game — ตาราง Leaderboard สำหรับ Supabase
-- รันใน Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1) สร้างตาราง (ชื่อคอลัมน์ camelCase ให้ตรงกับเกม)
CREATE TABLE IF NOT EXISTS public.leaderboard (
    id              TEXT PRIMARY KEY,
    "playerName"    TEXT NOT NULL,
    score           INTEGER NOT NULL DEFAULT 0,
    difficulty      INTEGER NOT NULL DEFAULT 1,
    "difficultyName" TEXT NOT NULL DEFAULT 'ง่าย',
    "maxLevel"      INTEGER NOT NULL DEFAULT 1,
    "playedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT leaderboard_score_nonneg CHECK (score >= 0),
    CONSTRAINT leaderboard_difficulty_range CHECK (difficulty BETWEEN 1 AND 3),
    CONSTRAINT leaderboard_maxlevel_min CHECK ("maxLevel" >= 1),
    CONSTRAINT leaderboard_playername_len CHECK (char_length("playerName") BETWEEN 2 AND 16)
);

-- 2) Index สำหรับเรียงอันดับ (ตรงกับเกม: score แล้ว maxLevel)
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank
    ON public.leaderboard (score DESC, "maxLevel" DESC, "playedAt" DESC);

-- 3) เปิด Row Level Security
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- 4) Policy: ใครก็อ่านอันดับได้ (anon = ผู้เล่นที่ไม่ login)
DROP POLICY IF EXISTS "leaderboard_select_anon" ON public.leaderboard;
CREATE POLICY "leaderboard_select_anon"
    ON public.leaderboard
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 5) Policy: ส่งคะแนนใหม่ได้ (insert เท่านั้น — แก้/ลบคะแนนเก่าไม่ได้)
DROP POLICY IF EXISTS "leaderboard_insert_anon" ON public.leaderboard;
CREATE POLICY "leaderboard_insert_anon"
    ON public.leaderboard
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        score >= 0
        AND score <= 999999
        AND difficulty BETWEEN 1 AND 3
        AND "maxLevel" >= 1
        AND "maxLevel" <= 999
        AND char_length("playerName") BETWEEN 2 AND 16
    );

-- 6) สิทธิ์ให้ role anon/authenticated
GRANT SELECT, INSERT ON public.leaderboard TO anon, authenticated;

-- 7) (ทางเลือก) ข้อมูลตัวอย่าง — ลบออกได้หลังทดสอบ
-- INSERT INTO public.leaderboard (id, "playerName", score, difficulty, "difficultyName", "maxLevel", "playedAt")
-- VALUES
--   ('demo_1', 'น้องมิ้น', 120, 1, 'ง่าย', 3, NOW()),
--   ('demo_2', 'น้องบี', 350, 2, 'ปานกลาง', 5, NOW()),
--   ('demo_3', 'เซียนคณิต', 800, 3, 'ยาก', 8, NOW());
