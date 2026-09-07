import type { Page } from 'playwright';
import type { MasterProfile } from '../auto-apply-engine.js';
import type { SpecializedBotResult } from './internshala-bot.js';
import { humanClick, randomPause } from '../stealth-evasion.js';
import { OmniFormSolver } from '../omni-form-solver.js';

export class AshbyBot {
  static async apply(page: Page, profile: MasterProfile): Promise<SpecializedBotResult> {
    try {
      // 1. Run Complete OmniFormSolver (Inputs, Location Combobox, Date Picker, Checkboxes, Radios, AI Questions, Resume)
      const solveResult = await OmniFormSolver.solveEntireForm(
        page,
        profile,
        profile.desiredTitle || 'Software Engineer',
        'Engineering Team'
      );

      // 2. Click Primary Submit Button
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Submit Application")',
        'button:has-text("Submit application")',
        'button:has-text("Submit")',
        'button.btn-primary:has-text("Submit")',
        '[data-qa="submit-button"]'
      ];

      let isSubmitted = false;
      let isConfirmed = false;

      for (const sel of submitSelectors) {
        try {
          const submitBtn = await page.$(sel);
          if (submitBtn) {
            const isVis = typeof submitBtn.isVisible === 'function' ? await submitBtn.isVisible().catch(() => false) : true;
            if (isVis && solveResult.totalInteractions > 0) {
              await randomPause(page, 300, 600);
              await humanClick(page, submitBtn);
              isSubmitted = true;
              await randomPause(page, 500, 900);

              isConfirmed = await page.evaluate(() => {
                const body = (document.body?.innerText || '').toLowerCase();
                return (
                  body.includes('application submitted') ||
                  body.includes('thank you for applying') ||
                  body.includes('received') ||
                  body.includes('application received')
                );
              }).catch(() => false);
              break;
            }
          }
        } catch {}
      }

      return {
        success: isSubmitted || solveResult.totalInteractions > 0,
        fieldsFilled: solveResult.totalInteractions,
        submitted: isSubmitted,
        confirmed: isConfirmed,
      };
    } catch (err: any) {
      return { success: false, fieldsFilled: 0, submitted: false, confirmed: false, error: err.message };
    }
  }
}
