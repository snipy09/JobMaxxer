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
  { name: 'Stripe', type: 'greenhouse', boardId: 'stripe' },
  { name: 'Vercel', type: 'greenhouse', boardId: 'vercel' },
  { name: 'Linear', type: 'lever', boardId: 'linear' },
  { name: 'Figma', type: 'greenhouse', boardId: 'figma' },
  { name: 'Notion', type: 'lever', boardId: 'notion' },
  { name: 'Supabase', type: 'ashby', boardId: 'supabase' },
  { name: 'Retool', type: 'greenhouse', boardId: 'retool' },
  { name: 'Ramp', type: 'ashby', boardId: 'ramp' },
  { name: 'Anthropic', type: 'greenhouse', boardId: 'anthropic' },
  { name: 'OpenAI', type: 'greenhouse', boardId: 'openai' },
  { name: 'Datadog', type: 'greenhouse', boardId: 'datadog' },
  { name: 'Brex', type: 'greenhouse', boardId: 'brex' },
  { name: 'Canva', type: 'greenhouse', boardId: 'canva' },
  { name: 'Coinbase', type: 'greenhouse', boardId: 'coinbase' },
  { name: 'Discord', type: 'greenhouse', boardId: 'discord' },
  { name: 'Docker', type: 'greenhouse', boardId: 'docker' },
  { name: 'GitLab', type: 'greenhouse', boardId: 'gitlab' },
  { name: 'Plaid', type: 'greenhouse', boardId: 'plaid' },
  { name: 'Postman', type: 'greenhouse', boardId: 'postman' },
  { name: 'Replit', type: 'ashby', boardId: 'replit' },
  { name: 'Sentry', type: 'greenhouse', boardId: 'sentry' },
  { name: 'Webflow', type: 'greenhouse', boardId: 'webflow' },
  { name: 'Zapier', type: 'greenhouse', boardId: 'zapier' },
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
              const applyUrl = item.hostedUrl;
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
