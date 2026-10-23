-- Migration: 20260906110000_payments_schema.sql
-- Description: Create payments table and RPC for handling Stripe transaction status updates.

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anmeldung_id UUID REFERENCES public.intensivwoche_anmeldungen(id) ON DELETE SET NULL,
    user_id TEXT REFERENCES public."user"(id) ON DELETE SET NULL,
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_checkout_session_id TEXT UNIQUE,
    amount_rappen BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'chf',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded')),
    payment_method_types TEXT[] NOT NULL DEFAULT ARRAY['card', 'twint']::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_anmeldung_id ON public.payments(anmeldung_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session ON public.payments(stripe_checkout_session_id);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payments"
    ON public.payments
    FOR SELECT
    TO authenticated
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
        OR (auth.jwt() ->> 'email' IS NOT NULL AND metadata->>'customer_email' = auth.jwt() ->> 'email')
    );

CREATE POLICY "Admins can view all payments"
    ON public.payments
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Grants
GRANT SELECT ON public.payments TO authenticated;

-- Function to record payment and handle status update atomically
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

    -- If payment succeeded and has an associated anmeldung, update anmeldung status to confirmed / paid
    IF p_status = 'succeeded' AND v_anmeldung_id IS NOT NULL THEN
        UPDATE public.intensivwoche_anmeldungen
        SET 
            status = 'confirmed',
            paid_at = COALESCE(paid_at, now())
        WHERE id = v_anmeldung_id;
    END IF;

    RETURN QUERY
    SELECT v_payment_id, v_anmeldung_id, p_status;
END;
$$;

COMMENT ON TABLE public.payments IS 'Tracks Stripe payments and status for course bookings and services.';
COMMENT ON FUNCTION public.process_stripe_payment_update IS 'Updates payment status and sets linked course booking state upon successful payment.';
