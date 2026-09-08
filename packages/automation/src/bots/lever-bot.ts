import type { Page } from 'playwright';
import type { MasterProfile } from '../auto-apply-engine.js';
import type { SpecializedBotResult } from './internshala-bot.js';
import { OmniFormSolver } from '../omni-form-solver.js';

export class LeverBot {
  static async apply(page: Page, profile: MasterProfile): Promise<SpecializedBotResult> {
    try {
      // 1. If on overview page, click Apply button
      if (!page.url().endsWith('/apply')) {
        const applyBtn = await page.$('a.postings-btn, a[href$="/apply"], button:has-text("Apply for this job"), a:has-text("Apply for this job")');
        if (applyBtn) {
          await applyBtn.click().catch(() => {});
          await page.waitForTimeout(600);
        }
      }

      // 2. Solve Lever Form top-to-bottom and submit
      const solveResult = await OmniFormSolver.solveEntireForm(
        page,
        profile,
        profile.desiredTitle || 'Software Engineer',
        'Engineering Team',
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
