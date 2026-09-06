import type { Page } from 'playwright';
import type { MasterProfile } from '../auto-apply-engine.js';
import { humanClick, randomPause } from '../stealth-evasion.js';
import { AIFallbackSolver } from '../ai-fallback.js';
import fs from 'fs';

export interface SpecializedBotResult {
  success: boolean;
  fieldsFilled: number;
  submitted: boolean;
  confirmed: boolean;
  error?: string;
}

export class InternshalaBot {
  static async apply(
    page: Page,
    profile: MasterProfile,
    logger?: { info: (m: string) => void; warn: (m: string) => void }
  ): Promise<SpecializedBotResult> {
    try {
      // 1. Click #apply_now_button to open application modal if present
      const applyBtn = await page.$('#apply_now_button, button#apply_now_button, a#apply_now_button, .apply_now_button');
      if (applyBtn) {
        const isVis = typeof applyBtn.isVisible === 'function' ? await applyBtn.isVisible().catch(() => false) : true;
        if (isVis) {
          await humanClick(page, applyBtn);
          await randomPause(page, 350, 650);
        }
      }

      // 1. Generate tailored AI cover letter if not provided
      let dynamicCoverLetter = profile.summaryText;
      if (!dynamicCoverLetter || dynamicCoverLetter.length < 30) {
        const aiSolver = new AIFallbackSolver();
        dynamicCoverLetter = await aiSolver.generateTailoredCoverLetter(profile, 'Software Development Intern', 'Hiring Team');
      }

      // 2. Solve Internshala Assessment & Radio Questions + Cover Letter
      const fillStats = await page.evaluate((candidate) => {
        let filled = 0;

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

        // Textareas (Cover letter & Why should you be hired)
        const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea, #cover_letter, [name="cover_letter"]'));
        textareas.forEach((ta) => {
          if (!ta.value || ta.value.trim().length === 0) {
            setNativeValue(ta, candidate.summaryText);
            filled++;
          }
        });

        // Project / Portfolio text inputs
        const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="file"])'));
        inputs.forEach((inp) => {
          if (inp.value && inp.value.trim().length > 0) return;
          const text = (inp.name + ' ' + inp.id + ' ' + inp.placeholder).toLowerCase();
          if (text.includes('project') || text.includes('github') || text.includes('demo') || text.includes('work_sample')) {
            const link = candidate.projectsUrl || candidate.github || candidate.portfolio;
            if (link) {
              setNativeValue(inp, link);
              filled++;
            }
          } else if (text.includes('portfolio') || text.includes('website')) {
            const link = candidate.portfolio || candidate.github;
            if (link) {
              setNativeValue(inp, link);
              filled++;
            }
          }
        });

        // Solve Radio Button Questions (Laptop, Internet, Schedule 9am-6pm, Projects, Full-time availability)
        const radioInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
        const groups = new Map<string, HTMLInputElement[]>();
        radioInputs.forEach(r => {
          const g = r.name || 'group';
          if (!groups.has(g)) groups.set(g, []);
          groups.get(g)!.push(r);
        });

        groups.forEach((groupRadios) => {
          if (groupRadios.some(r => r.checked)) {
            filled++;
            return;
          }
          const container = groupRadios[0].closest('.question, .form-group, .radio-group, div') || document.body;
          const containerText = (container.textContent || '').toLowerCase();

          let target: HTMLInputElement | null = null;
          if (containerText.includes('sponsor') || containerText.includes('visa')) {
            target = groupRadios.find(r => (r.labels?.[0]?.textContent || r.value || '').toLowerCase().includes('no')) || null;
          } else {
            // Laptop, internet, schedule, projects -> select "Yes"
            target = groupRadios.find(r => {
              const label = (r.labels?.[0]?.textContent || r.value || r.parentElement?.textContent || '').toLowerCase();
              return label.includes('yes') || label.includes('agree') || label.includes('true') || label.includes('1');
            }) || groupRadios[0];
          }

          if (target) {
            target.checked = true;
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
            target.dispatchEvent(new Event('click', { bubbles: true }));
            filled++;
          }
        });

        return filled;
      }, {
        summaryText: dynamicCoverLetter,
        techStack: profile.techStack,
        projectsUrl: profile.projectsUrl || profile.portfolio || profile.github,
        portfolio: profile.portfolio || profile.github,
        github: profile.github,
      });

      // 3. Upload Resume PDF
      const resumePath = profile.resumeFilePath && fs.existsSync(profile.resumeFilePath) ? profile.resumeFilePath : null;
      if (resumePath) {
        const fileInputs = await page.$$('input[type="file"]');
        for (const fi of fileInputs) {
          await fi.setInputFiles(resumePath).catch(() => {});
        }
      }

      // 4. Submit
      const submitBtn = await page.$('#submit, button#submit, input[type="submit"], button:has-text("Submit application"), button:has-text("Submit")');
      let isSubmitted = false;
      let isConfirmed = false;

      if (submitBtn) {
        await humanClick(page, submitBtn);
        isSubmitted = true;
        await randomPause(page, 450, 800);

        isConfirmed = await page.evaluate(() => {
          const body = (document.body?.innerText || '').toLowerCase();
          return body.includes('application submitted') || body.includes('applied successfully') || body.includes('thank you for applying');
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
