-- Migration: 20261004135800_payment_failure_handling.sql
-- Description: Handle course payment refunds and failures by revoking access and updating enrollment status.

-- 1. Update the status check constraint to allow new payment failure states
ALTER TABLE public.intensivwoche_anmeldungen
  DROP CONSTRAINT IF EXISTS intensivwoche_anmeldungen_status_check;

ALTER TABLE public.intensivwoche_anmeldungen
  ADD CONSTRAINT intensivwoche_anmeldungen_status_check
  CHECK (status = ANY (ARRAY['eingegangen'::text, 'bestaetigt'::text, 'bezahlt'::text, 'storniert'::text, 'confirmed'::text, 'payment_outstanding'::text, 'payment_failed'::text]));

-- 2. Update the Stripe RPC to handle refunds and failures
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

    -- Handle refunds and failures
    IF (p_status = 'failed' OR p_status = 'refunded') AND v_anmeldung_id IS NOT NULL THEN
        -- Update course status
        UPDATE public.intensivwoche_anmeldungen
        SET 
            status = CASE WHEN p_status = 'refunded' THEN 'payment_outstanding' ELSE 'payment_failed' END
        WHERE id = v_anmeldung_id;

        -- Revoke material access grants
        UPDATE public.material_access_grants
        SET 
            status = 'revoked',
            revoked_at = now()
        WHERE source_kind = 'course_booking' 
          AND source_id = v_anmeldung_id
          AND status = 'active';
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
