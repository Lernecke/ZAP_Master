-- admin_save_rate_agreement() (Migration 20260721092720). Gleicher Teststil wie 0010/0012/0014.

begin;

select plan(2);

select throws_ok(
    $$select public.admin_save_rate_agreement(gen_random_uuid(), 8000, '2029-01-01')$$,
    'admin_required',
    'admin_save_rate_agreement lehnt Aufrufe ohne is_admin() ab'
);

select ok(
    (select security_type from information_schema.routines
      where routine_schema = 'public' and routine_name = 'admin_save_rate_agreement') = 'INVOKER',
    'admin_save_rate_agreement ist SECURITY INVOKER (RLS bleibt einzige Autorisierungsquelle)'
);

select * from finish();

rollback;
