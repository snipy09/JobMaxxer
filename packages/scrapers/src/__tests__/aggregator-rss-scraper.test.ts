import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scrapeAggregatorsAndRss } from '../aggregator-rss-scraper.js';
import type { RawJob } from '../ats-api-scraper.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('scrapeAggregatorsAndRss', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('successfully parses RSS feed with multiple items', async () => {
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Job Board</title>
    <item>
      <title>Senior React Developer</title>
      <link>https://jobboard.com/jobs/1</link>
      <description>React and TypeScript position</description>
    </item>
    <item>
      <title>Backend Engineer</title>
      <link>https://jobboard.com/jobs/2</link>
      <description>Go and PostgreSQL role</description>
    </item>
  </channel>
</rss>`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => rssXml
    });

    const feeds = [{ name: 'Job Board', url: 'https://jobboard.com/rss' }];
    const result = await scrapeAggregatorsAndRss(feeds);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      company: 'Job Board',
      title: 'Senior React Developer',
      location: 'Remote / Unspecified',
      description: 'React and TypeScript position',
      applyUrl: 'https://jobboard.com/jobs/1',
      source: 'RSS: Job Board'
    });
    expect(result[0].jobHash).toBeDefined();
    expect(result[1].title).toBe('Backend Engineer');
  });

  it('handles CDATA sections in title, link, and description', async () => {
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Job Board</title>
    <item>
      <title><![CDATA[Senior React & Node Developer]]></title>
      <link><![CDATA[https://jobboard.com/jobs/1?ref=rss]]></link>
      <description><![CDATA[React & Node.js position with <b>great benefits</b>]]></description>
    </item>
  </channel>
</rss>`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => rssXml
    });

    const feeds = [{ name: 'Job Board', url: 'https://jobboard.com/rss' }];
    const result = await scrapeAggregatorsAndRss(feeds);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Senior React & Node Developer');
    expect(result[0].applyUrl).toBe('https://jobboard.com/jobs/1?ref=rss');
    expect(result[0].description).toBe('React & Node.js position with <b>great benefits</b>');
  });

  it('handles items with missing title', async () => {
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Job Board</title>
    <item>
      <link>https://jobboard.com/jobs/1</link>
      <description>Description without title</description>
    </item>
    <item>
      <title>Valid Job</title>
      <link>https://jobboard.com/jobs/2</link>
      <description>Valid description</description>
    </item>
  </channel>
</rss>`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => rssXml
    });

    const feeds = [{ name: 'Job Board', url: 'https://jobboard.com/rss' }];
    const result = await scrapeAggregatorsAndRss(feeds);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Valid Job');
  });

  it('handles items with missing link', async () => {
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Job Board</title>
    <item>
      <title>Job Without Link</title>
      <description>Description</description>
    </item>
    <item>
      <title>Valid Job</title>
      <link>https://jobboard.com/jobs/2</link>
      <description>Valid description</description>
    </item>
  </channel>
</rss>`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => rssXml
    });

    const feeds = [{ name: 'Job Board', url: 'https://jobboard.com/rss' }];
    const result = await scrapeAggregatorsAndRss(feeds);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Valid Job');
  });

  it('handles items with missing description', async () => {
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Job Board</title>
    <item>
      <title>Job Without Description</title>
      <link>https://jobboard.com/jobs/1</link>
    </item>
  </channel>
</rss>`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => rssXml
    });

    const feeds = [{ name: 'Job Board', url: 'https://jobboard.com/rss' }];
    const result = await scrapeAggregatorsAndRss(feeds);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('');
  });

  it('handles empty items array', async () => {
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Job Board</title>
  </channel>
</rss>`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => rssXml
    });

    const feeds = [{ name: 'Job Board', url: 'https://jobboard.com/rss' }];
    const result = await scrapeAggregatorsAndRss(feeds);

    expect(result).toHaveLength(0);
  });

  it('handles malformed XML gracefully', async () => {
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Job Board</title>
    <item>
      <title>Job 1</title>
      <link>https://jobboard.com/jobs/1</link>
    </item>
  <channel>
</rss>`; // Missing closing tags

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => rssXml
    });

    const feeds = [{ name: 'Job Board', url: 'https://jobboard.com/rss' }];
    const result = await scrapeAggregatorsAndRss(feeds);

    // Should still parse what it can
    expect(result).toHaveLength(1);
  });

  it('handles non-ok HTTP response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => ''
    });

    const feeds = [{ name: 'Job Board', url: 'https://jobboard.com/rss' }];
    const result = await scrapeAggregatorsAndRss(feeds);

    expect(result).toHaveLength(0);
  });

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const feeds = [{ name: 'Job Board', url: 'https://jobboard.com/rss' }];
    const result = await scrapeAggregatorsAndRss(feeds);

    expect(result).toHaveLength(0);
  });

  it('processes multiple feeds', async () => {
    const rssXml1 = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Board 1</title>
    <item>
      <title>Job from Board 1</title>
      <link>https://board1.com/jobs/1</link>
      <description>Description 1</description>
    </item>
  </channel>
</rss>`;

    const rssXml2 = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Board 2</title>
    <item>
      <title>Job from Board 2</title>
      <link>https://board2.com/jobs/1</link>
      <description>Description 2</description>
    </item>
  </channel>
</rss>`;

    mockFetch
      .mockResolvedValueOnce({ ok: true, text: async () => rssXml1 })
      .mockResolvedValueOnce({ ok: true, text: async () => rssXml2 });

    const feeds = [
      { name: 'Board 1', url: 'https://board1.com/rss' },
      { name: 'Board 2', url: 'https://board2.com/rss' }
    ];
    const result = await scrapeAggregatorsAndRss(feeds);

    expect(result).toHaveLength(2);
    expect(result[0].source).toBe('RSS: Board 1');
    expect(result[1].source).toBe('RSS: Board 2');
  });

  it('continues processing other feeds if one fails', async () => {
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Board 2</title>
    <item>
      <title>Job from Board 2</title>
      <link>https://board2.com/jobs/1</link>
      <description>Description 2</description>
    </item>
  </channel>
</rss>`;

    mockFetch
      .mockRejectedValueOnce(new Error('Feed 1 failed'))
      .mockResolvedValueOnce({ ok: true, text: async () => rssXml });

    const feeds = [
      { name: 'Board 1', url: 'https://board1.com/rss' },
      { name: 'Board 2', url: 'https://board2.com/rss' }
    ];
    const result = await scrapeAggregatorsAndRss(feeds);

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('RSS: Board 2');
  });

  it('handles self-closing tags', async () => {
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Job Board</title>
    <item>
      <title>Self-closing test</title>
      <link>https://jobboard.com/jobs/1</link>
      <description/>
    </item>
  </channel>
</rss>`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => rssXml
    });

    const feeds = [{ name: 'Job Board', url: 'https://jobboard.com/rss' }];
    const result = await scrapeAggregatorsAndRss(feeds);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('');
  });

  it('trims whitespace from extracted fields', async () => {
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Job Board</title>
    <item>
      <title>  Senior Developer  </title>
      <link>  https://jobboard.com/jobs/1  </link>
      <description>  Job description with spaces  </description>
    </item>
  </channel>
</rss>`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => rssXml
    });

    const feeds = [{ name: 'Job Board', url: 'https://jobboard.com/rss' }];
    const result = await scrapeAggregatorsAndRss(feeds);

    expect(result[0].title).toBe('Senior Developer');
    expect(result[0].applyUrl).toBe('https://jobboard.com/jobs/1');
    expect(result[0].description).toBe('Job description with spaces');
  });
});