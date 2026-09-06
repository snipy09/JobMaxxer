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
  employmentType?: 'job' | 'internship';
  workplaceType?: 'remote' | 'hybrid' | 'onsite';
  experienceLevel?: 'entry' | 'mid' | 'senior';
  createdAt?: string;
}

export interface AtsBoardConfig {
  name: string;
  type: 'greenhouse' | 'lever' | 'ashby';
  boardId: string;
}

export const DEFAULT_TOP_TECH_BOARDS: AtsBoardConfig[] = [
  // Verified Live Indian Tech Unicorns & Scaleups
  { name: 'Postman', type: 'greenhouse', boardId: 'postman' },
  { name: 'InMobi', type: 'greenhouse', boardId: 'inmobi' },
  { name: 'Meesho', type: 'lever', boardId: 'meesho' },
  { name: 'Groww', type: 'greenhouse', boardId: 'groww' },
  { name: 'SigNoz', type: 'ashby', boardId: 'signoz' },

  // Fast-Growing Developer AI & YC Scaleups
  { name: 'Supabase', type: 'ashby', boardId: 'supabase' },
  { name: 'Linear', type: 'ashby', boardId: 'linear' },
  { name: 'Modal', type: 'ashby', boardId: 'modal' },
  { name: 'Resend', type: 'ashby', boardId: 'resend' },
  { name: 'Cursor', type: 'ashby', boardId: 'cursor' },
  { name: 'Perplexity', type: 'ashby', boardId: 'perplexity' },
  { name: 'Replit', type: 'ashby', boardId: 'replit' },
  { name: 'Ramp', type: 'ashby', boardId: 'ramp' },

  // Top Global & Remote Engineering Hubs
  { name: 'Scale AI', type: 'greenhouse', boardId: 'scaleai' },
  { name: 'Vercel', type: 'greenhouse', boardId: 'vercel' },
  { name: 'Figma', type: 'greenhouse', boardId: 'figma' },
  { name: 'Reddit', type: 'greenhouse', boardId: 'reddit' },
  { name: 'Stripe', type: 'greenhouse', boardId: 'stripe' },
  { name: 'Anthropic', type: 'greenhouse', boardId: 'anthropic' },
  { name: 'Datadog', type: 'greenhouse', boardId: 'datadog' },
  { name: 'Cloudflare', type: 'greenhouse', boardId: 'cloudflare' },
  { name: 'Canonical', type: 'greenhouse', boardId: 'canonical' },
  { name: 'Twilio', type: 'greenhouse', boardId: 'twilio' },
  { name: 'Airbnb', type: 'greenhouse', boardId: 'airbnb' },
  { name: 'Elastic', type: 'greenhouse', boardId: 'elastic' },
  { name: 'GitLab', type: 'greenhouse', boardId: 'gitlab' },
  { name: 'Coinbase', type: 'greenhouse', boardId: 'coinbase' },
  { name: 'Brex', type: 'greenhouse', boardId: 'brex' },
  { name: 'Checkr', type: 'greenhouse', boardId: 'checkr' },
  { name: 'Webflow', type: 'greenhouse', boardId: 'webflow' },
  { name: 'Gusto', type: 'greenhouse', boardId: 'gusto' },
  { name: 'Flexport', type: 'greenhouse', boardId: 'flexport' },
  { name: 'Affirm', type: 'greenhouse', boardId: 'affirm' },
  { name: 'Lyft', type: 'greenhouse', boardId: 'lyft' },
  { name: 'Robinhood', type: 'greenhouse', boardId: 'robinhood' },
  { name: 'Pinterest', type: 'greenhouse', boardId: 'pinterest' },
  { name: 'Square', type: 'greenhouse', boardId: 'block' },
  { name: 'Okta', type: 'greenhouse', boardId: 'okta' },
  { name: 'MongoDB', type: 'greenhouse', boardId: 'mongodb' },
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
              const loc = item.location?.name || 'Remote / Unspecified';
              const titleLower = item.title.toLowerCase();
              const isIntern = titleLower.includes('intern') || titleLower.includes('trainee');
              const isRemote = loc.toLowerCase().includes('remote') || titleLower.includes('remote');

              jobs.push({
                company: board.name,
                title: item.title,
                location: loc,
                description: item.content || '',
                applyUrl,
                source: 'Greenhouse API',
                jobHash: hash,
                employmentType: isIntern ? 'internship' : 'job',
                workplaceType: isRemote ? 'remote' : 'hybrid',
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
              const loc = item.categories?.location || 'Remote / Unspecified';
              const titleLower = item.text.toLowerCase();
              const isIntern = titleLower.includes('intern') || titleLower.includes('trainee');
              const isRemote = loc.toLowerCase().includes('remote') || titleLower.includes('remote');

              jobs.push({
                company: board.name,
                title: item.text,
                location: loc,
                description: item.descriptionPlain || item.description || '',
                applyUrl,
                source: 'Lever API',
                jobHash: hash,
                employmentType: isIntern ? 'internship' : 'job',
                workplaceType: isRemote ? 'remote' : 'hybrid',
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
              const loc = item.location || 'Remote / Unspecified';
              const titleLower = item.title.toLowerCase();
              const isIntern = titleLower.includes('intern') || titleLower.includes('trainee');
              const isRemote = loc.toLowerCase().includes('remote') || titleLower.includes('remote');

              jobs.push({
                company: board.name,
                title: item.title,
                location: loc,
                description: item.descriptionPlain || '',
                applyUrl,
                source: 'Ashby API',
                jobHash: hash,
                employmentType: isIntern ? 'internship' : 'job',
                workplaceType: isRemote ? 'remote' : 'hybrid',
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
