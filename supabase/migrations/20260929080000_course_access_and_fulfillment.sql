-- Migration: 20260929080000_course_access_and_fulfillment.sql
-- Description: Course purchase fulfillment, beneficiary access binding, and RLS policies for courses and materials.

-- 1. Ensure intensivwoche_anmeldungen allows 'confirmed' status
ALTER TABLE public.intensivwoche_anmeldungen
  DROP CONSTRAINT IF EXISTS intensivwoche_anmeldungen_status_check;

ALTER TABLE public.intensivwoche_anmeldungen
  ADD CONSTRAINT intensivwoche_anmeldungen_status_check
  CHECK (status = ANY (ARRAY['eingegangen'::text, 'bestaetigt'::text, 'bezahlt'::text, 'storniert'::text, 'confirmed'::text]));

-- 2. Drop policies that depend on columns being altered (PostgreSQL requires dropping policies before altering column types)
DROP POLICY IF EXISTS daily_releases_enrolled_read ON public.daily_releases;
DROP POLICY IF EXISTS learning_materials_read_public_own_or_granted ON public.learning_materials;
DROP POLICY IF EXISTS lernmaterialien_read_access ON storage.objects;
DROP POLICY IF EXISTS material_access_grants_select_own_or_admin ON public.material_access_grants;
DROP POLICY IF EXISTS material_access_grants_select_own_family_or_admin ON public.material_access_grants;
DROP POLICY IF EXISTS anmeldungen_user_select_own_or_family ON public.intensivwoche_anmeldungen;

-- 3. Drop foreign keys referencing auth.users(id)
ALTER TABLE public.intensivwoche_anmeldungen
  DROP CONSTRAINT IF EXISTS intensivwoche_anmeldungen_beneficiary_user_id_fkey;

ALTER TABLE public.material_access_grants
  DROP CONSTRAINT IF EXISTS material_access_grants_user_id_fkey;

-- 4. Alter column types to TEXT for Better-Auth public."user"(id) compatibility
ALTER TABLE public.intensivwoche_anmeldungen
  ALTER COLUMN beneficiary_user_id TYPE TEXT USING beneficiary_user_id::text;

ALTER TABLE public.material_access_grants
  ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 5. Re-add foreign keys referencing public."user"(id)
ALTER TABLE public.intensivwoche_anmeldungen
  ADD CONSTRAINT intensivwoche_anmeldungen_beneficiary_user_id_fkey
  FOREIGN KEY (beneficiary_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;

ALTER TABLE public.material_access_grants
  ADD CONSTRAINT material_access_grants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;

-- 6. Recreate daily_releases policy with Better-Auth compatibility
CREATE POLICY daily_releases_enrolled_read
  ON public.daily_releases FOR SELECT
  TO authenticated
  USING (
    status IN ('active', 'scheduled')
    AND (opens_at IS NULL OR opens_at <= now())
    AND (closes_at IS NULL OR closes_at >= now())
    AND EXISTS (
      SELECT 1
        FROM public.course_days cd
        JOIN public.intensivwoche_anmeldungen a ON a.kurs_id = cd.session_id
       WHERE cd.id = daily_releases.course_day_id
         AND (
           a.beneficiary_user_id = auth.uid()::text
           OR EXISTS (
             SELECT 1 FROM public."user" u
             WHERE u.parent_id = auth.uid()::text AND u.id = a.beneficiary_user_id
           )
         )
         AND a.status != 'storniert'
    )
  );

-- 7. Add RLS policy for users and parents to view their course registrations
CREATE POLICY anmeldungen_user_select_own_or_family ON public.intensivwoche_anmeldungen
  FOR SELECT TO authenticated
  USING (
    beneficiary_user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public."user" u
      WHERE u.parent_id = auth.uid()::text AND u.id = intensivwoche_anmeldungen.beneficiary_user_id
    )
    OR (auth.jwt() ->> 'email' IS NOT NULL AND lower(parent_email) = lower(auth.jwt() ->> 'email'))
    OR public.is_admin()
  );

-- 8. Extend material_access_grants to support 'course_booking' source_kind
ALTER TABLE public.material_access_grants
  DROP CONSTRAINT IF EXISTS material_access_grants_source_kind_check;

ALTER TABLE public.material_access_grants
  ADD CONSTRAINT material_access_grants_source_kind_check
  CHECK (source_kind = ANY (ARRAY['self_study_enrollment'::text, 'admin_grant'::text, 'course_booking'::text]));

-- 9. Recreate RLS policy for material_access_grants to allow family viewing
CREATE POLICY material_access_grants_select_own_family_or_admin ON public.material_access_grants
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public."user" u
      WHERE u.parent_id = auth.uid()::text AND u.id = material_access_grants.user_id
    )
    OR public.is_admin()
  );

-- 10. Recreate learning_materials policy with Better-Auth & family grant support
CREATE POLICY learning_materials_read_public_own_or_granted
  ON public.learning_materials FOR SELECT
  TO anon, authenticated
  USING (
    is_public = true
    OR auth.uid()::text = created_by::text
    OR public.is_content_manager()
    OR EXISTS (
      SELECT 1 FROM public.material_access_grants g
       WHERE (
         g.user_id = auth.uid()::text
         OR EXISTS (
           SELECT 1 FROM public."user" u
           WHERE u.parent_id = auth.uid()::text AND u.id = g.user_id
         )
       )
         AND g.area_id = learning_materials.area_id
         AND g.status = 'active'
         AND (g.valid_until IS NULL OR g.valid_until > now())
    )
  );

-- 11. Recreate storage objects read access policy for lernmaterialien
CREATE POLICY lernmaterialien_read_access
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'lernmaterialien'
    AND EXISTS (
      SELECT 1 FROM public.learning_materials lm
       WHERE lm.download_path = storage.objects.name
         AND (
           lm.is_public = true
           OR auth.uid()::text = lm.created_by::text
           OR public.is_content_manager()
           OR EXISTS (
             SELECT 1 FROM public.material_access_grants g
              WHERE (
                g.user_id = auth.uid()::text
                OR EXISTS (
                  SELECT 1 FROM public."user" u
                  WHERE u.parent_id = auth.uid()::text AND u.id = g.user_id
                )
              )
                AND g.area_id = lm.area_id
                AND g.status = 'active'
                AND (g.valid_until IS NULL OR g.valid_until > now())
           )
         )
    )
  );

-- 12. Extend process_stripe_payment_update function to activate course access & provision materials
CREATE OR REPLACE FUNCTION public.process_stripe_payment_update(
    p_checkout_session_id TEXT,
    p_payment_intent_id TEXT,
    p_status TEXT,
    p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE (
    payment_id UUID,
    anmeldung_id UUID,
    new_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_payment_id UUID;
    v_anmeldung_id UUID;
    v_beneficiary_id TEXT;
    v_kurs_id BIGINT;
    v_klassenstufen TEXT[];
    v_area_key TEXT;
    v_area_id BIGINT;
BEGIN
    -- Locate existing payment by checkout session or payment intent
    SELECT id, payments.anmeldung_id INTO v_payment_id, v_anmeldung_id
    FROM public.payments
    WHERE stripe_checkout_session_id = p_checkout_session_id
       OR stripe_payment_intent_id = p_payment_intent_id
    FOR UPDATE;

    IF v_payment_id IS NOT NULL THEN
        UPDATE public.payments
        SET 
            status = p_status,
            stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id),
            metadata = CASE 
                WHEN p_metadata IS NOT NULL THEN metadata || p_metadata 
                ELSE metadata 
            END,
            updated_at = now()
        WHERE id = v_payment_id;
    END IF;

    -- If payment succeeded and has an associated anmeldung, update course enrollment and grant access
    IF p_status = 'succeeded' AND v_anmeldung_id IS NOT NULL THEN
        -- Extract beneficiary from metadata if provided
        v_beneficiary_id := NULLIF(TRIM(p_metadata->>'beneficiary_user_id'), '');

        -- Update anmeldung status to confirmed / paid
        UPDATE public.intensivwoche_anmeldungen
        SET 
            status = 'confirmed',
            paid_at = COALESCE(paid_at, now()),
            beneficiary_user_id = COALESCE(beneficiary_user_id, v_beneficiary_id)
        WHERE id = v_anmeldung_id;

        -- Get effective beneficiary and course details
        SELECT beneficiary_user_id, kurs_id 
          INTO v_beneficiary_id, v_kurs_id
          FROM public.intensivwoche_anmeldungen
         WHERE id = v_anmeldung_id;

        -- Provision material access grant for the beneficiary if course and beneficiary are present
        IF v_beneficiary_id IS NOT NULL AND v_kurs_id IS NOT NULL THEN
            SELECT klassenstufen INTO v_klassenstufen
              FROM public.intensivwoche_kurse
             WHERE id = v_kurs_id;

            -- Map class levels to material areas
            v_area_key := NULL;
            IF v_klassenstufen && ARRAY['5. Klasse'::text, '6. Klasse'::text] THEN
                v_area_key := 'langzeitgymi';
            ELSIF v_klassenstufen && ARRAY['2. Sek'::text, '3. Sek'::text, 'Sekundarschule'::text] THEN
                v_area_key := 'kurzgymi';
            ELSIF v_klassenstufen && ARRAY['BMS'::text] THEN
                v_area_key := 'bms';
            ELSIF v_klassenstufen && ARRAY['Matura'::text, 'Gymnasium'::text] THEN
                v_area_key := 'matura';
            ELSE
                v_area_key := 'langzeitgymi';
            END IF;

            IF v_area_key IS NOT NULL THEN
                SELECT id INTO v_area_id
                  FROM public.material_areas
                 WHERE key = v_area_key
                 LIMIT 1;

                IF v_area_id IS NOT NULL THEN
                    INSERT INTO public.material_access_grants (
                        user_id,
                        area_id,
                        status,
                        valid_from,
                        valid_until,
                        source_kind,
                        source_id,
                        created_at
                    )
                    VALUES (
                        v_beneficiary_id,
                        v_area_id,
                        'active',
                        now(),
                        now() + interval '1 year',
                        'course_booking',
                        v_anmeldung_id,
                        now()
                    )
                    ON CONFLICT DO NOTHING;
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN QUERY
    SELECT v_payment_id, v_anmeldung_id, p_status;
END;
$$;

COMMENT ON FUNCTION public.process_stripe_payment_update IS 'Atomically updates payment status, confirms course booking, and provisions material access for the beneficiary.';
