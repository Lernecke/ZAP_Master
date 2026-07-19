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

\qecho '=== MIGRATION_TABLE_COLUMNS ==='
SELECT ordinal_position, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'supabase_migrations'
  AND table_name = 'schema_migrations'
  AND column_name <> 'statements'
ORDER BY ordinal_position;

\qecho '=== REMOTE_MIGRATIONS_SAFE_FIELDS ==='
SELECT version, name, 'applied'::text AS derived_state
FROM supabase_migrations.schema_migrations
ORDER BY version, name;

\qecho '=== OBJECT_COUNTS ==='
SELECT n.nspname AS schema_name, c.relkind, count(*) AS object_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage')
  AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
GROUP BY n.nspname, c.relkind
ORDER BY n.nspname, c.relkind;

\qecho '=== TABLES_AND_RLS ==='
SELECT
    n.nspname AS schema_name,
    c.relname AS relation_name,
    c.relkind,
    pg_get_userbyid(c.relowner) AS owner_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced,
    c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage')
  AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
ORDER BY n.nspname, c.relkind, c.relname;

\qecho '=== COLUMNS ==='
SELECT
    n.nspname AS schema_name,
    c.relname AS relation_name,
    a.attnum AS ordinal_position,
    a.attname AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS formatted_type,
    a.attnotnull AS not_null,
    a.attidentity AS identity_kind,
    a.attgenerated AS generated_kind,
    coll.collname AS collation_name,
    pg_get_expr(d.adbin, d.adrelid) AS default_expression
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
LEFT JOIN pg_collation coll ON coll.oid = a.attcollation AND a.attcollation <> 0
WHERE n.nspname IN ('public', 'storage')
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY n.nspname, c.relname, a.attnum;

\qecho '=== CONSTRAINTS ==='
SELECT
    n.nspname AS schema_name,
    c.relname AS relation_name,
    con.conname AS constraint_name,
    con.contype,
    pg_get_constraintdef(con.oid, true) AS definition
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage')
ORDER BY n.nspname, c.relname, con.conname;

\qecho '=== INDEXES ==='
SELECT
    n.nspname AS schema_name,
    t.relname AS relation_name,
    i.relname AS index_name,
    ix.indisunique AS is_unique,
    ix.indisprimary AS is_primary,
    pg_get_indexdef(i.oid) AS definition
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname IN ('public', 'storage')
ORDER BY n.nspname, t.relname, i.relname;

\qecho '=== SEQUENCES ==='
SELECT
    schemaname AS schema_name,
    sequencename AS sequence_name,
    data_type,
    start_value,
    min_value,
    max_value,
    increment_by,
    cycle,
    cache_size
FROM pg_sequences
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, sequencename;

\qecho '=== USER_DEFINED_TYPES ==='
SELECT
    n.nspname AS schema_name,
    t.typname AS type_name,
    t.typtype,
    t.typcategory,
    e.enumsortorder,
    e.enumlabel,
    CASE WHEN t.typtype = 'd' THEN pg_catalog.format_type(t.typbasetype, t.typtypmod) END AS domain_base_type,
    CASE WHEN t.typtype = 'd' THEN pg_get_expr(t.typdefaultbin, 0) END AS domain_default
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
LEFT JOIN pg_enum e ON e.enumtypid = t.oid
WHERE n.nspname IN ('public', 'storage')
  AND t.typtype IN ('e', 'd')
ORDER BY n.nspname, t.typname, e.enumsortorder;

\qecho '=== VIEWS ==='
SELECT
    n.nspname AS schema_name,
    c.relname AS view_name,
    c.relkind,
    pg_get_userbyid(c.relowner) AS owner_name,
    c.reloptions,
    pg_get_viewdef(c.oid, true) AS definition
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage')
  AND c.relkind IN ('v', 'm')
ORDER BY n.nspname, c.relname;

\qecho '=== TRIGGERS ==='
SELECT
    n.nspname AS schema_name,
    c.relname AS relation_name,
    t.tgname AS trigger_name,
    t.tgenabled,
    pg_get_triggerdef(t.oid, true) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage')
  AND NOT t.tgisinternal
ORDER BY n.nspname, c.relname, t.tgname;

\qecho '=== ROUTINES ==='
SELECT
    n.nspname AS schema_name,
    p.proname AS routine_name,
    pg_get_function_identity_arguments(p.oid) AS identity_arguments,
    p.prokind,
    l.lanname AS language_name,
    p.provolatile,
    p.proparallel,
    p.prosecdef AS security_definer,
    pg_get_userbyid(p.proowner) AS owner_name,
    p.proconfig,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
ORDER BY p.proname, pg_get_function_identity_arguments(p.oid);

\qecho '=== RLS_POLICIES ==='
SELECT
    n.nspname AS schema_name,
    c.relname AS relation_name,
    p.polname AS policy_name,
    p.polcmd,
    p.polpermissive,
    ARRAY(SELECT rolname FROM pg_roles WHERE oid = ANY (p.polroles) ORDER BY rolname) AS roles,
    pg_get_expr(p.polqual, p.polrelid) AS using_expression,
    pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expression
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage')
ORDER BY n.nspname, c.relname, p.polname;

\qecho '=== EXPLICIT_RELATION_GRANTS ==='
SELECT
    n.nspname AS schema_name,
    c.relname AS relation_name,
    c.relkind,
    COALESCE(r.rolname, 'PUBLIC') AS grantee,
    acl.privilege_type,
    acl.is_grantable
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(c.relacl) acl
LEFT JOIN pg_roles r ON r.oid = acl.grantee
WHERE n.nspname IN ('public', 'storage')
ORDER BY n.nspname, c.relname, grantee, acl.privilege_type;

\qecho '=== DEFAULT_PRIVILEGES ==='
SELECT
    n.nspname AS schema_name,
    pg_get_userbyid(d.defaclrole) AS owner_name,
    d.defaclobjtype,
    COALESCE(r.rolname, 'PUBLIC') AS grantee,
    acl.privilege_type,
    acl.is_grantable
FROM pg_default_acl d
LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) acl
LEFT JOIN pg_roles r ON r.oid = acl.grantee
WHERE n.nspname IN ('public', 'storage') OR d.defaclnamespace = 0
ORDER BY n.nspname NULLS FIRST, owner_name, d.defaclobjtype, grantee, acl.privilege_type;

\qecho '=== EXTENSIONS ==='
SELECT e.extname, e.extversion, n.nspname AS schema_name
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
ORDER BY e.extname;

\qecho '=== PUBLICATIONS ==='
SELECT pubname, puballtables, pubinsert, pubupdate, pubdelete, pubtruncate
FROM pg_publication
ORDER BY pubname;

SELECT pubname, schemaname, tablename
FROM pg_publication_tables
ORDER BY pubname, schemaname, tablename;

\qecho '=== TARGET_TABLE_MATRIX ==='
WITH expected(relation_name, expected_group) AS (
    VALUES
        ('profiles', 'vorhanden'),
        ('subjects', 'vorhanden'),
        ('intensivwoche_kurse', 'vorhanden'),
        ('intensivwoche_anmeldungen', 'vorhanden'),
        ('learning_materials', 'vorhanden'),
        ('offers', 'katalog_fehlt'),
        ('offer_editions', 'katalog_fehlt'),
        ('course_sessions', 'katalog_fehlt'),
        ('material_areas', 'materialzugriff_fehlt'),
        ('self_study_enrollments', 'materialzugriff_fehlt'),
        ('material_access_grants', 'materialzugriff_fehlt'),
        ('release_content_catalog', 'tagesfreigaben_fehlen'),
        ('course_days', 'tagesfreigaben_fehlen'),
        ('daily_releases', 'tagesfreigaben_fehlen'),
        ('daily_release_items', 'tagesfreigaben_fehlen'),
        ('teacher_assignments', 'arbeitszeit_lohn_fehlt'),
        ('work_entries', 'arbeitszeit_lohn_fehlt'),
        ('teacher_rate_agreements', 'arbeitszeit_lohn_fehlt'),
        ('payroll_periods', 'arbeitszeit_lohn_fehlt'),
        ('payroll_snapshots', 'arbeitszeit_lohn_fehlt'),
        ('payroll_snapshot_lines', 'arbeitszeit_lohn_fehlt'),
        ('financial_events', 'finanzen_fehlen'),
        ('expense_entries', 'finanzen_fehlen'),
        ('financial_periods', 'finanzen_fehlen'),
        ('budgets', 'finanzen_fehlen'),
        ('financial_adjustments', 'finanzen_fehlen'),
        ('audit_log', 'audit_fehlt')
)
SELECT
    e.expected_group,
    e.relation_name,
    (c.oid IS NOT NULL) AS exists_in_public,
    c.relkind
FROM expected e
LEFT JOIN pg_namespace n ON n.nspname = 'public'
LEFT JOIN pg_class c ON c.relnamespace = n.oid
                    AND c.relname = e.relation_name
                    AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
ORDER BY e.expected_group, e.relation_name;

\qecho '=== KNOWN_COLUMN_MATRIX ==='
WITH expected(relation_name, column_name) AS (
    VALUES
        ('intensivwoche_anmeldungen', 'idempotency_key'),
        ('intensivwoche_anmeldungen', 'edition_id'),
        ('intensivwoche_anmeldungen', 'session_id'),
        ('learning_materials', 'area_id')
)
SELECT
    e.relation_name,
    e.column_name,
    (a.attnum IS NOT NULL) AS exists_in_public
FROM expected e
LEFT JOIN pg_namespace n ON n.nspname = 'public'
LEFT JOIN pg_class c ON c.relnamespace = n.oid
                    AND c.relname = e.relation_name
                    AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
LEFT JOIN pg_attribute a ON a.attrelid = c.oid
                        AND a.attname = e.column_name
                        AND a.attnum > 0
                        AND NOT a.attisdropped
ORDER BY e.relation_name, e.column_name;

\qecho '=== STORAGE_METADATA_ACCESS_BOUNDARY ==='
SELECT
    has_schema_privilege(current_user, 'storage', 'USAGE') AS can_use_storage_schema,
    (
        SELECT has_table_privilege(current_user, c.oid, 'SELECT')
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'storage' AND c.relname = 'buckets'
    ) AS can_read_bucket_rows,
    (
        SELECT has_table_privilege(current_user, c.oid, 'SELECT')
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'storage' AND c.relname = 'objects'
    ) AS can_read_object_rows;

COMMIT;
