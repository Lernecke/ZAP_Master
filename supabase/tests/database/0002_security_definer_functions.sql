-- Prüft die neun SECURITY DEFINER-Routinen aus supabase/migrations/*_live_schema_baseline.sql
-- einzeln. Der Inventarbericht (docs/migration-evidence/2026-07-18-supabase-baseline-inventory.md,
-- Abschnitt 12 "Offene Nachweise") hält fest, dass Owner, Grants und search_path dieser neun
-- Funktionen noch eine vollständige Prüfung benötigen. Dieser Test macht die search_path-Prüfung
-- konkret und automatisiert.
--
-- Ursprünglicher Stand laut Baseline-SQL (19.07.2026): Nur `book_intensivwoche_kurs`
-- (search_path = '') und `increment_material_view_count` (search_path = 'public') setzten einen
-- expliziten search_path; die übrigen sieben nicht — ein bekanntes Postgres-Sicherheitsrisiko
-- (search_path hijacking) und laut step0Baseline.revision2.md, Abschnitt 10, ein
-- Gate-Abbruchkriterium ("unsichere search_path-Werte"). Behoben durch die additive Migration
-- `20260719145330_harden_definer_search_path_and_realtime.sql` (alle neun setzen jetzt
-- `SET search_path TO ''`) — bereits remote gepusht und verifiziert. Dieser Test ist seither grün.

begin;

select plan(18);

-- Je Funktion: (1) existiert und ist SECURITY DEFINER, (2) hat einen expliziten search_path.
select is_definer(
    'public', 'accept_mentorship_request', array['uuid']::name[],
    'accept_mentorship_request(uuid) ist SECURITY DEFINER'
);
select ok(
    (select proconfig is not null
       and exists (select 1 from unnest(proconfig) cfg where cfg like 'search_path=%')
       from pg_proc where oid = 'public.accept_mentorship_request(uuid)'::regprocedure),
    'accept_mentorship_request(uuid) hat expliziten search_path'
);

select is_definer(
    'public', 'book_intensivwoche_kurs',
    array['bigint', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'uuid']::name[],
    'book_intensivwoche_kurs(...) ist SECURITY DEFINER'
);
select ok(
    (select proconfig is not null
       and exists (select 1 from unnest(proconfig) cfg where cfg like 'search_path=%')
       from pg_proc
      where oid = 'public.book_intensivwoche_kurs(bigint, text, text, text, text, text, text, text, uuid)'::regprocedure),
    'book_intensivwoche_kurs(...) hat expliziten search_path'
);

select is_definer(
    'public', 'handle_new_user',
    'handle_new_user() ist SECURITY DEFINER'
);
select ok(
    (select proconfig is not null
       and exists (select 1 from unnest(proconfig) cfg where cfg like 'search_path=%')
       from pg_proc where oid = 'public.handle_new_user()'::regprocedure),
    'handle_new_user() hat expliziten search_path'
);

select is_definer(
    'public', 'increment_material_view_count', array['integer']::name[],
    'increment_material_view_count(integer) ist SECURITY DEFINER'
);
select ok(
    (select proconfig is not null
       and exists (select 1 from unnest(proconfig) cfg where cfg like 'search_path=%')
       from pg_proc where oid = 'public.increment_material_view_count(integer)'::regprocedure),
    'increment_material_view_count(integer) hat expliziten search_path'
);

select is_definer(
    'public', 'is_admin',
    'is_admin() ist SECURITY DEFINER'
);
select ok(
    (select proconfig is not null
       and exists (select 1 from unnest(proconfig) cfg where cfg like 'search_path=%')
       from pg_proc where oid = 'public.is_admin()'::regprocedure),
    'is_admin() hat expliziten search_path'
);

select is_definer(
    'public', 'is_content_manager',
    'is_content_manager() ist SECURITY DEFINER'
);
select ok(
    (select proconfig is not null
       and exists (select 1 from unnest(proconfig) cfg where cfg like 'search_path=%')
       from pg_proc where oid = 'public.is_content_manager()'::regprocedure),
    'is_content_manager() hat expliziten search_path'
);

select is_definer(
    'public', 'is_kurs_aktiv', array['bigint']::name[],
    'is_kurs_aktiv(bigint) ist SECURITY DEFINER'
);
select ok(
    (select proconfig is not null
       and exists (select 1 from unnest(proconfig) cfg where cfg like 'search_path=%')
       from pg_proc where oid = 'public.is_kurs_aktiv(bigint)'::regprocedure),
    'is_kurs_aktiv(bigint) hat expliziten search_path'
);

select is_definer(
    'public', 'is_kurs_owner', array['uuid']::name[],
    'is_kurs_owner(uuid) ist SECURITY DEFINER'
);
select ok(
    (select proconfig is not null
       and exists (select 1 from unnest(proconfig) cfg where cfg like 'search_path=%')
       from pg_proc where oid = 'public.is_kurs_owner(uuid)'::regprocedure),
    'is_kurs_owner(uuid) hat expliziten search_path'
);

select is_definer(
    'public', 'is_owner', array['uuid']::name[],
    'is_owner(uuid) ist SECURITY DEFINER'
);
select ok(
    (select proconfig is not null
       and exists (select 1 from unnest(proconfig) cfg where cfg like 'search_path=%')
       from pg_proc where oid = 'public.is_owner(uuid)'::regprocedure),
    'is_owner(uuid) hat expliziten search_path'
);

select * from finish();

rollback;
