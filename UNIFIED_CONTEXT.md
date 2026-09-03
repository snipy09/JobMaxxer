# Unified Context for Hirestack Project

This document consolidates all core architecture, feature blueprints, and operational guidelines for **Hirestack**.

> **Note:** For the complete, authoritative Master Product Specification with deep dives into the Duolingo-style Learner Tree, Seeker Hub, Razorpay 4-Tier Pricing, and Defensive Engineering Risk Matrix, refer to [HIRESTACK_MASTER_SPEC.md](file:///C:/Users/sajal/projects/Hirestack/HIRESTACK_MASTER_SPEC.md).

---

## 1. Executive Summary

**Hirestack** is an enterprise-grade desktop career acceleration operating system built with **Electron + React 18 + Vite + Tailwind CSS**, local **SQLite** (`sql.js`), and **Supabase** cloud sync.

It is split into two major pillars:
### B. Learner Hub (Career Accelerator & Up-skilling)
* **Goal & Commitment Calibration**: Target role selection + 1m/2m/6m/1y horizon + 1h/3h/5h daily commitment.
* **Duolingo-Style Serpentine Tree**: Interactive progressive node path with sub-tasks, locked/active states, and day-by-day lesson milestones.
* **3-Step Mastery Loop per Node**:
  1. *Learn*: Curated zero-fluff video masterclasses, MDN/React official docs, and cheatsheets.
  2. *Practice*: Embedded interactive code runner playground with test case validation + Multiple-Choice Quiz bench with instant explanations.
  3. *Apply*: Portfolio project challenges with guided architecture, deliverables checklists, and 1-click GitHub boilerplate links.
* **Paid Resource Vault (`learner-resources`)**:
  - **1,500+ Question Bank (Paid Tier / Learner Pro)**: Real-world frontend, backend, DSA, SQL, and PM case interview problems with optimal code solutions, time/space complexity, and video walkthroughs.
  - **Textbook Vault**: Iconic books (*Designing Data-Intensive Applications*, *Clean Code*, *System Design Interview*, *You Don't Know JS*, *Cracking the PM Interview*) with chapter outlines, key takeaways, and digital library references.
  - **Architecture Cheatsheets**: High-yield reference guides (React 18 RSC, PostgreSQL Indexing, Docker/K8s).
* **Gamification**: 52-week GitHub-style activity streak heatmap, daily streak flame counter (`🔥 5 Days`), and XP meter.
* **1-Click Skill Sync**: Transports unlocked competencies directly into the Seeker candidate profile for ATS match ranking.

2. **Hirestack Seeker Hub**: 1,000+ source ATS job radar (anti-ghost job filtered via SHA-256 hashes), RAM-safe Semi-Auto (3–5 tabs) and 100% Autonomous auto-apply, and 4-stage 0%-bounce HR cold email outreach.

---

## 2. Pricing & Tier Structure

All plans include a **3-Day Free Trial** on signup (Google OAuth) locked to the laptop's hardware fingerprint:

| Tier | Price | Highlights |
| :--- | :--- | :--- |
| **Free Tier** | **₹0** | 3-day full access trial, roadmap preview, top 10 daily job feed. |
| **Learner Pro** | **₹79 / mo** | Full Duolingo-style skill trees, daily task scheduler, interactive coding drills, guided project builder, GitHub streak heatmap, AI companion. |
| **Seeker Pro** | **₹149 / mo** | 1,000+ job source radar (anti-ghost filter), semi-autonomous auto-apply (up to 50 jobs/week), verified HR lead directory. |
| **Seeker Max** | **₹299 / mo** | **Complete Suite**: Full Learner Pro + 100% Autonomous Auto-Apply + Automated 0%-bounce HR Email Outreach Campaigns. |

---

## 3. Monorepo Architecture

```
Hirestack/
├── apps/
│   ├── desktop/               # Electron 28 + React 18 + Vite + Tailwind CSS shell
│   │   └── src/renderer/      # LearnerView, FeedView, OutreachView, Sidebar, TopBar
│   └── web/                   # Public landing & download portal (Vercel / React + Vite)
├── packages/
│   ├── automation/            # Playwright Stealth auto-apply engine & Groq LLaMA 3.1 8B AI
│   ├── email-verifier/        # 4-stage HR email verification & Nodemailer / Chrome drip outreach
│   ├── scrapers/              # 5 high-throughput job scrapers & keyword-relevance ranker
│   └── supabase/              # Supabase client, SQL migrations, single-IP & hardware session lock RPCs
├── HIRESTACK_MASTER_SPEC.md   # Complete Master Product Specification
├── package.json               # Root monorepo configuration & scripts
└── UNIFIED_CONTEXT.md         # Consolidated architectural summary
```

---

## 4. Key Defensive Architecture Safeguards & What Could Go Wrong

1. **Auto-Apply Memory Freeze**: Capped strictly at 3–5 parallel Chromium tabs (FIFO queue) so student laptops (8GB RAM) never crash.
2. **CAPTCHAs & OTPs**: Automatic detection surfaces the browser window with an alert chime for user solve, then resumes autopilot.
3. **AI Form Errors**: Strict JSON schema validation prevents text from being submitted to numeric/date/dropdown fields.
4. **Shadow DOM Piercing**: Playwright piercing selector engine (`css=div >> css=input`) penetrates Workday/Salesforce Shadow DOM trees.
5. **Split Phone & Dial Codes**: `libphonenumber-js` normalizes phone numbers, setting dial codes (`+91`/`+1`) and 10-digit text fields independently.
6. **Autocomplete Location Dropdowns**: Synthetic `ArrowDown` + `Enter` selection triggers Google Places / Mapbox prediction commits.
7. **EEOC Demographic Defaults**: Automatically selects safe, compliant defaults (*"Decline to self-identify"*).
8. **Custom Dropdowns & Hidden Inputs**: Native click simulation for Radix/React-Select popovers + `setInputFiles` for hidden drag-drop zones.
9. **Resume Validation**: Client-side 2MB size verification + 1-click in-app PDF compression via `pdf-lib`.
10. **Multi-Step Wizards**: Step-by-step navigation loop with DOM readiness verification on each page transition.
11. **Email Spam & Account Bans**: Hard quota of 15–25 emails/day per user with 60s–180s randomized drip delays via logged-in browser sessions.
12. **0% Bounce & Catch-All Probing**: 4-stage verification + non-existent mailbox probe (`xyzrandom123@domain.com`) flags catch-all enterprise servers.
13. **URL Parameter Hash Stripping**: Sanitizes dynamic tracking parameters (`utm_*`, `gh_jid`) before computing SHA-256 job hashes.
14. **Ghost Job Protection**: Cryptographic SHA-256 deduplication + 14-day inactivity auto-archiving.
15. **Scraper Reliability & Quota**: Direct public ATS JSON APIs (Greenhouse, Lever, Ashby) scheduled every 2 hours (100% within free GitHub runner limits).
16. **Code Runner Sandboxing & Memory Cleanup**: Web Worker execution with a 2-second timeout and 10-run instance recycle prevents infinite loops and memory leaks.
17. **Offline-to-Online Sync Merging**: Union-Set calculation ($\text{Merged} = \text{Cloud} \cup \text{Local}$) guarantees completed milestones are never lost.
18. **AI API Outages**: Exponential backoff retries with local fallback to pre-baked hint & interview answer dictionaries.
19. **0-Cost Local AI Caching**: Answers to recurring form questions are cached in local SQLite to protect gross margins on ₹79/₹149 plans.
20. **RBI e-Mandate Failures & Webhook Drops**: Single-month and 3-month UPI prepaid passes (GPay, PhonePe, Paytm) + server-to-server Razorpay webhooks.
21. **Hardware Fingerprint Anti-Abuse**: Free 3-day trials and licenses are bound to CPU ID + Motherboard UUID to prevent throwaway email farming.
22. **Desktop OS & Packaging Safety**: System browser loopback auth (`localhost:42813`) + Authenticode signing + SQLite WAL mode + Electron background throttling (<45MB RAM).

---
