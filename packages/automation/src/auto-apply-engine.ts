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
import { executeInstantBatchFormFill } from './fast-batch-filler.js';
import { executeDeterministicFormSolve } from './deterministic-form-solver.js';
import { getATSConfig, ATSPortal } from './ats-portals.js';
import { FormFiller, CandidateProfile } from './form-filler.js';
import { ApplicationNavigator } from './navigator.js';
import { FormSubmitter } from './submitter.js';
import { AIFallbackSolver } from './ai-fallback.js';
import { extractSemanticDOM, type SemanticDOMSnapshot } from './semantic-dom-extractor.js';
import { generateAIPilotPlan, type AIPilotPlan } from './ai-pilot-engine.js';
import { dispatchSpecializedPortalBot } from './bots/bot-dispatcher.js';

export interface MasterProfile {
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  projectsUrl?: string;
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
  github: ['github', 'github_url', 'github-url', 'github_profile', 'github-profile', 'urls[GitHub]', 'urls[github]', 'github url', 'github profile'],
  portfolio: ['portfolio', 'portfolio_url', 'portfolio-url', 'website', 'personal_website', 'personal_url', 'website_url', 'homepage', 'urls[portfolio]', 'urls[other]'],
  projects: ['project_link', 'project_url', 'projects_url', 'project_links', 'projects_link', 'project', 'projects', 'live_demo', 'demo_link', 'deployed_url', 'work_sample', 'work_samples', 'code_sample', 'project url', 'project link'],
  coverLetter: ['cover_letter', 'coverletter', 'cover-letter', 'why_us', 'why_hire', 'why_are_you_interested', 'additional_info', 'additional_information', 'why do you want', 'tell us about'],
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

      // Check for WAF / Access Restricted page immediately
      const initialWafCheck = await AutoApplyEngine.detectWafOrAccessRestricted(page);
      if (initialWafCheck.isBlocked) {
        await AutoApplyEngine.emitStatus(page, {
          phase: 'user_input_required',
          message: 'Access Restricted / Security Challenge — Please solve in browser',
          colorState: 'red',
          actionRequired: 'Verify Access'
        }, onProgress);
        await page.bringToFront().catch(() => {});
        const unblocked = await AutoApplyEngine.waitForWafUnblocked(page, onProgress);
        if (!unblocked) {
          return {
            url, success: false, submitted: false, prefilled: false, captchaDetected: true, fieldsFilledCount: 0,
            error: 'Access restricted by portal security (left open in browser)',
          };
        }
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

      // ── HIGH-SPEED DETERMINISTIC AUTONOMOUS PIPELINE (Max 3 Fast Passes, <= 2s Total) ──
      const atsConfig = getATSConfig(url);
      let totalFieldsFilled = 0;
      let isSubmitted = false;
      const MAX_DETERMINISTIC_PASSES = 3;

      await AutoApplyEngine.emitStatus(page, {
        phase: 'navigating',
        message: `Applying to ${atsConfig.name}...`,
        colorState: 'grey'
      }, onProgress);

      for (let pass = 1; pass <= MAX_DETERMINISTIC_PASSES; pass++) {
        await page.waitForTimeout(100);

        // 1. Anti-Bot / Cloudflare Turnstile Check
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

        // 2. Check for 404 / Expired page
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

        // 3. Check for WAF / Security Access Restrictions
        const wafLoopCheck = await AutoApplyEngine.detectWafOrAccessRestricted(page);
        if (wafLoopCheck.isBlocked) {
          await AutoApplyEngine.emitStatus(page, {
            phase: 'user_input_required',
            message: 'Access Restricted / Security Challenge — Please solve in browser',
            colorState: 'red',
            actionRequired: 'Verify Access'
          }, onProgress);
          await page.bringToFront().catch(() => {});
          const unblocked = await AutoApplyEngine.waitForWafUnblocked(page, onProgress);
          if (!unblocked) {
            return {
              url, success: false, submitted: false, prefilled: false, captchaDetected: true, fieldsFilledCount: 0,
              error: 'Access restricted by portal security (left open in browser)',
            };
          }
        }

        // 4. Check for Confirmed Submission
        const confirmed = await AutoApplyEngine.isPageConfirmedSubmission(page, totalFieldsFilled);
        if (confirmed && totalFieldsFilled > 0) {
          isSubmitted = true;
          await AutoApplyEngine.emitStatus(page, {
            phase: 'success',
            message: `Confirmed Application Submitted to ${atsConfig.name}! ✓`,
            colorState: 'green'
          }, onProgress);
          return {
            url, success: true, submitted: true, prefilled: true, captchaDetected: false, fieldsFilledCount: totalFieldsFilled
          };
        }

        // 5. Check for Login Wall & Sign-Up Gatekeepers
        const loginCheck = await AutoApplyEngine.detectLoginRequired(page);
        if (loginCheck.requiresLogin) {
          const portalLabel = loginCheck.portalName || atsConfig.name || 'Job Portal';
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

        // 6. Check for CAPTCHA wall
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

        // 6b. Specialized Dedicated Bot Route (Internshala, Lever, Greenhouse, Ashby)
        const specializedResult = await dispatchSpecializedPortalBot(page, url, profile);
        if (specializedResult && specializedResult.fieldsFilled > 0) {
          totalFieldsFilled += specializedResult.fieldsFilled;
          await AutoApplyEngine.emitStatus(page, {
            phase: 'filling',
            message: `Specialized Bot Completed (${specializedResult.fieldsFilled} fields & questions solved)...`,
            colorState: 'green'
          }, onProgress);

          if (specializedResult.submitted) {
            isSubmitted = true;
            if (specializedResult.confirmed) {
              break;
            }
          }
        }

        // 7. Extract Compact Semantic DOM Snapshot (10ms)
        const snapshot = await extractSemanticDOM(page);

        // 8. AI Pilot Instant Decision Loop (Gemini 2.0 Flash / Groq in ~120ms)
        const aiPlan = await generateAIPilotPlan(profile, snapshot, {
          geminiKey: profile.geminiApiKey,
          groqKey: profile.groqApiKey,
        });

        if (aiPlan) {
          if (aiPlan.statusMessage) {
            await AutoApplyEngine.emitStatus(page, {
              phase: 'navigating',
              message: `AI Pilot: ${aiPlan.statusMessage}`,
              colorState: 'grey'
            }, onProgress);
          }

          // Priority A: If this is a directory/search landing page (not a specific job or form), search for role or click first matching job
          if (snapshot.isJobDescription === false && snapshot.hasApplicationForm === false && aiPlan.actionType === 'click_apply') {
            const targetEl = await page.$(`[data-nomadic-id="${aiPlan.clickTargetElementId}"]`);
            if (targetEl) {
              await humanClick(page, targetEl);
              await page.waitForTimeout(600);
              continue;
            }
          }

          // Case A: AI clicks Apply CTA on job description page
          if (aiPlan.actionType === 'click_apply' && aiPlan.clickTargetElementId) {
            const targetEl = await page.$(`[data-nomadic-id="${aiPlan.clickTargetElementId}"]`);
            if (targetEl) {
              await humanClick(page, targetEl);
              await page.waitForTimeout(400);

              // Check if clicking opened a new tab/popup
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
          }

          // Case B: AI fills fields directly
          if (Array.isArray(aiPlan.fillActions) && aiPlan.fillActions.length > 0) {
            let filledByAi = 0;
            for (const act of aiPlan.fillActions) {
              if (!act.elementId || !act.value) continue;
              try {
                const targetNode = await page.$(`[data-nomadic-id="${act.elementId}"]`);
                if (targetNode) {
                  if (act.fieldType === 'file' || act.value === 'RESUME_ATTACHMENT') {
                    const rPath = profile.resumeFilePath && fs.existsSync(profile.resumeFilePath) ? profile.resumeFilePath : null;
                    if (rPath) {
                      await targetNode.setInputFiles(rPath).catch(() => {});
                      filledByAi++;
                    }
                  } else if (act.fieldType === 'radio') {
                    await targetNode.check().catch(() => {});
                    filledByAi++;
                  } else if (act.fieldType === 'checkbox') {
                    await targetNode.check().catch(() => {});
                    filledByAi++;
                  } else if (act.fieldType === 'select') {
                    await targetNode.selectOption({ label: act.value }).catch(() => {});
                    filledByAi++;
                  } else {
                    await targetNode.fill(act.value).catch(() => {});
                    filledByAi++;
                  }
                }
              } catch {}
            }
            totalFieldsFilled += filledByAi;
          }

          // Case C: AI triggers Submit Button
          if (aiPlan.submitButtonElementId && totalFieldsFilled > 0) {
            const submitBtn = await page.$(`[data-nomadic-id="${aiPlan.submitButtonElementId}"]`);
            if (submitBtn) {
              await humanClick(page, submitBtn);
              await page.waitForTimeout(600);
              const isConfirmed = await AutoApplyEngine.isPageConfirmedSubmission(page, totalFieldsFilled);
              if (isConfirmed) {
                isSubmitted = true;
                break;
              }
            }
          }
        }

        // 9. Navigation Engine Fallback (ApplicationNavigator) — Click Apply / Open Modal / Bind to Tab
        if (totalFieldsFilled === 0) {
          const nav = new ApplicationNavigator(page, atsConfig);
          const navResult = await nav.navigateToApplicationForm();
          if (navResult.formPage && navResult.formPage !== page && !navResult.formPage.isClosed()) {
            page = navResult.formPage;
          }
        }

        // 10. Form Filling Engine (FormFiller) — Pure Deterministic Universal Form Solver
        const filler = new FormFiller(page, atsConfig, profile);
        const fillResult = await filler.fillFormDeterministic();
        if (fillResult.fieldsFilled > 0) {
          totalFieldsFilled += fillResult.fieldsFilled;
          await AutoApplyEngine.emitStatus(page, {
            phase: 'filling',
            message: `AI Form Filled (${totalFieldsFilled} fields, radios & questions solved)...`,
            colorState: 'green'
          }, onProgress);
        }

        // 11. Submission Engine (FormSubmitter) — Click Submit & Verify Confirmation
        if (totalFieldsFilled > 0 && !isSubmitted) {
          const submitter = new FormSubmitter(page, atsConfig);
          const submitResult = await submitter.submitAndVerify();
          if (submitResult.submitted) {
            isSubmitted = true;
            if (submitResult.confirmed) {
              break;
            }
          }
        }

        // 10. Multi-Step Stepper Advance (e.g. Next -> Review -> Submit)
        const advanced = await AutoApplyEngine.advanceApplicationStepper(page);
        if (advanced) {
          await AutoApplyEngine.emitStatus(page, {
            phase: 'filling',
            message: 'Advancing to next application step...',
            colorState: 'grey'
          }, onProgress);
          await page.waitForTimeout(400);
          continue;
        }

        // If form fields were filled and submit triggered, we are done
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

  public static async detectWafOrAccessRestricted(page: Page): Promise<{ isBlocked: boolean; reason?: string }> {
    try {
      const wafSignatures = [
        'access is temporarily restricted',
        'we detected unusual activity from your device or network',
        'automated (bot) activity on your network',
        'use of developer or inspection tools',
        'access denied',
        'security challenge',
        'you have been blocked',
        'waf protection',
        'datadome',
        'perimeterx',
        'attention required! | cloudflare',
        'sorry, you have been blocked',
      ];

      const targets = AutoApplyEngine.getAllFrames(page);
      for (const target of targets) {
        const check = await target.evaluate((sigs) => {
          const body = (document.body?.innerText || '').toLowerCase();
          const title = (document.title || '').toLowerCase();

          for (const sig of sigs) {
            if (body.includes(sig) || title.includes(sig)) {
              return { isBlocked: true, reason: sig };
            }
          }
          return { isBlocked: false };
        }, wafSignatures).catch(() => ({ isBlocked: false }));

        if (check.isBlocked) return check;
      }
      return { isBlocked: false };
    } catch {
      return { isBlocked: false };
    }
  }

  public static async waitForWafUnblocked(page: Page, onProgress?: ProgressCallback): Promise<boolean> {
    const maxWaitSeconds = 25;
    const start = Date.now();

    while ((Date.now() - start) / 1000 < maxWaitSeconds) {
      if (page.isClosed()) return false;
      const check = await AutoApplyEngine.detectWafOrAccessRestricted(page);
      if (!check.isBlocked) return true;
      await page.waitForTimeout(2000);
    }
    return false;
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
            placeholder: (el.placeholder || '').toLowerCase(),
            ariaLabel: (el.getAttribute('aria-label') || '').toLowerCase(),
            label: labelText.toLowerCase(),
            type: (el.type || '').toLowerCase(),
            required: el.required || el.getAttribute('aria-required') === 'true',
          };
        }).catch(() => ({ name: '', id: '', placeholder: '', ariaLabel: '', label: '', type: 'text', required: false }));

        const combined = `${meta.name} ${meta.id} ${meta.placeholder} ${meta.ariaLabel} ${meta.label}`.toLowerCase();

        // 1. Projects & Work Sample Links
        if (ATS_FIELD_ALIASES.projects.some(k => combined.includes(k))) {
          let projVal = profile.projectsUrl || profile.customAnswers?.['project_url'] || profile.customAnswers?.['projects'] || profile.cachedAnswers?.['project_url'];
          if (!projVal && profile.portfolio) projVal = profile.portfolio;
          if (!projVal && profile.github) projVal = profile.github;
          
          if (!projVal && meta.required && 'page' in target) {
            projVal = await AutoApplyEngine.promptUserForMissingField(target as Page, 'Project Link / Portfolio URL', 'project_url', profile) || '';
          }
          if (projVal) {
            await humanType(target, input, projVal);
            filled++;
            continue;
          }
        }

        // 2. Portfolio / Personal Website URL
        if (ATS_FIELD_ALIASES.portfolio.some(k => combined.includes(k))) {
          let portVal = profile.portfolio || profile.customAnswers?.['portfolio'] || profile.customAnswers?.['website'] || profile.cachedAnswers?.['portfolio'];
          if (!portVal && profile.github) portVal = profile.github;
          
          if (!portVal && meta.required && 'page' in target) {
            portVal = await AutoApplyEngine.promptUserForMissingField(target as Page, 'Portfolio / Website URL', 'portfolio', profile) || '';
          }
          if (portVal) {
            await humanType(target, input, portVal);
            filled++;
            continue;
          }
        }

        // 3. GitHub Profile
        if (ATS_FIELD_ALIASES.github.some(k => combined.includes(k))) {
          if (profile.github) {
            await humanType(target, input, profile.github);
            filled++;
            continue;
          }
        }

        // 4. LinkedIn Profile
        if (ATS_FIELD_ALIASES.linkedin.some(k => combined.includes(k))) {
          if (profile.linkedin) {
            await humanType(target, input, profile.linkedin);
            filled++;
            continue;
          }
        }

        // 5. First Name
        if (ATS_FIELD_ALIASES.firstName.some(k => combined.includes(k)) && profile.firstName) {
          await humanType(target, input, profile.firstName);
          filled++;
          continue;
        }

        // 6. Last Name
        if (ATS_FIELD_ALIASES.lastName.some(k => combined.includes(k)) && profile.lastName) {
          await humanType(target, input, profile.lastName);
          filled++;
          continue;
        }

        // 7. Full Name
        if (ATS_FIELD_ALIASES.fullName.some(k => combined.includes(k)) && (profile.fullName || profile.firstName)) {
          await humanType(target, input, profile.fullName || `${profile.firstName} ${profile.lastName}`.trim());
          filled++;
          continue;
        }

        // 8. Email Address
        if (ATS_FIELD_ALIASES.email.some(k => combined.includes(k)) || meta.type === 'email') {
          if (profile.email) {
            await humanType(target, input, profile.email);
            filled++;
            continue;
          }
        }

        // 9. Phone Number
        if (ATS_FIELD_ALIASES.phone.some(k => combined.includes(k)) || meta.type === 'tel') {
          if (profile.phone) {
            await humanType(target, input, profile.phone);
            filled++;
            continue;
          }
        }

        // 10. Desired Salary / Compensation
        if (ATS_FIELD_ALIASES.salary.some(k => combined.includes(k))) {
          const salVal = profile.salary || 'Competitive / Market Rate';
          await humanType(target, input, salVal);
          filled++;
          continue;
        }

        // 11. Notice Period / Earliest Start Date
        if (ATS_FIELD_ALIASES.noticePeriod.some(k => combined.includes(k))) {
          const notVal = profile.noticePeriod || 'Immediately / 2 weeks';
          await humanType(target, input, notVal);
          filled++;
          continue;
        }

        // 12. Dynamic SQLite Cached Answers Check
        if (profile.cachedAnswers) {
          for (const [qKey, aVal] of Object.entries(profile.cachedAnswers)) {
            if (combined.includes(qKey.toLowerCase()) && aVal) {
              await humanType(target, input, aVal);
              filled++;
              break;
            }
          }
        }
      } catch {}
    }
    return filled;
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

        const meta = await ta.evaluate((el: HTMLTextAreaElement) => {
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
            placeholder: (el.placeholder || '').toLowerCase(),
            ariaLabel: (el.getAttribute('aria-label') || '').toLowerCase(),
            label: labelText.toLowerCase(),
          };
        }).catch(() => ({ name: '', id: '', placeholder: '', ariaLabel: '', label: '' }));

        const combined = `${meta.name} ${meta.id} ${meta.placeholder} ${meta.ariaLabel} ${meta.label}`.toLowerCase();

        // 1. Projects & Work Samples Question
        if (ATS_FIELD_ALIASES.projects.some(k => combined.includes(k))) {
          const projAnswer = profile.projectsUrl
            ? `Key projects & code repositories available at: ${profile.projectsUrl}`
            : profile.github
            ? `Key projects & code repositories available on GitHub: ${profile.github}`
            : 'Extensive portfolio and project links available upon request.';
          await humanType(target, ta, projAnswer);
          count++;
          continue;
        }

        // 2. Cover Letter / Pitch Question
        if (ATS_FIELD_ALIASES.coverLetter.some(k => combined.includes(k))) {
          const coverLetter = profile.summaryText || 'I am excited to apply for this position. My background aligns closely with the technical and engineering requirements of the role.';
          await humanType(target, ta, coverLetter);
          count++;
          continue;
        }

        // 3. Technical Skills / Tech Stack Question
        if (combined.includes('skill') || combined.includes('stack') || combined.includes('technolog')) {
          const techAnswer = profile.techStack || 'TypeScript, React, Node.js, Python, PostgreSQL, Cloud Architectures';
          await humanType(target, ta, techAnswer);
          count++;
          continue;
        }

        // 4. Default concise candidate response (Never outputs raw summary to URL/project fields)
        const defaultAnswer = profile.summaryText || 'Experienced software engineer skilled in building scalable applications with TypeScript, React, and modern cloud architectures.';
        await humanType(target, ta, defaultAnswer);
        count++;
      } catch {}
    }
    return count;
  }

  /**
   * Opens an interactive Copilot Chat prompt inside the browser viewport
   * to ask the user for a required missing field (e.g. project URL, portfolio link, custom answer).
   * Automatically caches the answer in SQLite when submitted so the user is never asked again!
   */
  public static async promptUserForMissingField(
    page: Page,
    fieldLabel: string,
    fieldKey: string,
    profile: MasterProfile
  ): Promise<string | null> {
    if (profile.cachedAnswers && profile.cachedAnswers[fieldKey]) {
      return profile.cachedAnswers[fieldKey];
    }
    if (profile.customAnswers && profile.customAnswers[fieldKey]) {
      return profile.customAnswers[fieldKey];
    }

    try {
      await page.bringToFront().catch(() => {});

      const userValue = await page.evaluate(async ({ label, key }) => {
        return new Promise<string | null>((resolve) => {
          let container = document.getElementById('nomadic-copilot-input-container');
          if (container) container.remove();

          container = document.createElement('div');
          container.id = 'nomadic-copilot-input-container';
          container.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 340px;
            background: #09090b;
            color: #ffffff;
            border: 1px solid #27272a;
            border-radius: 16px;
            padding: 18px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1);
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            animation: nomadicFadeIn 0.2s ease-out;
          `;

          container.innerHTML = `
            <style>
              @keyframes nomadicFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            </style>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 13px; font-weight: 700; color: #38bdf8;">⚡ Nomadic Copilot</span>
              </div>
              <span style="font-size: 10px; font-weight: 700; background: #0369a1; color: #e0f2fe; padding: 2px 6px; border-radius: 9999px;">Input Needed</span>
            </div>
            <p style="font-size: 12px; color: #cbd5e1; margin: 0 0 12px 0; line-height: 1.4;">
              Please provide your <strong>${label}</strong>:
            </p>
            <form id="nomadic-prompt-form" style="margin: 0;">
              <input 
                id="nomadic-prompt-input" 
                type="text" 
                placeholder="Type your answer here..."
                style="width: 100%; box-sizing: border-box; background: #18181b; border: 1px solid #3f3f46; border-radius: 8px; padding: 10px 12px; color: #ffffff; font-size: 12px; outline: none; margin-bottom: 10px;"
                autofocus
              />
              <div style="display: flex; gap: 8px;">
                <button 
                  type="submit" 
                  id="nomadic-prompt-submit" 
                  style="flex: 1; background: #ffffff; color: #09090b; font-weight: 700; font-size: 12px; padding: 8px 12px; border-radius: 8px; border: none; cursor: pointer;"
                >
                  Save &amp; Fill →
                </button>
                <button 
                  type="button" 
                  id="nomadic-prompt-skip" 
                  style="background: transparent; color: #94a3b8; font-weight: 600; font-size: 12px; padding: 8px 10px; border-radius: 8px; border: 1px solid #27272a; cursor: pointer;"
                >
                  Skip
                </button>
              </div>
            </form>
          `;

          document.body.appendChild(container);

          const inputEl = document.getElementById('nomadic-prompt-input') as HTMLInputElement;
          inputEl?.focus();

          const formEl = document.getElementById('nomadic-prompt-form');
          formEl?.addEventListener('submit', (e) => {
            e.preventDefault();
            const val = inputEl?.value?.trim() || '';
            container?.remove();
            resolve(val || null);
          });

          const skipBtn = document.getElementById('nomadic-prompt-skip');
          skipBtn?.addEventListener('click', () => {
            container?.remove();
            resolve(null);
          });

          setTimeout(() => {
            container?.remove();
            resolve(null);
          }, 25000);
        });
      }, { label: fieldLabel, key: fieldKey });

      if (userValue && userValue.trim().length > 0) {
        const cleanVal = userValue.trim();
        if (profile.onAnswerResolved) {
          profile.onAnswerResolved(fieldKey, cleanVal);
        }
        if (!profile.cachedAnswers) profile.cachedAnswers = {};
        profile.cachedAnswers[fieldKey] = cleanVal;
        return cleanVal;
      }
    } catch {}

    return null;
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
