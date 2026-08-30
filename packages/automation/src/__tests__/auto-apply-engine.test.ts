import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoApplyEngine, type MasterProfile } from '../index.js';

const { mockChromium, mockBrowser, mockContext, mockPage } = vi.hoisted(() => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(null),
    $: vi.fn().mockResolvedValue(null),
    $$: vi.fn().mockResolvedValue([]),
    frames: vi.fn().mockReturnValue([]),
    waitForSelector: vi.fn().mockResolvedValue(null),
    waitForTimeout: vi.fn().mockResolvedValue(null),
    evaluate: vi.fn().mockResolvedValue(false),
    close: vi.fn().mockResolvedValue(undefined),
  };

  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
    addInitScript: vi.fn().mockResolvedValue(undefined),
  };

  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn().mockResolvedValue(undefined),
  };

  const mockChromium = {
    launch: vi.fn().mockResolvedValue(mockBrowser),
    use: vi.fn(),
  };

  return { mockChromium, mockBrowser, mockContext, mockPage };
});

vi.mock('playwright-extra', () => ({
  chromium: mockChromium,
}));

vi.mock('puppeteer-extra-plugin-stealth', () => ({
  default: () => ({}),
}));

const mockProfile: MasterProfile = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '123-456-7890',
  linkedin: 'https://linkedin.com/in/johndoe',
  github: 'https://github.com/johndoe',
  sponsorship: 'No',
  salary: '$120,000',
  noticePeriod: '2 weeks',
  summaryText: 'Experienced Software Engineer with a background in TypeScript and React.',
};

describe('AutoApplyEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('prefillParallelTabs', () => {
    it('launches browser and opens tabs for job URLs', async () => {
      await AutoApplyEngine.prefillParallelTabs(['https://example.com/job/1'], mockProfile, 1);
      expect(mockChromium.launch).toHaveBeenCalledWith(expect.objectContaining({ headless: false }));
      expect(mockBrowser.newContext).toHaveBeenCalled();
    });

    it('returns early when jobUrls array is empty', async () => {
      await AutoApplyEngine.prefillParallelTabs([], mockProfile);
      expect(mockChromium.launch).not.toHaveBeenCalled();
    });
  });

  describe('submitApplication', () => {
    it('launches headless browser for full submission flow', async () => {
      const result = await AutoApplyEngine.submitApplication('https://example.com/job/1', mockProfile);
      expect(result).toBeDefined();
      expect(result.url).toBe('https://example.com/job/1');
      expect(result.captchaDetected).toBe(false);
    });
  });
});