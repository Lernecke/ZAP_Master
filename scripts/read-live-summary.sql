\set ON_ERROR_STOP on
\pset pager off

BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

SELECT 'remote_migrations' AS metric, count(*)::bigint AS value
FROM supabase_migrations.schema_migrations
UNION ALL
SELECT 'public_tables', count(*)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
UNION ALL
SELECT 'public_tables_rls_enabled', count(*)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relrowsecurity
UNION ALL
SELECT 'public_tables_rls_forced', count(*)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relforcerowsecurity
UNION ALL
SELECT 'storage_tables', count(*)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'storage' AND c.relkind IN ('r', 'p')
UNION ALL
SELECT 'public_views', count(*)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
UNION ALL
SELECT 'public_sequences', count(*)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'S'
UNION ALL
SELECT 'public_constraints', count(*)
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
UNION ALL
SELECT 'storage_constraints', count(*)
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'storage'
UNION ALL
SELECT 'public_indexes', count(*)
FROM pg_index ix
JOIN pg_class c ON c.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
UNION ALL
SELECT 'storage_indexes', count(*)
FROM pg_index ix
JOIN pg_class c ON c.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'storage'
UNION ALL
SELECT 'public_triggers', count(*)
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT t.tgisinternal
UNION ALL
SELECT 'storage_triggers', count(*)
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'storage' AND NOT t.tgisinternal
UNION ALL
SELECT 'public_routines', count(*)
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
UNION ALL
SELECT 'public_security_definer_routines', count(*)
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef
UNION ALL
SELECT 'public_policies', count(*)
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
UNION ALL
SELECT 'storage_policies', count(*)
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'storage'
UNION ALL
SELECT 'extensions', count(*) FROM pg_extension
ORDER BY metric;

COMMIT;
