import { scrapeAtsApis, type RawJob } from './ats-api-scraper.ts';
import { scrapeAggregatorsAndRss } from './aggregator-rss-scraper.ts';
import { scrapeDirectDom } from './direct-dom-scraper.ts';
import { scrapeWebSearchIndexes } from './web-search-scraper.ts';
import { scrapeNicheBoards } from './niche-boards-scraper.ts';
import { scrapeInternshala, type InternshalaJob } from './internshala-scraper.ts';
import { computeJobHash } from './hasher.ts';
import { scrapeRecruiterLeads, type RecruiterLead } from './recruiter-scraper.ts';

export {
  scrapeAtsApis,
  scrapeAggregatorsAndRss,
  scrapeDirectDom,
  scrapeWebSearchIndexes,
  scrapeNicheBoards,
  scrapeInternshala,
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
}

/**
 * computeRelevanceScore — keyword-match score (0–100) between a job and
 * a set of profile keywords/desired titles.
 */
export function computeRelevanceScore(job: RawJob, keywords: string[]): number {
  if (!keywords || keywords.length === 0) return 50; // neutral if no keywords

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

  // Keywords array
  const rawKeywords = profile['keywords'];
  if (Array.isArray(rawKeywords)) {
    for (const k of rawKeywords) {
      if (typeof k === 'string' && k.trim()) collected.push(k.trim());
    }
  }

  // Desired job titles
  const titles = profile['desiredTitle'] ?? profile['desired_title'];
  if (typeof titles === 'string') {
    collected.push(...titles.split(/[,;|]/));
  } else if (Array.isArray(titles)) {
    for (const t of titles) {
      if (typeof t === 'string') collected.push(...t.split(/[,;|]/));
    }
  }

  // Tech stack strings
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

export async function runAllScrapers(
  profile?: Record<string, unknown>
): Promise<ScoredJob[]> {
  console.log('[Scraper Pipeline] Starting All High-Throughput Scraper Engines (ATS, Internshala, Niche, Web)...');

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

  const [atsJobs, internshalaJobs, webJobs, nicheJobs, rssJobs] = await Promise.all([
    withTimeout(scrapeAtsApis(), 15000, []),
    withTimeout(scrapeInternshala().catch(() => []), 10000, []),
    withTimeout(scrapeWebSearchIndexes(['react', 'typescript', 'python', 'intern']), 10000, []),
    withTimeout(scrapeNicheBoards(), 10000, []),
    withTimeout(scrapeAggregatorsAndRss(TOP_RSS_FEEDS), 10000, []),
  ]);

  const safeInternshala = Array.isArray(internshalaJobs) ? internshalaJobs : [];
  const safeAts = Array.isArray(atsJobs) ? atsJobs : [];
  const safeWeb = Array.isArray(webJobs) ? webJobs : [];
  const safeNiche = Array.isArray(nicheJobs) ? nicheJobs : [];
  const safeRss = Array.isArray(rssJobs) ? rssJobs : [];

  // Exclude LinkedIn positions strictly per directive
  const allJobs = [...safeAts, ...safeInternshala, ...safeWeb, ...safeNiche, ...safeRss].filter(j => {
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

  // Compute relevance scores and attach
  const scored: ScoredJob[] = deduplicated.map((job, idx) => {
    const baseDate = new Date(Date.now() - idx * 120000).toISOString();
    return {
      ...job,
      score: computeRelevanceScore(job, profileKeywords),
      createdAt: (job as any).createdAt || baseDate,
    };
  });

  // Default Sort: Latest to Oldest
  scored.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  console.log(
    `[Scraper Pipeline] Scraped & Filtered: ${allJobs.length} jobs -> ` +
    `${deduplicated.length} unique positions -> sorted latest to oldest.`
  );

  return scored;
}