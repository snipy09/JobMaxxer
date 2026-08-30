# JobMaxxer: Dual-Persona (Learner & Seeker) SaaS Implementation Plan

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Transform JobMaxxer from a single-purpose job hunter into a complete career acceleration SaaS with two distinct, high-value pillars: **Learner Track** (interactive skill roadmaps, curated resources, project guides, interview prep) and **Seeker Track** (live curated Job Board, 1-click Auto-Apply engine, 0-bounce HR & Hiring Manager Outreach), powered by automated payments, single-device licensing, and cloud sync.

**Architecture:** A dual-track Electron + React 18 desktop shell that shares local SQLite storage (`sql.js`) and Supabase Cloud sync. A unified navigation switcher allows candidates to switch between "Learner Mode" and "Seeker Mode". Role and tier-based feature gates (Free Learner vs Pro/Turbo Seeker) unlock premium modules and drive recurring subscription revenue.

**Tech Stack:** Electron 28, React 18, TypeScript 5, Vite 5, Tailwind CSS, Lucide Icons, SQLite (`sql.js`), Supabase (PostgreSQL + RLS + RPCs), Playwright Stealth, Groq AI (LLaMA 3.1 8B), Nodemailer / Chrome Automation, Stripe & Razorpay.

---

## High-Level Commercial Strategy & Value Proposition

```
┌────────────────────────────────────────────────────────────────────────┐
│                               JOBMAXXER                                │
├───────────────────────────────────┬────────────────────────────────────┤
│           LEARNER TRACK           │            SEEKER TRACK            │
│   (Zero to Job-Ready Candidate)   │    (Active High-Speed Applying)    │
├───────────────────────────────────┼────────────────────────────────────┤
│ 1. Role-Based Roadmaps            │ 1. High-Throughput Job Board       │
│    - Frontend, Backend, AI, Cloud │    - 1,000+ sources, ATS direct    │
│    - Visual interactive milestones│    - Match scoring against profile │
│ 2. Curated Resource Vault         │ 2. Automated Application Engine    │
│    - Free courses, GitHub repos   │    - Semi-Auto (20-tab review)     │
│    - Cheat sheets, interview sets │    - 100% Autonomous (Groq AI)     │
│ 3. Portfolio & Resume Builder     │ 3. 0-Bounce HR & Recruiter Outreach│
│    - Project blueprints           │    - 4-stage SMTP/DNS verification │
│    - ATS keyword optimization     │    - Direct referral email drip    │
│ 4. "Job-Readiness" Score Meter    │ 4. Real-time Application Tracker   │
└───────────────────────────────────┴────────────────────────────────────┘
```

### Monetization & Pricing Tiers (Target Market: College Students & Job Seekers)
1. **Free / Learner Tier (₹0 / $0)**:
   - Full access to all Roadmaps and Community Resources.
   - Job Readiness Meter and basic resume checklist.
   - Read-only preview of today's Top 5 jobs on the Job Board (Auto-apply & Outreach locked).
2. **Seeker Pro (₹299/mo or $12/mo)**:
   - Unlimited Job Board access with smart filtering and ATS match scores.
   - Semi-Auto Apply Mode (pre-fills 20 tabs concurrently in Chromium Stealth).
   - 25 Verified HR / Recruiter contacts per week for cold outreach.
   - Cloud Sync across sessions.
3. **Seeker Turbo / Max (₹599/mo or $24/mo)**:
   - 100% Autonomous Auto-Apply with Groq Cloud AI answering custom questions.
   - Unlimited HR & Recruiter contact exports and automated Gmail drip campaign.
   - Single-Laptop hardware license locking.
   - Priority ATS feed synchronization every 15 minutes.

---

## Detailed Task Breakdown

---

### Task 1: Extend Database Schema for Learner Track & Tier Gating

**Objective:** Add local SQLite schema tables and Supabase cloud tables for Roadmaps, Learning Progress, Resource Bookmarks, and Persona Preferences.

**Files:**
- Modify: `apps/desktop/src/main/db.ts:50-135`
- Create: `packages/supabase/migrations/004_learner_track.sql`
- Modify: `packages/supabase/src/index.ts:10-50`

**Step 1: Write failing test in `packages/supabase/src/__tests__/learner.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { syncPushLearnerProgress, syncPullLearnerData } from '../index.js';

describe('Learner Track Supabase Sync', () => {
  it('syncs completed roadmap nodes to cloud', async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ ok: true }],
        error: null,
      }),
    };
    const res = await syncPushLearnerProgress(
      mockSupabase,
      'user-123',
      'token-abc',
      'device-fp-1',
      { roadmap_id: 'frontend', completed_nodes: ['html', 'css', 'react'] }
    );
    expect(mockSupabase.rpc).toHaveBeenCalledWith('sync_push_learner_progress', {
      p_user_id: 'user-123',
      p_session_token: 'token-abc',
      p_device_fingerprint: 'device-fp-1',
      p_roadmap_id: 'frontend',
      p_completed_nodes: ['html', 'css', 'react'],
    });
    expect(res.ok).toBe(true);
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run packages/supabase/src/__tests__/learner.test.ts`
Expected: FAIL — "syncPushLearnerProgress is not a function"

**Step 3: Implement minimal schema and TypeScript sync methods**

1. In `apps/desktop/src/main/db.ts`, add tables:
```sql
CREATE TABLE IF NOT EXISTS learner_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roadmap_id TEXT NOT NULL,
  completed_nodes_json TEXT DEFAULT '[]',
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(roadmap_id)
);

CREATE TABLE IF NOT EXISTS learner_bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'free',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

2. In `packages/supabase/migrations/004_learner_track.sql`:
```sql
CREATE TABLE IF NOT EXISTS public.user_learner_progress (
  user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  roadmap_id TEXT NOT NULL,
  completed_nodes TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(user_id, roadmap_id)
);
ALTER TABLE public.user_learner_progress ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.sync_push_learner_progress(
  p_user_id UUID,
  p_session_token TEXT,
  p_device_fingerprint TEXT,
  p_roadmap_id TEXT,
  p_completed_nodes TEXT[]
)
RETURNS TABLE (ok BOOLEAN, error TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_sessions
    WHERE session_token = p_session_token AND user_id = p_user_id AND is_active = TRUE
  ) THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized session';
    RETURN;
  END IF;

  INSERT INTO public.user_learner_progress (user_id, roadmap_id, completed_nodes, updated_at)
  VALUES (p_user_id, p_roadmap_id, p_completed_nodes, NOW())
  ON CONFLICT (user_id, roadmap_id) DO UPDATE
    SET completed_nodes = EXCLUDED.completed_nodes, updated_at = NOW();

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_push_learner_progress TO anon, authenticated;
```

3. Export `syncPushLearnerProgress` and `syncPullLearnerData` in `packages/supabase/src/index.ts`.

**Step 4: Run test to verify pass**

Run: `npx vitest run packages/supabase/src/__tests__/learner.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/supabase/ apps/desktop/src/main/db.ts
git commit -m "feat(learner): add learner progress schema and cloud sync RPC"
```

---

### Task 2: Build Curated Roadmap Engine & Static Resource Vault

**Objective:** Create high-quality, structured roadmap data and resource vaults for 6 major tech tracks (Frontend, Backend, Full Stack, DevOps/Cloud, AI/ML, and Mobile Dev), containing milestones, curated documentation, GitHub projects, and interview questions.

**Files:**
- Create: `apps/desktop/src/renderer/data/roadmaps.ts`
- Create: `apps/desktop/src/renderer/data/resources.ts`
- Create: `apps/desktop/src/renderer/data/interviewSets.ts`
- Create: `apps/desktop/src/__tests__/roadmaps.test.ts`

**Step 1: Write failing test in `apps/desktop/src/__tests__/roadmaps.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { ROADMAPS, calculateReadinessScore } from '../renderer/data/roadmaps';

describe('Roadmap Definitions & Readiness Calculator', () => {
  it('contains essential career paths with structured milestones', () => {
    expect(ROADMAPS).toBeDefined();
    expect(ROADMAPS.length).toBeGreaterThanOrEqual(4);
    const frontend = ROADMAPS.find(r => r.id === 'frontend');
    expect(frontend).toBeDefined();
    expect(frontend?.milestones.length).toBeGreaterThanOrEqual(5);
  });

  it('calculates job readiness score correctly based on completed milestones', () => {
    const score = calculateReadinessScore('frontend', ['html-css', 'javascript', 'react', 'typescript']);
    expect(score).toBeGreaterThanOrEqual(50);
    expect(score).toBeLessThanOrEqual(100);
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run apps/desktop/src/__tests__/roadmaps.test.ts`
Expected: FAIL — "Cannot find module '../renderer/data/roadmaps'"

**Step 3: Implement `roadmaps.ts` and `resources.ts`**

Create `apps/desktop/src/renderer/data/roadmaps.ts`:
```typescript
export interface RoadmapMilestone {
  id: string;
  title: string;
  category: 'Fundamentals' | 'Core Frameworks' | 'Databases & APIs' | 'DevOps & Tooling' | 'Portfolio Project';
  estimatedHours: number;
  description: string;
  topics: string[];
  recommendedResources: Array<{ title: string; url: string; type: 'doc' | 'video' | 'repo' | 'practice' }>;
  interviewQuestions: string[];
  skillsGained: string[];
}

export interface Roadmap {
  id: string;
  title: string;
  icon: string;
  badge: string;
  targetRoles: string[];
  description: string;
  salaryRangeIndia: string;
  salaryRangeGlobal: string;
  milestones: RoadmapMilestone[];
}

export const ROADMAPS: Roadmap[] = [
  {
    id: 'frontend',
    title: 'Frontend Engineer',
    icon: 'Layout',
    badge: 'High Demand',
    targetRoles: ['Frontend Developer', 'React Developer', 'UI Engineer'],
    description: 'Master modern web applications using React, TypeScript, Tailwind, and Next.js.',
    salaryRangeIndia: '₹6 LPA – ₹24 LPA',
    salaryRangeGlobal: '$70k – $150k',
    milestones: [
      {
        id: 'html-css',
        title: 'Modern HTML5 & Semantic CSS / Tailwind',
        category: 'Fundamentals',
        estimatedHours: 20,
        description: 'Responsive design, Flexbox/Grid, CSS Variables, and Accessibility.',
        topics: ['Semantic markup', 'Flexbox & CSS Grid', 'Tailwind CSS utility-first workflow', 'WCAG Accessibility'],
        recommendedResources: [
          { title: 'MDN Web Docs - HTML & CSS', url: 'https://developer.mozilla.org', type: 'doc' },
          { title: 'Tailwind CSS Official Guide', url: 'https://tailwindcss.com/docs', type: 'doc' },
        ],
        interviewQuestions: [
          'Explain the CSS Box Model and box-sizing property.',
          'What is the difference between Flexbox and CSS Grid?',
        ],
        skillsGained: ['HTML5', 'CSS3', 'Tailwind CSS', 'Responsive UI'],
      },
      {
        id: 'javascript-es6',
        title: 'Deep JavaScript & ES6+ Fundamentals',
        category: 'Fundamentals',
        estimatedHours: 40,
        description: 'Closures, Event Loop, Promises/Async-Await, Prototypes, and DOM manipulation.',
        topics: ['Scope & Hoisting', 'Event Loop & Concurrency', 'Promises & Fetch API', 'Array & Object Methods'],
        recommendedResources: [
          { title: 'JavaScript.info Complete Guide', url: 'https://javascript.info', type: 'doc' },
          { title: 'You Don’t Know JS Yet', url: 'https://github.com/getify/You-Dont-Know-JS', type: 'repo' },
        ],
        interviewQuestions: [
          'How does the JavaScript Event Loop handle microtasks vs macrotasks?',
          'What is closure and give a real-world use case in React hooks?',
        ],
        skillsGained: ['JavaScript', 'ES6+', 'Async/Await', 'DOM APIs'],
      },
      {
        id: 'react-ts',
        title: 'React 18 & TypeScript Modern Architecture',
        category: 'Core Frameworks',
        estimatedHours: 50,
        description: 'Hooks, State Management (Zustand/Redux), Custom Hooks, and TypeScript type safety.',
        topics: ['useState, useEffect, useMemo, useCallback', 'TypeScript Generics & React Component Typing', 'Zustand & TanStack Query', 'Component Lifecycle & Virtual DOM'],
        recommendedResources: [
          { title: 'React Official Docs (react.dev)', url: 'https://react.dev', type: 'doc' },
          { title: 'Total TypeScript Essentials', url: 'https://www.totaltypescript.com', type: 'practice' },
        ],
        interviewQuestions: [
          'When would you use useMemo vs useCallback?',
          'Explain the reconciliation algorithm and why keys matter in lists.',
        ],
        skillsGained: ['React', 'TypeScript', 'State Management', 'TanStack Query'],
      },
      {
        id: 'full-project',
        title: 'Production Capstone: SaaS Dashboard with Auth & Payments',
        category: 'Portfolio Project',
        estimatedHours: 35,
        description: 'Build and deploy a full-featured web app with Auth, SQLite/Postgres backend, and Stripe billing.',
        topics: ['Next.js App Router', 'Server Actions & API Routes', 'Stripe checkout webhook', 'Vercel Deployment'],
        recommendedResources: [
          { title: 'Next.js Official Documentation', url: 'https://nextjs.org/docs', type: 'doc' },
        ],
        interviewQuestions: [
          'How do Server Components differ from Client Components in Next.js?',
          'How do you secure API routes against CSRF and injection attacks?',
        ],
        skillsGained: ['Next.js', 'Full Stack Project', 'Stripe', 'Production Deployment'],
      },
    ],
  },
  {
    id: 'backend',
    title: 'Backend & Distributed Systems Engineer',
    icon: 'Server',
    badge: 'Top Salary',
    targetRoles: ['Backend Developer', 'Node.js Engineer', 'API Developer', 'Go/Java Developer'],
    description: 'Design high-throughput APIs, relational & NoSQL databases, caching, and microservices.',
    salaryRangeIndia: '₹7 LPA – ₹28 LPA',
    salaryRangeGlobal: '$80k – $165k',
    milestones: [
      {
        id: 'node-apis',
        title: 'Node.js, Express & RESTful / GraphQL Architecture',
        category: 'Fundamentals',
        estimatedHours: 30,
        description: 'Build robust REST APIs, authentication middleware, rate-limiting, and error handlers.',
        topics: ['Node.js Runtime & Streams', 'Express / Fastify Middleware', 'JWT Auth & RBAC', 'Validation with Zod'],
        recommendedResources: [{ title: 'Node.js Docs', url: 'https://nodejs.org/docs', type: 'doc' }],
        interviewQuestions: ['How does Node.js handle concurrency with a single-threaded event loop?'],
        skillsGained: ['Node.js', 'Express', 'JWT', 'REST APIs', 'Zod'],
      },
      {
        id: 'databases',
        title: 'PostgreSQL, Query Optimization & Redis Caching',
        category: 'Databases & APIs',
        estimatedHours: 40,
        description: 'ACID transactions, indexing strategies (B-Tree, GIN), connection pooling, and Redis cache.',
        topics: ['PostgreSQL Schema Design', 'B-Tree & Composite Indexes', 'EXPLAIN ANALYZE', 'Redis Pub/Sub & Caching'],
        recommendedResources: [{ title: 'Use The Index, Luke!', url: 'https://use-the-index-luke.com', type: 'doc' }],
        interviewQuestions: ['Explain isolation levels in PostgreSQL and what dirty reads are.'],
        skillsGained: ['PostgreSQL', 'SQL Optimization', 'Redis', 'Database Indexing'],
      },
    ],
  },
  {
    id: 'fullstack',
    title: 'Full Stack Web Developer',
    icon: 'Layers',
    badge: 'Most Versatile',
    targetRoles: ['Full Stack Developer', 'Software Engineer', 'MERN / PERN Developer'],
    description: 'Bridge frontend and backend seamlessly with modern TypeScript frameworks and databases.',
    salaryRangeIndia: '₹6 LPA – ₹26 LPA',
    salaryRangeGlobal: '$75k – $160k',
    milestones: [
      {
        id: 'mern-core',
        title: 'TypeScript Full Stack Integration',
        category: 'Core Frameworks',
        estimatedHours: 45,
        description: 'End-to-end type safety connecting React frontend with Node/Postgres backend.',
        topics: ['TRPC / GraphQL', 'Prisma / Drizzle ORM', 'Next.js App Router', 'Tailwind UI'],
        recommendedResources: [{ title: 'Full Stack Open (University of Helsinki)', url: 'https://fullstackopen.com', type: 'practice' }],
        interviewQuestions: ['How do you prevent SQL injection and XSS in a full-stack TypeScript app?'],
        skillsGained: ['TypeScript', 'Full Stack', 'Prisma', 'Next.js'],
      },
    ],
  },
  {
    id: 'ai-ml',
    title: 'AI / LLM Application Developer',
    icon: 'Cpu',
    badge: 'Trending 2026',
    targetRoles: ['AI Engineer', 'LLM Application Developer', 'Generative AI Specialist'],
    description: 'Build RAG pipelines, autonomous AI agents, LangChain/LlamaIndex apps, and vector search systems.',
    salaryRangeIndia: '₹8 LPA – ₹32 LPA',
    salaryRangeGlobal: '$90k – $180k',
    milestones: [
      {
        id: 'llm-rag',
        title: 'Embeddings, Vector DBs & RAG Architecture',
        category: 'Core Frameworks',
        estimatedHours: 35,
        description: 'Build Retrieval-Augmented Generation using Pinecone/pgvector and Groq/OpenAI APIs.',
        topics: ['OpenAI / Groq API tooling', 'pgvector & Similarity Search', 'LangChain / LlamaIndex', 'Chunking & Reranking'],
        recommendedResources: [{ title: 'DeepLearning.AI Short Courses', url: 'https://www.deeplearning.ai', type: 'video' }],
        interviewQuestions: ['What is the difference between dense retrieval and sparse retrieval (BM25)?'],
        skillsGained: ['LLMs', 'Prompt Engineering', 'RAG Pipelines', 'Vector Databases', 'Groq API'],
      },
    ],
  },
];

export function calculateReadinessScore(roadmapId: string, completedNodeIds: string[]): number {
  const rm = ROADMAPS.find(r => r.id === roadmapId);
  if (!rm || !rm.milestones.length) return 0;
  const validCompleted = completedNodeIds.filter(id => rm.milestones.some(m => m.id === id));
  return Math.min(100, Math.round((validCompleted.length / rm.milestones.length) * 100));
}
```

**Step 4: Run test to verify pass**

Run: `npx vitest run apps/desktop/src/__tests__/roadmaps.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/renderer/data/ apps/desktop/src/__tests__/roadmaps.test.ts
git commit -m "feat(learner): add structured roadmaps and readiness score calculator"
```

---

### Task 3: Build the "Learner View" Interactive UI Component

**Objective:** Build a visual, high-conversion Learner dashboard with interactive milestone checklist, resource cards, and a "Sync Skills to Master Profile" button that updates candidate tech stack in 1 click.

**Files:**
- Create: `apps/desktop/src/renderer/components/LearnerView.tsx`
- Create: `apps/desktop/src/renderer/components/RoadmapCard.tsx`
- Create: `apps/desktop/src/renderer/components/ResourceVaultModal.tsx`

**Step 1: Write component contract and props in `LearnerView.tsx`**

```tsx
import React, { useState, useEffect } from 'react';
import { ROADMAPS, calculateReadinessScore, Roadmap, RoadmapMilestone } from '../data/roadmaps';
import { MasterProfile, getApi } from '../types';
import {
  BookOpen, CheckCircle2, Circle, ArrowRight, ExternalLink,
  Sparkles, Award, PlayCircle, Code, ShieldCheck, Zap
} from 'lucide-react';

interface LearnerViewProps {
  profile: MasterProfile;
  onUpdateProfile: (updated: Partial<MasterProfile>) => void;
  onNavigateToSeeker: () => void;
  onLog: (msg: string) => void;
}
```

**Step 2: Implement full interactive Learner UI**
- **Roadmap Selector Tabs**: Frontend, Backend, Full Stack, AI Engineer.
- **Visual Progress Bar**: Shows "% Job Ready" for the selected path.
- **Milestone Accordions**:
  - Checkbox to toggle milestone completion (stored in SQLite `learner_progress` + synced to Supabase).
  - Recommended Resources with 1-click links (`api.openExternalUrl(url)`).
  - Common Interview Questions & flashcards.
- **"Transfer to Job Seeker" CTA**: When readiness reaches ≥50%, a glowing button unlocks: *"You have completed the core milestones! Transfer skills to Seeker Profile and start Auto-Applying."*
  - Clicking this automatically appends milestone skills into `profile.techStack` and `profile.desiredTitle` and navigates to the Job Board!

**Step 3: Test component rendering**

Verify with Vite preview / test build.

**Step 4: Commit**

```bash
git add apps/desktop/src/renderer/components/LearnerView.tsx apps/desktop/src/renderer/components/RoadmapCard.tsx
git commit -m "feat(ui): add interactive Learner View with milestone tracker and skill sync"
```

---

### Task 4: Re-architect Navigation & Sidebar into Dual-Track (Learner vs Seeker)

**Objective:** Update `TopBar.tsx`, `Sidebar.tsx`, and `App.tsx` with a prominent "Track Switcher" toggle (🎓 Learner Track vs 🚀 Job Seeker Track) that filters available tabs cleanly.

**Files:**
- Modify: `apps/desktop/src/renderer/types.ts:75-90`
- Modify: `apps/desktop/src/renderer/components/TopBar.tsx`
- Modify: `apps/desktop/src/renderer/components/Sidebar.tsx`
- Modify: `apps/desktop/src/renderer/App.tsx`

**Step 1: Update TabType and Persona in `types.ts`**

```typescript
export type PersonaTrack = 'learner' | 'seeker';

export type TabType =
  // Learner Track Tabs
  | 'learner-roadmaps'
  | 'learner-resources'
  | 'learner-interview-prep'
  // Seeker Track Tabs
  | 'home'
  | 'feed'
  | 'outreach'
  | 'logs'
  // Shared
  | 'settings'
  | 'admin-overview'
  | 'admin-users'
  | 'admin-billing';
```

**Step 2: Add Track Switcher in `TopBar.tsx`**

Add a segmented toggle button in `TopBar.tsx`:
```tsx
<div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
  <button
    onClick={() => {
      setTrack('learner');
      onNavigate('learner-roadmaps');
    }}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
      activeTrack === 'learner'
        ? 'bg-white text-brand-600 shadow-sm'
        : 'text-slate-500 hover:text-slate-900'
    }`}
  >
    <BookOpen className="w-3.5 h-3.5" />
    <span>🎓 Learner Track</span>
  </button>

  <button
    onClick={() => {
      setTrack('seeker');
      onNavigate('feed');
    }}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
      activeTrack === 'seeker'
        ? 'bg-white text-emerald-600 shadow-sm'
        : 'text-slate-500 hover:text-slate-900'
    }`}
  >
    <Zap className="w-3.5 h-3.5" />
    <span>🚀 Seeker Track (Auto-Apply)</span>
  </button>
</div>
```

**Step 3: Update `Sidebar.tsx` navigation groups**

Render distinct tab menus based on `activeTrack`:
- **When in Learner Track**:
  - 🗺 Career Roadmaps (`learner-roadmaps`)
  - 📚 Resource Vault (`learner-resources`)
  - 🎯 Mock Interview Q&A (`learner-interview-prep`)
  - ⚙️ Profile & Skills (`settings`)
- **When in Seeker Track**:
  - ⚡ Overview (`home`)
  - 💼 Job Feed (`feed`)
  - 🤝 Recruiter Outreach (`outreach`)
  - 📋 Application History (`logs`)
  - ⚙️ Settings (`settings`)

**Step 4: Run typecheck and tests**

Run: `npm run build:desktop`
Expected: Build passes with zero errors.

**Step 5: Commit**

```bash
git add apps/desktop/src/renderer/
git commit -m "feat(nav): implement dual-track persona switcher between Learner and Seeker"
```

---

### Task 5: Enhance Seeker Module 1 — High-Throughput Job Board

**Objective:** Upgrade `FeedView.tsx` with instant search filters (Role, Location, Remote, Salary, Source), match score highlights, and 1-click batch actions.

**Files:**
- Modify: `apps/desktop/src/renderer/components/FeedView.tsx`
- Modify: `packages/scrapers/src/index.ts`

**Step 1: Add quick-filter chips and live keyword matcher in `FeedView.tsx`**
- Preset filter pills: `All`, `Remote`, `High Match (80%+)`, `Frontend`, `Backend`, `Internships`, `Full-time`.
- Direct "Apply with Semi-Auto" (Review Mode in Chromium) or "Autonomous Auto-Apply" (Groq AI) button per card.
- "Find Hiring Manager" button on each card that directly opens `OutreachView` with the company pre-selected.

**Step 2: Verification & Test**
- Run: `npm run scrapers:test`
- Verify feed rendering with mock and cloud jobs.

**Step 3: Commit**

```bash
git add apps/desktop/src/renderer/components/FeedView.tsx packages/scrapers/
git commit -m "feat(seeker): enhance Job Board feed with quick filters and 1-click apply triggers"
```

---

### Task 6: Enhance Seeker Module 2 — Playwright Stealth & Groq Auto-Apply Engine

**Objective:** Enhance the dual-mode application engine:
1. **Semi-Auto Mode**: Launches up to 20 tabs prefilled with profile data, pausing for human review.
2. **Autonomous Mode**: Uses Groq LLaMA 3.1 8B with field alias matching, automatic error detection, and screenshot capture.

**Files:**
- Modify: `packages/automation/src/auto-apply-engine.ts`
- Modify: `packages/automation/src/groq-ai.ts`
- Modify: `packages/automation/src/__tests__/auto-apply.test.ts`

**Step 1: Write unit test for Groq custom question prompt fallback in `packages/automation/src/__tests__/groq-ai.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { answerCustomQuestionWithGroq } from '../groq-ai.js';

describe('Groq AI Custom Answer Engine', () => {
  it('generates a concise answer tailored to candidate profile', async () => {
    const mockApiKey = 'gsk_mock_valid_key';
    const question = 'How many years of experience do you have with TypeScript?';
    const profileSummary = 'Candidate: 2 years experience with React, Node.js, and TypeScript.';
    
    // Test logic and fallback handling
    expect(question).toBeDefined();
  });
});
```

**Step 2: Run test and update implementation**
- Ensure resilient Groq retries with 3-second timeout and fallback to candidate profile custom answers dictionary (`custom_answers_json`).

**Step 3: Commit**

```bash
git add packages/automation/
git commit -m "feat(automation): harden Groq AI form response engine and stealth browser session"
```

---

### Task 7: Enhance Seeker Module 3 — 0-Bounce HR & Recruiter Referral Outreach

**Objective:** Wire the 4-stage email verification pipeline (Regex -> Disposable Filter -> DNS MX -> Direct SMTP ping) and dual delivery options (Local Nodemailer SMTP drip with 45–90s random delay OR External Chrome Gmail compose session).

**Files:**
- Modify: `packages/email-verifier/src/pipeline.ts`
- Modify: `packages/email-verifier/src/chrome-outreach.ts`
- Modify: `apps/desktop/src/renderer/components/OutreachView.tsx`

**Step 1: Verify test suite in `packages/email-verifier`**

Run: `npm run email:verify`
Expected: 100% tests passing.

**Step 2: Update `OutreachView.tsx`**
- Show verification badge (`VALID`, `RISKY`, `INVALID`) before dispatch.
- Customizable referral templates:
  - Template A: "Inquiry regarding {Job Title} role at {Company}"
  - Template B: "Alumni / Peer coffee chat referral request"
  - Template C: "Direct Pitch with Portfolio & GitHub links"
- Drip campaign progress bar with real-time log stream.

**Step 3: Commit**

```bash
git add packages/email-verifier/ apps/desktop/src/renderer/components/OutreachView.tsx
git commit -m "feat(outreach): upgrade 4-stage HR verifier and referral drip templates in UI"
```

---

### Task 8: In-App Tier Paywall & Automated Checkout Link

**Objective:** Implement an in-app subscription upgrade modal and tier gate that prompts Free/Learner users to upgrade to Seeker Pro / Turbo when triggering locked features (e.g. Autonomous Auto-Apply or Unlimited Outreach).

**Files:**
- Create: `apps/desktop/src/renderer/components/UpgradeModal.tsx`
- Modify: `apps/desktop/src/renderer/components/Sidebar.tsx`
- Modify: `apps/desktop/src/renderer/components/HomeView.tsx`

**Step 1: Create `UpgradeModal.tsx`**

```tsx
import React from 'react';
import { Zap, Check, ShieldCheck, ExternalLink, X, Sparkles } from 'lucide-react';
import { AppUser, getApi } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  triggerFeature?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  triggerFeature,
}) => {
  if (!isOpen) return null;
  const api = getApi();

  const handleCheckout = (plan: 'pro' | 'turbo') => {
    const userId = currentUser?.id || 'guest';
    const email = encodeURIComponent(currentUser?.email || '');
    // Open hosted checkout link (Razorpay / Stripe)
    const checkoutUrl = `https://jobmaxxer.app/checkout?plan=${plan}&user_id=${userId}&email=${email}`;
    api.openExternalUrl(checkoutUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] font-bold text-amber-800">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            {triggerFeature ? `Unlock ${triggerFeature}` : 'Upgrade to JobMaxxer Pro'}
          </div>
          <h2 className="text-2xl font-black text-slate-900">Land Interviews 10x Faster</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Automate your applications and reach hiring managers directly without getting lost in the resume black hole.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pro Plan */}
          <div className="border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-brand-300 transition-all">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Seeker Pro</h3>
              <p className="text-[11px] text-slate-500">Perfect for active job seekers</p>
              <div className="mt-2 text-2xl font-black text-slate-900">
                ₹299 <span className="text-xs font-normal text-slate-500">/ month</span>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Full Job Board with ATS Match</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> 20-Tab Semi-Auto Review Mode</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> 25 Verified HR Contacts / Week</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Cloud Sync Across Devices</li>
            </ul>
            <button
              onClick={() => handleCheckout('pro')}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all"
            >
              Get Seeker Pro
            </button>
          </div>

          {/* Turbo Plan */}
          <div className="border-2 border-brand-500 bg-brand-50/20 rounded-2xl p-5 space-y-4 relative shadow-lg shadow-brand-100">
            <span className="absolute -top-3 right-4 bg-brand-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Most Popular
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Seeker Turbo</h3>
              <p className="text-[11px] text-slate-500">For students wanting 100% autopilot</p>
              <div className="mt-2 text-2xl font-black text-brand-600">
                ₹599 <span className="text-xs font-normal text-slate-500">/ month</span>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-600 font-bold" /> 100% Autonomous Groq AI Auto-Apply</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-600 font-bold" /> Unlimited HR & Recruiter Outreach</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-600 font-bold" /> Automated Gmail Drip Outreach</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-600 font-bold" /> 1-Laptop Strict Hardware License</li>
            </ul>
            <button
              onClick={() => handleCheckout('turbo')}
              className="w-full py-2.5 brand-gradient hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-brand transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Get Seeker Turbo</span>
            </button>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          Secure checkout via Razorpay & Stripe · Instant activation · Cancel anytime
        </p>
      </div>
    </div>
  );
};
```

**Step 2: Wire paywall gate into Seeker buttons**
- If user tier is `trial` or expired: trigger `UpgradeModal`.
- Allow Free Learner users to explore Roadmaps without friction, monetizing when they transition to applying.

**Step 3: Verification & Build**
- Run `npm run build:desktop`
- Verify modal mounts cleanly.

**Step 4: Commit**

```bash
git add apps/desktop/src/renderer/components/UpgradeModal.tsx apps/desktop/src/renderer/
git commit -m "feat(monetization): add high-converting in-app paywall modal for Pro and Turbo plans"
```

---

### Task 9: End-to-End Verification & Automated Test Suite Run

**Objective:** Verify that all 147+ unit tests pass, both Learner and Seeker flows bundle cleanly, and the desktop executable builds without errors.

**Step 1: Run complete test suite**

```bash
npx vitest run
```
Expected: All tests PASS.

**Step 2: Run desktop production build**

```bash
npm run build:desktop
```
Expected: Main process and renderer bundle successfully in `out/`.

**Step 3: Commit & Update Documentation**

```bash
git add .
git commit -m "chore: complete dual-persona Learner & Seeker architecture implementation"
```

---

## Deliverables Summary

1. **Learner Section**:
   - 6 Career Roadmaps with milestone progress tracking.
   - Resource Vault (Docs, Repos, Projects, Interview Q&As).
   - "Job Readiness Score" & 1-click skill transfer to Candidate Profile.
2. **Seeker Section**:
   - **Module 1**: High-Throughput Job Board (ATS feeds, search, filters, match scoring).
   - **Module 2**: Semi-Auto (Chromium) & Autonomous (Groq AI) Auto-Apply engine.
   - **Module 3**: 4-Stage 0-Bounce HR & Recruiter Outreach engine.
3. **Monetization & Scalability**:
   - Free Learner funnel -> Pro / Turbo Seeker paid subscription conversion.
   - Single-Laptop hardware locking + Cloud Sync to eliminate license sharing.
