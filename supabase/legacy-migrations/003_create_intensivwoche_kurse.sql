-- Migration: Intensivwoche Kurse
-- Erstellt Tabelle für Kurse mit RLS

-- 1. Tabelle erstellen
CREATE TABLE IF NOT EXISTS public.intensivwoche_kurse (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  fach TEXT NOT NULL CHECK (fach IN ('mathematik', 'deutsch', 'franzoesisch', 'natur-mensch-gesellschaft')),
  beschreibung TEXT NOT NULL,
  detail_beschreibung TEXT,
  start_datum DATE NOT NULL,
  end_datum DATE NOT NULL,
  uhrzeit TEXT NOT NULL, -- z.B. "09:00 - 12:00"
  ort TEXT NOT NULL,
  preis DECIMAL(10,2) NOT NULL,
  max_teilnehmer INTEGER NOT NULL DEFAULT 12,
  klassenstufen TEXT[] NOT NULL DEFAULT ARRAY['5. Klasse', '6. Klasse'],
  lehrer TEXT NOT NULL,
  highlights TEXT[] DEFAULT ARRAY[]::TEXT[],
  ist_aktiv BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraint: end_datum muss nach start_datum sein
  CONSTRAINT valid_date_range CHECK (end_datum >= start_datum)
);

-- 2. Index für häufige Queries
CREATE INDEX IF NOT EXISTS idx_intensivwoche_kurse_fach 
  ON public.intensivwoche_kurse(fach);

CREATE INDEX IF NOT EXISTS idx_intensivwoche_kurse_start_datum 
  ON public.intensivwoche_kurse(start_datum);

CREATE INDEX IF NOT EXISTS idx_intensivwoche_kurse_ist_aktiv 
  ON public.intensivwoche_kurse(ist_aktiv);

-- 3. Funktion für automatisches updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Trigger für updated_at
DROP TRIGGER IF EXISTS update_intensivwoche_kurse_updated_at ON public.intensivwoche_kurse;
CREATE TRIGGER update_intensivwoche_kurse_updated_at
  BEFORE UPDATE ON public.intensivwoche_kurse
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS aktivieren
ALTER TABLE public.intensivwoche_kurse ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policy: Jeder kann aktive Kurse lesen (für öffentliche Kursseite)
CREATE POLICY "Öffentliche Kurse lesen" 
  ON public.intensivwoche_kurse
  FOR SELECT 
  TO anon, authenticated
  USING (ist_aktiv = true);

-- 7. RLS Policy: Nur Admins (authenticated) können alle Kurse sehen/bearbeiten
CREATE POLICY "Admins sehen alle Kurse" 
  ON public.intensivwoche_kurse
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admins können Kurse erstellen" 
  ON public.intensivwoche_kurse
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins können Kurse bearbeiten" 
  ON public.intensivwoche_kurse
  FOR UPDATE 
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins können Kurse löschen" 
  ON public.intensivwoche_kurse
  FOR DELETE 
  TO authenticated
  USING (true);

-- 8. View für Kurs mit Teilnehmerzahl
CREATE OR REPLACE VIEW public.intensivwoche_kurse_mit_anmeldungen AS
SELECT 
  k.*,
  COALESCE(a.anzahl_anmeldungen, 0) AS aktuelle_teilnehmer,
  CASE 
    WHEN COALESCE(a.anzahl_anmeldungen, 0) >= k.max_teilnehmer THEN 'ausgebucht'
    WHEN COALESCE(a.anzahl_anmeldungen, 0) >= k.max_teilnehmer - 2 THEN 'wenige-plaetze'
    ELSE 'offen'
  END AS status
FROM public.intensivwoche_kurse k
LEFT JOIN (
  SELECT kurs_id, COUNT(*) AS anzahl_anmeldungen
  FROM public.intensivwoche_anmeldungen
  WHERE status NOT IN ('storniert')
  GROUP BY kurs_id
) a ON k.id = a.kurs_id;

-- 9. Kommentar zur Dokumentation
COMMENT ON TABLE public.intensivwoche_kurse IS 
  'Intensivwoche-Kurse. RLS: Anon kann nur aktive Kurse lesen, Authenticated hat vollen Zugriff.';

-- 10. Beispieldaten einfügen
INSERT INTO public.intensivwoche_kurse (name, fach, beschreibung, detail_beschreibung, start_datum, end_datum, uhrzeit, ort, preis, max_teilnehmer, klassenstufen, lehrer, highlights) VALUES
('Mathematik Intensiv – Frühjahr 2026', 'mathematik', 
 'Intensive Vorbereitung auf die ZAP-Prüfung im Fach Mathematik.',
 'In dieser Intensivwoche arbeiten wir gezielt an den Kernthemen der ZAP-Mathematikprüfung.

Wir behandeln:
- Bruchrechnen und Prozentrechnung
- Geometrie (Flächen, Körper, Winkel)
- Textaufgaben und Sachrechnen
- Gleichungen und Variablen
- Prüfungsstrategien und Zeitmanagement

Jeder Tag beginnt mit einer kurzen Theorie-Einheit, gefolgt von intensiven Übungsphasen. Am Ende der Woche simulieren wir eine echte Prüfungssituation.',
 '2026-04-06', '2026-04-10', '09:00 - 12:00', 'Lernzentrum Bern, Bahnhofstrasse 12',
 450.00, 12, ARRAY['5. Klasse', '6. Klasse'], 'Dr. Maria Schneider',
 ARRAY['Kleine Gruppen', 'Original-Prüfungsaufgaben', 'Persönliches Feedback']),

('Deutsch Intensiv – Frühjahr 2026', 'deutsch',
 'Grammatik, Rechtschreibung und Textverständnis für die ZAP.',
 'Diese Intensivwoche fokussiert auf alle sprachlichen Kompetenzen, die für die ZAP geprüft werden.

Schwerpunkte:
- Grammatik (Satzglieder, Zeitformen, Fälle)
- Rechtschreibung und Zeichensetzung
- Textverständnis und Interpretation
- Aufsatzschreiben (Erörterung, Erzählung)
- Wortschatztraining

Mit vielen praktischen Übungen und individueller Korrektur deiner Texte.',
 '2026-04-06', '2026-04-10', '13:30 - 16:30', 'Lernzentrum Bern, Bahnhofstrasse 12',
 450.00, 12, ARRAY['5. Klasse', '6. Klasse'], 'Lic. phil. Thomas Müller',
 ARRAY['Textkorrektur', 'Schreibtraining', 'Grammatik-Übungen']),

('Französisch Intensiv – Frühjahr 2026', 'franzoesisch',
 'Konversation, Grammatik und Hörverständnis auf Französisch.',
 'Verbessere dein Französisch in einer intensiven Woche mit Native Speaker.

Wir trainieren:
- Mündliche Kommunikation
- Hörverständnis mit authentischen Texten
- Grammatik (Verben, Zeiten, Pronomen)
- Leseverständnis
- Schriftlicher Ausdruck

Der Unterricht findet zu 80% auf Französisch statt!',
 '2026-04-13', '2026-04-17', '09:00 - 12:00', 'Lernzentrum Bern, Bahnhofstrasse 12',
 480.00, 10, ARRAY['6. Klasse'], 'Marie Dubois',
 ARRAY['Native Speaker', '80% Französisch', 'Kleine Gruppen']),

('NMG Intensiv – Frühjahr 2026', 'natur-mensch-gesellschaft',
 'Natur, Mensch, Gesellschaft – alles für die Prüfung.',
 'Der NMG-Kurs deckt alle prüfungsrelevanten Themen ab.

Inhalte:
- Biologie (Mensch, Tiere, Pflanzen)
- Geografie (Schweiz, Europa, Welt)
- Geschichte (Schweizer Geschichte)
- Physik/Chemie Grundlagen
- Aktuelle Themen

Mit Experimenten, Karten und interaktiven Übungen.',
 '2026-04-13', '2026-04-17', '13:30 - 16:30', 'Lernzentrum Bern, Bahnhofstrasse 12',
 420.00, 14, ARRAY['5. Klasse', '6. Klasse'], 'Stefan Bauer',
 ARRAY['Experimente', 'Interaktiv', 'Prüfungssimulation']),

('Mathematik Intensiv – Sommer 2026', 'mathematik',
 'Sommerferien-Intensivkurs Mathematik für die ZAP.',
 'Der perfekte Kurs in den Sommerferien, um sich optimal vorzubereiten.

Gleicher Inhalt wie der Frühjahrskurs, aber mit mehr Zeit für individuelle Fragen und Übungen.',
 '2026-07-06', '2026-07-10', '09:00 - 12:00', 'Lernzentrum Zürich, Limmatstrasse 45',
 450.00, 12, ARRAY['5. Klasse', '6. Klasse'], 'Dr. Maria Schneider',
 ARRAY['Sommerferien', 'Kleine Gruppen', 'Individuelle Betreuung']),

('Deutsch Intensiv – Sommer 2026', 'deutsch',
 'Sommerferien-Intensivkurs Deutsch für die ZAP.',
 'Nutze die Sommerferien, um dein Deutsch auf Prüfungsniveau zu bringen.

Fokus auf Aufsatzschreiben und Textverständnis.',
 '2026-07-06', '2026-07-10', '13:30 - 16:30', 'Lernzentrum Zürich, Limmatstrasse 45',
 450.00, 12, ARRAY['5. Klasse', '6. Klasse'], 'Lic. phil. Anna Weber',
 ARRAY['Sommerferien', 'Aufsatztraining', 'Individuelle Korrektur']);

-- 11. Foreign Key der Anmeldungen auf neue Tabelle umstellen
-- Zuerst alten FK entfernen falls vorhanden
ALTER TABLE public.intensivwoche_anmeldungen 
  DROP CONSTRAINT IF EXISTS intensivwoche_anmeldungen_kurs_id_fkey;

-- Neuen FK erstellen
ALTER TABLE public.intensivwoche_anmeldungen 
  ADD CONSTRAINT intensivwoche_anmeldungen_kurs_id_fkey 
  FOREIGN KEY (kurs_id) REFERENCES public.intensivwoche_kurse(id) ON DELETE SET NULL;
