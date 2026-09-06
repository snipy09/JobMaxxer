import { describe, it, expect, vi } from 'vitest';
import { resolveDirectFormUrl, batchResolveAndFilterJobs } from '../form-link-resolver.js';
import type { RawJob } from '../ats-api-scraper.js';

describe('Pre-Computed Direct Form Link Resolver', () => {
  it('resolves valid Lever URLs to /apply endpoint', async () => {
    // Mock global fetch to return 200 with valid content
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      url: 'https://jobs.lever.co/razorpay/1234-abcd/apply',
      text: () => Promise.resolve('<html><body><form id="application-form">Apply</form></body></html>'),
    } as any);

    const result = await resolveDirectFormUrl('https://jobs.lever.co/razorpay/1234-abcd');
    expect(result.isValid).toBe(true);
    expect(result.directApplyUrl).toBe('https://jobs.lever.co/razorpay/1234-abcd/apply');

    global.fetch = originalFetch;
  });

  it('filters out 404 dead job boards', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      status: 404,
      url: 'https://boards.greenhouse.io/deadboard',
      text: () => Promise.resolve('<html><body>Page not found - The job board you were viewing is no longer active</body></html>'),
    } as any);

    const result = await resolveDirectFormUrl('https://boards.greenhouse.io/deadboard/jobs/999');
    expect(result.isValid).toBe(false);

    global.fetch = originalFetch;
  });

  it('batch resolves a list of jobs and purges invalid ones', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('dead')) {
        return Promise.resolve({
          status: 404,
          url,
          text: () => Promise.resolve('404 not found'),
        });
      }
      return Promise.resolve({
        status: 200,
        url,
        text: () => Promise.resolve('<html><body>Job description and apply form</body></html>'),
      });
    });

    const mockJobs: RawJob[] = [
      {
        company: 'LiveCorp',
        title: 'Software Engineer',
        location: 'Remote',
        description: 'Great role',
        applyUrl: 'https://jobs.ashbyhq.com/livecorp/abcd-1234',
        source: 'Ashby',
        jobHash: 'hash1',
      },
      {
        company: 'DeadCorp',
        title: 'Old Job',
        location: 'Remote',
        description: 'Dead role',
        applyUrl: 'https://jobs.lever.co/deadcorp/dead-id',
        source: 'Lever',
        jobHash: 'hash2',
      },
    ];

    const verified = await batchResolveAndFilterJobs(mockJobs, 5);
    expect(verified.length).toBe(1);
    expect(verified[0].company).toBe('LiveCorp');
    expect(verified[0].applyUrl).toBe('https://jobs.ashbyhq.com/livecorp/abcd-1234/application');

    global.fetch = originalFetch;
  });
});
