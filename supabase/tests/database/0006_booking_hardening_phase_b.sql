-- Buchungshärtungen Phase B (step0Baseline.revision2.md, Abschnitt 12; Migration
-- 20260720090000_booking_hardening_phase_b_rate_limit.sql). Prüft: dauerhafter, serverseitiger
-- Rate-Limiter (5 Versuche / 10 Minuten je parent_email, kursübergreifend), idempotency_key-
-- Wiederholungen zählen nicht als neuer Versuch, minimale Grants/RLS auf der neuen Zähltabelle.
-- Der automatisierte Parallelitätstest für den letzten freien Platz (Abschnitt 12, letzter Punkt)
-- ist kein pgTAP-Test (braucht echte gleichzeitige Verbindungen) -- siehe
-- scripts/concurrency-test-booking.ts.

begin;

select plan(10);

with ins as (
    insert into public.intensivwoche_kurse (
        name, fach, beschreibung, start_datum, end_datum, uhrzeit, ort, preis, max_teilnehmer, lehrer
    ) values (
        'pgTAP Testkurs C', 'franzoesisch', 'Testbeschreibung C', '2026-08-15', '2026-08-19',
        '09:00-12:00', 'Testort', 90.00, 20, 'Test Lehrer'
    )
    returning id
)
select set_config('pgtap.test_kurs_c', id::text, true) from ins;

with ins as (
    insert into public.intensivwoche_kurse (
        name, fach, beschreibung, start_datum, end_datum, uhrzeit, ort, preis, max_teilnehmer, lehrer
    ) values (
        'pgTAP Testkurs D', 'natur-mensch-gesellschaft', 'Testbeschreibung D', '2026-08-22', '2026-08-26',
        '09:00-12:00', 'Testort', 95.00, 20, 'Test Lehrer'
    )
    returning id
)
select set_config('pgtap.test_kurs_d', id::text, true) from ins;

-- 1) Die ersten fünf Buchungsversuche derselben E-Mail-Adresse (unterschiedliche Kinder, damit
--    nicht der Duplikat-Check statt des Rate-Limiters greift) sind erlaubt.
select lives_ok(
    format('select public.book_intensivwoche_kurs(%L::bigint, %L, %L, %L, %L, %L, %L, null, %L::uuid)',
        current_setting('pgtap.test_kurs_c')::bigint, 'Kind1', 'RateTest', '6. Klasse', 'w',
        'ratelimit@example.com', '0791112233', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'),
    'Versuch 1/5 wird zugelassen'
);

select lives_ok(
    format('select public.book_intensivwoche_kurs(%L::bigint, %L, %L, %L, %L, %L, %L)',
        current_setting('pgtap.test_kurs_c')::bigint, 'Kind2', 'RateTest', '6. Klasse', 'w',
        'ratelimit@example.com', '0791112233'),
    'Versuch 2/5 wird zugelassen'
);

select lives_ok(
    format('select public.book_intensivwoche_kurs(%L::bigint, %L, %L, %L, %L, %L, %L)',
        current_setting('pgtap.test_kurs_c')::bigint, 'Kind3', 'RateTest', '6. Klasse', 'w',
        'ratelimit@example.com', '0791112233'),
    'Versuch 3/5 wird zugelassen'
);

select lives_ok(
    format('select public.book_intensivwoche_kurs(%L::bigint, %L, %L, %L, %L, %L, %L)',
        current_setting('pgtap.test_kurs_c')::bigint, 'Kind4', 'RateTest', '6. Klasse', 'w',
        'ratelimit@example.com', '0791112233'),
    'Versuch 4/5 wird zugelassen'
);

select lives_ok(
    format('select public.book_intensivwoche_kurs(%L::bigint, %L, %L, %L, %L, %L, %L)',
        current_setting('pgtap.test_kurs_c')::bigint, 'Kind5', 'RateTest', '6. Klasse', 'w',
        'ratelimit@example.com', '0791112233'),
    'Versuch 5/5 wird zugelassen'
);

-- 2) Der sechste Versuch derselben E-Mail wird blockiert -- auch gegen einen anderen Kurs, denn
--    der Limiter zählt kursübergreifend je E-Mail.
select throws_ok(
    format('select public.book_intensivwoche_kurs(%L::bigint, %L, %L, %L, %L, %L, %L)',
        current_setting('pgtap.test_kurs_d')::bigint, 'Kind6', 'RateTest', '6. Klasse', 'w',
        'ratelimit@example.com', '0791112233'),
    'rate_limit_exceeded',
    'sechster Versuch derselben E-Mail (anderer Kurs) wird als Rate-Limit abgelehnt'
);

-- 3) idempotency_key-Wiederholung zählt nicht als neuer Versuch: Versuch 1 erneut mit demselben
--    Schlüssel liefert trotz ausgeschöpftem Kontingent weiterhin die ursprüngliche id.
select is(
    (select public.book_intensivwoche_kurs(
        current_setting('pgtap.test_kurs_c')::bigint, 'Kind1', 'RateTest', '6. Klasse', 'w',
        'ratelimit@example.com', '0791112233', null, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid
    )),
    (select id from public.intensivwoche_anmeldungen
      where idempotency_key = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid),
    'idempotenter Wiederholungsaufruf umgeht das ausgeschöpfte Rate-Limit und liefert die Original-id'
);

-- 4) Eine andere E-Mail-Adresse ist von obigem Limit unberührt.
select lives_ok(
    format('select public.book_intensivwoche_kurs(%L::bigint, %L, %L, %L, %L, %L, %L)',
        current_setting('pgtap.test_kurs_c')::bigint, 'Anderes', 'Kind', '6. Klasse', 'm',
        'andere-email@example.com', '0794445566'),
    'eine andere E-Mail-Adresse ist vom Limit der ersten unberührt'
);

-- 5) Minimale Grants + RLS auf der neuen Zähltabelle.
select ok(
    not exists (
        select 1 from unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) priv
        where has_table_privilege('anon', 'public.intensivwoche_buchungsversuche', priv)
           or has_table_privilege('authenticated', 'public.intensivwoche_buchungsversuche', priv)
    ),
    'anon/authenticated haben keinerlei Rechte auf intensivwoche_buchungsversuche'
);

select ok(
    (select relrowsecurity from pg_class where oid = 'public.intensivwoche_buchungsversuche'::regclass),
    'RLS ist auf intensivwoche_buchungsversuche aktiviert'
);

select * from finish();

rollback;
