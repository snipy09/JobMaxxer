import { describe, expect, it } from 'vitest';
import { computeJobRelevance, extractCandidateKeywords } from '../data/relevanceMatcher';
import { MasterProfile, Job } from '../types';

describe('Candidate Relevance Matcher', () => {
  const profile: MasterProfile = {
    firstName: 'Alex',
    lastName: 'Dev',
    email: 'alex@example.com',
    desiredTitle: 'Frontend Engineer',
    techStack: 'React, TypeScript, Next.js, Tailwind CSS',
    workplaceType: 'remote',
    experienceLevel: 'mid',
    customAnswers: {},
  };

  it('correctly tokenizes candidate role and skills', () => {
    const { roleTokens, skillTokens } = extractCandidateKeywords(profile);
    expect(roleTokens).toContain('frontend');
    expect(roleTokens).toContain('engineer');
    expect(skillTokens).toContain('react');
    expect(skillTokens).toContain('typescript');
    expect(skillTokens).toContain('next.js');
    expect(skillTokens).toContain('tailwind');
  });

  it('awards high match score and extracts matched skills for direct alignments', () => {
    const job: Job = {
      title: 'Senior Frontend Engineer (React & TypeScript)',
      company: 'Vercel',
      applyUrl: 'https://boards.greenhouse.io/vercel/jobs/123',
      location: 'Remote',
      workplaceType: 'remote',
      description: 'Building world-class frontend web applications using React, Next.js, and TypeScript.',
    };

    const result = computeJobRelevance(job, profile);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.isStrongMatch).toBe(true);
    expect(result.matchedSkills).toContain('React');
    expect(result.matchedSkills).toContain('Typescript');
    expect(result.matchedSkills).toContain('Next.js');
  });

  it('assigns lower baseline score to non-matching roles', () => {
    const job: Job = {
      title: 'Senior Site Reliability Engineer',
      company: 'Cloud Corp',
      applyUrl: 'https://jobs.lever.co/cloud/456',
      location: 'New York, NY',
      workplaceType: 'onsite',
      description: 'Maintain Kubernetes clusters, Terraform modules, and Prometheus alerting.',
    };

    const result = computeJobRelevance(job, profile);
    expect(result.score).toBeLessThanOrEqual(65);
    expect(result.isStrongMatch).toBe(false);
    expect(result.matchedSkills.length).toBe(0);
  });
});
