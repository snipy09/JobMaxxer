import { describe, expect, it } from 'vitest';
import { filterSeekerJobs, getQuickFilterJobs } from '../seekerJobs.js';

const jobs = [
  {
    title: 'Frontend Engineer',
    company: 'Acme',
    applyUrl: 'https://boards.greenhouse.io/acme/1',
    location: 'Remote',
    source: 'Greenhouse API',
    score: 92,
    employmentType: 'job' as const,
    workplaceType: 'remote' as const,
    experienceLevel: 'mid' as const,
    createdAt: '2026-08-30T10:00:00.000Z',
  },
  {
    title: 'Software Development Intern',
    company: 'Orbit',
    applyUrl: 'https://internshala.com/job/2',
    location: 'Bengaluru',
    source: 'Internshala',
    score: 72,
    employmentType: 'internship' as const,
    workplaceType: 'onsite' as const,
    experienceLevel: 'entry' as const,
    createdAt: '2026-08-30T09:00:00.000Z',
  },
  {
    title: 'Senior Backend Engineer',
    company: 'Northstar',
    applyUrl: 'https://jobs.lever.co/northstar/3',
    location: 'Hybrid',
    source: 'Lever API',
    score: 84,
    employmentType: 'job' as const,
    workplaceType: 'hybrid' as const,
    experienceLevel: 'senior' as const,
    createdAt: '2026-08-30T08:00:00.000Z',
  },
  {
    title: 'LinkedIn-only role',
    company: 'Ignore Me',
    applyUrl: 'https://linkedin.com/jobs/view/4',
    location: 'Remote',
    score: 99,
  },
];

describe('Seeker job filters', () => {
  it('filters remote jobs and excludes LinkedIn listings', () => {
    const result = filterSeekerJobs(jobs, { workplace: 'remote' });
    expect(result.map(job => job.title)).toEqual(['Frontend Engineer']);
  });

  it('returns high-match jobs at score 80 or higher sorted newest first', () => {
    const result = getQuickFilterJobs(jobs, 'high-match');
    expect(result.map(job => job.title)).toEqual(['Frontend Engineer', 'Senior Backend Engineer']);
  });

  it('returns internship quick filter results', () => {
    const result = getQuickFilterJobs(jobs, 'internships');
    expect(result.map(job => job.title)).toEqual(['Software Development Intern']);
  });
});
