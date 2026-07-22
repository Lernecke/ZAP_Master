-- Abschnitt 10.4 (E-Mail-Outbox): prueft den Enqueue-Trigger, die Idempotenz ueber den
-- Unique-Index sowie die Admin-only-RLS auf mail_outbox.

begin;

select plan(7);

with ins_kurs as (
    insert into public.intensivwoche_kurse (
        name, fach, beschreibung, start_datum, end_datum, uhrzeit, ort, preis, max_teilnehmer, lehrer, ist_aktiv
    ) values (
        'pgTAP Mail-Outbox-Testkurs', 'mathematik', 'Testbeschreibung',
        '2026-09-01', '2026-09-05', '09:00-12:00', 'Testort', 100.00, 10, 'Test Lehrer', true
    )
    returning id
)
select set_config('pgtap.mail_kurs_id', id::text, true) from ins_kurs;

-- 1) Ein direkter INSERT in intensivwoche_anmeldungen (pgTAP laeuft privilegiert, RLS greift hier
--    nicht ein) muss automatisch genau eine mail_outbox-Zeile erzeugen.
with ins_anmeldung as (
    insert into public.intensivwoche_anmeldungen (
        kurs_id, child_firstname, child_lastname, child_class_level, child_gender,
        parent_email, parent_phone
    ) values (
        current_setting('pgtap.mail_kurs_id')::bigint, 'Anna', 'Test', '6. Klasse', 'w',
        'anna@example.com', '0791112233'
    )
    returning id
)
select set_config('pgtap.mail_anmeldung_id', id::text, true) from ins_anmeldung;

select is(
    (select count(*)::int from public.mail_outbox
      where anmeldung_id = current_setting('pgtap.mail_anmeldung_id')::uuid),
    1,
    'Trigger erzeugt automatisch genau eine mail_outbox-Zeile pro neuer Anmeldung'
);

select is(
    (select status from public.mail_outbox
      where anmeldung_id = current_setting('pgtap.mail_anmeldung_id')::uuid),
    'pending',
    'neue mail_outbox-Zeile startet mit status=pending'
);

select is(
    (select template_key from public.mail_outbox
      where anmeldung_id = current_setting('pgtap.mail_anmeldung_id')::uuid),
    'booking_confirmation',
    'template_key ist booking_confirmation'
);

-- 2) Idempotenz: ein zweiter Enqueue-Versuch fuer dieselbe Anmeldung/denselben Template-Key darf
--    keine zweite Zeile erzeugen (ON CONFLICT DO NOTHING via Unique-Index).
select throws_ok(
    format(
        $$insert into public.mail_outbox (anmeldung_id, template_key) values (%L, 'booking_confirmation')$$,
        current_setting('pgtap.mail_anmeldung_id')
    ),
    23505,
    null,
    'ein direkter Duplikat-INSERT (ohne ON CONFLICT) verletzt den Unique-Index -- beweist, dass der Trigger sich auf denselben Schutz verlassen kann'
);

select is(
    (select count(*)::int from public.mail_outbox
      where anmeldung_id = current_setting('pgtap.mail_anmeldung_id')::uuid),
    1,
    'nach dem fehlgeschlagenen Duplikat-Versuch existiert weiterhin nur eine Zeile'
);

-- 3) RLS: ein authentifizierter Nutzer OHNE Admin-Rolle darf keine mail_outbox-Zeilen lesen
--    (dauerhafte Zustellfehler sind ausdruecklich nur im Admin sichtbar, Abschnitt 10.4).
set local role authenticated;
select set_config(
    'pgtap.mail_outbox_authenticated_count',
    (select count(*)::text from public.mail_outbox
      where anmeldung_id = current_setting('pgtap.mail_anmeldung_id')::uuid),
    true
);
reset role;

select is(
    current_setting('pgtap.mail_outbox_authenticated_count'),
    '0',
    'authenticated ohne Admin-Rolle sieht keine mail_outbox-Zeilen (is_admin()=false in diesem Kontext)'
);

-- 4) Policy-Definition direkt pruefen (ergaenzt den Live-RLS-Test um eine katalogfeste Kontrolle,
--    analog zum bereits etablierten Muster in anderen Tests dieser Suite).
select ok(
    exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'mail_outbox'
          and policyname = 'mail_outbox_admin_select'
          and cmd = 'SELECT'
          and qual like '%is_admin%'
    ),
    'mail_outbox_admin_select ist eine SELECT-Policy, die is_admin() verwendet'
);

select * from finish();

rollback;
