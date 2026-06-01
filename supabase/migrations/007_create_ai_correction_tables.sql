-- ============================================
-- Migration 007: KI-gestützte Aufsatzkorrektur
-- ============================================
-- Neue Tabellen: correction_rubrics, essay_ai_corrections
-- Fix: student_essays CHECK-Constraint für in_korrektur
-- Fix: RLS-Policy für in_korrektur Status
-- ============================================

-- ============================================
-- 1. STUDENT_ESSAYS: STATUS-CONSTRAINT FIXEN
-- ============================================

ALTER TABLE student_essays
  DROP CONSTRAINT IF EXISTS student_essays_status_check;

ALTER TABLE student_essays
  ADD CONSTRAINT student_essays_status_check
  CHECK (status IN ('draft', 'submitted', 'in_korrektur', 'reviewed', 'returned'));

-- RLS-Policy für in_korrektur erweitern
DROP POLICY IF EXISTS "trainers_review_essays" ON student_essays;

CREATE POLICY "trainers_review_essays"
  ON student_essays
  FOR UPDATE
  TO authenticated
  USING (
    status IN ('submitted', 'in_korrektur')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('lehrperson', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('lehrperson', 'admin')
    )
  );

-- ============================================
-- 2. TABELLE: correction_rubrics (Bewertungsraster)
-- ============================================

CREATE TABLE IF NOT EXISTS correction_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'structured')),

  -- Für type = 'pdf'
  pdf_path TEXT,
  pdf_name TEXT,

  -- Für type = 'structured'
  criteria JSONB,
  max_points INTEGER,
  description TEXT,

  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_correction_rubrics_created_by ON correction_rubrics(created_by);
CREATE INDEX IF NOT EXISTS idx_correction_rubrics_subject ON correction_rubrics(subject);

-- RLS aktivieren
ALTER TABLE correction_rubrics ENABLE ROW LEVEL SECURITY;

-- Nur Lehrpersonen und Admins können Rubriken sehen und verwalten
CREATE POLICY "teachers_read_rubrics"
  ON correction_rubrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('lehrperson', 'admin')
    )
  );

CREATE POLICY "teachers_insert_rubrics"
  ON correction_rubrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('lehrperson', 'admin')
    )
  );

CREATE POLICY "teachers_update_rubrics"
  ON correction_rubrics
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('lehrperson', 'admin')
    )
  );

CREATE POLICY "teachers_delete_rubrics"
  ON correction_rubrics
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('lehrperson', 'admin')
    )
  );

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_correction_rubrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS correction_rubrics_updated_at ON correction_rubrics;
CREATE TRIGGER correction_rubrics_updated_at
  BEFORE UPDATE ON correction_rubrics
  FOR EACH ROW
  EXECUTE FUNCTION update_correction_rubrics_updated_at();

-- ============================================
-- 3. TABELLE: essay_ai_corrections (KI-Vorschläge)
-- ============================================

CREATE TABLE IF NOT EXISTS essay_ai_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES student_essays(id) ON DELETE CASCADE,
  rubric_id UUID REFERENCES correction_rubrics(id) ON DELETE SET NULL,

  -- KI-Output
  raw_suggestion TEXT NOT NULL DEFAULT '',
  teacher_edited_suggestion TEXT,

  -- Status-Workflow
  status TEXT NOT NULL DEFAULT 'generating'
    CHECK (status IN ('generating', 'ready', 'released')),

  -- Metadaten
  model_used TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  input_tokens INTEGER,
  output_tokens INTEGER,

  generated_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES profiles(id),

  UNIQUE(essay_id)
);

CREATE INDEX IF NOT EXISTS idx_essay_ai_corrections_essay_id ON essay_ai_corrections(essay_id);
CREATE INDEX IF NOT EXISTS idx_essay_ai_corrections_status ON essay_ai_corrections(status);

-- RLS aktivieren
ALTER TABLE essay_ai_corrections ENABLE ROW LEVEL SECURITY;

-- Lehrpersonen und Admins sehen alle KI-Korrekturen
CREATE POLICY "teachers_read_ai_corrections"
  ON essay_ai_corrections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('lehrperson', 'admin')
    )
  );

CREATE POLICY "teachers_insert_ai_corrections"
  ON essay_ai_corrections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('lehrperson', 'admin')
    )
  );

CREATE POLICY "teachers_update_ai_corrections"
  ON essay_ai_corrections
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('lehrperson', 'admin')
    )
  );

CREATE POLICY "teachers_delete_ai_corrections"
  ON essay_ai_corrections
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('lehrperson', 'admin')
    )
  );

-- Schüler sehen nur freigegebene Korrekturen ihrer eigenen Aufsätze
CREATE POLICY "students_read_released_corrections"
  ON essay_ai_corrections
  FOR SELECT
  TO authenticated
  USING (
    status = 'released'
    AND EXISTS (
      SELECT 1 FROM student_essays
      WHERE student_essays.id = essay_ai_corrections.essay_id
      AND student_essays.student_id = auth.uid()
    )
  );

-- ============================================
-- 4. STORAGE BUCKET: correction-rubrics
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'correction-rubrics',
  'correction-rubrics',
  false,
  5242880,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFIZIERUNG
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 007 abgeschlossen:';
  RAISE NOTICE '- student_essays: CHECK-Constraint mit in_korrektur erweitert';
  RAISE NOTICE '- student_essays: RLS-Policy trainers_review_essays aktualisiert';
  RAISE NOTICE '- correction_rubrics: Tabelle erstellt mit RLS';
  RAISE NOTICE '- essay_ai_corrections: Tabelle erstellt mit RLS';
  RAISE NOTICE '- correction-rubrics: Storage Bucket erstellt';
END $$;
