import { describe, it, expect } from 'vitest';
import { transformToDirectApplyUrl } from '../direct-url-transformer.js';

describe('Direct-Apply URL Transformer (0ms Navigation)', () => {
  it('rewrites Lever job description URLs to direct /apply endpoints', () => {
    const jdUrl = 'https://jobs.lever.co/razorpay/88f2195e-1234-5678';
    expect(transformToDirectApplyUrl(jdUrl)).toBe('https://jobs.lever.co/razorpay/88f2195e-1234-5678/apply');
  });

  it('preserves Lever URLs that already end with /apply', () => {
    const applyUrl = 'https://jobs.lever.co/razorpay/88f2195e-1234-5678/apply';
    expect(transformToDirectApplyUrl(applyUrl)).toBe('https://jobs.lever.co/razorpay/88f2195e-1234-5678/apply');
  });

  it('rewrites Ashby job description URLs to direct /application endpoints', () => {
    const jdUrl = 'https://jobs.ashbyhq.com/linear/49102834-abcd';
    expect(transformToDirectApplyUrl(jdUrl)).toBe('https://jobs.ashbyhq.com/linear/49102834-abcd/application');
  });

  it('rewrites Greenhouse URLs to append #app anchor', () => {
    const ghUrl = 'https://boards.greenhouse.io/postman/jobs/5591023';
    expect(transformToDirectApplyUrl(ghUrl)).toBe('https://boards.greenhouse.io/postman/jobs/5591023#app');
  });

  it('rewrites SmartRecruiters URLs to direct /apply', () => {
    const srUrl = 'https://jobs.smartrecruiters.com/AcmeCorp/743999999999999';
    expect(transformToDirectApplyUrl(srUrl)).toBe('https://jobs.smartrecruiters.com/AcmeCorp/743999999999999/apply');
  });

  it('safely handles non-ATS and malformed URLs without throwing', () => {
    expect(transformToDirectApplyUrl('')).toBe('');
    expect(transformToDirectApplyUrl('https://example.com/careers')).toBe('https://example.com/careers');
    expect(transformToDirectApplyUrl('invalid-url')).toBe('invalid-url');
  });
});
