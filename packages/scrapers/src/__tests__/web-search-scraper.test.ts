import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scrapeWebSearchIndexes } from '../web-search-scraper.js';
import type { RawJob } from '../ats-api-scraper.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('scrapeWebSearchIndexes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('successfully scrapes RemoteOK API for multiple keywords', async () => {
    const mockResponse = [
      {}, // First item is metadata, skipped
      {
        position: 'Senior React Developer',
        company: 'TechCorp',
        location: 'Remote',
        description: 'React and TypeScript role',
        url: 'https://remoteok.com/remote-jobs/123'
      },
      {
        position: 'Python Engineer',
        company: 'DataCo',
        location: 'San Francisco',
        description: 'Python and Django',
        url: 'https://remoteok.com/remote-jobs/456'
      }
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

    const result = await scrapeWebSearchIndexes(['react', 'python']);

    expect(result).toHaveLength(4); // 2 jobs per keyword
    expect(result[0]).toMatchObject({
      title: 'Senior React Developer',
      company: 'TechCorp',
      location: 'Remote',
      description: 'React and TypeScript role',
      applyUrl: 'https://remoteok.com/remote-jobs/123',
      source: 'Web Index Engine'
    });
    expect(result[0].jobHash).toBeDefined();
  });

  it('handles empty results array', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{}] // Only metadata, no jobs
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{}]
      });

    const result = await scrapeWebSearchIndexes(['react', 'python']);

    expect(result).toHaveLength(0);
  });

  it('handles completely empty array response', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

    const result = await scrapeWebSearchIndexes(['react']);

    expect(result).toHaveLength(0);
  });

  it('skips items without position or url', async () => {
    const mockResponse = [
      {},
      {
        position: 'Valid Job',
        company: 'Company A',
        url: 'https://remoteok.com/job/1'
      },
      {
        company: 'Company B', // Missing position
        url: 'https://remoteok.com/job/2'
      },
      {
        position: 'Another Job', // Missing url
        company: 'Company C'
      }
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await scrapeWebSearchIndexes(['react']);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Valid Job');
  });

  it('uses default company name when missing', async () => {
    const mockResponse = [
      {},
      {
        position: 'Developer',
        url: 'https://remoteok.com/job/1'
        // No company field
      }
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await scrapeWebSearchIndexes(['react']);

    expect(result[0].company).toBe('Tech Company');
  });

  it('uses default location when missing', async () => {
    const mockResponse = [
      {},
      {
        position: 'Developer',
        company: 'Company A',
        url: 'https://remoteok.com/job/1'
        // No location field
      }
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await scrapeWebSearchIndexes(['react']);

    expect(result[0].location).toBe('Remote');
  });

  it('handles missing description gracefully', async () => {
    const mockResponse = [
      {},
      {
        position: 'Developer',
        company: 'Company A',
        location: 'Remote',
        url: 'https://remoteok.com/job/1'
        // No description
      }
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await scrapeWebSearchIndexes(['react']);

    expect(result[0].description).toBe('');
  });

  it('handles non-ok HTTP response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => []
    });

    const result = await scrapeWebSearchIndexes(['react']);

    expect(result).toHaveLength(0);
  });

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await scrapeWebSearchIndexes(['react']);

    expect(result).toHaveLength(0);
  });

  it('handles malformed JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new Error('Invalid JSON'); }
    });

    const result = await scrapeWebSearchIndexes(['react']);

    expect(result).toHaveLength(0);
  });

  it('encodes keywords in URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{}]
    });

    await scrapeWebSearchIndexes(['react developer', 'node.js']);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toContain('tag=react%20developer');
    expect(mockFetch.mock.calls[1][0]).toContain('tag=node.js');
  });

  it('returns empty array for empty keywords array', async () => {
    const result = await scrapeWebSearchIndexes([]);
    expect(result).toHaveLength(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});