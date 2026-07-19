-- Realtime-Publications sind eine weitere bekannte Schema-Diff-Lücke
-- (step0Baseline.revision2.md, Abschnitt 10). Der Kataloglauf vom 18.07.2026
-- (docs/migration-evidence/2026-07-18-supabase-baseline-inventory.md, Abschnitt 6) bestätigt:
-- `supabase_realtime` publiziert ausschließlich `public.chat_messages`. Die Baseline-SQL enthält
-- keine `ALTER PUBLICATION` / `CREATE PUBLICATION`-Anweisung, weil `pg_dump --schema-only` diese
-- Konfiguration nicht mit ausgibt (weiterer Beleg für die Tool-Lücke) — die lokale Herstellung
-- dieser Publication ist selbst ein offener Punkt vor einem produktiven Gate-Lauf.

begin;

select plan(2);

select is(
    (select count(*)::int from pg_publication_tables where pubname = 'supabase_realtime'),
    1,
    'supabase_realtime publiziert genau eine Tabelle'
);

select ok(
    exists(
        select 1 from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = 'chat_messages'
    ),
    'supabase_realtime publiziert public.chat_messages'
);

select * from finish();

rollback;
