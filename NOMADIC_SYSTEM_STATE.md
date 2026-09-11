# Nomadic — Universal System State & Architectural Blueprint

**Last Updated:** September 2026  
**Repository:** `snipy09/JobMaxxer`  
**Production Web Portal:** `https://nomadicai.vercel.app`  
**Current Active Version:** `v1.0.6` (RFC 3161 Authenticode Digital Signatures)

---

## 1. Distribution & Business Model

- **Closed Alpha Testing Program:**
  - **Zero Public Downloads:** All public download links and open installer pages are closed.
  - **Cohort Launch:** The first official Alpha Testing cohort begins **next Monday**.
  - **Pre-Registration:** Open now at **₹99 (one-time)** via direct WhatsApp checkout (+91 94938 33632) and the web reservation portal.
  - **Tier Pricing:** Free (₹0), Pro (₹249/mo), and Max (₹599/mo).
  - **Master Admins:** `sajalmishra0906@gmail.com` and `sajalmishra222@gmail.com` (assigned `max` tier and `admin` role in Supabase `users_profile`).

---

## 2. Security Hardening & Zero-Trust Architecture

1. **Zero Hardcoded Credentials:**
   - Completely eliminated legacy test bypasses (`admin@jobmaxxer.com` / `admin123` / `ADMIN_DEV_USER`).
   - Query string auth bypasses (`?admin` / `#admin`) removed.
2. **Server-Side Cryptographic Tier Verification:**
   - Privileged IPC handlers (`launch-autonomous`, `start-batch-copilot`, `ask-nomadic-assistant`, `send-outreach`) verify active subscriptions directly against Supabase `users_profile` (`getVerifiedServerUserTier`).
   - Local client tampering with SQLite (`user_cache`) or `localStorage` cannot elevate tiers or bypass plan gating.
3. **Electron Production Hardening:**
   - DevTools locked in production builds (`devTools: !app.isPackaged`).
   - Keyboard inspection shortcuts (`F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`, `Ctrl+U`) blocked on production windows.
   - Strict `contextIsolation: true` and `nodeIntegration: false`.
4. **OAuth Credentials:**
   - Bundled OAuth client secrets removed in favor of environment secrets and Supabase OAuth authentication.

---

## 3. Autonomous Form Automation & Perception Engine

1. **End-to-End AI Perception Loop (`generateAIPilotPlan`):**
   - The auto-applier introspects the active DOM, tags interactive nodes with `data-nomadic-id`, and sends structured representations along with candidate context to the AI pilot.
   - Executes the AI's action plan across field inputs, radio groups, file attachments, and submit triggers.
2. **>95% Accurate OmniForm Multi-Pass Solver (`OmniFormSolver`):**
   - **React 18 Prototype Setter:** Bypasses input state blanking via `HTMLInputElement.prototype.value` setter and native event bubbling (`input`, `change`, `blur`).
   - **Unanchored Option Matcher:** Seamlessly solves full-paragraph arbitration agreements (*"I acknowledge that have opened, read, and understood the Arbitration Agreement..."*) and legal accuracy declarations (*"I confirm I have read the above."*).
   - **Custom Radio & Binary Buttons:** Solves Work Authorization (`Yes`), Visa Sponsorship (`No`), Relocation (`Yes`), and SF HQ / 3-day office attendance (`Yes`).
   - **Opacity-0 Checkboxes:** Dispatches synthetic click events to parent `<label>` / wrapper containers.
   - **Guaranteed Resume Upload:** Generates and attaches valid minimal `%PDF-1.4` binary stream.
3. **Specialized Portal Bots:**
   - **AshbyBot:** Custom radio options + post-submit error callout remediation.
   - **InternshalaBot:** Modal-aware scrolling (targets `.modal-body` & `#application_modal` instead of background window) + multi-tab popup listener (`waitForEvent('page')`).
   - **GreenhouseBot & LeverBot:** Multi-pass field mapping with custom dropdown solvers.

---

## 4. Universal Parallel Batch Co-Pilot & UI Features

1. **Parallel Batch Co-Pilot:**
   - Concurrently pre-fills 3–5 applications in live headful browser tabs.
   - Presents a unified review drawer (`BatchCoPilotReviewModal.tsx`) with natural-language global and per-job command editing.
   - Executes live browser submissions upon 1-click **"Submit All"**.
2. **Bottom-Right Max Autonomous AI Assistant on Steroids (`NomadicAssistant.tsx`):**
   - Floating trigger button at `fixed bottom-6 right-6 z-[90]` with glowing ambient gradient and `MAX` badge.
   - App-wide action dispatch (navigates tabs, filters job feeds, launches auto-apply).
   - Bar-raiser interview coaching, salary negotiation strategy, and system design guidance.
   - **Anti-Exploitation Policy:** Hardcoded refusal of academic homework, school assignments, or live exam taking.
3. **Adaptive Workspace Modes:**
   - `learner_only` (Roadmaps, Question Bank, Textbooks; hides seeker tools).
   - `seeker_only` (ATS Job Board, Auto-Applier, Recruiter Drip; hides curriculum).
   - `unified` (Dual mode with top-header `[ Learn | Seek ]` switcher).
4. **Target Opportunity Filtering:**
   - Configurable in onboarding and settings (`job`, `internship`, `both`).
   - Automatically pre-filters the Job Board feed.
5. **Sub-30ms Server-Side Paginated Job Board:**
   - Strictly loads 1 page at a time (18/36/54 items) via Supabase SQL range queries (`get-cloud-feed-page`), eliminating bulk database transfers.

---

## 5. Master Desktop Deliverables

- **Downloads Directory (`C:\Users\sajal\Downloads\`):**
  - `Nomadic 1.0.6.exe` (Signed Standalone Portable)
- **Desktop (`C:\Users\sajal\OneDrive\Desktop\`):**
  - `Nomadic 1.0.6.exe` (Signed Standalone Portable)
  - `Scrape_All_Jobs.bat` (Master Scraper Batch File executing ATS APIs, Internshala, Remotive, Ashby, Lever, Greenhouse, and syncing to Supabase)
