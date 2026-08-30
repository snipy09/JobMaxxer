-- ============================================================================
-- JOBMAXXER v2.1.0 — MIGRATION 003: CLOUD SYNC & SINGLE-LAPTOP DEVICE LOCK
-- ----------------------------------------------------------------------------
-- WHAT THIS DOES:
--   1. Cloud Data Sync: Allows users to seamlessly sync their Master Profile,
--      custom Groq answers, application history, saved jobs, and resumes to Supabase.
--      If a user's laptop breaks or they switch devices, all their data is restored.
--   2. Strict Single-Laptop Device Enforcement:
--      Only 1 device/laptop can be actively logged into an account at any time.
--      Hardware device fingerprinting and session token validation prevent
--      multiple simultaneous users from sharing a single subscription ID.
--
-- HOW TO RUN:
--   Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
--   after migrations 001 and 002.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create Cloud Sync Tables for User Profiles, Applications, Saved Jobs & Resumes
-- ----------------------------------------------------------------------------

-- Cloud Master Profile & Custom Answers
CREATE TABLE IF NOT EXISTS public.user_cloud_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.users_profile(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    linkedin TEXT,
    github TEXT,
    sponsorship TEXT DEFAULT 'No',
    desired_salary TEXT,
    notice_period TEXT DEFAULT '2 weeks',
    groq_api_key TEXT,
    smtp_password TEXT,
    resume_text TEXT,
    custom_answers_json JSONB DEFAULT '{}'::jsonb,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    desired_title TEXT,
    tech_stack TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cloud Synced Applications Log
CREATE TABLE IF NOT EXISTS public.user_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    apply_url TEXT NOT NULL,
    status TEXT DEFAULT 'applied',
    mode TEXT DEFAULT 'autonomous',
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_application_apply_url UNIQUE (user_id, apply_url)
);

CREATE INDEX IF NOT EXISTS idx_user_applications_user ON public.user_applications(user_id, applied_at DESC);

-- Cloud Synced Saved Jobs
CREATE TABLE IF NOT EXISTS public.user_saved_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    apply_url TEXT NOT NULL,
    location TEXT,
    salary TEXT,
    source TEXT,
    score INT DEFAULT 100,
    description TEXT,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_saved_jobs_url UNIQUE (user_id, apply_url)
);

CREATE INDEX IF NOT EXISTS idx_user_saved_jobs_user ON public.user_saved_jobs(user_id, saved_at DESC);

-- Cloud Synced Resumes
CREATE TABLE IF NOT EXISTS public.user_resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_role TEXT,
    file_path TEXT,
    resume_text TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_resumes_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_user_resumes_user ON public.user_resumes(user_id);

-- Ensure user_sessions has device_name
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS device_name TEXT DEFAULT 'Desktop Laptop';

-- ----------------------------------------------------------------------------
-- 2. Lock Down RLS (Access ONLY through Security Definer RPCs or Service Role)
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_cloud_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_applications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_jobs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_resumes        ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. Device Session Registration & Single-Laptop Lock RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_device_session(
    p_user_id UUID,
    p_session_token TEXT,
    p_device_fingerprint TEXT,
    p_device_name TEXT,
    p_client_ip TEXT,
    p_force_takeover BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    ok BOOLEAN,
    conflict BOOLEAN,
    active_device TEXT,
    reason TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_active_rec RECORD;
BEGIN
    -- Check if there is an existing active session on a DIFFERENT device within the last 2 minutes
    SELECT * INTO v_active_rec
    FROM public.user_sessions
    WHERE user_id = p_user_id
      AND is_active = TRUE
      AND device_fingerprint <> p_device_fingerprint
      AND last_heartbeat > (NOW() - INTERVAL '2 minutes')
    ORDER BY last_heartbeat DESC
    LIMIT 1;

    IF FOUND THEN
        IF NOT p_force_takeover THEN
            RETURN QUERY SELECT
                FALSE,
                TRUE,
                COALESCE(v_active_rec.device_name, 'Another Laptop'),
                'Account is currently active on another device (' || COALESCE(v_active_rec.device_name, 'Another Laptop') || '). Only 1 laptop is allowed per account.';
            RETURN;
        ELSE
            -- Invalidate all sessions for other devices
            UPDATE public.user_sessions
            SET is_active = FALSE
            WHERE user_id = p_user_id
              AND device_fingerprint <> p_device_fingerprint;
        END IF;
    END IF;

    -- Upsert current device session
    INSERT INTO public.user_sessions (
        user_id, current_ip, device_fingerprint, device_name, session_token, last_heartbeat, is_active
    )
    VALUES (
        p_user_id, p_client_ip, p_device_fingerprint, p_device_name, p_session_token, NOW(), TRUE
    )
    ON CONFLICT (session_token) DO UPDATE SET
        last_heartbeat = NOW(),
        current_ip = EXCLUDED.current_ip,
        device_fingerprint = EXCLUDED.device_fingerprint,
        device_name = EXCLUDED.device_name,
        is_active = TRUE;

    RETURN QUERY SELECT TRUE, FALSE, NULL::TEXT, 'Session registered successfully';
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Single-Laptop Real-Time Heartbeat RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_and_update_session(
    p_user_id UUID,
    p_session_token TEXT,
    p_client_ip TEXT,
    p_device_fingerprint TEXT
)
RETURNS TABLE (
    is_valid BOOLEAN,
    reason TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_session RECORD;
    v_conflict_device TEXT;
BEGIN
    -- Check if session exists and is active
    SELECT * INTO v_session
    FROM public.user_sessions
    WHERE session_token = p_session_token
      AND user_id = p_user_id
    LIMIT 1;

    IF NOT FOUND OR v_session.is_active = FALSE THEN
        RETURN QUERY SELECT FALSE, 'Session terminated or invalidated by another device login.';
        RETURN;
    END IF;

    IF v_session.device_fingerprint <> p_device_fingerprint THEN
        RETURN QUERY SELECT FALSE, 'Device fingerprint mismatch. Single-device lock active.';
        RETURN;
    END IF;

    -- Check if another device has recently registered and taken over as active
    SELECT device_name INTO v_conflict_device
    FROM public.user_sessions
    WHERE user_id = p_user_id
      AND is_active = TRUE
      AND device_fingerprint <> p_device_fingerprint
      AND last_heartbeat > (NOW() - INTERVAL '2 minutes')
    LIMIT 1;

    IF FOUND THEN
        UPDATE public.user_sessions
        SET is_active = FALSE
        WHERE session_token = p_session_token;

        RETURN QUERY SELECT FALSE, 'This account is now in use on another laptop (' || COALESCE(v_conflict_device, 'Another device') || '). Terminating session.';
        RETURN;
    END IF;

    -- Update heartbeat
    UPDATE public.user_sessions
    SET last_heartbeat = NOW(),
        current_ip = p_client_ip,
        is_active = TRUE
    WHERE session_token = p_session_token;

    RETURN QUERY SELECT TRUE, 'Session validated';
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Data Sync RPC: Pull All Cloud Data on Login or Restore
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_pull_user_data(
    p_user_id UUID,
    p_session_token TEXT,
    p_device_fingerprint TEXT
)
RETURNS TABLE (
    ok BOOLEAN,
    error TEXT,
    profile JSONB,
    applications JSONB,
    saved_jobs JSONB,
    resumes JSONB
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_is_valid BOOLEAN;
    v_profile JSONB;
    v_apps JSONB;
    v_saved JSONB;
    v_resumes JSONB;
BEGIN
    -- Verify session ownership and device lock
    SELECT is_active INTO v_is_valid
    FROM public.user_sessions
    WHERE session_token = p_session_token
      AND user_id = p_user_id
      AND device_fingerprint = p_device_fingerprint
    LIMIT 1;

    IF NOT FOUND OR v_is_valid = FALSE THEN
        RETURN QUERY SELECT FALSE, 'Unauthorized: Active session required.', NULL::JSONB, NULL::JSONB, NULL::JSONB, NULL::JSONB;
        RETURN;
    END IF;

    -- Pull profile
    SELECT to_jsonb(p) INTO v_profile
    FROM public.user_cloud_profiles p
    WHERE p.user_id = p_user_id;

    -- Pull applications
    SELECT COALESCE(jsonb_agg(to_jsonb(a)), '[]'::jsonb) INTO v_apps
    FROM (
        SELECT company, title, apply_url, status, mode, applied_at
        FROM public.user_applications
        WHERE user_id = p_user_id
        ORDER BY applied_at DESC
        LIMIT 200
    ) a;

    -- Pull saved jobs
    SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb) INTO v_saved
    FROM (
        SELECT title, company, apply_url, location, salary, source, score, description, saved_at
        FROM public.user_saved_jobs
        WHERE user_id = p_user_id
        ORDER BY saved_at DESC
    ) s;

    -- Pull resumes
    SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) INTO v_resumes
    FROM (
        SELECT name, target_role, file_path, resume_text, is_default, created_at
        FROM public.user_resumes
        WHERE user_id = p_user_id
        ORDER BY is_default DESC, created_at DESC
    ) r;

    RETURN QUERY SELECT TRUE, NULL::TEXT, v_profile, v_apps, v_saved, v_resumes;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. Data Sync RPCs: Push Operations (Master Profile, App, Job, Resume)
-- ----------------------------------------------------------------------------

-- Push Master Profile
CREATE OR REPLACE FUNCTION public.sync_push_user_profile(
    p_user_id UUID,
    p_session_token TEXT,
    p_device_fingerprint TEXT,
    p_profile JSONB
)
RETURNS TABLE (ok BOOLEAN, error TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_is_valid BOOLEAN;
BEGIN
    SELECT is_active INTO v_is_valid
    FROM public.user_sessions
    WHERE session_token = p_session_token
      AND user_id = p_user_id
      AND device_fingerprint = p_device_fingerprint
    LIMIT 1;

    IF NOT FOUND OR v_is_valid = FALSE THEN
        RETURN QUERY SELECT FALSE, 'Unauthorized: Active session required.';
        RETURN;
    END IF;

    INSERT INTO public.user_cloud_profiles (
        user_id, first_name, last_name, phone, linkedin, github,
        sponsorship, desired_salary, notice_period, groq_api_key,
        smtp_password, resume_text, custom_answers_json,
        onboarding_completed, desired_title, tech_stack, updated_at
    )
    VALUES (
        p_user_id,
        p_profile->>'first_name',
        p_profile->>'last_name',
        p_profile->>'phone',
        p_profile->>'linkedin',
        p_profile->>'github',
        COALESCE(p_profile->>'sponsorship', 'No'),
        p_profile->>'desired_salary',
        COALESCE(p_profile->>'notice_period', '2 weeks'),
        p_profile->>'groq_api_key',
        p_profile->>'smtp_password',
        p_profile->>'resume_text',
        COALESCE(p_profile->'custom_answers_json', '{}'::jsonb),
        COALESCE((p_profile->>'onboarding_completed')::BOOLEAN, FALSE),
        p_profile->>'desired_title',
        p_profile->>'tech_stack',
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        linkedin = EXCLUDED.linkedin,
        github = EXCLUDED.github,
        sponsorship = EXCLUDED.sponsorship,
        desired_salary = EXCLUDED.desired_salary,
        notice_period = EXCLUDED.notice_period,
        groq_api_key = EXCLUDED.groq_api_key,
        smtp_password = EXCLUDED.smtp_password,
        resume_text = EXCLUDED.resume_text,
        custom_answers_json = EXCLUDED.custom_answers_json,
        onboarding_completed = EXCLUDED.onboarding_completed,
        desired_title = EXCLUDED.desired_title,
        tech_stack = EXCLUDED.tech_stack,
        updated_at = NOW();

    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- Push Application Record
CREATE OR REPLACE FUNCTION public.sync_push_application(
    p_user_id UUID,
    p_session_token TEXT,
    p_device_fingerprint TEXT,
    p_company TEXT,
    p_title TEXT,
    p_apply_url TEXT,
    p_status TEXT,
    p_mode TEXT
)
RETURNS TABLE (ok BOOLEAN, error TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_is_valid BOOLEAN;
BEGIN
    SELECT is_active INTO v_is_valid
    FROM public.user_sessions
    WHERE session_token = p_session_token
      AND user_id = p_user_id
      AND device_fingerprint = p_device_fingerprint
    LIMIT 1;

    IF NOT FOUND OR v_is_valid = FALSE THEN
        RETURN QUERY SELECT FALSE, 'Unauthorized: Active session required.';
        RETURN;
    END IF;

    INSERT INTO public.user_applications (user_id, company, title, apply_url, status, mode, applied_at)
    VALUES (p_user_id, p_company, p_title, p_apply_url, COALESCE(p_status, 'applied'), COALESCE(p_mode, 'autonomous'), NOW())
    ON CONFLICT (user_id, apply_url) DO UPDATE SET
        status = EXCLUDED.status,
        mode = EXCLUDED.mode,
        applied_at = NOW();

    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- Push Saved Job
CREATE OR REPLACE FUNCTION public.sync_push_saved_job(
    p_user_id UUID,
    p_session_token TEXT,
    p_device_fingerprint TEXT,
    p_title TEXT,
    p_company TEXT,
    p_apply_url TEXT,
    p_location TEXT,
    p_salary TEXT,
    p_source TEXT,
    p_score INT,
    p_description TEXT
)
RETURNS TABLE (ok BOOLEAN, error TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_is_valid BOOLEAN;
BEGIN
    SELECT is_active INTO v_is_valid
    FROM public.user_sessions
    WHERE session_token = p_session_token
      AND user_id = p_user_id
      AND device_fingerprint = p_device_fingerprint
    LIMIT 1;

    IF NOT FOUND OR v_is_valid = FALSE THEN
        RETURN QUERY SELECT FALSE, 'Unauthorized: Active session required.';
        RETURN;
    END IF;

    INSERT INTO public.user_saved_jobs (
        user_id, title, company, apply_url, location, salary, source, score, description, saved_at
    )
    VALUES (
        p_user_id, p_title, p_company, p_apply_url, p_location, p_salary, p_source, COALESCE(p_score, 100), p_description, NOW()
    )
    ON CONFLICT (user_id, apply_url) DO UPDATE SET
        title = EXCLUDED.title,
        company = EXCLUDED.company,
        location = EXCLUDED.location,
        salary = EXCLUDED.salary,
        source = EXCLUDED.source,
        score = EXCLUDED.score,
        description = EXCLUDED.description,
        saved_at = NOW();

    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- Remove Saved Job
CREATE OR REPLACE FUNCTION public.sync_remove_saved_job(
    p_user_id UUID,
    p_session_token TEXT,
    p_device_fingerprint TEXT,
    p_apply_url TEXT
)
RETURNS TABLE (ok BOOLEAN, error TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_is_valid BOOLEAN;
BEGIN
    SELECT is_active INTO v_is_valid
    FROM public.user_sessions
    WHERE session_token = p_session_token
      AND user_id = p_user_id
      AND device_fingerprint = p_device_fingerprint
    LIMIT 1;

    IF NOT FOUND OR v_is_valid = FALSE THEN
        RETURN QUERY SELECT FALSE, 'Unauthorized: Active session required.';
        RETURN;
    END IF;

    DELETE FROM public.user_saved_jobs
    WHERE user_id = p_user_id
      AND apply_url = p_apply_url;

    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- Push Resume
CREATE OR REPLACE FUNCTION public.sync_push_resume(
    p_user_id UUID,
    p_session_token TEXT,
    p_device_fingerprint TEXT,
    p_name TEXT,
    p_target_role TEXT,
    p_file_path TEXT,
    p_resume_text TEXT,
    p_is_default BOOLEAN
)
RETURNS TABLE (ok BOOLEAN, error TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_is_valid BOOLEAN;
BEGIN
    SELECT is_active INTO v_is_valid
    FROM public.user_sessions
    WHERE session_token = p_session_token
      AND user_id = p_user_id
      AND device_fingerprint = p_device_fingerprint
    LIMIT 1;

    IF NOT FOUND OR v_is_valid = FALSE THEN
        RETURN QUERY SELECT FALSE, 'Unauthorized: Active session required.';
        RETURN;
    END IF;

    IF p_is_default THEN
        UPDATE public.user_resumes SET is_default = FALSE WHERE user_id = p_user_id;
    END IF;

    INSERT INTO public.user_resumes (
        user_id, name, target_role, file_path, resume_text, is_default, created_at
    )
    VALUES (
        p_user_id, p_name, p_target_role, p_file_path, p_resume_text, COALESCE(p_is_default, FALSE), NOW()
    )
    ON CONFLICT (user_id, name) DO UPDATE SET
        target_role = EXCLUDED.target_role,
        file_path = EXCLUDED.file_path,
        resume_text = EXCLUDED.resume_text,
        is_default = EXCLUDED.is_default;

    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- Delete Resume
CREATE OR REPLACE FUNCTION public.sync_delete_resume(
    p_user_id UUID,
    p_session_token TEXT,
    p_device_fingerprint TEXT,
    p_name TEXT
)
RETURNS TABLE (ok BOOLEAN, error TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_is_valid BOOLEAN;
BEGIN
    SELECT is_active INTO v_is_valid
    FROM public.user_sessions
    WHERE session_token = p_session_token
      AND user_id = p_user_id
      AND device_fingerprint = p_device_fingerprint
    LIMIT 1;

    IF NOT FOUND OR v_is_valid = FALSE THEN
        RETURN QUERY SELECT FALSE, 'Unauthorized: Active session required.';
        RETURN;
    END IF;

    DELETE FROM public.user_resumes
    WHERE user_id = p_user_id
      AND name = p_name;

    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. Grant Permissions to Anon & Authenticated Roles for RPCs
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.register_device_session FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_and_update_session FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_pull_user_data FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_push_user_profile FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_push_application FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_push_saved_job FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_remove_saved_job FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_push_resume FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_delete_resume FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.register_device_session TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_and_update_session TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_pull_user_data TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_push_user_profile TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_push_application TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_push_saved_job TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_remove_saved_job TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_push_resume TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_delete_resume TO anon, authenticated;
