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
        false // Do not immediately submit, allow targeted Ashby passes
      );

      // 3. Targeted Ashby Pass: Force-click Arbitration Acknowledgement & Legal Confirmation
      await page.evaluate(() => {
        // Find any option or radio container mentioning "Arbitration Agreement" or "I acknowledge"
        const allOptions = Array.from(document.querySelectorAll<HTMLElement>(
          'div[class*="_option_"], label[class*="_option_"], div[class*="_radioContainer_"], div[role="radio"], button[role="radio"], label, input[type="radio"], input[type="checkbox"]'
        ));

        allOptions.forEach((el) => {
          const text = (el.textContent || (el as any).value || '').toLowerCase();
          if (text.includes('arbitration') && (text.includes('acknowledge') || text.includes('opened, read') || text.includes('agree'))) {
            el.click();
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            const inp = el.querySelector('input') || (el instanceof HTMLInputElement ? el : null);
            if (inp) {
              inp.checked = true;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } else if (text.includes('confirm i have read the above') || text.includes('i confirm') || (text.includes('certify') && text.includes('withheld'))) {
            el.click();
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            const inp = el.querySelector('input') || (el instanceof HTMLInputElement ? el : null);
            if (inp) {
              inp.checked = true;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        });
      }).catch(() => {});
      await page.waitForTimeout(400);

      // 4. Click Submit Button
      const submitBtn = await page.$(
        'button[type="submit"], button:has-text("Submit Application"), button:has-text("Submit"), button._submitButton_'
      );
      if (submitBtn) {
        await submitBtn.click().catch(() => {});
        await page.waitForTimeout(1500);
      }

      // 5. Error Recovery: If Ashby displays "Your form needs corrections"
      const errorCallout = await page.$('div:has-text("Your form needs corrections"), div[class*="_errorCallout_"]');
      if (errorCallout) {
        await page.evaluate(() => {
          const errorContainers = Array.from(document.querySelectorAll<HTMLElement>(
            'div[class*="_hasError_"], div:has(> [class*="_errorMessage_"]), fieldset:has(> [class*="_errorMessage_"])'
          ));
          errorContainers.forEach((ec) => {
            const buttons = Array.from(ec.querySelectorAll<HTMLElement>('button, [role="radio"], input[type="checkbox"], [role="checkbox"]'));
            if (buttons.length > 0) {
              const target = buttons.find(b => /yes|agree|acknowledge|certify/i.test(b.textContent || (b as any).value || '')) || buttons[0];
              target.click();
              target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            }
          });
        }).catch(() => {});
        await page.waitForTimeout(500);

        // Re-click submit button
        const submitBtn = await page.$('button[type="submit"], button:has-text("Submit Application"), button:has-text("Submit")');
        if (submitBtn) {
          await submitBtn.click().catch(() => {});
          await page.waitForTimeout(1500);
        }
      }

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
