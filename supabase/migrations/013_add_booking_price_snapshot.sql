-- Migration 013: Preis-Snapshot auf intensivwoche_anmeldungen
-- ============================================================================
-- Befund: intensivwoche_anmeldungen speichert aktuell keinen Preis. Ändert
-- sich später intensivwoche_kurse.preis, "ändert" sich rückwirkend auch der
-- Preis vergangener Buchungen — es gibt keinen historischen Beleg. Additiv
-- nachgezogen, damit ab sofort jede neue Anmeldung ihren Preis zum
-- Buchungszeitpunkt unveränderlich festhält. Altzeilen bleiben NULL (Preis
-- nicht rekonstruierbar, keine Erfindung von Werten).
--
-- Geld als Integer (Rappen) statt DECIMAL, konsistent mit dem im Briefing für
-- alle neuen Bereiche (OfferEdition, financial_events, ...) verwendeten Muster.
-- ============================================================================

ALTER TABLE public.intensivwoche_anmeldungen
  ADD COLUMN IF NOT EXISTS booked_price_rappen INTEGER,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CHF';

ALTER TABLE public.intensivwoche_anmeldungen
  DROP CONSTRAINT IF EXISTS booked_price_rappen_non_negative;
ALTER TABLE public.intensivwoche_anmeldungen
  ADD CONSTRAINT booked_price_rappen_non_negative CHECK (booked_price_rappen IS NULL OR booked_price_rappen >= 0);

COMMENT ON COLUMN public.intensivwoche_anmeldungen.booked_price_rappen IS
  'Unveränderlicher Preis-Snapshot in Rappen zum Buchungszeitpunkt. NULL bei Altzeilen '
  'vor dieser Migration. Wird von book_intensivwoche_kurs() (Migration 014) gesetzt, '
  'niemals nachträglich aus intensivwoche_kurse.preis neu berechnet.';
