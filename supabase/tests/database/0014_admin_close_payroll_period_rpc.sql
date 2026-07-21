-- admin_close_payroll_period() (Migration 20260721091511). Gleicher Teststil wie 0010/0012:
-- pgTAP hat keinen echten Admin-JWT-Kontext, is_admin() liefert also immer false -- der erwartete
-- admin_required-Fehler bei jedem Aufruf beweist bereits, dass die Rollenpruefung vor jeder
-- Mutation greift.

begin;

select plan(2);

select throws_ok(
    $$select public.admin_close_payroll_period(2029, 5)$$,
    'admin_required',
    'admin_close_payroll_period lehnt Aufrufe ohne is_admin() ab'
);

select ok(
    (select security_type from information_schema.routines
      where routine_schema = 'public' and routine_name = 'admin_close_payroll_period') = 'INVOKER',
    'admin_close_payroll_period ist SECURITY INVOKER (RLS bleibt einzige Autorisierungsquelle)'
);

select * from finish();

rollback;
