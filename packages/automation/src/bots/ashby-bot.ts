import type { Page } from 'playwright';
import type { MasterProfile } from '../auto-apply-engine.js';
import type { SpecializedBotResult } from './internshala-bot.js';
import { humanClick, randomPause } from '../stealth-evasion.js';
import fs from 'fs';

export class AshbyBot {
  static async apply(page: Page, profile: MasterProfile): Promise<SpecializedBotResult> {
    try {
      // 1. Fill Ashby Form Fields
      const fullName = profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Candidate';
      const fillStats = await page.evaluate((data) => {
        let count = 0;

        function setNativeValue(el: HTMLElement, val: string) {
          if (!el || !val) return;
          const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          if (setter) {
            setter.call(el, val);
          } else {
            (el as any).value = val;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        }

        const map: Array<[string, string | undefined]> = [
          ['input[name*="name" i], input[id*="name" i]', data.fullName],
          ['input[type="email"], input[name*="email" i]', data.email],
          ['input[type="tel"], input[name*="phone" i]', data.phone],
          ['input[name*="linkedin" i], input[placeholder*="linkedin" i]', data.linkedin],
          ['input[name*="github" i], input[placeholder*="github" i]', data.github],
          ['input[name*="portfolio" i], input[placeholder*="website" i]', data.portfolio],
        ];

        for (const [sel, val] of map) {
          if (!val) continue;
          const node = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(sel);
          if (node && (!node.value || node.value.trim().length === 0)) {
            setNativeValue(node, val);
            count++;
          }
        }

        return count;
      }, {
        fullName,
        email: profile.email || 'candidate@nomadic.app',
        phone: profile.phone || '+1 (555) 019-2834',
        linkedin: profile.linkedin || 'https://linkedin.com/in/candidate',
        github: profile.github || 'https://github.com/candidate',
        portfolio: profile.portfolio || profile.github,
      });

      // 2. Upload Resume PDF
      const resumePath = profile.resumeFilePath && fs.existsSync(profile.resumeFilePath) ? profile.resumeFilePath : null;
      if (resumePath) {
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.setInputFiles(resumePath).catch(() => {});
        }
      }

      // 3. Submit
      const submitBtn = await page.$('button[type="submit"], button:has-text("Submit Application"), button:has-text("Submit application")');
      let isSubmitted = false;
      let isConfirmed = false;

      if (submitBtn) {
        await humanClick(page, submitBtn);
        isSubmitted = true;
        await randomPause(page, 450, 800);
        isConfirmed = await page.evaluate(() => {
          const body = (document.body?.innerText || '').toLowerCase();
          return body.includes('application submitted') || body.includes('thank you for applying') || body.includes('received');
        }).catch(() => false);
      }

      return {
        success: isSubmitted,
        fieldsFilled: fillStats,
        submitted: isSubmitted,
        confirmed: isConfirmed,
      };
    } catch (err: any) {
      return { success: false, fieldsFilled: 0, submitted: false, confirmed: false, error: err.message };
    }
  }
}
