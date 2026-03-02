-- Migration: Intensivwoche Anmeldungen
-- Erstellt Tabelle für öffentliche Kursanmeldungen mit strikter RLS

-- 1. Tabelle erstellen
CREATE TABLE IF NOT EXISTS public.intensivwoche_anmeldungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kurs_id BIGINT REFERENCES public.courses(id) ON DELETE SET NULL,
  child_firstname TEXT NOT NULL,
  child_lastname TEXT NOT NULL,
  child_class_level TEXT NOT NULL,
  child_gender TEXT NOT NULL CHECK (child_gender IN ('m', 'w', 'd')),
  parent_email TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'eingegangen' CHECK (status IN ('eingegangen', 'bestaetigt', 'bezahlt', 'storniert')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

-- 2. Index für häufige Queries
CREATE INDEX IF NOT EXISTS idx_intensivwoche_anmeldungen_kurs_id 
  ON public.intensivwoche_anmeldungen(kurs_id);

CREATE INDEX IF NOT EXISTS idx_intensivwoche_anmeldungen_status 
  ON public.intensivwoche_anmeldungen(status);

CREATE INDEX IF NOT EXISTS idx_intensivwoche_anmeldungen_created_at 
  ON public.intensivwoche_anmeldungen(created_at DESC);

-- 3. RLS aktivieren
ALTER TABLE public.intensivwoche_anmeldungen ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Nur INSERT für anonyme Benutzer erlaubt
-- KEIN SELECT, UPDATE oder DELETE für anon!
CREATE POLICY "Öffentliche Anmeldung erlauben" 
  ON public.intensivwoche_anmeldungen
  FOR INSERT 
  TO anon
  WITH CHECK (true);

-- 5. RLS Policy: Admins (authentifizierte User) können alles
CREATE POLICY "Admins haben vollen Zugriff" 
  ON public.intensivwoche_anmeldungen
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Kommentar zur Dokumentation
COMMENT ON TABLE public.intensivwoche_anmeldungen IS 
  'Öffentliche Anmeldungen für Intensivwochen-Kurse. RLS: Anon kann nur INSERT, Authenticated hat vollen Zugriff.';
