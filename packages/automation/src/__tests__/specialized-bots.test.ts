import { describe, it, expect, vi } from 'vitest';
import { dispatchSpecializedPortalBot } from '../bots/bot-dispatcher.js';
import type { MasterProfile } from '../auto-apply-engine.js';

describe('Specialized Portal Bot Dispatcher', () => {
  const profile: MasterProfile = {
    firstName: 'Sajal',
    lastName: 'Mishra',
    email: 'sajal@nomadic.app',
    phone: '+91 9493833632',
    summaryText: 'Experienced software engineer building scalable web applications and cloud systems.',
  };

  it('routes Internshala URLs to InternshalaBot', async () => {
    const mockSchema = {
      totalFieldsCount: 4,
      unfilledFieldsCount: 4,
      fields: [
        { uid: 'nomadic-field-1', tagName: 'textarea', type: '', id: 'cover_letter', name: 'cover_letter', label: 'Cover Letter', placeholder: '', isRequired: true, isFilled: false, currentValue: '', category: 'cover_letter' },
        { uid: 'nomadic-field-2', tagName: 'input', type: 'text', id: '', name: 'portfolio', label: 'Portfolio Link', placeholder: '', isRequired: false, isFilled: false, currentValue: '', category: 'portfolio' },
        { uid: 'nomadic-field-3', tagName: 'div', type: 'radiogroup', id: '', name: 'laptop', label: 'Do you have a laptop?', placeholder: '', isRequired: true, isFilled: false, currentValue: '', category: 'work_auth_yes' },
        { uid: 'nomadic-field-4', tagName: 'input', type: 'checkbox', id: '', name: 'agree', label: 'I Agree to terms', placeholder: '', isRequired: true, isFilled: false, currentValue: '', category: 'terms_consent' },
      ],
    };

    const mockElement = {
      evaluate: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
      fill: vi.fn().mockResolvedValue(undefined),
    };

    const mockPage = {
      url: vi.fn().mockReturnValue('https://internshala.com/internship/detail/software-developer-12345'),
      $: vi.fn().mockImplementation((sel: string) => {
        if (sel.includes('data-nomadic-uid')) return Promise.resolve(mockElement);
        return Promise.resolve(null);
      }),
      $$: vi.fn().mockResolvedValue([]),
      evaluate: vi.fn().mockResolvedValue(mockSchema),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    } as any;

    const res = await dispatchSpecializedPortalBot(
      mockPage,
      'https://internshala.com/internship/detail/software-developer-12345',
      profile
    );

    expect(res).not.toBeNull();
    expect(res?.fieldsFilled).toBe(4);
  }, 10000);

  it('routes Lever URLs to LeverBot', async () => {
    const mockSchema = {
      totalFieldsCount: 6,
      unfilledFieldsCount: 6,
      fields: [
        { uid: 'nomadic-field-1', tagName: 'input', type: 'text', id: '', name: 'name', label: 'Full Name', placeholder: '', isRequired: true, isFilled: false, currentValue: '', category: 'full_name' },
        { uid: 'nomadic-field-2', tagName: 'input', type: 'email', id: '', name: 'email', label: 'Email', placeholder: '', isRequired: true, isFilled: false, currentValue: '', category: 'email' },
        { uid: 'nomadic-field-3', tagName: 'input', type: 'tel', id: '', name: 'phone', label: 'Phone', placeholder: '', isRequired: true, isFilled: false, currentValue: '', category: 'phone' },
        { uid: 'nomadic-field-4', tagName: 'input', type: 'text', id: '', name: 'org', label: 'Current Company', placeholder: '', isRequired: false, isFilled: false, currentValue: '', category: 'current_company' },
        { uid: 'nomadic-field-5', tagName: 'input', type: 'text', id: '', name: 'linkedin', label: 'LinkedIn', placeholder: '', isRequired: false, isFilled: false, currentValue: '', category: 'linkedin' },
        { uid: 'nomadic-field-6', tagName: 'input', type: 'text', id: '', name: 'github', label: 'GitHub', placeholder: '', isRequired: false, isFilled: false, currentValue: '', category: 'github' },
      ],
    };

    const mockElement = {
      evaluate: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
      fill: vi.fn().mockResolvedValue(undefined),
    };

    const mockPage = {
      url: vi.fn().mockReturnValue('https://jobs.lever.co/postman/88f2195e-1234/apply'),
      $: vi.fn().mockImplementation((sel: string) => {
        if (sel.includes('data-nomadic-uid')) return Promise.resolve(mockElement);
        return Promise.resolve(null);
      }),
      $$: vi.fn().mockResolvedValue([]),
      evaluate: vi.fn().mockResolvedValue(mockSchema),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    } as any;

    const res = await dispatchSpecializedPortalBot(
      mockPage,
      'https://jobs.lever.co/postman/88f2195e-1234/apply',
      profile
    );

    expect(res).not.toBeNull();
    expect(res?.fieldsFilled).toBe(6);
  });
});
