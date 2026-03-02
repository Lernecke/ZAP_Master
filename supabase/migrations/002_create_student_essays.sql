-- Migration: Create student_essays table and storage bucket
-- Feature: Digitale Aufsatz-Abgabe für Schüler

-- ============================================
-- 1. TABELLE: student_essays
-- ============================================

CREATE TABLE IF NOT EXISTS student_essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size <= 10485760), -- Max 10MB
  file_type TEXT NOT NULL CHECK (file_type IN (
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'returned')),
  feedback TEXT,
  grade TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_student_essays_student_id ON student_essays(student_id);
CREATE INDEX IF NOT EXISTS idx_student_essays_status ON student_essays(status);
CREATE INDEX IF NOT EXISTS idx_student_essays_subject ON student_essays(subject);

-- ============================================
-- 2. RLS AKTIVIEREN
-- ============================================

ALTER TABLE student_essays ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. RLS POLICIES FÜR SCHÜLER (role = 'user')
-- ============================================

-- Schüler sehen nur ihre eigenen Aufsätze
CREATE POLICY "students_select_own_essays"
  ON student_essays
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Schüler können nur eigene Aufsätze erstellen
CREATE POLICY "students_insert_own_essays"
  ON student_essays
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Schüler können nur Entwürfe bearbeiten
CREATE POLICY "students_update_draft_essays"
  ON student_essays
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid() AND status = 'draft')
  WITH CHECK (student_id = auth.uid());

-- Schüler können nur Entwürfe löschen
CREATE POLICY "students_delete_draft_essays"
  ON student_essays
  FOR DELETE
  TO authenticated
  USING (student_id = auth.uid() AND status = 'draft');

-- ============================================
-- 4. RLS POLICIES FÜR TRAINER/ADMIN
-- ============================================

-- Trainer können alle eingereichten Aufsätze sehen
CREATE POLICY "trainers_view_submitted_essays"
  ON student_essays
  FOR SELECT
  TO authenticated
  USING (
    status != 'draft'
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('lehrperson', 'admin')
    )
  );

-- Trainer können Feedback geben (Update auf submitted essays)
CREATE POLICY "trainers_review_essays"
  ON student_essays
  FOR UPDATE
  TO authenticated
  USING (
    status = 'submitted'
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
-- 5. TRIGGER FÜR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_student_essays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS student_essays_updated_at ON student_essays;
CREATE TRIGGER student_essays_updated_at
  BEFORE UPDATE ON student_essays
  FOR EACH ROW
  EXECUTE FUNCTION update_student_essays_updated_at();

-- ============================================
-- 6. TRIGGER FÜR REVIEW TIMESTAMP
-- ============================================

CREATE OR REPLACE FUNCTION set_essay_review_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'reviewed' AND OLD.status = 'submitted' THEN
    NEW.reviewed_at = NOW();
    NEW.reviewed_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS student_essays_review_timestamp ON student_essays;
CREATE TRIGGER student_essays_review_timestamp
  BEFORE UPDATE ON student_essays
  FOR EACH ROW
  EXECUTE FUNCTION set_essay_review_timestamp();

-- ============================================
-- 7. STORAGE BUCKET (manuell in Supabase Dashboard erstellen!)
-- ============================================
-- Name: student-essays
-- Public: false
-- File size limit: 10485760 (10MB)
-- Allowed MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- HINWEIS: Storage Bucket muss über das Supabase Dashboard erstellt werden!
-- Oder via SQL in der storage schema:

-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'student-essays',
--   'student-essays',
--   false,
--   10485760,
--   ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. STORAGE POLICIES
-- ============================================
-- Diese müssen nach Bucket-Erstellung via Dashboard oder SQL angewendet werden:

-- Schüler können in ihren eigenen Ordner hochladen
-- CREATE POLICY "students_upload_own_essays"
--   ON storage.objects
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     bucket_id = 'student-essays'
--     AND (storage.foldername(name))[1] = 'aufsaetze'
--     AND (storage.foldername(name))[2] = auth.uid()::text
--   );

-- Schüler können eigene Dateien lesen
-- CREATE POLICY "students_read_own_essays"
--   ON storage.objects
--   FOR SELECT
--   TO authenticated
--   USING (
--     bucket_id = 'student-essays'
--     AND (storage.foldername(name))[1] = 'aufsaetze'
--     AND (storage.foldername(name))[2] = auth.uid()::text
--   );

-- Trainer können alle Dateien lesen
-- CREATE POLICY "trainers_read_all_essays"
--   ON storage.objects
--   FOR SELECT
--   TO authenticated
--   USING (
--     bucket_id = 'student-essays'
--     AND EXISTS (
--       SELECT 1 FROM profiles 
--       WHERE id = auth.uid() 
--       AND role IN ('lehrperson', 'admin')
--     )
--   );
