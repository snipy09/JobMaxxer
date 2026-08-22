import { describe, it, expect } from 'vitest';
import { computeJobHash } from '../hasher.js';

describe('computeJobHash', () => {
  it('generates consistent SHA256 hash for same inputs', () => {
    const hash1 = computeJobHash('Company A', 'Software Engineer', 'https://example.com/job/1');
    const hash2 = computeJobHash('Company A', 'Software Engineer', 'https://example.com/job/1');
    expect(hash1).toBe(hash2);
  });

  it('generates different hashes for different companies', () => {
    const hash1 = computeJobHash('Company A', 'Software Engineer', 'https://example.com/job/1');
    const hash2 = computeJobHash('Company B', 'Software Engineer', 'https://example.com/job/1');
    expect(hash1).not.toBe(hash2);
  });

  it('generates different hashes for different titles', () => {
    const hash1 = computeJobHash('Company A', 'Software Engineer', 'https://example.com/job/1');
    const hash2 = computeJobHash('Company A', 'Backend Engineer', 'https://example.com/job/1');
    expect(hash1).not.toBe(hash2);
  });

  it('generates different hashes for different URLs', () => {
    const hash1 = computeJobHash('Company A', 'Software Engineer', 'https://example.com/job/1');
    const hash2 = computeJobHash('Company A', 'Software Engineer', 'https://example.com/job/2');
    expect(hash1).not.toBe(hash2);
  });

  it('normalizes URL by removing query parameters', () => {
    const hash1 = computeJobHash('Company A', 'Software Engineer', 'https://example.com/job/1?ref=linkedin');
    const hash2 = computeJobHash('Company A', 'Software Engineer', 'https://example.com/job/1?source=indeed');
    const hash3 = computeJobHash('Company A', 'Software Engineer', 'https://example.com/job/1');
    expect(hash1).toBe(hash2);
    expect(hash1).toBe(hash3);
  });

  it('normalizes URL to lowercase', () => {
    const hash1 = computeJobHash('Company A', 'Software Engineer', 'https://Example.COM/Job/1');
    const hash2 = computeJobHash('Company A', 'Software Engineer', 'https://example.com/job/1');
    expect(hash1).toBe(hash2);
  });

  it('normalizes company name to lowercase and trims', () => {
    const hash1 = computeJobHash('  Company A  ', 'Software Engineer', 'https://example.com/job/1');
    const hash2 = computeJobHash('company a', 'Software Engineer', 'https://example.com/job/1');
    expect(hash1).toBe(hash2);
  });

  it('normalizes title to lowercase and trims', () => {
    const hash1 = computeJobHash('Company A', '  Software Engineer  ', 'https://example.com/job/1');
    const hash2 = computeJobHash('Company A', 'software engineer', 'https://example.com/job/1');
    expect(hash1).toBe(hash2);
  });

  it('produces 64-character hex string (SHA256)', () => {
    const hash = computeJobHash('Company A', 'Software Engineer', 'https://example.com/job/1');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handles special characters in company name', () => {
    const hash1 = computeJobHash('Company & Co.', 'Software Engineer', 'https://example.com/job/1');
    const hash2 = computeJobHash('company & co.', 'Software Engineer', 'https://example.com/job/1');
    expect(hash1).toBe(hash2);
  });

  it('handles special characters in title', () => {
    const hash1 = computeJobHash('Company A', 'Senior React/Node Developer', 'https://example.com/job/1');
    const hash2 = computeJobHash('Company A', 'senior react/node developer', 'https://example.com/job/1');
    expect(hash1).toBe(hash2);
  });

  it('handles URLs with fragments', () => {
    const hash1 = computeJobHash('Company A', 'Software Engineer', 'https://example.com/job/1#details');
    const hash2 = computeJobHash('Company A', 'Software Engineer', 'https://example.com/job/1');
    // Fragment is not removed by split('?')[0], so they should be different
    expect(hash1).not.toBe(hash2);
  });

  it('handles empty strings', () => {
    const hash = computeJobHash('', '', '');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces deterministic hash across multiple calls', () => {
    const inputs = [
      { company: 'Google', title: 'Software Engineer', url: 'https://careers.google.com/jobs/123' },
      { company: 'Microsoft', title: 'Principal Engineer', url: 'https://careers.microsoft.com/jobs/456' },
      { company: 'Amazon', title: 'SDE II', url: 'https://amazon.jobs/en/jobs/789' }
    ];

    for (const input of inputs) {
      const hash1 = computeJobHash(input.company, input.title, input.url);
      const hash2 = computeJobHash(input.company, input.title, input.url);
      const hash3 = computeJobHash(input.company, input.title, input.url);
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    }
  });

  it('different input order produces different hashes', () => {
    const hash1 = computeJobHash('Company A', 'Software Engineer', 'https://example.com/job/1');
    const hash2 = computeJobHash('Software Engineer', 'Company A', 'https://example.com/job/1');
    expect(hash1).not.toBe(hash2);
  });

  it('handles unicode characters', () => {
    const hash1 = computeJobHash('König GmbH', 'Software Engineer', 'https://example.com/job/1');
    const hash2 = computeJobHash('könig gmbh', 'Software Engineer', 'https://example.com/job/1');
    expect(hash1).toBe(hash2);
  });

  it('handles very long URLs', () => {
    const longUrl = 'https://example.com/job/1' + '?param=' + 'x'.repeat(1000);
    const hash = computeJobHash('Company A', 'Software Engineer', longUrl);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});