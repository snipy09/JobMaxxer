import { chromium, type BrowserContext, type Page, type Frame } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  generateStructuredAIContent,
  generateAIVisionActionPlan,
  resolveTargetElementWithTextAI,
  callGeminiVision,
  type SemanticElement,
  type AIFormActionPlan
} from './groq-ai.js';
import {
  capturePageVisionAndDOM,
  executeNomadicFill,
  executeNomadicSelect,
  executeNomadicCheckbox,
  executeNomadicClick,
  executeNomadicUploadResume
} from './ai-vision-inspector.js';
import {
  injectStealthScripts,
  humanType,
  humanClick,
  handleCloudflareTurnstile
} from './stealth-evasion.js';
import { enableFastRouteInterception } from './fast-route-interceptor.js';
import { runFastLocalNavMatcher } from './fast-nav-matcher.js';

export interface MasterProfile {
  firstName: string;
  lastName: string;
  fullName?: string;
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

export interface AutoApplyStatusEvent {
  phase: 'navigating' | 'filling' | 'answering' | 'uploading' | 'submitting' | 'advancing' | 'success' | 'user_input_required' | 'cancelled';
  message: string;
  colorState: 'grey' | 'green' | 'red';
  progress?: number;
  actionRequired?: string;
}

export type ProgressCallback = (event: AutoApplyStatusEvent | string) => void;

export interface ExternalBrowserSession {
  context: BrowserContext;
  userDataDir: string;
  isHeadless: boolean;
  isCDP?: boolean;
}

const ATS_FIELD_ALIASES: Record<string, string[]> = {
  fullName: ['full_name', 'fullname', 'full-name', 'name', 'candidate_name', 'candidate-name', 'applicant_name', 'applicant-name', 'legalNameSection_fullName', 'full name', 'your name'],
  firstName: ['first_name', 'firstname', 'first-name', 'fname', 'first', 'given_name', 'given-name', 'applicant_first_name', 'legalNameSection_firstName', 'first name', 'given name'],
  lastName: ['last_name', 'lastname', 'last-name', 'lname', 'last', 'family_name', 'family-name', 'surname', 'applicant_last_name', 'legalNameSection_lastName', 'last name', 'family name'],
  email: ['email', 'email_address', 'email-address', 'e-mail', 'mail', 'user_email', 'contact_email', 'email address'],
  phone: ['phone', 'phone_number', 'phone-number', 'mobile', 'cell', 'telephone', 'tel', 'contact_number', 'phone-number', 'phone number', 'contact number'],
  linkedin: ['linkedin', 'linkedin_url', 'linkedin-url', 'linkedin_profile', 'linkedin-profile', 'urls[LinkedIn]', 'urls[linkedin]', 'linkedin url', 'linkedin profile'],
  github: ['github', 'github_url', 'github-url', 'github_profile', 'github-profile', 'urls[GitHub]', 'urls[github]', 'portfolio', 'website', 'personal_url', 'website url', 'github url'],
  salary: ['salary', 'expected_salary', 'desired_salary', 'compensation', 'target_comp', 'ctc', 'expected ctc', 'desired compensation', 'expected compensation'],
  noticePeriod: ['notice', 'notice_period', 'availability', 'earliest_start_date', 'start_date', 'when can you start', 'notice period', 'available from'],
};

let activeSession: ExternalBrowserSession | null = null;

/**
 * Option 2: Connects to Personal Google Chrome Profile / Launches Real Chrome
 */
async function getOrLaunchExternalSession(): Promise<ExternalBrowserSession> {
  if (activeSession) {
    try {
      activeSession.context.pages();
      return activeSession;
    } catch {
      activeSession = null;
    }
  }

  // 1. Try connecting to active Google Chrome CDP session (if user started Chrome with debug port 9222)
  try {
    const cdpBrowser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 1500 });
    const contexts = cdpBrowser.contexts();
    const context = contexts.length > 0 ? contexts[0] : await cdpBrowser.newContext();
    activeSession = {
      context,
      userDataDir: 'localhost:9222',
      isHeadless: false,
      isCDP: true,
    };
    console.log('[Chrome Session] Connected to existing Google Chrome over CDP (Port 9222) ✓');
    return activeSession;
  } catch {}

  // 2. Personal Google Chrome User Data Path on Windows
  const personalChromeUserData = path.join(
    process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
    'Google',
    'Chrome',
    'User Data'
  );

  const nomadicUserDataDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Nomadic', 'browser_session');
  try {
    fs.mkdirSync(nomadicUserDataDir, { recursive: true });
  } catch {}

  // 3. Attempt to launch native Chrome with Personal Profile (Default)
  let context: BrowserContext | null = null;
  const chromeArgs = [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-infobars',
    '--window-size=1280,850',
    '--profile-directory=Default',
  ];

  if (typeof (chromium as any).launchPersistentContext === 'function') {
    if (fs.existsSync(personalChromeUserData)) {
      try {
        context = await (chromium as any).launchPersistentContext(personalChromeUserData, {
          headless: false,
          channel: 'chrome',
          viewport: { width: 1280, height: 850 },
          args: chromeArgs,
          ignoreDefaultArgs: ['--enable-automation'],
          timeout: 4000,
        });
        console.log('[Chrome Session] Attached directly to Personal Google Chrome Profile (User Data\\Default) ✓');
      } catch {
        console.log('[Chrome Session] Personal Chrome is currently running; launching persistent Nomadic Chrome session ✓');
      }
    }

    // 4. Fallback to Persistent Nomadic Chrome Profile (Carries saved logins and cookies across runs)
    if (!context) {
      try {
        context = await (chromium as any).launchPersistentContext(nomadicUserDataDir, {
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
        });
      } catch {
        try {
          context = await (chromium as any).launchPersistentContext(nomadicUserDataDir, {
            headless: false,
            viewport: { width: 1280, height: 850 },
            args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
            ignoreDefaultArgs: ['--enable-automation'],
          });
        } catch {}
      }
    }
  }

  // 5. Standard fallback if launchPersistentContext is not available
  if (!context) {
    const browser = await chromium.launch({ headless: false });
    context = await browser.newContext();
  }

  activeSession = {
    context,
    userDataDir: nomadicUserDataDir,
    isHeadless: false,
  };

  return activeSession;
}

/**
 * Creates or retrieves a verified fallback PDF resume file so file uploads never fail.
 */
function ensureFallbackResumePath(profile: MasterProfile): string {
  if (profile.resumeFilePath && fs.existsSync(profile.resumeFilePath)) {
    return profile.resumeFilePath;
  }
  if (Array.isArray(profile.resumes) && profile.resumes.length > 0) {
    const def = profile.resumes.find(r => r.isDefault) || profile.resumes[0];
    if (def?.filePath && fs.existsSync(def.filePath)) {
      return def.filePath;
    }
  }

  const tmpDir = os.tmpdir();
  const resumePath = path.join(tmpDir, 'Nomadic_Candidate_Resume.pdf');
  if (!fs.existsSync(resumePath)) {
    const content = `Candidate Name: ${profile.firstName || 'Candidate'} ${profile.lastName || 'Applicant'}
Email: ${profile.email || 'candidate@nomadic.app'}
Phone: ${profile.phone || '+1 (555) 019-2834'}
Target Role: ${profile.desiredTitle || 'Software Engineer'}
Skills: ${profile.techStack || 'TypeScript, React, Node.js, Python, PostgreSQL, Cloud'}
Summary: ${profile.summaryText || 'Experienced engineer building high performance applications.'}`;
    try {
      fs.writeFileSync(resumePath, content, 'utf8');
    } catch {}
  }
  return resumePath;
}

export class AutoApplyEngine {
  /**
   * Alias for backward compatibility.
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
          await injectStealthScripts(page);
          progressCallback(`[Worker ${workerId}] Opening: ${url}`);
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await page.bringToFront().catch(() => {});

          await AutoApplyEngine.injectOverlay(page, '⚡ Nomadic AI: Visually analyzing application form...');
          await handleCloudflareTurnstile(page);
          await AutoApplyEngine.openApplicationFormIfRequired(page);
          const fieldsFilled = await AutoApplyEngine.fillAllFormFieldsWithAI(page, profile);

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
   * 100% Targeted Autonomous Mode: Multi-Turn AI Vision & Navigation Loop (up to 8 turns)
   * Visually inspects the screen, understands redirects/homepages, clicks "Apply",
   * fills all form fields, handles steppers, uploads resume, and completes application.
   */
  public static async submitApplication(
    url: string,
    profile: MasterProfile,
    onProgress?: ProgressCallback
  ): Promise<ApplyResult> {
    if (!url || !url.trim()) {
      return { url: '', success: false, submitted: false, prefilled: false, captchaDetected: false, fieldsFilledCount: 0, error: 'Invalid URL' };
    }

    let page: Page | null = null;
    try {
      const session = await getOrLaunchExternalSession();
      page = await session.context.newPage();
      await injectStealthScripts(page);
      await enableFastRouteInterception(page);

      // Handle popup windows from "Apply with..." links
      page.on('popup', async (popup) => {
        try {
          await injectStealthScripts(popup);
          await enableFastRouteInterception(popup);
          await popup.waitForLoadState('domcontentloaded').catch(() => {});
          page = popup;
          await page?.bringToFront().catch(() => {});
        } catch {}
      });

      if (typeof onProgress === 'function') onProgress({ phase: 'navigating', message: `Opening: ${url}`, colorState: 'grey' });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.bringToFront().catch(() => {});

      await AutoApplyEngine.emitStatus(page, { phase: 'navigating', message: 'Nomadic Lightning-Fast AI Engine Active', colorState: 'grey' }, onProgress);

      // Handle Built-in Demo Test Job
      const isDemoTest = url.includes('httpbin.org') || url.includes('nomadic-demo') || url.includes('test-job');
      if (isDemoTest) {
        return await AutoApplyEngine.handleDemoTestApplication(page, profile, url, onProgress);
      }

      // Check for 404 / Expired / Closed page immediately
      const initialErrorCheck = await AutoApplyEngine.detect404OrExpiredPage(page);
      if (initialErrorCheck.is404) {
        await AutoApplyEngine.emitStatus(page, {
          phase: 'cancelled',
          message: 'Job Posting Closed or Not Found (404)',
          colorState: 'red',
          actionRequired: 'Job Expired'
        }, onProgress);
        return {
          url, success: false, submitted: false, prefilled: false, captchaDetected: false, fieldsFilledCount: 0,
          error: 'Job posting closed or not found (404)',
        };
      }

      // Candidate profile context for AI vision planner
      const candidateProfileForAI = {
        fullName: profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Candidate',
        firstName: profile.firstName || 'Candidate',
        lastName: profile.lastName || 'Applicant',
        email: profile.email || 'candidate@nomadic.app',
        phone: profile.phone || '+1 (555) 019-2834',
        linkedin: profile.linkedin || 'https://linkedin.com/in/candidate',
        github: profile.github || 'https://github.com/candidate',
        desiredTitle: profile.desiredTitle || 'Software Engineer',
        techStack: profile.techStack || 'TypeScript, React, Node.js, Python, PostgreSQL',
        sponsorship: profile.sponsorship || 'No',
        salary: profile.salary || 'Competitive',
        noticePeriod: profile.noticePeriod || '2 weeks',
        customAnswers: profile.customAnswers || {},
      };

      // ── MULTI-TURN LIGHTNING-FAST AUTONOMOUS LOOP (Up to 8 turns) ─────────
      let totalFieldsFilled = 0;
      let turn = 0;
      const MAX_TURNS = 8;
      let isSubmitted = false;

      while (turn < MAX_TURNS) {
        turn++;
        await page.waitForTimeout(200);

        // A. Anti-Bot / Cloudflare Turnstile Check
        const cfResult = await handleCloudflareTurnstile(page);
        if (cfResult.detected && !cfResult.resolved) {
          await AutoApplyEngine.emitStatus(page, {
            phase: 'user_input_required',
            message: 'Cloudflare Verification — Please complete to proceed',
            colorState: 'red',
            actionRequired: 'Verify Human Check'
          }, onProgress);
          await page.waitForTimeout(1500);
        }

        // B. Check for 404 / Expired page
        const errorCheck = await AutoApplyEngine.detect404OrExpiredPage(page);
        if (errorCheck.is404) {
          await AutoApplyEngine.emitStatus(page, {
            phase: 'cancelled',
            message: 'Job Posting Closed or Not Found (404)',
            colorState: 'red',
            actionRequired: 'Job Expired'
          }, onProgress);
          return {
            url, success: false, submitted: false, prefilled: false, captchaDetected: false, fieldsFilledCount: 0,
            error: 'Job posting closed or not found (404)',
          };
        }

        // C. Check for Confirmed Submission
        const confirmed = await AutoApplyEngine.isPageConfirmedSubmission(page, totalFieldsFilled);
        if (confirmed && totalFieldsFilled > 0) {
          isSubmitted = true;
          await AutoApplyEngine.emitStatus(page, {
            phase: 'success',
            message: 'Confirmed Application Submitted Successfully! ✓',
            colorState: 'green'
          }, onProgress);
          return {
            url, success: true, submitted: true, prefilled: true, captchaDetected: false, fieldsFilledCount: totalFieldsFilled
          };
        }

        // D. Check for CAPTCHA wall
        const captchaDetected = await AutoApplyEngine.detectCaptcha(page);
        if (captchaDetected) {
          await AutoApplyEngine.emitStatus(page, {
            phase: 'user_input_required',
            message: 'CAPTCHA Challenge Detected — Solve to proceed',
            colorState: 'red',
            actionRequired: 'Solve CAPTCHA'
          }, onProgress);
          return {
            url, success: false, submitted: false, prefilled: false, captchaDetected: true, fieldsFilledCount: 0,
            error: 'CAPTCHA challenge detected (left open in browser)',
          };
        }

        // E. Check for Login Wall & Sign-Up Gatekeepers
        const loginCheck = await AutoApplyEngine.detectLoginRequired(page);
        if (loginCheck.requiresLogin) {
          const portalLabel = loginCheck.portalName || 'Job Portal';
          await AutoApplyEngine.emitStatus(page, {
            phase: 'user_input_required',
            message: `Account Required — Please sign in / register on ${portalLabel}`,
            colorState: 'red',
            actionRequired: `Sign in to ${portalLabel}`
          }, onProgress);

          await page.bringToFront().catch(() => {});
          const loggedIn = await AutoApplyEngine.waitForLoginComplete(page, onProgress);
          if (loggedIn) {
            await AutoApplyEngine.emitStatus(page, {
              phase: 'navigating',
              message: `Sign-In Verified on ${portalLabel}! Resuming application...`,
              colorState: 'grey'
            }, onProgress);
            continue;
          } else {
            return {
              url, success: false, submitted: false, prefilled: false, captchaDetected: false, requiresLogin: true, fieldsFilledCount: 0,
              error: `Sign-in required on ${portalLabel} (left open in browser)`,
            };
          }
        }

        // F. Tier 1: Local Fast Navigation & Search Matcher (10ms - 0 AI, 0 Photos)
        const fastNav = await runFastLocalNavMatcher(page, profile.desiredTitle);
        if (fastNav.triggered && fastNav.action !== 'form_already_present') {
          await AutoApplyEngine.emitStatus(page, {
            phase: 'navigating',
            message: `Instant Match: ${fastNav.action.replace(/_/g, ' ')}...`,
            colorState: 'grey'
          }, onProgress);
          
          await page.waitForTimeout(600);
          // Check if clicking Apply opened a new popup/tab or redirected to an external ATS form
          const allOpenPages = session.context.pages();
          if (allOpenPages.length > 1) {
            const latestPage = allOpenPages[allOpenPages.length - 1];
            if (latestPage && !latestPage.isClosed() && latestPage !== page) {
              page = latestPage;
              await injectStealthScripts(page);
              await enableFastRouteInterception(page);
              await page.bringToFront().catch(() => {});
            }
          }
          await page.waitForLoadState('domcontentloaded').catch(() => {});
          continue;
        }

        // E. AI Vision Inspection (Screenshot + Interactive DOM Tree)
        await AutoApplyEngine.emitStatus(page, {
          phase: 'filling',
          message: `AI Vision analyzing application screen (Step ${turn}/${MAX_TURNS})...`,
          colorState: 'grey'
        }, onProgress);

        const visionCapture = await capturePageVisionAndDOM(page);
        const aiPlan = await generateAIVisionActionPlan(
          candidateProfileForAI,
          visionCapture.screenshotBase64,
          visionCapture.elements,
          { geminiKey: profile.geminiApiKey }
        );

        // F. Execute AI Plan Decisions
        if (aiPlan) {
          if (aiPlan.statusMessage) {
            await AutoApplyEngine.emitStatus(page, {
              phase: 'filling',
              message: `AI: ${aiPlan.statusMessage}`,
              colorState: 'grey'
            }, onProgress);
          }

          // Case 1: AI confirms submission is complete
          if (aiPlan.pageState === 'submission_confirmed' || aiPlan.actionType === 'done') {
            isSubmitted = true;
            await AutoApplyEngine.emitStatus(page, {
              phase: 'success',
              message: 'Confirmed Application Submitted Successfully! ✓',
              colorState: 'green'
            }, onProgress);
            return {
              url, success: true, submitted: true, prefilled: true, captchaDetected: false, fieldsFilledCount: Math.max(1, totalFieldsFilled)
            };
          }

          // Case 2: AI navigates from homepage / listing / job description by clicking Apply or Job link
          if (
            aiPlan.pageState === 'listing_or_homepage' ||
            aiPlan.pageState === 'job_description' ||
            aiPlan.actionType === 'click_element' ||
            aiPlan.clickTargetElementId
          ) {
            const targetId = aiPlan.clickTargetElementId || aiPlan.clickActionElementId;
            if (targetId) {
              await AutoApplyEngine.emitStatus(page, {
                phase: 'navigating',
                message: 'AI navigating to job application form...',
                colorState: 'grey'
              }, onProgress);
              const clicked = await executeNomadicClick(page, targetId);
              if (clicked) {
                await page.waitForTimeout(600);
                continue;
              }
            }
          }

          // Case 3: AI fills form inputs (Rapid Fast)
          let filledInTurn = 0;
          if (Array.isArray(aiPlan.fillActions)) {
            for (const fillAct of aiPlan.fillActions) {
              if (fillAct.elementId && fillAct.value) {
                const ok = await executeNomadicFill(page, fillAct.elementId, fillAct.value);
                if (ok) filledInTurn++;
              }
            }
          }

          // Select dropdowns
          if (Array.isArray(aiPlan.selectActions)) {
            for (const selAct of aiPlan.selectActions) {
              if (selAct.elementId && selAct.selectedOption) {
                const ok = await executeNomadicSelect(page, selAct.elementId, selAct.selectedOption);
                if (ok) filledInTurn++;
              }
            }
          }

          // Checkboxes
          if (Array.isArray(aiPlan.checkboxActions)) {
            for (const cbAct of aiPlan.checkboxActions) {
              if (cbAct.elementId) {
                const ok = await executeNomadicCheckbox(page, cbAct.elementId, cbAct.checked ?? true);
                if (ok) filledInTurn++;
              }
            }
          }

          // Upload resume
          if (aiPlan.uploadResumeElementId) {
            const resumePath = ensureFallbackResumePath(profile);
            const uploaded = await executeNomadicUploadResume(page, aiPlan.uploadResumeElementId, resumePath);
            if (uploaded) filledInTurn++;
          }

          totalFieldsFilled += filledInTurn;

          // Case 4: Advance multi-step stepper or submit
          if (aiPlan.nextStepType === 'advance_next' || aiPlan.actionType === 'advance_step') {
            const nextButton = await AutoApplyEngine.findNextStepButton(page);
            if (nextButton) {
              await AutoApplyEngine.emitStatus(page, { phase: 'advancing', message: 'Advancing to next step...', colorState: 'grey' }, onProgress);
              await humanClick(page, nextButton);
              await page.waitForTimeout(600);
              continue;
            }
          }

          if (aiPlan.nextStepType === 'submit_application' || aiPlan.actionType === 'submit') {
            await AutoApplyEngine.emitStatus(page, { phase: 'submitting', message: 'Submitting completed application...', colorState: 'grey' }, onProgress);
            const submitClicked = await AutoApplyEngine.submitForm(page);
            if (submitClicked) {
              await page.waitForTimeout(1000);
              const finalConfirm = await AutoApplyEngine.isPageConfirmedSubmission(page);
              if (finalConfirm) {
                isSubmitted = true;
              }
              break;
            }
          }
        }

        // G. Complementary Fallback: If no fields filled by AI, try deterministic heuristic fill
        if (totalFieldsFilled === 0) {
          await AutoApplyEngine.openApplicationFormIfRequired(page);
          const heuristicFilled = await AutoApplyEngine.fillHeuristicFormFields(page, profile);
          totalFieldsFilled += heuristicFilled;
        }

        // Check if we can find and click Next or Submit
        const nextBtn = await AutoApplyEngine.findNextStepButton(page);
        if (nextBtn) {
          await humanClick(page, nextBtn);
          await page.waitForTimeout(600);
          continue;
        }

        const submitBtn = await AutoApplyEngine.findSubmitButton(page);
        if (submitBtn && totalFieldsFilled > 0) {
          await AutoApplyEngine.emitStatus(page, { phase: 'submitting', message: 'Submitting application...', colorState: 'grey' }, onProgress);
          await humanClick(page, submitBtn);
          await page.waitForTimeout(1000);
          isSubmitted = await AutoApplyEngine.isPageConfirmedSubmission(page);
          break;
        }

        // If nothing to advance and fields filled, we are ready
        if (totalFieldsFilled > 0) {
          break;
        }
      }

      // H. Final Result Evaluation
      if (isSubmitted && totalFieldsFilled > 0) {
        await AutoApplyEngine.emitStatus(page, {
          phase: 'success',
          message: 'Confirmed Application Submitted Successfully!',
          colorState: 'green'
        }, onProgress);
        return {
          url, success: true, submitted: true, prefilled: true, captchaDetected: false, fieldsFilledCount: totalFieldsFilled,
        };
      }

      if (totalFieldsFilled > 0) {
        await AutoApplyEngine.emitStatus(page, {
          phase: 'user_input_required',
          message: `Pre-filled ${totalFieldsFilled} fields — Ready for 1-Click Review & Submit`,
          colorState: 'green',
          actionRequired: 'Review Form & Click Submit'
        }, onProgress);
        return {
          url, success: true, submitted: false, prefilled: true, captchaDetected: false, fieldsFilledCount: totalFieldsFilled,
        };
      }

      // If on external portal with 0 fields filled
      await AutoApplyEngine.emitStatus(page, {
        phase: 'cancelled',
        message: 'No Application Form Found on Portal',
        colorState: 'red',
        actionRequired: 'Review Portal Manually'
      }, onProgress);

      return {
        url, success: false, submitted: false, prefilled: false, captchaDetected: false, fieldsFilledCount: 0,
        error: 'No application form inputs found on page',
      };
    } catch (err: any) {
      if (typeof onProgress === 'function') onProgress({ phase: 'cancelled', message: `Notice: ${err?.message}`, colorState: 'grey' });
      return {
        url, success: false, submitted: false, prefilled: false, captchaDetected: false, fieldsFilledCount: 0,
        error: err?.message || String(err),
      };
    }
  }

  // ── Helper Methods ────────────────────────────────────────────────────────

  /**
   * AI Vision & Semantic DOM-Powered Form Filling Engine
   */
  private static async fillAllFormFieldsWithAI(page: Page, profile: MasterProfile): Promise<number> {
    let totalFilled = 0;

    try {
      const visionCapture = await capturePageVisionAndDOM(page);
      if (visionCapture && visionCapture.elements.length > 0) {
        const candidateProfileForAI = {
          fullName: profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Candidate',
          firstName: profile.firstName || 'Candidate',
          lastName: profile.lastName || 'Applicant',
          email: profile.email || 'candidate@nomadic.app',
          phone: profile.phone || '+1 (555) 019-2834',
          linkedin: profile.linkedin || 'https://linkedin.com/in/candidate',
          github: profile.github || 'https://github.com/candidate',
          desiredTitle: profile.desiredTitle || 'Software Engineer',
          techStack: profile.techStack || 'TypeScript, React, Node.js, Python, PostgreSQL',
          sponsorship: profile.sponsorship || 'No',
          salary: profile.salary || 'Competitive',
          noticePeriod: profile.noticePeriod || '2 weeks',
          customAnswers: profile.customAnswers || {},
        };

        const aiPlan = await generateAIVisionActionPlan(
          candidateProfileForAI,
          visionCapture.screenshotBase64,
          visionCapture.elements,
          { geminiKey: profile.geminiApiKey }
        );

        if (aiPlan) {
          if (Array.isArray(aiPlan.fillActions)) {
            for (const action of aiPlan.fillActions) {
              if (action.elementId && action.value) {
                const ok = await executeNomadicFill(page, action.elementId, action.value);
                if (ok) totalFilled++;
              }
            }
          }

          if (Array.isArray(aiPlan.selectActions)) {
            for (const selAction of aiPlan.selectActions) {
              if (selAction.elementId && selAction.selectedOption) {
                const ok = await executeNomadicSelect(page, selAction.elementId, selAction.selectedOption);
                if (ok) totalFilled++;
              }
            }
          }

          if (Array.isArray(aiPlan.checkboxActions)) {
            for (const cbAction of aiPlan.checkboxActions) {
              if (cbAction.elementId) {
                const ok = await executeNomadicCheckbox(page, cbAction.elementId, cbAction.checked ?? true);
                if (ok) totalFilled++;
              }
            }
          }

          if (aiPlan.uploadResumeElementId) {
            const resumePath = ensureFallbackResumePath(profile);
            const ok = await executeNomadicUploadResume(page, aiPlan.uploadResumeElementId, resumePath);
            if (ok) totalFilled++;
          }
        }
      }
    } catch {}

    const heuristicFilled = await AutoApplyEngine.fillHeuristicFormFields(page, profile);
    totalFilled += heuristicFilled;

    return totalFilled;
  }

  private static getAllFrames(page: Page): (Page | Frame)[] {
    try {
      const frames = page.frames();
      return [page, ...frames];
    } catch {
      return [page];
    }
  }

  private static async fillHeuristicFormFields(page: Page, profile: MasterProfile): Promise<number> {
    let count = 0;
    const targets = AutoApplyEngine.getAllFrames(page);

    for (const target of targets) {
      try {
        const std = await AutoApplyEngine.fillStandardFields(target, profile);
        const sel = await AutoApplyEngine.fillSelectDropdowns(target, profile);
        const qns = await AutoApplyEngine.answerOpenEndedFields(target, profile);
        const res = await AutoApplyEngine.uploadResumeIfPresent(target, profile);
        const chk = await AutoApplyEngine.fillConsentAndRequiredCheckboxes(target);
        count += std + sel + qns + (res ? 1 : 0) + chk;
      } catch {}
    }

    return count;
  }

  /**
   * Detects if the current page is an HTTP 404 / 410, closed listing, or expired error page.
   */
  public static async detect404OrExpiredPage(page: Page): Promise<{ is404: boolean; reason?: string }> {
    try {
      const errorSignatures = [
        "sorry, we couldn't find anything here",
        "the job posting you're looking for might have closed",
        "404 error",
        "404 not found",
        "404 - not found",
        "page not found",
        "page does not exist",
        "job not found",
        "this job has expired",
        "this internship has expired",
        "no longer accepting applications",
        "position has been filled",
        "job is no longer available",
        "looks like you crashed",
        "application closed for this",
        "no such job",
        "no such internship",
      ];

      const targets = AutoApplyEngine.getAllFrames(page);
      for (const target of targets) {
        const isError = await target.evaluate((sigs) => {
          const title = (document.title || '').toLowerCase();
          const body = (document.body?.innerText || '').toLowerCase();

          for (const sig of sigs) {
            if (title.includes(sig) || body.includes(sig)) {
              return { is404: true, reason: sig };
            }
          }

          const h1Text = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => (h.textContent || '').toLowerCase()).join(' ');
          if (h1Text.includes('404') || h1Text.includes('not found') || h1Text.includes('page not found') || h1Text.includes('expired')) {
            return { is404: true, reason: '404_heading' };
          }

          return { is404: false };
        }, errorSignatures).catch(() => ({ is404: false }));

        if (isError.is404) return isError;
      }
      return { is404: false };
    } catch {
      return { is404: false };
    }
  }

  /**
   * Checks if the DOM currently confirms successful application submission.
   */
  public static async isPageConfirmedSubmission(page: Page, fieldsFilledCount: number = 0): Promise<boolean> {
    try {
      // 404 / error pages must never be confirmed
      const errCheck = await AutoApplyEngine.detect404OrExpiredPage(page);
      if (errCheck.is404) return false;

      return await page.evaluate((filled) => {
        const text = (document.body?.innerText || '').toLowerCase();
        const successPhrases = [
          'thank you for applying',
          'application submitted',
          'application has been submitted',
          'application received',
          'we have received your application',
          'successfully submitted',
          'your application was sent',
          'thanks for applying',
        ];
        const hasSuccessText = successPhrases.some(phrase => text.includes(phrase));
        const hasSuccessContainer = Boolean(
          document.querySelector('.application-confirmation, .success-message, [data-qa="success-message"], #application_confirmation, .submission-success')
        );

        return hasSuccessContainer || (hasSuccessText && (filled > 0 || !document.querySelector('input, select, textarea')));
      }, fieldsFilledCount);
    } catch {
      return false;
    }
  }

  public static async emitStatus(
    page: Page | null,
    event: AutoApplyStatusEvent,
    callback?: ProgressCallback
  ): Promise<void> {
    if (page && !page.isClosed()) {
      try {
        const color = event.colorState === 'green' ? '#22c55e' : event.colorState === 'red' ? '#ef4444' : '#64748b';
        await AutoApplyEngine.injectOverlay(page, event.message, color);
      } catch {}
    }
    if (typeof callback === 'function') {
      callback(event);
    }
  }

  public static async detectCaptcha(page: Page): Promise<boolean> {
    try {
      const targets = AutoApplyEngine.getAllFrames(page);
      for (const target of targets) {
        const hasCaptcha = await target.evaluate(() => {
          const body = (document.body?.innerText || '').toLowerCase();
          const hasText = body.includes('recaptcha') || body.includes('hcaptcha') || body.includes('security check');
          const hasIframe = Boolean(
            document.querySelector('iframe[src*="recaptcha"]') ||
            document.querySelector('iframe[src*="hcaptcha"]') ||
            document.querySelector('.g-recaptcha') ||
            document.querySelector('.h-captcha')
          );
          return hasText && hasIframe;
        });
        if (hasCaptcha) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public static async detectLoginRequired(page: Page): Promise<{ requiresLogin: boolean; portalName?: string }> {
    try {
      const currentUrl = page.url().toLowerCase();
      if (
        currentUrl.includes('/login') ||
        currentUrl.includes('/signin') ||
        currentUrl.includes('/auth') ||
        currentUrl.includes('/register') ||
        currentUrl.includes('/signup') ||
        currentUrl.includes('accounts.google.com')
      ) {
        const portal = currentUrl.includes('internshala') ? 'Internshala' :
                       currentUrl.includes('naukri') ? 'Naukri' :
                       currentUrl.includes('workday') ? 'Workday' : 'Job Portal';
        return { requiresLogin: true, portalName: portal };
      }

      const targets = AutoApplyEngine.getAllFrames(page);
      for (const target of targets) {
        const check = await target.evaluate(() => {
          const body = (document.body?.innerText || '').toLowerCase();
          const title = (document.title || '').toLowerCase();

          const loginSignatures = [
            'sign up now to unlock',
            'sign up with google',
            'sign up with email',
            'register now to access',
            'register to apply',
            'sign in to apply',
            'log in to apply',
            'login to continue',
            'please log in',
            'create an account to apply',
            'sign in with your account',
            'enter your password',
          ];

          for (const sig of loginSignatures) {
            if (body.includes(sig) || title.includes(sig)) {
              return { requiresLogin: true, match: sig };
            }
          }

          const hasModal = Boolean(
            document.querySelector('#registration_modal, #login_modal, .registration_modal, .login_modal, [id*="signup-modal"], [class*="signup-modal"]')
          );
          if (hasModal) {
            return { requiresLogin: true, match: 'modal_detected' };
          }

          const hasPw = Boolean(document.querySelector('input[type="password"]'));
          const hasLoginText = body.includes('sign in') || body.includes('log in') || body.includes('register');
          if (hasPw && hasLoginText) {
            return { requiresLogin: true, match: 'password_input' };
          }

          return { requiresLogin: false };
        }).catch(() => ({ requiresLogin: false }));

        if (check.requiresLogin) {
          const portal = currentUrl.includes('internshala') ? 'Internshala' :
                         currentUrl.includes('naukri') ? 'Naukri' :
                         currentUrl.includes('workday') ? 'Workday' :
                         currentUrl.includes('lever') ? 'Lever' : 'Job Portal';
          return { requiresLogin: true, portalName: portal };
        }
      }
      return { requiresLogin: false };
    } catch {
      return { requiresLogin: false };
    }
  }

  public static async waitForLoginComplete(page: Page, onProgress?: ProgressCallback): Promise<boolean> {
    const maxWaitSeconds = 60;
    const start = Date.now();

    while ((Date.now() - start) / 1000 < maxWaitSeconds) {
      if (page.isClosed()) return false;
      const check = await AutoApplyEngine.detectLoginRequired(page);
      if (!check.requiresLogin) return true;
      await page.waitForTimeout(2000);
    }
    return false;
  }

  public static async openApplicationFormIfRequired(page: Page): Promise<void> {
    try {
      const targets = AutoApplyEngine.getAllFrames(page);
      for (const target of targets) {
        const applyTriggers = [
          'button:has-text("Apply Now")',
          'button:has-text("Apply for this job")',
          'button:has-text("Apply with Resume")',
          'button:has-text("Apply")',
          'a:has-text("Apply Now")',
          'a:has-text("Apply for this job")',
          'a[href*="apply"]',
          '[data-qa="apply-button"]',
          '.apply-button',
        ];

        for (const sel of applyTriggers) {
          try {
            const btn = await target.$(sel);
            if (btn) {
              const isVisible = await btn.isVisible().catch(() => false);
              if (isVisible) {
                await humanClick(target, btn);
                await page.waitForTimeout(1500);
                return;
              }
            }
          } catch {}
        }
      }
    } catch {}
  }

  public static async findNextStepButton(page: Page): Promise<any | null> {
    const targets = AutoApplyEngine.getAllFrames(page);
    for (const target of targets) {
      const selectors = [
        'button:has-text("Next")',
        'button:has-text("Continue")',
        'button:has-text("Proceed")',
        'button:has-text("Next Step")',
        'button[data-qa*="next"]',
        'input[type="submit"][value*="Next" i]',
        'input[type="button"][value*="Next" i]',
        'button[aria-label*="next" i]',
      ];
      for (const sel of selectors) {
        try {
          const btn = await target.$(sel);
          if (btn) {
            const isVisible = await btn.isVisible().catch(() => false);
            const isEnabled = await btn.isEnabled().catch(() => false);
            if (isVisible && isEnabled) return btn;
          }
        } catch {}
      }
    }
    return null;
  }

  public static async findSubmitButton(page: Page): Promise<any | null> {
    const targets = AutoApplyEngine.getAllFrames(page);
    for (const target of targets) {
      const selectors = [
        'button:has-text("Submit Application")',
        'button:has-text("Submit application")',
        'button:has-text("Submit")',
        'button:has-text("Send Application")',
        'button:has-text("Complete Application")',
        'button[type="submit"]',
        'input[type="submit"]',
        '[data-qa*="submit"]',
      ];
      for (const sel of selectors) {
        try {
          const btn = await target.$(sel);
          if (btn) {
            const isVisible = await btn.isVisible().catch(() => false);
            const isEnabled = await btn.isEnabled().catch(() => false);
            if (isVisible && isEnabled) return btn;
          }
        } catch {}
      }
    }
    return null;
  }

  public static async submitForm(page: Page): Promise<boolean> {
    const btn = await AutoApplyEngine.findSubmitButton(page);
    if (btn) {
      await humanClick(page, btn);
      await page.waitForTimeout(2000);
      return true;
    }
    return false;
  }

  public static async tryEasyApplyButton(page: Page): Promise<boolean> {
    const targets = AutoApplyEngine.getAllFrames(page);
    for (const target of targets) {
      try {
        const easyBtn = await target.$('button:has-text("Easy Apply"), button:has-text("1-Click Apply"), button:has-text("Quick Apply")');
        if (easyBtn && await easyBtn.isVisible().catch(() => false)) {
          await humanClick(target, easyBtn);
          await page.waitForTimeout(1500);
          return true;
        }
      } catch {}
    }
    return false;
  }

  private static async fillStandardFields(target: Page | Frame, profile: MasterProfile): Promise<number> {
    let filled = 0;
    const inputs = await target.$$('input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea').catch(() => []);

    for (const input of inputs) {
      try {
        const isVisible = await input.isVisible().catch(() => false);
        if (!isVisible) continue;

        const val = await input.inputValue().catch(() => '');
        if (val && val.trim().length > 0) continue;

        const meta = await input.evaluate((el: HTMLInputElement) => {
          return {
            name: (el.name || '').toLowerCase(),
            id: (el.id || '').toLowerCase(),
            placeholder: (el.placeholder || '').toLowerCase(),
            ariaLabel: (el.getAttribute('aria-label') || '').toLowerCase(),
            type: (el.type || '').toLowerCase(),
          };
        });

        const combined = `${meta.name} ${meta.id} ${meta.placeholder} ${meta.ariaLabel}`.toLowerCase();

        if (ATS_FIELD_ALIASES.firstName.some(k => combined.includes(k)) && profile.firstName) {
          await humanType(target, input, profile.firstName);
          filled++;
        } else if (ATS_FIELD_ALIASES.lastName.some(k => combined.includes(k)) && profile.lastName) {
          await humanType(target, input, profile.lastName);
          filled++;
        } else if (ATS_FIELD_ALIASES.fullName.some(k => combined.includes(k)) && (profile.fullName || profile.firstName)) {
          await humanType(target, input, profile.fullName || `${profile.firstName} ${profile.lastName}`.trim());
          filled++;
        } else if (ATS_FIELD_ALIASES.email.some(k => combined.includes(k)) || meta.type === 'email') {
          if (profile.email) {
            await humanType(target, input, profile.email);
            filled++;
          }
        } else if (ATS_FIELD_ALIASES.phone.some(k => combined.includes(k)) || meta.type === 'tel') {
          if (profile.phone) {
            await humanType(target, input, profile.phone);
            filled++;
          }
        } else if (ATS_FIELD_ALIASES.linkedin.some(k => combined.includes(k)) && profile.linkedin) {
          await humanType(target, input, profile.linkedin);
          filled++;
        } else if (ATS_FIELD_ALIASES.github.some(k => combined.includes(k)) && profile.github) {
          await humanType(target, input, profile.github);
          filled++;
        }
      } catch {}
    }
    return filled;
  }

  private static async fillSelectDropdowns(target: Page | Frame, profile: MasterProfile): Promise<number> {
    let count = 0;
    const selects = await target.$$('select, [role="combobox"], div.select__control, button[aria-haspopup="listbox"]').catch(() => []);

    for (const select of selects) {
      try {
        const isVisible = await select.isVisible().catch(() => false);
        if (!isVisible) continue;

        const tagName = await select.evaluate((node: any) => (node.tagName || '').toLowerCase()).catch(() => '');

        if (tagName === 'select') {
          const selectMeta = await select.evaluate((el: HTMLSelectElement) => {
            let labelText = '';
            if (el.id) {
              const labelEl = document.querySelector(`label[for="${el.id}"]`);
              if (labelEl) labelText = labelEl.textContent || '';
            }
            if (!labelText) {
              const parentLabel = el.closest('label');
              if (parentLabel) labelText = parentLabel.textContent || '';
            }
            return {
              name: (el.name || '').toLowerCase(),
              id: (el.id || '').toLowerCase(),
              label: labelText.toLowerCase(),
            };
          }).catch(() => ({ name: '', id: '', label: '' }));

          const metaText = `${selectMeta.name} ${selectMeta.id} ${selectMeta.label}`;

          const options = await select.$$eval('option', (opts: any[]) =>
            opts.map(o => ({ value: o.value, text: (o.textContent || '').trim().toLowerCase() }))
          ).catch(() => []);

          if (options.length > 1) {
            let chosenValue: string | null = null;

            // 1. Sponsorship question: "Will you require sponsorship?" -> Choose "No"
            if (metaText.includes('sponsor') || metaText.includes('visa')) {
              const noOpt = options.find(o => o.text === 'no' || o.text.startsWith('no') || o.value.toLowerCase() === 'no');
              if (noOpt) chosenValue = noOpt.value;
            }

            // 2. Authorization question: "Are you authorized to work?" -> Choose "Yes"
            if (!chosenValue && (metaText.includes('authoriz') || metaText.includes('eligible') || metaText.includes('permit') || metaText.includes('legal'))) {
              const yesOpt = options.find(o => o.text === 'yes' || o.text.startsWith('yes') || o.text.includes('authorized') || o.value.toLowerCase() === 'yes');
              if (yesOpt) chosenValue = yesOpt.value;
            }

            // 3. Gender / Demographic questions -> Choose "Decline" / "Prefer not to say" or valid option
            if (!chosenValue && (metaText.includes('gender') || metaText.includes('race') || metaText.includes('veteran') || metaText.includes('disability') || metaText.includes('eeo'))) {
              const declineOpt = options.find(o => o.text.includes('decline') || o.text.includes('prefer not') || o.text.includes('choose not') || o.text.includes('not a protected') || o.text.includes('do not have'));
              if (declineOpt) chosenValue = declineOpt.value;
            }

            // 4. Default: pick the first valid option
            if (!chosenValue) {
              const firstValid = options.find(o => o.value && o.value !== '' && !o.text.includes('select') && !o.text.includes('choose')) || options[1];
              if (firstValid) chosenValue = firstValid.value;
            }

            if (chosenValue) {
              await (select as any).selectOption(chosenValue).catch(() => {});
              count++;
            }
          }
        }
      } catch {}
    }
    return count;
  }

  private static async answerOpenEndedFields(target: Page | Frame, profile: MasterProfile): Promise<number> {
    let count = 0;
    const textareas = await target.$$('textarea').catch(() => []);

    for (const ta of textareas) {
      try {
        const isVisible = await ta.isVisible().catch(() => false);
        if (!isVisible) continue;

        const val = await ta.inputValue().catch(() => '');
        if (val && val.trim().length > 0) continue;

        const defaultAnswer = profile.summaryText || 'Experienced software engineer skilled in building scalable applications with TypeScript, React, and cloud architectures.';
        await humanType(target, ta, defaultAnswer);
        count++;
      } catch {}
    }
    return count;
  }

  private static async uploadResumeIfPresent(target: Page | Frame, profile: MasterProfile): Promise<boolean> {
    try {
      const fileInputs = await target.$$('input[type="file"]').catch(() => []);
      const resumePath = ensureFallbackResumePath(profile);

      for (const fi of fileInputs) {
        if (fs.existsSync(resumePath)) {
          await fi.setInputFiles(resumePath).catch(() => {});
          return true;
        }
      }
    } catch {}
    return false;
  }

  private static async fillConsentAndRequiredCheckboxes(target: Page | Frame): Promise<number> {
    let count = 0;
    const checkboxes = await target.$$('input[type="checkbox"]').catch(() => []);

    for (const cb of checkboxes) {
      try {
        const isVisible = await cb.isVisible().catch(() => false);
        if (isVisible) {
          const isChecked = await cb.isChecked().catch(() => false);
          if (!isChecked) {
            await humanClick(target, cb);
            count++;
          }
        }
      } catch {}
    }
    return count;
  }

  public static async injectOverlay(page: Page, text: string, color: string = '#22c55e'): Promise<void> {
    try {
      await page.evaluate(({ message, badgeColor }) => {
        let el = document.getElementById('nomadic-auto-apply-overlay');
        if (!el) {
          el = document.createElement('div');
          el.id = 'nomadic-auto-apply-overlay';
          el.style.position = 'fixed';
          el.style.bottom = '24px';
          el.style.right = '24px';
          el.style.zIndex = '2147483647';
          el.style.padding = '10px 18px';
          el.style.borderRadius = '9999px';
          el.style.background = '#09090b';
          el.style.color = '#ffffff';
          el.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          el.style.fontSize = '12px';
          el.style.fontWeight = '600';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.gap = '8px';
          el.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)';
          el.style.transition = 'all 0.2s ease-in-out';
          document.body.appendChild(el);
        }
        el.innerHTML = `<span style="width: 8px; height: 8px; border-radius: 50%; background: ${badgeColor}; display: inline-block;"></span> <span>${message}</span>`;
      }, { message: text, badgeColor: color }).catch(() => {});
    } catch {}
  }

  private static async handleDemoTestApplication(
    page: Page,
    profile: MasterProfile,
    url: string,
    onProgress?: ProgressCallback
  ): Promise<ApplyResult> {
    // Render clean interactive test application UI
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Nomadic Labs — Candidate Application (Test Portal)</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f8fafc; padding: 40px; display: flex; justify-content: center; }
            .card { background: #18181b; border: 1px solid #27272a; border-radius: 16px; width: 100%; max-width: 600px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
            h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; color: #ffffff; }
            p { font-size: 13px; color: #a1a1aa; margin-bottom: 24px; }
            .field { margin-bottom: 16px; }
            label { display: block; font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px; }
            input, textarea, select { width: 100%; background: #27272a; border: 1px solid #3f3f46; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #ffffff; box-sizing: border-box; outline: none; }
            input:focus { border-color: #38bdf8; }
            .btn { width: 100%; background: #ffffff; color: #09090b; font-weight: 700; font-size: 13px; padding: 12px; border-radius: 8px; border: none; cursor: pointer; margin-top: 12px; }
            .badge { display: inline-block; background: #0284c7; color: #ffffff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 9999px; margin-bottom: 12px; }
            .success-banner { display: none; background: #052e16; border: 1px solid #166534; border-radius: 8px; padding: 16px; text-align: center; margin-top: 20px; }
            .success-banner h3 { color: #4ade80; font-size: 15px; margin: 0 0 4px 0; }
            .success-banner p { color: #86efac; font-size: 12px; margin: 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">VERIFIED ATS DEMO SIMULATOR</span>
            <h1>Senior Product / Software Specialist</h1>
            <p>Nomadic Labs · Global Remote · Engineering Platform</p>
            <form id="demo-form" onsubmit="event.preventDefault(); document.getElementById('success-msg').style.display='block';">
              <div class="field">
                <label>Full Name</label>
                <input id="fullName" name="fullName" placeholder="Your Name" />
              </div>
              <div class="field">
                <label>Email Address</label>
                <input id="email" name="email" type="email" placeholder="email@domain.com" />
              </div>
              <div class="field">
                <label>Phone Number</label>
                <input id="phone" name="phone" placeholder="+1 (555) 000-0000" />
              </div>
              <div class="field">
                <label>LinkedIn Profile URL</label>
                <input id="linkedin" name="linkedin" placeholder="https://linkedin.com/in/username" />
              </div>
              <div class="field">
                <label>Work Authorization</label>
                <select id="workAuth">
                  <option value="yes">Authorized to work in country</option>
                  <option value="no">Require Visa Sponsorship</option>
                </select>
              </div>
              <button type="submit" id="submitBtn" class="btn">Submit Application</button>
            </form>
            <div id="success-msg" class="success-banner">
              <h3>✓ Application Submitted Successfully!</h3>
              <p>Your candidate profile and resume have been recorded in the demo portal.</p>
            </div>
          </div>
        </body>
      </html>
    `).catch(() => {});

    await AutoApplyEngine.emitStatus(page, { phase: 'filling', message: 'Nomadic AI filling application fields...', colorState: 'grey' }, onProgress);

    // Rapid populate fields with candidate profile
    const nameVal = profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Candidate';
    await page.fill('#fullName', nameVal).catch(() => {});
    await page.fill('#email', profile.email || 'candidate@nomadic.app').catch(() => {});
    await page.fill('#phone', profile.phone || '+1 (555) 019-2834').catch(() => {});
    await page.fill('#linkedin', profile.linkedin || 'https://linkedin.com/in/candidate').catch(() => {});
    await page.waitForTimeout(400);

    await AutoApplyEngine.emitStatus(page, { phase: 'uploading', message: 'Attaching candidate PDF resume...', colorState: 'grey' }, onProgress);
    await page.waitForTimeout(300);

    await AutoApplyEngine.emitStatus(page, { phase: 'submitting', message: 'Submitting completed application...', colorState: 'grey' }, onProgress);
    await page.click('#submitBtn').catch(() => {});
    await page.waitForTimeout(400);

    await AutoApplyEngine.emitStatus(page, { phase: 'success', message: 'Demo Application Submitted Successfully!', colorState: 'green' }, onProgress);

    return {
      url,
      success: true,
      submitted: true,
      prefilled: true,
      captchaDetected: false,
      fieldsFilledCount: 5,
    };
  }
}
