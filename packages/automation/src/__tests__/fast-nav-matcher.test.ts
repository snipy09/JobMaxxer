import { describe, it, expect, vi } from 'vitest';
import { runFastLocalNavMatcher, isPromotionalElement, isDirectJobDetailPage } from '../fast-nav-matcher.js';

describe('Fast Local Navigation Matcher (Tier 1)', () => {
  it('correctly classifies promotional links and training banners', () => {
    expect(isPromotionalElement('Get Job Ready with Placement Guarantee Courses', 'https://trainings.internshala.com/web-dev')).toBe(true);
    expect(isPromotionalElement('Specialization Course', '/courses/fullstack')).toBe(true);
    expect(isPromotionalElement('Apply Now', 'https://internshala.com/internship/detail/123')).toBe(false);
    expect(isPromotionalElement('Apply for this job', 'https://boards.greenhouse.io/postman/jobs/123')).toBe(false);
  });

  it('correctly identifies direct job detail pages', () => {
    expect(isDirectJobDetailPage('https://internshala.com/internship/detail/web-developer-12345')).toBe(true);
    expect(isDirectJobDetailPage('https://boards.greenhouse.io/postman/jobs/5591023')).toBe(true);
    expect(isDirectJobDetailPage('https://jobs.lever.co/swiggy/88f2195e-1234-5678')).toBe(true);
    expect(isDirectJobDetailPage('https://internshala.com/internships')).toBe(false);
  });

  it('detects when an application form is already visible and skips clicking', async () => {
    const mockPage = {
      url: vi.fn().mockReturnValue('https://internshala.com/internship/detail/dev-1'),
      frames: vi.fn().mockReturnValue([]),
      evaluate: vi.fn().mockResolvedValue(true),
    } as any;

    const result = await runFastLocalNavMatcher(mockPage, 'Frontend Developer');
    expect(result.triggered).toBe(true);
    expect(result.action).toBe('form_already_present');
  });

  it('instantly clicks standard Apply buttons on detail pages', async () => {
    const mockButton = {
      isVisible: vi.fn().mockResolvedValue(true),
      textContent: vi.fn().mockResolvedValue('Apply now'),
      getAttribute: vi.fn().mockResolvedValue(''),
      scrollIntoViewIfNeeded: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
    };

    const mockPage = {
      url: vi.fn().mockReturnValue('https://internshala.com/internship/detail/dev-1'),
      frames: vi.fn().mockReturnValue([]),
      evaluate: vi.fn().mockResolvedValue(false),
      $: vi.fn().mockImplementation((sel: string) => {
        if (sel.includes('apply_now_button') || sel.includes('Apply now')) return Promise.resolve(mockButton);
        return Promise.resolve(null);
      }),
      $$: vi.fn().mockResolvedValue([]),
    } as any;

    const result = await runFastLocalNavMatcher(mockPage, 'Full Stack Engineer');
    expect(result.triggered).toBe(true);
    expect(result.action).toBe('apply_clicked');
  });
});
