import type { Page } from 'playwright';
import type { MasterProfile } from '../auto-apply-engine.js';
import type { SpecializedBotResult } from './internshala-bot.js';
import { humanClick } from '../stealth-evasion.js';
import fs from 'fs';

export class GreenhouseBot {
  static async apply(page: Page, profile: MasterProfile): Promise<SpecializedBotResult> {
    try {
      // 1. Scroll to or click Apply button
      const applyBtn = await page.$('#apply_button, a#apply_button, a[href*="#app"]');
      if (applyBtn) {
        await humanClick(page, applyBtn);
        await page.waitForTimeout(300);
      }

      // 2. Fill Greenhouse Form Fields
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
          ['input#first_name, input[name="first_name"]', data.firstName],
          ['input#last_name, input[name="last_name"]', data.lastName],
          ['input#email, input[name="email"], input[type="email"]', data.email],
          ['input#phone, input[name="phone"], input[type="tel"]', data.phone],
          ['input[autocomplete*="custom-question-linkedin" i], input[id*="linkedin" i], input[name*="linkedin" i]', data.linkedin],
          ['input[autocomplete*="custom-question-github" i], input[id*="github" i], input[name*="github" i]', data.github],
          ['input[autocomplete*="custom-question-website" i], input[id*="website" i], input[name*="website" i]', data.portfolio],
        ];

        for (const [sel, val] of map) {
          if (!val) continue;
          const node = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(sel);
          if (node && (!node.value || node.value.trim().length === 0)) {
            setNativeValue(node, val);
            count++;
          }
        }

        // Handle Selects / Demographics / EEO / Authorization
        const selects = Array.from(document.querySelectorAll<HTMLSelectElement>('select'));
        selects.forEach((sel) => {
          if (sel.selectedIndex > 0) return;
          const label = (sel.closest('label')?.textContent || sel.name || '').toLowerCase();
          const options = Array.from(sel.options);

          let chosen: string | null = null;
          if (label.includes('authorized') || label.includes('eligible')) {
            const yesOpt = options.find(o => o.text.toLowerCase().includes('yes'));
            if (yesOpt) chosen = yesOpt.value;
          } else if (label.includes('sponsor') || label.includes('visa')) {
            const noOpt = options.find(o => o.text.toLowerCase().includes('no'));
            if (noOpt) chosen = noOpt.value;
          } else if (label.includes('gender') || label.includes('race') || label.includes('veteran') || label.includes('disability')) {
            const decOpt = options.find(o => o.text.toLowerCase().includes('decline') || o.text.toLowerCase().includes('prefer not'));
            if (decOpt) chosen = decOpt.value;
          }

          if (chosen) {
            sel.value = chosen;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            count++;
          }
        });

        return count;
      }, {
        firstName: profile.firstName || 'Candidate',
        lastName: profile.lastName || 'Applicant',
        email: profile.email || 'candidate@nomadic.app',
        phone: profile.phone || '+1 (555) 019-2834',
        linkedin: profile.linkedin || 'https://linkedin.com/in/candidate',
        github: profile.github || 'https://github.com/candidate',
        portfolio: profile.portfolio || profile.github,
      });

      // 3. Upload Resume PDF
      const resumePath = profile.resumeFilePath && fs.existsSync(profile.resumeFilePath) ? profile.resumeFilePath : null;
      if (resumePath) {
        const fileInput = await page.$('input[type="file"], input#resume_file');
        if (fileInput) {
          await fileInput.setInputFiles(resumePath).catch(() => {});
        }
      }

      // 4. Submit
      const submitBtn = await page.$('#submit_app, input#submit_app, button#submit_app, button:has-text("Submit application")');
      let isSubmitted = false;
      let isConfirmed = false;

      if (submitBtn) {
        await humanClick(page, submitBtn);
        isSubmitted = true;
        await page.waitForTimeout(600);
        isConfirmed = await page.evaluate(() => {
          const body = (document.body?.innerText || '').toLowerCase();
          return body.includes('thank you for applying') || body.includes('application submitted') || body.includes('confirmation');
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
