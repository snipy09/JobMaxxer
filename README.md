# Job Automator — Enterprise Desktop Edition

An enterprise-grade, commercial desktop application for automated job scraping, personalized feed distribution, auto-applying, and 0%-bounce HR email outreach.

---

## 🏗 Architecture & Monorepo Structure

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
└── package.json               # Root monorepo configuration & scripts
```

---

## ⚡ Key Modules & Features

### 1. Desktop App (`apps/desktop`)
- Built with **Electron 28**, **React 18**, **TypeScript**, **Vite**, and **Tailwind CSS**.
- **Offline-First Storage**: Zero-dependency local SQLite database (`sql.js`) storing Candidate Master Profiles, custom application answers, and local application logs.
- **Secure Context Isolation**: IPC bridge via `preload.ts` exposes only explicitly whitelisted renderer methods.

### 2. Playwright Stealth Auto-Apply Engine (`packages/automation`)
- **Semi-Auto Mode**: Pre-fills up to 20 Chromium tabs concurrently with candidate profile data using Playwright Stealth, pausing for manual user review before final submit.
- **100% Autonomous Mode**: Auto-fills ATS forms using the Field Alias Dictionary, queries Groq Free Cloud AI (LLaMA 3.1 8B) for dynamic open-ended questions, and detects CAPTCHA barriers.

### 3. High-Throughput Scrapers & Relevance Ranker (`packages/scrapers`)
- **5 Scraping Engines**: ATS APIs (Greenhouse, Lever), Aggregators & RSS feeds, Direct DOM parser, Web Search indexes, Niche boards.
- **Deduplication**: Cryptographic SHA-256 job hashing (`SHA256(company + title + apply_url)`).
- **Keyword Scoring**: Weighted relevance engine matching job title (2x) and description (1x) against candidate tech stack and desired roles.

### 4. 4-Stage HR Email Verifier & Outreach (`packages/email-verifier`)
- **Stage 1**: RFC 5322 regex syntax check.
- **Stage 2**: Role / Disposable account filter (`info@`, `support@`, `sales@`).
- **Stage 3**: DNS MX record resolution.
- **Stage 4**: Real-time Direct SMTP socket ping (`HELO` → `MAIL FROM` → `RCPT TO`) to verify inbox existence.
- **Humanized Drip Campaign**: Local Nodemailer sender with randomized 45s–120s drip delays between sends to protect domain sender reputation.

### 5. Supabase Cloud Sync & Single-IP Security (`packages/supabase`)
- **SQL Migration**: Schema setup for `users`, `sessions`, `jobs`, and `user_preferences`.
- **Single-IP Heartbeat**: RPC function `verify_and_update_session` invalidates sessions if a new IP address takes over a logged-in account.
- **Match Engine**: `match_jobs_for_user` SQL function ranks cloud jobs against user-configured target titles and tech stack.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.x or later
- **npm**: v9.x or later

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/job-automator.git
cd job-automator

# 2. Install monorepo dependencies
npm install

# 3. (Optional) Set up Supabase Cloud environment variables
cp .env.example .env
```

### Running the Desktop App

```bash
# Start Vite renderer + Electron dev mode
npm run dev:desktop
```

### Build & Package for Production

```bash
# Build desktop executable for your OS (Windows .exe, Mac .dmg, Linux .AppImage)
npm run build:desktop
```

---

## 🧪 Testing

The monorepo includes **142 passing unit tests** across all 4 internal packages, built with **Vitest**.

```bash
# Run all unit tests across the entire monorepo
npx vitest run

# Run TypeScript type check across all workspace packages
npx tsc --noEmit
```

### Individual Package Commands

```bash
# Automation Engine
npm run automation:test

# Job Scrapers
npm run scrapers:test

# Email Verifier
npm run email:verify
```

---

## 🛡 Security & Privacy

- **Local Secrets Storage**: Groq API keys and SMTP credentials are stored locally on your machine in an encrypted/isolated SQLite file and are never sent to external tracking servers.
- **Context-Isolated IPC**: Electron main process renderer communications are strictly limited via a single context bridge in `preload.ts`.
- **Single-IP Verification**: Protects user cloud sessions by invalidating multi-device access when IP mismatch is detected.

---

## 📜 License

Commercial License — All Rights Reserved.