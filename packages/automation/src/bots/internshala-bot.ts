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
      let totalFilled = 0;
      const aiSolver = new AIFallbackSolver();

      // ── 1. CLICK "APPLY NOW" BUTTON TO OPEN APPLICATION MODAL ─────────────
      const applyBtnSelectors = [
        '#apply_now_button',
        'button#apply_now_button',
        'a#apply_now_button',
        '.apply_now_button',
        'button:has-text("Apply now")',
        'a:has-text("Apply now")',
        'button:has-text("Apply Now")',
        'a:has-text("Apply Now")',
        'button.btn-primary:has-text("Apply")',
        'a.btn-primary:has-text("Apply")',
        '.buttons_container button',
        '.buttons_container a',
        '.action_buttons a, .action_buttons button',
        'a[href*="/application/form"]'
      ];

      for (const sel of applyBtnSelectors) {
        try {
          const btn = await page.$(sel);
          if (btn) {
            const isVis = typeof btn.isVisible === 'function' ? await btn.isVisible().catch(() => false) : true;
            if (isVis) {
              await humanClick(page, btn);
              await randomPause(page, 400, 700);
              break;
            }
          }
        } catch {}
      }

      // Also execute direct in-page DOM click if modal hasn't opened yet
      await page.evaluate(() => {
        const isModalOpen = Boolean(document.querySelector('.modal.show, #application_modal, #cover_letter, .application_modal'));
        if (!isModalOpen) {
          const buttons = Array.from(document.querySelectorAll<HTMLElement>('button, a, .btn'));
          const apply = buttons.find(b => {
            const txt = (b.textContent || '').trim().toLowerCase();
            return txt === 'apply now' || txt === 'apply' || (b as any).id === 'apply_now_button';
          });
          if (apply) {
            apply.click();
          }
        }
      }).catch(() => {});

      await randomPause(page, 400, 800);

      // ── 2. HANDLE INTERMEDIATE "PROCEED TO APPLICATION" (Resume Step) ──────
      const proceedBtn = await page.$(
        '#proceed_to_application, button:has-text("Proceed to application"), a:has-text("Proceed to application"), button:has-text("Proceed"), .proceed_to_application'
      );
      if (proceedBtn) {
        const isVis = typeof proceedBtn.isVisible === 'function' ? await proceedBtn.isVisible().catch(() => false) : true;
        if (isVis) {
          await humanClick(page, proceedBtn);
          await randomPause(page, 400, 700);
        }
      }

      // ── 3. GENERATE TAILORED AI COVER LETTER ──────────────────────────────
      let dynamicCoverLetter = profile.summaryText;
      if (!dynamicCoverLetter || dynamicCoverLetter.length < 30) {
        dynamicCoverLetter = await aiSolver.generateTailoredCoverLetter(
          profile,
          profile.desiredTitle || 'Software Development Intern',
          'Hiring Team'
        );
      }

      // ── 4. SOLVE TEXTAREAS, WORK SAMPLES, & RADIO QUESTIONS ────────────────
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

        // A. Cover Letter & Assessment Textareas
        const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>(
          'textarea, #cover_letter, [name="cover_letter"], .cover_letter, textarea[placeholder*="cover letter" i], textarea[placeholder*="Why should you" i]'
        ));
        textareas.forEach((ta) => {
          if (!ta.value || ta.value.trim().length === 0) {
            setNativeValue(ta, candidate.summaryText);
            filled++;
          }
        });

        // B. Work Samples, GitHub, Portfolio text inputs
        const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(
          'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="file"])'
        ));
        inputs.forEach((inp) => {
          if (inp.value && inp.value.trim().length > 0) return;
          const text = (inp.name + ' ' + inp.id + ' ' + (inp.placeholder || '')).toLowerCase();
          if (text.includes('project') || text.includes('github') || text.includes('demo') || text.includes('work_sample') || text.includes('drive')) {
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

        // C. Solve Radio Button Questions (Laptop, Internet, Schedule 9am-6pm, Projects, Full-time availability)
        const radioInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
        const groups = new Map<string, HTMLInputElement[]>();
        radioInputs.forEach(r => {
          const g = r.name || 'group_' + (r.id || 'unnamed');
          if (!groups.has(g)) groups.set(g, []);
          groups.get(g)!.push(r);
        });

        groups.forEach((groupRadios) => {
          if (groupRadios.some(r => r.checked)) {
            filled++;
            return;
          }
          const container = groupRadios[0].closest('.question, .form-group, .radio-group, div, fieldset') || document.body;
          const containerText = (container.textContent || '').toLowerCase();

          let target: HTMLInputElement | null = null;
          if (containerText.includes('sponsor') || containerText.includes('visa')) {
            target = groupRadios.find(r => (r.labels?.[0]?.textContent || r.value || '').toLowerCase().includes('no')) || null;
          } else {
            // Laptop, internet, schedule, projects, availability -> select "Yes"
            target = groupRadios.find(r => {
              const label = (r.labels?.[0]?.textContent || r.value || r.parentElement?.textContent || '').toLowerCase();
              return label.includes('yes') || label.includes('agree') || label.includes('true') || label.includes('1') || label.includes('available');
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

        // D. Also check custom ARIA radio buttons
        const customRadios = Array.from(document.querySelectorAll<HTMLElement>('[role="radiogroup"], .custom-radio-group'));
        customRadios.forEach(cr => {
          const items = Array.from(cr.querySelectorAll<HTMLElement>('button[role="radio"], [role="radio"], label'));
          const yesItem = items.find(it => (it.textContent || '').toLowerCase().includes('yes')) || items[0];
          if (yesItem) {
            yesItem.click();
            yesItem.setAttribute('aria-checked', 'true');
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
      totalFilled += fillStats;

      // ── 5. SOLVE UNPOPULATED TEXTAREAS VIA AI SOLVER ───────────────────────
      const remainingTextareas = await page.$$('textarea');
      for (const ta of remainingTextareas) {
        try {
          const val = await ta.inputValue().catch(() => '');
          if (!val || val.trim().length === 0) {
            const promptLabel = await ta.evaluate(el => {
              return el.closest('.form-group, .question')?.textContent || el.placeholder || el.name || 'Why should you be hired for this role?';
            }).catch(() => 'Why should you be hired for this role?');

            const aiAns = await aiSolver.answerCustomQuestion(promptLabel, {
              jobTitle: profile.desiredTitle || 'Software Development Intern',
              company: 'Hiring Team',
              userProfile: profile,
            });

            await ta.fill(aiAns);
            totalFilled++;
          }
        } catch {}
      }

      // ── 6. UPLOAD RESUME PDF ───────────────────────────────────────────────
      const resumePath = profile.resumeFilePath && fs.existsSync(profile.resumeFilePath) ? profile.resumeFilePath : null;
      if (resumePath) {
        const fileInputs = await page.$$('input[type="file"]');
        for (const fi of fileInputs) {
          await fi.setInputFiles(resumePath).catch(() => {});
          totalFilled++;
        }
      }

      // ── 7. SUBMIT FORM & VERIFY CONFIRMATION ───────────────────────────────
      const submitSelectors = [
        '#submit',
        'button#submit',
        'input[type="submit"]',
        'button:has-text("Submit application")',
        'button:has-text("Submit Application")',
        'button:has-text("Submit")',
        'button.btn-primary:has-text("Submit")',
        '.submit_button'
      ];

      let isSubmitted = false;
      let isConfirmed = false;

      for (const sel of submitSelectors) {
        try {
          const submitBtn = await page.$(sel);
          if (submitBtn) {
            const isVis = typeof submitBtn.isVisible === 'function' ? await submitBtn.isVisible().catch(() => false) : true;
            if (isVis && totalFilled > 0) {
              await randomPause(page, 350, 650);
              await humanClick(page, submitBtn);
              isSubmitted = true;
              await randomPause(page, 500, 900);

              isConfirmed = await page.evaluate(() => {
                const body = (document.body?.innerText || '').toLowerCase();
                return body.includes('application submitted') ||
                  body.includes('applied successfully') ||
                  body.includes('thank you for applying') ||
                  body.includes('application sent');
              }).catch(() => false);
              break;
            }
          }
        } catch {}
      }

      return {
        success: isSubmitted || totalFilled > 0,
        fieldsFilled: totalFilled,
        submitted: isSubmitted,
        confirmed: isConfirmed,
      };
    } catch (err: any) {
      return { success: false, fieldsFilled: 0, submitted: false, confirmed: false, error: err.message };
    }
  }
}
