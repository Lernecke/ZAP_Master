-- Test course fulfillment, material access provisioning, payment failure/refund revocation,
-- and family RLS policies introduced in migrations 20260929080000 and 20261004135800.
begin;

select plan(9);

-- 1) Verify RLS policies exist on intensivwoche_anmeldungen and material_access_grants
select results_eq(
  $$ select count(*)::int from pg_policies
      where schemaname = 'public'
        and tablename = 'intensivwoche_anmeldungen'
        and policyname = 'anmeldungen_user_select_own_or_family' $$,
  ARRAY[1],
  'Policy anmeldungen_user_select_own_or_family exists on intensivwoche_anmeldungen'
);

select results_eq(
  $$ select count(*)::int from pg_policies
      where schemaname = 'public'
        and tablename = 'material_access_grants'
        and policyname = 'material_access_grants_select_own_family_or_admin' $$,
  ARRAY[1],
  'Policy material_access_grants_select_own_family_or_admin exists on material_access_grants'
);

-- 2) Setup parent + child users, course (6. Klasse -> langzeitgymi), enrollment, and payment
insert into public."user" (id, name, email, account_type)
values ('pgtap-parent-25', 'Parent 25', 'parent25@example.com', 'parent_solo');

insert into public."user" (id, name, email, account_type, parent_id)
values ('pgtap-child-25', 'Child 25', 'child25@example.com', 'child', 'pgtap-parent-25');

with ins_kurs as (
  insert into public.intensivwoche_kurse (
    name, fach, beschreibung, start_datum, end_datum, uhrzeit, ort,
    preis, max_teilnehmer, klassenstufen, lehrer, ist_aktiv
  ) values (
    'pgTAP Fulfillment Kurs 6. Klasse', 'mathematik', 'Fulfillment Test',
    '2026-10-05', '2026-10-09', '09:00-12:00', 'Zürich HB',
    650.00, 12, ARRAY['6. Klasse']::text[], 'Test Lehrer', true
  )
  returning id
),
ins_anm as (
  insert into public.intensivwoche_anmeldungen (
    kurs_id, child_firstname, child_lastname, child_class_level, child_gender,
    parent_email, parent_phone, status
  )
  select id, 'Child', 'TwentyFive', '6. Klasse', 'w', 'parent25@example.com', '+41791234567', 'eingegangen'
  from ins_kurs
  returning id
),
ins_pay as (
  insert into public.payments (
    anmeldung_id, user_id, stripe_checkout_session_id, amount_rappen, currency, status, payment_method_types
  )
  select id, 'pgtap-parent-25', 'cs_test_fulfill_0025', 65000, 'chf', 'pending', ARRAY['card']::text[]
  from ins_anm
  returning id, anmeldung_id
)
select
  set_config('pgtap.pay_25', id::text, true),
  set_config('pgtap.anm_25', anmeldung_id::text, true)
from ins_pay;

-- 3) Execute process_stripe_payment_update with status = 'succeeded' and beneficiary_user_id
select public.process_stripe_payment_update(
  'cs_test_fulfill_0025',
  'pi_test_fulfill_0025',
  'succeeded',
  '{"beneficiary_user_id": "pgtap-child-25"}'::jsonb
);

select is(
  (select status from public.intensivwoche_anmeldungen where id = current_setting('pgtap.anm_25')::uuid),
  'confirmed',
  'process_stripe_payment_update(succeeded) transitions enrollment status to confirmed'
);

select is(
  (select beneficiary_user_id from public.intensivwoche_anmeldungen where id = current_setting('pgtap.anm_25')::uuid),
  'pgtap-child-25',
  'process_stripe_payment_update(succeeded) binds beneficiary_user_id on enrollment'
);

select is(
  (select status from public.material_access_grants
    where source_kind = 'course_booking'
      and source_id = current_setting('pgtap.anm_25')::uuid
      and user_id = 'pgtap-child-25'),
  'active',
  'process_stripe_payment_update(succeeded) provisions an active course_booking material grant for the child'
);

-- 4) Execute process_stripe_payment_update with status = 'failed'
select public.process_stripe_payment_update(
  'cs_test_fulfill_0025',
  'pi_test_fulfill_0025',
  'failed',
  '{"last_payment_error": "declined"}'::jsonb
);

select is(
  (select status from public.intensivwoche_anmeldungen where id = current_setting('pgtap.anm_25')::uuid),
  'payment_failed',
  'process_stripe_payment_update(failed) sets enrollment status to payment_failed'
);

select is(
  (select status from public.material_access_grants
    where source_kind = 'course_booking'
      and source_id = current_setting('pgtap.anm_25')::uuid
      and user_id = 'pgtap-child-25'),
  'revoked',
  'process_stripe_payment_update(failed) revokes the course_booking material grant'
);

-- 5) Re-succeed and then refund to verify 'refunded' -> 'payment_outstanding' + grant revocation
update public.material_access_grants
   set status = 'active', revoked_at = null
 where source_kind = 'course_booking'
   and source_id = current_setting('pgtap.anm_25')::uuid;

select public.process_stripe_payment_update(
  'cs_test_fulfill_0025',
  'pi_test_fulfill_0025',
  'refunded',
  '{"amount_refunded": 65000}'::jsonb
);

select is(
  (select status from public.intensivwoche_anmeldungen where id = current_setting('pgtap.anm_25')::uuid),
  'payment_outstanding',
  'process_stripe_payment_update(refunded) sets enrollment status to payment_outstanding'
);

select is(
  (select status from public.material_access_grants
    where source_kind = 'course_booking'
      and source_id = current_setting('pgtap.anm_25')::uuid
      and user_id = 'pgtap-child-25'),
  'revoked',
  'process_stripe_payment_update(refunded) revokes the active course_booking material grant'
);

select * from finish();

rollback;
