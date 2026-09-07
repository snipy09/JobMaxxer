import type { Page } from 'playwright';
import type { MasterProfile } from '../auto-apply-engine.js';
import { humanClick, randomPause } from '../stealth-evasion.js';
import { AIFallbackSolver } from '../ai-fallback.js';
import { OmniFormSolver } from '../omni-form-solver.js';
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

      // ── 3. RUN OMNIFORM SOLVER ON ACTIVE INTERNSHALA MODAL ───────────────
      const omniResult = await OmniFormSolver.solveEntireForm(
        page,
        profile,
        profile.desiredTitle || 'Software Development Intern',
        'Internshala Team'
      );
      totalFilled += omniResult.totalInteractions;

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
