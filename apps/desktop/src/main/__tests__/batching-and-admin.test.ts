import { describe, it, expect } from 'vitest';

// ── 1. Batching Engine Test ────────────────────────────────────────────────
function chunkIntoBatches<T>(items: T[], batchSize: number = 5): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

describe('Sequential Auto-Apply Batching Engine', () => {
  it('chunks 50 jobs into exactly 10 sequential batches of 5 jobs each', () => {
    const jobs = Array.from({ length: 50 }, (_, i) => `https://boards.greenhouse.io/company/jobs/${i + 1}`);
    const batches = chunkIntoBatches(jobs, 5);

    expect(batches.length).toBe(10);
    batches.forEach((b) => {
      expect(b.length).toBe(5);
    });
    expect(batches.flat()).toEqual(jobs);
  });

  it('handles irregular counts cleanly (e.g. 47 jobs = 9 batches of 5 + 1 batch of 2)', () => {
    const jobs = Array.from({ length: 47 }, (_, i) => `https://jobs.lever.co/company/job-${i + 1}`);
    const batches = chunkIntoBatches(jobs, 5);

    expect(batches.length).toBe(10);
    expect(batches[0].length).toBe(5);
    expect(batches[8].length).toBe(5);
    expect(batches[9].length).toBe(2);
    expect(batches.flat().length).toBe(47);
  });

  it('handles single batch boundary cases (5 jobs = 1 batch, 1 job = 1 batch, 0 jobs = 0 batches)', () => {
    expect(chunkIntoBatches([1, 2, 3, 4, 5], 5).length).toBe(1);
    expect(chunkIntoBatches([1], 5).length).toBe(1);
    expect(chunkIntoBatches([], 5).length).toBe(0);
  });
});

// ── 2. Plan Usage & Tier Rule Tests ─────────────────────────────────────────
interface PlanQuotaCheck {
  allowed: boolean;
  maxDaily: number;
  currentUsage: number;
  remaining: number;
  reason?: string;
}

function evaluatePlanUsage(currentUsage: number, requestedCount: number, tier: string): PlanQuotaCheck {
  const normalized = tier.toLowerCase();
  let maxDaily = 100; // Pro default
  if (normalized === 'trial' || normalized === 'free') {
    maxDaily = 10;
  } else if (normalized === 'pro') {
    maxDaily = 100;
  } else if (normalized === 'max' || normalized === 'lifetime') {
    maxDaily = 200;
  }

  const remaining = Math.max(0, maxDaily - currentUsage);
  if (currentUsage >= maxDaily) {
    return {
      allowed: false,
      maxDaily,
      currentUsage,
      remaining: 0,
      reason: `Daily application limit reached (${currentUsage}/${maxDaily}). Upgrade your tier for expanded limits.`,
    };
  }

  return {
    allowed: true,
    maxDaily,
    currentUsage,
    remaining,
  };
}

describe('Subscription Plan Usage and Quota Rules', () => {
  it('enforces 10 applications/day cap on Trial plan', () => {
    const checkBefore = evaluatePlanUsage(0, 10, 'trial');
    expect(checkBefore.allowed).toBe(true);
    expect(checkBefore.maxDaily).toBe(10);
    expect(checkBefore.remaining).toBe(10);

    const checkFull = evaluatePlanUsage(10, 5, 'trial');
    expect(checkFull.allowed).toBe(false);
    expect(checkFull.remaining).toBe(0);
    expect(checkFull.reason).toContain('Daily application limit reached');
  });

  it('allows up to 100 applications/day for Pro plan', () => {
    const checkPro = evaluatePlanUsage(45, 50, 'pro');
    expect(checkPro.allowed).toBe(true);
    expect(checkPro.maxDaily).toBe(100);
    expect(checkPro.remaining).toBe(55);

    const checkProFull = evaluatePlanUsage(100, 1, 'pro');
    expect(checkProFull.allowed).toBe(false);
  });

  it('allows 200 applications/day for Max & Lifetime plans', () => {
    const checkMax = evaluatePlanUsage(90, 50, 'max');
    expect(checkMax.allowed).toBe(true);
    expect(checkMax.maxDaily).toBe(200);

    const checkLifetime = evaluatePlanUsage(150, 20, 'lifetime');
    expect(checkLifetime.allowed).toBe(true);
    expect(checkLifetime.maxDaily).toBe(200);
  });
});

// ── 3. AI Learning Topic & Role Matcher Tests ──────────────────────────────
interface CuratedVideo {
  id: number;
  title: string;
  topic: string;
  targetRole: string;
  summary: string;
}

function matchCuratedResources(
  resources: CuratedVideo[],
  job: { title: string; description?: string; techStack?: string }
): CuratedVideo[] {
  const titleLower = (job.title || '').toLowerCase();
  const descLower = (job.description || '').toLowerCase();
  const stackLower = (job.techStack || '').toLowerCase();

  const scored = resources.map(r => {
    let score = 0;
    const topicTokens = r.topic.toLowerCase().split(/[^a-z0-9]+/);
    const roleTokens = r.targetRole.toLowerCase().split(/[^a-z0-9]+/);

    for (const tok of roleTokens) {
      if (tok.length > 2 && titleLower.includes(tok)) score += 6;
    }
    for (const tok of topicTokens) {
      if (tok.length > 2) {
        if (titleLower.includes(tok)) score += 5;
        if (stackLower.includes(tok)) score += 4;
        if (descLower.includes(tok)) score += 2;
      }
    }
    return { resource: r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const matched = scored.filter(s => s.score > 0).map(s => s.resource);
  return matched.length > 0 ? matched.slice(0, 3) : resources.slice(0, 2);
}

describe('AI Learning Topic & Job Matcher', () => {
  const sampleVault: CuratedVideo[] = [
    {
      id: 1,
      title: 'Next.js 14 Full Stack Architecture & Server Components',
      topic: 'React & Next.js',
      targetRole: 'Frontend Engineer, Full Stack Developer',
      summary: 'Deep dive into React Server Components and edge caching.',
    },
    {
      id: 2,
      title: 'System Design Interview: Distributed Cache & Redis Sharding',
      topic: 'System Design & Scalability',
      targetRole: 'Backend Engineer, Full Stack Developer, Systems Architect',
      summary: 'LRU eviction algorithms and cache-aside patterns.',
    },
    {
      id: 3,
      title: 'Docker & Production Kubernetes Deployment Pipelines',
      topic: 'DevOps & Cloud Infrastructure',
      targetRole: 'DevOps Engineer, Platform Engineer, Cloud Architect',
      summary: 'Zero-downtime rolling deploys and Helm templates.',
    },
    {
      id: 4,
      title: 'Node.js Event Loop & Asynchronous I/O Under The Hood',
      topic: 'Node.js & Backend Architecture',
      targetRole: 'Backend Developer, Node.js Engineer',
      summary: 'Microtask queue and libuv threadpool internals.',
    },
  ];

  it('matches React & Next.js tutorials when candidate inspects Frontend Engineer position', () => {
    const matches = matchCuratedResources(sampleVault, {
      title: 'Senior Frontend Engineer (React/Next.js)',
      description: 'Building modern web applications with SSR and TypeScript.',
      techStack: 'React, Next.js, Tailwind CSS',
    });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].topic).toBe('React & Next.js');
    expect(matches[0].id).toBe(1);
  });

  it('matches System Design & Node.js tutorials when candidate inspects Backend position', () => {
    const matches = matchCuratedResources(sampleVault, {
      title: 'Staff Backend Engineer - Distributed Systems',
      description: 'Design high throughput caching layers and microservices.',
      techStack: 'Node.js, Redis, PostgreSQL',
    });

    expect(matches.length).toBeGreaterThan(0);
    const matchedTopics = matches.map(m => m.topic);
    expect(matchedTopics).toContain('System Design & Scalability');
  });

  it('matches DevOps & Kubernetes when candidate inspects SRE / Cloud position', () => {
    const matches = matchCuratedResources(sampleVault, {
      title: 'Cloud Infrastructure & DevOps Engineer',
      description: 'Manage production Kubernetes clusters on AWS.',
      techStack: 'Docker, Kubernetes, Terraform',
    });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].topic).toBe('DevOps & Cloud Infrastructure');
  });
});
