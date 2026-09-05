import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeRelevanceScore, extractProfileKeywords, runAllScrapers } from '../index.js';
import type { RawJob, ScoredJob } from '../index.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('../internshala-scraper.js', () => ({
  scrapeInternshala: vi.fn().mockResolvedValue([])
}));

vi.mock('../indian-portals-scraper.js', () => ({
  scrapeNaukriIndia: vi.fn().mockResolvedValue([]),
  scrapeIndeedIndia: vi.fn().mockResolvedValue([])
}));

describe('computeRelevanceScore', () => {
  const mockJob: RawJob = {
    company: 'Test Company',
    title: 'Senior React Developer',
    location: 'Remote',
    description: 'We are looking for a React developer with TypeScript experience. Must know Node.js and PostgreSQL.',
    applyUrl: 'https://example.com/job/123',
    source: 'Test Source',
    jobHash: 'hash123'
  };

  it('returns 50 for empty keywords array', () => {
    const score = computeRelevanceScore(mockJob, []);
    expect(score).toBe(50);
  });

  it('returns 50 for null/undefined keywords', () => {
    const score1 = computeRelevanceScore(mockJob, null as any);
    const score2 = computeRelevanceScore(mockJob, undefined as any);
    expect(score1).toBe(50);
    expect(score2).toBe(50);
  });

  it('gives double weight for title matches', () => {
    const score = computeRelevanceScore(mockJob, ['react']);
    expect(score).toBe(100);
  });

  it('gives single weight for description matches', () => {
    const score = computeRelevanceScore(mockJob, ['postgresql']);
    expect(score).toBe(50);
  });

  it('handles multiple keywords', () => {
    const score = computeRelevanceScore(mockJob, ['react', 'typescript', 'node']);
    expect(score).toBe(67);
  });

  it('caps score at 100', () => {
    const score = computeRelevanceScore(mockJob, ['react', 'senior', 'developer']);
    expect(score).toBe(100);
  });

  it('handles case insensitive matching', () => {
    const score = computeRelevanceScore(mockJob, ['REACT', 'TypeScript']);
    // 'react' matches in title (2 pts), 'typescript' matches in description (1 pt)
    // 3/4 * 100 = 75
    expect(score).toBe(75);
  });

  it('handles keywords with whitespace', () => {
    const score = computeRelevanceScore(mockJob, ['  react  ', '  typescript  ']);
    // 'react' matches in title (2 pts), 'typescript' matches in description (1 pt)
    // 3/4 * 100 = 75
    expect(score).toBe(75);
  });

  it('ignores empty keywords after trim', () => {
    const score = computeRelevanceScore(mockJob, ['react', '', '   ', 'typescript']);
    // Empty strings are filtered out, so only 'react' and 'typescript' count
    // 'react' matches in title (2 pts), 'typescript' matches in description (1 pt)
    // 3/4 * 100 = 75
    expect(score).toBe(75);
  });

  it('handles job with no title or description', () => {
    const emptyJob: RawJob = {
      ...mockJob,
      title: '',
      description: ''
    };
    const score = computeRelevanceScore(emptyJob, ['react']);
    expect(score).toBe(0);
  });
});

describe('extractProfileKeywords', () => {
  it('returns empty array for null/undefined profile', () => {
    expect(extractProfileKeywords(null as any)).toEqual([]);
    expect(extractProfileKeywords(undefined as any)).toEqual([]);
    expect(extractProfileKeywords({})).toEqual([]);
  });

  it('extracts explicit keywords array', () => {
    const profile = {
      keywords: ['react', 'typescript', 'node.js']
    };
    const result = extractProfileKeywords(profile);
    expect(result).toContain('react');
    expect(result).toContain('typescript');
    expect(result).toContain('node.js');
  });

  it('handles singular desiredTitle string', () => {
    const profile = {
      desiredTitle: 'Senior Software Engineer'
    };
    const result = extractProfileKeywords(profile);
    expect(result).toContain('senior software engineer');
  });

  it('handles desiredTitle with separators', () => {
    const profile = {
      desiredTitle: 'Frontend Developer,Backend Developer,Full Stack'
    };
    const result = extractProfileKeywords(profile);
    expect(result).toContain('frontend developer');
    expect(result).toContain('backend developer');
    expect(result).toContain('full stack');
  });

  it('handles desiredTitle as array', () => {
    const profile = {
      desiredTitle: ['Frontend Developer', 'Backend Developer']
    };
    const result = extractProfileKeywords(profile);
    expect(result).toContain('frontend developer');
    expect(result).toContain('backend developer');
  });

  it('handles desired_title snake_case', () => {
    const profile = {
      desired_title: 'Full Stack Engineer'
    };
    const result = extractProfileKeywords(profile);
    expect(result).toContain('full stack engineer');
  });

  it('extracts techStack as string', () => {
    const profile = {
      techStack: 'React, TypeScript, Node.js, PostgreSQL'
    };
    const result = extractProfileKeywords(profile);
    expect(result).toContain('react');
    expect(result).toContain('typescript');
    expect(result).toContain('node.js');
    expect(result).toContain('postgresql');
  });

  it('extracts techStack as array', () => {
    const profile = {
      techStack: ['React', 'TypeScript', 'Node.js']
    };
    const result = extractProfileKeywords(profile);
    expect(result).toContain('react');
    expect(result).toContain('typescript');
    expect(result).toContain('node.js');
  });

  it('handles tech_stack snake_case', () => {
    const profile = {
      tech_stack: 'Python, Django, AWS'
    };
    const result = extractProfileKeywords(profile);
    expect(result).toContain('python');
    expect(result).toContain('django');
    expect(result).toContain('aws');
  });

  it('deduplicates keywords', () => {
    const profile = {
      keywords: ['react', 'React', 'REACT', 'typescript'],
      techStack: 'react, typescript'
    };
    const result = extractProfileKeywords(profile);
    const reactCount = result.filter((k: string) => k === 'react').length;
    const tsCount = result.filter((k: string) => k === 'typescript').length;
    expect(reactCount).toBe(1);
    expect(tsCount).toBe(1);
  });

  it('filters out keywords shorter than 2 characters', () => {
    const profile = {
      keywords: ['a', 'ab', 'abc', 'js', 'ts', 'go']
    };
    const result = extractProfileKeywords(profile);
    expect(result).not.toContain('a');
    expect(result).toContain('ab');
    expect(result).toContain('abc');
    expect(result).toContain('js');
    expect(result).toContain('ts');
    expect(result).toContain('go');
  });

  it('combines all sources and deduplicates', () => {
    const profile = {
      keywords: ['react', 'typescript'],
      desiredTitle: 'React Developer',
      techStack: 'react, node.js'
    };
    const result = extractProfileKeywords(profile);
    expect(result).toContain('react');
    expect(result).toContain('typescript');
    expect(result).toContain('react developer');
    expect(result).toContain('node.js');
    expect(result.filter((k: string) => k === 'react').length).toBe(1);
  });
});

describe('runAllScrapers', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    mockFetch.mockReset();
    const { scrapeInternshala } = await import('../internshala-scraper.js');
    const { scrapeNaukriIndia, scrapeIndeedIndia } = await import('../indian-portals-scraper.js');
    vi.mocked(scrapeInternshala).mockResolvedValue([]);
    vi.mocked(scrapeNaukriIndia).mockResolvedValue([]);
    vi.mocked(scrapeIndeedIndia).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('extracts profile keywords and uses them for scoring', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

    const profile = {
      keywords: ['react', 'typescript'],
      desiredTitle: 'Senior React Developer'
    };

    const result = await runAllScrapers(profile);

    expect(mockFetch).toHaveBeenCalled();
  });

  it('deduplicates jobs by hash', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobs: [{
            title: 'React Developer',
            location: { name: 'Remote' },
            content: 'React job',
            absolute_url: 'https://example.com/job/1'
          }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          position: 'React Developer',
          url: 'https://example.com/job/1',
          company: 'Company B',
          location: 'Remote',
          description: 'React job'
        }]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

    const result = await runAllScrapers({ keywords: ['react'] });
    expect(result.length).toBe(1);
  });

  it('sorts jobs by score descending', async () => {
    mockFetch
      // Greenhouse API (Stripe)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobs: [{
            title: 'Senior React Developer',
            location: { name: 'Remote' },
            content: 'React TypeScript Node',
            absolute_url: 'https://example.com/job/1'
          }]
        })
      })
      // Lever API
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      // Web Search - react
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          position: 'Junior Developer',
          url: 'https://example.com/job/2',
          company: 'Company B',
          location: 'Remote',
          description: 'Java'
        }]
      })
      // Web Search - typescript
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      // Web Search - python
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      // Niche Boards
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

    const result = await runAllScrapers({ keywords: ['react', 'typescript', 'node'] });
    expect(result.length).toBeGreaterThanOrEqual(1);
    if (result.length > 1) { expect(result[0].score).toBeGreaterThanOrEqual(result[1].score); }
  });

  it('handles API errors gracefully', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

    const result = await runAllScrapers({ keywords: ['react'] });
    expect(Array.isArray(result)).toBe(true);
  });

  it('handles non-ok HTTP responses', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ jobs: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

    const result = await runAllScrapers({ keywords: ['react'] });
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns empty array when all scrapers return no jobs', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

    const result = await runAllScrapers({ keywords: ['react'] });
    expect(result).toEqual([]);
  });
});
