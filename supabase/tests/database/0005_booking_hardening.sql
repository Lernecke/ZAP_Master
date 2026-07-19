-- Buchungshärtungen Phase A (step0Baseline.revision2.md, Abschnitt 12; Migration
-- 20260719190025_booking_hardening_phase_a.sql). Prüft: familienfähiger Duplikatschlüssel,
-- idempotency_key, Format-/Längen-Checks, unveränderlicher Preis-Snapshot, minimale Grants.
-- Rate-Limiter und Concurrency-Test (Abschnitt 12, restliche Punkte) sind bewusst Phase B und
-- nicht Teil dieser Datei.

begin;

select plan(16);

-- Fixtures: zwei aktive Test-Kurse mit ausreichend Kapazität. Die datenverändernde CTE
-- (INSERT ... RETURNING) muss auf oberster Anweisungsebene stehen, nicht als Subquery-Argument
-- von set_config() -- deshalb je eine eigenständige WITH-Anweisung statt verschachtelt.
with ins as (
    insert into public.intensivwoche_kurse (
        name, fach, beschreibung, start_datum, end_datum, uhrzeit, ort, preis, max_teilnehmer, lehrer
    ) values (
        'pgTAP Testkurs A', 'mathematik', 'Testbeschreibung A', '2026-08-01', '2026-08-05',
        '09:00-12:00', 'Testort', 100.00, 10, 'Test Lehrer'
    )
    returning id
)
select set_config('pgtap.test_kurs_a', id::text, true) from ins;

with ins as (
    insert into public.intensivwoche_kurse (
        name, fach, beschreibung, start_datum, end_datum, uhrzeit, ort, preis, max_teilnehmer, lehrer
    ) values (
        'pgTAP Testkurs B', 'deutsch', 'Testbeschreibung B', '2026-08-08', '2026-08-12',
        '09:00-12:00', 'Testort', 120.00, 10, 'Test Lehrer'
    )
    returning id
)
select set_config('pgtap.test_kurs_b', id::text, true) from ins;

-- 1) Familienfähiger Duplikatschlüssel: Geschwister unter derselben Eltern-E-Mail.
select lives_ok(
    format('select public.book_intensivwoche_kurs(%L::bigint, %L, %L, %L, %L, %L, %L)',
        current_setting('pgtap.test_kurs_a')::bigint, 'Anna', 'Geschwister', '6. Klasse', 'w',
        'geschwister@example.com', '0791112233'),
    'erstes Geschwisterkind kann buchen'
);

select lives_ok(
    format('select public.book_intensivwoche_kurs(%L::bigint, %L, %L, %L, %L, %L, %L)',
        current_setting('pgtap.test_kurs_a')::bigint, 'Bruno', 'Geschwister', '6. Klasse', 'm',
        'geschwister@example.com', '0791112233'),
    'zweites Geschwisterkind (gleiche Eltern-E-Mail) kann ebenfalls buchen'
);

select isnt(
    (select id from public.intensivwoche_anmeldungen
      where kurs_id = current_setting('pgtap.test_kurs_a')::bigint and child_firstname = 'Anna'),
    (select id from public.intensivwoche_anmeldungen
      where kurs_id = current_setting('pgtap.test_kurs_a')::bigint and child_firstname = 'Bruno'),
    'Geschwister haben unterschiedliche Anmeldungs-IDs'
);

select throws_ok(
    format('select public.book_intensivwoche_kurs(%L::bigint, %L, %L, %L, %L, %L, %L)',
        current_setting('pgtap.test_kurs_a')::bigint, 'Anna', 'Geschwister', '6. Klasse', 'w',
        'geschwister@example.com', '0791112233'),
    'bereits_angemeldet',
    'dasselbe Kind erneut anmelden wird blockiert'
);

-- 2) idempotency_key: Wiederholung liefert dieselbe id, keine doppelte Zeile.
select is(
    (select public.book_intensivwoche_kurs(
        current_setting('pgtap.test_kurs_a')::bigint, 'Idem', 'Testkind', '6. Klasse', 'm',
        'idem@example.com', '0791234567', null, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
    )),
    (select public.book_intensivwoche_kurs(
        current_setting('pgtap.test_kurs_a')::bigint, 'Idem', 'Testkind', '6. Klasse', 'm',
        'idem@example.com', '0791234567', null, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
    )),
    'zwei Aufrufe mit gleichem idempotency_key liefern dieselbe id'
);

select is(
    (select count(*)::int from public.intensivwoche_anmeldungen
      where idempotency_key = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
    1,
    'idempotency_key erzeugt trotz zweifachem Aufruf nur eine Zeile'
);

select throws_ok(
    format('select public.book_intensivwoche_kurs(%L::bigint, %L, %L, %L, %L, %L, %L, %L, %L::uuid)',
        current_setting('pgtap.test_kurs_b')::bigint, 'Cross', 'Kurs', '6. Klasse', 'd',
        'cross@example.com', '0791234567', null, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    'idempotency_key_reused_for_different_kurs',
    'idempotency_key aus Kurs A gegen Kurs B wird abgelehnt'
);

-- 3) DB-seitige Format-/Längen-Checks. Validiert seit 20260719200303 (0 Verletzer in den Live-
-- Daten vorab geprüft) -- vor Ort weiterhin CHECK ... NOT VALID, greift aber schon vor der
-- Validierung sofort für neue Zeilen.
select ok(
    not exists (
        select 1 from pg_constraint
         where conrelid = 'public.intensivwoche_anmeldungen'::regclass
           and conname like 'anmeldungen_%_check'
           and not convalidated
    ),
    'alle sechs neuen CHECK-Constraints sind validiert (convalidated = true)'
);

select throws_ok(
    format('select public.book_intensivwoche_kurs(%L::bigint, %L, %L, %L, %L, %L, %L)',
        current_setting('pgtap.test_kurs_a')::bigint, 'A', 'Kurzname', '6. Klasse', 'm',
        'kurz@example.com', '0791234567'),
    '23514'::char(5),
    NULL,
    'zu kurzer Vorname wird von der CHECK-Constraint abgelehnt'
);

select throws_ok(
    format('select public.book_intensivwoche_kurs(%L::bigint, %L, %L, %L, %L, %L, %L, %L)',
        current_setting('pgtap.test_kurs_a')::bigint, 'Notiz', 'Testkind', '6. Klasse', 'w',
        'notiz@example.com', '0791234567', repeat('x', 501)),
    '23514'::char(5),
    NULL,
    'zu lange Notiz wird von der CHECK-Constraint abgelehnt'
);

-- 4) Unveränderlicher Preis-/Währungs-Snapshot.
select throws_ok(
    format('update public.intensivwoche_anmeldungen set booked_price_rappen = booked_price_rappen + 1
             where kurs_id = %L::bigint and child_firstname = %L',
        current_setting('pgtap.test_kurs_a')::bigint, 'Anna'),
    'booked_price_snapshot_immutable',
    'Preis-Snapshot kann nicht per UPDATE geändert werden'
);

select lives_ok(
    format('update public.intensivwoche_anmeldungen set status = %L
             where kurs_id = %L::bigint and child_firstname = %L',
        'bestaetigt', current_setting('pgtap.test_kurs_a')::bigint, 'Anna'),
    'status kann weiterhin per UPDATE geändert werden'
);

-- 5) Minimale Grants. anon behält SELECT (Vorbedingung für die security_invoker View
-- intensivwoche_kurse_mit_anmeldungen, die intern die Teilnehmerzahl aggregiert), verliert aber
-- alles andere. Mangels RLS-Policy für anon auf dieser Tabelle sieht anon über den SELECT-Grant
-- hinaus ohnehin keine einzelnen Zeilen.
select ok(
    has_table_privilege('anon', 'public.intensivwoche_anmeldungen', 'SELECT'),
    'anon behält SELECT auf intensivwoche_anmeldungen (für die aggregierende View)'
);

select ok(
    not exists (
        select 1 from unnest(array[
            'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'
        ]) priv
        where has_table_privilege('anon', 'public.intensivwoche_anmeldungen', priv)
    ),
    'anon hat sonst keine Tabellenrechte mehr auf intensivwoche_anmeldungen'
);

select ok(
    has_table_privilege('authenticated', 'public.intensivwoche_anmeldungen', 'SELECT')
    and has_table_privilege('authenticated', 'public.intensivwoche_anmeldungen', 'UPDATE')
    and has_table_privilege('authenticated', 'public.intensivwoche_anmeldungen', 'DELETE'),
    'authenticated behält SELECT/UPDATE/DELETE (Vorbedingung für die admin-Policies)'
);

select ok(
    not exists (
        select 1 from unnest(array['TRUNCATE', 'MAINTAIN', 'REFERENCES', 'TRIGGER']) priv
        where has_table_privilege('authenticated', 'public.intensivwoche_anmeldungen', priv)
    ),
    'authenticated verliert TRUNCATE/MAINTAIN/REFERENCES/TRIGGER'
);

select * from finish();

rollback;
