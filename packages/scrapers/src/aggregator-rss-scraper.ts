import { RawJob } from './ats-api-scraper.js';
import { computeJobHash } from './hasher.js';

export async function scrapeAggregatorsAndRss(rssUrls: { name: string; url: string }[]): Promise<RawJob[]> {
  const jobs: RawJob[] = [];

  for (const feed of rssUrls) {
    try {
      const res = await fetch(feed.url);
      if (res.ok) {
        const text = await res.text();
        const matches = text.match(/<item>[\s\S]*?<\/item>/g) || [];

        for (const itemXml of matches) {
          const titleMatch = itemXml.match(/<title>(.*?)<\/title>/);
          const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
          const descMatch = itemXml.match(/<description>(.*?)<\/description>/);

          const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
          const applyUrl = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
          const description = descMatch ? descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';

          if (title && applyUrl) {
            const hash = computeJobHash(feed.name, title, applyUrl);
            jobs.push({
              company: feed.name,
              title,
              location: 'Remote / Unspecified',
              description,
              applyUrl,
              source: `RSS: ${feed.name}`,
              jobHash: hash
            });
          }
        }
      }
    } catch (err: any) {
      console.warn(`[RSS Scraper] Failed feed ${feed.name}:`, err.message);
    }
  }

  return jobs;
}
