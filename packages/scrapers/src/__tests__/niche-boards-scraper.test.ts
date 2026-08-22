import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scrapeNicheBoards } from '../niche-boards-scraper.js';
import type { RawJob } from '../ats-api-scraper.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('scrapeNicheBoards', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('successfully scrapes Arbeitnow API', async () => {
    const mockResponse = {
      data: [
        {
          company_name: 'Tech Startup',
          title: 'Senior Full Stack Developer',
          location: 'Berlin, Germany',
          description: 'Full stack role with React and Node.js',
          url: 'https://arbeitnow.com/jobs/123'
        },
        {
          company_name: 'Remote Corp',
          title: 'DevOps Engineer',
          location: 'Remote',
          description: 'AWS and Kubernetes',
          url: 'https://arbeitnow.com/jobs/456'
        }
      ]
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await scrapeNicheBoards();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      company: 'Tech Startup',
      title: 'Senior Full Stack Developer',
      location: 'Berlin, Germany',
      description: 'Full stack role with React and Node.js',
      applyUrl: 'https://arbeitnow.com/jobs/123',
      source: 'Niche Board'
    });
    expect(result[0].jobHash).toBeDefined();
    expect(typeof result[0].jobHash).toBe('string');
    expect(result[0].jobHash.length).toBe(64); // SHA256 hex length
  });

  it('handles missing company_name', async () => {
    const mockResponse = {
      data: [
        {
          title: 'Software Engineer',
          location: 'Remote',
          description: 'Job description',
          url: 'https://arbeitnow.com/jobs/1'
          // No company_name
        }
      ]
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await scrapeNicheBoards();

    expect(result[0].company).toBe('Arbeitnow Tech');
  });

  it('handles missing location', async () => {
    const mockResponse = {
      data: [
        {
          company_name: 'Test Company',
          title: 'Software Engineer',
          description: 'Job description',
          url: 'https://arbeitnow.com/jobs/1'
          // No location
        }
      ]
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await scrapeNicheBoards();

    expect(result[0].location).toBe('Remote');
  });

  it('handles missing description', async () => {
    const mockResponse = {
      data: [
        {
          company_name: 'Test Company',
          title: 'Software Engineer',
          location: 'Remote',
          url: 'https://arbeitnow.com/jobs/1'
          // No description
        }
      ]
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await scrapeNicheBoards();

    expect(result[0].description).toBe('');
  });

  it('handles empty data array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] })
    });

    const result = await scrapeNicheBoards();

    expect(result).toHaveLength(0);
  });

  it('handles missing data property', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    const result = await scrapeNicheBoards();

    expect(result).toHaveLength(0);
  });

  it('handles non-array data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'not an array' })
    });

    const result = await scrapeNicheBoards();

    expect(result).toHaveLength(0);
  });

  it('handles non-ok HTTP response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ data: [] })
    });

    const result = await scrapeNicheBoards();

    expect(result).toHaveLength(0);
  });

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await scrapeNicheBoards();

    expect(result).toHaveLength(0);
  });

  it('handles malformed JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new Error('Invalid JSON'); }
    });

    const result = await scrapeNicheBoards();

    expect(result).toHaveLength(0);
  });

  it('makes request to correct API endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] })
    });

    await scrapeNicheBoards();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('https://www.arbeitnow.com/api/job-board-api');
  });
});