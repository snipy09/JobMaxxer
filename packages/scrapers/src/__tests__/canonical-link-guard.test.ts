import { describe, it, expect } from 'vitest';
import { validateCanonicalJobUrl } from '../canonical-link-guard.js';

describe('Canonical Link Guard (Stage 1 Strict Validator)', () => {
  it('accepts valid Lever job detail URLs', () => {
    const res = validateCanonicalJobUrl('https://jobs.lever.co/postman/88f2195e-1234-5678');
    expect(res.isValid).toBe(true);
    expect(res.platform).toBe('lever');
  });

  it('accepts valid Greenhouse job detail URLs', () => {
    const res = validateCanonicalJobUrl('https://boards.greenhouse.io/inmobi/jobs/5591023');
    expect(res.isValid).toBe(true);
    expect(res.platform).toBe('greenhouse');
  });

  it('accepts valid Ashby job detail URLs', () => {
    const res = validateCanonicalJobUrl('https://jobs.ashbyhq.com/signoz/991283');
    expect(res.isValid).toBe(true);
    expect(res.platform).toBe('ashby');
  });

  it('accepts valid Internshala direct detail URLs', () => {
    const res = validateCanonicalJobUrl('https://internshala.com/internship/detail/fullstack-developer-internship-in-bangalore-17254890');
    expect(res.isValid).toBe(true);
    expect(res.platform).toBe('internshala');
  });

  it('strictly rejects directory root URLs and search pages', () => {
    const root1 = validateCanonicalJobUrl('https://jobs.elastic.co/?size=n_5_n');
    expect(root1.isValid).toBe(false);

    const root2 = validateCanonicalJobUrl('https://boards.greenhouse.io/elastic');
    expect(root2.isValid).toBe(false);

    const root3 = validateCanonicalJobUrl('https://internshala.com/internships');
    expect(root3.isValid).toBe(false);

    const root4 = validateCanonicalJobUrl('https://jobs.lever.co/postman');
    expect(root4.isValid).toBe(false);
  });
});
