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
  type: 'lever' | 'ashby';
  boardId: string;
}

export const DEFAULT_TOP_TECH_BOARDS: AtsBoardConfig[] = [
  // ── 1. Verified Live AI & Modern Developer Unicorns (Ashby - 100% Direct Form Application)
  { name: 'OpenAI', type: 'ashby', boardId: 'openai' },
  { name: 'Perplexity', type: 'ashby', boardId: 'perplexity' },
  { name: 'ElevenLabs', type: 'ashby', boardId: 'elevenlabs' },
  { name: 'Cursor', type: 'ashby', boardId: 'cursor' },
  { name: 'Supabase', type: 'ashby', boardId: 'supabase' },
  { name: 'Cohere', type: 'ashby', boardId: 'cohere' },
  { name: 'Cognition', type: 'ashby', boardId: 'cognition' },
  { name: 'Ramp', type: 'ashby', boardId: 'ramp' },
  { name: 'LangChain', type: 'ashby', boardId: 'langchain' },
  { name: 'Linear', type: 'ashby', boardId: 'linear' },
  { name: 'Replit', type: 'ashby', boardId: 'replit' },
  { name: 'Modal', type: 'ashby', boardId: 'modal' },
  { name: 'SigNoz', type: 'ashby', boardId: 'signoz' },
  { name: 'Braintrust', type: 'ashby', boardId: 'braintrust' },
  { name: 'Anyscale', type: 'ashby', boardId: 'anyscale' },
  { name: 'Midjourney', type: 'ashby', boardId: 'midjourney' },
  { name: 'PostHog', type: 'ashby', boardId: 'posthog' },
  { name: 'Resend', type: 'ashby', boardId: 'resend' },
  { name: 'LlamaIndex', type: 'ashby', boardId: 'llamaindex' },
  { name: 'CharacterAI', type: 'ashby', boardId: 'character' },
  { name: 'Pinecone', type: 'ashby', boardId: 'pinecone' },

  // ── 2. Verified Live Tech Leaders (Lever - 100% Direct /apply Form Endpoints)
  { name: 'Palantir', type: 'lever', boardId: 'palantir' },
  { name: 'Spotify', type: 'lever', boardId: 'spotify' },
  { name: 'Meesho', type: 'lever', boardId: 'meesho' },
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
              const loc = typeof item.location === 'string' ? item.location : (item.location?.name || 'Remote / Unspecified');
              const titleLower = (item.title || '').toLowerCase();
              const isIntern = titleLower.includes('intern') || titleLower.includes('trainee');
              const isRemote = String(loc).toLowerCase().includes('remote') || titleLower.includes('remote');

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
