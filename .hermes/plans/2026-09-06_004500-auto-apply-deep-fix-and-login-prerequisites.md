# Deep Fix Implementation Plan: Auto-Apply Portal Login Handler, Single-Job Targeted Apply, Portal Prerequisites & Pill Cancel Control

**Plan ID:** `2026-09-06_004500-auto-apply-deep-fix-and-login-prerequisites`  
**Target Applications:** `packages/automation`, `apps/desktop`  
**Architecture Status:** Production Grade (Electron + Playwright + SQLite)

---

## 1. Goal
Resolve the major auto-apply issues when applying to multi-source job portals (Naukri.com, Indeed India, Internshala, LinkedIn, Workday, Direct ATS):
1. **Prevent Glitching on Login-Gated Portals (Naukri, Indeed, LinkedIn):** Auto-detect portal login barriers, extract direct company apply links when available, and provide a polite, non-blocking pause with a clear prompt for 1-click user authentication.
2. **Strict Single-Job Targeted Auto-Apply:** When clicking "Apply" on a single job card, guarantee execution only for that specific position (1 job target) with dedicated status tracking.
3. **Portal Pre-Requisites & Login Readiness Notice:** Display clear portal prerequisites (active Naukri/Indeed/LinkedIn session notification) before auto-apply execution.
4. **Pill-Shaped 1-Click Cancel Control:** Provide a prominent, persistent pill-shaped button (`[ 🛑 Cancel Auto-Apply ]`) across both the floating dock and simulator modal for instant, graceful abort of the Playwright worker pool.

---

## 2. Root Cause Analysis

### Issue A: Login Walls Glitching on Portals (Naukri / Indeed / LinkedIn)
- **Cause:** When navigating to portals like Naukri (`naukri.com/job-listings`), Indeed (`in.indeed.com/viewjob`), or Internshala, these portals present login modals or redirects (`/nlogin/login` or iframe auth).
- **Current Behavior:** The engine attempts to query standard ATS selectors (`input[name="email"]`, resume upload dropzones) before checking if a portal login dialog is active. Playwright throws timeout errors or tries typing into obscured elements, causing the runner to fail or report misleading statuses.
- **Solution:** 
  1. Detect known portal domains (`naukri.com`, `indeed.com`, `internshala.com`, `linkedin.com`, `myworkdayjobs.com`).
  2. If the portal contains an **"Apply on company website"** button, click or extract the external ATS URL (Greenhouse, Lever, Ashby, Workday) and navigate directly there, completely bypassing the portal login requirement.
  3. If it is a native portal form (e.g. Naukri 1-Click Apply) requiring authentication, activate the **Login Gatekeeper**:
     - Inject prominent high-contrast overlay in the Chrome window: `🔐 Portal Sign-In Required — Please log in in this browser window. Autopilot will resume automatically.`
     - Stream live status: `[Autonomous] 🔐 Sign-in required for Naukri.com. Waiting for candidate login...`
     - Provide a generous 120s human-in-the-loop window with real-time session polling.
     - If the user logs in, resume form filling immediately. If canceled or timed out, record `requires_login` and leave the page open for manual submission.

### Issue B: Single-Job vs Batch Auto-Apply Isolation
- **Cause:** While card-level clicks pass `[job.applyUrl]`, the modal and logs display generic batch text ("Automated application queue for 1 positions..."), creating ambiguity about whether the system is applying for 1 job or triggering a full batch.
- **Solution:**
  - Distinct Execution Modes:
    - **Single-Job Mode:** Displays `"Target: Applying to <Job Title> at <Company>"` with targeted progress steps.
    - **Batch Queue Mode:** Displays `"Batch Queue: <N> selected positions"` with sequential batch counters.
  - Distinct Card Action: Card button explicitly reads `⚡ Auto-Apply (This Job)`.

### Issue C: Pre-Requisite Awareness
- **Cause:** Candidates are often unaware that applying to Naukri/Indeed requires having an active session or profile on those platforms.
- **Solution:** Add a lightweight Pre-Requisite badge & tooltip on portal-sourced jobs in `FeedView.tsx` and in the pre-apply modal:
  - Direct ATS (Ashby/Greenhouse/Lever): `✓ Zero Login Required (Direct ATS)`
  - Portal Jobs (Naukri/Indeed/Internshala): `ℹ️ Portal Session / 1-Click Login`

### Issue D: Pill-Shaped Cancel Button
- **Cause:** The cancel button was previously a standard rectangular button in the modal footer.
- **Solution:** Replace with a dedicated, ergonomic pill-shaped cancel button:
  - **Shape:** `rounded-full` pill with red-rose gradient accent.
  - **Placement:** Positioned in both the active progress modal and floating bottom status pill with instant cancellation IPC (`cancel-autonomous-apply`).

---

## 3. Step-by-Step Implementation Tasks

### Phase 1: Overhaul Portal & Login Gatekeeper in Playwright Engine
- **File:** `packages/automation/src/auto-apply-engine.ts`
- **Actions:**
  1. Add `detectAndBypassPortalRedirect(page: Page): Promise<string | null>`:
     - Detects buttons like `"Apply on company website"`, `"Apply directly"`, `"Company URL"`.
     - Extracts the direct target URL and redirects the Playwright worker directly to the company ATS.
  2. Enhance `detectLoginRequired(page: Page)`:
     - Add specific selectors for Naukri (`.login-layer`, `a[href*="nlogin"]`, `form[name="loginForm"]`), Indeed (`form[action*="login"]`, `button[data-gnav-element-name="SignInButton"]`), LinkedIn (`.authwall-join-form`, `.sign-in-modal`), and Workday (`button[data-automation-id="signInButton"]`).
  3. Expand `waitForLoginComplete(page, onProgress, maxWaitMs = 120000)`:
     - Polling loop every 1.5s checking if the login overlay/redirect has cleared.
     - Automatically resumes form fill once authenticated.

### Phase 2: Refine Main Process Dispatcher & Single-Job Isolation
- **File:** `apps/desktop/src/main/index.ts`
- **Actions:**
  1. Update `launch-autonomous` handler:
     - Distinguish between `single` mode (1 job) and `batch` mode (> 1 job).
     - Provide clean logs: `[Auto-Apply] Processing single position: <Company> (<Title>)`.
     - Respect `isAutoApplyCanceled` atomically before and after each step.
  2. Add `requires_login` status code to SQLite `applications` table so login-gated jobs are clearly marked for the user to finish in 1-click.

### Phase 3: Enhance FeedView UI (Pill Cancel, Single-Job Buttons & Prerequisites)
- **File:** `apps/desktop/src/renderer/components/FeedView.tsx`
- **Actions:**
  1. **Pill Cancel Button:** Render a floating pill button `[ 🛑 Cancel Auto-Apply ]` at `fixed bottom-6 left-1/2 -translate-x-1/2` whenever `executingAutoApply === true`, plus inside the progress modal.
  2. **Single-Job Card Button:** Update card action to `Apply This Job` with specific company/title context passed to the progress modal.
  3. **Portal Pre-Requisite Pill:** On jobs from Naukri, Indeed, or Internshala, render a small info indicator: `Requires Portal Login`.
  4. **Progress Modal Detail:** Show the exact job title and company currently being applied to.

### Phase 4: Verification & Automated Vitest Tests
- **File:** `packages/automation/src/__tests__/auto-apply.test.ts`
- **Actions:**
  1. Test login detection on mock Naukri, Indeed, and LinkedIn HTML fixtures.
  2. Test company website redirect bypass.
  3. Test single-job target execution and cancellation signal propagation.

---

## 4. Files to Change

| File | Purpose |
|------|---------|
| `packages/automation/src/auto-apply-engine.ts` | Portal redirect extraction, login wall detection, and non-blocking human-in-the-loop wait loop |
| `apps/desktop/src/main/index.ts` | IPC handler updates, single vs batch mode logging, and cancellation safety |
| `apps/desktop/src/renderer/components/FeedView.tsx` | Pill cancel button, single-job button clarity, portal login prerequisite tags, and simulator modal overhaul |
| `packages/automation/src/__tests__/auto-apply.test.ts` | Unit & integration tests for portal detection and cancellation |

---

## 5. Risk Assessment & Mitigations

| Risk | Mitigation |
|------|------------|
| Portal shows anti-bot CAPTCHA during login | Engine detects CAPTCHA, pauses automation, notifies user with overlay, and leaves the tab open for manual review. |
| User cancels mid-navigation | `isAutoApplyCanceled` flag checked before and after all async operations, closing Playwright pages gracefully without leaving orphaned Chrome processes. |
| Single-job apply triggers inadvertent batch | `checkProfileAndRun` passes strictly the single URL `[job.applyUrl]` and enforces `targetUrls.length === 1` execution path. |

---

## 6. Verification Plan
1. Run `npx vitest run` across all 19 test suites.
2. Build desktop binaries with `npm run build:desktop && npm run package:desktop`.
3. Test portal job URLs (Naukri, Indeed, Internshala) vs direct ATS URLs (Greenhouse, Lever, Ashby).
4. Verify pill-shaped cancel button terminates execution instantly.
