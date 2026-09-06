import type { RawJob } from './ats-api-scraper.js';

export interface ResolvedJobForm {
  isValid: boolean;
  directApplyUrl: string;
  sourceUrl: string;
  failureReason?: string;
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const ERROR_404_SIGNATURES = [
  'page not found',
  'job posting you were viewing is no longer active',
  'sorry, we couldn\'t find anything here',
  '404 not found',
  '404 error',
  'this job has expired',
  'this internship has expired',
  'position has been filled',
  'no longer accepting applications',
  'looks like you crashed',
  'no such internship',
  'no such job',
];

/**
 * Resolves a raw job posting URL to its verified direct application form endpoint.
 * Pre-checks HTTP health and filters out 404/expired postings.
 */
export async function resolveDirectFormUrl(rawUrl: string, companyName?: string): Promise<ResolvedJobForm> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, directApplyUrl: '', sourceUrl: rawUrl, failureReason: 'empty_url' };
  }

  const trimmed = rawUrl.trim();

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    let candidateFormUrl = trimmed;

    // 1. Lever: require company + uuid (/co/uuid) -> append /apply
    if (host.includes('jobs.lever.co')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && !pathname.endsWith('/apply')) {
        candidateFormUrl = `https://jobs.lever.co/${parts[0]}/${parts[1]}/apply`;
      }
    }

    // 2. Ashby: require company + uuid (/co/uuid) -> append /application
    if (host.includes('jobs.ashbyhq.com')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && !pathname.endsWith('/application')) {
        candidateFormUrl = `https://jobs.ashbyhq.com/${parts[0]}/${parts[1]}/application`;
      }
    }

    // 3. Greenhouse: boards.greenhouse.io/co/jobs/id -> append #app
    if (host.includes('greenhouse.io') && (pathname.includes('/jobs/') || pathname.includes('/jobs'))) {
      if (!parsed.hash.includes('app')) {
        parsed.hash = '#app';
        candidateFormUrl = parsed.toString();
      }
    }

    // 4. SmartRecruiters: /co/id -> append /apply
    if (host.includes('jobs.smartrecruiters.com')) {
      if (!pathname.endsWith('/apply')) {
        parsed.pathname = `${pathname.replace(/\/$/, '')}/apply`;
        candidateFormUrl = parsed.toString();
      }
    }

    // 5. Pre-flight HTTP 200 & Content 404 Health Check
    const res = await fetch(candidateFormUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    });

    if (res.status === 404 || res.status === 410 || res.status >= 500) {
      return { isValid: false, directApplyUrl: candidateFormUrl, sourceUrl: trimmed, failureReason: `http_${res.status}` };
    }

    const finalUrl = res.url || candidateFormUrl;
    const html = (await res.text()).toLowerCase();

    // Check for 404 / closed signatures in content
    for (const sig of ERROR_404_SIGNATURES) {
      if (html.includes(sig)) {
        return { isValid: false, directApplyUrl: finalUrl, sourceUrl: trimmed, failureReason: 'content_404_closed' };
      }
    }

    // 6. For Aggregator Portals (Remotive, Jobicy, Niche Boards):
    // If the HTML has a direct external apply link (e.g. Lever, Greenhouse, Ashby, Workday), extract it!
    const externalApplyMatch = html.match(/href=["'](https?:\/\/(?:jobs\.lever\.co|boards\.greenhouse\.io|jobs\.ashbyhq\.com|[^"']+\.myworkdayjobs\.com)[^"']*)["']/i);
    if (externalApplyMatch && externalApplyMatch[1]) {
      const resolvedExternalUrl = externalApplyMatch[1];
      return { isValid: true, directApplyUrl: resolvedExternalUrl, sourceUrl: trimmed };
    }

    return { isValid: true, directApplyUrl: finalUrl, sourceUrl: trimmed };
  } catch (err: any) {
    // If network timeout, keep original if structurally valid
    return { isValid: true, directApplyUrl: trimmed, sourceUrl: trimmed };
  }
}

/**
 * Batch resolves direct application forms and purges dead links across all scraped jobs in parallel.
 */
export async function batchResolveAndFilterJobs(
  jobs: RawJob[],
  concurrency: number = 10
): Promise<RawJob[]> {
  console.log(`[Form Link Resolver] Pre-crawling and verifying direct form URLs for ${jobs.length} positions (Concurrency: ${concurrency})...`);
  
  const verifiedJobs: RawJob[] = [];
  let deadLinksFiltered = 0;
  let directFormsResolved = 0;

  for (let i = 0; i < jobs.length; i += concurrency) {
    const chunk = jobs.slice(i, i + concurrency);
    const resolvedChunk = await Promise.all(
      chunk.map(async (job) => {
        const res = await resolveDirectFormUrl(job.applyUrl, job.company);
        return { job, res };
      })
    );

    for (const { job, res } of resolvedChunk) {
      if (!res.isValid) {
        deadLinksFiltered++;
        continue;
      }

      if (res.directApplyUrl !== job.applyUrl) {
        directFormsResolved++;
        job.applyUrl = res.directApplyUrl;
      }

      verifiedJobs.push(job);
    }
  }

  console.log(`[Form Link Resolver] Verified: ${verifiedJobs.length} active positions (+${directFormsResolved} direct form deep-links resolved, -${deadLinksFiltered} dead/404 links purged).`);
  return verifiedJobs;
}
