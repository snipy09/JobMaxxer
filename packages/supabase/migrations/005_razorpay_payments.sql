-- ----------------------------------------------------------------------------
-- MIGRATION 005: Razorpay Orders & Transaction Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.razorpay_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    plan TEXT NOT NULL CHECK (plan IN ('pro', 'turbo', 'lifetime')),
    amount TEXT NOT NULL,
    payment_id TEXT NOT NULL UNIQUE,
    order_id TEXT,
    status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('captured', 'failed', 'refunded')),
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_razorpay_payments_email ON public.razorpay_payments(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_razorpay_payments_payment_id ON public.razorpay_payments(payment_id);

ALTER TABLE public.razorpay_payments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. Fulfillment RPC: Upgrades Subscription & Writes to Billing Records
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_razorpay_payment_success(
    p_user_id UUID,
    p_email TEXT,
    p_plan TEXT,
    p_amount TEXT,
    p_payment_id TEXT,
    p_order_id TEXT DEFAULT NULL,
    p_raw_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    ok BOOLEAN,
    user_id UUID,
    new_tier TEXT,
    expires_at TIMESTAMPTZ,
    reason TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id UUID := p_user_id;
    v_tier TEXT;
    v_expires TIMESTAMPTZ;
BEGIN
    -- Resolve user_id by email if not provided or invalid
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM public.users_profile WHERE LOWER(email) = LOWER(TRIM(p_email)) LIMIT 1;
    END IF;

    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 'No matching user account found for ' || p_email;
        RETURN;
    END IF;

    -- Determine new tier and duration
    v_tier := CASE WHEN LOWER(p_plan) = 'turbo' THEN 'max' ELSE 'pro' END;
    v_expires := CASE WHEN LOWER(p_plan) = 'lifetime' THEN NULL ELSE NOW() + INTERVAL '30 days' END;

    -- Record transaction in razorpay_payments
    INSERT INTO public.razorpay_payments (user_id, email, plan, amount, payment_id, order_id, status, raw_payload)
    VALUES (v_user_id, LOWER(TRIM(p_email)), p_plan, p_amount, p_payment_id, p_order_id, 'captured', p_raw_payload)
    ON CONFLICT (payment_id) DO NOTHING;

    -- Update user subscription profile
    UPDATE public.users_profile
    SET subscription_tier = v_tier,
        status = 'active',
        expires_at = v_expires,
        updated_at = NOW()
    WHERE id = v_user_id;

    -- Insert record into permanent billing ledger
    INSERT INTO public.billing_records (user_email, amount, plan, status, payment_method)
    VALUES (
        LOWER(TRIM(p_email)),
        '₹' || p_amount,
        CASE WHEN v_tier = 'max' THEN 'Seeker Turbo (Monthly)' ELSE 'Seeker Pro (Monthly)' END,
        'paid',
        'Razorpay'
    );

    RETURN QUERY SELECT TRUE, v_user_id, v_tier, v_expires, 'Subscription upgraded successfully!';
END;
$$;

-- Secure grants: Only service_role (Edge Functions / Operator) may execute fulfillment
REVOKE ALL ON FUNCTION public.handle_razorpay_payment_success FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_razorpay_payment_success TO service_role;