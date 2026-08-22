import { RawJob } from './ats-api-scraper.js';
import { computeJobHash } from './hasher.js';

export async function scrapeWebSearchIndexes(queryKeywords: string[]): Promise<RawJob[]> {
  const jobs: RawJob[] = [];

  for (const keyword of queryKeywords) {
    try {
      const res = await fetch(`https://remoteok.com/api?tag=${encodeURIComponent(keyword)}`);
      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data)) {
          const postings = data.slice(1);
          for (const item of postings) {
            if (item.position && item.url) {
              const company = item.company || 'Tech Company';
              const title = item.position;
              const applyUrl = item.url;
              const hash = computeJobHash(company, title, applyUrl);

              jobs.push({
                company,
                title,
                location: item.location || 'Remote',
                description: item.description || '',
                applyUrl,
                source: 'Web Index Engine',
                jobHash: hash
              });
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Web Search Scraper] Failed for keyword ${keyword}:`, err.message);
    }
  }

  return jobs;
}
