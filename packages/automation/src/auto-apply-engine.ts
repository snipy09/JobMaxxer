import { Page } from 'playwright';
import { launchExternalStealthBrowser, BrowserSession } from './chrome-manager.ts';
import { ATS_FIELD_ALIASES } from './alias-dictionary.ts';
import { answerCustomQuestion } from './groq-ai.ts';
import fs from 'fs';

export interface ResumeItem {
  name: string;
  targetRole: string;
  filePath: string;
  isDefault?: boolean;
}

export interface MasterProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  sponsorship: string;
  salary: string;
  noticePeriod: string;
  groqApiKey?: string;
  summaryText: string;
  desiredTitle?: string;
  techStack?: string;
  resumeFilePath?: string;
  resumes?: ResumeItem[];
  customAnswers?: Record<string, string>;
  cachedAnswers?: Record<string, string>;
  onAnswerResolved?: (question: string, answer: string) => void;
}

export interface ApplyResult {
  url: string;
  success: boolean;
  submitted: boolean;
  prefilled?: boolean;
  captchaDetected: boolean;
  error?: string;
  note?: string;
}

let persistentBrowserSession: BrowserSession | null = null;

async function getOrLaunchExternalSession(): Promise<BrowserSession> {
  if (persistentBrowserSession) {
    try {
      if (persistentBrowserSession.browser.isConnected()) {
        return persistentBrowserSession;
      }
    } catch {
      persistentBrowserSession = null;
    }
  }

  persistentBrowserSession = await launchExternalStealthBrowser({
    headless: false,
    slowMo: 50,
  });

  return persistentBrowserSession;
}

export class AutoApplyEngine {
  /**
   * Semi-Auto Review Mode: Opens tabs in a controlled RAM-safe FIFO queue
   * in external Chrome, auto-fills all ATS fields, evaluates questions,
   * attaches resume, and leaves tabs open for 1-click review.
   */
  public static async prefillParallelTabs(
    jobUrls: string[],
    profile: MasterProfile,
    concurrencyLimit: number = 3,
    onProgress?: (msg: string) => void
  ): Promise<void> {
    if (!jobUrls || jobUrls.length === 0) return;

    const limit = Math.max(1, Math.min(concurrencyLimit, 5));
    onProgress?.(`Starting prefill queue for ${jobUrls.length} positions (${limit} parallel workers)...`);
    const session = await getOrLaunchExternalSession();

    let nextIndex = 0;
    const worker = async (workerId: number) => {
      while (nextIndex < jobUrls.length) {
        const idx = nextIndex++;
        const url = jobUrls[idx];
        let page: Page | null = null;
        try {
          page = await session.context.newPage();
          onProgress?.(`[Slot ${workerId} | Tab ${idx + 1}/${jobUrls.length}] Navigating to: ${url}`);
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await page.bringToFront().catch(() => {});

          // 1. Inject overlay
          await AutoApplyEngine.injectOverlay(page, '⚡ Nomadic: Auto-filling details...');

          // 2. Expand form if collapsed
          await AutoApplyEngine.openApplicationFormIfRequired(page);

          // 3. Fill standard ATS inputs
          await AutoApplyEngine.fillStandardFields(page, profile);

          // 4. Fill select dropdowns & radios
          await AutoApplyEngine.fillSelectDropdowns(page, profile);

          // 5. Answer custom open-ended questions
          await AutoApplyEngine.answerOpenEndedFields(page, profile);

          // 6. Attach matching resume
          await AutoApplyEngine.uploadResumeIfPresent(page, profile);

          // 7. Check consent and required checkboxes
          await AutoApplyEngine.fillConsentAndRequiredCheckboxes(page);

          // 8. Update overlay to ready state
          await AutoApplyEngine.injectOverlay(
            page,
            '✓ Auto-filled! Ready for 1-Click Review & Submit',
            '#22c55e'
          );
          onProgress?.(`[Tab ${idx + 1}/${jobUrls.length}] Ready for review: ${url}`);
        } catch (err: any) {
          onProgress?.(`[Tab ${idx + 1}/${jobUrls.length}] Note on ${url}: ${err?.message}`);
          if (page) {
            await AutoApplyEngine.injectOverlay(
              page,
              'Nomadic: Review manually',
              '#f59e0b'
            ).catch(() => {});
          }
        }
      }
    };

    const workerCount = Math.min(limit, jobUrls.length);
    const workers = Array.from({ length: workerCount }, (_, i) => worker(i + 1));
    await Promise.all(workers);
    onProgress?.(`All ${jobUrls.length} review tabs ready in external Chrome.`);
  }

  /**
   * 100% Autonomous Mode: Navigates to job in external Chrome, auto-fills all fields,
   * handles questions, uploads resume, clicks submit, and strictly verifies confirmation.
   */
  public static async submitApplication(
    url: string,
    profile: MasterProfile,
    onProgress?: (msg: string) => void
  ): Promise<ApplyResult> {
    if (!url || !url.trim()) {
      return { url: '', success: false, submitted: false, prefilled: false, captchaDetected: false, error: 'Invalid URL' };
    }

    let page: Page | null = null;
    try {
      const session = await getOrLaunchExternalSession();
      page = await session.context.newPage();

      onProgress?.(`[Autonomous] Navigating to: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.bringToFront().catch(() => {});

      // Inject floating overlay
      await AutoApplyEngine.injectOverlay(page, '⚡ Nomadic: Auto-Apply Engine Active');

      // Detect CAPTCHA barriers
      const captchaDetected = await AutoApplyEngine.detectCaptcha(page);
      if (captchaDetected) {
        await AutoApplyEngine.injectOverlay(
          page,
          '⚠️ CAPTCHA Detected — Complete challenge to proceed',
          '#f59e0b'
        );
        onProgress?.(`[Autonomous] CAPTCHA barrier detected at ${url}`);
        return {
          url,
          success: true,
          submitted: false,
          prefilled: false,
          captchaDetected: true,
          error: 'CAPTCHA barrier detected (left open in Chrome for candidate)',
        };
      }

      // Detect Login / Authentication Wall
      const isLoginRequired = await AutoApplyEngine.detectLoginRequired(page);
      if (isLoginRequired) {
        await AutoApplyEngine.injectOverlay(
          page,
          '🔐 Sign-In Required — Please log in (Autopilot will resume automatically)',
          '#f59e0b'
        );
        onProgress?.(`[Autonomous] 🔐 Sign-in required for ${url}. Waiting for user login in browser...`);
        const loggedIn = await AutoApplyEngine.waitForLoginComplete(page, onProgress);
        if (loggedIn) {
          await AutoApplyEngine.injectOverlay(
            page,
            '✓ Sign-In Verified! Resuming auto-fill...',
            '#22c55e'
          );
          onProgress?.(`[Autonomous] ✓ User signed in at ${url}. Resuming application filling...`);
        } else {
          onProgress?.(`[Autonomous] Sign-in timed out for ${url}. Left open in browser.`);
          return {
            url,
            success: false,
            submitted: false,
            prefilled: false,
            captchaDetected: false,
            error: 'Sign-in timed out (left open for manual login in Chrome)',
          };
        }
      }

      // Expand form if required
      await AutoApplyEngine.openApplicationFormIfRequired(page);

      // Auto-fill standard candidate fields
      await AutoApplyEngine.injectOverlay(page, 'Typing candidate credentials...');
      await AutoApplyEngine.fillStandardFields(page, profile);

      // Fill select dropdowns & radio buttons
      await AutoApplyEngine.fillSelectDropdowns(page, profile);

      // Answer dynamic questions with in-house AI solver
      await AutoApplyEngine.injectOverlay(page, 'Auto-answering application questions...');
      await AutoApplyEngine.answerOpenEndedFields(page, profile);

      // Attach tailored resume
      await AutoApplyEngine.injectOverlay(page, 'Attaching matching resume...');
      await AutoApplyEngine.uploadResumeIfPresent(page, profile);

      // Check consent and required checkboxes
      await AutoApplyEngine.fillConsentAndRequiredCheckboxes(page);

      await page.waitForTimeout(1000);

      // Submit application
      await AutoApplyEngine.injectOverlay(page, 'Submitting application form...', '#38bdf8');
      const submitClicked = await AutoApplyEngine.submitForm(page);

      if (!submitClicked) {
        await AutoApplyEngine.injectOverlay(
          page,
          '✓ Pre-filled successfully! 1-Click submit ready',
          '#22c55e'
        );
        onProgress?.(`[Autonomous] Form prefilled (ready for submit) for ${url}`);
        return { url, success: true, submitted: false, prefilled: true, captchaDetected: false };
      }

      // Check confirmation strictly
      const confirmed = await AutoApplyEngine.waitForConfirmation(page);
      if (confirmed) {
        await AutoApplyEngine.injectOverlay(
          page,
          '✓ Application Submitted & Confirmed!',
          '#22c55e'
        );
        onProgress?.(`[Autonomous] Confirmed submitted successfully: ${url} ✓`);
        return { url, success: true, submitted: true, prefilled: true, captchaDetected: false };
      } else {
        // Submission was clicked, but confirmation wasn't verified
        await AutoApplyEngine.injectOverlay(
          page,
          '✓ Details Pre-filled — Please review and click submit in browser',
          '#38bdf8'
        );
        onProgress?.(`[Autonomous] Form pre-filled for ${url} (left open in browser for 1-click review & submit)`);
        return {
          url,
          success: true,
          submitted: false,
          prefilled: true,
          captchaDetected: false,
          error: 'Pre-filled, left open for 1-click review & submit'
        };
      }
    } catch (err: any) {
      onProgress?.(`[Autonomous] Error on ${url}: ${err?.message}`);
      return {
        url,
        success: false,
        submitted: false,
        prefilled: false,
        captchaDetected: false,
        error: err?.message || String(err),
      };
    }
  }

  // ── Helper Methods ────────────────────────────────────────────────────────

  private static async injectOverlay(page: Page, text: string, color: string = '#38bdf8'): Promise<void> {
    try {
      await page.evaluate(
        ({ text, color }: { text: string; color: string }) => {
          let banner = document.getElementById('nomadic-overlay');
          if (!banner) {
            banner = document.createElement('div');
            banner.id = 'nomadic-overlay';
            banner.style.position = 'fixed';
            banner.style.top = '16px';
            banner.style.left = '50%';
            banner.style.transform = 'translateX(-50%)';
            banner.style.zIndex = '2147483647';
            banner.style.backgroundColor = '#09090b';
            banner.style.padding = '10px 24px';
            banner.style.borderRadius = '9999px';
            banner.style.boxShadow = '0 10px 30px rgba(0,0,0,0.7), 0 0 20px rgba(56,189,248,0.4)';
            banner.style.fontFamily = 'system-ui, -apple-system, sans-serif';
            banner.style.fontSize = '13px';
            banner.style.fontWeight = '600';
            banner.style.display = 'flex';
            banner.style.alignItems = 'center';
            banner.style.gap = '10px';
            banner.style.border = '1px solid rgba(56,189,248,0.5)';
            banner.style.pointerEvents = 'none';
            banner.style.transition = 'all 0.3s ease';
            document.body.appendChild(banner);
          }
          banner.style.color = color;
          banner.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${color};box-shadow:0 0 8px ${color}"></span><span>${text}</span>`;
        },
        { text, color }
      );
    } catch {}
  }

  private static async openApplicationFormIfRequired(page: Page): Promise<void> {
    try {
      const existingInputs = await page.$$(
        'input[name*="name" i], input[id*="name" i], input[name*="email" i], input[id*="email" i]'
      );
      if (existingInputs.length > 0) return;

      const triggerSelectors = [
        'a:has-text("Apply for this job")',
        'button:has-text("Apply for this job")',
        'a:has-text("Apply Now")',
        'button:has-text("Apply Now")',
        'a:has-text("Apply for position")',
        'button:has-text("Apply for position")',
        'a:has-text("Apply to Job")',
        'button:has-text("Apply to Job")',
        'a:has-text("Quick Apply")',
        'button:has-text("Quick Apply")',
        'a:has-text("Apply")',
        'button:has-text("Apply")',
        '[data-qa="btn-apply"]',
        '.apply-button',
        '#apply-button',
      ];

      for (const sel of triggerSelectors) {
        const btn = await page.$(sel);
        if (btn) {
          const isVisible = await btn.isVisible().catch(() => false);
          if (isVisible) {
            await btn.scrollIntoViewIfNeeded().catch(() => {});
            await btn.click().catch(() => {});
            await page.waitForTimeout(1000);
            break;
          }
        }
      }
    } catch {}
  }

  private static async fillStandardFields(page: Page, profile: MasterProfile): Promise<void> {
    const profileMap: Record<string, string> = {
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      fullName: `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim(),
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      linkedin: profile.linkedin ?? '',
      github: profile.github ?? '',
      sponsorship: profile.sponsorship ?? '',
      salary: profile.salary ?? '',
      noticePeriod: profile.noticePeriod ?? '',
    };

    for (const [key, aliases] of Object.entries(ATS_FIELD_ALIASES)) {
      const val = profileMap[key];
      if (!val) continue;

      for (const alias of aliases) {
        try {
          const selector = `input[name*="${alias}" i], input[id*="${alias}" i], input[placeholder*="${alias}" i], textarea[name*="${alias}" i]`;
          const input = await page.$(selector);
          if (input) {
            const isVisible = await input.isVisible().catch(() => false);
            if (isVisible) {
              await input.scrollIntoViewIfNeeded().catch(() => {});
              await input.evaluate((el: any) => {
                el.style.outline = '2px solid #22c55e';
                el.style.boxShadow = '0 0 10px rgba(34,197,94,0.4)';
              }).catch(() => {});
              await input.click().catch(() => {});
              await input.fill(val);
              await input.dispatchEvent('input').catch(() => {});
              await input.dispatchEvent('change').catch(() => {});
              await page.waitForTimeout(50);
              break;
            }
          }
        } catch {}
      }
    }

    // Handle radio for sponsorship
    if (profile.sponsorship) {
      try {
        const isNo = profile.sponsorship.toLowerCase() === 'no';
        const targetVal = isNo ? 'no' : 'yes';
        const radio = await page.$(
          `input[type="radio"][value*="${targetVal}" i], input[type="radio"][id*="${targetVal}" i]`
        );
        if (radio) {
          await radio.scrollIntoViewIfNeeded().catch(() => {});
          await radio.click().catch(() => {});
        }
      } catch {}
    }
  }

  private static async fillSelectDropdowns(page: Page, profile: MasterProfile): Promise<void> {
    try {
      const selects = await page.$$('select');
      for (const select of selects) {
        try {
          const isVisible = await select.isVisible().catch(() => false);
          if (!isVisible) continue;

          const label = (await AutoApplyEngine.getLabelForInput(page, select)).toLowerCase();
          const name = ((await select.getAttribute('name')) || '').toLowerCase();
          const id = ((await select.getAttribute('id')) || '').toLowerCase();
          const fieldDesc = `${label} ${name} ${id}`;

          const options = await select.$$eval('option', (opts: any[]) =>
            opts.map(o => ({ value: o.value, text: (o.textContent || '').trim().toLowerCase() }))
          );

          if (options.length <= 1) continue;

          // 1. Sponsorship question
          if (fieldDesc.includes('sponsorship') || fieldDesc.includes('visa')) {
            const isNo = (profile.sponsorship || 'no').toLowerCase() === 'no';
            const matchingOpt = options.find(o => isNo ? o.text.startsWith('no') : o.text.startsWith('yes'));
            if (matchingOpt && matchingOpt.value) {
              await select.selectOption(matchingOpt.value).catch(() => {});
              continue;
            }
          }

          // 2. Legally authorized to work
          if (fieldDesc.includes('authorized') || fieldDesc.includes('legally')) {
            const matchingOpt = options.find(o => o.text.startsWith('yes'));
            if (matchingOpt && matchingOpt.value) {
              await select.selectOption(matchingOpt.value).catch(() => {});
              continue;
            }
          }

          // 3. Gender / Demographic / EEOC / Disability / Veteran status
          if (
            fieldDesc.includes('gender') ||
            fieldDesc.includes('race') ||
            fieldDesc.includes('veteran') ||
            fieldDesc.includes('disability') ||
            fieldDesc.includes('ethnicity')
          ) {
            const declineOpt = options.find(o =>
              o.text.includes('decline') ||
              o.text.includes('prefer not') ||
              o.text.includes('choose not') ||
              o.text.includes('do not wish') ||
              o.text.includes('no')
            );
            if (declineOpt && declineOpt.value) {
              await select.selectOption(declineOpt.value).catch(() => {});
              continue;
            }
          }

          // 4. Source / How did you hear about us
          if (fieldDesc.includes('hear') || fieldDesc.includes('source') || fieldDesc.includes('referral')) {
            const sourceOpt = options.find(o =>
              o.text.includes('linkedin') ||
              o.text.includes('job board') ||
              o.text.includes('other') ||
              o.text.includes('company')
            );
            if (sourceOpt && sourceOpt.value) {
              await select.selectOption(sourceOpt.value).catch(() => {});
              continue;
            }
          }

          // 5. Default fallback if required and currently empty
          const isRequired = await select.getAttribute('required');
          const currentValue = await select.evaluate((el: any) => el.value);
          if (isRequired && (!currentValue || currentValue === '')) {
            const firstValid = options.find(o => o.value && o.value !== '' && !o.text.includes('select'));
            if (firstValid) {
              await select.selectOption(firstValid.value).catch(() => {});
            }
          }
        } catch {}
      }
    } catch {}
  }

  private static async fillConsentAndRequiredCheckboxes(page: Page): Promise<void> {
    try {
      const checkboxes = await page.$$('input[type="checkbox"]');
      for (const cb of checkboxes) {
        try {
          const isVisible = await cb.isVisible().catch(() => false);
          if (!isVisible) continue;

          const isChecked = await cb.isChecked().catch(() => true);
          if (isChecked) continue;

          const name = ((await cb.getAttribute('name')) || '').toLowerCase();
          const id = ((await cb.getAttribute('id')) || '').toLowerCase();
          const label = (await AutoApplyEngine.getLabelForInput(page, cb)).toLowerCase();
          const isRequired = Boolean(await cb.getAttribute('required'));

          const consentKeywords = [
            'consent', 'agree', 'terms', 'privacy', 'policy', 'acknowledge',
            'certify', 'accurate', 'data', 'gdpr', 'processing', 'statement'
          ];

          const isConsent = isRequired || consentKeywords.some(kw =>
            name.includes(kw) || id.includes(kw) || label.includes(kw)
          );

          if (isConsent) {
            await cb.scrollIntoViewIfNeeded().catch(() => {});
            await cb.click().catch(() => {});
            await page.waitForTimeout(50);
          }
        } catch {}
      }
    } catch {}
  }

  private static async answerOpenEndedFields(page: Page, profile: MasterProfile): Promise<void> {
    try {
      const candidateSummary = [
        `Candidate: ${profile.firstName} ${profile.lastName}`,
        `Role: ${profile.desiredTitle || 'Software Engineer'}`,
        `Tech Stack: ${profile.techStack || 'TypeScript, React, Node.js, Python, PostgreSQL, Cloud'}`,
        `Compensation: ${profile.salary || 'Open / Competitive'}`,
        `Notice Period: ${profile.noticePeriod || '2 weeks'}`,
        `Work Auth: ${profile.sponsorship || 'Authorized to work'}`,
        `Background:\n${profile.summaryText || 'Experienced full-stack engineer building high-performance web applications and backend systems.'}`,
      ].join('\n');

      const textareas = await page.$$(
        'textarea:not([name*="resume" i]):not([id*="resume" i])'
      );

      for (const ta of textareas) {
        try {
          const isVisible = await ta.isVisible().catch(() => false);
          if (!isVisible) continue;

          const placeholder = (await ta.getAttribute('placeholder')) || '';
          const name = (await ta.getAttribute('name')) || '';
          const label = await AutoApplyEngine.getLabelForInput(page, ta);
          const questionText = label || placeholder || name;

          if (!questionText || questionText.length < 3) continue;

          // 1. Check custom user Q&A dictionary first
          let answer: string | null = null;
          if (profile.customAnswers) {
            for (const [qKey, customVal] of Object.entries(profile.customAnswers)) {
              if (questionText.toLowerCase().includes(qKey.toLowerCase())) {
                answer = customVal;
                break;
              }
            }
          }

          // 2. Check local cached answers
          if (!answer && profile.cachedAnswers) {
            for (const [cKey, cachedVal] of Object.entries(profile.cachedAnswers)) {
              if (questionText.toLowerCase().includes(cKey.toLowerCase()) || cKey.toLowerCase().includes(questionText.toLowerCase())) {
                answer = cachedVal;
                break;
              }
            }
          }

          // 3. Use AI solver if no cached answer found
          if (!answer) {
            try {
              answer = await answerCustomQuestion(
                profile.groqApiKey || '',
                questionText,
                candidateSummary
              );
              if (answer) {
                profile.onAnswerResolved?.(questionText, answer);
              }
            } catch {}
          }

          if (answer) {
            await ta.scrollIntoViewIfNeeded().catch(() => {});
            await ta.evaluate((el: any) => {
              el.style.outline = '2px solid #22c55e';
              el.style.boxShadow = '0 0 10px rgba(34,197,94,0.4)';
            }).catch(() => {});
            await ta.fill(answer);
            await ta.dispatchEvent('input').catch(() => {});
            await ta.dispatchEvent('change').catch(() => {});
          }
        } catch {}
      }
    } catch {}
  }

  private static async uploadResumeIfPresent(page: Page, profile: MasterProfile): Promise<void> {
    try {
      let targetFile = profile.resumeFilePath;

      if (!targetFile && profile.resumes && profile.resumes.length > 0) {
        const defaultResume = profile.resumes.find(r => r.isDefault) || profile.resumes[0];
        targetFile = defaultResume.filePath;
      }

      if (!targetFile || !fs.existsSync(targetFile)) return;

      const fileInputs = await page.$$('input[type="file"]');
      for (const fi of fileInputs) {
        try {
          const name = (await fi.getAttribute('name')) || '';
          const id = (await fi.getAttribute('id')) || '';
          const accept = (await fi.getAttribute('accept')) || '';

          if (
            name.toLowerCase().includes('resume') ||
            name.toLowerCase().includes('cv') ||
            id.toLowerCase().includes('resume') ||
            id.toLowerCase().includes('cv') ||
            accept.includes('pdf') ||
            fileInputs.length === 1
          ) {
            await fi.setInputFiles(targetFile);
            await page.waitForTimeout(800);
            break;
          }
        } catch {}
      }
    } catch {}
  }

  private static async submitForm(page: Page): Promise<boolean> {
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button#submit_app',
      'input#submit_app',
      'button:has-text("Submit Application")',
      'button:has-text("Submit Application Form")',
      'button:has-text("Submit application")',
      'button:has-text("Submit")',
      'button:has-text("Send Application")',
      'button:has-text("Complete Application")',
      'button:has-text("Apply Now")',
      '[data-qa="btn-submit"]',
      '[data-qa="submit-button"]',
      'button.template-btn-submit',
      'button[aria-label*="Submit" i]'
    ];

    for (const sel of submitSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          const isVisible = await btn.isVisible().catch(() => false);
          if (isVisible) {
            await btn.scrollIntoViewIfNeeded().catch(() => {});
            await btn.click().catch(() => {});
            return true;
          }
        }
      } catch {}
    }
    return false;
  }

  private static async waitForConfirmation(page: Page): Promise<boolean> {
    const confirmationTexts = [
      'thank you for applying',
      'thank you for your application',
      'application submitted',
      'application received',
      'we have received your application',
      'we\'ve received your application',
      'successfully applied',
      'application complete',
      'your application was submitted',
      'thanks for applying',
      'application has been sent',
      'we will review your application',
      'submission confirmed',
      'has been submitted',
    ];

    for (let i = 0; i < 6; i++) {
      try {
        // 1. Check URL indicator
        const currentUrl = page.url().toLowerCase();
        if (
          currentUrl.includes('/confirmation') ||
          currentUrl.includes('/thank_you') ||
          currentUrl.includes('/thanks') ||
          currentUrl.includes('/applied') ||
          currentUrl.includes('/submitted') ||
          currentUrl.includes('/success') ||
          currentUrl.includes('submitted=true')
        ) {
          return true;
        }

        // 2. Check DOM text
        const bodyText = await page.innerText('body').catch(() => '');
        const lower = bodyText.toLowerCase();
        for (const ct of confirmationTexts) {
          if (lower.includes(ct)) return true;
        }

        // 3. Check for validation errors remaining
        const hasFormErrors = await page.evaluate(() => {
          const errs = document.querySelectorAll('.error, [aria-invalid="true"], .field-error, .form-error, input:invalid');
          return errs.length > 0;
        }).catch(() => false);

        if (hasFormErrors && i >= 2) {
          return false;
        }

        await page.waitForTimeout(1000);
      } catch {
        break;
      }
    }
    return false;
  }

  private static async detectCaptcha(page: Page): Promise<boolean> {
    try {
      const captchaSelectors = [
        'iframe[src*="recaptcha"]',
        'iframe[src*="hcaptcha"]',
        'iframe[src*="cloudflare"]',
        '#cf-challenge-running',
        '.cf-browser-verification',
        '.g-recaptcha',
        '.h-captcha',
      ];
      for (const sel of captchaSelectors) {
        const el = await page.$(sel);
        if (el) {
          const isVisible = await el.isVisible().catch(() => false);
          if (isVisible) return true;
        }
      }
    } catch {}
    return false;
  }

  private static async detectLoginRequired(page: Page): Promise<boolean> {
    try {
      const url = page.url().toLowerCase();
      if (
        url.includes('/login') ||
        url.includes('/signin') ||
        url.includes('/auth') ||
        url.includes('accounts.google.com') ||
        url.includes('linkedin.com/checkpoint') ||
        url.includes('login.microsoftonline.com')
      ) {
        return true;
      }

      const loginSelectors = [
        'input[type="password"]',
        'form[action*="login" i]',
        'form[action*="signin" i]',
        'button:has-text("Sign in with Google")',
        'button:has-text("Log in to Apply")',
        'a:has-text("Sign In to Apply")',
        'a:has-text("Log in to apply")',
      ];

      for (const sel of loginSelectors) {
        const el = await page.$(sel);
        if (el) {
          const isVisible = await el.isVisible().catch(() => false);
          if (isVisible) return true;
        }
      }
    } catch {}
    return false;
  }

  private static async waitForLoginComplete(
    page: Page,
    onProgress?: (msg: string) => void,
    maxWaitMs: number = 90000
  ): Promise<boolean> {
    const startTime = Date.now();
    let lastNotifiedSec = 0;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const isStillLogin = await AutoApplyEngine.detectLoginRequired(page);
        if (!isStillLogin) {
          return true;
        }

        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
        if (elapsedSec > 0 && elapsedSec % 10 === 0 && elapsedSec !== lastNotifiedSec) {
          lastNotifiedSec = elapsedSec;
          onProgress?.(`[Autonomous] Waiting for user to complete login in Chrome (${elapsedSec}s / 90s)...`);
        }

        await page.waitForTimeout(2000);
      } catch {
        break;
      }
    }
    return !(await AutoApplyEngine.detectLoginRequired(page));
  }

  private static async getLabelForInput(page: Page, el: any): Promise<string> {
    try {
      const id = await el.getAttribute('id');
      if (id) {
        const label = await page.$(`label[for="${id}"]`);
        if (label) {
          const text = await label.innerText();
          if (text) return text.trim();
        }
      }
      const parentLabel = await el.evaluate((node: any) => {
        const l = node.closest('label');
        return l ? l.innerText : '';
      });
      if (parentLabel) return parentLabel.trim();
    } catch {}
    return '';
  }
}
