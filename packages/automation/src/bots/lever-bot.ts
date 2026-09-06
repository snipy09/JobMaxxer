import type { Page } from 'playwright';
import type { MasterProfile } from '../auto-apply-engine.js';
import type { SpecializedBotResult } from './internshala-bot.js';
import { humanClick } from '../stealth-evasion.js';
import { AIFallbackSolver } from '../ai-fallback.js';
import fs from 'fs';

export class LeverBot {
  static async apply(page: Page, profile: MasterProfile): Promise<SpecializedBotResult> {
    try {
      // 1. If on overview page, click Apply button
      if (!page.url().endsWith('/apply')) {
        const applyBtn = await page.$('a.postings-btn, a[href$="/apply"], button:has-text("Apply for this job")');
        if (applyBtn) {
          await humanClick(page, applyBtn);
          await page.waitForTimeout(400);
        }
      }

      // 2. Generate dynamic tailored cover pitch
      let dynamicPitch = profile.summaryText;
      if (!dynamicPitch || dynamicPitch.length < 30) {
        const aiSolver = new AIFallbackSolver();
        dynamicPitch = await aiSolver.generateTailoredCoverLetter(profile, profile.desiredTitle || 'Software Engineer', 'Hiring Team');
      }

      // 3. Fill Lever Standard Form
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
          ['input[name="name"]', data.fullName],
          ['input[name="email"]', data.email],
          ['input[name="phone"]', data.phone],
          ['input[name="org"]', data.org],
          ['input[name*="urls[LinkedIn]"]', data.linkedin],
          ['input[name*="urls[GitHub]"]', data.github],
          ['input[name*="urls[Portfolio]"]', data.portfolio],
          ['input[name*="urls[Other]"]', data.projectsUrl],
          ['textarea[name="comments"]', data.summaryText],
        ];

        for (const [sel, val] of map) {
          if (!val) continue;
          const node = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(sel);
          if (node && (!node.value || node.value.trim().length === 0)) {
            setNativeValue(node, val);
            count++;
          }
        }

        // Handle Work Authorization Radio / Select
        const radioInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
        radioInputs.forEach((r) => {
          const container = r.closest('li, div, fieldset') || document.body;
          const text = (container.textContent || '').toLowerCase();
          if (text.includes('authorized') || text.includes('eligible')) {
            if ((r.labels?.[0]?.textContent || r.value || '').toLowerCase().includes('yes')) {
              r.checked = true;
              r.dispatchEvent(new Event('change', { bubbles: true }));
              count++;
            }
          } else if (text.includes('visa') || text.includes('sponsor')) {
            if ((r.labels?.[0]?.textContent || r.value || '').toLowerCase().includes('no')) {
              r.checked = true;
              r.dispatchEvent(new Event('change', { bubbles: true }));
              count++;
            }
          }
        });

        // Consent Checkbox
        const consentCb = document.querySelector<HTMLInputElement>('input[type="checkbox"]');
        if (consentCb && !consentCb.checked) {
          consentCb.checked = true;
          consentCb.dispatchEvent(new Event('change', { bubbles: true }));
          count++;
        }

        return count;
      }, {
        fullName,
        email: profile.email || 'candidate@nomadic.app',
        phone: profile.phone || '+1 (555) 019-2834',
        org: 'Nomadic Systems',
        linkedin: profile.linkedin || 'https://linkedin.com/in/candidate',
        github: profile.github || 'https://github.com/candidate',
        portfolio: profile.portfolio || profile.github,
        projectsUrl: profile.projectsUrl || profile.portfolio || profile.github,
        summaryText: dynamicPitch,
      });

      // 4. Upload Resume PDF
      const resumePath = profile.resumeFilePath && fs.existsSync(profile.resumeFilePath) ? profile.resumeFilePath : null;
      if (resumePath) {
        const fileInput = await page.$('input[type="file"], input#resume-upload-input');
        if (fileInput) {
          await fileInput.setInputFiles(resumePath).catch(() => {});
        }
      }

      // 4. Submit
      const submitBtn = await page.$('button#btn-submit, button[type="submit"], button:has-text("Submit application")');
      let isSubmitted = false;
      let isConfirmed = false;

      if (submitBtn) {
        await humanClick(page, submitBtn);
        isSubmitted = true;
        await page.waitForTimeout(600);
        isConfirmed = await page.evaluate(() => {
          const body = (document.body?.innerText || '').toLowerCase();
          return body.includes('thank you') || body.includes('application received') || body.includes('submitted');
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
