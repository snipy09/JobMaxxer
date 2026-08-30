-- ============================================================================
-- JOBMAXXER v2.0.0 — MIGRATION 002: SERVER-AUTHORITATIVE LICENSING & SECURE RLS
-- ----------------------------------------------------------------------------
-- WHAT THIS DOES (and why it matters):
--   In v1 every subscription check lived on the customer's own machine, the
--   anon key was committed to the repo, and the tables were world-writable
--   (USING(true)). Any user could self-upgrade to 'lifetime', read every other
--   user, or bypass the single-IP lock. This migration makes SUPABASE the
--   source of truth for who is allowed in and what they paid for.
--
--   After running this:
--     * jobs / hr_contacts  -> anon can READ the feed, only the service role
--                              (your GitHub Actions scraper) can WRITE.
--     * users_profile        -> NO direct anon access at all. Login happens
--                              only through the authenticate_user() RPC, and
--                              accounts are created only with the service role.
--     * user_sessions        -> reachable only via the verify_and_update_session
--                              RPC (single-IP lock). No direct anon access.
--     * subscription_tier / expiry / status -> writable ONLY by the service
--                              role (your machine). Customers cannot change them.
--
-- HOW TO RUN:
--   1. Rotate the leaked anon key first (Supabase Dashboard -> Settings -> API
--      -> "Reset anon key"), because the old one is in git history.
--   2. Run migration 001 (if not already applied), then run THIS file, in the
--      Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
--   3. Seed your admin account (see the bottom of this file).
--
-- This script is idempotent — safe to run more than once.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Extend users_profile so it can hold login + license state
--    (v1 kept all of this in local SQLite on the customer's machine).
-- ----------------------------------------------------------------------------
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS role          TEXT NOT NULL DEFAULT 'user';
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS status        TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS license_key   TEXT;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS expires_at    TIMESTAMPTZ;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS apps_count    INT NOT NULL DEFAULT 0;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS last_login    TIMESTAMPTZ;

-- Guard rails on the new columns (drop-then-add so re-runs don't error).
DO $$
BEGIN
  ALTER TABLE public.users_profile DROP CONSTRAINT IF EXISTS users_profile_role_chk;
  ALTER TABLE public.users_profile ADD  CONSTRAINT users_profile_role_chk
    CHECK (role IN ('admin', 'user'));
  ALTER TABLE public.users_profile DROP CONSTRAINT IF EXISTS users_profile_status_chk;
  ALTER TABLE public.users_profile ADD  CONSTRAINT users_profile_status_chk
    CHECK (status IN ('active', 'suspended'));
END $$;

CREATE INDEX IF NOT EXISTS idx_users_profile_email_lower
  ON public.users_profile (LOWER(email));

-- ----------------------------------------------------------------------------
-- 2. Widen hr_contacts.verification_status to match the email verifier,
--    which emits 'risky' and 'catch-all' in addition to the v1 values.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.hr_contacts DROP CONSTRAINT IF EXISTS hr_contacts_verification_status_check;
  ALTER TABLE public.hr_contacts ADD  CONSTRAINT hr_contacts_verification_status_check
    CHECK (verification_status IN ('valid', 'invalid', 'pending', 'risky', 'catch-all'));
END $$;

-- ============================================================================
-- 3. LOCK DOWN ROW LEVEL SECURITY
--    Remove every permissive USING(true) policy from migration 001 and replace
--    with least-privilege rules. The service_role key BYPASSES RLS by design,
--    so your scraper (CI) and your admin machine keep full write access without
--    needing explicit policies here.
-- ============================================================================

-- Make sure RLS is on for every table.
ALTER TABLE public.jobs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_contacts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_profile    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_job_matches ENABLE ROW LEVEL SECURITY;

-- Drop the world-open v1 policies.
DROP POLICY IF EXISTS "Allow public read jobs"            ON public.jobs;
DROP POLICY IF EXISTS "Allow public insert jobs"          ON public.jobs;
DROP POLICY IF EXISTS "Allow public update jobs"          ON public.jobs;
DROP POLICY IF EXISTS "Allow public delete jobs"          ON public.jobs;
DROP POLICY IF EXISTS "Allow public read hr_contacts"     ON public.hr_contacts;
DROP POLICY IF EXISTS "Allow public insert hr_contacts"   ON public.hr_contacts;
DROP POLICY IF EXISTS "Allow public update hr_contacts"   ON public.hr_contacts;
DROP POLICY IF EXISTS "Allow public read users_profile"   ON public.users_profile;
DROP POLICY IF EXISTS "Allow public insert users_profile" ON public.users_profile;
DROP POLICY IF EXISTS "Allow public update users_profile" ON public.users_profile;
DROP POLICY IF EXISTS "Allow public read user_sessions"   ON public.user_sessions;
DROP POLICY IF EXISTS "Allow public insert user_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Allow public update user_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Allow public read user_preferences"   ON public.user_preferences;
DROP POLICY IF EXISTS "Allow public insert user_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Allow public update user_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Allow public read user_job_matches"   ON public.user_job_matches;
DROP POLICY IF EXISTS "Allow public insert user_job_matches" ON public.user_job_matches;
DROP POLICY IF EXISTS "Allow public update user_job_matches" ON public.user_job_matches;

-- Also drop this migration's own policies so re-running is clean.
DROP POLICY IF EXISTS "anon can read active jobs"     ON public.jobs;
DROP POLICY IF EXISTS "anon can read hr_contacts"     ON public.hr_contacts;

-- The ONLY thing the customer app (anon key) may do directly:
--   read the job feed and read recruiter contacts. Everything else is via RPC.
CREATE POLICY "anon can read active jobs"
  ON public.jobs FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

CREATE POLICY "anon can read hr_contacts"
  ON public.hr_contacts FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- users_profile, user_sessions, user_preferences, user_job_matches:
-- RLS is enabled with NO anon/authenticated policy => the anon key can do
-- nothing directly. Access happens only through the SECURITY DEFINER RPCs
-- below (login / heartbeat) or with the service role (admin machine + CI).

-- ============================================================================
-- 4. AUTH RPCs — the only doors into users_profile from the client
-- ============================================================================

-- Deterministic password hash: sha256("email:password").
-- The desktop app computes the exact same hash; we also hash server-side so the
-- client may send either the plaintext or a pre-hash — both are accepted.
CREATE OR REPLACE FUNCTION public.jobmaxxer_hash_login(p_email TEXT, p_password TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(digest(LOWER(TRIM(p_email)) || ':' || p_password, 'sha256'), 'hex');
$$;

-- Set / reset a user's password (service role or SQL editor only).
CREATE OR REPLACE FUNCTION public.set_user_password(p_email TEXT, p_password TEXT)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.users_profile
     SET password_hash = public.jobmaxxer_hash_login(p_email, p_password),
         updated_at = NOW()
   WHERE LOWER(email) = LOWER(TRIM(p_email));
$$;

-- LOGIN. Returns exactly one row describing the outcome. The desktop app reads
-- row[0]: if ok = TRUE it signs the user in and caches the profile locally for
-- brief offline use; otherwise it shows `reason` and refuses entry.
CREATE OR REPLACE FUNCTION public.authenticate_user(p_email TEXT, p_password TEXT)
RETURNS TABLE (
  ok          BOOLEAN,
  reason      TEXT,
  id          UUID,
  email       TEXT,
  full_name   TEXT,
  tier        TEXT,
  role        TEXT,
  status      TEXT,
  license_key TEXT,
  expires_at  TIMESTAMPTZ,
  apps_count  INT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  u          public.users_profile%ROWTYPE;
  v_hash     TEXT;
BEGIN
  SELECT * INTO u FROM public.users_profile
   WHERE LOWER(email) = LOWER(TRIM(p_email)) LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE,
      'No account found for that email. Contact your administrator to be added.',
      NULL::UUID, NULL, NULL, NULL, NULL, NULL, NULL, NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;

  -- Accept either the plaintext password or a pre-computed sha256 hash.
  v_hash := public.jobmaxxer_hash_login(u.email, p_password);
  IF u.password_hash IS NULL
     OR (u.password_hash <> v_hash AND u.password_hash <> p_password) THEN
    RETURN QUERY SELECT FALSE, 'Incorrect password.',
      NULL::UUID, NULL, NULL, NULL, NULL, NULL, NULL, NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;

  IF u.status = 'suspended' THEN
    RETURN QUERY SELECT FALSE, 'This account is suspended. Contact your administrator.',
      NULL::UUID, NULL, NULL, NULL, NULL, NULL, NULL, NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;

  IF u.expires_at IS NOT NULL AND u.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE,
      CASE WHEN u.subscription_tier = 'trial'
           THEN 'Your free trial has expired. Contact your administrator to upgrade.'
           ELSE 'Your subscription has expired. Contact your administrator to renew.' END,
      NULL::UUID, NULL, NULL, NULL, NULL, NULL, NULL, NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;

  UPDATE public.users_profile SET last_login = NOW() WHERE id = u.id;

  RETURN QUERY SELECT TRUE, 'ok',
    u.id, u.email, u.full_name, u.subscription_tier, u.role, u.status,
    u.license_key, u.expires_at, u.apps_count;
END;
$$;

-- Let the customer app (anon key) call ONLY these two functions.
REVOKE ALL ON FUNCTION public.authenticate_user(TEXT, TEXT)     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_password(TEXT, TEXT)      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.jobmaxxer_hash_login(TEXT, TEXT)   FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authenticate_user(TEXT, TEXT)   TO anon, authenticated;
-- set_user_password stays operator-only: grant to service_role (admin machine +
-- SQL editor) but NOT to anon, so customers can never set/reset a password.
GRANT EXECUTE ON FUNCTION public.set_user_password(TEXT, TEXT)   TO service_role;

-- verify_and_update_session already exists (migration 001) as SECURITY DEFINER.
-- Make sure the anon key can call it for the single-IP heartbeat.
GRANT EXECUTE ON FUNCTION public.verify_and_update_session(UUID, TEXT, TEXT, TEXT)
  TO anon, authenticated;

-- ============================================================================
-- 4b. BILLING LEDGER (operator-only)
--    Records manual / Stripe payments so the Admin dashboard can show revenue.
--    RLS is enabled with NO anon policy => only the service role (your admin
--    machine) can read or write it. Customers never see other customers' money.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.billing_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email     TEXT NOT NULL,
  amount         TEXT NOT NULL,
  plan           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'refunded')),
  payment_method TEXT DEFAULT 'Manual',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_billing_user_email ON public.billing_records (LOWER(user_email));
CREATE INDEX IF NOT EXISTS idx_billing_created_at ON public.billing_records (created_at DESC);
ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;
-- (Intentionally no policy: service role bypasses RLS; everyone else is denied.)

-- ============================================================================
-- 5. SEED YOUR ADMIN ACCOUNT
--    Edit the email + password below, then this block creates (or updates)
--    your own login. This is the ONLY account that sees the Admin panel.
--    Delete or comment out this block after your first run if you prefer.
-- ============================================================================
INSERT INTO public.users_profile (email, full_name, subscription_tier, role, status, license_key, expires_at)
VALUES ('admin@jobmaxxer.app', 'JobMaxxer Admin', 'lifetime', 'admin', 'active', 'JMX-ADMIN-0001', NULL)
ON CONFLICT (email) DO UPDATE
  SET role = 'admin', status = 'active', subscription_tier = 'lifetime';

-- Set the admin password (CHANGE THIS VALUE):
SELECT public.set_user_password('admin@jobmaxxer.app', 'CHANGE-ME-strong-pass');

-- ----------------------------------------------------------------------------
-- HOW TO ADD A PAYING CUSTOMER LATER (run in SQL Editor, service role):
--
--   INSERT INTO public.users_profile
--     (email, full_name, subscription_tier, role, status, license_key, expires_at)
--   VALUES
--     ('student@college.edu', 'Student Name', 'pro', 'user', 'active',
--      'JMX-PRO-1234-5678', NOW() + INTERVAL '30 days');
--   SELECT public.set_user_password('student@college.edu', 'their-temp-password');
--
-- Suspend / extend / upgrade:
--   UPDATE public.users_profile SET status='suspended'  WHERE email='...';
--   UPDATE public.users_profile SET expires_at = NOW() + INTERVAL '30 days' WHERE email='...';
--   UPDATE public.users_profile SET subscription_tier='max' WHERE email='...';
-- ----------------------------------------------------------------------------