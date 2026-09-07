import type { Page } from 'playwright';
import type { MasterProfile } from '../auto-apply-engine.js';
import type { SpecializedBotResult } from './internshala-bot.js';
import { humanClick, randomPause } from '../stealth-evasion.js';
import { OmniFormSolver } from '../omni-form-solver.js';

export class GreenhouseBot {
  static async apply(page: Page, profile: MasterProfile): Promise<SpecializedBotResult> {
    try {
      // 1. Scroll to or click Apply button
      const applyBtn = await page.$('#apply_button, a#apply_button, a[href*="#app"], button:has-text("Apply for this job")');
      if (applyBtn) {
        await humanClick(page, applyBtn);
        await randomPause(page, 300, 600);
      }

      // 2. Solve Greenhouse Form via OmniFormSolver
      const solveResult = await OmniFormSolver.solveEntireForm(
        page,
        profile,
        profile.desiredTitle || 'Software Engineer',
        'Engineering Team'
      );

      // 3. Submit
      const submitBtn = await page.$(
        '#submit_app, input#submit_app, button#submit_app, button:has-text("Submit application"), button:has-text("Submit Application"), button:has-text("Submit")'
      );
      let isSubmitted = false;
      let isConfirmed = false;

      if (submitBtn && solveResult.totalInteractions > 0) {
        await randomPause(page, 300, 600);
        await humanClick(page, submitBtn);
        isSubmitted = true;
        await randomPause(page, 500, 900);
        isConfirmed = await page.evaluate(() => {
          const body = (document.body?.innerText || '').toLowerCase();
          return body.includes('thank you for applying') || body.includes('application submitted') || body.includes('confirmation');
        }).catch(() => false);
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
