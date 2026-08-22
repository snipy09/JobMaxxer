import { RawJob } from './ats-api-scraper.js';
import { computeJobHash } from './hasher.js';

/**
 * Direct DOM HTTP Scraper Engine
 * Zero-dependency HTML parser for structured job portal scraping.
 */

export function extractJobLinksFromHtml(html: string, baseUrl: string): RawJob[] {
  const jobs: RawJob[] = [];
  const linkMatches = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi) || [];

  for (const link of linkMatches) {
    const hrefMatch = link.match(/href=["']([^"']+)["']/i);
    const textMatch = link.match(/>([^<]+)</);

    if (hrefMatch && textMatch) {
      let href = hrefMatch[1];
      const title = textMatch[1].trim();

      const titleLower = title.toLowerCase();
      const isEngineeringRole =
        titleLower.includes('engineer') ||
        titleLower.includes('developer') ||
        (titleLower.includes('manager') && (
          titleLower.includes('engineering') ||
          titleLower.includes('technical') ||
          titleLower.includes('software') ||
          titleLower.includes('devops') ||
          titleLower.includes('platform') ||
          titleLower.includes('infrastructure')
        ));

      if (title.length > 5 && isEngineeringRole) {
        if (!href.startsWith('http')) {
          try {
            const urlObj = new URL(baseUrl);
            href = new URL(href, urlObj).href;
          } catch {
            const urlObj = new URL(baseUrl);
            href = `${urlObj.origin}/${href.replace(/^\.?\/?/, '')}`;
          }
        }

        const hash = computeJobHash('DOM Scraper', title, href);
        jobs.push({
          company: 'DOM Scraper',
          title,
          location: 'Remote / Unspecified',
          description: '',
          applyUrl: href,
          source: 'DOM Engine',
          jobHash: hash
        });
      }
    }
  }
  return jobs;
}

const KNOWN_TECH_KEYWORDS = [
  'react', 'typescript', 'javascript', 'node.js', 'node', 'python', 'java', 'c++', 'c#',
  'go', 'golang', 'rust', 'ruby', 'rails', 'php', 'swift', 'kotlin', 'aws', 'gcp', 'azure',
  'docker', 'kubernetes', 'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'graphql'
];

export function extractTechStackFromText(text: string): string[] {
  const norm = text.toLowerCase();
  const found = new Set<string>();
  for (const tech of KNOWN_TECH_KEYWORDS) {
    const regex = new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(norm)) {
      found.add(tech);
    }
  }
  return Array.from(found);
}

export async function scrapeDirectDom(targets: { name: string; url: string }[]): Promise<RawJob[]> {
  const jobs: RawJob[] = [];

  for (const target of targets) {
    try {
      const res = await fetch(target.url);
      if (res.ok) {
        const html = await res.text();
        const extracted = extractJobLinksFromHtml(html, target.url);
        for (const job of extracted) {
          job.company = target.name;
          job.source = `DOM Engine: ${target.name}`;
          job.jobHash = computeJobHash(target.name, job.title, job.applyUrl);
          jobs.push(job);
        }
      }
    } catch (err: any) {
      console.warn(`[DOM Scraper] Failed ${target.name}:`, err.message);
    }
  }

  return jobs;
}