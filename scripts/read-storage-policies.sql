\set ON_ERROR_STOP on
\pset pager off

BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

-- Storage-RLS-Policy-Definitionen (Katalog-Metadaten, kein Schema-Recht noetig).
SELECT
    tablename,
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

COMMIT;
