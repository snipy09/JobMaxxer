import { scrapeAtsApis, type RawJob } from './ats-api-scraper.js';
import { scrapeAggregatorsAndRss } from './aggregator-rss-scraper.js';
import { scrapeDirectDom } from './direct-dom-scraper.js';
import { scrapeWebSearchIndexes } from './web-search-scraper.js';
import { scrapeNicheBoards } from './niche-boards-scraper.js';
import { computeJobHash } from './hasher.js';

import { scrapeRecruiterLeads, type RecruiterLead } from './recruiter-scraper.js';

export {
  scrapeAtsApis,
  scrapeAggregatorsAndRss,
  scrapeDirectDom,
  scrapeWebSearchIndexes,
  scrapeNicheBoards,
  scrapeRecruiterLeads,
  computeJobHash,
  type RawJob,
  type RecruiterLead
};

export interface ScoredJob extends RawJob {
  score: number;
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
  const maxWeighted = validKeywords.length * 2; // max each keyword can contribute is 2

  for (const kw of validKeywords) {
    if (normTitle.includes(kw)) weightedHits += 2;   // title match: double weight
    else if (normDesc.includes(kw)) weightedHits += 1; // description match: single weight
  }

  return Math.min(100, Math.round((weightedHits / maxWeighted) * 100));
}

/**
 * extractProfileKeywords — derives a keyword list from a profile object.
 */
export function extractProfileKeywords(profile?: Record<string, unknown>): string[] {
  if (!profile) return [];

  const collected: string[] = [];

  // If the caller passed an explicit keywords array, use it
  const explicit = profile['keywords'];
  if (Array.isArray(explicit)) {
    for (const k of explicit) {
      if (typeof k === 'string' && k.trim()) collected.push(k.trim());
    }
  }

  // Desired job titles (singular or array)
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
  console.log('[Scraper Pipeline] Starting All 5 High-Throughput Scraper Engines (1000+ Sources Target)...');

  const profileKeywords = extractProfileKeywords(profile);
  console.log(`[Scraper Pipeline] Profile keywords for relevance scoring: [${profileKeywords.join(', ')}]`);

  const [atsJobs, webJobs, nicheJobs] = await Promise.all([
    scrapeAtsApis([
      { name: 'Stripe', type: 'greenhouse', boardId: 'stripe' },
      { name: 'Lever Demo', type: 'lever', boardId: 'lever' }
    ]),
    scrapeWebSearchIndexes(['react', 'typescript', 'python']),
    scrapeNicheBoards()
  ]);

  const allJobs = [...atsJobs, ...webJobs, ...nicheJobs];

  // Deduplicate by hash
  const seenHashes = new Set<string>();
  const deduplicated: RawJob[] = [];
  for (const job of allJobs) {
    if (!seenHashes.has(job.jobHash)) {
      seenHashes.add(job.jobHash);
      deduplicated.push(job);
    }
  }

  // Compute relevance scores and attach
  const scored: ScoredJob[] = deduplicated.map(job => ({
    ...job,
    score: computeRelevanceScore(job, profileKeywords),
  }));

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  console.log(
    `[Scraper Pipeline] Scraped ${allJobs.length} total jobs -> ` +
    `${deduplicated.length} unique jobs -> scored & sorted.`
  );

  return scored;
}