import type { Page } from 'playwright';
import type { MasterProfile } from '../auto-apply-engine.js';
import { humanClick, randomPause } from '../stealth-evasion.js';
import { OmniFormSolver } from '../omni-form-solver.js';

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
      // 1. Click "Apply now" button to open modal if present
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

      // 2. Handle intermediate "Proceed to application" (Resume Step)
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

      // 3. Solve Internshala Form top-to-bottom and submit
      const solveResult = await OmniFormSolver.solveEntireForm(
        page,
        profile,
        profile.desiredTitle || 'Software Development Intern',
        'Internshala Team',
        true
      );

      return {
        success: solveResult.isSubmitted || solveResult.totalInteractions > 0,
        fieldsFilled: solveResult.totalInteractions,
        submitted: Boolean(solveResult.isSubmitted),
        confirmed: Boolean(solveResult.isConfirmed),
      };
    } catch (err: any) {
      return { success: false, fieldsFilled: 0, submitted: false, confirmed: false, error: err.message };
    }
  }
}
