-- Migration: 20260921165500_fix_link_anmeldung_beneficiary.sql
-- Fix link_anmeldung_beneficiary function to reference public."user" instead of dropped public.profiles

CREATE OR REPLACE FUNCTION public.link_anmeldung_beneficiary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NEW.beneficiary_user_id IS NULL THEN
    SELECT id INTO NEW.beneficiary_user_id
      FROM public."user"
     WHERE lower(email) = lower(NEW.parent_email)
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.link_anmeldung_beneficiary() IS 'Heuristische Auto-Verknuepfung einer Anmeldung mit einem existierenden Nutzer (public."user") per E-Mail-Abgleich.';
