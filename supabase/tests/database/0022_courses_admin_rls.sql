-- Admin-Maske für Auffrischungs-/Intensivkurse
-- (app/(dashboard)/dashboard/kurse/auffrischungskurse). courses/course_occurrences sind ein von
-- ZAP/Gymiprüfung komplett getrennter Geschäftszweig ohne eigene Migration in diesem Projekt --
-- RLS existiert bereits seit der Live-Baseline (20260719133741_live_schema_baseline.sql). Dieser
-- Test bestätigt lediglich, dass diese bereits vorhandenen Policies das erwartete Gating haben,
-- bevor die neue Admin-Maske sich darauf verlässt.
--
-- Wie in 0009_offer_editions_admin_writes.sql: pgTAP läuft als Tabellenbesitzer und umgeht RLS,
-- daher Prüfung über pg_policies (Existenz/qual), kein Login-Test.

begin;

select plan(6);

-- INSERT/UPDATE/DELETE auf courses erlauben is_admin() (zusätzlich zu is_content_manager(), das
-- bereits vor dieser Admin-Maske existierte -- beide Policy-Sets sind ODER-verknüpft).
select ok(
    (select count(*)::int from pg_policies
      where schemaname = 'public' and tablename = 'courses'
        and cmd in ('INSERT', 'UPDATE', 'DELETE')
        and coalesce(qual, '') || coalesce(with_check, '') like '%is_admin%') = 3,
    'courses INSERT-, UPDATE- und DELETE-Policy erlauben is_admin()'
);

select ok(
    (select count(*)::int from pg_policies
      where schemaname = 'public' and tablename = 'course_occurrences'
        and cmd in ('INSERT', 'UPDATE', 'DELETE')
        and coalesce(qual, '') || coalesce(with_check, '') like '%is_admin%') = 3,
    'course_occurrences INSERT-, UPDATE- und DELETE-Policy erlauben is_admin()'
);

-- Öffentliches Lesen bleibt möglich (keine öffentliche Seite konsumiert es aktuell, aber die
-- Policy existiert bereits seit der Baseline und wird durch die neue Maske nicht verschärft).
select ok(
    exists (
        select 1 from pg_policies
         where schemaname = 'public' and tablename = 'courses' and cmd = 'SELECT'
           and 'anon' = any(roles)
    ),
    'courses bleibt öffentlich lesbar (unverändert seit der Baseline)'
);

-- FK-Verhalten: ein Kurs mit Terminen kann nicht gelöscht werden, ohne die Termine zuerst zu
-- entfernen (kein ON DELETE CASCADE) -- genau das Verhalten, auf das
-- deleteCourseAction (23503-Behandlung) sich verlässt.
with fixture_course as (
    insert into public.courses (title, description, price, location, timezone, payment_method)
    values ('pgTAP FK Test', 'Beschreibung', 50, 'FFSH Zürich, Zollstrasse 17, 8005 Zürich', 'Europe/Zurich', 'Bar vor Ort')
    returning id
), fixture_occurrence as (
    insert into public.course_occurrences (course_id, starts_at_utc, ends_at_utc)
    select id, now() + interval '1 day', now() + interval '1 day 1 hour' from fixture_course
    returning course_id
)
select set_config('pgtap.fk_course_id', (select id::text from fixture_course), true);

select throws_ok(
    format('delete from public.courses where id = %s', current_setting('pgtap.fk_course_id')),
    '23503',
    null,
    'ein Kurs mit bestehenden Terminen kann nicht gelöscht werden (FK ohne ON DELETE CASCADE)'
);

delete from public.course_occurrences where course_id = current_setting('pgtap.fk_course_id')::bigint;

select lives_ok(
    format('delete from public.courses where id = %s', current_setting('pgtap.fk_course_id')),
    'nach Entfernen aller Termine ist das Löschen des Kurses erlaubt'
);

select is(
    (select count(*)::int from public.courses where id = current_setting('pgtap.fk_course_id')::bigint),
    0,
    'Kurs ist nach dem Löschen tatsächlich weg'
);

select * from finish();

rollback;
