-- Prueft 20260722130621_seed_published_offer_editions.sql: genau die 18 bereits oeffentlich
-- publizierten Angebote (Abschnitt 2.12) erhalten eine published offer_editions-Zeile mit
-- Preis/Titel; BMS-Halbjahreskurs (kein Inhalt) und 5. Klasse Lerncamp (Preiskonflikt, Platzhalter)
-- bleiben bewusst unveraendert.

begin;

select plan(5);

select is(
    (select count(*)::int from public.offer_editions where status = 'published'),
    18,
    '18 offer_editions-Zeilen mit status=published'
);

select is(
    (select count(*)::int
       from public.offer_editions e
      where status = 'published'
        and (public_title is null or public_title = '' or regular_price_rappen is null)),
    0,
    'jede published-Zeile hat Titel und Preis gesetzt'
);

select is(
    (select count(*)::int from public.offer_editions e
       join public.offers o on o.id = e.offer_id
      where o.audience_id = 'bms' and o.kurstyp = 'halbjahreskurs'),
    0,
    'BMS-Halbjahreskurs bleibt ohne offer_editions-Zeile (kein freigegebener Inhalt)'
);

select is(
    (select e.status from public.offer_editions e
       join public.offers o on o.id = e.offer_id
      where o.audience_id = '5' and o.kurstyp = 'intensivkurs' and o.slug = 'lerncamp-sportferien'),
    'draft',
    '5. Klasse Lerncamp bleibt der bestehende draft-Platzhalter (Preiskonflikt), nicht ueberschrieben'
);

-- Idempotenz: ein zweiter Lauf derselben INSERTs (ON CONFLICT DO NOTHING auf (offer_id,
-- school_year)) darf keine Duplikate erzeugen.
insert into public.offer_editions (
  offer_id, school_year, public_title, tagline, description,
  regular_price_rappen, early_bird_enabled, early_bird_price_rappen, early_bird_deadline,
  currency, status
)
select o.id, '2026/27', 'Duplikat-Testlauf', 'x', 'x', 1, false, null, null, 'CHF', 'published'
from public.offers o
where o.audience_id = '6' and o.kurstyp = 'halbjahreskurs' and o.slug = 'halbjahreskurs'
on conflict (offer_id, school_year) do nothing;

select is(
    (select count(*)::int from public.offer_editions e
       join public.offers o on o.id = e.offer_id
      where o.audience_id = '6' and o.kurstyp = 'halbjahreskurs' and o.slug = 'halbjahreskurs'
        and e.school_year = '2026/27'),
    1,
    'wiederholter Insert fuer dieselbe (offer_id, school_year) erzeugt kein Duplikat'
);

select * from finish();

rollback;
