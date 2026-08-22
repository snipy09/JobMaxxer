import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scrapeAtsApis } from '../ats-api-scraper.js';
import type { RawJob } from '../ats-api-scraper.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('scrapeAtsApis', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Greenhouse API', () => {
    it('successfully scrapes Greenhouse jobs', async () => {
      const mockJobs = [
        {
          title: 'Senior Software Engineer',
          location: { name: 'San Francisco, CA' },
          content: 'We are hiring a senior engineer...',
          absolute_url: 'https://boards.greenhouse.io/stripe/jobs/123'
        },
        {
          title: 'Frontend Developer',
          location: { name: 'Remote' },
          content: 'Frontend role with React...',
          absolute_url: 'https://boards.greenhouse.io/stripe/jobs/456'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: mockJobs })
      });

      const boards = [{ name: 'Stripe', type: 'greenhouse' as const, boardId: 'stripe' }];
      const result = await scrapeAtsApis(boards);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        company: 'Stripe',
        title: 'Senior Software Engineer',
        location: 'San Francisco, CA',
        description: 'We are hiring a senior engineer...',
        applyUrl: 'https://boards.greenhouse.io/stripe/jobs/123',
        source: 'Greenhouse API'
      });
      expect(result[0].jobHash).toBeDefined();
      expect(typeof result[0].jobHash).toBe('string');
      expect(result[0].jobHash.length).toBe(64); // SHA256 hex length
    });

    it('handles missing location gracefully', async () => {
      const mockJobs = [
        {
          title: 'Software Engineer',
          location: null,
          content: 'Job description',
          absolute_url: 'https://boards.greenhouse.io/test/jobs/1'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: mockJobs })
      });

      const boards = [{ name: 'Test', type: 'greenhouse' as const, boardId: 'test' }];
      const result = await scrapeAtsApis(boards);

      expect(result[0].location).toBe('Remote / Unspecified');
    });

    it('handles missing content gracefully', async () => {
      const mockJobs = [
        {
          title: 'Software Engineer',
          location: { name: 'Remote' },
          content: null,
          absolute_url: 'https://boards.greenhouse.io/test/jobs/1'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: mockJobs })
      });

      const boards = [{ name: 'Test', type: 'greenhouse' as const, boardId: 'test' }];
      const result = await scrapeAtsApis(boards);

      expect(result[0].description).toBe('');
    });

    it('handles empty jobs array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: [] })
      });

      const boards = [{ name: 'Test', type: 'greenhouse' as const, boardId: 'test' }];
      const result = await scrapeAtsApis(boards);

      expect(result).toHaveLength(0);
    });

    it('handles missing jobs property in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      const boards = [{ name: 'Test', type: 'greenhouse' as const, boardId: 'test' }];
      const result = await scrapeAtsApis(boards);

      expect(result).toHaveLength(0);
    });

    it('handles non-ok HTTP response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ jobs: [] })
      });

      const boards = [{ name: 'Test', type: 'greenhouse' as const, boardId: 'test' }];
      const result = await scrapeAtsApis(boards);

      expect(result).toHaveLength(0);
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const boards = [{ name: 'Test', type: 'greenhouse' as const, boardId: 'test' }];
      const result = await scrapeAtsApis(boards);

      expect(result).toHaveLength(0);
    });
  });

  describe('Lever API', () => {
    it('successfully scrapes Lever jobs', async () => {
      const mockJobs = [
        {
          text: 'Backend Engineer',
          categories: { location: 'New York, NY' },
          descriptionPlain: 'Backend role with Go and PostgreSQL',
          hostedUrl: 'https://jobs.lever.co/lever/123'
        },
        {
          text: 'DevOps Engineer',
          categories: { location: 'Remote' },
          description: '<p>DevOps role with AWS</p>',
          hostedUrl: 'https://jobs.lever.co/lever/456'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobs
      });

      const boards = [{ name: 'Lever Demo', type: 'lever' as const, boardId: 'lever' }];
      const result = await scrapeAtsApis(boards);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        company: 'Lever Demo',
        title: 'Backend Engineer',
        location: 'New York, NY',
        description: 'Backend role with Go and PostgreSQL',
        applyUrl: 'https://jobs.lever.co/lever/123',
        source: 'Lever API'
      });
      expect(result[0].jobHash).toBeDefined();
    });

    it('falls back to description when descriptionPlain is missing', async () => {
      const mockJobs = [
        {
          text: 'Software Engineer',
          categories: { location: 'Remote' },
          description: 'Fallback description',
          hostedUrl: 'https://jobs.lever.co/test/1'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobs
      });

      const boards = [{ name: 'Test', type: 'lever' as const, boardId: 'test' }];
      const result = await scrapeAtsApis(boards);

      expect(result[0].description).toBe('Fallback description');
    });

    it('handles missing categories.location', async () => {
      const mockJobs = [
        {
          text: 'Software Engineer',
          categories: {},
          descriptionPlain: 'Description',
          hostedUrl: 'https://jobs.lever.co/test/1'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobs
      });

      const boards = [{ name: 'Test', type: 'lever' as const, boardId: 'test' }];
      const result = await scrapeAtsApis(boards);

      expect(result[0].location).toBe('Remote / Unspecified');
    });

    it('handles empty array response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const boards = [{ name: 'Test', type: 'lever' as const, boardId: 'test' }];
      const result = await scrapeAtsApis(boards);

      expect(result).toHaveLength(0);
    });

    it('handles non-array response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      const boards = [{ name: 'Test', type: 'lever' as const, boardId: 'test' }];
      const result = await scrapeAtsApis(boards);

      expect(result).toHaveLength(0);
    });

    it('handles non-ok HTTP response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => []
      });

      const boards = [{ name: 'Test', type: 'lever' as const, boardId: 'test' }];
      const result = await scrapeAtsApis(boards);

      expect(result).toHaveLength(0);
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const boards = [{ name: 'Test', type: 'lever' as const, boardId: 'test' }];
      const result = await scrapeAtsApis(boards);

      expect(result).toHaveLength(0);
    });
  });

  describe('Mixed boards', () => {
    it('scrapes multiple boards of different types', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            jobs: [{
              title: 'Greenhouse Job',
              location: { name: 'Remote' },
              content: 'GH content',
              absolute_url: 'https://gh.com/job/1'
            }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            text: 'Lever Job',
            categories: { location: 'Remote' },
            descriptionPlain: 'LV content',
            hostedUrl: 'https://lever.com/job/1'
          }]
        });

      const boards = [
        { name: 'Company A', type: 'greenhouse' as const, boardId: 'companya' },
        { name: 'Company B', type: 'lever' as const, boardId: 'companyb' }
      ];

      const result = await scrapeAtsApis(boards);

      expect(result).toHaveLength(2);
      expect(result[0].source).toBe('Greenhouse API');
      expect(result[1].source).toBe('Lever API');
    });

    it('continues scraping other boards if one fails', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Greenhouse failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            text: 'Lever Job',
            categories: { location: 'Remote' },
            descriptionPlain: 'LV content',
            hostedUrl: 'https://lever.com/job/1'
          }]
        });

      const boards = [
        { name: 'Company A', type: 'greenhouse' as const, boardId: 'companya' },
        { name: 'Company B', type: 'lever' as const, boardId: 'companyb' }
      ];

      const result = await scrapeAtsApis(boards);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('Lever API');
    });
  });
});