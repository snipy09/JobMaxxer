# Unified Context for Nomadic Project

This document consolidates the authoritative system architecture, product blueprints, design conventions, and operational guidelines for **Nomadic**.

---

## 1. Executive Summary

**Nomadic** is a cross-industry desktop career acceleration operating system built with **Electron 31 + React 18 + Vite 5 + Tailwind CSS**, local **SQLite** (`sql.js`), **Supabase** cloud synchronization, and **Playwright Stealth** browser automation.

The platform is organized into two core persona tracks with a shared candidate intelligence core:

### A. Learner Track (Career Acceleration & Competency Mastery)
* **Default Landing on Startup & Login:** All users immediately land on the Learner Track (`activeTrack: 'learner'`, `activeTab: 'learner-roadmaps'`).
* **Universal Cross-Industry Support:** Accommodates any profession (Engineering, Product Management, UI/UX Design, Growth Marketing, Financial Analysis, Sales, Operations, Data Analytics).
* **Dynamic AI Curriculum Generation:**
  - Synthesizes personalized multi-phase curricula with structured milestones and modular sub-topics based on candidate goals.
  - Curricula are **locked** in local SQLite (`custom_roadmaps`) and `localStorage` to prevent automatic re-synthesis loops on boot.
* **2-Column Phase Breakdown:**
  - **Left Column:** Interactive Concepts to Learn checklist with 1-click mastery toggles.
  - **Right Column:** Verified, live YouTube tutorial and official documentation search links that open seamlessly in the default web browser.
* **Goal & Commitment Calibration:**
  - Target Timeline Horizons: `1 Month (Fast-Track / Sprint)`, `3 Months (Standard)`, `6 Months (Comprehensive Mastery)`.
  - Daily Commitment: `1 Hour / Day`, `2 Hours / Day`, `4+ Hours / Day`.
* **Authentic Activity Heatmap:** 52-week activity streak heatmap aggregating verified user actions from SQLite (`user_activity_log`).
* **Technical Resource Vault:**
  - **Question Bank:** Single clean 1-click action: **"All LeetCode Questions"** (zero list clutter or table bloat).
  - **Curated Textbooks & Architecture Guides:** High-yield reference handbooks with digital reading guides.
* **Opportunity Board (`activeTab: 'opportunities'`):** Clean, uncluttered Coming Soon section for paid research fellowships, global hackathons, open-source grants, and builder residencies with 1-click launch notifications.

---

### B. Seeker Track (Opportunity Pipeline & Auto-Apply)
* **Real-time Opportunity Radar:** Integrated with direct ATS endpoints (Greenhouse, Lever, Ashby, Internshala, and developer feeds), deduplicated cryptographically via SHA-256 job hashes.
* **Persistent Feed Caching:**
  - Job feed is synchronously loaded from `localStorage` on page navigation to eliminate layout shift.
  - Automatically syncs fresh cloud jobs on new session startups or via the 1-click **"Refresh"** button.
* **Job Board Segmented Filters:**
  - `All`, `Full-Time Jobs`, `Internships`, `Internshala`, `Latest`, `High Match (≥80%)`, `Remote`, `Saved`.
* **Autonomous Auto-Apply Engine:**
  - Playwright Stealth autofill running in RAM-safe parallel batches with automated questionnaire answering.
  - **Pre-Apply Profile & Resume Gatekeeper:** Intercepts applications if candidate first name, phone, or verified resume file (`.pdf`/`.docx`) are missing.
* **Multi-Resume Library (`ProfileView.tsx` & `CompleteProfileModal.tsx`):**
  - Direct 1-click file picker supporting `.pdf` and `.docx` documents.
  - Live listing of all uploaded resumes with active default indicators and delete actions.
* **Verified HR & Recruiter Outreach (`OutreachView.tsx`):**
  - 4-stage email verification pipeline (RFC 5322, MX DNS check, SMTP handshake).
  - Dual dispatch modes: direct SMTP drip or system default browser Gmail compose drafts.
* **Local Application Tracker (`ApplicationsView.tsx`):** Authentic tracking backed directly by SQLite (`local_applications`) with status progression (`draft`, `applied`, `interviewing`, `offer`, `rejected`) and manual logging modal.

---

## 2. Visual Identity & Design System

* **Monotone Palette Foundation:** Pure black (`#000000`), zinc-900 (`#09090b`), dark border (`#27272a`), and crisp white (`#ffffff`).
* **Subtle Powder Blue Accent:**
  - Applied sparingly and subtly (Claude / Linear style) for active indicator pills, track switchers, and update badges (`#bae2fd`, `#7cc9fa`, `#0284c7`, `#f0f7ff`).
* **Typography:** Clean Apple SF Pro / Geist system stack with high contrast hierarchy.
* **Neutral Proprietary Branding:** Zero third-party AI backend mentions (e.g. Gemini, Groq, LLaMA) in user-facing copy; branded strictly as the **Nomadic AI Engine**.

---

## 3. Storage Architecture & Zero Data Loss Guarantee

To prevent data loss when users launch portable or installer executables from Downloads:
1. **Permanent `userData` Locking:** Electron main process executes:
   ```typescript
   app.setPath('userData', path.join(app.getPath('appData'), 'Nomadic'));
   ```
   All local databases and Chromium `localStorage` partitions permanently anchor to `C:\Users\<user>\AppData\Roaming\Nomadic\`.
2. **Triple-Layer Profile Persistence:**
   - **Layer 1 (Instant):** `localStorage` (`nomadic_master_profile`, `nomadic_cached_roadmap`) for 0ms sub-second restoration.
   - **Layer 2 (Local SQLite):** `job_automator_local.db` tables (`master_profile`, `custom_roadmaps`, `resumes`, `local_applications`, `user_activity_log`).
   - **Layer 3 (Cloud Sync):** Supabase `cloud_user_data` / `user_preferences` cloud sync.

---

## 4. In-App Updates & Auto-Updater Engine

* **Silent Background Version Check:** On startup, queries latest release manifests via GitHub API (`snipy09/JobMaxxer`).
* **Invisible by Default:** When up-to-date, the update trigger is **100% hidden** (0 pixels in the UI).
* **Subtle Update Pill:** When a new version is released, a subtle powder-blue button appears in the top navigation bar (`Update Available (v...)`).
* **1-Click In-App Installation:** Streams the new installer binary with a live progress bar, executes the update, and relaunches with zero data loss.

---

## 5. Monorepo Structure

```
nomadic/
├── apps/
│   ├── desktop/               # Electron 31 + React 18 + Vite 5 desktop application
│   │   ├── src/main/          # Main process (index.ts, db.ts, device.ts, preload.ts)
│   │   └── src/renderer/      # UI components (LearnerView, FeedView, OutreachView, etc.)
│   └── web/                   # Public web landing page (React 18 + Vite 5 + Tailwind CSS)
├── packages/
│   ├── automation/            # Playwright Stealth auto-apply & AI question solver
│   ├── email-verifier/        # 4-stage MX email verification & Nodemailer / browser Gmail drip
│   ├── scrapers/              # High-throughput scrapers (Greenhouse, Lever, Ashby, Internshala)
│   └── supabase/              # Supabase client, schema migrations, and sync scripts
├── UNIFIED_CONTEXT.md         # Authoritative consolidated system reference
└── package.json               # Root monorepo configuration & build scripts
```

---

## 6. Build, Test & Development Workflow

* **Instant Hot Reload (No Reinstallation):**
  ```bash
  npm run dev:desktop
  ```
  - React changes hot reload in <200ms via Vite Fast Refresh.
  - `F12` or `Ctrl+Shift+I` toggles Chrome DevTools.
  - `Ctrl+Shift+R` triggers a hard window reload.
* **Test Suite:**
  ```bash
  npx vitest run
  ```
  - 19/19 test suites, 190 tests passing.
* **Packaging Production Executables:**
  ```bash
  npm run package:desktop
  ```
  - Generates `Nomadic Setup 1.0.0.exe` (NSIS Installer) and `Nomadic.exe` (Portable) and copies to `C:\Users\sajal\Downloads\`.
