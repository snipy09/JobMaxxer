# Unified Context for Job Automator Project

This document consolidates all original documentation, diagnoses, revamp plans, operator buildup, and deployment instructions for JobMaxxer (Job Automator).

---

## SECTION 1: README (Enterprise Desktop Edition Overview)

An enterprise-grade, commercial desktop application for automated job scraping, personalized feed distribution, auto-applying, and 0%-bounce HR email outreach.

### 🏗 Architecture & Monorepo Structure

```
job-automator/
├── apps/
│   └── desktop/               # Electron + React 18 + Vite + Tailwind CSS desktop shell
├── packages/
│   ├── automation/            # Playwright Stealth auto-apply engine & Groq LLaMA 3.1 8B AI
│   ├── email-verifier/        # 4-stage HR email verification & Nodemailer drip campaign engine
│   ├── scrapers/              # 5 high-throughput job scrapers & keyword-relevance ranker
│   └── supabase/              # Supabase client, SQL migrations, single-IP session lock RPC
├── .env.example               # Template for optional Supabase cloud configuration
├── CLAUDE.md                  # Development guidelines & tool invocation rules
├── package.json               # Root monorepo configuration & scripts
```

### ⚡ Key Modules & Features

#### 1. Desktop App (`apps/desktop`)
- Built with **Electron 28**, **React 18**, **TypeScript**, **Vite**, and **Tailwind CSS**.
- **Offline-First Storage**: Zero-dependency local SQLite database (`sql.js`) storing Candidate Master Profiles, custom application answers, and local application logs.
- **Secure Context Isolation**: IPC bridge via `preload.ts` exposes only explicitly whitelisted renderer methods.

#### 2. Playwright Stealth Auto-Apply Engine (`packages/automation`)
- **Semi-Auto Mode**: Pre-fills up to 20 Chromium tabs concurrently with candidate profile data using Playwright Stealth, pausing for manual user review before final submit.
- **100% Autonomous Mode**: Auto-fills ATS forms using the Field Alias Dictionary, queries Groq Free Cloud AI (LLaMA 3.1 8B) for dynamic open-ended questions, and detects CAPTCHA barriers.

#### 3. High-Throughput Scrapers & Relevance Ranker (`packages/scrapers`)
- **5 Scraping Engines**: ATS APIs (Greenhouse, Lever), Aggregators & RSS feeds, Direct DOM parser, Web Search indexes, Niche boards.
- **Deduplication**: Cryptographic SHA-256 job hashing (`SHA256(company + title + apply_url)`).
- **Keyword Scoring**: Weighted relevance engine matching job title (2x) and description (1x) against candidate tech stack and desired roles.

#### 4. 4-Stage HR Email Verifier & Outreach (`packages/email-verifier`)
- **Stage 1**: RFC 5322 regex syntax check.
- **Stage 2**: Role / Disposable account filter (`info@`, `support@`, `sales@`).
- **Stage 3**: DNS MX record resolution.
- **Stage 4**: Real-time Direct SMTP socket ping (`HELO` → `MAIL FROM` → `RCPT TO`) to verify inbox existence.
- **Humanized Drip Campaign**: Local Nodemailer sender with randomized 45s–120s drip delays between sends to protect domain sender reputation.

#### 5. Supabase Cloud Sync & Single-IP Security (`packages/supabase`)
- **SQL Migration**: Schema setup for `users`, `sessions`, `jobs`, and `user_preferences`.
- **Single-IP Heartbeat**: RPC function `verify_and_update_session` invalidates sessions if a new IP address takes over a logged-in account.
- **Match Engine**: `match_jobs_for_user` SQL function ranks cloud jobs against user-configured target titles and tech stack.

### 🚀 Getting Started

#### Prerequisites
- **Node.js**: v18.x or later
- **npm**: v9.x or later

#### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/job-automator.git
cd job-automator

# 2. Install monorepo dependencies
npm install

# 3. (Optional) Set up Supabase Cloud environment variables
cp .env.example .env
```

#### Running the Desktop App

```bash
# Start Vite renderer + Electron dev mode
npm run dev:desktop
```

#### Build & Package for Production

```bash
# Build desktop executable for your OS (Windows .exe, Mac .dmg, Linux .AppImage)
npm run build:desktop
```

### 🧪 Testing

The monorepo includes **142 passing unit tests** across all 4 internal packages, built with **Vitest**.

```bash
# Run all unit tests across the entire monorepo
npx vitest run

# Run TypeScript type check across all workspace packages
npx tsc --noEmit
```

#### Individual Package Commands

```bash
# Automation Engine
npm run automation:test

# Job Scrapers
npm run scrapers:test

# Email Verifier
npm run email:verify
```

### 🛡 Security & Privacy

- **Local Secrets Storage**: Groq API keys and SMTP credentials are stored locally on your machine in an encrypted/isolated SQLite file and are never sent to external tracking servers.
- **Context-Isolated IPC**: Electron main process renderer communications are strictly limited via a single context bridge in `preload.ts`.
- **Single-IP Verification**: Protects user cloud sessions by invalidating multi-device access when IP mismatch is detected.

---

## SECTION 2: REVAMP PLAN (Commercialization Diagnostic & Plan)

*Prepared from a full diagnostic of the `job-automator` monorepo. Decisions locked with you: keep the automation **aggressive**, keep the **GitHub Actions** scraper backend, monetize via **monthly subscription**, sell to college students.*

### 1. Executive summary

The good news: this is a real, ~13,000-line product, not a broken prototype. The Electron desktop app almost certainly **builds and launches** — the custom esbuild bundler is sound, and the "app doesn't work correctly" symptom is a **runtime/architecture problem, not a compile problem**. The database schema and feature surface are genuinely well thought out (dedup, job lifecycle, single-IP session lock, an admin/billing scaffold).

The blocker for selling it is not the UI — it's that **the paywall can be bypassed by anyone in about 30 seconds**, and the scraper/outreach backends are fragile in ways that will silently produce an empty or broken experience for real users. Before this earns a rupee, the backend has to be made computationally secure and trustworthy.

The single most important finding: the Supabase Row-Level-Security was originally wide open (`USING (true)` on every table) and the anon key is committed to the repo. That means any user could set their own `subscription_tier` to `lifetime`, read every user's data, and defeat the single-IP lock. Fixing this is Phase 0 and everything else waits behind it.

**Priority order to ship:** (1) secure the backend, (2) make the core loop work end-to-end for one paying user, (3) wire real subscription payments, (4) harden scraping + outreach, (5) package/sign/distribute.

### 2. What actually works vs. what's broken

**Works today (build on these):**
- Monorepo builds via a clean esbuild step (`apps/desktop/build-main.mjs`) + Vite renderer. Native deps (Playwright, sql.js) are correctly externalized.
- The **ATS API scrapers** (Greenhouse / Lever / Ashby public JSON endpoints) are real network calls and are the reliable backbone of the feed.
- The Supabase schema (`packages/supabase/migrations/001_initial_schema.sql`) is well-designed: job dedup by SHA-256 hash, automatic 14-day inactivation + 30-day purge, single-IP RPC, job-matching RPC.
- Complete IPC feature surface is wired (31 handlers): scraping, cloud feed, resumes, semi-auto + autonomous apply, outreach, heartbeat, auth, and an admin panel with user/billing/metrics.
- Local-first storage via sql.js; secrets kept in the local SQLite profile.

**Broken or fragile (details below):** open database security, no real payment enforcement, committed secrets, admin-only "sign-up," email-guessing masquerading as an HR database, unreliable GitHub Actions cadence, unsigned admin-elevated installer, and ~14 real type issues in the desktop app.

### 3. Critical issues — P0 (must fix before selling anything)

#### P0-1 — Supabase is effectively public read/write (paywall bypass + data breach)
The migration enables RLS but then adds permissive policies on every table:
```sql
CREATE POLICY "Allow public update users_profile" ON public.users_profile FOR UPDATE USING (true);
```
Combined with the anon key being shipped in the client, this means any user can:
- Set their own `subscription_tier` to `'lifetime'` → free forever, instant piracy.
- Read the entire `users_profile` and `user_sessions` tables → everyone's email + subscription + session tokens.
- Delete or poison the `jobs` and `hr_contacts` tables for all users.
- Write directly to `user_sessions` → defeat the single-IP anti-sharing lock.

**Fix:** Rewrite RLS so a user can only read/update their *own* row and **cannot** change `subscription_tier`. Move every privileged operation (setting subscription tier, creating users, billing, session verification, all writes to `jobs`/`hr_contacts`) behind a **service-role key** that lives only server-side (Supabase Edge Functions and the GitHub Actions runner), never in the desktop client. Subscription state must be **server-authoritative**.

#### P0-2 — No payment system exists
`subscription_tier` is a column with a nice enum (`trial/pro/max/enterprise/lifetime`), but **nothing sets it from an actual payment**. Today users are provisioned by the admin panel by hand. To sell on subscription you need a payment provider + webhook that is the *only* thing allowed to change the tier.

#### P0-3 — Entitlement checks are client-trusted
Because the client talks to Supabase with the anon key and RLS is open, any "is this user Pro?" check can be spoofed. Entitlement must be verified server-side on each privileged action, not read from a value the client can edit.

#### P0-4 — Committed secrets
The Supabase URL and anon key were hardcoded as fallback defaults in both `.github/workflows/scraper-cron.yml` and `packages/scrapers/src/cron-publisher.ts`. Rotating the key, removing the hardcoded fallbacks, and loading from GitHub Secrets / local env is required.

#### P0-5 — Unsigned installer that demands Administrator
`apps/desktop/package.json` sets `requestedExecutionLevel: requireAdministrator` and ships no code-signing certificate. For a paid consumer app this is a conversion killer: every install triggers a UAC prompt plus a "Windows protected your PC" SmartScreen wall. Drop admin elevation unless a feature truly needs it, and budget for code signing.

### 4. High-priority — P1 (makes it "actually work")

#### P1-1 — Workspace packages export raw TypeScript
Every package sets `"main": "src/index.ts"` with no `types`/`exports` and no build step. This is why `tsc` reports `Cannot find module '@job-automator/automation'`. It works at runtime only because esbuild/tsx transpile the source directly — a fragile setup that compiles at runtime but fails typical workspace boundaries. **Fix:** give each package a real build (tsup/tsc → `dist`) with proper `main`/`types`/`exports`, and normalize all local dependency specifiers to one scheme.

#### P1-2 — Scraper reliability and the "1000+ sources" gap
The README says 1000+ sources; reality is ~7 scraper strategies. The ATS APIs are solid; the DOM / web-search / niche-board scrapers are inherently brittle. A partial failure can quietly shrink the feed. **Fix:** per-source health tracking + logging, graceful per-source failure isolation, retries with backoff, and honest marketing.

#### P1-3 — The "HR database" is email *guessing*, not scraping
`packages/scrapers/src/recruiter-scraper.ts` makes **zero network calls**. It generates candidate addresses from a hardcoded domain+pattern dictionary (e.g. `firstlast@google.com`) and relies on the email-verifier's SMTP probe to guess which are real. Two consequences: accuracy is low outside known companies, and SMTP-verification pings from shared GitHub Actions IPs get blocklisted quickly.

#### P1-4 — `verification_status` mismatch across three layers
The DB constraint allows `('valid','invalid','pending')`, the verifier emits `'risky'`, and the desktop `OutreachContact` type expects `'catch-all'`. Any contact tagged `risky`/`catch-all` will fail insertion against the CHECK constraint. Pick one canonical status set and align DB + verifier + renderer types.

#### P1-5 — 14 real desktop type errors
Clean implicit-any issues, fix a null-dereference (`index.ts:1054`), and type-align the outreach status columns.

### 5. GitHub Actions scraper backend — considerations
- scheduled workflow runs get delayed by GitHub under load (not exact cadence).
- Cost/quota: private repos consume runner limits quickly. If public, secrets must be locked tightly.
- Splitting scraper steps into a workflow matrix ensures stability.

### 6. Aggressive automation — hardening
- Ensure Playwright integration uses Stealth browser sessions natively.
- Incorporate user cookie & profile context persistence.
- Randomize interactions & mouse travels to act humanlike.
- Integrate CAPTCHA detection and auto-switch back to manual/semi-auto verification.

---

## SECTION 3: OPERATOR BUILD & DEPLOY GUIDE

This is the step-by-step runbook for shipping JobMaxxer to paying customers. Supabase acts as the source of truth for auth & license tiers.

### 0. What you need before you start
- A Supabase project.
- Node.js 20+ and Git on Windows/Linux host.
- Retrieve the Supabase Project URL, `anon` key, and `service_role` key.

### Part A — Prepare the Supabase backend

**A1. Rotate compromised anon keys** if exposed in repository commits.

**A2. Run migrations** in the Supabase SQL editor:
1. `001_initial_schema.sql` (Creates core tables: jobs, sessions, profiles, preferences, matches)
2. `002_secure_rls.sql` (Replaces world-open policies with client-closed least-privilege policies, configures hashing, RPC authentication, and billing records)
3. `003_cloud_sync_and_device_lock.sql` (Adds cloud sync tables for profile/applications/saved jobs/resumes + strict single-laptop device lock RPCs)

**A3. Seed and secure your admin account.**
Change email/password under the seed block:
```sql
INSERT INTO public.users_profile (email, full_name, subscription_tier, role, status, license_key, expires_at)
VALUES ('YOU@yourdomain.com', 'Your Name', 'lifetime', 'admin', 'active', 'JMX-ADMIN-0001', NULL)
ON CONFLICT (email) DO UPDATE SET role='admin', status='active', subscription_tier='lifetime';

SELECT public.set_user_password('YOU@yourdomain.com', 'a-strong-unique-password');
```

---

### Part B — Set the environment variables

There are three separate env contexts:

#### B1. Build Machine (Baked into released client)
Set these prior to packaging the Electron app:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do **not** use the `service_role` key here.

#### B2. Operator Machine (Runtime variables for Admin Control Panel)
Configure this variable on the admin host to activate privileged control options:
- `SUPABASE_SERVICE_ROLE_KEY`

#### B3. GitHub Actions workflow secrets
In repository variables/secrets under Actions, register:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (Enables the cron to write jobs/hr_leads)
- `SUPABASE_ANON_KEY`

---

### Part C — Build and package the Windows app

Execute from repository root:
```powershell
npm install
npm run build:desktop
npm run package:desktop
```
Outputs NSIS Installer and portable executable under `apps/desktop/dist-electron/`.

*Note: Incorporate proper Windows Authenticode Code Signing certificates to avoid SmartScreen prompts during consumer installations.*

---

### Part D — Verify Scraper Publications
Under GitHub Actions tab, trigger the scraper cron manually. Verify jobs are populating inside Supabase database:
```sql
SELECT COUNT(*) FROM public.jobs WHERE is_active = true;
```

---

### Part E — Provisioning paying customers (Manual MVP)

#### Option 1: Admin Panel Web UI
Run the desktop app with the environment variable `SUPABASE_SERVICE_ROLE_KEY` loaded, enter **Admin → Users → Add User**, and establish new customer licenses.

#### Option 2: SQL Editor
Submit a query inside Supabase editor:
```sql
INSERT INTO public.users_profile
  (email, full_name, subscription_tier, role, status, license_key, expires_at)
VALUES
  ('student@college.edu', 'Student Name', 'pro', 'user', 'active',
   'JMX-PRO-1234-5678', NOW() + INTERVAL '30 days');

SELECT public.set_user_password('student@college.edu', 'their-password');
```

---

### Part F — Go-live checklist
- [ ] Rotate compromised keys.
- [ ] Apply secure schema and migrations.
- [ ] Configure environment variables B1/B2/B3 correctly.
- [ ] Compile release build using `package:desktop`.
- [ ] Confirm scraper functionality.
