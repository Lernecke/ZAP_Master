-- ======================================
-- TRAINER EXAMS (Bardhi's Exam System)
-- ======================================

-- Exams Tabelle für Bardhi's JSON-Schema
CREATE TABLE IF NOT EXISTS public.trainer_exams (
  id TEXT PRIMARY KEY,                    -- z.B. "math-2023-claude"
  title TEXT NOT NULL,                    -- "Mathematik 2023 (Claude Opus 4.5)"
  subject TEXT NOT NULL CHECK (subject IN ('Math', 'German')),
  year INTEGER NOT NULL,
  generated_by TEXT,                      -- "Claude-Opus-4.5", "Gemini-Pro-3"
  data JSONB NOT NULL,                    -- Komplettes Bardhi JSON
  text_lines TEXT[],                      -- Nur für Deutsch: Array von Zeilen
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnellere Queries
CREATE INDEX idx_trainer_exams_subject_year ON public.trainer_exams(subject, year);
CREATE INDEX idx_trainer_exams_generated_by ON public.trainer_exams(generated_by);

-- ======================================
-- USER PROGRESS (Bardhi's System)
-- ======================================

-- Fortschritt pro User pro Exam
CREATE TABLE IF NOT EXISTS public.trainer_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id TEXT NOT NULL REFERENCES public.trainer_exams(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '{}'::jsonb,      -- { "q1-a": "42", "q2-b": "answer" }
  completed_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exam_id)                -- Ein Progress pro User pro Exam
);

CREATE INDEX idx_trainer_progress_user ON public.trainer_progress(user_id);
CREATE INDEX idx_trainer_progress_exam ON public.trainer_progress(exam_id);

-- ======================================
-- PROFILES ERWEITERN (falls nötig)
-- ======================================

-- Falls profiles nicht alle Felder hat
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ======================================
-- FUNCTIONS & TRIGGERS
-- ======================================

-- Updated_at Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für trainer_exams
DROP TRIGGER IF EXISTS update_trainer_exams_updated_at ON public.trainer_exams;
CREATE TRIGGER update_trainer_exams_updated_at
    BEFORE UPDATE ON public.trainer_exams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger für trainer_progress
DROP TRIGGER IF EXISTS update_trainer_progress_updated_at ON public.trainer_progress;
CREATE TRIGGER update_trainer_progress_updated_at
    BEFORE UPDATE ON public.trainer_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ======================================
-- RLS POLICIES (Row Level Security)
-- ======================================

-- Enable RLS
ALTER TABLE public.trainer_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_progress ENABLE ROW LEVEL SECURITY;

-- trainer_exams: Jeder kann lesen
CREATE POLICY "trainer_exams_select_all" ON public.trainer_exams
    FOR SELECT USING (true);

-- trainer_progress: User kann nur eigenen Progress sehen
CREATE POLICY "trainer_progress_select_own" ON public.trainer_progress
    FOR SELECT USING (auth.uid() = user_id);

-- trainer_progress: User kann eigenen Progress erstellen
CREATE POLICY "trainer_progress_insert_own" ON public.trainer_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- trainer_progress: User kann eigenen Progress updaten
CREATE POLICY "trainer_progress_update_own" ON public.trainer_progress
    FOR UPDATE USING (auth.uid() = user_id);
