-- Struktur-Zähltests gegen den dokumentierten Kataloglauf vom 18.07.2026 / Schema-Dump vom
-- 19.07.2026 (docs/migration-evidence/2026-07-18-supabase-baseline-inventory.md, Abschnitt 6
-- und 14). Diese Zahlen sind kein Ersatz für den Schema-Diff, sondern ein zusätzliches Netz
-- gegen stille Objektverluste beim lokalen Reset.
--
-- Angepasst durch 20260719190025_booking_hardening_phase_a.sql: +1 Trigger-Funktion, +6 CHECK-
-- Constraints, netto +1 Index (−1 alter Familien-Index, +2 neue Familien-/Idempotenz-Indizes),
-- +1 Trigger.
--
-- Angepasst durch 20260720090000_booking_hardening_phase_b_rate_limit.sql: +1 Tabelle
-- (intensivwoche_buchungsversuche, RLS aktiviert), +1 Sequenz (Identity-Spalte), +1 Constraint
-- (Primary Key), +2 Indizes (Primary-Key-Index + idx_buchungsversuche_email_time). Funktionen/
-- SECURITY DEFINER/Trigger/Policies/Views unveraendert (CREATE OR REPLACE, gleiche Signatur).
--
-- Angepasst durch 20260720140000_material_access_schema.sql: +3 Tabellen (material_areas,
-- self_study_enrollments, material_access_grants; alle RLS aktiviert), +3 RLS-Policies (je eine
-- SELECT-Policy pro neuer Tabelle; die alte learning_materials_public_read-Policy wurde 1:1 durch
-- eine neue ersetzt, netto unveraendert dort), +1 Sequenz (material_areas Identity-Spalte),
-- +12 Constraints (material_areas: PK+UNIQUE; learning_materials: +1 FK; self_study_enrollments:
-- PK+2 FK+1 CHECK; material_access_grants: PK+2 FK+2 CHECK), +7 Indizes (je PK-Index der drei
-- neuen Tabellen + idx_learning_materials_area_id + idx_self_study_enrollments_beneficiary +
-- idx_material_access_grants_user_area).

begin;

select plan(10);

select is(
    (select count(*)::int from pg_tables where schemaname = 'public'),
    30,
    '30 Tabellen im public-Schema'
);

select is(
    (select count(*)::int from pg_tables where schemaname = 'public' and rowsecurity),
    30,
    'alle 30 public-Tabellen haben RLS aktiviert'
);

select is(
    (select count(*)::int from pg_views where schemaname = 'public'),
    1,
    'genau eine View im public-Schema'
);

select is(
    (select count(*)::int
       from information_schema.routines
      where routine_schema = 'public'
        and routine_type = 'FUNCTION'),
    16,
    '16 Funktionen im public-Schema'
);

select is(
    (select count(*)::int
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prosecdef),
    9,
    '9 davon SECURITY DEFINER'
);

select is(
    (select count(*)::int from pg_policies where schemaname = 'public'),
    134,
    '134 RLS-Policies im public-Schema'
);

select is(
    (select count(*)::int from pg_sequences where schemaname = 'public'),
    14,
    '14 Sequenzen im public-Schema'
);

select is(
    (select count(*)::int
       from pg_constraint con
       join pg_class c on c.oid = con.conrelid
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'),
    103,
    '103 Constraints (PK/UNIQUE/FK/CHECK) im public-Schema'
);

select is(
    (select count(*)::int from pg_indexes where schemaname = 'public'),
    82,
    '82 Indizes im public-Schema'
);

select is(
    (select count(*)::int
       from pg_trigger t
       join pg_class c on c.oid = t.tgrelid
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and not t.tgisinternal),
    10,
    '10 nicht-interne Trigger im public-Schema'
);

select * from finish();

rollback;
