-- Regressionstest fuer eine real gefundene Luecke (Migration
-- 20260721153000_fix_public_availability_count_rls_gap.sql): intensivwoche_kurse_mit_anmeldungen
-- ist security_invoker=true (Migration 014), wodurch die interne Teilnehmerzaehlung fuer anon
-- (und jede Rolle ohne direkten Zeilenzugriff auf intensivwoche_anmeldungen) IMMER 0 ergab,
-- unabhaengig von echten Buchungen -- reproduziert per `SET ROLE anon; SELECT * FROM
-- intensivwoche_kurse_mit_anmeldungen`. Dieser Test haelt die korrigierte, ueber die
-- SECURITY DEFINER-Funktion count_active_anmeldungen() berechnete Aggregatzahl katalogfest und
-- bestaetigt zugleich, dass anon weiterhin KEINE einzelnen Anmeldungszeilen lesen kann (der
-- urspruengliche Sicherheitszweck von security_invoker bleibt erhalten).

begin;

select plan(4);

-- Fixture: ein Testkurs mit 3 Plaetzen, 2 aktive + 1 stornierte Anmeldung. max_teilnehmer=3 macht
-- den Statuswert diagnostisch fuer die Regression: korrekt gezaehlt (2) ergibt "wenige-plaetze"
-- (Schwelle max_teilnehmer-2=1), faelschlich als 0 gezaehlt ergaebe "offen".
with ins_kurs as (
    insert into public.intensivwoche_kurse (
        name, fach, beschreibung, start_datum, end_datum, uhrzeit, ort, preis, max_teilnehmer, lehrer
    ) values (
        'pgTAP Verfuegbarkeits-Testkurs', 'mathematik', 'Testbeschreibung', '2026-09-01', '2026-09-05',
        '09:00-12:00', 'Testort', 100.00, 3, 'Test Lehrer'
    )
    returning id
)
select set_config('pgtap.avail_kurs_id', id::text, true) from ins_kurs;

insert into public.intensivwoche_anmeldungen (
    kurs_id, child_firstname, child_lastname, child_class_level, child_gender,
    parent_email, parent_phone, status
) values
    (current_setting('pgtap.avail_kurs_id')::bigint, 'Anna', 'Aktiv', '6. Klasse', 'w', 'anna@example.com', '0791112233', 'eingegangen'),
    (current_setting('pgtap.avail_kurs_id')::bigint, 'Bruno', 'Aktiv', '6. Klasse', 'm', 'bruno@example.com', '0791112244', 'bestaetigt'),
    (current_setting('pgtap.avail_kurs_id')::bigint, 'Clara', 'Storniert', '6. Klasse', 'w', 'clara@example.com', '0791112255', 'storniert');

-- 1) Als service_role/Testrunner ist die Zahl bereits korrekt (2 aktive, 1 stornierte zaehlt nicht).
select is(
    (select aktuelle_teilnehmer from public.intensivwoche_kurse_mit_anmeldungen
      where id = current_setting('pgtap.avail_kurs_id')::bigint),
    2::bigint,
    'aktuelle_teilnehmer zaehlt nur nicht stornierte Anmeldungen (Kontrollwert als privilegierte Rolle)'
);

-- 2) Als anon (die Rolle, die die oeffentlichen Marketingseiten tatsaechlich verwenden) muss
--    dieselbe korrekte Zahl sichtbar sein -- das ist die eigentliche Regression.
set local role anon;
select set_config(
    'pgtap.avail_anon_count',
    (select aktuelle_teilnehmer::text from public.intensivwoche_kurse_mit_anmeldungen
      where id = current_setting('pgtap.avail_kurs_id')::bigint),
    true
);
select set_config(
    'pgtap.avail_anon_status',
    (select status from public.intensivwoche_kurse_mit_anmeldungen
      where id = current_setting('pgtap.avail_kurs_id')::bigint),
    true
);
-- 3) Regressionsschutz fuer den urspruenglichen Sicherheitszweck: anon darf weiterhin keine
--    einzelne Anmeldungszeile lesen (nur die Aggregatfunktion, nicht die Tabelle direkt).
select set_config(
    'pgtap.avail_anon_row_count',
    (select count(*)::text from public.intensivwoche_anmeldungen
      where kurs_id = current_setting('pgtap.avail_kurs_id')::bigint),
    true
);
reset role;

select is(
    current_setting('pgtap.avail_anon_count'),
    '2',
    'anon sieht ueber die View die korrekte Aggregatzahl (2), nicht 0'
);

select is(
    current_setting('pgtap.avail_anon_status'),
    'wenige-plaetze',
    'anon sieht den korrekten Status "wenige-plaetze" (2 von 5 Plaetzen, Schwelle max_teilnehmer-2) statt "offen"'
);

select is(
    current_setting('pgtap.avail_anon_row_count'),
    '0',
    'anon liest weiterhin null einzelne intensivwoche_anmeldungen-Zeilen direkt (RLS bleibt wirksam)'
);

select * from finish();

rollback;
