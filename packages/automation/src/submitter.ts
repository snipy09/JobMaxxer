import type { Page, Frame, ElementHandle } from 'playwright';
import type { ATSPortal } from './ats-portals.js';
import { humanClick } from './stealth-evasion.js';

export interface SubmitResult {
  submitted: boolean;
  confirmed: boolean;
  error?: string;
}

export class FormSubmitter {
  constructor(
    private page: Page,
    private atsConfig: ATSPortal,
    private logger?: { info: (m: string, meta?: any) => void; debug: (m: string, meta?: any) => void; warn: (m: string, meta?: any) => void; error: (m: string, meta?: any) => void }
  ) {}

  /**
   * Find and click submit button, then verify confirmation
   */
  async submitAndVerify(): Promise<SubmitResult> {
    try {
      // 1. Locate Submit button
      const submitButton = await this.findSubmitButton();
      if (!submitButton) {
        return {
          submitted: false,
          confirmed: false,
          error: 'Submit button not found on application form'
        };
      }

      this.logger?.info('Triggering application submission button...');

      // 2. Click Submit
      await humanClick(this.page, submitButton);

      // 3. Wait for redirect or submission confirmation
      await this.page.waitForTimeout(800);

      // 4. Verify confirmation
      const confirmed = await this.verifySubmissionConfirmation();

      return {
        submitted: true,
        confirmed,
        error: confirmed ? undefined : 'Submission triggered but pending confirmation'
      };
    } catch (error) {
      this.logger?.error('Submission failed', { error });
      return {
        submitted: false,
        confirmed: false,
        error: String(error)
      };
    }
  }

  /**
   * Find submit button across all frames using ATS selectors
   */
  private async findSubmitButton(): Promise<ElementHandle<HTMLElement> | null> {
    const frames = [this.page, ...this.page.frames()];

    for (const frame of frames) {
      for (const selector of this.atsConfig.selectors.submitButton) {
        try {
          const button = await frame.$(selector);
          if (button) {
            const isVis = typeof button.isVisible === 'function' ? await button.isVisible().catch(() => false) : true;
            if (isVis) {
              return button as ElementHandle<HTMLElement>;
            }
          }
        } catch {}
      }
    }
    return null;
  }

  /**
   * Check for submission confirmation signatures
   */
  private async verifySubmissionConfirmation(): Promise<boolean> {
    // 1. Check DOM signatures from ATS config
    for (const signature of this.atsConfig.selectors.confirmationSignatures) {
      try {
        const el = await this.page.$(signature);
        if (el) {
          this.logger?.info(`Confirmation signature verified: ${signature}`);
          return true;
        }
      } catch {}
    }

    // 2. Comprehensive text evaluation
    try {
      const isConfirmed = await this.page.evaluate(() => {
        const body = (document.body?.innerText || '').toLowerCase();
        const successPhrases = [
          'application submitted',
          'application has been submitted',
          'thank you for applying',
          'thanks for applying',
          'application received',
          'we have received your application',
          'your application was sent',
          'applied successfully',
          'application confirmed',
          'application complete'
        ];
        return successPhrases.some(p => body.includes(p));
      });

      if (isConfirmed) {
        this.logger?.info('Submission confirmed via in-page text verification');
        return true;
      }
    } catch {}

    this.logger?.warn('No confirmation signature detected');
    return false;
  }
}
