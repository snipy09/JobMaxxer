import { describe, it, expect, vi } from 'vitest';
import { getATSConfig, ATS_PORTALS } from '../ats-portals.js';
import { FormFiller, type CandidateProfile } from '../form-filler.js';
import { ApplicationNavigator } from '../navigator.js';
import { FormSubmitter } from '../submitter.js';

describe('Deterministic ATS Portal Registry', () => {
  it('identifies Internshala URLs correctly', () => {
    const config = getATSConfig('https://internshala.com/internship/detail/fullstack-web-developer-12345');
    expect(config.name).toBe('Internshala');
    expect(config.navigation.type).toBe('modal');
  });

  it('identifies Lever URLs correctly', () => {
    const config = getATSConfig('https://jobs.lever.co/postman/88f2195e-1234-5678');
    expect(config.name).toBe('Lever');
    expect(config.navigation.type).toBe('direct');
  });

  it('identifies Greenhouse URLs correctly', () => {
    const config = getATSConfig('https://boards.greenhouse.io/inmobi/jobs/5591023');
    expect(config.name).toBe('Greenhouse');
  });

  it('identifies Remotive URLs correctly', () => {
    const config = getATSConfig('https://remotive.com/remote-jobs/writing/freelance-writer-1185979');
    expect(config.name).toBe('Remotive');
    expect(config.navigation.type).toBe('modal');
  });

  it('identifies Ashby URLs correctly', () => {
    const config = getATSConfig('https://jobs.ashbyhq.com/signoz/12345');
    expect(config.name).toBe('Ashby');
  });

  it('falls back to Generic ATS for unknown portals', () => {
    const config = getATSConfig('https://careers.unknownstartup.ai/job/123');
    expect(config.name).toBe('Generic ATS');
  });
});

describe('FormFiller Deterministic Engine', () => {
  it('fills form fields and solves radio groups', async () => {
    const mockPage = {
      frames: vi.fn().mockReturnValue([]),
      evaluate: vi.fn()
        .mockResolvedValueOnce(5)  // text inputs
        .mockResolvedValueOnce(3)  // radio groups
        .mockResolvedValueOnce(2)  // dropdowns
        .mockResolvedValueOnce(1), // checkboxes
      $$: vi.fn().mockResolvedValue([]),
    } as any;

    const profile: CandidateProfile = {
      firstName: 'Sajal',
      lastName: 'Mishra',
      email: 'sajal@nomadic.app',
      phone: '+91 9493833632',
    };

    const config = ATS_PORTALS['internshala'];
    const filler = new FormFiller(mockPage, config, profile);
    const result = await filler.fillFormDeterministic();

    expect(result.success).toBe(true);
    expect(result.fieldsFilled).toBe(11);
    expect(result.radiosSolved).toBe(3);
    expect(result.dropdownsFilled).toBe(2);
    expect(result.checkboxesChecked).toBe(1);
  });
});

describe('ApplicationNavigator Engine', () => {
  it('locates and clicks apply button on modal/direct portals', async () => {
    const mockButton = {
      isVisible: vi.fn().mockResolvedValue(true),
      textContent: vi.fn().mockResolvedValue('Apply for this position'),
      getAttribute: vi.fn().mockResolvedValue(''),
      scrollIntoViewIfNeeded: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
      boundingBox: vi.fn().mockResolvedValue({ x: 50, y: 50, width: 100, height: 40 }),
    };

    const mockPage = {
      frames: vi.fn().mockReturnValue([]),
      $: vi.fn().mockImplementation((sel: string) => {
        if (sel.includes('Apply')) return Promise.resolve(mockButton);
        return Promise.resolve(null);
      }),
      context: vi.fn().mockReturnValue({
        pages: vi.fn().mockReturnValue([]),
      }),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      mouse: {
        move: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
      },
    } as any;

    const config = ATS_PORTALS['remotive'];
    const navigator = new ApplicationNavigator(mockPage, config);
    const result = await navigator.navigateToApplicationForm();

    expect(result.success).toBe(true);
  });
});

describe('FormSubmitter Engine', () => {
  it('finds submit button, clicks and verifies confirmation', async () => {
    const mockSubmitButton = {
      isVisible: vi.fn().mockResolvedValue(true),
      scrollIntoViewIfNeeded: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
      boundingBox: vi.fn().mockResolvedValue({ x: 100, y: 100, width: 80, height: 30 }),
    };

    const mockPage = {
      frames: vi.fn().mockReturnValue([]),
      $: vi.fn().mockImplementation((sel: string) => {
        if (sel.includes('submit') || sel.includes('Submit')) return Promise.resolve(mockSubmitButton);
        if (sel.includes('submitted') || sel.includes('Thank you')) return Promise.resolve({});
        return Promise.resolve(null);
      }),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue(true),
      mouse: {
        move: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
      },
    } as any;

    const config = ATS_PORTALS['lever'];
    const submitter = new FormSubmitter(mockPage, config);
    const result = await submitter.submitAndVerify();

    expect(result.submitted).toBe(true);
    expect(result.confirmed).toBe(true);
  });
});
