-- Finanz-Cockpit-Schema (Schritt 10d, Migration 20260721095032_financial_cockpit_schema.sql).
-- Prueft: automatische Ledger-Synchronisation (Buchung/Zahlung/Storno/Ausgabe/Anpassung),
-- Idempotenz bei wiederholten Uebergaengen, und RLS/Grants (anon/authenticated ohne Admin-Rolle
-- haben ueberhaupt keinen Zugriff; niemand -- auch kein Admin -- hat UPDATE/DELETE, der Ledger
-- bleibt append-only).

begin;

select plan(10);

with fixture_kurs as (
    insert into public.intensivwoche_kurse (
        name, fach, beschreibung, start_datum, end_datum, uhrzeit, ort, preis, max_teilnehmer, lehrer, ist_aktiv
    ) values (
        'pgTAP Testkurs Finanzen', 'mathematik', 'Testbeschreibung', '2029-05-07', '2029-05-11',
        '09:00-12:00', 'Zürich HB', 1195.00, 10, 'Test Lehrer', false
    )
    returning id
)
select set_config('pgtap.kurs_id', (select id::text from fixture_kurs), true);

-- 1) Buchung: INSERT auf intensivwoche_anmeldungen erzeugt automatisch ein booking-Event.
with fixture_anmeldung as (
    insert into public.intensivwoche_anmeldungen (
        kurs_id, child_firstname, child_lastname, child_class_level, child_gender,
        parent_email, parent_phone, booked_price_rappen, currency
    ) values (
        current_setting('pgtap.kurs_id')::bigint, 'Kind', 'Test', '6. Klasse', 'w',
        'finanz-test@example.com', '0791234567', 119500, 'CHF'
    )
    returning id
)
select set_config('pgtap.anmeldung_id', (select id::text from fixture_anmeldung), true);

select ok(
    exists (
        select 1 from public.financial_events
         where source_kind = 'anmeldung' and source_id = current_setting('pgtap.anmeldung_id')
           and event_type = 'booking' and amount_rappen = 119500
    ),
    'INSERT auf intensivwoche_anmeldungen erzeugt automatisch ein booking-financial_event'
);

-- 2) Zahlung: paid_at NULL -> gesetzt erzeugt ein payment-Event; ein zweites Setzen (schon gesetzt)
--    erzeugt kein zweites.
update public.intensivwoche_anmeldungen set paid_at = now() where id = current_setting('pgtap.anmeldung_id')::uuid;

select ok(
    exists (
        select 1 from public.financial_events
         where source_kind = 'anmeldung' and source_id = current_setting('pgtap.anmeldung_id')
           and event_type = 'payment' and amount_rappen = 119500
    ),
    'erste paid_at-Setzung erzeugt ein payment-financial_event'
);

update public.intensivwoche_anmeldungen set notes = 'erneutes Update, paid_at bleibt gesetzt' where id = current_setting('pgtap.anmeldung_id')::uuid;

select is(
    (select count(*)::int from public.financial_events
      where source_kind = 'anmeldung' and source_id = current_setting('pgtap.anmeldung_id') and event_type = 'payment'),
    1,
    'ein weiteres Update ohne paid_at-Uebergang erzeugt kein zweites payment-Event'
);

-- 3) Storno: status -> storniert erzeugt ein refund-Event mit negativem Betrag.
update public.intensivwoche_anmeldungen set status = 'storniert' where id = current_setting('pgtap.anmeldung_id')::uuid;

select ok(
    exists (
        select 1 from public.financial_events
         where source_kind = 'anmeldung' and source_id = current_setting('pgtap.anmeldung_id')
           and event_type = 'refund' and amount_rappen = -119500
    ),
    'Storno (status -> storniert) erzeugt ein refund-financial_event mit negativem Betrag'
);

-- 4) financial_periods + expense_entries: Genehmigung erzeugt ein course_expense-Event, eine
--    spaetere Bearbeitung nach Genehmigung erzeugt keinen zweiten Ledger-Eintrag.
with fixture_period as (
    insert into public.financial_periods (year) values (2029)
    returning id
)
select set_config('pgtap.period_id', (select id::text from fixture_period), true);

with fixture_admin as (
    insert into auth.users (id) values (gen_random_uuid())
    returning id
)
select set_config('pgtap.admin_id', (select id::text from fixture_admin), true);

with fixture_expense as (
    insert into public.expense_entries (category, amount_rappen, service_date, status, created_by)
    values ('room', 50000, '2029-05-01', 'draft', current_setting('pgtap.admin_id')::uuid)
    returning id
)
select set_config('pgtap.expense_id', (select id::text from fixture_expense), true);

select is(
    (select count(*)::int from public.financial_events where source_kind = 'expense_entry' and source_id = current_setting('pgtap.expense_id')),
    0,
    'ein draft-Ausgabeeintrag erzeugt noch kein financial_event'
);

update public.expense_entries set status = 'approved' where id = current_setting('pgtap.expense_id')::uuid;

select ok(
    exists (
        select 1 from public.financial_events
         where source_kind = 'expense_entry' and source_id = current_setting('pgtap.expense_id')
           and event_type = 'course_expense' and amount_rappen = -50000
    ),
    'Genehmigung eines Ausgabeeintrags erzeugt ein course_expense-financial_event mit negativem Betrag'
);

update public.expense_entries set receipt_ref = 'Beleg-123' where id = current_setting('pgtap.expense_id')::uuid;

select is(
    (select count(*)::int from public.financial_events where source_kind = 'expense_entry' and source_id = current_setting('pgtap.expense_id')),
    1,
    'Bearbeitung nach Genehmigung erzeugt keinen zweiten Ledger-Eintrag'
);

-- 5) financial_adjustments: jede Anpassung wird gespiegelt.
with fixture_adjustment as (
    insert into public.financial_adjustments (period_id, amount_rappen, reason, created_by)
    values (current_setting('pgtap.period_id')::uuid, -1000, 'pgTAP Korrekturbuchung', current_setting('pgtap.admin_id')::uuid)
    returning id
)
select set_config('pgtap.adjustment_id', (select id::text from fixture_adjustment), true);

select ok(
    exists (
        select 1 from public.financial_events
         where source_kind = 'financial_adjustment' and source_id = current_setting('pgtap.adjustment_id')
           and event_type = 'manual_adjustment' and amount_rappen = -1000
    ),
    'financial_adjustments-Insert erzeugt ein manual_adjustment-financial_event'
);

-- 6) RLS/Grants: anon hat auf keiner der fuenf Tabellen irgendeinen Zugriff; niemand hat
--    UPDATE/DELETE auf financial_events (append-only, auch fuer authenticated/Admin).
select ok(
    not exists (
        select 1
          from unnest(array[
            'financial_events', 'expense_entries', 'financial_periods', 'budgets', 'financial_adjustments'
          ]) tbl,
               unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) priv
         where has_table_privilege('anon', 'public.' || tbl, priv)
    ),
    'anon hat auf keiner der fuenf Finanz-Tabellen irgendeinen Zugriff'
);

select ok(
    not exists (
        select 1
          from unnest(array['UPDATE', 'DELETE']) priv
         where has_table_privilege('authenticated', 'public.financial_events', priv)
    ),
    'authenticated (auch Admin) hat kein UPDATE/DELETE auf financial_events -- Ledger ist append-only'
);

select * from finish();

rollback;
