import type { Page } from 'playwright';
import type { MasterProfile } from '../auto-apply-engine.js';
import type { SpecializedBotResult } from './internshala-bot.js';
import { OmniFormSolver } from '../omni-form-solver.js';

export class AshbyBot {
  static async apply(page: Page, profile: MasterProfile): Promise<SpecializedBotResult> {
    try {
      // 1. If on job description page, click "Apply" button first
      const applyBtn = await page.$(
        'a:has-text("Apply for this job"), button:has-text("Apply for this job"), a:has-text("Apply for this role"), button:has-text("Apply for this role"), a:has-text("Apply"), button:has-text("Apply")'
      );
      if (applyBtn) {
        const isVis = typeof applyBtn.isVisible === 'function' ? await applyBtn.isVisible().catch(() => false) : true;
        if (isVis) {
          await applyBtn.click().catch(() => {});
          await page.waitForTimeout(600);
        }
      }

      // 2. Solve entire Ashby form top-to-bottom and submit
      const solveResult = await OmniFormSolver.solveEntireForm(
        page,
        profile,
        profile.desiredTitle || 'Software Engineer',
        'Engineering Team',
        true // Auto-submit after filling
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
