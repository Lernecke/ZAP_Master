-- ============================================
-- INTENSIVWOCHE ANMELDUNGEN - RLS FIX
-- Dieses Script behebt den PGRST116 Fehler
-- ============================================

-- HINWEIS: Falls die Tabelle bereits existiert, nur die Policies anpassen
-- Ansonsten das vollständige Script aus 003_create_intensivwoche_kurse.sql verwenden

-- ============================================
-- SCHRITT 1: Bestehende Policies löschen (falls vorhanden)
-- ============================================

DROP POLICY IF EXISTS "Öffentliche Anmeldung möglich" ON intensivwoche_anmeldungen;
DROP POLICY IF EXISTS "Authentifizierte User können Anmeldungen sehen" ON intensivwoche_anmeldungen;
DROP POLICY IF EXISTS "Authentifizierte User können Anmeldungen bearbeiten" ON intensivwoche_anmeldungen;
DROP POLICY IF EXISTS "Authentifizierte User können Anmeldungen löschen" ON intensivwoche_anmeldungen;
DROP POLICY IF EXISTS "Anon kann Anmeldungen erstellen" ON intensivwoche_anmeldungen;

-- Kurse Policies auch prüfen
DROP POLICY IF EXISTS "Öffentlicher Lesezugriff auf aktive Kurse" ON intensivwoche_kurse;
DROP POLICY IF EXISTS "Authentifizierte User haben vollen Zugriff auf Kurse" ON intensivwoche_kurse;
DROP POLICY IF EXISTS "Anon kann aktive Kurse lesen" ON intensivwoche_kurse;

-- ============================================
-- SCHRITT 2: RLS aktivieren (falls noch nicht)
-- ============================================

ALTER TABLE intensivwoche_kurse ENABLE ROW LEVEL SECURITY;
ALTER TABLE intensivwoche_anmeldungen ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SCHRITT 3: Policies für KURSE erstellen
-- ============================================

-- Policy 1: Anonyme Nutzer können AKTIVE Kurse lesen (für öffentliche Seite)
CREATE POLICY "anon_select_active_kurse"
  ON intensivwoche_kurse
  FOR SELECT
  TO anon
  USING (ist_aktiv = true);

-- Policy 2: Authentifizierte Nutzer können ALLE Kurse lesen (für Admin)
CREATE POLICY "authenticated_select_all_kurse"
  ON intensivwoche_kurse
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 3: Authentifizierte Nutzer können Kurse erstellen
CREATE POLICY "authenticated_insert_kurse"
  ON intensivwoche_kurse
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy 4: Authentifizierte Nutzer können Kurse bearbeiten
CREATE POLICY "authenticated_update_kurse"
  ON intensivwoche_kurse
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy 5: Authentifizierte Nutzer können Kurse löschen
CREATE POLICY "authenticated_delete_kurse"
  ON intensivwoche_kurse
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- SCHRITT 4: Policies für ANMELDUNGEN erstellen
-- ============================================

-- Policy 1: Anonyme Nutzer können Anmeldungen ERSTELLEN (öffentliches Formular)
-- WICHTIG: Keine SELECT-Berechtigung für anon - nur INSERT!
CREATE POLICY "anon_insert_anmeldungen"
  ON intensivwoche_anmeldungen
  FOR INSERT
  TO anon
  WITH CHECK (
    -- Validierung: kurs_id muss existieren und aktiv sein
    EXISTS (
      SELECT 1 FROM intensivwoche_kurse 
      WHERE id = kurs_id AND ist_aktiv = true
    )
  );

-- Policy 2: Authentifizierte Nutzer können alle Anmeldungen lesen
CREATE POLICY "authenticated_select_anmeldungen"
  ON intensivwoche_anmeldungen
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 3: Authentifizierte Nutzer können Anmeldungen bearbeiten
CREATE POLICY "authenticated_update_anmeldungen"
  ON intensivwoche_anmeldungen
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy 4: Authentifizierte Nutzer können Anmeldungen löschen
CREATE POLICY "authenticated_delete_anmeldungen"
  ON intensivwoche_anmeldungen
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- SCHRITT 5: View-Berechtigungen (für die View mit Anmeldezahlen)
-- ============================================

-- Die View 'intensivwoche_kurse_mit_anmeldungen' erbt die Policies der 
-- zugrundeliegenden Tabellen automatisch.
-- Für anon-Zugriff auf die View muss auch die Kurse-Tabelle SELECT erlauben.

-- ============================================
-- VERIFIZIERUNG: Policies auflisten
-- ============================================

-- Diese Query zeigt alle aktiven Policies:
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('intensivwoche_kurse', 'intensivwoche_anmeldungen')
ORDER BY tablename, policyname;
