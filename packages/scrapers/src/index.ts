import { scrapeAtsApis, type RawJob } from './ats-api-scraper.ts';
import { scrapeAggregatorsAndRss } from './aggregator-rss-scraper.ts';
import { scrapeDirectDom } from './direct-dom-scraper.ts';
import { scrapeWebSearchIndexes } from './web-search-scraper.ts';
import { scrapeNicheBoards } from './niche-boards-scraper.ts';
import { scrapeInternshala, type InternshalaJob } from './internshala-scraper.ts';
import { scrapeNaukriIndia, scrapeIndeedIndia } from './indian-portals-scraper.ts';
import { computeJobHash } from './hasher.ts';
import { scrapeRecruiterLeads, type RecruiterLead } from './recruiter-scraper.ts';
import { getScraperSupabase } from './env-helper.ts';

export {
  scrapeAtsApis,
  scrapeAggregatorsAndRss,
  scrapeDirectDom,
  scrapeWebSearchIndexes,
  scrapeNicheBoards,
  scrapeInternshala,
  scrapeNaukriIndia,
  scrapeIndeedIndia,
  scrapeRecruiterLeads,
  computeJobHash,
  type RawJob,
  type InternshalaJob,
  type RecruiterLead
};

export interface ScoredJob extends RawJob {
  score: number;
  employmentType?: 'job' | 'internship';
  workplaceType?: 'remote' | 'hybrid' | 'onsite';
  experienceLevel?: 'entry' | 'mid' | 'senior';
  createdAt?: string;
  isIndian?: boolean;
}

/**
 * computeRelevanceScore — keyword-match score (0–100) between a job and
 * a set of profile keywords/desired titles.
 */
export function computeRelevanceScore(job: RawJob, keywords: string[]): number {
  if (!keywords || keywords.length === 0) return 50;

  const normTitle = (job.title ?? '').toLowerCase();
  const normDesc = (job.description ?? '').toLowerCase();

  const validKeywords = keywords
    .map(r => (r ?? '').toLowerCase().trim())
    .filter(k => k.length > 0);

  if (validKeywords.length === 0) return 50;

  let weightedHits = 0;
  const maxWeighted = validKeywords.length * 2;

  for (const kw of validKeywords) {
    if (normTitle.includes(kw)) weightedHits += 2;
    else if (normDesc.includes(kw)) weightedHits += 1;
  }

  return Math.min(100, Math.round((weightedHits / maxWeighted) * 100));
}

/**
 * extractProfileKeywords — derives a keyword list from a profile object.
 */
export function extractProfileKeywords(profile?: Record<string, unknown>): string[] {
  if (!profile) return [];

  const collected: string[] = [];

  const rawKeywords = profile['keywords'];
  if (Array.isArray(rawKeywords)) {
    for (const k of rawKeywords) {
      if (typeof k === 'string' && k.trim()) collected.push(k.trim());
    }
  }

  const titles = profile['desiredTitle'] ?? profile['desired_title'];
  if (typeof titles === 'string') {
    collected.push(...titles.split(/[,;|]/));
  } else if (Array.isArray(titles)) {
    for (const t of titles) {
      if (typeof t === 'string') collected.push(...t.split(/[,;|]/));
    }
  }

  const stack = profile['techStack'] ?? profile['tech_stack'];
  if (typeof stack === 'string') {
    collected.push(...stack.split(/[,;|\s]+/));
  } else if (Array.isArray(stack)) {
    for (const t of stack) {
      if (typeof t === 'string') collected.push(...t.split(/[,;|\s]+/));
    }
  }

  const seen = new Set<string>();
  return collected
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length >= 2 && !seen.has(k) && seen.add(k));
}

function isIndiaJob(j: RawJob): boolean {
  const loc = (j.location || '').toLowerCase();
  const comp = (j.company || '').toLowerCase();
  const title = (j.title || '').toLowerCase();
  const desc = (j.description || '').toLowerCase();
  
  const indiaKeywords = [
    'india', 'bengaluru', 'bangalore', 'hyderabad', 'pune', 'mumbai',
    'delhi', 'ncr', 'gurgaon', 'gurugram', 'noida', 'chennai', 'kolkata',
    'ahmedabad', 'in-remote', 'remote (india)', 'remote, india', 'india-remote',
    'in, remote', 'remote - india', 'ind'
  ];
  
  const indianCompanies = [
    'razorpay', 'swiggy', 'zomato', 'cred', 'meesho', 'groww', 'flipkart',
    'phonepe', 'zepto', 'postman', 'inmobi', 'urban company', 'browserstack',
    'freshworks', 'zoho', 'hasura', 'juspay', 'zeta', 'clevertap', 'paytm',
    'ola', 'zerodha', 'khatabook', 'dream11', 'sharechat', 'angelone', 'lenskart', 'nykaa'
  ];

  return (
    indiaKeywords.some(k => loc.includes(k) || title.includes(k) || desc.includes(k)) ||
    indianCompanies.some(c => comp.includes(c))
  );
}

function isRemoteJob(j: RawJob): boolean {
  const loc = (j.location || '').toLowerCase();
  const title = (j.title || '').toLowerCase();
  const src = (j.source || '').toLowerCase();
  return (
    j.workplaceType === 'remote' ||
    loc.includes('remote') ||
    title.includes('remote') ||
    src.includes('weworkremotely') ||
    src.includes('jobspresso') ||
    src.includes('verified placements')
  );
}

function isInternshalaJob(j: RawJob): boolean {
  const src = (j.source || '').toLowerCase();
  const title = (j.title || '').toLowerCase();
  return (
    src.includes('internshala') ||
    src.includes('verified placements') ||
    j.employmentType === 'internship' ||
    title.includes('intern') ||
    title.includes('trainee')
  );
}

export async function runAllScrapers(
  profile?: Record<string, unknown>
): Promise<ScoredJob[]> {
  console.log('[Scraper Pipeline] Starting All High-Throughput Scraper Engines (India-First, ATS, Internshala, Remote)...');

  const profileKeywords = extractProfileKeywords(profile);

  const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
    ]);
  };

  const TOP_RSS_FEEDS = [
    { name: 'WeWorkRemotely: Dev', url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss' },
    { name: 'WeWorkRemotely: DevOps', url: 'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss' },
    { name: 'WeWorkRemotely: FullStack', url: 'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss' },
    { name: 'Jobspresso Tech', url: 'https://jobspresso.co/feed/' },
  ];

  const [atsJobs, internshalaJobs, naukriJobs, indeedJobs, webJobs, nicheJobs, rssJobs] = await Promise.all([
    withTimeout(scrapeAtsApis(), 15000, []),
    withTimeout(scrapeInternshala().catch(() => []), 10000, []),
    withTimeout(scrapeNaukriIndia().catch(() => []), 10000, []),
    withTimeout(scrapeIndeedIndia().catch(() => []), 10000, []),
    withTimeout(scrapeWebSearchIndexes(['react', 'typescript', 'python', 'intern', 'bangalore', 'india']), 10000, []),
    withTimeout(scrapeNicheBoards(), 10000, []),
    withTimeout(scrapeAggregatorsAndRss(TOP_RSS_FEEDS), 10000, []),
  ]);

  const safeInternshala = Array.isArray(internshalaJobs) ? internshalaJobs : [];
  const safeNaukri = Array.isArray(naukriJobs) ? naukriJobs : [];
  const safeIndeed = Array.isArray(indeedJobs) ? indeedJobs : [];
  const safeAts = Array.isArray(atsJobs) ? atsJobs : [];
  const safeWeb = Array.isArray(webJobs) ? webJobs : [];
  const safeNiche = Array.isArray(nicheJobs) ? nicheJobs : [];
  const safeRss = Array.isArray(rssJobs) ? rssJobs : [];

  // Exclude LinkedIn positions strictly per directive
  const allJobs = [...safeAts, ...safeInternshala, ...safeNaukri, ...safeIndeed, ...safeWeb, ...safeNiche, ...safeRss].filter(j => {
    const src = (j.source || '').toLowerCase();
    const url = (j.applyUrl || '').toLowerCase();
    return !src.includes('linkedin') && !url.includes('linkedin.com');
  });

  // Deduplicate by SHA-256 hash
  const seenHashes = new Set<string>();
  const deduplicated: RawJob[] = [];
  for (const job of allJobs) {
    if (!seenHashes.has(job.jobHash)) {
      seenHashes.add(job.jobHash);
      deduplicated.push(job);
    }
  }

  // Split into targeted pools: Indian Jobs, Remote Jobs, Internshala Jobs, and Other
  const indiaPool: RawJob[] = [];
  const remotePool: RawJob[] = [];
  const internshalaPool: RawJob[] = [];
  const otherPool: RawJob[] = [];

  for (const j of deduplicated) {
    if (isIndiaJob(j)) {
      indiaPool.push(j);
    } else if (isInternshalaJob(j)) {
      internshalaPool.push(j);
    } else if (isRemoteJob(j)) {
      remotePool.push(j);
    } else {
      otherPool.push(j);
    }
  }

  // Compose into balanced India-first stream (In every 10 jobs: 4 Remote, 2 Internshala/Intern, 4 Indian/India-Hub)
  const orderedJobs: RawJob[] = [];
  const maxTotal = deduplicated.length;

  while (orderedJobs.length < maxTotal) {
    let addedInRound = 0;

    // 1. Take up to 4 Indian jobs
    for (let i = 0; i < 4 && indiaPool.length > 0; i++) {
      orderedJobs.push(indiaPool.shift()!);
      addedInRound++;
    }

    // 2. Take at least 4 Remote jobs (or as available)
    for (let i = 0; i < 4 && remotePool.length > 0; i++) {
      orderedJobs.push(remotePool.shift()!);
      addedInRound++;
    }

    // 3. Take up to 2 Internshala / Placement jobs
    for (let i = 0; i < 2 && internshalaPool.length > 0; i++) {
      orderedJobs.push(internshalaPool.shift()!);
      addedInRound++;
    }

    // 4. Fill any remaining capacity from remaining pools
    while (addedInRound < 10 && (indiaPool.length > 0 || remotePool.length > 0 || internshalaPool.length > 0 || otherPool.length > 0)) {
      if (indiaPool.length > 0) orderedJobs.push(indiaPool.shift()!);
      else if (remotePool.length > 0) orderedJobs.push(remotePool.shift()!);
      else if (internshalaPool.length > 0) orderedJobs.push(internshalaPool.shift()!);
      else if (otherPool.length > 0) orderedJobs.push(otherPool.shift()!);
      addedInRound++;
    }

    if (addedInRound === 0) break;
  }

  // Attach timestamps from latest to oldest with 1-min increments
  const now = Date.now();
  const scored: ScoredJob[] = orderedJobs.map((job, idx) => {
    const isInd = isIndiaJob(job);
    return {
      ...job,
      score: computeRelevanceScore(job, profileKeywords) + (isInd ? 10 : 0),
      createdAt: (job as any).createdAt || new Date(now - idx * 60000).toISOString(),
      isIndian: isInd,
    };
  });

  console.log(
    `[Scraper Pipeline] India-First Optimization Complete: ${orderedJobs.length} positions composed ` +
    `(India Priority + At least 4 Remote/10 + Internshala).`
  );

  // Auto-push scraped jobs to Supabase if connected
  try {
    const supabase = getScraperSupabase();
    if (supabase && scored.length > 0) {
      const rows = scored.map((j) => ({
        title: j.title,
        company: j.company,
        location: j.location || 'Remote',
        apply_url: j.applyUrl,
        source: j.source || 'Direct ATS',
        description: j.description || '',
        job_hash: j.jobHash,
        salary_range: (j as any).salary || undefined,
        is_active: true,
        created_at: j.createdAt || new Date().toISOString()
      }));

      supabase.from('jobs').upsert(rows, { onConflict: 'job_hash', ignoreDuplicates: true }).then(({ error }) => {
        if (!error) console.log(`[Scraper Cloud Sync] Upserted ${rows.length} jobs to Supabase.`);
      }).catch(() => {});
    }
  } catch {}

  return scored;
}

export async function syncScrapedJobsToSupabase(jobs: RawJob[]): Promise<number> {
  try {
    const supabase = getScraperSupabase();
    if (!supabase || !jobs.length) return 0;
    const rows = jobs.map(j => ({
      title: j.title,
      company: j.company,
      location: j.location || 'Remote',
      apply_url: j.applyUrl,
      source: j.source || 'Direct ATS',
      description: j.description || '',
      job_hash: j.jobHash,
      is_active: true,
      created_at: new Date().toISOString()
    }));
    const { error } = await supabase.from('jobs').upsert(rows, { onConflict: 'job_hash', ignoreDuplicates: true });
    return error ? 0 : rows.length;
  } catch {
    return 0;
  }
}
