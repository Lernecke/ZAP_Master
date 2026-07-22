-- Regressionstest fuer eine real gefundene Luecke (Migration
-- 20260722084521_grant_authenticated_select_active_kurse.sql): anon_select_active_kurse
-- (Migration 20260719133741_live_schema_baseline.sql) ist TO anon beschraenkt; die einzige
-- SELECT-Policy fuer die Rolle authenticated (lehrperson_select_own_kurse) verlangt zusaetzlich
-- is_content_manager() AND is_kurs_owner(created_by). Ein eingeloggter normaler Nutzer sah dadurch
-- auf der geschuetzten Seite /intensivkurse "0 Kurse gefunden", obwohl aktive Kurse existieren --
-- schlechter gestellt als ein anonymer Gast auf der oeffentlichen /kurse-Seite. Reproduziert per
-- `SET ROLE authenticated; SELECT * FROM intensivwoche_kurse WHERE ist_aktiv = true;`.

begin;

select plan(4);

with ins_kurs as (
    insert into public.intensivwoche_kurse (
        name, fach, beschreibung, start_datum, end_datum, uhrzeit, ort, preis, max_teilnehmer, lehrer, ist_aktiv
    ) values (
        'pgTAP Authenticated-Sichtbarkeits-Testkurs', 'mathematik', 'Testbeschreibung',
        '2026-09-01', '2026-09-05', '09:00-12:00', 'Testort', 100.00, 10, 'Test Lehrer', true
    )
    returning id
),
ins_inaktiv as (
    insert into public.intensivwoche_kurse (
        name, fach, beschreibung, start_datum, end_datum, uhrzeit, ort, preis, max_teilnehmer, lehrer, ist_aktiv
    ) values (
        'pgTAP Authenticated-Sichtbarkeits-Testkurs (inaktiv)', 'mathematik', 'Testbeschreibung',
        '2026-09-01', '2026-09-05', '09:00-12:00', 'Testort', 100.00, 10, 'Test Lehrer', false
    )
    returning id
)
select
    set_config('pgtap.auth_visible_kurs_id', (select id::text from ins_kurs), true),
    set_config('pgtap.auth_hidden_kurs_id', (select id::text from ins_inaktiv), true);

-- 1) Als service_role/Testrunner ist der aktive Testkurs sichtbar (Kontrollwert).
select ok(
    (select count(*) from public.intensivwoche_kurse
      where id = current_setting('pgtap.auth_visible_kurs_id')::bigint) = 1,
    'aktiver Testkurs ist als privilegierte Rolle sichtbar (Kontrollwert)'
);

-- 2) Die eigentliche Regression: ein eingeloggter Nutzer OHNE Owner-/Lehrperson-Rechte (kein
--    is_content_manager(), kein is_kurs_owner()) muss den aktiven Kurs jetzt trotzdem sehen --
--    genau wie ein anonymer Gast.
set local role authenticated;
select set_config(
    'pgtap.auth_visible_count',
    (select count(*)::text from public.intensivwoche_kurse
      where id = current_setting('pgtap.auth_visible_kurs_id')::bigint),
    true
);
select set_config(
    'pgtap.auth_hidden_count',
    (select count(*)::text from public.intensivwoche_kurse
      where id = current_setting('pgtap.auth_hidden_kurs_id')::bigint),
    true
);
reset role;

select is(
    current_setting('pgtap.auth_visible_count'),
    '1',
    'authenticated (ohne Owner-/Lehrperson-Rechte) sieht den aktiven Kurs -- vorher 0 (die Regression)'
);

select is(
    current_setting('pgtap.auth_hidden_count'),
    '0',
    'authenticated sieht weiterhin KEINEN inaktiven Kurs (kein zu weit gefasster Fix)'
);

-- 3) Verteidigung in der Tiefe: die neue Policy erlaubt ausdruecklich nur SELECT, keine Mutation.
select ok(
    not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'intensivwoche_kurse'
          and policyname = 'authenticated_select_active_kurse'
          and cmd <> 'SELECT'
    ),
    'authenticated_select_active_kurse ist ausschliesslich eine SELECT-Policy'
);

select * from finish();

rollback;
