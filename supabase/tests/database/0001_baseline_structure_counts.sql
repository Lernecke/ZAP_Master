-- Struktur-Zähltests gegen den dokumentierten Kataloglauf vom 18.07.2026 / Schema-Dump vom
-- 19.07.2026 (docs/migration-evidence/2026-07-18-supabase-baseline-inventory.md, Abschnitt 6
-- und 14). Diese Zahlen sind kein Ersatz für den Schema-Diff, sondern ein zusätzliches Netz
-- gegen stille Objektverluste beim lokalen Reset.
--
-- Angepasst durch 20260719190025_booking_hardening_phase_a.sql: +1 Trigger-Funktion, +6 CHECK-
-- Constraints, netto +1 Index (−1 alter Familien-Index, +2 neue Familien-/Idempotenz-Indizes),
-- +1 Trigger.

begin;

select plan(10);

select is(
    (select count(*)::int from pg_tables where schemaname = 'public'),
    26,
    '26 Tabellen im public-Schema'
);

select is(
    (select count(*)::int from pg_tables where schemaname = 'public' and rowsecurity),
    26,
    'alle 26 public-Tabellen haben RLS aktiviert'
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
    131,
    '131 RLS-Policies im public-Schema'
);

select is(
    (select count(*)::int from pg_sequences where schemaname = 'public'),
    12,
    '12 Sequenzen im public-Schema'
);

select is(
    (select count(*)::int
       from pg_constraint con
       join pg_class c on c.oid = con.conrelid
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'),
    90,
    '90 Constraints (PK/UNIQUE/FK/CHECK) im public-Schema'
);

select is(
    (select count(*)::int from pg_indexes where schemaname = 'public'),
    73,
    '73 Indizes im public-Schema'
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
