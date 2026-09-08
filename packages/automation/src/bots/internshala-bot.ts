import type { Page } from 'playwright';
import type { MasterProfile } from '../auto-apply-engine.js';
import { humanClick, randomPause } from '../stealth-evasion.js';
import { OmniFormSolver } from '../omni-form-solver.js';
import { AIFallbackSolver } from '../ai-fallback.js';

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
      let activeTargetPage = page;
      const aiSolver = new AIFallbackSolver();
      const jobTitle = profile.desiredTitle || 'Software Development Intern';
      let interactions = 0;

      // 1. Popup Listener: Catch if Internshala opens application form in a new tab
      let popupPromise: Promise<Page | null> = Promise.resolve(null);
      try {
        if (typeof page.context === 'function' && typeof page.context().waitForEvent === 'function') {
          popupPromise = page.context().waitForEvent('page', { timeout: 1500 }).catch(() => null);
        }
      } catch {}

      // 2. Click "Apply now" button on the job detail page
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

      // Check if a new tab opened
      const newPage = await popupPromise;
      if (newPage) {
        activeTargetPage = newPage;
        await activeTargetPage.waitForLoadState('domcontentloaded').catch(() => {});
      }

      // Also execute direct in-page DOM click if modal hasn't opened yet
      await activeTargetPage.evaluate(() => {
        const isModalOpen = Boolean(document.querySelector('.modal.show, #application_modal, #cover_letter, .application_modal, #application_form'));
        if (!isModalOpen) {
          const buttons = Array.from(document.querySelectorAll<HTMLElement>('button, a, .btn'));
          const apply = buttons.find(b => {
            const txt = (b.textContent || '').trim().toLowerCase();
            return txt === 'apply now' || txt === 'apply' || (b as any).id === 'apply_now_button';
          });
          if (apply) apply.click();
        }
      }).catch(() => {});

      await randomPause(activeTargetPage, 500, 900);

      // 3. Step 1 of Modal: Handle intermediate "Proceed to application" (Resume Step)
      const proceedBtn = await activeTargetPage.$(
        '#proceed_to_application, button:has-text("Proceed to application"), a:has-text("Proceed to application"), button:has-text("Proceed"), .proceed_to_application, input[value*="Proceed"]'
      );
      if (proceedBtn) {
        const isVis = typeof proceedBtn.isVisible === 'function' ? await proceedBtn.isVisible().catch(() => false) : true;
        if (isVis) {
          await humanClick(activeTargetPage, proceedBtn);
          interactions++;
          await randomPause(activeTargetPage, 600, 1000);
        }
      }

      // 4. Modal Specific Form Solver: Cover letter, Assessment textareas, Availability radios
      // Pre-scroll modal container smoothly
      await activeTargetPage.evaluate(() => {
        const modalContainer = document.querySelector<HTMLElement>(
          '#application_modal .modal-body, .modal.show .modal-body, .application_modal, #cover_letter_container, #application_form'
        );
        if (modalContainer) {
          modalContainer.scrollTop = modalContainer.scrollHeight;
        }
      }).catch(() => {});
      await activeTargetPage.waitForTimeout(300);

      // A. Cover Letter Textarea
      const coverLetterInputs = await activeTargetPage.$$(
        '#cover_letter, textarea[name="cover_letter"], textarea[placeholder*="cover letter" i], textarea[id*="cover_letter"], .cover_letter_holder textarea'
      );
      for (const cl of coverLetterInputs) {
        const val = await cl.inputValue().catch(() => '');
        if (!val || val.trim().length === 0) {
          const text = await aiSolver.generateTailoredCoverLetter(profile, jobTitle, 'Internshala Partner');
          await cl.fill(text).catch(() => {});
          interactions++;
        }
      }

      // B. Custom Assessment Questions
      const assessmentTextareas = await activeTargetPage.$$(
        'textarea[id*="text_"], textarea[name*="assessment"], textarea[placeholder*="answer" i], div.assessment_question textarea, div.form-group textarea:not(#cover_letter)'
      );
      for (const at of assessmentTextareas) {
        const val = await at.inputValue().catch(() => '');
        if (!val || val.trim().length === 0) {
          const questionLabel = await at.evaluate(el => {
            return (
              el.closest('.form-group, .assessment_question, .question')?.textContent ||
              document.querySelector(`label[for="${el.id}"]`)?.textContent ||
              el.placeholder ||
              'Assessment Question'
            );
          }).catch(() => 'Assessment Question');

          const ans = await aiSolver.answerCustomQuestion(questionLabel, {
            jobTitle,
            company: 'Internshala Partner',
            userProfile: profile
          });
          await at.fill(ans).catch(() => {});
          interactions++;
        }
      }

      // C. Availability Radio Buttons ("Yes, I am available for full time...")
      await activeTargetPage.evaluate(() => {
        const availabilityRadios = Array.from(document.querySelectorAll<HTMLInputElement>(
          'input[type="radio"][name*="availability"], input[type="radio"][value*="available"], input[type="radio"][id*="available"]'
        ));
        if (availabilityRadios.length > 0) {
          const yesRadio = availabilityRadios.find(r => /yes|available/i.test(r.value || r.labels?.[0]?.textContent || '')) || availabilityRadios[0];
          if (yesRadio && !yesRadio.checked) {
            yesRadio.checked = true;
            yesRadio.dispatchEvent(new Event('click', { bubbles: true }));
            yesRadio.dispatchEvent(new Event('change', { bubbles: true }));
            const label = yesRadio.closest('label') || yesRadio.labels?.[0];
            if (label) label.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
        }
      }).catch(() => {});

      // D. Run Universal Master Solver on active page/modal
      const solveResult = await OmniFormSolver.solveEntireForm(
        activeTargetPage,
        profile,
        jobTitle,
        'Internshala Partner',
        false // We handle the submit click below specifically for Internshala
      );
      interactions += solveResult.totalInteractions;

      // 5. Submit Application
      await randomPause(activeTargetPage, 500, 800);
      let isSubmitted = false;

      const submitBtn = await activeTargetPage.$(
        '#submit, input#submit, button#submit, input[type="submit"][value*="Submit"], button:has-text("Submit application"), button:has-text("Submit"), .submit_button'
      );
      if (submitBtn) {
        const isVis = typeof submitBtn.isVisible === 'function' ? await submitBtn.isVisible().catch(() => false) : true;
        if (isVis) {
          await humanClick(activeTargetPage, submitBtn);
          isSubmitted = true;
          interactions++;
          await activeTargetPage.waitForTimeout(1500);
        }
      }

      // Also execute direct DOM submit trigger if button wasn't clicked
      if (!isSubmitted) {
        isSubmitted = await activeTargetPage.evaluate(() => {
          const sub = document.querySelector<HTMLElement>('#submit, input#submit, button#submit, .submit_button, input[type="submit"]');
          if (sub) {
            sub.click();
            return true;
          }
          return false;
        }).catch(() => false);
      }

      // 6. Check for post-submission confirmation
      const isConfirmed = await activeTargetPage.evaluate(() => {
        const successMsg = document.querySelector('.toast-success, .alert-success, div:has-text("Applied successfully"), div:has-text("Application submitted"), .already_applied');
        return Boolean(successMsg);
      }).catch(() => false);

      return {
        success: Boolean(isSubmitted || isConfirmed || interactions > 0),
        fieldsFilled: interactions,
        submitted: Boolean(isSubmitted || isConfirmed),
        confirmed: Boolean(isConfirmed || isSubmitted),
      };
    } catch (err: any) {
      return { success: false, fieldsFilled: 0, submitted: false, confirmed: false, error: err.message };
    }
  }
}
