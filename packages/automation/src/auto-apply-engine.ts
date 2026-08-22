import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { ATS_FIELD_ALIASES } from './alias-dictionary.js';
import { answerCustomQuestionWithGroq } from './groq-ai.js';

chromium.use(stealthPlugin());

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
  /** File path to local PDF/DOCX resume for autonomous upload */
  resumeFilePath?: string;
  /** Multi-resume repository with role/keyword tags */
  resumes?: Array<{ name: string; targetRole: string; filePath: string; isDefault: boolean }>;
  /** Custom Q&A dictionary: question fragment => preferred answer */
  customAnswers?: Record<string, string>;
}

export interface ApplyResult {
  url: string;
  success: boolean;
  submitted: boolean;
  captchaDetected: boolean;
  error?: string;
}

export class AutoApplyEngine {
  /**
   * Semi-Auto Mode: Opens up to 20 tabs concurrently, pre-fills standard forms,
   * leaves tabs open for manual 1-click apply.
   */
  public static async prefillParallelTabs(
    jobUrls: string[],
    profile: MasterProfile,
    maxTabs: number = 20
  ): Promise<void> {
    if (!jobUrls || jobUrls.length === 0) return;

    const boundMaxTabs = Math.max(1, Math.min(maxTabs, 50));
    const batch = jobUrls.slice(0, boundMaxTabs);

    let browser: any;
    try {
      browser = await chromium.launch({ headless: false });
    } catch (launchErr: any) {
      console.error('[Semi-Auto Mode] Failed to launch browser:', launchErr.message);
      return;
    }

    const context = await browser.newContext();
    console.log(`[Semi-Auto Mode] Prefilling ${batch.length} Chromium tabs concurrently...`);

    const fillPromises = batch.map(async (url) => {
      let page: any;
      try {
        page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await AutoApplyEngine.fillStandardFields(page, profile);
        await AutoApplyEngine.answerOpenEndedFields(page, profile);
        console.log(`[Semi-Auto Mode] Prefilled application form for: ${url}`);
      } catch (err: any) {
        console.warn(`[Semi-Auto Mode] Error opening/prefilling ${url}:`, err.message);
      }
    });

    await Promise.all(fillPromises);
    console.log('[Semi-Auto Mode] All tabs prefilled and ready for manual submission.');
  }

  /**
   * Fully Autonomous Mode: Fills & submits one job at a time with CAPTCHA detection.
   * Returns a result object per URL so the caller can log outcomes.
   */
  public static async submitApplication(
    url: string,
    profile: MasterProfile
  ): Promise<ApplyResult> {
    if (!url || typeof url !== 'string' || !url.trim()) {
      return { url: '', success: false, submitted: false, captchaDetected: false, error: 'Invalid URL' };
    }

    let browser: any;
    try {
      browser = await chromium.launch({ headless: true });
    } catch (launchErr: any) {
      return { url, success: false, submitted: false, captchaDetected: false, error: `Browser launch failed: ${launchErr.message}` };
    }

    try {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
      const page = await context.newPage();

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // CAPTCHA detection
      const captchaDetected = await AutoApplyEngine.detectCaptcha(page);
      if (captchaDetected) {
        console.warn(`[Autonomous] CAPTCHA detected at ${url} - skipping.`);
        await browser.close().catch(() => {});
        return { url, success: false, submitted: false, captchaDetected: true, error: 'CAPTCHA detected' };
      }

      // Fill standard ATS fields
      await AutoApplyEngine.fillStandardFields(page, profile);

      // Handle open-ended questions with Groq AI / Custom Q&A
      await AutoApplyEngine.answerOpenEndedFields(page, profile);

      // Handle file uploads (resume)
      await AutoApplyEngine.uploadResumeIfPresent(page, profile);

      // Click submit button
      const submitted = await AutoApplyEngine.submitForm(page);

      if (!submitted) {
        await browser.close().catch(() => {});
        return { url, success: false, submitted: false, captchaDetected: false, error: 'Submit button not found' };
      }

      // Wait briefly for post-submit confirmation
      const confirmed = await AutoApplyEngine.waitForConfirmation(page);
      console.log(`[Autonomous] ${confirmed ? 'Submitted (confirmed)' : 'Submitted (unconfirmed)'} -> ${url}`);

      await browser.close().catch(() => {});
      return { url, success: true, submitted: true, captchaDetected: false };
    } catch (err: any) {
      if (browser) await browser.close().catch(() => {});
      return { url, success: false, submitted: false, captchaDetected: false, error: err.message ?? String(err) };
    }
  }

  // Private helpers

  private static async fillStandardFields(page: any, profile: MasterProfile): Promise<void> {
    const profileMap: Record<string, string> = {
      firstName:    profile.firstName ?? '',
      lastName:     profile.lastName ?? '',
      fullName:     `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim(),
      email:        profile.email ?? '',
      phone:        profile.phone ?? '',
      linkedin:     profile.linkedin ?? '',
      github:       profile.github ?? '',
      sponsorship:  profile.sponsorship ?? '',
      salary:       profile.salary ?? '',
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
            await input.fill(val);
            break;
          }
        } catch {
          // Continue trying aliases
        }
      }
    }

    // Handle radio/select for sponsorship
    if (profile.sponsorship) {
      try {
        const sponsorVal = profile.sponsorship.toLowerCase() === 'no' ? 'No' : 'Yes';
        const radio = await page.$(`input[type="radio"][value*="${sponsorVal}" i]`);
        if (radio) await radio.click();
      } catch { /* ignore */ }
    }
  }

  private static async answerOpenEndedFields(page: any, profile: MasterProfile): Promise<void> {
    try {
      const richCandidateContext = [
        `Candidate Name: ${profile.firstName} ${profile.lastName}`,
        `Email: ${profile.email}`,
        `Phone: ${profile.phone}`,
        `LinkedIn: ${profile.linkedin}`,
        `GitHub: ${profile.github}`,
        `Target Job Title: ${profile.desiredTitle || 'Software Engineer'}`,
        `Tech Stack & Core Competencies: ${profile.techStack || 'TypeScript, React, Node.js, Python, PostgreSQL, Docker, AWS'}`,
        `Desired Compensation: ${profile.salary || 'Open / Market Rate'}`,
        `Notice Period: ${profile.noticePeriod || '2 weeks'}`,
        `Work Authorization / Sponsorship: ${profile.sponsorship || 'Authorized to work without sponsorship'}`,
        `Resume Text & Detailed Experience:\n${profile.summaryText || 'Experienced engineer with hands-on expertise building scalable full-stack applications, robust backend architectures, and high-performance user interfaces.'}`
      ].join('\n');

      // 1. Textarea fields (Cover letters, "Why work here", "Tell us about yourself")
      const textareas = await page.$$('textarea:not([name*="resume" i]):not([id*="resume" i])');
      for (const ta of textareas) {
        try {
          const placeholder = (await ta.getAttribute('placeholder')) || '';
          const label = await AutoApplyEngine.getLabelForInput(page, ta);
          const questionText = label || placeholder;

          if (!questionText || questionText.length < 5) continue;

          const existing = await ta.inputValue();
          if (existing && existing.trim().length > 10) continue;

          // Check custom Q&A rules
          let answered = false;
          if (profile.customAnswers) {
            const match = Object.entries(profile.customAnswers).find(([fragment]) =>
              questionText.toLowerCase().includes(fragment.toLowerCase())
            );
            if (match) {
              await ta.fill(match[1]);
              answered = true;
              continue;
            }
          }

          // Use AI key for descriptive answering
          if (!answered && profile.groqApiKey) {
            console.log(`[Auto-Apply AI] Generating descriptive answer for question: "${questionText.slice(0, 50)}..."`);
            const answer = await answerCustomQuestionWithGroq(
              profile.groqApiKey,
              questionText,
              richCandidateContext
            );
            if (answer) {
              await ta.fill(answer);
              console.log(`[Auto-Apply AI] Auto-filled descriptive field ✓`);
            }
          }
        } catch { /* skip this textarea */ }
      }

      // 2. Open-ended custom text input questions (e.g. "Years of experience with...", "Why this company?")
      const customInputs = await page.$$('input[type="text"]:not([name*="name" i]):not([name*="email" i]):not([name*="phone" i]):not([name*="linkedin" i]):not([name*="github" i]):not([name*="salary" i])');
      for (const input of customInputs) {
        try {
          const label = await AutoApplyEngine.getLabelForInput(page, input);
          if (!label || label.length < 8) continue;

          const existing = await input.inputValue();
          if (existing && existing.trim().length > 0) continue;

          // Check custom Q&A rules
          let answered = false;
          if (profile.customAnswers) {
            const match = Object.entries(profile.customAnswers).find(([fragment]) =>
              label.toLowerCase().includes(fragment.toLowerCase())
            );
            if (match) {
              await input.fill(match[1]);
              answered = true;
              continue;
            }
          }

          // Use AI key for descriptive single-line fields
          if (!answered && profile.groqApiKey) {
            const answer = await answerCustomQuestionWithGroq(
              profile.groqApiKey,
              label,
              richCandidateContext
            );
            if (answer) {
              // If single-line input, take concise first sentence
              const conciseAnswer = answer.split('\n')[0].trim();
              await input.fill(conciseAnswer);
            }
          }
        } catch { /* skip */ }
      }
    } catch { /* ignore */ }
  }

  private static async submitForm(page: any): Promise<boolean> {
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Submit Application")',
      'button:has-text("Submit")',
      'button:has-text("Apply Now")',
      'button:has-text("Apply")',
      'button:has-text("Send Application")',
      '[data-qa="btn-submit"]',
      '[data-testid="submit-application-button"]',
      '.submit-btn',
      '#submit-app',
    ];

    for (const sel of submitSelectors) {
      try {
        const btn = await page.$(sel);
        if (!btn) continue;
        const isVisible = await btn.isVisible();
        const isEnabled = await btn.isEnabled();
        if (!isVisible || !isEnabled) continue;
        await btn.scrollIntoViewIfNeeded();
        await page.waitForTimeout(600);
        await btn.click();
        console.log(`[Autonomous] Clicked submit via selector: ${sel}`);
        return true;
      } catch { /* try next */ }
    }

    return false;
  }

  private static async waitForConfirmation(page: any): Promise<boolean> {
    const confirmationPatterns = [
      'text=Application submitted',
      'text=Thank you for applying',
      'text=Your application has been received',
      'text=Successfully submitted',
      'text=We received your application',
      '[data-testid="application-submitted"]',
      '.application-confirmation',
    ];

    for (const pattern of confirmationPatterns) {
      try {
        await page.waitForSelector(pattern, { timeout: 8000 });
        return true;
      } catch { /* try next */ }
    }

    return false;
  }

  private static async detectCaptcha(page: any): Promise<boolean> {
    try {
      const captchaIndicators = [
        'iframe[src*="recaptcha"]',
        'iframe[src*="hcaptcha"]',
        '.g-recaptcha',
        '#cf-turnstile',
        '[data-sitekey]',
      ];

      for (const sel of captchaIndicators) {
        const el = await page.$(sel);
        if (el) return true;
      }

      // Check subframes as well
      const frames = page.frames();
      for (const frame of frames) {
        const frameUrl = frame.url().toLowerCase();
        if (frameUrl.includes('recaptcha') || frameUrl.includes('hcaptcha') || frameUrl.includes('turnstile')) {
          return true;
        }
      }
    } catch { /* ignore */ }
    return false;
  }

  /**
   * Intelligently selects the best resume file based on role keywords and job content
   */
  public static selectBestResume(profile: MasterProfile, pageTitle: string = '', pageText: string = ''): string | undefined {
    if (profile.resumes && profile.resumes.length > 0) {
      const titleLower = pageTitle.toLowerCase();
      const textLower = pageText.toLowerCase();

      // 1. Try keyword match on targetRole
      for (const r of profile.resumes) {
        if (!r.targetRole || !r.filePath) continue;
        const keywords = r.targetRole.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
        for (const kw of keywords) {
          if (titleLower.includes(kw) || textLower.includes(kw)) {
            console.log(`[Auto-Apply] Selected role-matched resume: "${r.name}" for position.`);
            return r.filePath;
          }
        }
      }

      // 2. Fall back to default resume
      const defaultRes = profile.resumes.find(r => r.isDefault && r.filePath);
      if (defaultRes) {
        console.log(`[Auto-Apply] Using default resume: "${defaultRes.name}".`);
        return defaultRes.filePath;
      }

      // 3. Fall back to first available resume
      if (profile.resumes[0]?.filePath) {
        return profile.resumes[0].filePath;
      }
    }

    return profile.resumeFilePath;
  }

  private static async uploadResumeIfPresent(page: any, profile: MasterProfile): Promise<void> {
    try {
      const pageTitle = await page.title().catch(() => '');
      const pageBody = await page.innerText('body').catch(() => '');
      const resumePath = this.selectBestResume(profile, pageTitle, pageBody);
      if (!resumePath) return;

      const fileInput = await page.$('input[type="file"][accept*="pdf" i], input[type="file"][name*="resume" i], input[type="file"][id*="resume" i]');
      if (fileInput) {
        await fileInput.setInputFiles(resumePath);
        console.log(`[Auto-Apply] Uploaded tailored resume: ${resumePath}`);
      }
    } catch { /* skip */ }
  }

  private static async getLabelForInput(page: any, inputEl: any): Promise<string> {
    try {
      const inputId = await inputEl.getAttribute('id');
      if (inputId) {
        const label = await page.$(`label[for="${inputId}"]`);
        if (label) return await label.innerText();
      }

      const ariaLabel = await inputEl.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel;

      const parentLabel = await page.evaluate((el: Element) => {
        let node = el.parentElement;
        for (let i = 0; i < 4; i++) {
          if (!node) break;
          const label = node.querySelector('label');
          if (label) return label.textContent || '';
          node = node.parentElement;
        }
        return '';
      }, inputEl);

      return parentLabel || '';
    } catch {
      return '';
    }
  }
}
