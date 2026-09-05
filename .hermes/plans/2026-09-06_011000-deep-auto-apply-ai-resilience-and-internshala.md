# Deep Autonomous Auto-Apply Architecture & AI Resilience Plan: Multi-Step Wizards, iFrame Traversal, Popup Handlers, 3-Color Dynamic Status Pill & Live Internshala Stream

**Plan ID:** `2026-09-06_011000-deep-auto-apply-ai-resilience-and-internshala`  
**Workspace:** `C:\Users\sajal\projects\nomadic`  
**Packages:** `packages/automation`, `packages/scrapers`, `apps/desktop`  
**Author:** Antigravity / Deep Thinking & Autonomous Systems Architect

---

## 1. Goal
Engineer a resilient, autonomous auto-apply engine with real-time dynamic micro-step reporting, a 3-color status pill (Grey for Processing, Green for Success, Red for User Input), multi-step wizard stepper support, iFrame penetration, popup tracking, live Internshala scraping, and persistent 1-click portal login sessions.

---

## 2. 3-Color Dynamic Status Pill & Real-Time Action Architecture

The system features a unified status reporting architecture that synchronizes the floating pill in the desktop app UI with the on-screen `#nomadic-overlay` banner inside the external Chrome automation window.

### The 3 Visual Color States:
1. **Grey / Slate (`grey` — `#475569` / `bg-slate-900 text-slate-200 border-slate-700`) — Processing:**
   - Active whenever the engine is autonomously executing an action without requiring user assistance.
   - **Real-Time Specific Messages:**
     - `"Navigating to application portal..."`
     - `"Typing candidate contact details (Name, Email, Phone)..."`
     - `"Selecting work authorization & demographic dropdowns..."`
     - `"Synthesizing AI answers to open-ended employer questions..."`
     - `"Attaching matching PDF resume..."`
     - `"Checking required compliance & privacy checkboxes..."`
     - `"Advancing to next application step (Step 2/3)..."`
     - `"Submitting application form..."`

2. **Green (`green` — `#16a34a` / `bg-emerald-600 text-white border-emerald-500`) — Success:**
   - Active when an application has been strictly submitted and confirmed by the ATS receiver.
   - **Real-Time Specific Message:**
     - `"✓ Verified Application Submitted & Confirmed!"`

3. **Red (`red` — `#dc2626` / `bg-rose-600 text-white border-rose-500 animate-pulse`) — User Input Required:**
   - Active whenever automation pauses and explicitly requests human-in-the-loop action.
   - **Real-Time Specific Messages:**
     - `"🔐 Action Needed: Sign in to portal in Chrome window (Autopilot will resume)"`
     - `"⚠️ Action Needed: Solve CAPTCHA challenge in Chrome window"`
     - `"✋ Action Needed: Review pre-filled form & click Submit in browser"`

---

## 3. Deep Root-Cause Analysis & Failure Modes

### Failure Mode 1: Job Description Landing Pages & Popup Windows (`target="_blank"`)
- **Root Cause:** Clicking "Apply" on landing pages or job boards opens a child tab via `window.open` or `<a target="_blank">`.
- **Why It Fails:** Playwright's `page` variable remains attached to the parent page, while the form is rendered inside the new popup tab.
- **Fix:** Register an active popup listener on `BrowserContext` (`context.on('page', ...)`). When a popup opens, transfer execution to the active form page immediately.

### Failure Mode 2: Multi-Step Wizard Application Steppers
- **Root Cause:** Modern ATS systems (Workday, Taleo, iCIMS, Greenhouse Multi-Page, Lever Multi-Step) break applications into sequential pages (Step 1: Contact -> Step 2: Experience & Resume -> Step 3: Custom Questions -> Step 4: Disclosures -> Step 5: Review & Submit).
- **Why It Fails:** Single-pass scripts execute once, fill Step 1 inputs, fail to find a final "Submit" button, and stop without advancing.
- **Fix:** Implement an **Autonomous Multi-Step Application Loop** (up to 8 steps) that iteratively:
  1. Fills all visible fields, dropdowns, and uploads on the current page/frame.
  2. Detects navigation triggers (`"Next"`, `"Continue"`, `"Save & Continue"`, `"Proceed to Application"`, `"Review Application"`).
  3. Clicks to advance, waits for DOM settlement, updates the status pill (`"Advancing to Step N..."`), and repeats until the final `"Submit Application"` confirmation is reached.

### Failure Mode 3: Forms Embedded in Nested `<iframe>` Elements
- **Root Cause:** Career portals often embed Greenhouse, Lever, or Ashby inside an `<iframe>` (e.g. `<iframe src="https://boards.greenhouse.io/embed/job_app?...">`).
- **Why It Fails:** `page.$('input')` only queries the top-level document, missing all inputs inside iframe framesets.
- **Fix:** Recursively scan `page.frames()` for form containers, input fields, and file upload elements.

### Failure Mode 4: Non-Standard / Custom Dropdowns & File Uploaders
- **Root Cause:** Modern web forms use custom React/Vue components (`div[role="combobox"]`, React-Select, Radix UI, Headless UI, drag-and-drop dropzones without standard `<select>` or visible `<input type="file">`).
- **Fix:**
  - Dropdowns: Search for `[role="combobox"]`, `.select__control`, and trigger-click to search and pick options matching candidate preferences.
  - File Uploads: Unhide hidden `<input type="file">` elements using `el.evaluate(node => node.style.display = 'block')` before attaching files with `setInputFiles`.

### Failure Mode 5: Internshala & Portal Login / Modal Traps
- **Root Cause:**
  1. Internshala scraper previously had synthetic slug IDs (`rzp-fe-intern-2026`) that 404'd when loaded.
  2. Real Internshala applications pop up a multi-question modal ("Why should you be hired?", "Are you available for 3/6 months?", "Assessment questions").
- **Fix:**
  1. Real Scraper: Parse live Internshala categories via Cheerio/Fetch (`/internships/software-development-internship/`, `/internships/matching-preferences/`, and RSS feeds) with actual live detail URLs.
  2. Modal Solver: Auto-detect Internshala's question dialogs and synthesize first-person candidate responses using the in-house AI solver.
  3. Persistent Session Storage: Nomadic's Chromium profile (`%APPDATA%/Nomadic/browser_session`) already preserves cookies. Add a **"Portal Login Assistant"** in `DependenciesView.tsx` / `ProfileView.tsx` so users can log in to Naukri, Indeed, Internshala, and LinkedIn once, remaining logged in forever.

### Failure Mode 6: Universal Form Field Variations & Custom HTML
- **Root Cause:** Every ATS and custom career site uses different `id`, `name`, `aria-label`, or custom classes for standard fields.
- **Why It Fails:** Hardcoded selectors like `input[name="first_name"]` miss variants like `input[name="ApplicantFirstName"]` or `<custom-input id="c_123">`.
- **Fix (Universal Compatibility):** Establish a **Full-Proof Universal Pattern Matcher**. Expand `ATS_FIELD_ALIASES` to use deep predictive Regex matching over `name`, `id`, `placeholder`, `aria-label`, and nearby `<label>` text content. Combine this with the Multi-Step Stepper & iFrame traverser so virtually **any unstructured web form** is detected and filled.

---

## 4. High-Level Architecture Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│               NOMADIC AUTONOMOUS AUTO-APPLY PIPELINE                  │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
          ┌────────────────────────────────────────────────┐
          │  1. URL Navigation & Target-Page Resolution    │
          │  - Navigate with Persistent Session Profile    │
          │  - Attach context popup listener (target=_blank)│
          │  - Status: GREY ("Navigating to portal...")    │
          └────────────────────────────────────────────────┘
                                   │
                                   ▼
          ┌────────────────────────────────────────────────┐
          │  2. Login & CAPTCHA Barrier Interceptor       │
          │  - If Login Wall: RED ("🔐 Sign in to portal") │
          │  - If CAPTCHA: RED ("⚠️ Solve CAPTCHA in tab") │
          └────────────────────────────────────────────────┘
                                   │
                                   ▼
          ┌────────────────────────────────────────────────┐
          │  3. Autonomous Multi-Step Stepper Loop (Max 8) │
          │  ┌──────────────────────────────────────────┐  │
          │  │ a. Scan Top Page & All Nested iFrames    │  │
          │  │ b. Fill Aliased Inputs: GREY ("Typing..")│  │
          │  │ c. Fill Dropdowns: GREY ("Selecting...") │  │
          │  │ d. Answer Questions: GREY ("AI Solving") │  │
          │  │ e. Unhide & Upload Resume: GREY ("PDF")  │  │
          │  │ f. Check Consent Checkboxes: GREY        │  │
          │  │ g. Click "Next": GREY ("Step N+1...")    │  │
          │  │ h. Click "Submit": GREY ("Submitting...")│  │
          │  └──────────────────────────────────────────┘  │
          └────────────────────────────────────────────────┘
                                   │
                                   ▼
          ┌────────────────────────────────────────────────┐
          │  4. Strict Two-Stage Confirmation Verification │
          │  - Check URL (/confirmation, /thanks, /applied)│
          │  - Check DOM Text ("Application Received")     │
          │  - Status: GREEN ("✓ Confirmed Submitted!")    │
          └────────────────────────────────────────────────┘
                                   │
                                   ▼
          ┌────────────────────────────────────────────────┐
          │  5. Status Logging & State Synchronization    │
          │  - applied: ✓ Verified submission confirmation │
          │  - prefilled: Form filled, manual submit ready │
          │  - requires_login: Session needed on portal    │
          │  - captcha_blocked: Human solve required       │
          │  - failed: Unfillable / dead job posting       │
          └────────────────────────────────────────────────┘
```

---

## 5. Step-by-Step Implementation Tasks

### Task 1: Structured Status Event Definition & Engine Overlay Synchronization
**Target File:** `packages/automation/src/auto-apply-engine.ts`

- **Implementation Details:**
  1. Define `AutoApplyStatusEvent`:
     ```ts
     export interface AutoApplyStatusEvent {
       phase: 'navigating' | 'filling' | 'answering' | 'uploading' | 'submitting' | 'advancing' | 'success' | 'user_input_required' | 'cancelled';
       message: string;
       colorState: 'grey' | 'green' | 'red';
       progress?: number;
       actionRequired?: string;
     }
     ```
  2. Implement `emitStatus(page: Page, event: AutoApplyStatusEvent, onProgress)`:
     - Injects high-contrast `#nomadic-overlay` banner into the browser DOM with matching colors:
       - `grey`: `#334155` background with `#94a3b8` text
       - `green`: `#065f46` background with `#34d399` text
       - `red`: `#991b1b` background with `#fca5a5` text
     - Calls `onProgress(event)` to broadcast structured event to Electron main process.

### Task 2: Multi-Step Stepper, Popup Listener & iFrame Penetration
**Target File:** `packages/automation/src/auto-apply-engine.ts`

- **Implementation Details:**
  1. Register popup tracker on page creation:
     ```ts
     const [popupPage] = await Promise.all([
       page.waitForEvent('popup', { timeout: 3500 }).catch(() => null),
       triggerBtn.click().catch(() => {})
     ]);
     if (popupPage) {
       page = popupPage;
       await page.bringToFront();
     }
     ```
  2. Implement `executeAutonomousStepper(page: Page, profile: MasterProfile, emitStatus)`:
     - Iterates up to 8 steps.
     - Scans `[page, ...page.frames()]` for form inputs.
     - Advances through `"Next"`, `"Continue"`, `"Save & Continue"` buttons until reaching final submission.

### Task 3: Real-Time Event IPC Bridge in Main Process
**Target File:** `apps/desktop/src/main/index.ts`

- **Implementation Details:**
  1. Connect `submitApplication` status events to IPC:
     ```ts
     const result = await AutoApplyEngine.submitApplication(url, profile, (statusEvent) => {
       mainWindow?.webContents.send('auto-apply-progress', statusEvent);
     });
     ```
  2. Handle cancellation safely during any step.

### Task 4: 3-Color Dynamic Status Pill & Modal in Desktop UI
**Target File:** `apps/desktop/src/renderer/components/FeedView.tsx`

- **Implementation Details:**
  1. State variables:
     ```tsx
     const [pillColorState, setPillColorState] = useState<'grey' | 'green' | 'red'>('grey');
     const [pillMessage, setPillMessage] = useState<string>('Initializing auto-apply...');
     ```
  2. Render floating pill at `fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]`:
     ```tsx
     <div className={`px-5 py-2.5 rounded-full border text-xs font-bold shadow-2xl flex items-center gap-3 transition-all duration-300 ${
       pillColorState === 'green'
         ? 'bg-emerald-600 border-emerald-400 text-white'
         : pillColorState === 'red'
         ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
         : 'bg-slate-900 border-slate-700 text-slate-200'
     }`}>
       <span className={`w-2 h-2 rounded-full ${
         pillColorState === 'green' ? 'bg-white' : pillColorState === 'red' ? 'bg-amber-300 animate-ping' : 'bg-slate-400'
       }`} />
       <span>{pillMessage}</span>
       <div className="h-3 w-px bg-white/20" />
       <button onClick={handleCancelAutoApply} className="text-xs hover:underline opacity-90">
         Cancel
       </button>
     </div>
     ```

### Task 5: Real Internshala Category Scraper & Modal Auto-Solver
**Target File:** `packages/scrapers/src/internshala-scraper.ts`

- **Implementation Details:**
  1. Scrape real live URLs from Internshala developer streams.
  2. Synthesize answers to standard Internshala modal questions via in-house AI solver.

### Task 6: Portal Session Manager in Diagnostics UI
**Target File:** `apps/desktop/src/renderer/components/DependenciesView.tsx`

- **Implementation Details:**
  1. Add **"Portal Login Sessions"** card with 1-click launch buttons:
     - `Connect Naukri.com`
     - `Connect Indeed India`
     - `Connect Internshala`
     - `Connect LinkedIn`
  2. Sessions permanently saved in persistent Chromium profile.

---

## 6. Verification Plan

### Test Commands
```bash
# 1. Run full automation test suite
npx vitest run packages/automation

# 2. Run scrapers test suite
npx vitest run packages/scrapers

# 3. Full monorepo test suite
npx vitest run

# 4. Build desktop package
npm run build:desktop && npm run package:desktop
```

---

## 7. Risks, Tradeoffs & Mitigations

| Risk | Mitigation |
|------|------------|
| Rapid progress events causing UI re-render thrashing | Throttle status events in UI with a 150ms debounce for smoother animation. |
| User closes browser during RED user action state | Engine detects tab closure, logs `requires_login`, and continues to next queue item gracefully. |
| Complex multi-step forms take longer to complete | Stepper loop bounded to max 8 steps with 500ms DOM-settle debounce. |
