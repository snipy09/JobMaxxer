import { chromium, type BrowserContext, type Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { generateStructuredAIContent } from './groq-ai.js';

export interface MasterProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedin?: string;
  github?: string;
  sponsorship?: string;
  salary?: string;
  noticePeriod?: string;
  groqApiKey?: string;
  geminiApiKey?: string;
  summaryText?: string;
  desiredTitle?: string;
  techStack?: string;
  resumeFilePath?: string;
  resumes?: Array<{ name: string; targetRole: string; filePath: string; isDefault: boolean }>;
  customAnswers?: Record<string, string>;
  cachedAnswers?: Record<string, string>;
  onAnswerResolved?: (question: string, answer: string) => void;
}

export interface ApplyResult {
  url: string;
  success: boolean;
  submitted: boolean;
  prefilled: boolean;
  captchaDetected: boolean;
  requiresLogin?: boolean;
  fieldsFilledCount?: number;
  error?: string;
}

export interface ExternalBrowserSession {
  context: BrowserContext;
  userDataDir: string;
  isHeadless: boolean;
}

const ATS_FIELD_ALIASES: Record<string, string[]> = {
  firstName: ['first_name', 'firstname', 'first-name', 'fname', 'first', 'given_name', 'given-name', 'first name'],
  lastName: ['last_name', 'lastname', 'last-name', 'lname', 'last', 'family_name', 'family-name', 'surname', 'last name'],
  fullName: ['full_name', 'fullname', 'full-name', 'name', 'candidate_name', 'candidate-name', 'applicant_name', 'applicant-name', 'full name'],
  email: ['email', 'email_address', 'email-address', 'e-mail', 'mail', 'email address'],
  phone: ['phone', 'phone_number', 'phone-number', 'mobile', 'cell', 'telephone', 'tel', 'contact_number', 'phone number'],
  linkedin: ['linkedin', 'linkedin_url', 'linkedin-url', 'linkedin_profile', 'linkedin-profile', 'linkedin url'],
  github: ['github', 'github_url', 'github-url', 'github_profile', 'github-profile', 'portfolio', 'website', 'personal_url', 'website url'],
  salary: ['salary', 'expected_salary', 'desired_salary', 'compensation', 'target_comp', 'ctc', 'expected ctc'],
  noticePeriod: ['notice', 'notice_period', 'availability', 'earliest_start_date', 'start_date', 'when can you start'],
};

let activeSession: ExternalBrowserSession | null = null;

async function getOrLaunchExternalSession(): Promise<ExternalBrowserSession> {
  if (activeSession) {
    try {
      activeSession.context.pages();
      return activeSession;
    } catch {
      activeSession = null;
    }
  }

  const userDataDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Nomadic', 'browser_session');
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
  } catch {}

  let context: BrowserContext;
  if (typeof (chromium as any).launchPersistentContext === 'function') {
    context = await (chromium as any).launchPersistentContext(userDataDir, {
      headless: false,
      channel: 'chrome',
      viewport: { width: 1280, height: 850 },
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-size=1280,850',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    }).catch(async () => {
      return await (chromium as any).launchPersistentContext(userDataDir, {
        headless: false,
        viewport: { width: 1280, height: 850 },
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
        ignoreDefaultArgs: ['--enable-automation'],
      });
    });
  } else {
    const browser = await chromium.launch({ headless: false });
    context = await browser.newContext();
  }

  activeSession = {
    context,
    userDataDir,
    isHeadless: false,
  };

  return activeSession;
}

export class AutoApplyEngine {
  /**
   * Alias for backward compatibility with prefillParallelTabs tests.
   */
  public static async prefillParallelTabs(
    jobUrls: string[],
    profile: MasterProfile,
    onProgressOrLimit?: ((msg: string) => void) | number,
    limit: number = 3
  ): Promise<void> {
    if (!jobUrls || jobUrls.length === 0) return;
    const onProgress = typeof onProgressOrLimit === 'function' ? onProgressOrLimit : undefined;
    const finalLimit = typeof onProgressOrLimit === 'number' ? onProgressOrLimit : limit;
    return AutoApplyEngine.runAutonomousApply(jobUrls, profile, onProgress, finalLimit);
  }

  /**
   * Semi-Autonomous (Review) Mode: Opens jobs, pre-fills forms, leaves tabs ready for user 1-click review.
   */
  public static async runAutonomousApply(
    jobUrls: string[],
    profile: MasterProfile,
    onProgress?: (msg: string) => void,
    limit: number = 3
  ): Promise<void> {
    const progressCallback = typeof onProgress === 'function' ? onProgress : () => {};
    const session = await getOrLaunchExternalSession();

    const worker = async (workerId: number) => {
      while (jobUrls.length > 0) {
        const url = jobUrls.shift();
        if (!url) break;

        let page: Page | null = null;
        try {
          page = await session.context.newPage();
          progressCallback(`[Worker ${workerId}] Opening: ${url}`);
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await page.bringToFront().catch(() => {});

          await AutoApplyEngine.injectOverlay(page, '⚡ Nomadic: Auto-filling details...');
          await AutoApplyEngine.openApplicationFormIfRequired(page);
          const fieldsFilled = await AutoApplyEngine.fillStandardFields(page, profile);
          await AutoApplyEngine.fillSelectDropdowns(page, profile);
          await AutoApplyEngine.answerOpenEndedFields(page, profile);
          await AutoApplyEngine.uploadResumeIfPresent(page, profile);
          await AutoApplyEngine.fillConsentAndRequiredCheckboxes(page);

          await AutoApplyEngine.injectOverlay(
            page,
            fieldsFilled > 0 ? '✓ Auto-filled! Ready for 1-Click Review & Submit' : 'Nomadic: Review application details',
            fieldsFilled > 0 ? '#22c55e' : '#38bdf8'
          );
          progressCallback(`[Ready for Review] ${url} (${fieldsFilled} fields filled)`);
        } catch (err: any) {
          progressCallback(`[Notice] ${url}: ${err?.message}`);
        }
      }
    };

    const workerCount = Math.min(limit, jobUrls.length);
    const workers = Array.from({ length: workerCount }, (_, i) => worker(i + 1));
    await Promise.all(workers);
  }

  /**
   * 100% Targeted Autonomous Mode: Navigates to job in external browser, fills all candidate fields,
   * uploads resume, clicks submit, and strictly verifies confirmation.
   */
  public static async submitApplication(
    url: string,
    profile: MasterProfile,
    onProgress?: (msg: string) => void
  ): Promise<ApplyResult> {
    if (!url || !url.trim()) {
      return { url: '', success: false, submitted: false, prefilled: false, captchaDetected: false, fieldsFilledCount: 0, error: 'Invalid URL' };
    }

    let page: Page | null = null;
    try {
      const session = await getOrLaunchExternalSession();
      page = await session.context.newPage();

      onProgress?.(`[Autonomous] Navigating to: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.bringToFront().catch(() => {});

      // 1. Inject floating status overlay
      await AutoApplyEngine.injectOverlay(page, '⚡ Nomadic: Auto-Apply Engine Active');

      // 2. Detect CAPTCHA barriers
      const captchaDetected = await AutoApplyEngine.detectCaptcha(page);
      if (captchaDetected) {
        await AutoApplyEngine.injectOverlay(
          page,
          '⚠️ CAPTCHA Challenge Detected — Solve to proceed',
          '#f59e0b'
        );
        onProgress?.(`[Autonomous] CAPTCHA detected at ${url}. Left open in browser for candidate.`);
        return {
          url,
          success: false,
          submitted: false,
          prefilled: false,
          captchaDetected: true,
          fieldsFilledCount: 0,
          error: 'CAPTCHA challenge detected (left open in browser)',
        };
      }

      // 3. Detect Login / Authentication Wall
      const isLoginRequired = await AutoApplyEngine.detectLoginRequired(page);
      if (isLoginRequired) {
        await AutoApplyEngine.injectOverlay(
          page,
          '🔐 Sign-In Required — Please log in to your account',
          '#f59e0b'
        );
        onProgress?.(`[Autonomous] 🔐 Sign-in required for ${url}. Waiting for candidate authentication...`);
        const loggedIn = await AutoApplyEngine.waitForLoginComplete(page, onProgress);
        if (loggedIn) {
          await AutoApplyEngine.injectOverlay(
            page,
            '✓ Sign-In Verified! Resuming auto-fill...',
            '#22c55e'
          );
          onProgress?.(`[Autonomous] ✓ User authenticated at ${url}. Resuming application filling...`);
        } else {
          onProgress?.(`[Autonomous] Sign-in required for ${url}. Left open in browser.`);
          return {
            url,
            success: false,
            submitted: false,
            prefilled: false,
            captchaDetected: false,
            requiresLogin: true,
            fieldsFilledCount: 0,
            error: 'Sign-in required on job portal (left open in browser)',
          };
        }
      }

      // 4. Expand application form if collapsed
      await AutoApplyEngine.openApplicationFormIfRequired(page);

      // 5. Fill candidate text fields & measure count
      await AutoApplyEngine.injectOverlay(page, 'Typing candidate credentials...');
      const standardFieldsFilled = await AutoApplyEngine.fillStandardFields(page, profile);

      // 6. Fill select dropdowns & radio buttons
      const dropdownsFilled = await AutoApplyEngine.fillSelectDropdowns(page, profile);

      // 7. Answer dynamic questions with in-house AI solver
      await AutoApplyEngine.injectOverlay(page, 'Auto-answering application questions...');
      const questionsAnswered = await AutoApplyEngine.answerOpenEndedFields(page, profile);

      // 8. Attach matching resume
      await AutoApplyEngine.injectOverlay(page, 'Attaching matching resume...');
      const resumeUploaded = await AutoApplyEngine.uploadResumeIfPresent(page, profile);

      // 9. Check consent & required checkboxes
      const checkboxesChecked = await AutoApplyEngine.fillConsentAndRequiredCheckboxes(page);

      const totalFieldsFilled = standardFieldsFilled + dropdownsFilled + questionsAnswered + (resumeUploaded ? 1 : 0) + checkboxesChecked;

      // Check if page actually had an application form
      if (totalFieldsFilled === 0) {
        onProgress?.(`[Autonomous] No fillable application form found at ${url}.`);
        return {
          url,
          success: false,
          submitted: false,
          prefilled: false,
          captchaDetected: false,
          fieldsFilledCount: 0,
          error: 'No application form detected on page',
        };
      }

      await page.waitForTimeout(1000);

      // 10. Submit application form
      await AutoApplyEngine.injectOverlay(page, 'Submitting application form...', '#38bdf8');
      const submitClicked = await AutoApplyEngine.submitForm(page);

      if (!submitClicked) {
        await AutoApplyEngine.injectOverlay(
          page,
          `✓ Pre-filled ${totalFieldsFilled} fields! Ready for 1-Click Submit`,
          '#22c55e'
        );
        onProgress?.(`[Autonomous] Pre-filled ${totalFieldsFilled} fields at ${url}. Ready for review.`);
        return {
          url,
          success: true,
          submitted: false,
          prefilled: true,
          captchaDetected: false,
          fieldsFilledCount: totalFieldsFilled,
        };
      }

      // 11. Strictly verify submission confirmation
      const confirmed = await AutoApplyEngine.waitForConfirmation(page);
      if (confirmed) {
        await AutoApplyEngine.injectOverlay(
          page,
          '✓ Application Submitted & Confirmed!',
          '#22c55e'
        );
        onProgress?.(`[Autonomous] Confirmed submitted successfully: ${url} ✓`);
        return {
          url,
          success: true,
          submitted: true,
          prefilled: true,
          captchaDetected: false,
          fieldsFilledCount: totalFieldsFilled,
        };
      } else {
        await AutoApplyEngine.injectOverlay(
          page,
          '✓ Details Pre-filled — Please review and click submit in browser',
          '#38bdf8'
        );
        onProgress?.(`[Autonomous] Form pre-filled for ${url} (left open in browser for 1-click review)`);
        return {
          url,
          success: true,
          submitted: false,
          prefilled: true,
          captchaDetected: false,
          fieldsFilledCount: totalFieldsFilled,
          error: 'Pre-filled, left open for 1-click review & submit',
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
        fieldsFilledCount: 0,
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
        'input[type="text"], input[name*="name" i], input[name*="email" i], input[type="email"]'
      );
      if (existingInputs.length > 0) return;

      const triggerSelectors = [
        'a:has-text("Apply for this job")',
        'a:has-text("Apply Now")',
        'button:has-text("Apply for this job")',
        'button:has-text("Apply Now")',
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

  private static async fillStandardFields(page: Page, profile: MasterProfile): Promise<number> {
    let filledCount = 0;
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
              filledCount++;
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
          filledCount++;
        }
      } catch {}
    }

    return filledCount;
  }

  private static async fillSelectDropdowns(page: Page, profile: MasterProfile): Promise<number> {
    let filledCount = 0;
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
              filledCount++;
              continue;
            }
          }

          // 2. Legally authorized to work
          if (fieldDesc.includes('authorized') || fieldDesc.includes('legally')) {
            const matchingOpt = options.find(o => o.text.startsWith('yes'));
            if (matchingOpt && matchingOpt.value) {
              await select.selectOption(matchingOpt.value).catch(() => {});
              filledCount++;
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
              filledCount++;
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
              filledCount++;
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
              filledCount++;
            }
          }
        } catch {}
      }
    } catch {}
    return filledCount;
  }

  private static async fillConsentAndRequiredCheckboxes(page: Page): Promise<number> {
    let checkedCount = 0;
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
            checkedCount++;
            await page.waitForTimeout(50);
          }
        } catch {}
      }
    } catch {}
    return checkedCount;
  }

  private static async answerOpenEndedFields(page: Page, profile: MasterProfile): Promise<number> {
    let answeredCount = 0;
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

          const currentValue = await ta.inputValue().catch(() => '');
          if (currentValue && currentValue.trim().length > 0) continue;

          const questionText = await AutoApplyEngine.getLabelForInput(page, ta);
          if (!questionText || questionText.length < 4) continue;

          const normalizedQuestion = questionText.toLowerCase().trim();

          // 1. Check custom answers
          if (profile.customAnswers) {
            const matchedKey = Object.keys(profile.customAnswers).find(k =>
              normalizedQuestion.includes(k.toLowerCase())
            );
            if (matchedKey && profile.customAnswers[matchedKey]) {
              await ta.fill(profile.customAnswers[matchedKey]);
              answeredCount++;
              continue;
            }
          }

          // 2. Check cached answers
          if (profile.cachedAnswers && profile.cachedAnswers[normalizedQuestion]) {
            await ta.fill(profile.cachedAnswers[normalizedQuestion]);
            answeredCount++;
            continue;
          }

          // 3. Fallback to in-house AI Answer Generator
          const prompt = `You are a professional software engineer candidate applying for a job.
Candidate profile:
${candidateSummary}

Application Question:
"${questionText}"

Write a concise, compelling, highly professional answer directly from the candidate's perspective (2 to 4 sentences). Do not include placeholders, greetings, or fluff.`;

          const aiAnswer = await generateStructuredAIContent<string>(
            prompt,
            'You are an expert candidate application assistant. Write concise, accurate, first-person candidate responses.',
            { groqKey: profile.groqApiKey, geminiKey: profile.geminiApiKey }
          );

          if (aiAnswer && typeof aiAnswer === 'string' && aiAnswer.trim().length > 0) {
            await ta.fill(aiAnswer.trim());
            profile.onAnswerResolved?.(normalizedQuestion, aiAnswer.trim());
            answeredCount++;
          }
        } catch {}
      }
    } catch {}
    return answeredCount;
  }

  private static async uploadResumeIfPresent(page: Page, profile: MasterProfile): Promise<boolean> {
    try {
      let targetResumePath = profile.resumeFilePath;

      if (!targetResumePath && Array.isArray(profile.resumes) && profile.resumes.length > 0) {
        const defaultResume = profile.resumes.find(r => r.isDefault) || profile.resumes[0];
        targetResumePath = defaultResume.filePath;
      }

      if (!targetResumePath || !fs.existsSync(targetResumePath)) {
        return false;
      }

      const fileInputs = await page.$$('input[type="file"]');
      for (const input of fileInputs) {
        try {
          const name = ((await input.getAttribute('name')) || '').toLowerCase();
          const id = ((await input.getAttribute('id')) || '').toLowerCase();
          const accept = ((await input.getAttribute('accept')) || '').toLowerCase();

          const isResumeField =
            name.includes('resume') ||
            name.includes('cv') ||
            id.includes('resume') ||
            id.includes('cv') ||
            accept.includes('.pdf') ||
            accept.includes('.doc') ||
            fileInputs.length === 1;

          if (isResumeField) {
            await input.setInputFiles(targetResumePath);
            await page.waitForTimeout(500);
            return true;
          }
        } catch {}
      }
    } catch {}
    return false;
  }

  private static async submitForm(page: Page): Promise<boolean> {
    try {
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Submit Application")',
        'button:has-text("Submit application")',
        'button:has-text("Submit")',
        'a:has-text("Submit Application")',
        '#submit_app',
        '[data-qa="btn-submit"]',
        '.submit-btn',
      ];

      for (const sel of submitSelectors) {
        const btn = await page.$(sel);
        if (btn) {
          const isVisible = await btn.isVisible().catch(() => false);
          const isEnabled = await btn.isEnabled().catch(() => false);
          if (isVisible && isEnabled) {
            await btn.scrollIntoViewIfNeeded().catch(() => {});
            await btn.click().catch(() => {});
            await page.waitForTimeout(2000);
            return true;
          }
        }
      }
    } catch {}
    return false;
  }

  private static async waitForConfirmation(page: Page, timeoutMs: number = 8000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      try {
        const currentUrl = page.url().toLowerCase();
        if (
          currentUrl.includes('/confirmation') ||
          currentUrl.includes('/thank_you') ||
          currentUrl.includes('/thanks') ||
          currentUrl.includes('/applied') ||
          currentUrl.includes('/submitted') ||
          currentUrl.includes('/success') ||
          currentUrl.includes('status=complete')
        ) {
          return true;
        }

        const confirmationTextFound = await page.evaluate(() => {
          const bodyText = (document.body?.innerText || '').toLowerCase();
          const positiveKeywords = [
            'thank you for applying',
            'application received',
            'we have received your application',
            'application submitted',
            'your application has been submitted',
            'thanks for applying',
            'application successful',
            'we received your resume',
          ];
          return positiveKeywords.some(kw => bodyText.includes(kw));
        });

        if (confirmationTextFound) {
          return true;
        }

        await page.waitForTimeout(500);
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
        'iframe[src*="turnstile"]',
        'iframe[src*="cloudflare"]',
        '.g-recaptcha',
        '.h-captcha',
        '#cf-challenge-running',
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
        url.includes('naukri.com/nlogin') ||
        url.includes('in.indeed.com/account') ||
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
        '.login-layer',
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
          onProgress?.(`[Autonomous] Waiting for login in browser (${elapsedSec}s / 90s)...`);
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
