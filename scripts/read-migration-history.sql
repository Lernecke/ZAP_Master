\set ON_ERROR_STOP on
\pset pager off
\pset null '(null)'
\pset border 2

BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

\qecho '=== IDENTITY ==='
SELECT
    now() AT TIME ZONE 'UTC' AS captured_at_utc,
    current_database() AS database_name,
    current_user,
    current_setting('server_version') AS server_version,
    current_setting('transaction_read_only') AS transaction_read_only,
    current_setting('ssl') AS ssl_enabled;

\qecho '=== REMOTE_MIGRATIONS_SAFE_FIELDS ==='
SELECT version, name, 'applied'::text AS derived_state
FROM supabase_migrations.schema_migrations
ORDER BY version, name;

COMMIT;
