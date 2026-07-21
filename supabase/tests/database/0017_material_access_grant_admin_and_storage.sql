-- Schritt 11a (Migration 20260721125216_material_access_grant_admin_and_storage.sql). Prueft:
-- material_access_grants erlaubt Admin-INSERT/UPDATE nur mit source_kind='admin_grant', anon/
-- authenticated erhalten dafuer keine pauschalen Grants, und die neue private
-- lernmaterialien-Storage-Policy existiert mit der erwarteten Bedingung (is_public, created_by,
-- is_content_manager, material_access_grants).
--
-- Teststrategie konsistent mit 0007/0009: pgTAP laeuft als Tabellenbesitzer und umgeht RLS, daher
-- Pruefung ueber Policy-Existenz/-qual (pg_policies) statt echter Rollensimulation. Ein INSERT-
-- Verhaltenstest fuer die source_kind-Check-Klausel waere hier ebenfalls nur ein Test des
-- Test-Setups (pgTAP-Rolle ist selbst kein authenticated-Nutzer mit auth.uid()), deshalb bleibt es
-- bei der bereits etablierten Policy-Introspektion.

begin;

select plan(7);

-- 1) material_access_grants: INSERT-Policy verlangt is_admin() UND source_kind = 'admin_grant'.
select ok(
    exists (
        select 1 from pg_policies
         where schemaname = 'public' and tablename = 'material_access_grants'
           and policyname = 'material_access_grants_admin_insert'
           and cmd = 'INSERT'
           and with_check like '%is_admin%'
           and with_check like '%admin_grant%'
    ),
    'material_access_grants_admin_insert verlangt is_admin() und source_kind = admin_grant'
);

-- 2) material_access_grants: UPDATE-Policy verlangt is_admin() (Entzug/Aenderung bleibt admin-only).
select ok(
    exists (
        select 1 from pg_policies
         where schemaname = 'public' and tablename = 'material_access_grants'
           and policyname = 'material_access_grants_admin_update'
           and cmd = 'UPDATE'
           and qual like '%is_admin%'
           and with_check like '%is_admin%'
    ),
    'material_access_grants_admin_update verlangt is_admin() in USING und WITH CHECK'
);

-- 3) Genau zwei neue Policies auf material_access_grants (kein Wildcard-INSERT/UPDATE fuer alle).
select is(
    (select count(*)::int from pg_policies
      where schemaname = 'public' and tablename = 'material_access_grants' and cmd in ('INSERT', 'UPDATE')),
    2,
    'material_access_grants hat genau eine INSERT- und eine UPDATE-Policy'
);

-- 4) anon hat weiterhin keine INSERT/UPDATE-Rechte auf material_access_grants; nur authenticated
--    (gated durch die Policy) erhielt das neue GRANT.
select ok(
    not exists (
        select 1 from unnest(array['INSERT', 'UPDATE']) priv
        where has_table_privilege('anon', 'public.material_access_grants', priv)
    ),
    'anon hat weiterhin keine INSERT/UPDATE-Rechte auf material_access_grants'
);

select ok(
    has_table_privilege('authenticated', 'public.material_access_grants', 'INSERT')
    and has_table_privilege('authenticated', 'public.material_access_grants', 'UPDATE'),
    'authenticated hat jetzt INSERT/UPDATE-Tabellenrechte (durch die Admin-Policy gated)'
);

-- 5) lernmaterialien-Bucket ist privat.
select ok(
    exists (select 1 from storage.buckets where id = 'lernmaterialien' and public = false),
    'lernmaterialien-Bucket existiert und ist privat (public = false)'
);

-- 6) Die neue Storage-Policy existiert und prueft is_public, created_by, is_content_manager sowie
--    material_access_grants -- ohne sie waere die Tabellen-RLS auf learning_materials wirkungslos,
--    sobald der Storage-Pfad bekannt ist.
select ok(
    exists (
        select 1 from pg_policies
         where schemaname = 'storage' and tablename = 'objects'
           and policyname = 'lernmaterialien_read_access'
           and cmd = 'SELECT'
           and qual like '%lernmaterialien%'
           and qual like '%is_public%'
           and qual like '%created_by%'
           and qual like '%is_content_manager%'
           and qual like '%material_access_grants%'
    ),
    'lernmaterialien_read_access-Policy auf storage.objects existiert mit der erwarteten Bedingung'
);

select * from finish();

rollback;
