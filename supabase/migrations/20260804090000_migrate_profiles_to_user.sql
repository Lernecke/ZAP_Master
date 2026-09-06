-- Migration: 20260804090000_migrate_profiles_to_user.sql
-- Consolidate profiles table into Better Auth "user" table

-- 1. Extend "user" table with profile attributes
ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS school_name TEXT,
  ADD COLUMN IF NOT EXISTS class_level TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(10) DEFAULT 'light';

-- Add check constraints if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_gender_check'
  ) THEN
    ALTER TABLE public."user" ADD CONSTRAINT user_gender_check
      CHECK (gender IS NULL OR gender = ANY (ARRAY['male', 'female', 'other', 'prefer_not_to_say']));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_theme_preference_check'
  ) THEN
    ALTER TABLE public."user" ADD CONSTRAINT user_theme_preference_check
      CHECK (theme_preference IS NULL OR (theme_preference)::text = ANY (ARRAY['light', 'dark', 'system']));
  END IF;
END $$;

-- 2. Update functions that referenced public.profiles
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public."user"
    WHERE id = auth.uid()::text AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_content_manager() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public."user"
    WHERE id = auth.uid()::text AND role IN ('lehrperson', 'admin')
  );
END;
$$;

-- 3. Remove trigger sync to profiles
DROP TRIGGER IF EXISTS trg_sync_better_auth_user_to_profile ON public."user";
DROP FUNCTION IF EXISTS sync_better_auth_user_to_profile();
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 4. Drop RLS policies that depend on columns being altered
DROP POLICY IF EXISTS chat_insert_involved ON public.chat_messages;
DROP POLICY IF EXISTS chat_select_involved ON public.chat_messages;
DROP POLICY IF EXISTS chat_update_read ON public.chat_messages;

DROP POLICY IF EXISTS listings_delete_own ON public.mentorship_listings;
DROP POLICY IF EXISTS listings_insert_own ON public.mentorship_listings;
DROP POLICY IF EXISTS listings_select_public_or_own ON public.mentorship_listings;
DROP POLICY IF EXISTS listings_update_own ON public.mentorship_listings;

DROP POLICY IF EXISTS materials_insert_student ON public.mentorship_materials;
DROP POLICY IF EXISTS materials_select_involved ON public.mentorship_materials;
DROP POLICY IF EXISTS materials_update_involved ON public.mentorship_materials;

DROP POLICY IF EXISTS mentor_skills_delete_own ON public.mentor_skills;
DROP POLICY IF EXISTS mentor_skills_insert_own ON public.mentor_skills;
DROP POLICY IF EXISTS mentor_skills_select_all ON public.mentor_skills;
DROP POLICY IF EXISTS mentor_skills_update_own ON public.mentor_skills;

DROP POLICY IF EXISTS relations_insert_involved ON public.mentorship_relations;
DROP POLICY IF EXISTS relations_select_involved ON public.mentorship_relations;
DROP POLICY IF EXISTS relations_update_involved ON public.mentorship_relations;

DROP POLICY IF EXISTS requests_insert_as_requester ON public.mentorship_requests;
DROP POLICY IF EXISTS requests_select_involved ON public.mentorship_requests;
DROP POLICY IF EXISTS requests_update_involved ON public.mentorship_requests;

DROP POLICY IF EXISTS students_delete_draft_essays ON public.student_essays;
DROP POLICY IF EXISTS students_insert_own_essays ON public.student_essays;
DROP POLICY IF EXISTS students_select_own_essays ON public.student_essays;
DROP POLICY IF EXISTS students_update_draft_essays ON public.student_essays;
DROP POLICY IF EXISTS teachers_update_grading_only ON public.student_essays;
DROP POLICY IF EXISTS trainers_review_essays ON public.student_essays;
DROP POLICY IF EXISTS trainers_view_submitted_essays ON public.student_essays;

DROP POLICY IF EXISTS teachers_delete_rubrics ON public.correction_rubrics;
DROP POLICY IF EXISTS teachers_insert_rubrics ON public.correction_rubrics;
DROP POLICY IF EXISTS teachers_read_rubrics ON public.correction_rubrics;
DROP POLICY IF EXISTS teachers_update_rubrics ON public.correction_rubrics;

DROP POLICY IF EXISTS students_read_released_corrections ON public.essay_ai_corrections;
DROP POLICY IF EXISTS teachers_delete_ai_corrections ON public.essay_ai_corrections;
DROP POLICY IF EXISTS teachers_insert_ai_corrections ON public.essay_ai_corrections;
DROP POLICY IF EXISTS teachers_read_ai_corrections ON public.essay_ai_corrections;
DROP POLICY IF EXISTS teachers_update_ai_corrections ON public.essay_ai_corrections;

-- 5. Drop old foreign keys pointing to profiles
ALTER TABLE IF EXISTS public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE IF EXISTS public.correction_rubrics DROP CONSTRAINT IF EXISTS correction_rubrics_created_by_fkey;
ALTER TABLE IF EXISTS public.essay_ai_corrections DROP CONSTRAINT IF EXISTS essay_ai_corrections_released_by_fkey;
ALTER TABLE IF EXISTS public.mentor_skills DROP CONSTRAINT IF EXISTS mentor_skills_mentor_id_fkey;
ALTER TABLE IF EXISTS public.mentorship_listings DROP CONSTRAINT IF EXISTS mentorship_listings_author_id_fkey;
ALTER TABLE IF EXISTS public.mentorship_materials DROP CONSTRAINT IF EXISTS mentorship_materials_assigned_to_fkey;
ALTER TABLE IF EXISTS public.mentorship_materials DROP CONSTRAINT IF EXISTS mentorship_materials_uploader_id_fkey;
ALTER TABLE IF EXISTS public.mentorship_relations DROP CONSTRAINT IF EXISTS mentorship_relations_mentee_id_fkey;
ALTER TABLE IF EXISTS public.mentorship_relations DROP CONSTRAINT IF EXISTS mentorship_relations_mentor_id_fkey;
ALTER TABLE IF EXISTS public.mentorship_requests DROP CONSTRAINT IF EXISTS mentorship_requests_requester_id_fkey;
ALTER TABLE IF EXISTS public.mentorship_requests DROP CONSTRAINT IF EXISTS mentorship_requests_target_id_fkey;
ALTER TABLE IF EXISTS public.student_essays DROP CONSTRAINT IF EXISTS student_essays_reviewed_by_fkey;
ALTER TABLE IF EXISTS public.student_essays DROP CONSTRAINT IF EXISTS student_essays_student_id_fkey;

-- 6. Alter foreign key column types from UUID to TEXT (matching "user".id)
ALTER TABLE IF EXISTS public.chat_messages ALTER COLUMN sender_id TYPE TEXT USING sender_id::text;
ALTER TABLE IF EXISTS public.correction_rubrics ALTER COLUMN created_by TYPE TEXT USING created_by::text;
ALTER TABLE IF EXISTS public.essay_ai_corrections ALTER COLUMN released_by TYPE TEXT USING released_by::text;
ALTER TABLE IF EXISTS public.mentor_skills ALTER COLUMN mentor_id TYPE TEXT USING mentor_id::text;
ALTER TABLE IF EXISTS public.mentorship_listings ALTER COLUMN author_id TYPE TEXT USING author_id::text;
ALTER TABLE IF EXISTS public.mentorship_materials ALTER COLUMN assigned_to TYPE TEXT USING assigned_to::text;
ALTER TABLE IF EXISTS public.mentorship_materials ALTER COLUMN uploader_id TYPE TEXT USING uploader_id::text;
ALTER TABLE IF EXISTS public.mentorship_relations ALTER COLUMN mentee_id TYPE TEXT USING mentee_id::text;
ALTER TABLE IF EXISTS public.mentorship_relations ALTER COLUMN mentor_id TYPE TEXT USING mentor_id::text;
ALTER TABLE IF EXISTS public.mentorship_requests ALTER COLUMN requester_id TYPE TEXT USING requester_id::text;
ALTER TABLE IF EXISTS public.mentorship_requests ALTER COLUMN target_id TYPE TEXT USING target_id::text;
ALTER TABLE IF EXISTS public.student_essays ALTER COLUMN reviewed_by TYPE TEXT USING reviewed_by::text;
ALTER TABLE IF EXISTS public.student_essays ALTER COLUMN student_id TYPE TEXT USING student_id::text;

-- 7. Add new foreign key constraints referencing "user"(id)
ALTER TABLE IF EXISTS public.chat_messages
  ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.correction_rubrics
  ADD CONSTRAINT correction_rubrics_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.essay_ai_corrections
  ADD CONSTRAINT essay_ai_corrections_released_by_fkey FOREIGN KEY (released_by) REFERENCES public."user"(id);

ALTER TABLE IF EXISTS public.mentor_skills
  ADD CONSTRAINT mentor_skills_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.mentorship_listings
  ADD CONSTRAINT mentorship_listings_author_id_fkey FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.mentorship_materials
  ADD CONSTRAINT mentorship_materials_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.mentorship_materials
  ADD CONSTRAINT mentorship_materials_uploader_id_fkey FOREIGN KEY (uploader_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.mentorship_relations
  ADD CONSTRAINT mentorship_relations_mentee_id_fkey FOREIGN KEY (mentee_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.mentorship_relations
  ADD CONSTRAINT mentorship_relations_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.mentorship_requests
  ADD CONSTRAINT mentorship_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.mentorship_requests
  ADD CONSTRAINT mentorship_requests_target_id_fkey FOREIGN KEY (target_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.student_essays
  ADD CONSTRAINT student_essays_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public."user"(id);

ALTER TABLE IF EXISTS public.student_essays
  ADD CONSTRAINT student_essays_student_id_fkey FOREIGN KEY (student_id) REFERENCES public."user"(id) ON DELETE CASCADE;

-- 8. Drop profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 9. Re-create RLS Policies with "user" table references
CREATE POLICY chat_insert_involved ON public.chat_messages FOR INSERT WITH CHECK (((sender_id = auth.uid()::text) AND (EXISTS ( SELECT 1 FROM mentorship_relations mr WHERE ((mr.id = chat_messages.relation_id) AND ((mr.mentor_id = auth.uid()::text) OR (mr.mentee_id = auth.uid()::text)) AND (mr.status = 'ACTIVE'::text))))));
CREATE POLICY chat_select_involved ON public.chat_messages FOR SELECT USING ((EXISTS ( SELECT 1 FROM mentorship_relations mr WHERE ((mr.id = chat_messages.relation_id) AND ((mr.mentor_id = auth.uid()::text) OR (mr.mentee_id = auth.uid()::text))))));
CREATE POLICY chat_update_read ON public.chat_messages FOR UPDATE USING (((sender_id <> auth.uid()::text) AND (EXISTS ( SELECT 1 FROM mentorship_relations mr WHERE ((mr.id = chat_messages.relation_id) AND ((mr.mentor_id = auth.uid()::text) OR (mr.mentee_id = auth.uid()::text)))))));

CREATE POLICY listings_delete_own ON public.mentorship_listings FOR DELETE USING ((author_id = auth.uid()::text));
CREATE POLICY listings_insert_own ON public.mentorship_listings FOR INSERT WITH CHECK (((author_id = auth.uid()::text) AND (EXISTS ( SELECT 1 FROM public."user" WHERE (("user".id = auth.uid()::text) AND ("user".role = ANY (ARRAY['lehrperson'::text, 'admin'::text])))))));
CREATE POLICY listings_select_public_or_own ON public.mentorship_listings FOR SELECT USING (((status = 'ACTIVE'::text) OR (author_id = auth.uid()::text)));
CREATE POLICY listings_update_own ON public.mentorship_listings FOR UPDATE USING ((author_id = auth.uid()::text)) WITH CHECK ((author_id = auth.uid()::text));

CREATE POLICY materials_insert_student ON public.mentorship_materials FOR INSERT WITH CHECK (((uploader_id = auth.uid()::text) AND (EXISTS ( SELECT 1 FROM mentorship_relations mr WHERE ((mr.id = mentorship_materials.relation_id) AND (mr.mentee_id = auth.uid()::text) AND (mr.status = 'ACTIVE'::text))))));
CREATE POLICY materials_select_involved ON public.mentorship_materials FOR SELECT USING (((uploader_id = auth.uid()::text) OR (assigned_to = auth.uid()::text)));
CREATE POLICY materials_update_involved ON public.mentorship_materials FOR UPDATE USING (((uploader_id = auth.uid()::text) OR (assigned_to = auth.uid()::text)));

CREATE POLICY mentor_skills_delete_own ON public.mentor_skills FOR DELETE USING ((mentor_id = auth.uid()::text));
CREATE POLICY mentor_skills_insert_own ON public.mentor_skills FOR INSERT WITH CHECK (((mentor_id = auth.uid()::text) AND (EXISTS ( SELECT 1 FROM public."user" WHERE (("user".id = auth.uid()::text) AND ("user".role = ANY (ARRAY['lehrperson'::text, 'admin'::text])))))));
CREATE POLICY mentor_skills_select_all ON public.mentor_skills FOR SELECT USING (true);
CREATE POLICY mentor_skills_update_own ON public.mentor_skills FOR UPDATE USING ((mentor_id = auth.uid()::text)) WITH CHECK ((mentor_id = auth.uid()::text));

CREATE POLICY relations_insert_involved ON public.mentorship_relations FOR INSERT WITH CHECK (((mentor_id = auth.uid()::text) OR (mentee_id = auth.uid()::text)));
CREATE POLICY relations_select_involved ON public.mentorship_relations FOR SELECT USING (((mentor_id = auth.uid()::text) OR (mentee_id = auth.uid()::text)));
CREATE POLICY relations_update_involved ON public.mentorship_relations FOR UPDATE USING (((mentor_id = auth.uid()::text) OR (mentee_id = auth.uid()::text)));

CREATE POLICY requests_insert_as_requester ON public.mentorship_requests FOR INSERT WITH CHECK (((requester_id = auth.uid()::text) AND (requester_id <> target_id)));
CREATE POLICY requests_select_involved ON public.mentorship_requests FOR SELECT USING (((requester_id = auth.uid()::text) OR (target_id = auth.uid()::text)));
CREATE POLICY requests_update_involved ON public.mentorship_requests FOR UPDATE USING (((requester_id = auth.uid()::text) OR (target_id = auth.uid()::text)));

CREATE POLICY students_delete_draft_essays ON public.student_essays FOR DELETE TO authenticated USING (((student_id = auth.uid()::text) AND (status = 'draft'::text)));
CREATE POLICY students_insert_own_essays ON public.student_essays FOR INSERT TO authenticated WITH CHECK ((student_id = auth.uid()::text));
CREATE POLICY students_select_own_essays ON public.student_essays FOR SELECT TO authenticated USING ((student_id = auth.uid()::text));
CREATE POLICY students_update_draft_essays ON public.student_essays FOR UPDATE TO authenticated USING (((student_id = auth.uid()::text) AND (status = 'draft'::text))) WITH CHECK ((student_id = auth.uid()::text));
CREATE POLICY teachers_update_grading_only ON public.student_essays FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM public."user" WHERE (("user".id = auth.uid()::text) AND ("user".role = ANY (ARRAY['lehrperson'::text, 'admin'::text]))))));
CREATE POLICY trainers_review_essays ON public.student_essays FOR UPDATE TO authenticated USING (((status = ANY (ARRAY['submitted'::text, 'in_korrektur'::text])) AND (EXISTS ( SELECT 1 FROM public."user" WHERE (("user".id = auth.uid()::text) AND ("user".role = ANY (ARRAY['lehrperson'::text, 'admin'::text])))))));
CREATE POLICY trainers_view_submitted_essays ON public.student_essays FOR SELECT TO authenticated USING (((status <> 'draft'::text) AND (EXISTS ( SELECT 1 FROM public."user" WHERE (("user".id = auth.uid()::text) AND ("user".role = ANY (ARRAY['lehrperson'::text, 'admin'::text])))))));

CREATE POLICY teachers_delete_rubrics ON public.correction_rubrics FOR DELETE TO authenticated USING (((created_by = auth.uid()::text) AND (EXISTS ( SELECT 1 FROM public."user" WHERE (("user".id = auth.uid()::text) AND ("user".role = ANY (ARRAY['lehrperson'::text, 'admin'::text])))))));
CREATE POLICY teachers_insert_rubrics ON public.correction_rubrics FOR INSERT TO authenticated WITH CHECK (((created_by = auth.uid()::text) AND (EXISTS ( SELECT 1 FROM public."user" WHERE (("user".id = auth.uid()::text) AND ("user".role = ANY (ARRAY['lehrperson'::text, 'admin'::text])))))));
CREATE POLICY teachers_read_rubrics ON public.correction_rubrics FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM public."user" WHERE (("user".id = auth.uid()::text) AND ("user".role = ANY (ARRAY['lehrperson'::text, 'admin'::text]))))));
CREATE POLICY teachers_update_rubrics ON public.correction_rubrics FOR UPDATE TO authenticated USING (((created_by = auth.uid()::text) AND (EXISTS ( SELECT 1 FROM public."user" WHERE (("user".id = auth.uid()::text) AND ("user".role = ANY (ARRAY['lehrperson'::text, 'admin'::text])))))));

CREATE POLICY students_read_released_corrections ON public.essay_ai_corrections FOR SELECT TO authenticated USING (((status = 'released'::text) AND (EXISTS ( SELECT 1 FROM student_essays se WHERE ((se.id = essay_ai_corrections.essay_id) AND (se.student_id = auth.uid()::text))))));
CREATE POLICY teachers_delete_ai_corrections ON public.essay_ai_corrections FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM public."user" WHERE (("user".id = auth.uid()::text) AND ("user".role = ANY (ARRAY['lehrperson'::text, 'admin'::text]))))));
CREATE POLICY teachers_insert_ai_corrections ON public.essay_ai_corrections FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM public."user" WHERE (("user".id = auth.uid()::text) AND ("user".role = ANY (ARRAY['lehrperson'::text, 'admin'::text]))))));
CREATE POLICY teachers_read_ai_corrections ON public.essay_ai_corrections FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM public."user" WHERE (("user".id = auth.uid()::text) AND ("user".role = ANY (ARRAY['lehrperson'::text, 'admin'::text]))))));
CREATE POLICY teachers_update_ai_corrections ON public.essay_ai_corrections FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM public."user" WHERE (("user".id = auth.uid()::text) AND ("user".role = ANY (ARRAY['lehrperson'::text, 'admin'::text]))))));

-- 10. Add update RLS policy for "user" table so authenticated users can update their profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user' AND policyname = 'better_auth_user_update_self'
  ) THEN
    CREATE POLICY better_auth_user_update_self ON public."user"
      FOR UPDATE TO authenticated
      USING (id = auth.uid()::text OR public.is_admin());
  END IF;
END $$;
