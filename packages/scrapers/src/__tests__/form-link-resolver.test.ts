import { describe, it, expect, vi } from 'vitest';
import { resolveDirectFormUrl, batchResolveAndFilterJobs } from '../form-link-resolver.js';
import type { RawJob } from '../ats-api-scraper.js';

describe('Flawless Form Link Resolver & Quality Pipeline', () => {
  it('strictly rejects directory root URLs before network requests', async () => {
    const res1 = await resolveDirectFormUrl('https://jobs.elastic.co/?size=n_5_n');
    expect(res1.isValid).toBe(false);
    expect(res1.failureReason).toBe('directory_root_rejected');

    const res2 = await resolveDirectFormUrl('https://boards.greenhouse.io/elastic');
    expect(res2.isValid).toBe(false);
    expect(res2.failureReason).toBe('greenhouse_missing_job_id');
  });

  it('verifies canonical URLs with mocked network success', async () => {
    // Mock global fetch to return clean 200 HTML
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 200,
      ok: true,
      url: 'https://jobs.lever.co/postman/88f2195e-1234-5678/apply',
      text: async () => '<html><body><form id="application-form"><input type="email" /></form></body></html>',
    } as any);

    const res = await resolveDirectFormUrl('https://jobs.lever.co/postman/88f2195e-1234-5678');
    expect(res.isValid).toBe(true);
    expect(res.directApplyUrl).toBe('https://jobs.lever.co/postman/88f2195e-1234-5678/apply');

    fetchSpy.mockRestore();
  });

  it('batches and filters raw jobs, keeping only valid direct form positions', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('postman')) {
        return Promise.resolve({
          status: 200,
          ok: true,
          url: urlStr,
          text: async () => '<html><body><form id="application-form"></form></body></html>',
        } as any);
      }
      return Promise.resolve({
        status: 404,
        ok: false,
        text: async () => 'Page not found',
      } as any);
    });

    const sampleJobs: RawJob[] = [
      {
        company: 'Postman',
        title: 'Backend Engineer',
        location: 'Bengaluru',
        description: 'Great role',
        applyUrl: 'https://jobs.lever.co/postman/88f2195e-1234-5678',
        source: 'Lever',
        jobHash: 'hash1',
      },
      {
        company: 'Elastic Directory',
        title: 'Careers Directory',
        location: 'Remote',
        description: 'Bad role',
        applyUrl: 'https://jobs.elastic.co/?size=n_5_n',
        source: 'Directory',
        jobHash: 'hash2',
      }
    ];

    const verified = await batchResolveAndFilterJobs(sampleJobs, 2);
    expect(verified.length).toBe(1);
    expect(verified[0].company).toBe('Postman');
    expect(verified[0].applyUrl).toBe('https://jobs.lever.co/postman/88f2195e-1234-5678/apply');

    fetchSpy.mockRestore();
  });
});
