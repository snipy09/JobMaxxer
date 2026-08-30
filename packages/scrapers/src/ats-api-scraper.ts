import { computeJobHash } from './hasher.js';

export interface RawJob {
  company: string;
  title: string;
  location: string;
  description: string;
  applyUrl: string;
  source: string;
  jobHash: string;
  salary?: string;
}

export interface AtsBoardConfig {
  name: string;
  type: 'greenhouse' | 'lever' | 'ashby';
  boardId: string;
}

export const DEFAULT_TOP_TECH_BOARDS: AtsBoardConfig[] = [
  // Greenhouse Verified Boards
  { name: 'Stripe', type: 'greenhouse', boardId: 'stripe' },
  { name: 'Anthropic', type: 'greenhouse', boardId: 'anthropic' },
  { name: 'Datadog', type: 'greenhouse', boardId: 'datadog' },
  { name: 'Cloudflare', type: 'greenhouse', boardId: 'cloudflare' },
  { name: 'Brex', type: 'greenhouse', boardId: 'brex' },
  { name: 'Scale AI', type: 'greenhouse', boardId: 'scaleai' },
  { name: 'Affirm', type: 'greenhouse', boardId: 'affirm' },
  { name: 'GitLab', type: 'greenhouse', boardId: 'gitlab' },
  { name: 'Coinbase', type: 'greenhouse', boardId: 'coinbase' },
  { name: 'Flexport', type: 'greenhouse', boardId: 'flexport' },
  { name: 'Figma', type: 'greenhouse', boardId: 'figma' },
  { name: 'Reddit', type: 'greenhouse', boardId: 'reddit' },
  { name: 'Postman', type: 'greenhouse', boardId: 'postman' },
  { name: 'Gusto', type: 'greenhouse', boardId: 'gusto' },
  { name: 'Vercel', type: 'greenhouse', boardId: 'vercel' },
  { name: 'Discord', type: 'greenhouse', boardId: 'discord' },
  { name: 'Checkr', type: 'greenhouse', boardId: 'checkr' },
  { name: 'Webflow', type: 'greenhouse', boardId: 'webflow' },

  // Ashby Verified Boards
  { name: 'Ramp', type: 'ashby', boardId: 'ramp' },
  { name: 'Cursor', type: 'ashby', boardId: 'cursor' },
  { name: 'Perplexity', type: 'ashby', boardId: 'perplexity' },
  { name: 'Replit', type: 'ashby', boardId: 'replit' },
  { name: 'Supabase', type: 'ashby', boardId: 'supabase' },
  { name: 'Linear', type: 'ashby', boardId: 'linear' },
  { name: 'Modal', type: 'ashby', boardId: 'modal' },
  { name: 'Resend', type: 'ashby', boardId: 'resend' },
];

export async function scrapeAtsApis(
  companyBoards: AtsBoardConfig[] = DEFAULT_TOP_TECH_BOARDS
): Promise<RawJob[]> {
  const jobs: RawJob[] = [];

  for (const board of companyBoards) {
    try {
      if (board.type === 'greenhouse') {
        const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board.boardId}/jobs?content=true`);
        if (res.ok) {
          const data: any = await res.json();
          if (data && Array.isArray(data.jobs)) {
            for (const item of data.jobs) {
              const applyUrl = item.absolute_url;
              if (!applyUrl || typeof applyUrl !== 'string') continue;
              const hash = computeJobHash(board.name, item.title, applyUrl);
              jobs.push({
                company: board.name,
                title: item.title,
                location: item.location?.name || 'Remote / Unspecified',
                description: item.content || '',
                applyUrl,
                source: 'Greenhouse API',
                jobHash: hash,
              });
            }
          }
        }
      } else if (board.type === 'lever') {
        const res = await fetch(`https://api.lever.co/v0/postings/${board.boardId}?mode=json`);
        if (res.ok) {
          const data: any = await res.json();
          if (Array.isArray(data)) {
            for (const item of data) {
              const applyUrl = item.applyUrl || item.hostedUrl;
              if (!applyUrl || typeof applyUrl !== 'string') continue;
              const hash = computeJobHash(board.name, item.text, applyUrl);
              jobs.push({
                company: board.name,
                title: item.text,
                location: item.categories?.location || 'Remote / Unspecified',
                description: item.descriptionPlain || item.description || '',
                applyUrl,
                source: 'Lever API',
                jobHash: hash,
              });
            }
          }
        }
      } else if (board.type === 'ashby') {
        const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${board.boardId}`);
        if (res.ok) {
          const data: any = await res.json();
          if (data && Array.isArray(data.jobs)) {
            for (const item of data.jobs) {
              const applyUrl = item.jobUrl || `https://jobs.ashbyhq.com/${board.boardId}/${item.id}`;
              if (!applyUrl || typeof applyUrl !== 'string') continue;
              const hash = computeJobHash(board.name, item.title, applyUrl);
              jobs.push({
                company: board.name,
                title: item.title,
                location: item.location || 'Remote / Unspecified',
                description: item.descriptionPlain || '',
                applyUrl,
                source: 'Ashby API',
                jobHash: hash,
              });
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`[ATS Scraper] Failed to scrape ${board.name} (${board.type}):`, err.message);
    }
  }

  return jobs;
}
