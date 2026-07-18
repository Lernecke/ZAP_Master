-- Migration 014: Atomare Buchungsfunktion, Unique-Index, sichere View
-- ============================================================================
-- Befund: Anmeldung lief bisher über ein direktes INSERT ohne Sperre, ohne
-- Unique-Constraint und ohne Preis-Snapshot. Zwei gleichzeitige Buchungen auf
-- den letzten Platz konnten beide erfolgreich sein. Diese Migration setzt die
-- im Briefing (Abschnitt 2.10, Punkt 7) beschriebene atomare Funktion um:
-- SELECT ... FOR UPDATE sperrt den Kurs, prüft Aktivität und Kapazität,
-- verhindert Doppelanmeldung und schreibt den Preis-Snapshot. Direkte
-- Client-Inserts werden danach entzogen — nur noch diese Funktion darf
-- schreiben (app/(public)/kurse/actions.ts wird entsprechend umgestellt).
--
-- Live-Abgleich (18.07.2026): book_intensivwoche_kurs() und der Unique-Index
-- existieren auf der Live-DB nicht — beide Teile dieser Migration sind
-- weiterhin nötig. Die View intensivwoche_kurse_mit_anmeldungen existiert
-- bereits mit identischer Spalten-/Statuslogik, aber ohne security_invoker
-- (reloptions war NULL) — dadurch würde ein Aufruf über die View mit den
-- Rechten des View-Owners statt des abfragenden Nutzers laufen und die
-- anon_select_active_kurse-RLS auf intensivwoche_kurse umgehen. Statt die
-- View zu droppen/neu anzulegen, wird sie nur per ALTER VIEW gehärtet, um
-- Grants/Abhängigkeiten der bereits produktiv genutzten View nicht
-- anzufassen.
-- ============================================================================

-- 1. Partieller Unique-Index: (kurs_id, lower(email)) für nicht stornierte Anmeldungen
DROP INDEX IF EXISTS idx_anmeldungen_kurs_email_unique;
CREATE UNIQUE INDEX idx_anmeldungen_kurs_email_unique
  ON public.intensivwoche_anmeldungen (kurs_id, lower(parent_email))
  WHERE status <> 'storniert';

-- 2. Atomare Buchungsfunktion
CREATE OR REPLACE FUNCTION public.book_intensivwoche_kurs(
  p_kurs_id BIGINT,
  p_child_firstname TEXT,
  p_child_lastname TEXT,
  p_child_class_level TEXT,
  p_child_gender TEXT,
  p_parent_email TEXT,
  p_parent_phone TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_kurs RECORD;
  v_belegt INTEGER;
  v_email TEXT := lower(trim(p_parent_email));
  v_new_id UUID;
BEGIN
  -- Kursdatensatz sperren, bis diese Transaktion abgeschlossen ist
  SELECT * INTO v_kurs
  FROM public.intensivwoche_kurse
  WHERE id = p_kurs_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'kurs_nicht_gefunden' USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_kurs.ist_aktiv THEN
    RAISE EXCEPTION 'kurs_inaktiv' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.intensivwoche_anmeldungen
    WHERE kurs_id = p_kurs_id
      AND lower(parent_email) = v_email
      AND status <> 'storniert'
  ) THEN
    RAISE EXCEPTION 'bereits_angemeldet' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_belegt
  FROM public.intensivwoche_anmeldungen
  WHERE kurs_id = p_kurs_id
    AND status <> 'storniert';

  IF v_belegt >= v_kurs.max_teilnehmer THEN
    RAISE EXCEPTION 'voll' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.intensivwoche_anmeldungen (
    kurs_id, child_firstname, child_lastname, child_class_level, child_gender,
    parent_email, parent_phone, notes, booked_price_rappen, currency
  ) VALUES (
    p_kurs_id,
    trim(p_child_firstname),
    trim(p_child_lastname),
    trim(p_child_class_level),
    p_child_gender,
    v_email,
    trim(p_parent_phone),
    NULLIF(trim(p_notes), ''),
    round(v_kurs.preis * 100)::INTEGER,
    'CHF'
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

COMMENT ON FUNCTION public.book_intensivwoche_kurs IS
  'Einzige zulässige Schreibstelle für Kursanmeldungen. Sperrt den Kurs (FOR UPDATE), '
  'prüft Aktivität/Kapazität/Doppelanmeldung atomar und schreibt den Preis-Snapshot. '
  'Fester leerer search_path, SECURITY DEFINER — Grants siehe unten.';

-- Minimale, explizite Grants statt breiter Owner-Rechte
REVOKE ALL ON FUNCTION public.book_intensivwoche_kurs FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_intensivwoche_kurs TO anon, authenticated;

-- 3. Direkte Client-Inserts nach Umstellung auf die Funktion entziehen.
--    Die bisherige RLS-Insert-Policy für anon wird zusätzlich entfernt, da
--    sie nach dem REVOKE ohnehin nie mehr greifen kann (Privilege-Check vor
--    RLS) und sonst als irreführende Karteileiche stehen bliebe.
DROP POLICY IF EXISTS "anon_insert_anmeldungen" ON public.intensivwoche_anmeldungen;
REVOKE INSERT ON public.intensivwoche_anmeldungen FROM anon, authenticated;

-- 4. Bestehende View nur härten (security_invoker nachziehen), nicht neu anlegen
ALTER VIEW public.intensivwoche_kurse_mit_anmeldungen SET (security_invoker = true);

GRANT SELECT ON public.intensivwoche_kurse_mit_anmeldungen TO anon, authenticated;
