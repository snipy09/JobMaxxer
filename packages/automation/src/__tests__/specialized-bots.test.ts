import { describe, it, expect, vi } from 'vitest';
import { dispatchSpecializedPortalBot } from '../bots/bot-dispatcher.js';
import type { MasterProfile } from '../auto-apply-engine.js';

describe('Specialized Portal Bot Dispatcher', () => {
  const profile: MasterProfile = {
    firstName: 'Sajal',
    lastName: 'Mishra',
    email: 'sajal@nomadic.app',
    phone: '+91 9493833632',
  };

  it('routes Internshala URLs to InternshalaBot', async () => {
    const mockPage = {
      $: vi.fn().mockResolvedValue(null),
      $$: vi.fn().mockResolvedValue([]),
      evaluate: vi.fn().mockResolvedValue(4),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    } as any;

    const res = await dispatchSpecializedPortalBot(
      mockPage,
      'https://internshala.com/internship/detail/software-developer-12345',
      profile
    );

    expect(res).not.toBeNull();
    expect(res?.fieldsFilled).toBe(4);
  });

  it('routes Lever URLs to LeverBot', async () => {
    const mockPage = {
      url: vi.fn().mockReturnValue('https://jobs.lever.co/postman/88f2195e-1234/apply'),
      $: vi.fn().mockResolvedValue(null),
      $$: vi.fn().mockResolvedValue([]),
      evaluate: vi.fn().mockResolvedValue(6),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    } as any;

    const res = await dispatchSpecializedPortalBot(
      mockPage,
      'https://jobs.lever.co/postman/88f2195e-1234/apply',
      profile
    );

    expect(res).not.toBeNull();
    expect(res?.fieldsFilled).toBeGreaterThanOrEqual(6);
  });
});
