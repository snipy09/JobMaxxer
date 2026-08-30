export type JobTypeFilter = 'all' | 'job' | 'internship';
export type WorkplaceFilter = 'all' | 'remote' | 'hybrid' | 'onsite';
export type ExperienceFilter = 'all' | 'entry' | 'mid' | 'senior';

export interface SeekerJob {
  title: string;
  company: string;
  applyUrl: string;
  location?: string;
  salary?: string;
  source?: string;
  score?: number;
  description?: string;
  employmentType?: 'job' | 'internship';
  workplaceType?: 'remote' | 'hybrid' | 'onsite';
  experienceLevel?: 'entry' | 'mid' | 'senior';
  createdAt?: string;
}

export interface JobFilterState {
  query?: string;
  type?: JobTypeFilter;
  workplace?: WorkplaceFilter;
  experience?: ExperienceFilter;
  source?: string;
  highMatchOnly?: boolean;
}

function text(job: SeekerJob): string {
  return `${job.title} ${job.company} ${job.location ?? ''} ${job.source ?? ''} ${job.description ?? ''}`.toLowerCase();
}

export function isInternship(job: SeekerJob): boolean {
  return job.employmentType === 'internship' || /\bintern(ship)?\b/i.test(`${job.title} ${job.description ?? ''}`);
}

export function workplaceOf(job: SeekerJob): 'remote' | 'hybrid' | 'onsite' {
  if (job.workplaceType) return job.workplaceType;
  const location = (job.location ?? '').toLowerCase();
  if (location.includes('remote') || location.includes('anywhere')) return 'remote';
  if (location.includes('hybrid')) return 'hybrid';
  return 'onsite';
}

export function experienceOf(job: SeekerJob): 'entry' | 'mid' | 'senior' {
  if (job.experienceLevel) return job.experienceLevel;
  const title = job.title.toLowerCase();
  if (/\b(intern|junior|entry|fresher|sde[ -]?1)\b/.test(title)) return 'entry';
  if (/\b(senior|sr\.?|lead|staff|principal|architect)\b/.test(title)) return 'senior';
  return 'mid';
}

export function filterSeekerJobs(jobs: SeekerJob[], filters: JobFilterState): SeekerJob[] {
  const query = (filters.query ?? '').trim().toLowerCase();
  const source = (filters.source ?? 'all').toLowerCase();

  return jobs
    .filter(job => {
      const haystack = text(job);
      if (haystack.includes('linkedin') || job.applyUrl.toLowerCase().includes('linkedin.com')) return false;
      if (query && !haystack.includes(query)) return false;
      if (filters.type === 'internship' && !isInternship(job)) return false;
      if (filters.type === 'job' && isInternship(job)) return false;
      if (filters.workplace && filters.workplace !== 'all' && workplaceOf(job) !== filters.workplace) return false;
      if (filters.experience && filters.experience !== 'all' && experienceOf(job) !== filters.experience) return false;
      if (source !== 'all' && !haystack.includes(source) && !job.applyUrl.toLowerCase().includes(source)) return false;
      if (filters.highMatchOnly && (job.score ?? 0) < 80) return false;
      return true;
    })
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.score ?? 0) - (a.score ?? 0);
    });
}

export function getQuickFilterJobs(jobs: SeekerJob[], filter: 'all' | 'remote' | 'high-match' | 'frontend' | 'backend' | 'internships'): SeekerJob[] {
  switch (filter) {
    case 'remote': return filterSeekerJobs(jobs, { workplace: 'remote' });
    case 'high-match': return filterSeekerJobs(jobs, { highMatchOnly: true });
    case 'frontend': return filterSeekerJobs(jobs, { query: 'frontend' });
    case 'backend': return filterSeekerJobs(jobs, { query: 'backend' });
    case 'internships': return filterSeekerJobs(jobs, { type: 'internship' });
    default: return filterSeekerJobs(jobs, {});
  }
}
