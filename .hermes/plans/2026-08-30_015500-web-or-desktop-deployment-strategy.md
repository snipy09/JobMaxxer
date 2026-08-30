# JobMaxxer Web Deployment & Desktop Strategy Plan

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Make JobMaxxer accessible as a web application while keeping desktop-only capabilities optional, so learners and job seekers can use the product without downloading an `.exe`.

**Architecture:** Build a responsive React web app for the Learner experience, Job Board, saved jobs, application tracker, profile, payments, and outreach drafting. Keep browser automation (semi-auto/autonomous Playwright applying), local SMTP, native file management, and persistent browser profiles as a separately packaged optional desktop companion because normal browsers cannot safely or reliably run those capabilities.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Supabase (Postgres, RLS, Edge Functions), Razorpay, Vercel/Cloudflare Pages/Netlify free hosting; Electron + Playwright retained for desktop automation companion.

---

## Decision: Desktop Is Not Mandatory

JobMaxxer can be deployed as a web app. In fact, a web product is better for the **Learner Track**, payment conversion, onboarding, SEO/marketing pages, profile cloud sync, and the standard **Seeker Job Board**.

However, a normal web browser cannot reliably do the following:

| Feature | Web app | Desktop companion | Reason |
|---|---:|---:|---|
| Learner roadmaps, resources, interview prep | ✅ | ✅ | Standard UI/data workload |
| Login, profile, cloud sync, payments | ✅ | ✅ | Supabase + Razorpay work well on web |
| Job board, filtering, saved jobs, tracking | ✅ | ✅ | Standard web application feature |
| Outreach templates and “open Gmail compose” | ✅ | ✅ | Web can draft/open compose links |
| Sending email via user SMTP credentials | ⚠️ Avoid | ✅ | Web should not receive/store raw SMTP passwords |
| Semi-auto form fill in a user-controlled browser | ⚠️ Extension needed | ✅ | Cross-site DOM access requires extension/native app |
| Fully autonomous Playwright apply engine | ❌ | ✅ | Playwright needs a local/server browser process; server-side automation has severe consent, compliance, cookie, CAPTCHA, and security issues |
| Local resume file paths and native file storage | ⚠️ Upload only | ✅ | Browser cannot retain native paths reliably |
| Single-laptop lock | ✅ | ✅ | Enforce server-side by session/device policy |

### Recommended Product Shape

1. **Web app first:** `app.jobmaxxer.com`
   - Free learner funnel
   - Job board and application tracking
   - Profile/resume uploads and cloud sync
   - Razorpay checkout and account management
   - Outreach drafting and email-template workflow

2. **Optional JobMaxxer Desktop Agent:**
   - A paid companion download for users who choose semi-auto or autonomous application assistance.
   - Connects to the same Supabase account and respects the same single-device policy.
   - Performs local browser automation only after an explicit user action.

This avoids forcing every learner to install software while preserving the differentiating automation feature for paying seekers.

---

## Current Context & Assumptions

- Existing desktop app: `apps/desktop/` using Electron + React + Vite + Tailwind.
- Existing renderer is mostly portable React UI but assumes Electron IPC through `getApi()` and `preload.ts`.
- Existing backend: `packages/supabase/`, migrations `001`–`003`, cloud sync and single-laptop lock.
- Razorpay integration is planned but not yet implemented.
- Existing browser API shim (`apps/desktop/src/renderer/browserApiShim.ts`) demonstrates a possible fallback pattern but must not be used as a fake production backend.
- Goal is minimum recurring infrastructure cost. Vercel/Cloudflare Pages/Netlify free tiers plus Supabase free tier may be sufficient for beta, subject to their current limits.

---

## Product Rollout Order

### Phase A — Web MVP (launch this first)

- Learner Track
- Seeker Job Board
- Profile, resume upload, saved jobs, application log
- Razorpay checkout and licensing
- Outreach templates / mailto or Gmail compose opening
- Responsive marketing landing page

### Phase B — Desktop Agent (retain as optional premium module)

- Semi-auto form prefill with user review
- Local application automation
- Optional autonomous mode with clear consent controls
- Native resume file selection, local browser profile, and local email tooling

### Phase C — Optional Browser Extension

- A Chrome/Edge extension could later provide limited in-browser assisted form-fill from the web dashboard.
- Do not build this before validating that the web MVP and desktop companion convert users.

---

## Detailed Task Breakdown

---

### Task 1: Separate Shared React UI from Desktop-Only Services

**Objective:** Identify components that work in both web and Electron, and isolate APIs requiring a local desktop process.

**Files:**
- Create: `apps/shared-ui/` or `packages/ui/`
- Move/modify: `apps/desktop/src/renderer/components/*.tsx`
- Modify: `apps/desktop/src/renderer/types.ts`
- Create: `packages/core-api/src/types.ts`
- Test: `packages/core-api/src/__tests__/capabilities.test.ts`

**Step 1: Define explicit capability types**

```typescript
export type AppPlatform = 'web' | 'desktop';

export interface AppCapabilities {
  platform: AppPlatform;
  supportsLocalBrowserAutomation: boolean;
  supportsAutonomousApply: boolean;
  supportsNativeFilePaths: boolean;
  supportsLocalSmtp: boolean;
}

export const WEB_CAPABILITIES: AppCapabilities = {
  platform: 'web',
  supportsLocalBrowserAutomation: false,
  supportsAutonomousApply: false,
  supportsNativeFilePaths: false,
  supportsLocalSmtp: false,
};

export const DESKTOP_CAPABILITIES: AppCapabilities = {
  platform: 'desktop',
  supportsLocalBrowserAutomation: true,
  supportsAutonomousApply: true,
  supportsNativeFilePaths: true,
  supportsLocalSmtp: true,
};
```

**Step 2: Write a failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { WEB_CAPABILITIES, DESKTOP_CAPABILITIES } from '../capabilities';

describe('platform capabilities', () => {
  it('does not expose local automation in the web app', () => {
    expect(WEB_CAPABILITIES.supportsAutonomousApply).toBe(false);
  });

  it('keeps local automation available for the desktop agent', () => {
    expect(DESKTOP_CAPABILITIES.supportsAutonomousApply).toBe(true);
  });
});
```

**Step 3: Run test to verify failure**

Run: `npx vitest run packages/core-api/src/__tests__/capabilities.test.ts`
Expected: FAIL — module does not exist.

**Step 4: Implement capabilities and refactor components to consume them**

- Shared components must receive a typed API/capabilities dependency rather than importing Electron globals.
- Render an “Open Desktop Agent” CTA when a web user reaches an automation-only action.
- Do not hide automation limitations or simulate automation in the web client.

**Step 5: Verify pass**

Run: `npx vitest run packages/core-api/src/__tests__/capabilities.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add packages/core-api apps/desktop/src/renderer
git commit -m "refactor: define shared platform capability boundaries"
```

---

### Task 2: Scaffold the Web Application

**Objective:** Create a standalone web app consuming the existing React UI and Supabase cloud backend.

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/webApi.ts`
- Modify: root `package.json`
- Test: `apps/web/src/__tests__/App.test.tsx`

**Step 1: Add workspace scripts**

```json
{
  "scripts": {
    "dev:web": "npm run dev --prefix apps/web",
    "build:web": "npm run build --prefix apps/web",
    "preview:web": "npm run preview --prefix apps/web"
  }
}
```

**Step 2: Write a failing app-shell test**

```tsx
import { render, screen } from '@testing-library/react';
import App from '../App';

it('renders the JobMaxxer web app shell', () => {
  render(<App />);
  expect(screen.getByText(/JobMaxxer/i)).toBeInTheDocument();
});
```

**Step 3: Implement web shell**

- Build from existing renderer visual language.
- Use `WEB_CAPABILITIES`.
- Use direct Supabase calls only for operations that are explicitly permitted by secure RLS/RPCs.
- Add `.env.example` values only for public browser values:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_RAZORPAY_PAYMENT_LINK_PRO=
VITE_RAZORPAY_PAYMENT_LINK_TURBO=
VITE_DESKTOP_AGENT_DOWNLOAD_URL=
```

**Never include `SUPABASE_SERVICE_ROLE_KEY` or `RAZORPAY_KEY_SECRET` in a browser build.**

**Step 4: Verify**

Run: `npm run build:web`
Expected: successful Vite build under `apps/web/dist/`.

**Step 5: Commit**

```bash
git add apps/web package.json
git commit -m "feat(web): scaffold JobMaxxer browser app"
```

---

### Task 3: Implement Web-Safe Authentication, Profile, and Cloud Sync

**Objective:** Make accounts, profile data, learner progress, saved jobs, and job tracking work through the web client without exposing secrets.

**Files:**
- Create: `apps/web/src/services/supabaseClient.ts`
- Create: `apps/web/src/services/webSync.ts`
- Modify: `packages/supabase/migrations/004_learner_track.sql` (if learner progress is implemented)
- Modify: `packages/supabase/src/index.ts`
- Test: `apps/web/src/services/__tests__/webSync.test.ts`

**Step 1: Define web-safe sync contract**

```typescript
export interface WebSyncApi {
  pullProfile(): Promise<CloudProfile | null>;
  saveProfile(profile: CloudProfile): Promise<void>;
  pullSavedJobs(): Promise<SavedJob[]>;
  saveJob(job: SavedJob): Promise<void>;
  removeSavedJob(applyUrl: string): Promise<void>;
}
```

**Step 2: Write failing RPC tests**

- Test authentication failure when there is no active user/device session.
- Test success with a valid session.
- Test that user A cannot pull or mutate user B data.

**Step 3: Implement or adapt secure RPCs**

- Prefer native Supabase Auth before broad web release; current custom hash/RPC login is not ideal for public web authentication.
- If custom auth remains temporarily, do not use offline login fallback in the web app.
- Cloud profile sync must exclude raw SMTP credentials. Store integrations with OAuth or keep them desktop-only.

**Step 4: Verify**

Run: `npx vitest run apps/web/src/services/__tests__/webSync.test.ts packages/supabase/src/__tests__`
Expected: all tests pass.

**Step 5: Commit**

```bash
git add apps/web packages/supabase
git commit -m "feat(web): add web-safe account and cloud sync services"
```

---

### Task 4: Build the Web Learner Track

**Objective:** Deliver the complete free acquisition funnel in the browser: roadmaps, resources, progress, readiness score, interview prep, and upgrade CTA.

**Files:**
- Create: `apps/web/src/features/learner/LearnerPage.tsx`
- Create: `apps/web/src/features/learner/RoadmapProgress.tsx`
- Create: `apps/web/src/features/learner/ResourceVault.tsx`
- Reuse/move: `apps/desktop/src/renderer/data/roadmaps.ts`
- Test: `apps/web/src/features/learner/__tests__/LearnerPage.test.tsx`

**Step 1: Write failing behavior tests**

```tsx
it('shows learner tracks to unauthenticated visitors', () => {
  render(<LearnerPage />);
  expect(screen.getByText(/Career Roadmaps/i)).toBeInTheDocument();
});

it('persists completed roadmap milestones for logged-in users', async () => {
  // Mock WebSyncApi, toggle milestone, assert sync call.
});
```

**Step 2: Implement only the four launch roadmaps**

- Frontend
- Backend
- Full Stack
- AI/LLM Application Developer

Do not delay launch by attempting six or more complete tracks. Add DevOps, Mobile, Data, and UI/UX after learner engagement data confirms demand.

**Step 3: Add conversion moments**

- Let everyone view learning content without payment.
- At 40–60% readiness, offer “See jobs matching your skills.”
- On seeker tools, show Razorpay paid plan CTA.

**Step 4: Verify**

Run: `npx vitest run apps/web/src/features/learner`
Expected: all tests pass.

**Step 5: Commit**

```bash
git add apps/web/src/features/learner
git commit -m "feat(web): launch learner roadmaps and resource vault"
```

---

### Task 5: Build Web Seeker Job Board and Application Tracker

**Objective:** Make job discovery and application tracking web-native; reserve browser automation for the Desktop Agent.

**Files:**
- Create: `apps/web/src/features/seeker/JobBoardPage.tsx`
- Create: `apps/web/src/features/seeker/ApplicationTrackerPage.tsx`
- Create: `apps/web/src/features/seeker/DesktopAgentCta.tsx`
- Reuse/adapt: `apps/desktop/src/renderer/components/FeedView.tsx`
- Test: `apps/web/src/features/seeker/__tests__/JobBoardPage.test.tsx`

**Step 1: Define web feature behavior**

| Action | Web behavior |
|---|---|
| View jobs | Full feature for paid Seeker tier; limited preview for Free/Learner tier |
| Save a job | Save to Supabase cloud |
| Apply manually | Open official `apply_url` in a new browser tab |
| Track applied status | Create/update cloud application entry |
| Semi-auto apply | Show desktop-agent download/install CTA |
| Autonomous apply | Show desktop-agent CTA; never run server-side by default |

**Step 2: Write tests**

```tsx
it('opens the official application URL for manual web applications', async () => {
  // Assert window.open called with job.applyUrl.
});

it('shows Desktop Agent CTA for automation-only action', () => {
  render(<DesktopAgentCta feature="Semi-Auto Apply" />);
  expect(screen.getByText(/Download Desktop Agent/i)).toBeInTheDocument();
});
```

**Step 3: Implement filters and plan gates**

- Search, remote, title, location, source, match score.
- Server-side filter/pagination before feed volume grows.
- Use explicit feature gates from subscription tier, validated by the server rather than local client state.

**Step 4: Verify**

Run: `npx vitest run apps/web/src/features/seeker`
Expected: all tests pass.

**Step 5: Commit**

```bash
git add apps/web/src/features/seeker
git commit -m "feat(web): add seeker job board, tracker, and desktop automation CTA"
```

---

### Task 6: Make Outreach Web-Safe

**Objective:** Offer outreach templates and candidate-managed sending without exposing SMTP credentials in the browser.

**Files:**
- Create: `apps/web/src/features/outreach/OutreachPage.tsx`
- Create: `apps/web/src/features/outreach/templates.ts`
- Modify: `packages/supabase/migrations/003_cloud_sync_and_device_lock.sql` only if storage schema needs a secure template table
- Test: `apps/web/src/features/outreach/__tests__/OutreachPage.test.tsx`

**Step 1: Set the web boundaries**

- Web can generate personalized messages and open a prefilled Gmail/Outlook compose URL.
- Web can copy text and record outreach status.
- Web must not upload/store Gmail app passwords or raw SMTP secrets.
- OAuth-based sending may be planned later, but do not block MVP on it.

**Step 2: Implement first-party template rendering**

```typescript
export function renderOutreachTemplate(template: string, context: {
  recruiterName: string;
  company: string;
  role: string;
  candidateName: string;
  github?: string;
  portfolio?: string;
}): string {
  return template
    .replaceAll('{{recruiterName}}', context.recruiterName)
    .replaceAll('{{company}}', context.company)
    .replaceAll('{{role}}', context.role)
    .replaceAll('{{candidateName}}', context.candidateName);
}
```

**Step 3: Verify**

Run: `npx vitest run apps/web/src/features/outreach`
Expected: all tests pass.

**Step 4: Commit**

```bash
git add apps/web/src/features/outreach
git commit -m "feat(web): add web-safe recruiter outreach drafting"
```

---

### Task 7: Add Razorpay Web Checkout and Server-Side Entitlement Handling

**Objective:** Make web checkout work safely without exposing Razorpay secrets in the desktop or web bundle.

**Files:**
- Create: `apps/web/src/features/billing/UpgradeModal.tsx`
- Create: `packages/supabase/functions/razorpay-webhook/index.ts`
- Create: `packages/supabase/migrations/005_razorpay_payments.sql`
- Modify: `packages/supabase/src/index.ts`
- Test: `packages/supabase/src/__tests__/razorpay.test.ts`

**Step 1: Create Razorpay test payment links**

- Create a Razorpay account using test mode.
- Create test Payment Links for Pro and Turbo.
- Store only public link URLs in web environment variables:

```env
VITE_RAZORPAY_PAYMENT_LINK_PRO=
VITE_RAZORPAY_PAYMENT_LINK_TURBO=
```

**Step 2: Implement HMAC-verified webhook fulfillment**

- Store `RAZORPAY_WEBHOOK_SECRET` only in Supabase Edge Function secrets.
- Verify the raw payload HMAC before parsing/fulfilling it.
- Make fulfillment idempotent using Razorpay `payment_id` unique constraint.
- Never trust `plan`, price, amount, or `user_id` that arrives from the client URL alone; reconcile against server-created order/payment metadata.

**Step 3: Test**

Run: `npx vitest run packages/supabase/src/__tests__/razorpay.test.ts`
Expected: valid signature accepted; invalid signature rejected; duplicate payment does not double-extend entitlement.

**Step 4: Commit**

```bash
git add apps/web/src/features/billing packages/supabase
git commit -m "feat(billing): add Razorpay web checkout and secure entitlement webhook"
```

---

### Task 8: Deploy the Web App on a Free Host

**Objective:** Deploy the public web app without introducing a mandatory recurring hosting bill during beta.

**Files:**
- Create: `apps/web/.env.example`
- Create: `apps/web/vercel.json` or `apps/web/wrangler.toml` (choose only one host)
- Create: `.github/workflows/web-deploy.yml` if using GitHub Actions deployment
- Modify: `README.md`

**Step 1: Choose host**

Recommended order:

1. **Vercel** — simplest for Vite/React and custom domains; free plan for initial testing.
2. **Cloudflare Pages** — strong free static hosting; more configuration for functions.
3. **Netlify** — viable alternative.

Choose one only for beta. Do not deploy the same production app to three hosts.

**Step 2: Configure environment variables on host**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_RAZORPAY_PAYMENT_LINK_PRO`
- `VITE_RAZORPAY_PAYMENT_LINK_TURBO`
- `VITE_DESKTOP_AGENT_DOWNLOAD_URL`

Do not set service-role, SMTP passwords, webhook secrets, or Razorpay secret API credentials on the static site.

**Step 3: Deploy and verify**

Run locally:

```bash
npm run build:web
npm run preview:web
```

Then verify deployed app:

- Learner routes load after direct refresh.
- Login works.
- Job feed permission gates work.
- Razorpay link opens correctly in test mode.
- Webhook test event safely updates a test account.
- Desktop Agent download CTA points to a real release page.

**Step 4: Commit**

```bash
git add apps/web README.md .github/workflows/web-deploy.yml
git commit -m "chore(web): configure free-host web deployment"
```

---

### Task 9: Keep the Desktop App as the Optional Automation Agent

**Objective:** Clearly position desktop as an optional paid capability rather than the only way to use JobMaxxer.

**Files:**
- Modify: `apps/desktop/src/renderer/components/LoginView.tsx`
- Modify: `apps/desktop/src/renderer/components/HomeView.tsx`
- Modify: `README.md`
- Create: `apps/web/src/features/seeker/DesktopAgentDownloadPage.tsx`

**Step 1: Update product copy**

Use clear copy:

> Use JobMaxxer on the web to learn, discover jobs, manage your profile, and track applications. Install the optional Desktop Agent only when you want local assisted application workflows.

**Step 2: Ensure handoff is account-based**

- Web and desktop log into the same Supabase account.
- Desktop must pull cloud profile and saved jobs on login.
- Single-device policy applies to the desktop automation agent, not necessarily a read-only web dashboard session. Define the policy deliberately:
  - Recommended: One active automation device per account; allow secure web dashboard viewing.
  - Strict alternative: One active session on all platforms. This hurts support, onboarding, and conversion.

**Step 3: Verify**

- User can use learner and job-board features on web.
- User is asked to install desktop only after selecting automation.
- Desktop sees the same cloud profile and saved jobs.

**Step 4: Commit**

```bash
git add apps/desktop apps/web README.md
git commit -m "feat(product): position desktop as optional JobMaxxer automation agent"
```

---

## Security & Compliance Requirements

- Never place `SUPABASE_SERVICE_ROLE_KEY`, Razorpay API secrets, webhook secrets, SMTP passwords, or Groq keys in `apps/web` source or `VITE_*` environment variables.
- Do not run autonomous job applications from a shared cloud server during the MVP. It creates account, consent, scraping, CAPTCHA, IP reputation, and compliance risks.
- Make every auto-apply action explicit, rate-limited, and user-confirmed in the Desktop Agent.
- Make unsubscribe controls and outreach consent visible. Do not promise “0% bounce” or “0-bounce” as an absolute guarantee.
- Use HMAC-validated Razorpay webhooks and idempotent payment records. A redirect back from Razorpay is never enough to grant access.

---

## Acceptance Criteria

1. A new person can use JobMaxxer from a browser without installing Electron.
2. Learner roadmaps and resources work in the web app.
3. A paid seeker can access the web Job Board, saved jobs, profile, and tracker.
4. Web user who requests automation is directed to an optional Desktop Agent rather than receiving a broken browser workflow.
5. Razorpay upgrade is fulfilled by a verified server-side webhook, never client-side claim alone.
6. The desktop agent and web application share the same cloud data and entitlement source.
7. `npx vitest run`, `npm run build:web`, and `npm run build:desktop` pass before release.
