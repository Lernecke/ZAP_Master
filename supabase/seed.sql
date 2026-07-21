-- ============================================================================
-- Lokale Seed-Datei (nur synthetische Fixtures)
-- ============================================================================
-- Diese Datei wird laut step0Baseline.revision2.md, Abschnitt 9, niemals automatisch
-- remote ausgerollt. Sie darf ausschliesslich klar erkennbare synthetische lokale
-- Testdaten enthalten -- keine echten Geschaefts-, Auth- oder Personendaten.
--
-- Die historischen Testnutzer/-daten aus legacy-migrations/006_seed_test_data.sql werden
-- NICHT automatisch hierher uebernommen; sie bleiben nur als historische Referenz erhalten.

-- ============================================================================
-- offers / offer_editions -- 5. Klasse Lerncamp (Layout_5_Klasse_Intensivkurs_Unterseite.html)
-- ============================================================================
-- Hauptseite und Unterseite zeigen fuer dasselbe Angebot widerspruechliche Preise (CHF 950 vs.
-- CHF 890, kein "regulaer"-Anker wie beim Halbjahreskurs) -- Abschnitt 2.3 des
-- Architektur-Briefings. Abschnitt 9.1 verbietet das stille Auswaehlen eines der beiden
-- Mockup-Werte, deshalb bleibt das Angebot in types/marketing.fixtures.ts/offer-catalog.ts
-- weiterhin ausserhalb des Katalogs (siehe Kommentar bei fuenfKlasseHalbjahreskurs).
--
-- Statt gar keinen DB-Datensatz zu haben, legt dieser Seed den Preis dort ab, wo er laut
-- Abschnitt 2.12 kuenftig hingehoert: offer_editions.regular_price_rappen. Der Wert hier ist ein
-- bewusst unverwechselbarer Platzhalter (0 Rappen) statt einer der beiden erfundenen Zahlen; die
-- Edition bleibt status='draft' und ist per RLS (offer_editions_read_published_or_content_manager)
-- nur fuer is_content_manager() sichtbar, nie oeffentlich lesbar. Die echte Zahl und die
-- Verdrahtung des Katalogs auf diese Tabelle sind ein spaeterer, fachlich freigegebener Schritt
-- (Schritt 10a/Admin-Maske).
insert into public.offers (audience_id, kurstyp, slug)
values ('5', 'intensivkurs', 'lerncamp-sportferien');

insert into public.offer_editions (
  offer_id, school_year, public_title, tagline, description,
  regular_price_rappen, early_bird_enabled, status
)
select
  o.id,
  '2026/27',
  'Lerncamp – Sportferien',
  'Intensives Training in den Sportferien',
  'Platzhalter -- echter Preis folgt nach fachlicher Freigabe (Preiskonflikt CHF 950 vs. CHF 890).',
  0,
  false,
  'draft'
from public.offers o
where o.audience_id = '5' and o.kurstyp = 'intensivkurs' and o.slug = 'lerncamp-sportferien';
