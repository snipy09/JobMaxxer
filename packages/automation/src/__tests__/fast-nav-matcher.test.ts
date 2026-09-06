import { describe, it, expect, vi } from 'vitest';
import { runFastLocalNavMatcher } from '../fast-nav-matcher.js';

describe('Fast Local Navigation Matcher (Tier 1)', () => {
  it('detects when an application form is already visible and skips clicking', async () => {
    const mockPage = {
      frames: vi.fn().mockReturnValue([]),
      evaluate: vi.fn().mockResolvedValue(true),
    } as any;

    const result = await runFastLocalNavMatcher(mockPage, 'Frontend Developer');
    expect(result.triggered).toBe(true);
    expect(result.action).toBe('form_already_present');
  });

  it('instantly clicks standard Apply buttons when found in DOM', async () => {
    const mockButton = {
      isVisible: vi.fn().mockResolvedValue(true),
      scrollIntoViewIfNeeded: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
    };

    const mockPage = {
      frames: vi.fn().mockReturnValue([]),
      evaluate: vi.fn().mockResolvedValue(false),
      $: vi.fn().mockImplementation((sel: string) => {
        if (sel.includes('Apply for this job')) return Promise.resolve(mockButton);
        return Promise.resolve(null);
      }),
      $$: vi.fn().mockResolvedValue([]),
    } as any;

    const result = await runFastLocalNavMatcher(mockPage, 'Full Stack Engineer');
    expect(result.triggered).toBe(true);
    expect(result.action).toBe('apply_clicked');
  });
});
