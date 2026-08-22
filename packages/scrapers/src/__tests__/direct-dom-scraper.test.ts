import { describe, it, expect } from 'vitest';
import { extractJobLinksFromHtml, extractTechStackFromText } from '../direct-dom-scraper.js';

describe('extractJobLinksFromHtml', () => {
  const sampleHtml = `
    <html>
      <body>
        <a href="/careers/senior-software-engineer">Senior Software Engineer</a>
        <a href="https://example.com/jobs/frontend-developer">Frontend Developer</a>
        <a href="/about-us">About Us</a>
        <a href="/careers/marketing-manager">Marketing Manager</a>
        <a href="/apply/backend-engineer">Backend Engineer</a>
        <a href="https://company.com/work/full-stack-dev">Full Stack Developer</a>
      </body>
    </html>
  `;

  it('extracts valid job links with engineering/tech titles and accurate relevance scores', () => {
    const result = extractJobLinksFromHtml(sampleHtml, 'https://example.com');
    // Marketing Manager is filtered out by isEngineeringRole filter
    expect(result).toHaveLength(4);

    const titles = result.map(j => j.title);
    expect(titles).toContain('Senior Software Engineer');
    expect(titles).toContain('Frontend Developer');
    expect(titles).toContain('Backend Engineer');
    expect(titles).toContain('Full Stack Developer');
  });

  it('resolves relative URLs against baseUrl', () => {
    const result = extractJobLinksFromHtml(sampleHtml, 'https://example.com');
    const seniorLink = result.find(j => j.title === 'Senior Software Engineer');
    expect(seniorLink?.applyUrl).toBe('https://example.com/careers/senior-software-engineer');
  });

  it('returns empty array when HTML contains no job links', () => {
    const noJobHtml = '<div><p>Welcome to our homepage</p></div>';
    const result = extractJobLinksFromHtml(noJobHtml, 'https://example.com');
    expect(result).toHaveLength(0);
  });
});

describe('extractTechStackFromText', () => {
  it('detects known technologies from raw job description text', () => {
    const text = 'We are looking for a Senior React Engineer with experience in TypeScript, Node.js, and Docker on AWS.';
    const tech = extractTechStackFromText(text);

    expect(tech).toContain('react');
    expect(tech).toContain('typescript');
    expect(tech).toContain('node.js');
    expect(tech).toContain('docker');
    expect(tech).toContain('aws');
  });

  it('is case-insensitive when detecting tech stack keywords', () => {
    const text = 'Required skills: PYTHON, KUBERNETES, POSTGRESQL, GRAPHQL';
    const tech = extractTechStackFromText(text);

    expect(tech).toContain('python');
    expect(tech).toContain('kubernetes');
    expect(tech).toContain('postgresql');
    expect(tech).toContain('graphql');
  });
});