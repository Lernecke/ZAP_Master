-- Test payments schema and process_stripe_payment_update function
begin;

select plan(5);

-- 1) Verify payments table exists
select has_table('public', 'payments', 'payments table exists');

-- 2) Verify columns in payments table
select has_column('public', 'payments', 'stripe_checkout_session_id', 'payments has stripe_checkout_session_id column');
select has_column('public', 'payments', 'status', 'payments has status column');

-- 3) Test payments insertion & process_stripe_payment_update RPC
with ins_kurs as (
    insert into public.intensivwoche_kurse (
        name, fach, beschreibung, start_datum, end_datum, uhrzeit, ort, preis, max_teilnehmer, lehrer, ist_aktiv
    ) values (
        'pgTAP Payment-Testkurs', 'mathematik', 'Testbeschreibung',
        '2026-09-01', '2026-09-05', '09:00-12:00', 'Testort', 150.00, 10, 'Test Lehrer', true
    )
    returning id
),
ins_anmeldung as (
    insert into public.intensivwoche_anmeldungen (
        kurs_id, child_firstname, child_lastname, child_class_level, child_gender,
        parent_email, parent_phone, status
    ) select 
        id, 'Zoe', 'Test', '6. Klasse', 'w', 'zoe@example.com', '0791112233', 'pending'
    from ins_kurs
    returning id
),
ins_payment as (
    insert into public.payments (
        anmeldung_id, stripe_checkout_session_id, amount_rappen, currency, status, payment_method_types
    ) select 
        id, 'cs_test_123456789', 15000, 'chf', 'pending', ARRAY['card', 'twint']::text[]
    from ins_anmeldung
    returning id, anmeldung_id
)
select 
    set_config('pgtap.test_payment_id', id::text, true),
    set_config('pgtap.test_anmeldung_id', anmeldung_id::text, true)
from ins_payment;

select is(
    (select status from public.payments where id = current_setting('pgtap.test_payment_id')::uuid),
    'pending',
    'Payment initially starts with status=pending'
);

-- Execute process_stripe_payment_update RPC
select public.process_stripe_payment_update('cs_test_123456789', 'pi_test_987654321', 'succeeded', '{"gateway": "stripe"}'::jsonb);

select is(
    (select status from public.payments where id = current_setting('pgtap.test_payment_id')::uuid),
    'succeeded',
    'process_stripe_payment_update successfully updates payment status to succeeded'
);

select * from finish();

rollback;
