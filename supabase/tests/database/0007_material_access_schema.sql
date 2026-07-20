-- Materialzugriff-Schema (step0Baseline.revision2.md / Schritt 5, Teil 2; Migration
-- 20260720140000_material_access_schema.sql). Prüft: material_areas-Lookup, dass area_id auf
-- learning_materials nutzbar ist (nullable FK, akzeptiert einen gültigen Bereich oder NULL),
-- RLS/Grants auf den beiden neuen Tabellen, und die Behebung der gefundenen
-- learning_materials_public_read-Lücke (qual=true erlaubte bislang jede Zeile für anon/
-- authenticated -- hier wird geprüft, dass keine Policy mit qual='true' mehr existiert, nicht
-- durch Rollensimulation, konsistent mit dem Stil der übrigen Dateien in diesem Verzeichnis).
--
-- Der tatsächliche Backfill der zwei echten Bestandszeilen (id=9 -> langzeitgymi, id=10 ->
-- needs_review/NULL) betrifft reine Live-Daten, die im schema-only lokalen Baseline-Strang gar
-- nicht existieren (kein pg_dump von Datenzeilen) -- er wird deshalb nicht hier, sondern read-only
-- gegen die echten Objekte nach einem etwaigen Push verifiziert, analog zu den bisherigen
-- Buchungshärtungs-Migrationen.

begin;

select plan(12);

-- 1) material_areas: genau 4 Zeilen mit den vier spezifizierten Keys.
select is(
    (select count(*)::int from public.material_areas),
    4,
    'material_areas hat genau 4 Zeilen'
);

select is(
    (select array_agg(key order by key) from public.material_areas),
    array['bms', 'kurzgymi', 'langzeitgymi', 'matura'],
    'material_areas enthaelt exakt die vier spezifizierten Keys'
);

-- 2) area_id ist nutzbar: akzeptiert einen gültigen material_areas-Verweis und bleibt NULL-fähig
--    (für needs_review-Zeilen wie die echte id=10). Eigene Fixture-Kurszeile als FK-Ziel für
--    intensivwoche-fremde Testdaten ist hier nicht nötig; learning_materials braucht keinen Kurs.
with fixture_area as (
    select id from public.material_areas where key = 'langzeitgymi'
),
ins_zugeordnet as (
    insert into public.learning_materials (name, area_id)
    select 'pgTAP Fixture: zugeordnetes Material', fixture_area.id from fixture_area
    returning id, area_id
),
ins_unzugeordnet as (
    insert into public.learning_materials (name, area_id)
    values ('pgTAP Fixture: needs_review Material', null)
    returning id, area_id
)
select
    set_config('pgtap.material_zugeordnet_area', (select area_id::text from ins_zugeordnet), true),
    set_config('pgtap.material_unzugeordnet_area', coalesce((select area_id::text from ins_unzugeordnet), '<null>'), true)
from ins_zugeordnet, ins_unzugeordnet;

select is(
    current_setting('pgtap.material_zugeordnet_area'),
    (select id::text from public.material_areas where key = 'langzeitgymi'),
    'learning_materials.area_id akzeptiert einen gültigen material_areas-Verweis'
);

select is(
    current_setting('pgtap.material_unzugeordnet_area'),
    '<null>',
    'learning_materials.area_id bleibt NULL-fähig für needs_review-Zeilen'
);

-- 3) RLS aktiv auf beiden neuen Tabellen.
select ok(
    (select relrowsecurity from pg_class where oid = 'public.self_study_enrollments'::regclass),
    'RLS ist auf self_study_enrollments aktiviert'
);

select ok(
    (select relrowsecurity from pg_class where oid = 'public.material_access_grants'::regclass),
    'RLS ist auf material_access_grants aktiviert'
);

-- 4) Keine INSERT/UPDATE/DELETE-Rechte fuer anon/authenticated auf den neuen Tabellen -- Erzeugung
--    ist bewusst ein spaeterer Flow.
select ok(
    not exists (
        select 1 from unnest(array['INSERT', 'UPDATE', 'DELETE']) priv
        where has_table_privilege('anon', 'public.material_areas', priv)
           or has_table_privilege('authenticated', 'public.material_areas', priv)
    ),
    'anon/authenticated haben keine INSERT/UPDATE/DELETE-Rechte auf material_areas'
);

select ok(
    not exists (
        select 1 from unnest(array['INSERT', 'UPDATE', 'DELETE']) priv
        where has_table_privilege('anon', 'public.self_study_enrollments', priv)
           or has_table_privilege('authenticated', 'public.self_study_enrollments', priv)
    ),
    'anon/authenticated haben keine INSERT/UPDATE/DELETE-Rechte auf self_study_enrollments'
);

select ok(
    not exists (
        select 1 from unnest(array['INSERT', 'UPDATE', 'DELETE']) priv
        where has_table_privilege('anon', 'public.material_access_grants', priv)
           or has_table_privilege('authenticated', 'public.material_access_grants', priv)
    ),
    'anon/authenticated haben keine INSERT/UPDATE/DELETE-Rechte auf material_access_grants'
);

-- 5) Regression: die fehlerhafte qual=true-Policy ist weg, keine Ersatzpolicy erlaubt pauschal
--    jede Zeile.
select ok(
    not exists (
        select 1 from pg_policies
         where schemaname = 'public'
           and tablename = 'learning_materials'
           and policyname = 'learning_materials_public_read'
    ),
    'die fehlerhafte Policy learning_materials_public_read (qual=true) existiert nicht mehr'
);

select ok(
    not exists (
        select 1 from pg_policies
         where schemaname = 'public'
           and tablename = 'learning_materials'
           and cmd = 'SELECT'
           and roles::text[] && array['anon', 'authenticated']
           and trim(qual) = 'true'
    ),
    'keine SELECT-Policy fuer anon/authenticated auf learning_materials hat qual=true'
);

-- 6) Die neue Policy existiert und referenziert is_public, den Grant-Mechanismus.
select ok(
    exists (
        select 1 from pg_policies
         where schemaname = 'public'
           and tablename = 'learning_materials'
           and policyname = 'learning_materials_read_public_own_or_granted'
           and qual like '%is_public%'
           and qual like '%material_access_grants%'
    ),
    'die neue learning_materials-Policy prueft is_public UND material_access_grants'
);

select * from finish();

rollback;
