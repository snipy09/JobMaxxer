-- ============================================================================
-- AUTOAPPLYMAX — PRODUCTION SUPABASE SCHEMA & LIFECYCLE MANAGEMENT
-- ============================================================================

-- 1. Users Profile Table
CREATE TABLE IF NOT EXISTS public.users_profile (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    subscription_tier TEXT DEFAULT 'pro' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Single-IP Security & Active Session Tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    current_ip TEXT NOT NULL,
    device_fingerprint TEXT NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_lookup ON public.user_sessions(user_id, is_active);

-- 3. Central Ingested Jobs Table (Deduplication + 2-Week Inactivity + 1-Month Deletion)
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_hash TEXT NOT NULL UNIQUE, -- SHA256(company + title + clean_apply_url)
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    location TEXT,
    description TEXT,
    apply_url TEXT NOT NULL,
    source TEXT NOT NULL, -- e.g. 'greenhouse', 'lever', 'ashby', 'workday', 'linkedin'
    salary_range TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    inactivated_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_jobs_hash ON public.jobs(job_hash);
CREATE INDEX IF NOT EXISTS idx_jobs_active ON public.jobs(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);

-- 4. HR, Hiring Managers & Recruiter Contacts for Referral Outreach
CREATE TABLE IF NOT EXISTS public.hr_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    department TEXT DEFAULT 'Engineering',
    verification_status TEXT DEFAULT 'valid' CHECK (verification_status IN ('valid', 'invalid', 'pending')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_contacts_company ON public.hr_contacts(company);
CREATE INDEX IF NOT EXISTS idx_hr_contacts_role ON public.hr_contacts(role);

-- 5. User Preferences & Filter Rules
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users_profile(id) ON DELETE CASCADE,
    target_titles TEXT[] DEFAULT '{}',
    locations TEXT[] DEFAULT '{}',
    is_remote BOOLEAN DEFAULT FALSE,
    min_salary INT DEFAULT 0,
    excluded_keywords TEXT[] DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Personalized Matched Jobs Table
CREATE TABLE IF NOT EXISTS public.user_job_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    match_score INT DEFAULT 100,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'applied', 'saved', 'ignored')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, job_id)
);

-- ============================================================================
-- RPC & LIFECYCLE ROUTINES
-- ============================================================================

-- ROUTINE: 2-Week Inactivation & 1-Month Purge Maintenance
CREATE OR REPLACE FUNCTION maintain_jobs_lifecycle()
RETURNS TABLE(inactivated_count INT, purged_count INT) AS $$
DECLARE
    v_inactivated INT;
    v_purged INT;
BEGIN
    -- 1. Inactivate jobs older than 14 days (2 weeks)
    UPDATE public.jobs
    SET is_active = FALSE
    WHERE is_active = TRUE
      AND created_at < (NOW() - INTERVAL '14 days');
    GET DIAGNOSTICS v_inactivated = ROW_COUNT;

    -- 2. Permanently delete jobs older than 30 days (1 month)
    DELETE FROM public.jobs
    WHERE created_at < (NOW() - INTERVAL '30 days');
    GET DIAGNOSTICS v_purged = ROW_COUNT;

    RETURN QUERY SELECT v_inactivated, v_purged;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Single-IP Enforcement
CREATE OR REPLACE FUNCTION verify_and_update_session(
    p_user_id UUID,
    p_session_token TEXT,
    p_client_ip TEXT,
    p_device_fingerprint TEXT
)
RETURNS TABLE(is_valid BOOLEAN, reason TEXT) AS $$
DECLARE
    active_rec RECORD;
BEGIN
    -- Check for an existing active session from a DIFFERENT IP within 2 minutes
    SELECT * INTO active_rec FROM public.user_sessions
    WHERE user_id = p_user_id 
      AND is_active = TRUE 
      AND last_heartbeat > (NOW() - INTERVAL '2 minutes')
      AND current_ip <> p_client_ip
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT FALSE, 'Account is active on another IP (' || active_rec.current_ip || '). Single-IP enforcement policy active.';
        RETURN;
    END IF;

    -- Update or Insert current session heartbeat
    INSERT INTO public.user_sessions (user_id, current_ip, device_fingerprint, session_token, last_heartbeat, is_active)
    VALUES (p_user_id, p_client_ip, p_device_fingerprint, p_session_token, NOW(), TRUE)
    ON CONFLICT (session_token) 
    DO UPDATE SET 
        last_heartbeat = NOW(),
        current_ip = EXCLUDED.current_ip,
        is_active = TRUE;

    RETURN QUERY SELECT TRUE, 'Session validated';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Match Jobs for a User
CREATE OR REPLACE FUNCTION match_jobs_for_user(p_user_id UUID)
RETURNS INT AS $$
DECLARE
    inserted_count INT;
BEGIN
    INSERT INTO public.user_job_matches (user_id, job_id)
    SELECT p_user_id, j.id
    FROM public.jobs j
    JOIN public.user_preferences up ON up.user_id = p_user_id
    WHERE j.is_active = TRUE
      AND (array_length(up.target_titles, 1) IS NULL OR j.title ILIKE ANY(SELECT '%' || t || '%' FROM unnest(up.target_titles) t))
      AND (up.is_remote = FALSE OR j.location ILIKE '%remote%')
      AND NOT (array_length(up.excluded_keywords, 1) IS NOT NULL AND j.description ILIKE ANY(SELECT '%' || k || '%' FROM unnest(up.excluded_keywords) k))
    ON CONFLICT (user_id, job_id) DO NOTHING;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
