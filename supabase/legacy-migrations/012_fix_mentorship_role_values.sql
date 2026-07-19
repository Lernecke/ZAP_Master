-- Migration 012: Mentorship-Rollenwerte korrigieren
-- ============================================================================
-- Live-Abgleich (18.07.2026) über den Supabase-Connector zeigt: Die RLS auf
-- intensivwoche_kurse/intensivwoche_anmeldungen ist bereits sauber Owner-/
-- Rollen-basiert gescoped (anon sieht nur ist_aktiv=true, Lehrpersonen nur
-- eigene Kurse via created_by, Admin via is_admin()) — hier besteht kein
-- Handlungsbedarf, die ursprünglich angenommene "USING (true) für alle
-- authenticated" existiert auf der Live-DB nicht.
--
-- Echter, aktiver Bug: mentor_skills_insert_own und listings_insert_own
-- prüfen noch profiles.role = 'teacher' bzw. role IN ('teacher','student').
-- Diese Werte kann profiles.role seit der Rollen-Migration ('user',
-- 'lehrperson', 'admin') nie mehr annehmen — die INSERT-Policies blockieren
-- dadurch für ausnahmslos alle Nutzer das Anlegen von Mentor-Skills und
-- Mentorship-Angeboten/-Gesuchen. Diese Migration korrigiert die Rollenwerte
-- auf die tatsächlich verwendeten.
-- ============================================================================

DROP POLICY IF EXISTS "mentor_skills_insert_own" ON public.mentor_skills;
CREATE POLICY "mentor_skills_insert_own" ON public.mentor_skills
  FOR INSERT
  WITH CHECK (
    mentor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'lehrperson')
  );

DROP POLICY IF EXISTS "listings_insert_own" ON public.mentorship_listings;
CREATE POLICY "listings_insert_own" ON public.mentorship_listings
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('lehrperson', 'user'))
  );
