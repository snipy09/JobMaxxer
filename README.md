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

The monorepo includes **147 passing unit tests** across all internal packages, built with **Vitest**.

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
- **Single-IP Verification & Device Lock**: Protects user cloud sessions by invalidating multi-device access when IP/device mismatch is detected.

---

## SECTION 2: REVAMP PLAN (Commercialization Diagnostic & Plan)

*Prepared from a full diagnostic of the `job-automator` monorepo. Decisions locked with you: keep the automation **aggressive**, keep the **GitHub Actions** scraper backend, monetize via **monthly subscription**, sell to college students.*

### 1. Executive summary

The good news: this is a real, ~13,000-line product, not a broken prototype. The Electron desktop app builds and launches cleanly with custom esbuild bundler and Vite renderer. The database schema and feature surface are well-designed with dedup, job lifecycle, single-laptop session locking, and an admin/billing scaffold.

The single most important finding was that Supabase Row-Level-Security had open permissions (`USING (true)`) in v1. Migrations `002_secure_rls.sql` and `003_cloud_sync_and_device_lock.sql` make Supabase server-authoritative for licenses and enforce single-laptop hardware locks.

### 2. What works vs what was hardened

- Monorepo builds via clean esbuild step (`apps/desktop/build-main.mjs`) + Vite renderer. Native deps (Playwright, sql.js) are externalized.
- ATS API scrapers (Greenhouse / Lever / Ashby public JSON endpoints) provide live feeds.
- Deduplication by SHA-256 hash, automatic 14-day inactivation + 30-day purge.
- Complete IPC feature surface wired across scraping, cloud feed, resumes, semi-auto + autonomous apply, outreach, heartbeat, auth, and admin panel.
- Single-Laptop hardware locking + Cloud Sync to restore candidate data on device switch.

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
