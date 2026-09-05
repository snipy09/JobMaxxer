import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeInternshalaUrl,
  isInternshala404Page,
  validateInternshalaJobPage,
  parseInternshalaDetailPage,
  fetchInternshalaDetail,
  scrapeInternshala
} from '../internshala-scraper.js';

describe('Internshala Scraper Resilience & URL Normalization', () => {

  describe('normalizeInternshalaUrl', () => {
    it('normalizes valid full HTTPS Internshala URLs', () => {
      const url = 'https://internshala.com/internships/computer-science-internship/';
      expect(normalizeInternshalaUrl(url)).toBe('https://internshala.com/internships/computer-science-internship');
    });

    it('resolves relative paths to https://internshala.com', () => {
      const rel = '/internship/detail/frontend-developer-intern-12345';
      expect(normalizeInternshalaUrl(rel)).toBe('https://internshala.com/internship/detail/frontend-developer-intern-12345');
    });

    it('strips tracking parameters and hash fragments', () => {
      const tracked = 'https://internshala.com/jobs/detail/sde-1?utm_source=feed&utm_medium=app&ref=share#apply-section';
      expect(normalizeInternshalaUrl(tracked)).toBe('https://internshala.com/jobs/detail/sde-1');
    });

    it('cleans accidental double-domain concatenations', () => {
      const double = 'https://internshala.comhttps://internshala.com/internship/detail/data-analyst-555';
      expect(normalizeInternshalaUrl(double)).toBe('https://internshala.com/internship/detail/data-analyst-555');
    });

    it('normalizes duplicate slashes', () => {
      const messy = 'https://internshala.com//internship///detail//react-dev-999//';
      expect(normalizeInternshalaUrl(messy)).toBe('https://internshala.com/internship/detail/react-dev-999');
    });

    it('returns null for empty or non-Internshala domains', () => {
      expect(normalizeInternshalaUrl('')).toBeNull();
      expect(normalizeInternshalaUrl('https://google.com/search')).toBeNull();
    });
  });

  describe('isInternshala404Page', () => {
    it('detects HTTP 404 status code', () => {
      expect(isInternshala404Page('<html><body>Not Found</body></html>', 404)).toBe(true);
    });

    it('detects Internshala 404 page content signatures', () => {
      const html404 = `
        <!DOCTYPE html>
        <html>
          <head><title>404 - Not Found</title></head>
          <body>
            <h1>ERROR 404</h1>
            <p>Uh oh! Looks like you crashed.</p>
            <p>The page you are looking for could not be found.</p>
          </body>
        </html>
      `;
      expect(isInternshala404Page(html404, 200)).toBe(true);
    });

    it('detects expired listing signatures', () => {
      const expiredHtml = '<div>No such internship found in our directory. This internship has expired.</div>';
      expect(isInternshala404Page(expiredHtml, 200)).toBe(true);
    });

    it('returns false for valid job pages', () => {
      const validHtml = `
        <html>
          <head><title>Frontend Developer Intern at Razorpay</title></head>
          <body>
            <div class="heading_4_5 profile">Frontend Developer Intern</div>
            <div class="company_name">Razorpay</div>
            <span class="stipend">₹35,000 /month</span>
          </body>
        </html>
      `;
      expect(isInternshala404Page(validHtml, 200)).toBe(false);
    });
  });

  describe('validateInternshalaJobPage', () => {
    it('validates HTML with JSON-LD JobPosting schema', () => {
      const jsonLdHtml = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@type": "JobPosting",
                "title": "Backend Engineering Intern",
                "hiringOrganization": { "@type": "Organization", "name": "Swiggy" }
              }
            </script>
          </head>
          <body></body>
        </html>
      `;
      expect(validateInternshalaJobPage(jsonLdHtml).valid).toBe(true);
    });

    it('rejects 404 error HTML', () => {
      const html404 = '<html><body>ERROR 404. Uh oh! Looks like you crashed.</body></html>';
      const result = validateInternshalaJobPage(html404);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('internshala_404');
    });

    it('rejects empty or malformed HTML', () => {
      expect(validateInternshalaJobPage('').valid).toBe(false);
      expect(validateInternshalaJobPage('<html><body>Too short</body></html>').valid).toBe(false);
    });
  });

  describe('parseInternshalaDetailPage', () => {
    it('parses structured JSON-LD detail page', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@type": "JobPosting",
                "title": "Full Stack Engineer Intern",
                "hiringOrganization": { "name": "CRED" },
                "jobLocation": { "address": { "addressLocality": "Bengaluru, Karnataka" } },
                "description": "Full stack internship involving React and TypeScript.",
                "baseSalary": { "value": { "value": 45000 } }
              }
            </script>
          </head>
          <body>
            <div class="heading_4_5 profile">Full Stack Engineer Intern</div>
            <div class="company_name">CRED</div>
          </body>
        </html>
      `;
      const parsed = parseInternshalaDetailPage(html, 'https://internshala.com/internship/detail/cred-fs-1');
      expect(parsed).not.toBeNull();
      expect(parsed?.title).toBe('Full Stack Engineer Intern');
      expect(parsed?.company).toBe('CRED');
      expect(parsed?.location).toBe('Bengaluru, Karnataka');
      expect(parsed?.salary).toBe('₹45000 /month');
      expect(parsed?.employmentType).toBe('internship');
      expect(parsed?.jobHash).toBeDefined();
    });

    it('parses fallback DOM elements when JSON-LD is absent', () => {
      const html = `
        <html>
          <body>
            <h1 class="heading_4_5 profile">Data Analyst Intern</h1>
            <div class="company_name">Groww</div>
            <a class="location_link">Bengaluru</a>
            <span class="stipend">₹30,000 /month</span>
            <div class="internship_other_details">Description of data analyst work at Groww.</div>
          </body>
        </html>
      `;
      const parsed = parseInternshalaDetailPage(html, 'https://internshala.com/internship/detail/groww-da-1');
      expect(parsed).not.toBeNull();
      expect(parsed?.title).toBe('Data Analyst Intern');
      expect(parsed?.company).toBe('Groww');
      expect(parsed?.location).toBe('Bengaluru');
      expect(parsed?.salary).toBe('₹30,000 /month');
    });

    it('returns null on 404 error page', () => {
      const html404 = '<html><body><h1>ERROR 404</h1><p>Uh oh! Looks like you crashed.</p></body></html>';
      expect(parseInternshalaDetailPage(html404, 'https://internshala.com/internship/detail/bad-url')).toBeNull();
    });
  });

  describe('scrapeInternshala pipeline resilience', () => {
    it('executes scrapeInternshala without throwing and returns formatted postings', async () => {
      const jobs = await scrapeInternshala();
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);
      
      const first = jobs[0];
      expect(first.company).toBeDefined();
      expect(first.title).toBeDefined();
      expect(first.applyUrl).toMatch(/^https:\/\/internshala\.com/);
      expect(first.source).toBe('Internshala');
      expect(first.jobHash).toBeDefined();
    });
  });

});
