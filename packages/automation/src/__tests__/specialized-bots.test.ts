import { describe, it, expect, vi } from 'vitest';
import { dispatchSpecializedPortalBot } from '../bots/bot-dispatcher.js';
import type { MasterProfile } from '../auto-apply-engine.js';

describe('Specialized Portal Bot Dispatcher', () => {
  const profile: MasterProfile = {
    firstName: 'Sajal',
    lastName: 'Mishra',
    fullName: 'Sajal Mishra',
    email: 'sajal@nomadic.app',
    phone: '+91 9493833632',
    linkedin: 'https://linkedin.com/in/sajalm',
    github: 'https://github.com/snipy09',
    summaryText: 'Experienced software engineer building scalable web applications and cloud systems.',
  };

  it('routes Internshala URLs to InternshalaBot', async () => {
    const mockElement = {
      evaluate: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
      fill: vi.fn().mockResolvedValue(undefined),
      inputValue: vi.fn().mockResolvedValue(''),
    };

    const mockPage = {
      url: vi.fn().mockReturnValue('https://internshala.com/internship/detail/software-developer-12345'),
      $: vi.fn().mockResolvedValue(null),
      $$: vi.fn().mockImplementation((sel: string) => {
        if (sel.includes('#_systemfield_name') || sel.includes('input[name="name"]')) return Promise.resolve([mockElement]);
        if (sel.includes('#_systemfield_email') || sel.includes('input[type="email"]')) return Promise.resolve([mockElement]);
        if (sel.includes('#_systemfield_phone') || sel.includes('input[type="tel"]')) return Promise.resolve([mockElement]);
        return Promise.resolve([]);
      }),
      evaluate: vi.fn().mockResolvedValue(1),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      keyboard: { press: vi.fn().mockResolvedValue(undefined) },
    } as any;

    const res = await dispatchSpecializedPortalBot(
      mockPage,
      'https://internshala.com/internship/detail/software-developer-12345',
      profile
    );

    expect(res).not.toBeNull();
    expect(res?.success).toBe(true);
    expect(res?.fieldsFilled).toBeGreaterThanOrEqual(3);
  }, 10000);

  it('routes Lever URLs to LeverBot', async () => {
    const mockElement = {
      evaluate: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
      fill: vi.fn().mockResolvedValue(undefined),
      inputValue: vi.fn().mockResolvedValue(''),
    };

    const mockPage = {
      url: vi.fn().mockReturnValue('https://jobs.lever.co/postman/88f2195e-1234/apply'),
      $: vi.fn().mockResolvedValue(null),
      $$: vi.fn().mockImplementation((sel: string) => {
        if (sel.includes('#_systemfield_name') || sel.includes('input[name="name"]')) return Promise.resolve([mockElement]);
        if (sel.includes('#_systemfield_email') || sel.includes('input[type="email"]')) return Promise.resolve([mockElement]);
        if (sel.includes('#_systemfield_phone') || sel.includes('input[type="tel"]')) return Promise.resolve([mockElement]);
        if (sel.includes('input[name*="linkedin" i]')) return Promise.resolve([mockElement]);
        return Promise.resolve([]);
      }),
      evaluate: vi.fn().mockResolvedValue(1),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      keyboard: { press: vi.fn().mockResolvedValue(undefined) },
    } as any;

    const res = await dispatchSpecializedPortalBot(
      mockPage,
      'https://jobs.lever.co/postman/88f2195e-1234/apply',
      profile
    );

    expect(res).not.toBeNull();
    expect(res?.success).toBe(true);
    expect(res?.fieldsFilled).toBeGreaterThanOrEqual(4);
  }, 10000);

  it('routes Ashby URLs to AshbyBot', async () => {
    const mockElement = {
      evaluate: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
      fill: vi.fn().mockResolvedValue(undefined),
      inputValue: vi.fn().mockResolvedValue(''),
    };

    const mockPage = {
      url: vi.fn().mockReturnValue('https://jobs.ashbyhq.com/openai/12345'),
      $: vi.fn().mockResolvedValue(null),
      $$: vi.fn().mockImplementation((sel: string) => {
        if (sel.includes('#_systemfield_name')) return Promise.resolve([mockElement]);
        if (sel.includes('#_systemfield_email')) return Promise.resolve([mockElement]);
        if (sel.includes('#_systemfield_phone')) return Promise.resolve([mockElement]);
        return Promise.resolve([]);
      }),
      evaluate: vi.fn().mockResolvedValue(1),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      keyboard: { press: vi.fn().mockResolvedValue(undefined) },
    } as any;

    const res = await dispatchSpecializedPortalBot(
      mockPage,
      'https://jobs.ashbyhq.com/openai/12345',
      profile
    );

    expect(res).not.toBeNull();
    expect(res?.success).toBe(true);
    expect(res?.fieldsFilled).toBeGreaterThanOrEqual(3);
  }, 10000);
});
