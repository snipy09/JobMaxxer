import { RawJob } from './ats-api-scraper.js';
import { computeJobHash } from './hasher.js';

export async function scrapeNicheBoards(): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api');
    if (res.ok) {
      const data: any = await res.json();
      if (data && Array.isArray(data.data)) {
        for (const item of data.data) {
          const company = item.company_name || 'Arbeitnow Tech';
          const title = item.title;
          const applyUrl = item.url;
          const hash = computeJobHash(company, title, applyUrl);

          jobs.push({
            company,
            title,
            location: item.location || 'Remote',
            description: item.description || '',
            applyUrl,
            source: 'Niche Board',
            jobHash: hash
          });
        }
      }
    }
  } catch (err: any) {
    console.warn(`[Niche Scraper] Failed:`, err.message);
  }

  return jobs;
}
