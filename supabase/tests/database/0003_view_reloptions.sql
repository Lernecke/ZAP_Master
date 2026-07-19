-- View-reloptions werden von manchen Schema-Diff-Werkzeugen nicht zuverlässig verglichen
-- (step0Baseline.revision2.md, Abschnitt 10: "bekannte Tool-Lücken ... View-Optionen"). Die
-- einzige public-View der Baseline ist bewusst mit security_invoker = true angelegt (Baseline-SQL,
-- supabase/migrations/*_live_schema_baseline.sql), damit sie mit den RLS-Rechten des aufrufenden
-- Nutzers statt des View-Owners ausgewertet wird. Dieser Test macht die reloption explizit
-- katalogfest, statt sich auf den generischen Diff zu verlassen.

begin;

select plan(2);

select has_view(
    'public', 'intensivwoche_kurse_mit_anmeldungen',
    'View intensivwoche_kurse_mit_anmeldungen existiert im public-Schema'
);

select ok(
    (select 'security_invoker=true' = any(c.reloptions)
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'intensivwoche_kurse_mit_anmeldungen'),
    'intensivwoche_kurse_mit_anmeldungen hat security_invoker = true'
);

select * from finish();

rollback;
