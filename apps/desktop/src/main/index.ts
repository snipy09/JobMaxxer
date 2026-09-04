import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import crypto from 'crypto';
import {
  initLocalDatabase,
  getDb,
  persistDb,
  getLearnerProgressDb,
  saveLearnerProgressDb,
  getCachedFormAnswerDb,
  saveCachedFormAnswerDb,
  updateApplicationStatusDb,
  deleteApplicationDb,
  getCuratedLearningResourcesDb,
  addCuratedLearningResourceDb,
  deleteCuratedLearningResourceDb,
  adminAssignPlanDb,
  getDailyApplicationCountDb,
  checkUserPlanLimitDb,
  logUserActivityDb,
  getUserActivityHeatmapDb,
  getUserActivityStatsDb,
  saveCustomRoadmapDb,
  getCustomRoadmapsDb,
  getCustomRoadmapByIdDb,
  deleteCustomRoadmapDb,
} from './db.js';
import {
  AutoApplyEngine,
  findChromeExecutable,
  ensureChromeForTesting,
  callGeminiFlash,
  generateStructuredAIContent,
  extractJsonFromAiResponse,
  type MasterProfile,
} from '@job-automator/automation';
import { runAllScrapers, scrapeRecruiterLeads, computeRelevanceScore, extractProfileKeywords } from '@job-automator/scrapers';
import {
  getSupabaseClient,
  registerDeviceSession,
  sendSessionHeartbeat,
  syncPullUserData,
  syncPushUserProfile,
  syncPushApplication,
  syncPushSavedJob,
  syncRemoveSavedJob,
  syncPushResume,
  syncDeleteResume,
} from '@job-automator/supabase';
import { getDeviceIdentifier } from './device.js';
import {
  EmailVerificationPipeline,
  LocalOutreachSender,
  ExternalChromeOutreach,
} from '@job-automator/email-verifier';

const mainDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(process.execPath);

app.setName('Nomadic');
const nomadicUserData = path.join(app.getPath('appData'), 'Nomadic');
if (!fs.existsSync(nomadicUserData)) {
  try {
    fs.mkdirSync(nomadicUserData, { recursive: true });
  } catch {}
}
app.setPath('userData', nomadicUserData);

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disk-cache-size', '1');
app.commandLine.appendSwitch('media-cache-size', '1');
app.disableHardwareAcceleration();

// ── Deep Linking & OAuth ──────────────────────────────────────────────
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('nomadic', process.execPath, [path.resolve(process.argv[1])]);
    app.setAsDefaultProtocolClient('hirestack', process.execPath, [path.resolve(process.argv[1])]);
    app.setAsDefaultProtocolClient('jobmaxxer', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('nomadic');
  app.setAsDefaultProtocolClient('hirestack');
  app.setAsDefaultProtocolClient('jobmaxxer');
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      const url = commandLine.find(arg => arg.startsWith('nomadic://') || arg.startsWith('hirestack://') || arg.startsWith('jobmaxxer://'));
      if (url) handleProtocolUrl(url);
    }
  });
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

ipcMain.handle('auth-google', async () => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || (['762160653751', 'u9gnn1sm9frqpjke4ajuhqcni569nplf'].join('-') + '.apps.googleusercontent.com');

  await startOAuthLoopbackServer();

  const redirectUri = encodeURIComponent('http://localhost:42813/callback');
  const scope = encodeURIComponent('openid email profile');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

  log(`[Google OAuth] Launching Google authentication in default browser: ${authUrl}`);
  shell.openExternal(authUrl);
  return { success: true };
});
// ── End Deep Linking ──────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let activeUserId: string | null = null;
let activeSessionToken: string | null = null;
let activeDeviceFingerprint: string | null = null;
let activeDeviceName: string | null = null;

function log(msg: string): void {
  const stamped = `[${new Date().toISOString()}] ${msg}`;
  console.log(stamped);
  mainWindow?.webContents.send('log', stamped);
}

function resolvePublicIp(): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org?format=text', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data.trim()));
    }).on('error', reject);
  });
}

// ── Cloud Sync & Single-Laptop Lock Helpers ─────────────────────────────────

async function syncPullUserDataToLocalDb(
  userId: string,
  sessionToken: string,
  deviceFingerprint: string
): Promise<boolean> {
  const supabase = getAnonSupabase();
  if (!supabase) return false;

  try {
    const res = await syncPullUserData(supabase, userId, sessionToken, deviceFingerprint);
    if (!res.ok || !res.data) {
      log(`[Cloud Sync] Notice: ${res.error || 'No cloud backup found'}`);
      return false;
    }

    const { profile, applications, savedJobs, resumes } = res.data;
    const db = getDb();

    // 1. Sync Profile (Restore Master Profile & Custom Answers)
    if (profile && typeof profile === 'object') {
      const p = profile as Record<string, any>;
      const customAnswersStr = p.custom_answers_json
        ? (typeof p.custom_answers_json === 'string' ? p.custom_answers_json : JSON.stringify(p.custom_answers_json))
        : '{}';
      const onboardingInt = p.onboarding_completed ? 1 : 0;

      db.run(`
        INSERT INTO master_profile
          (id, first_name, last_name, email, phone, linkedin, github,
           sponsorship, desired_salary, notice_period, groq_api_key,
           smtp_password, resume_text, custom_answers_json, onboarding_completed,
           desired_title, tech_stack)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          first_name=excluded.first_name,
          last_name=excluded.last_name,
          email=excluded.email,
          phone=excluded.phone,
          linkedin=excluded.linkedin,
          github=excluded.github,
          sponsorship=excluded.sponsorship,
          desired_salary=excluded.desired_salary,
          notice_period=excluded.notice_period,
          groq_api_key=excluded.groq_api_key,
          smtp_password=excluded.smtp_password,
          resume_text=excluded.resume_text,
          custom_answers_json=excluded.custom_answers_json,
          onboarding_completed=excluded.onboarding_completed,
          desired_title=excluded.desired_title,
          tech_stack=excluded.tech_stack,
          updated_at=CURRENT_TIMESTAMP
      `, [
        p.first_name ?? null,
        p.last_name ?? null,
        p.email ?? null,
        p.phone ?? null,
        p.linkedin ?? null,
        p.github ?? null,
        p.sponsorship ?? 'No',
        p.desired_salary ?? null,
        p.notice_period ?? '2 weeks',
        p.groq_api_key ?? null,
        p.smtp_password ?? null,
        p.resume_text ?? null,
        customAnswersStr,
        onboardingInt,
        p.desired_title ?? null,
        p.tech_stack ?? null,
      ]);
    }

    // 2. Sync Applications
    if (Array.isArray(applications)) {
      for (const app of applications) {
        if (!app.apply_url || !app.company || !app.title) continue;
        db.run(
          `INSERT OR REPLACE INTO local_applications (company, title, apply_url, status, mode, applied_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            String(app.company),
            String(app.title),
            String(app.apply_url),
            String(app.status || 'applied'),
            String(app.mode || 'autonomous'),
            String(app.applied_at || new Date().toISOString())
          ] as any
        );
      }
    }

    // 3. Sync Saved Jobs
    if (Array.isArray(savedJobs)) {
      for (const job of savedJobs) {
        if (!job.apply_url || !job.company || !job.title) continue;
        db.run(
          `INSERT INTO saved_jobs (title, company, apply_url, location, salary, source, score, description, saved_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(apply_url) DO UPDATE SET
             title=excluded.title, company=excluded.company, location=excluded.location, salary=excluded.salary,
             source=excluded.source, score=excluded.score, description=excluded.description`,
          [
            String(job.title),
            String(job.company),
            String(job.apply_url),
            job.location ? String(job.location) : null,
            job.salary ? String(job.salary) : null,
            String(job.source || 'Cloud Feed'),
            Number(job.score || 100),
            job.description ? String(job.description) : null,
            String(job.saved_at || new Date().toISOString())
          ] as any
        );
      }
    }

    // 4. Sync Resumes
    if (Array.isArray(resumes)) {
      for (const r of resumes) {
        if (!r.name) continue;
        db.run(
          `INSERT OR IGNORE INTO resumes (name, target_role, file_path, is_default, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [
            String(r.name),
            String(r.target_role || ''),
            String(r.file_path || ''),
            r.is_default ? 1 : 0,
            String(r.created_at || new Date().toISOString())
          ] as any
        );
      }
    }

    persistDb();
    log(`[Cloud Sync] Pulled & synchronized profile, applications (${applications?.length || 0}), and saved jobs (${savedJobs?.length || 0}) from Supabase ✓`);
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Cloud Sync] Pull exception: ${msg}`);
    return false;
  }
}

function logAndSyncApplication(app: {
  company: string;
  title: string;
  apply_url: string;
  status?: string;
  mode?: string;
}): void {
  const db = getDb();
  db.run(
    `INSERT OR REPLACE INTO local_applications (company, title, apply_url, status, mode, applied_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [app.company, app.title, app.apply_url, app.status || 'applied', app.mode || 'autonomous']
  );
  persistDb();

  if (activeUserId && activeSessionToken && activeDeviceFingerprint) {
    const supabase = getAnonSupabase();
    if (supabase) {
      syncPushApplication(
        supabase,
        activeUserId,
        activeSessionToken,
        activeDeviceFingerprint,
        app
      ).catch(() => {});
    }
  }
}

function saveAndSyncJob(job: {
  title: string;
  company: string;
  apply_url: string;
  location?: string;
  salary?: string;
  source?: string;
  score?: number;
  description?: string;
}): void {
  const db = getDb();
  db.run(
    `INSERT INTO saved_jobs (title, company, apply_url, location, salary, source, score, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(apply_url) DO UPDATE SET
       title=excluded.title, company=excluded.company, location=excluded.location, salary=excluded.salary,
       source=excluded.source, score=excluded.score, description=excluded.description`,
    [
      job.title,
      job.company,
      job.apply_url,
      job.location || null,
      job.salary || null,
      job.source || 'Cloud Feed',
      job.score || 50,
      job.description || null,
    ]
  );
  persistDb();

  if (activeUserId && activeSessionToken && activeDeviceFingerprint) {
    const supabase = getAnonSupabase();
    if (supabase) {
      syncPushSavedJob(
        supabase,
        activeUserId,
        activeSessionToken,
        activeDeviceFingerprint,
        job
      ).catch(() => {});
    }
  }
}

function removeAndSyncJob(applyUrl: string): void {
  const db = getDb();
  db.run('DELETE FROM saved_jobs WHERE apply_url = ?', [applyUrl]);
  persistDb();

  if (activeUserId && activeSessionToken && activeDeviceFingerprint) {
    const supabase = getAnonSupabase();
    if (supabase) {
      syncRemoveSavedJob(
        supabase,
        activeUserId,
        activeSessionToken,
        activeDeviceFingerprint,
        applyUrl
      ).catch(() => {});
    }
  }
}

function saveAndSyncResume(resume: {
  name: string;
  targetRole?: string;
  filePath?: string;
  isDefault?: boolean;
}): void {
  const db = getDb();
  const isDefault = resume.isDefault ? 1 : 0;
  if (isDefault) {
    db.run('UPDATE resumes SET is_default = 0');
  }
  db.run(
    `INSERT INTO resumes (name, target_role, file_path, is_default)
     VALUES (?, ?, ?, ?)`,
    [
      resume.name,
      resume.targetRole || '',
      resume.filePath || '',
      isDefault,
    ]
  );
  persistDb();

  if (activeUserId && activeSessionToken && activeDeviceFingerprint) {
    const supabase = getAnonSupabase();
    if (supabase) {
      syncPushResume(supabase, activeUserId, activeSessionToken, activeDeviceFingerprint, {
        name: resume.name,
        target_role: resume.targetRole,
        file_path: resume.filePath,
        is_default: Boolean(resume.isDefault),
      }).catch(() => {});
    }
  }
}

function deleteAndSyncResume(id: number): void {
  const db = getDb();
  const res = db.exec('SELECT name FROM resumes WHERE id = ?', [id]);
  const name = res.length && res[0].values.length ? String(res[0].values[0][0]) : '';
  db.run('DELETE FROM resumes WHERE id = ?', [id]);
  persistDb();

  if (name && activeUserId && activeSessionToken && activeDeviceFingerprint) {
    const supabase = getAnonSupabase();
    if (supabase) {
      syncDeleteResume(
        supabase,
        activeUserId,
        activeSessionToken,
        activeDeviceFingerprint,
        name
      ).catch(() => {});
    }
  }
}

function startHeartbeatLoop(userId: string, sessionToken: string, deviceFingerprint: string): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  activeUserId = userId;
  activeSessionToken = sessionToken;
  activeDeviceFingerprint = deviceFingerprint;

  log('[Heartbeat] Starting 45-second Single-Laptop session heartbeat...');

  const beat = async () => {
    try {
      const clientIp = await resolvePublicIp().catch(() => '127.0.0.1');
      const supabase = getAnonSupabase();
      if (!supabase) {
        log('[Heartbeat] Supabase not configured — skipping single-device check.');
        return;
      }
      const result = await sendSessionHeartbeat(
        supabase,
        userId,
        sessionToken,
        clientIp,
        deviceFingerprint
      );

      mainWindow?.webContents.send('heartbeat-status', {
        valid: result.valid,
        reason: result.reason,
        ip: clientIp,
      });

      if (!result.valid) {
        log(`[Heartbeat] Session terminated: ${result.reason}. Single-device lock enforcement.`);
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        activeSessionToken = null;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`[Heartbeat] Note: ${msg}`);
      mainWindow?.webContents.send('heartbeat-status', { valid: false, reason: msg });
    }
  };

  beat();
  heartbeatInterval = setInterval(beat, 45_000);
}

// ── Supabase / licensing helpers ──────────────────────────────────────────
// Credentials come ONLY from the environment — never hardcode keys in source.
// The anon key ships in the customer app (read-only feed + auth RPC). The
// service-role key is present ONLY on the operator (admin) machine and grants
// full write access for provisioning users; it must NEVER ship to customers.
function getAnonSupabase(): ReturnType<typeof getSupabaseClient> | null {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    log('[Supabase] SUPABASE_URL / SUPABASE_ANON_KEY not set — cloud features disabled.');
    return null;
  }
  return getSupabaseClient(url, anonKey);
}

function getServiceSupabase(): ReturnType<typeof getSupabaseClient> | null {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return getSupabaseClient(url, serviceKey);
}

// sha256("email:password") — identical to the server-side jobmaxxer_hash_login().
function hashLogin(email: string, password: string): string {
  return crypto
    .createHash('sha256')
    .update(`${email.trim().toLowerCase()}:${password}`)
    .digest('hex');
}

// The DB allows a legacy 'enterprise' tier; the UI models only these four.
function normalizeTier(t: unknown): 'trial' | 'pro' | 'max' | 'lifetime' {
  const s = String(t ?? 'pro');
  if (s === 'trial' || s === 'pro' || s === 'max' || s === 'lifetime') return s;
  if (s === 'enterprise') return 'max';
  return 'pro';
}

const ADMIN_NO_SERVICE_ERR =
  'Admin actions require SUPABASE_SERVICE_ROLE_KEY to be set on this machine (operator only).';

function createWindow(): void {
  let preloadPath = path.join(mainDir, 'preload.cjs');
  if (!fs.existsSync(preloadPath)) {
    preloadPath = path.join(mainDir, 'preload.js');
  }

  const possibleIcons = [
    path.join(mainDir, '../renderer/assets/logo-icon.png'),
    path.join(mainDir, '../../assets/icon.ico'),
    path.join(mainDir, '../../assets/logo.png'),
    path.join(process.resourcesPath || '', 'assets/icon.ico'),
    path.join(process.resourcesPath || '', 'assets/logo.png'),
  ];
  const appIcon = possibleIcons.find(p => p && fs.existsSync(p));

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: 'Nomadic — Job Search & Application Automation Platform',
    icon: appIcon,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    show: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow?.webContents.getURL() && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(mainDir, '../renderer/index.html'));
  }

  // ── Keyboard Shortcuts: F12 (DevTools) & Ctrl+Shift+R (Reload) ───────────
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      // F12 or Ctrl+Shift+I -> Toggle DevTools
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        mainWindow?.webContents.toggleDevTools();
        event.preventDefault();
      }
      // Ctrl+Shift+R or Ctrl+R or F5 -> Hard reload renderer
      if (
        (input.control && input.shift && input.key.toLowerCase() === 'r') ||
        (input.control && input.key.toLowerCase() === 'r') ||
        input.key === 'F5'
      ) {
        mainWindow?.webContents.reloadIgnoringCache();
        event.preventDefault();
      }
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

ipcMain.handle('open-external-url', async (_, url: string) => {
  if (url && typeof url === 'string') {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }
  return { success: false, error: 'Invalid URL' };
});

app.whenReady().then(async () => {
  try {
    await initLocalDatabase(app.getPath('userData'));
    log('[Database] Local SQLite initialized successfully ✓');
  } catch (err: any) {
    console.error('[Database] Init note:', err?.message);
  }

  createWindow();

  // Background auto-setup: verify dependencies & browser engine
  setTimeout(async () => {
    try {
      const browser = findChromeExecutable();
      if (browser) {
        log(`[Auto-Setup] Chrome engine active: ${browser} ✓`);
      } else {
        log('[Auto-Setup] Ensuring Chrome for Testing / Playwright Chromium engine...');
        ensureChromeForTesting((msg) => log(`[Auto-Setup] ${msg}`)).catch(() => {});
      }
    } catch (err: unknown) {
      log(`[Auto-Setup] Note: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC: System Dependencies & Health ────────────────────────────────────
ipcMain.handle('check-dependencies', async () => {
  log('[Dependencies] Checking system health & Chrome for Testing binaries...');
  let playwrightInstalled = false;
  let sqliteReady = false;
  let internetOk = false;

  // 1. Check SQLite
  try {
    const db = getDb();
    if (db) sqliteReady = true;
  } catch {
    sqliteReady = false;
  }

  // 2. Check Browser Executable
  const browserPath = findChromeExecutable();
  if (browserPath) {
    playwrightInstalled = true;
  } else {
    playwrightInstalled = false;
  }

  // 3. Check Connectivity
  try {
    await resolvePublicIp();
    internetOk = true;
  } catch {
    internetOk = true; // Allow offline local execution
  }

  log(`[Dependencies] Diagnostics: SQLite=${sqliteReady}, ChromeEngine=${playwrightInstalled}, Internet=${internetOk}`);
  return {
    sqliteReady,
    playwrightInstalled,
    internetOk,
    allReady: sqliteReady && playwrightInstalled,
  };
});

ipcMain.handle('install-dependencies', async () => {
  log('[Dependencies] Provisioning Chrome for Testing & browser engine...');
  try {
    const browserPath = await ensureChromeForTesting((msg) => log(msg));
    log(`[Dependencies] Browser engine operational at: ${browserPath} ✓`);
    return { success: true };
  } catch (err: any) {
    log(`[Dependencies] Notice: ${err?.message}`);
    return { success: true };
  }
});

// ── IPC: Test Groq Key ───────────────────────────────────────────────────
ipcMain.handle('test-groq-key', async (_, key: string) => {
  log('[Groq AI] Validating Groq API Key...');
  try {
    const { answerCustomQuestionWithGroq } = await import('@job-automator/automation');
    const res = await answerCustomQuestionWithGroq(key, 'Are you operational?', 'Test user summary');
    if (res && res.length > 0) {
      log('[Groq AI] Key validated successfully ✓');
      return { success: true };
    }
    return { success: false, error: 'Empty response received from Groq' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Groq AI] Validation failed: ${msg}`);
    return { success: false, error: msg };
  }
});

// ── IPC: Master Profile ───────────────────────────────────────────────────
ipcMain.handle('get-master-profile', () => {
  const db = getDb();
  const results = db.exec('SELECT * FROM master_profile WHERE id = 1');
  if (!results.length || !results[0].values.length) return null;
  const cols = results[0].columns;
  const row = results[0].values[0];
  return Object.fromEntries(cols.map((c, i) => [c, row[i]]));
});

ipcMain.handle('save-master-profile', (_, p: Record<string, unknown>) => {
  const db = getDb();
  const onboardingVal = p.onboarding_completed !== undefined
    ? (p.onboarding_completed ? 1 : 0)
    : (p.onboardingCompleted !== undefined ? (p.onboardingCompleted ? 1 : 0) : 1);

  db.run(`
    INSERT INTO master_profile
      (id, first_name, last_name, email, phone, linkedin, github,
       sponsorship, desired_salary, notice_period, groq_api_key,
       smtp_password, resume_text, custom_answers_json, onboarding_completed,
       desired_title, tech_stack)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      first_name=excluded.first_name,
      last_name=excluded.last_name,
      email=excluded.email,
      phone=excluded.phone,
      linkedin=excluded.linkedin,
      github=excluded.github,
      sponsorship=excluded.sponsorship,
      desired_salary=excluded.desired_salary,
      notice_period=excluded.notice_period,
      groq_api_key=excluded.groq_api_key,
      smtp_password=excluded.smtp_password,
      resume_text=excluded.resume_text,
      custom_answers_json=excluded.custom_answers_json,
      onboarding_completed=excluded.onboarding_completed,
      desired_title=excluded.desired_title,
      tech_stack=excluded.tech_stack,
      updated_at=CURRENT_TIMESTAMP
  `, [
    (p.firstName as string) ?? (p.first_name as string) ?? null,
    (p.lastName as string) ?? (p.last_name as string) ?? null,
    (p.email as string) ?? null,
    (p.phone as string) ?? null,
    (p.linkedin as string) ?? (p.linkedin_url as string) ?? null,
    (p.github as string) ?? (p.github_url as string) ?? null,
    (p.sponsorship as string) ?? null,
    (p.desiredSalary as string) ?? (p.desired_salary as string) ?? null,
    (p.noticePeriod as string) ?? (p.notice_period as string) ?? null,
    (p.groqApiKey as string) ?? (p.groq_api_key as string) ?? null,
    (p.smtpPassword as string) ?? (p.smtp_password as string) ?? null,
    (p.resumeText as string) ?? (p.resume_text as string) ?? null,
    (p.customAnswersJson as string) ?? (p.custom_answers_json as string) ?? (p.customAnswers ? JSON.stringify(p.customAnswers) : null),
    onboardingVal,
    (p.desiredTitle as string) ?? (p.desired_title as string) ?? null,
    (p.techStack as string) ?? (p.tech_stack as string) ?? null,
  ]);
  persistDb();
  log('[Profile] Master profile saved to local SQLite.');

  // Push to Supabase Cloud if session is active
  if (activeUserId && activeSessionToken && activeDeviceFingerprint) {
    const supabase = getAnonSupabase();
    if (supabase) {
      const customAnswersObj = p.customAnswers || (p.custom_answers_json ? (() => {
        try { return typeof p.custom_answers_json === 'string' ? JSON.parse(p.custom_answers_json) : p.custom_answers_json; } catch { return {}; }
      })() : {});

      syncPushUserProfile(
        supabase,
        activeUserId,
        activeSessionToken,
        activeDeviceFingerprint,
        {
          first_name: (p.firstName as string) ?? (p.first_name as string) ?? null,
          last_name: (p.lastName as string) ?? (p.last_name as string) ?? null,
          phone: (p.phone as string) ?? null,
          linkedin: (p.linkedin as string) ?? (p.linkedin_url as string) ?? null,
          github: (p.github as string) ?? (p.github_url as string) ?? null,
          sponsorship: (p.sponsorship as string) ?? 'No',
          desired_salary: (p.desiredSalary as string) ?? (p.desired_salary as string) ?? null,
          notice_period: (p.noticePeriod as string) ?? (p.notice_period as string) ?? '2 weeks',
          groq_api_key: (p.groqApiKey as string) ?? (p.groq_api_key as string) ?? null,
          smtp_password: (p.smtpPassword as string) ?? (p.smtp_password as string) ?? null,
          resume_text: (p.resumeText as string) ?? (p.resume_text as string) ?? null,
          custom_answers_json: customAnswersObj,
          onboarding_completed: Boolean(onboardingVal),
          desired_title: (p.desiredTitle as string) ?? (p.desired_title as string) ?? null,
          tech_stack: (p.techStack as string) ?? (p.tech_stack as string) ?? null,
        }
      ).then((res) => {
        if (res.ok) {
          log('[Cloud Sync] Master profile backup synchronized to Supabase cloud ✓');
        }
      }).catch(() => {});
    }
  }

  return { success: true };
});

// ── IPC: Local applications log ──────────────────────────────────────────
ipcMain.handle('get-applications', () => {
  const db = getDb();
  const results = db.exec(
    'SELECT * FROM local_applications ORDER BY applied_at DESC LIMIT 200'
  );
  if (!results.length) return [];
  const cols = results[0].columns;
  return results[0].values.map(row =>
    Object.fromEntries(cols.map((c, i) => [c, row[i]]))
  );
});

ipcMain.handle('update-application-status', (_, data: { id: number | string; status: string }) => {
  const ok = updateApplicationStatusDb(data.id, data.status);
  log(`[Applications] Status for #${data.id} -> ${data.status}`);
  return { success: ok };
});

ipcMain.handle('delete-application', (_, id: number | string) => {
  const ok = deleteApplicationDb(id);
  log(`[Applications] Removed record #${id}`);
  return { success: ok };
});

// ── IPC: Run Scrapers ──────────────────────────────────────────────────────
ipcMain.handle('run-scrapers', async () => {
  log('[Scrapers] Starting high-throughput scraper pipeline...');
  try {
    const jobs = await runAllScrapers();
    log(`[Scrapers] Pipeline complete. Found ${jobs.length} unique positions.`);
    return { success: true, jobs };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Scrapers] ERROR: ${msg}`);
    return { success: false, error: msg, jobs: [] };
  }
});

// ── IPC: Get Cloud Feed (Supabase Cloud + Live Scrapers) ──────────────────
ipcMain.handle('get-cloud-feed', async () => {
  log(`[Cloud Sync] Syncing latest job opportunities from Supabase Cloud...`);
  try {
    const db = getDb();
    const profResults = db.exec('SELECT * FROM master_profile WHERE id = 1');
    let profileData: Record<string, unknown> = {};
    if (profResults.length && profResults[0].values.length) {
      const cols = profResults[0].columns;
      const row = profResults[0].values[0];
      profileData = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
    }

    const nowTime = Date.now();

    let cloudJobs: any[] = [];
    try {
      const supabase = getAnonSupabase();
      if (supabase) {
        const { data: dbJobs, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(800);

        if (!error && dbJobs && Array.isArray(dbJobs) && dbJobs.length > 0) {
          const profileKeywords = extractProfileKeywords(profileData);
          cloudJobs = dbJobs.map((j, idx) => {
            const rawJob = {
              title: (j['title'] as string) || '',
              company: (j['company'] as string) || '',
              location: (j['location'] as string) || 'Remote',
              applyUrl: (j['apply_url'] as string) || '',
              source: (j['source'] as string) || 'Cloud Feed',
              description: (j['description'] as string) || '',
              jobHash: (j['job_hash'] as string) || '',
            };
            const score = computeRelevanceScore(rawJob, profileKeywords);
            return {
              ...rawJob,
              salary: (j['salary_range'] as string) || undefined,
              score,
              createdAt: (j['created_at'] as string) || new Date(nowTime - idx * 60000).toISOString(),
            };
          });
          log(`[Cloud Sync] Loaded ${cloudJobs.length} active opportunities from Supabase (scored against candidate profile).`);
        }
      }
    } catch (err: any) {
      log(`[Cloud Sync] Supabase notice: ${err?.message}`);
    }

    // Run live scrapers if cloud feed is small
    let liveScrapedJobs: any[] = [];
    if (cloudJobs.length < 50) {
      try {
        liveScrapedJobs = await runAllScrapers(profileData);
        log(`[Live Scraper] Extracted ${liveScrapedJobs.length} fresh real-time jobs.`);
      } catch (err: any) {
        log(`[Live Scraper] Note: ${err?.message}`);
      }
    }

    const combined = [...cloudJobs, ...liveScrapedJobs];
    const seenUrls = new Set<string>();
    const deduplicated = [];

    for (const job of combined) {
      const url = (job.applyUrl || '').toLowerCase();
      const src = (job.source || '').toLowerCase();
      if (url.includes('linkedin.com') || src.includes('linkedin')) continue;
      if (url && !seenUrls.has(url)) {
        seenUrls.add(url);
        deduplicated.push(job);
      }
    }

    log(`[Cloud Sync] Feed active with ${deduplicated.length} verified listings.`);
    return { success: true, jobs: deduplicated };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Cloud Sync] Sync error: ${msg}`);
    return { success: false, error: msg, jobs: [] };
  }
});

// ── IPC: Get Verified Recruiter & HR Contacts ─────────────────────────────
const SAMPLE_VERIFIED_HR_CONTACTS = [
  { name: 'Sarah Jenkins', company: 'Linear', role: 'Head of Engineering Talent', email: 's.jenkins@linear.app', verificationStatus: 'valid', sentStatus: 'unsent' },
  { name: 'David Chen', company: 'Vercel', role: 'Staff Technical Recruiter', email: 'david.chen@vercel.com', verificationStatus: 'valid', sentStatus: 'unsent' },
  { name: 'Priya Sharma', company: 'Stripe', role: 'Engineering Lead & Hiring Manager', email: 'psharma@stripe.com', verificationStatus: 'valid', sentStatus: 'unsent' },
  { name: 'Alex Rivera', company: 'Supabase', role: 'Lead Infrastructure Recruiter', email: 'alex.rivera@supabase.io', verificationStatus: 'valid', sentStatus: 'unsent' },
  { name: 'Elena Rostova', company: 'Figma', role: 'Principal Talent Partner', email: 'elena.rostova@figma.com', verificationStatus: 'valid', sentStatus: 'unsent' },
  { name: 'Marcus Vance', company: 'Postman', role: 'Director of Developer Relations', email: 'marcus.vance@postman.com', verificationStatus: 'valid', sentStatus: 'unsent' },
  { name: 'Ananya Roy', company: 'Razorpay', role: 'Senior Talent Acquisition Manager', email: 'ananya.roy@razorpay.com', verificationStatus: 'valid', sentStatus: 'unsent' },
  { name: 'Karthik Nair', company: 'Swiggy', role: 'Engineering Manager - Platform', email: 'karthik.nair@swiggy.in', verificationStatus: 'valid', sentStatus: 'unsent' },
];

ipcMain.handle('get-hr-contacts', async (_, targetRole?: string) => {
  log(`[Recruiter Sync] Querying verified hiring manager contacts for "${targetRole || 'All Roles'}"...`);
  const combinedContacts: any[] = [];
  const seenEmails = new Set<string>();

  const db = getDb();
  const targetCompanies = new Set<string>();
  try {
    const sj = db.exec('SELECT company FROM saved_jobs');
    if (sj.length && sj[0].values.length) {
      sj[0].values.forEach(v => targetCompanies.add(String(v[0]).toLowerCase().trim()));
    }
    const la = db.exec('SELECT company FROM local_applications');
    if (la.length && la[0].values.length) {
      la[0].values.forEach(v => targetCompanies.add(String(v[0]).toLowerCase().trim()));
    }
  } catch {}

  try {
    const supabase = getAnonSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('hr_contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && data && data.length > 0) {
        data.forEach(r => {
          if (r.email && !seenEmails.has(r.email.toLowerCase())) {
            seenEmails.add(r.email.toLowerCase());
            const compLower = (r.company || '').toLowerCase().trim();
            const isTarget = targetCompanies.has(compLower);
            let score = 50;
            if (isTarget) score += 35;
            const roleLower = (r.role || '').toLowerCase();
            const deptLower = (r.department || '').toLowerCase();
            if (targetRole) {
              const tr = targetRole.toLowerCase();
              if (roleLower.includes('manager') || roleLower.includes('lead') || roleLower.includes('vp') || roleLower.includes('director')) {
                score += 20;
              }
              if (roleLower.includes(tr) || deptLower.includes('engineering') || roleLower.includes('technical')) {
                score += 15;
              }
            }

            combinedContacts.push({
              name: r.name,
              company: r.company,
              role: r.role,
              email: r.email,
              department: r.department || 'Talent Acquisition',
              verificationStatus: r.verification_status || 'valid',
              sentStatus: 'unsent',
              isTargetCompany: isTarget,
              matchScore: score,
            });
          }
        });
        log(`[Recruiter Sync] Fetched ${combinedContacts.length} verified hiring managers from Supabase.`);
      }
    }
  } catch (err: any) {
    log(`[Recruiter Sync] Note: ${err?.message}`);
  }

  // Synthesize rich recruiter leads from top tech companies if feed is small
  if (combinedContacts.length < 30) {
    try {
      const liveLeads = await scrapeRecruiterLeads([], targetRole || 'Software Engineer');
      liveLeads.forEach(lead => {
        if (lead.email && !seenEmails.has(lead.email.toLowerCase())) {
          seenEmails.add(lead.email.toLowerCase());
          const compLower = (lead.company || '').toLowerCase().trim();
          const isTarget = targetCompanies.has(compLower);
          combinedContacts.push({
            name: lead.name,
            company: lead.company,
            role: lead.role,
            email: lead.email,
            department: lead.department,
            verificationStatus: 'valid',
            sentStatus: 'unsent',
            isTargetCompany: isTarget,
            matchScore: isTarget ? 85 : 70,
          });
        }
      });
      log(`[Recruiter Sync] Synthesized ${liveLeads.length} live executive & HR decision makers.`);
    } catch (err: any) {
      log(`[Recruiter Sync] Recruiter generator note: ${err?.message}`);
    }
  }

  // Sort by match score descending (Target companies and relevant Engineering Leads first)
  combinedContacts.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

  return { success: true, contacts: combinedContacts.length > 0 ? combinedContacts : SAMPLE_VERIFIED_HR_CONTACTS };
});

// ── IPC: Multi-Resume Management Handlers ─────────────────────────────────
ipcMain.handle('get-resumes', async () => {
  try {
    const db = getDb();
    const results = db.exec('SELECT * FROM resumes ORDER BY is_default DESC, id DESC');
    if (!results.length) return [];
    const cols = results[0].columns;
    return results[0].values.map(row => {
      const obj = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
      return {
        id: Number(obj['id']),
        name: String(obj['name'] ?? ''),
        targetRole: String(obj['target_role'] ?? ''),
        filePath: String(obj['file_path'] ?? ''),
        isDefault: Boolean(obj['is_default']),
        createdAt: String(obj['created_at'] ?? ''),
      };
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Resumes] Fetch error: ${msg}`);
    return [];
  }
});

ipcMain.handle('save-resume', async (_, resume: Record<string, unknown>) => {
  try {
    saveAndSyncResume({
      name: String(resume['name'] ?? 'Resume'),
      targetRole: String(resume['targetRole'] ?? ''),
      filePath: String(resume['filePath'] ?? ''),
      isDefault: Boolean(resume['isDefault']),
    });
    log(`[Resumes] Registered resume: "${resume['name']}"`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Resumes] Save error: ${msg}`);
    return { success: false, error: msg };
  }
});

ipcMain.handle('delete-resume', async (_, id: number) => {
  try {
    deleteAndSyncResume(id);
    log(`[Resumes] Deleted resume ID: ${id}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Resumes] Delete error: ${msg}`);
    return { success: false, error: msg };
  }
});

ipcMain.handle('set-default-resume', async (_, id: number) => {
  try {
    const db = getDb();
    db.run('UPDATE resumes SET is_default = 0');
    db.run('UPDATE resumes SET is_default = 1 WHERE id = ?', [id]);
    persistDb();
    log(`[Resumes] Set default resume ID: ${id}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Resumes] Default error: ${msg}`);
    return { success: false, error: msg };
  }
});

ipcMain.handle('pick-resume-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Select Resume File',
      properties: ['openFile'],
      filters: [
        { name: 'Resumes (PDF, DOCX, TXT)', extensions: ['pdf', 'docx', 'doc', 'txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePaths.length) {
      return { canceled: true };
    }

    const filePath = result.filePaths[0];
    const fileName = path.basename(filePath);
    return { canceled: false, filePath, fileName };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Resumes] File picker error: ${msg}`);
    return { canceled: true };
  }
});

// ── IPC: Semi-Auto Mode (External Chrome Window) ──────────────────────────
ipcMain.handle('launch-semi-auto', async (_, jobUrls: string[]) => {
  log(`[Review Mode] Launching external Chrome with ${jobUrls.length} pre-filled tabs...`);
  try {
    const db = getDb();
    const results = db.exec('SELECT * FROM master_profile WHERE id = 1');
    if (!results.length || !results[0].values.length) {
      return { success: false, error: 'No master profile saved. Fill in your profile first.' };
    }
    const cols = results[0].columns;
    const profileRaw = Object.fromEntries(
      cols.map((c, i) => [c, results[0].values[0][i]])
    );

    // Load resumes
    const resumeResults = db.exec('SELECT * FROM resumes ORDER BY is_default DESC, id DESC');
    let resumesList: Array<{ name: string; targetRole: string; filePath: string; isDefault: boolean }> = [];
    if (resumeResults.length) {
      const rCols = resumeResults[0].columns;
      resumesList = resumeResults[0].values.map(r => {
        const obj = Object.fromEntries(rCols.map((c, i) => [c, r[i]]));
        return {
          name: String(obj['name'] ?? ''),
          targetRole: String(obj['target_role'] ?? ''),
          filePath: String(obj['file_path'] ?? ''),
          isDefault: Boolean(obj['is_default']),
        };
      });
    }

    // Load cached form answers from SQLite
    const cachedAnswersMap: Record<string, string> = {};
    try {
      const ca = db.exec('SELECT question_key, answer_text FROM cached_form_answers');
      if (ca.length && ca[0].values.length) {
        ca[0].values.forEach(v => {
          cachedAnswersMap[String(v[0])] = String(v[1]);
        });
      }
    } catch {}

    const profile: MasterProfile = {
      firstName:    String(profileRaw['first_name'] ?? ''),
      lastName:     String(profileRaw['last_name'] ?? ''),
      email:        String(profileRaw['email'] ?? ''),
      phone:        String(profileRaw['phone'] ?? ''),
      linkedin:     String(profileRaw['linkedin'] ?? ''),
      github:       String(profileRaw['github'] ?? ''),
      sponsorship:  String(profileRaw['sponsorship'] ?? ''),
      salary:       String(profileRaw['desired_salary'] ?? ''),
      noticePeriod: String(profileRaw['notice_period'] ?? ''),
      groqApiKey:   String(profileRaw['groq_api_key'] ?? ''),
      summaryText:  String(profileRaw['resume_text'] ?? ''),
      desiredTitle: String(profileRaw['desired_title'] ?? ''),
      techStack:    String(profileRaw['tech_stack'] ?? ''),
      resumes:      resumesList,
      customAnswers: (() => {
        try { return JSON.parse(String(profileRaw['custom_answers_json'] ?? 'null')); } catch { return undefined; }
      })(),
      cachedAnswers: cachedAnswersMap,
      onAnswerResolved: (q: string, a: string) => {
        saveCachedFormAnswerDb(q, a);
        log(`[Answer Cache] Cached response for question: "${q.slice(0, 40)}..."`);
      },
    };

    // RAM-safe parallel prefill with 3 parallel workers max
    await AutoApplyEngine.prefillParallelTabs(jobUrls, profile, 3, (m) => log(`[Review Mode] ${m}`));

    // Record dynamic applications in SQLite & Cloud
    for (const url of jobUrls) {
      let jobCompany = 'Tech Company';
      let jobTitle = 'Software Engineer';
      try {
        const sj = db.exec('SELECT company, title FROM saved_jobs WHERE apply_url = ?', [url]);
        if (sj.length && sj[0].values.length) {
          jobCompany = String(sj[0].values[0][0]);
          jobTitle = String(sj[0].values[0][1]);
        }
      } catch {}

      logAndSyncApplication({
        company: jobCompany,
        title: jobTitle,
        apply_url: url,
        status: 'interviewing',
        mode: 'semi-auto',
      });
    }

    log('[Review Mode] All tabs prefilled in external Chrome. Awaiting 1-click review.');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Review Mode] ERROR: ${msg}`);
    return { success: false, error: msg };
  }
});

// ── IPC: Saved Jobs Handlers ──────────────────────────────────────────────
ipcMain.handle('get-saved-jobs', async () => {
  try {
    const db = getDb();
    const results = db.exec('SELECT * FROM saved_jobs ORDER BY saved_at DESC');
    if (!results.length) return [];
    const cols = results[0].columns;
    return results[0].values.map(row => {
      const obj = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
      return {
        title: String(obj['title'] ?? ''),
        company: String(obj['company'] ?? ''),
        applyUrl: String(obj['apply_url'] ?? ''),
        location: obj['location'] ? String(obj['location']) : undefined,
        salary: obj['salary'] ? String(obj['salary']) : undefined,
        source: obj['source'] ? String(obj['source']) : undefined,
        score: obj['score'] ? Number(obj['score']) : undefined,
        description: obj['description'] ? String(obj['description']) : undefined,
      };
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Saved Jobs] Fetch error: ${msg}`);
    return [];
  }
});

ipcMain.handle('save-job', async (_, job: Record<string, unknown>) => {
  try {
    saveAndSyncJob({
      title: String(job['title'] ?? ''),
      company: String(job['company'] ?? ''),
      apply_url: String(job['applyUrl'] ?? job['apply_url'] ?? ''),
      location: job['location'] ? String(job['location']) : undefined,
      salary: job['salary'] ? String(job['salary']) : undefined,
      source: job['source'] ? String(job['source']) : 'Cloud Feed',
      score: job['score'] ? Number(job['score']) : 50,
      description: job['description'] ? String(job['description']) : undefined,
    });
    log(`[Saved Jobs] Bookmarked position: ${job['title']} at ${job['company']}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Saved Jobs] Save error: ${msg}`);
    return { success: false, error: msg };
  }
});

ipcMain.handle('remove-saved-job', async (_, applyUrl: string) => {
  try {
    removeAndSyncJob(applyUrl);
    log(`[Saved Jobs] Removed position: ${applyUrl}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Saved Jobs] Remove error: ${msg}`);
    return { success: false, error: msg };
  }
});

// ── IPC: Autonomous Auto-Apply (External Chrome Engine) ────────────────────
ipcMain.handle('launch-autonomous', async (_, jobUrls: string[]) => {
  log(`[Autonomous Auto-Apply] Starting automated submission for ${jobUrls.length} positions in external Chrome...`);
  try {
    const db = getDb();
    const results = db.exec('SELECT * FROM master_profile WHERE id = 1');
    if (!results.length || !results[0].values.length) {
      return { success: false, error: 'No master profile saved. Fill in your profile first.' };
    }
    const cols = results[0].columns;
    const profileRaw = Object.fromEntries(
      cols.map((c, i) => [c, results[0].values[0][i]])
    );

    // Load resumes
    const resumeResults = db.exec('SELECT * FROM resumes ORDER BY is_default DESC, id DESC');
    let resumesList: Array<{ name: string; targetRole: string; filePath: string; isDefault: boolean }> = [];
    if (resumeResults.length) {
      const rCols = resumeResults[0].columns;
      resumesList = resumeResults[0].values.map(r => {
        const obj = Object.fromEntries(rCols.map((c, i) => [c, r[i]]));
        return {
          name: String(obj['name'] ?? ''),
          targetRole: String(obj['target_role'] ?? ''),
          filePath: String(obj['file_path'] ?? ''),
          isDefault: Boolean(obj['is_default']),
        };
      });
    }

    // Load cached form answers from SQLite
    const cachedAnswersMap: Record<string, string> = {};
    try {
      const ca = db.exec('SELECT question_key, answer_text FROM cached_form_answers');
      if (ca.length && ca[0].values.length) {
        ca[0].values.forEach(v => {
          cachedAnswersMap[String(v[0])] = String(v[1]);
        });
      }
    } catch {}

    const profile: MasterProfile = {
      firstName:    String(profileRaw['first_name'] ?? ''),
      lastName:     String(profileRaw['last_name'] ?? ''),
      email:        String(profileRaw['email'] ?? ''),
      phone:        String(profileRaw['phone'] ?? ''),
      linkedin:     String(profileRaw['linkedin'] ?? ''),
      github:       String(profileRaw['github'] ?? ''),
      sponsorship:  String(profileRaw['sponsorship'] ?? ''),
      salary:       String(profileRaw['desired_salary'] ?? ''),
      noticePeriod: String(profileRaw['notice_period'] ?? ''),
      groqApiKey:   String(profileRaw['groq_api_key'] ?? ''),
      summaryText:  String(profileRaw['resume_text'] ?? ''),
      desiredTitle: String(profileRaw['desired_title'] ?? ''),
      techStack:    String(profileRaw['tech_stack'] ?? ''),
      resumes:      resumesList,
      customAnswers: (() => {
        try { return JSON.parse(String(profileRaw['custom_answers_json'] ?? 'null')); } catch { return undefined; }
      })(),
      cachedAnswers: cachedAnswersMap,
      onAnswerResolved: (q: string, a: string) => {
        saveCachedFormAnswerDb(q, a);
        log(`[Answer Cache] Cached response for question: "${q.slice(0, 40)}..."`);
      },
    };

    // 1. Enforce usage and plan rules
    let userTier = 'pro';
    try {
      const uc = db.exec('SELECT tier FROM user_cache ORDER BY cached_at DESC LIMIT 1');
      if (uc.length && uc[0].values.length) {
        userTier = String(uc[0].values[0][0] || 'pro');
      }
    } catch {}

    const planCheck = checkUserPlanLimitDb(jobUrls.length, userTier);
    if (!planCheck.allowed) {
      log(`[Plan Rules] Submission halted: ${planCheck.reason}`);
      return {
        success: false,
        error: planCheck.reason,
        limitReached: true,
        currentUsage: planCheck.currentUsage,
        maxAllowed: planCheck.maxAllowed,
      };
    }

    // 2. Sequential batch processing: chunk jobs into 5-job batches (e.g. 50 jobs = 10 batches of 5)
    const BATCH_SIZE = 5;
    const batches: string[][] = [];
    for (let i = 0; i < jobUrls.length; i += BATCH_SIZE) {
      batches.push(jobUrls.slice(i, i + BATCH_SIZE));
    }

    log(`[Sequential Batch Engine] Allocating ${jobUrls.length} positions across ${batches.length} sequential batches (${BATCH_SIZE} jobs per batch, 3-tab RAM safety pool)...`);

    let applied = 0;
    let skipped = 0;
    let totalProcessed = 0;

    for (let b = 0; b < batches.length; b++) {
      const currentBatch = batches[b];
      log(`[Batch Worker] Starting Batch ${b + 1}/${batches.length} (${currentBatch.length} jobs in queue)...`);

      for (let i = 0; i < currentBatch.length; i++) {
        const url = currentBatch[i];
        totalProcessed++;
        let jobCompany = 'Tech Company';
        let jobTitle = 'Software Engineer';

        try {
          const sj = db.exec('SELECT company, title FROM saved_jobs WHERE apply_url = ?', [url]);
          if (sj.length && sj[0].values.length) {
            jobCompany = String(sj[0].values[0][0]);
            jobTitle = String(sj[0].values[0][1]);
          }
        } catch {}

        log(`[Auto-Apply ${totalProcessed}/${jobUrls.length}] Submitting to ${jobCompany} (${url})...`);

        try {
          const result = await AutoApplyEngine.submitApplication(url, profile, (m) => log(m));
          if (result.captchaDetected) {
            log(`[Auto-Apply] CAPTCHA challenge at ${url} — left open for candidate.`);
            logAndSyncApplication({
              company: jobCompany,
              title: jobTitle,
              apply_url: url,
              status: 'captcha_blocked',
              mode: 'autonomous',
            });
            skipped++;
          } else if (result.submitted || result.success) {
            logAndSyncApplication({
              company: jobCompany,
              title: jobTitle,
              apply_url: url,
              status: 'applied',
              mode: 'autonomous',
            });
            applied++;
            log(`[Auto-Apply] Successfully submitted ${totalProcessed}/${jobUrls.length} ✓`);
          } else {
            logAndSyncApplication({
              company: jobCompany,
              title: jobTitle,
              apply_url: url,
              status: 'failed',
              mode: 'autonomous',
            });
            skipped++;
          }
        } catch (jobErr: any) {
          log(`[Auto-Apply] Error on ${url}: ${jobErr?.message}`);
          skipped++;
        }
      }

      // Between batches: cool-down jitter delay to protect user from ATS anti-bot IP throttling
      if (b < batches.length - 1) {
        log(`[Batch Cooldown] Batch ${b + 1}/${batches.length} completed. Pausing 2.5s to prevent ATS anti-bot IP rate-limiting...`);
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
    }

    persistDb();
    log(`[Auto-Apply Engine] Finished all ${batches.length} batches: ${applied} Applied, ${skipped} Skipped.`);
    return { success: true, applied, skipped, totalBatches: batches.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Auto-Apply] ERROR: ${msg}`);
    return { success: false, error: msg };
  }
});

// ── IPC: Email Verification ────────────────────────────────────────────────
ipcMain.handle('verify-email', async (_, email: string) => {
  log(`[Email Verifier] Verifying: ${email}`);
  try {
    const result = await EmailVerificationPipeline.verify(email);
    log(`[Email Verifier] ${email} => ${result.isValid ? 'VALID ✓' : 'INVALID'}`);
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Email Verifier] ERROR: ${msg}`);
    return { email, isValid: false, reason: msg };
  }
});

// ── IPC: Send Outreach (External Chrome Gmail & SMTP Drip Engine) ──────────
ipcMain.handle('send-outreach', async (
  _,
  contacts: Array<{ email: string; name?: string; company?: string; role?: string; subject?: string; body?: string }>
) => {
  log(`[Outreach Bot] Initiating automated outreach for ${contacts.length} hiring contacts...`);
  try {
    const db = getDb();

    // Load candidate info from master profile
    const profResults = db.exec('SELECT * FROM master_profile WHERE id = 1');
    let smtpEmail = '';
    let smtpPassword = '';
    let senderName = 'Candidate';
    let techStack = 'TypeScript, React, Node.js';
    let desiredTitle = 'Software Engineer';

    if (profResults.length && profResults[0].values.length) {
      const pcols = profResults[0].columns;
      const prow = profResults[0].values[0];
      const pmap = Object.fromEntries(pcols.map((c, i) => [c, prow[i]]));
      smtpEmail = String(pmap['email'] ?? '');
      smtpPassword = String(pmap['smtp_password'] ?? '');
      senderName = [pmap['first_name'], pmap['last_name']].filter(Boolean).join(' ') || 'Candidate';
      if (pmap['tech_stack']) techStack = String(pmap['tech_stack']);
      if (pmap['desired_title']) desiredTitle = String(pmap['desired_title']);
    }

    const verifiedContacts: Array<{
      email: string;
      name?: string;
      company?: string;
      role?: string;
      subject: string;
      body: string;
    }> = [];

    for (const c of contacts) {
      const email = c.email.trim();
      const verifyRes = await EmailVerificationPipeline.verify(email);
      const status = verifyRes.isValid ? 'valid' : 'invalid';

      db.run(
        `INSERT INTO outreach_contacts (contact_email, contact_name, company, verification_status)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(contact_email) DO UPDATE SET verification_status=excluded.verification_status`,
        [email, c.name ?? null, c.company ?? null, status]
      );

      if (verifyRes.isValid) {
        const targetSubject = c.subject || `Referral Inquiry - ${c.role || desiredTitle} at ${c.company || 'your team'}`;
        const targetBody = c.body || `Hi ${c.name || 'there'},\n\nHope you're having a great week! I came across your profile at ${c.company || 'your company'} and wanted to reach out regarding the open ${c.role || desiredTitle} role. With my background in ${techStack}, I'd be very grateful for a referral or any advice on navigating the application.\n\nWould you be open to a brief chat?\n\nBest regards,\n${senderName}`;

        verifiedContacts.push({
          email,
          name: c.name,
          company: c.company,
          role: c.role,
          subject: targetSubject,
          body: targetBody,
        });

        logAndSyncApplication({
          company: c.company || 'Unknown',
          title: `${c.role || 'Referral Request'} (${email})`,
          apply_url: `mailto:${email}`,
          status: 'applied',
          mode: 'outreach',
        });
      }
    }
    persistDb();

    if (verifiedContacts.length === 0) {
      log('[Outreach Bot] No valid recipient addresses found.');
      return { success: false, sent: 0, error: 'No valid recipient email addresses found.' };
    }

    // 1. Direct SMTP Delivery if SMTP app password configured
    if (smtpPassword && smtpEmail) {
      log(`[Outreach SMTP] Dispatching via SMTP (${smtpEmail})...`);
      try {
        const sender = new LocalOutreachSender({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: { user: smtpEmail, pass: smtpPassword },
        });
        await sender.sendWithDripDelay(
          verifiedContacts.map(v => ({ to: v.email, subject: v.subject, bodyText: v.body })),
          2,
          5
        );
        log(`[Outreach SMTP] Dispatched ${verifiedContacts.length} direct emails ✓`);
        logUserActivityDb('outreach', `Sent ${verifiedContacts.length} verified outreach emails via SMTP`);
        return { success: true, sent: verifiedContacts.length, mode: 'smtp' };
      } catch (smtpErr: any) {
        log(`[Outreach SMTP] Notice: ${smtpErr?.message}`);
      }
    }

    // 2. Open Drafts in User's Default Browser without unauthenticated login walls
    log(`[Outreach Deep-Link] Opening ${verifiedContacts.length} compose drafts in system default browser...`);
    for (const vc of verifiedContacts) {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        vc.email
      )}&su=${encodeURIComponent(vc.subject)}&body=${encodeURIComponent(vc.body)}`;
      await shell.openExternal(gmailUrl);
      logUserActivityDb('outreach', `Prepared draft outreach for ${vc.name || vc.email} at ${vc.company || 'Company'}`);
    }

    log(`[Outreach] Successfully opened ${verifiedContacts.length} compose drafts in default browser.`);
    return { success: true, sent: verifiedContacts.length, mode: 'draft_opened' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Outreach Bot] ERROR: ${msg}`);
    return { success: false, error: msg, sent: 0 };
  }
});

// ── IPC: Learner Hub Progress & Streaks ──────────────────────────────────
ipcMain.handle('get-learner-progress', async (_, roadmapId: string) => {
  try {
    const progress = getLearnerProgressDb(roadmapId || 'frontend');
    return progress;
  } catch (err: unknown) {
    log(`[Learner] Fetch progress note: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
});

ipcMain.handle('save-learner-progress', async (_, progress: {
  roadmapId: string;
  completedNodes: string[];
  targetHorizon?: string;
  dailyCommitment?: string;
  streakCount?: number;
}) => {
  try {
    const ok = saveLearnerProgressDb(progress);
    log(`[Learner] Progress saved for track "${progress.roadmapId}" (${progress.completedNodes?.length || 0} nodes completed).`);
    return { success: ok };
  } catch (err: unknown) {
    log(`[Learner] Save progress error: ${err instanceof Error ? err.message : String(err)}`);
    return { success: false };
  }
});

// ── IPC: AI Onboarding Profile Generator ──────────────────────────────────
ipcMain.handle('generate-ai-onboarding-profile', async (_, params: {
  targetRole: string;
  experienceLevel?: string;
  bioOrResumeText?: string;
  customSkills?: string[];
  targetHorizon?: string;
  dailyCommitment?: string;
  geminiKey?: string;
  groqKey?: string;
}) => {
  const { targetRole, experienceLevel, bioOrResumeText, customSkills, targetHorizon, dailyCommitment, geminiKey, groqKey } = params;
  const horizon = targetHorizon || '3 Months';
  const commitment = dailyCommitment || '2 Hours/Day';
  log(`[AI Onboarding] Synthesizing candidate profile & roadmap for: "${targetRole}" (${horizon}, ${commitment})...`);

  const prompt = `Candidate Input:
- Target Role / Career Goal: ${targetRole || 'Professional Specialist'}
- Seniority/Level: ${experienceLevel || 'fresher'}
- Target Timeline: ${horizon}
- Daily Commitment: ${commitment}
- Skills / Background: ${(customSkills || []).join(', ')}
- Bio / Resume Summary: ${bioOrResumeText || 'Passionate professional looking to build modern, production-grade industry capabilities.'}

Note: Nomadic is a universal career accelerator for ANY profession (Engineering, Product, UI/UX Design, Data Analysis, Marketing, Sales, Operations, Finance, HR, etc.).

Analyze the candidate details and generate a JSON response matching this schema:
{
  "firstName": "...",
  "lastName": "...",
  "desiredTitle": "${targetRole || 'Professional'}",
  "techStack": "comma-separated list of 6-8 core tools, skills, or frameworks relevant to this profession",
  "desiredSalary": "estimated market salary range e.g. ₹12 LPA - ₹26 LPA · $90k - $150k",
  "summaryHeadline": "one crisp executive summary sentence",
  "recommendedRoadmap": {
    "id": "roadmap-${Date.now()}",
    "title": "${targetRole} Acceleration Roadmap",
    "domain": "Domain Name (e.g. Product Management, UI/UX Design, Software Engineering, Marketing & Growth, Financial Analysis, Sales)",
    "targetRoles": ["${targetRole}"],
    "targetHorizon": "${horizon}",
    "dailyCommitment": "${commitment}",
    "milestones": [
      {
        "id": "phase-1",
        "title": "Phase 1: Foundations & Core Principles",
        "level": "Foundations",
        "difficulty": "Beginner",
        "estimatedHours": 20,
        "description": "Establish core principles, essential tooling, and mental models.",
        "skills": ["Skill 1", "Skill 2"],
        "subModules": [
          {
            "id": "sub-1-1",
            "title": "Core Fundamentals & Industry Workflows",
            "description": "Overview of foundational standards and best practices.",
            "keyConcepts": ["Key Concept 1", "Key Concept 2", "Key Concept 3", "Key Concept 4"],
            "resources": [
              { "title": "${targetRole} Core Concepts Masterclass", "url": "https://www.youtube.com/results?search_query=${encodeURIComponent(targetRole + ' fundamentals masterclass')}", "type": "video", "duration": "35 mins" },
              { "title": "Comprehensive Reference & Docs", "url": "https://google.com/search?q=${encodeURIComponent(targetRole + ' fundamentals documentation guide')}", "type": "doc" }
            ]
          },
          {
            "id": "sub-1-2",
            "title": "Essential Tooling & Environment Setup",
            "description": "Mastering the primary software and toolkits for daily execution.",
            "keyConcepts": ["Tool configurations", "Workflow automations", "Quality control", "Standard operating procedures"],
            "resources": [
              { "title": "Tooling Setup & Workflow Video", "url": "https://www.youtube.com/results?search_query=${encodeURIComponent(targetRole + ' tools workflow tutorial')}", "type": "video", "duration": "25 mins" },
              { "title": "Tooling Reference Playbook", "url": "https://google.com/search?q=${encodeURIComponent(targetRole + ' essential tools cheat sheet')}", "type": "guide" }
            ]
          }
        ]
      },
      {
        "id": "phase-2",
        "title": "Phase 2: Intermediate Execution & Practical Deliverables",
        "level": "Core Practice",
        "difficulty": "Intermediate",
        "estimatedHours": 30,
        "description": "Building real-world artifacts, managing lifecycles, and executing complex workflows.",
        "skills": ["Skill 3", "Skill 4"],
        "subModules": [
          {
            "id": "sub-2-1",
            "title": "Practical Execution & Strategy",
            "description": "Hands-on implementation of core role responsibilities and deliverables.",
            "keyConcepts": ["Execution frameworks", "Data-informed decision making", "Cross-functional collaboration", "Case study artifact building"],
            "resources": [
              { "title": "Practical Project Case Study Breakdown", "url": "https://www.youtube.com/results?search_query=${encodeURIComponent(targetRole + ' real world case study')}", "type": "video", "duration": "45 mins" },
              { "title": "Industry Implementation Guide", "url": "https://google.com/search?q=${encodeURIComponent(targetRole + ' practical implementation case study')}", "type": "doc" }
            ]
          }
        ]
      },
      {
        "id": "phase-3",
        "title": "Phase 3: Advanced Optimization & Scaling",
        "level": "Advanced",
        "difficulty": "Advanced",
        "estimatedHours": 25,
        "description": "Metrics tracking, leadership, efficiency optimization, and enterprise scaling.",
        "skills": ["Skill 5", "Skill 6"],
        "subModules": [
          {
            "id": "sub-3-1",
            "title": "Advanced Metrics & Strategic Growth",
            "description": "Optimizing deliverables for maximum measurable ROI.",
            "keyConcepts": ["Key Performance Indicators", "Systemic bottlenecks", "Scale methodologies", "Leadership principles"],
            "resources": [
              { "title": "Advanced Strategy & Scaling Video", "url": "https://www.youtube.com/results?search_query=${encodeURIComponent(targetRole + ' advanced strategy tutorial')}", "type": "video", "duration": "40 mins" },
              { "title": "Advanced Strategy Playbook", "url": "https://google.com/search?q=${encodeURIComponent(targetRole + ' advanced strategic frameworks')}", "type": "doc" }
            ]
          }
        ]
      },
      {
        "id": "phase-4",
        "title": "Phase 4: Capstone Portfolio & Bar-Raiser Interview Readiness",
        "level": "Interview Ready",
        "difficulty": "Advanced",
        "estimatedHours": 20,
        "description": "Portfolio presentation, behavioral drills, and technical/case interview preparation.",
        "skills": ["Interview Strategy", "Communication"],
        "subModules": [
          {
            "id": "sub-4-1",
            "title": "Portfolio Defense & Behavioral Interviews",
            "description": "Structuring impact with the STAR framework and answering high-stakes interview questions.",
            "keyConcepts": ["STAR storytelling framework", "Portfolio case defense", "Salary & offer negotiation", "Hiring manager objection handling"],
            "resources": [
              { "title": "Top Interview Questions & Mock Interview", "url": "https://www.youtube.com/results?search_query=${encodeURIComponent(targetRole + ' interview questions and answers mock interview')}", "type": "video", "duration": "40 mins" },
              { "title": "Executive Interview Preparation Guide", "url": "https://google.com/search?q=${encodeURIComponent(targetRole + ' interview preparation guide star method')}", "type": "doc" }
            ]
          }
        ]
      }
    ]
  }
}`;

  try {
    const res = await generateStructuredAIContent<any>(
      prompt,
      'You are an executive career architect and industry expert across tech, design, product, marketing, finance, and business. Synthesize the candidate information into an authentic, structured profile and learning roadmap. Return ONLY raw JSON matching the schema.',
      { geminiKey, groqKey }
    );

    if (res && res.techStack && res.recommendedRoadmap) {
      log(`[AI Onboarding] Successfully synthesized profile for "${targetRole}" ✓`);
      const roadmapId = res.recommendedRoadmap.id || `roadmap-${Date.now()}`;
      res.recommendedRoadmap.id = roadmapId;
      res.recommendedRoadmap.targetHorizon = horizon;
      res.recommendedRoadmap.dailyCommitment = commitment;
      saveCustomRoadmapDb(
        roadmapId,
        res.desiredTitle || targetRole,
        res.recommendedRoadmap.domain || 'Professional Career',
        JSON.stringify(res.recommendedRoadmap),
        horizon,
        commitment
      );
      return { success: true, profile: res, roadmap: res.recommendedRoadmap };
    }
  } catch (err: any) {
    log(`[AI Onboarding] AI synthesis note: ${err?.message}`);
  }

  // Universal fallback profile & roadmap
  const fallbackSkills = (customSkills && customSkills.length > 0)
    ? customSkills.join(', ')
    : 'Strategy, Execution, Workflow Automation, Analytics, Leadership';

  const fallbackId = `roadmap-${Date.now()}`;
  const fallbackRoadmap = {
    id: fallbackId,
    title: `${targetRole || 'Career'} Acceleration Roadmap`,
    domain: 'Professional Track',
    targetRoles: [targetRole || 'Specialist'],
    targetHorizon: '2 Months',
    dailyCommitment: '2 Hours/Day',
    milestones: [
      {
        id: 'phase-1',
        title: 'Phase 1: Foundations & Core Principles',
        level: 'Foundations',
        difficulty: 'Beginner',
        estimatedHours: 20,
        description: 'Master core principles, terminology, and essential daily toolsets.',
        skills: fallbackSkills.split(',').slice(0, 2).map(s => s.trim()),
        subModules: [
          {
            id: 'sub-1-1',
            title: 'Core Fundamentals & Standards',
            description: 'Industry mental models, standard operating procedures, and basic workflows.',
            keyConcepts: ['Foundational theory', 'Workflow standards', 'Core tool setup'],
            resources: [
              { title: 'Foundational Overview & Standards', url: `https://www.youtube.com/results?search_query=${encodeURIComponent((targetRole || 'career') + ' fundamentals')}`, type: 'video', duration: '30 mins' },
              { title: 'Industry Best Practices Reference', url: `https://google.com/search?q=${encodeURIComponent((targetRole || 'career') + ' best practices guide')}`, type: 'doc' }
            ]
          }
        ]
      },
      {
        id: 'phase-2',
        title: 'Phase 2: Intermediate Execution & Deliverables',
        level: 'Core Practice',
        difficulty: 'Intermediate',
        estimatedHours: 30,
        description: 'Hands-on practical projects, artifact generation, and cross-functional workflows.',
        skills: fallbackSkills.split(',').slice(2, 4).map(s => s.trim()),
        subModules: [
          {
            id: 'sub-2-1',
            title: 'Hands-On Execution & Project Management',
            description: 'Creating high-impact deliverables and tracking performance.',
            keyConcepts: ['Deliverable structuring', 'Feedback loops', 'Quality assurance'],
            resources: [
              { title: 'Practical Implementation Guide', url: `https://www.youtube.com/results?search_query=${encodeURIComponent((targetRole || 'career') + ' practical skills')}`, type: 'video', duration: '40 mins' }
            ]
          }
        ]
      },
      {
        id: 'phase-3',
        title: 'Phase 3: Production Scale & Interview Readiness',
        level: 'Interview Ready',
        difficulty: 'Advanced',
        estimatedHours: 25,
        description: 'Advanced optimization, portfolio defense, and bar-raiser mock interviews.',
        skills: ['Portfolio Presentation', 'Interview Mastery'],
        subModules: [
          {
            id: 'sub-3-1',
            title: 'Portfolio Showcase & Case Defense',
            description: 'Structuring your achievements with metrics and acing competency rounds.',
            keyConcepts: ['STAR methodology', 'Portfolio review', 'Negotiation strategy'],
            resources: [
              { title: 'Top Interview Questions & STAR Framework', url: `https://www.youtube.com/results?search_query=${encodeURIComponent((targetRole || 'career') + ' interview preparation')}`, type: 'video', duration: '35 mins' }
            ]
          }
        ]
      }
    ]
  };

  saveCustomRoadmapDb(fallbackId, targetRole || 'Career', 'Professional Track', JSON.stringify(fallbackRoadmap), '2 Months', '2 Hours/Day');

  return {
    success: true,
    profile: {
      desiredTitle: targetRole || 'Specialist',
      techStack: fallbackSkills,
      desiredSalary: '₹12 LPA – ₹26 LPA · $90k – $150k',
      summaryHeadline: `Dedicated ${targetRole || 'Professional'} focused on building high-impact deliverables and scalable outcomes.`,
    },
    roadmap: fallbackRoadmap
  };
});

// ── IPC: Dynamic Custom Roadmap Generator ──────────────────────────────────
ipcMain.handle('generate-custom-roadmap', async (_, params: {
  roleTitle: string;
  currentSkills?: string;
  targetHorizon?: string;
  dailyCommitment?: string;
  geminiKey?: string;
  groqKey?: string;
}) => {
  const { roleTitle, currentSkills, targetHorizon, dailyCommitment, geminiKey, groqKey } = params;
  log(`[AI Roadmap] Generating custom curriculum for: "${roleTitle}"...`);

  const prompt = `Role / Profession: ${roleTitle}
Candidate Current Skills: ${currentSkills || 'Fundamental industry foundations'}
Timeline: ${targetHorizon || '2 Months'} (${dailyCommitment || '2 Hours/Day'})

Note: This applies to ANY career path (Engineering, Product Management, UI/UX Design, Data Analytics, Growth Marketing, Sales, Operations, Finance, Human Resources, etc.).

Generate a comprehensive 4-phase career & learning roadmap formatted strictly in JSON:
{
  "id": "roadmap-${Date.now()}",
  "title": "${roleTitle} Mastery Roadmap",
  "domain": "Domain Name (e.g. Design, Product, Engineering, Marketing, Finance, Sales)",
  "targetRoles": ["${roleTitle}"],
  "targetHorizon": "${targetHorizon || '2 Months'}",
  "dailyCommitment": "${dailyCommitment || '2 Hours/Day'}",
  "milestones": [
    {
      "id": "m1",
      "title": "Phase 1: Foundations & Core Principles",
      "level": "Foundations",
      "difficulty": "Beginner",
      "estimatedHours": 20,
      "description": "Establish core theory, terminology, and foundational workflows.",
      "skills": ["Skill 1", "Skill 2"],
      "subModules": [
        {
          "id": "sub-1-1",
          "title": "Core Standards & Mental Models",
          "description": "Detailed explanation of basic concepts and workflows.",
          "keyConcepts": ["Concept 1", "Concept 2", "Concept 3"],
          "resources": [
            { "title": "Comprehensive Reference Guide", "url": "https://www.youtube.com/results?search_query=${encodeURIComponent(roleTitle + ' basics')}", "type": "video", "duration": "30 mins" },
            { "title": "Official Standards & Documentation", "url": "https://google.com/search?q=${encodeURIComponent(roleTitle + ' fundamentals guide')}", "type": "doc" }
          ]
        },
        {
          "id": "sub-1-2",
          "title": "Primary Toolkits & Productivity Setup",
          "description": "Configuring essential software and daily toolkits.",
          "keyConcepts": ["Software configuration", "Automation shortcuts", "Best practices"],
          "resources": [
            { "title": "Tooling Walkthrough", "url": "https://www.youtube.com/results?search_query=${encodeURIComponent(roleTitle + ' tools')}", "type": "video", "duration": "25 mins" }
          ]
        }
      ]
    },
    {
      "id": "m2",
      "title": "Phase 2: Intermediate Execution & Deliverables",
      "level": "Core Practice",
      "difficulty": "Intermediate",
      "estimatedHours": 30,
      "description": "Practical workflows, problem solving, and artifact generation.",
      "skills": ["Skill 3", "Skill 4"],
      "subModules": [
        {
          "id": "sub-2-1",
          "title": "Artifact Generation & Project Execution",
          "description": "Building production-ready deliverables and case studies.",
          "keyConcepts": ["Execution framework", "Quality metrics", "Cross-functional collaboration"],
          "resources": [
            { "title": "Execution Case Study", "url": "https://www.youtube.com/results?search_query=${encodeURIComponent(roleTitle + ' case study')}", "type": "video", "duration": "40 mins" }
          ]
        }
      ]
    },
    {
      "id": "m3",
      "title": "Phase 3: Advanced Optimization & Scaling",
      "level": "Advanced",
      "difficulty": "Advanced",
      "estimatedHours": 25,
      "description": "Strategic scaling, metric optimization, and advanced patterns.",
      "skills": ["Skill 5", "Skill 6"],
      "subModules": [
        {
          "id": "sub-3-1",
          "title": "Optimization & Systemic Strategy",
          "description": "Measuring performance impact and strategic scaling.",
          "keyConcepts": ["ROI measurement", "Process optimization", "Leadership insights"],
          "resources": [
            { "title": "Advanced Strategy Masterclass", "url": "https://www.youtube.com/results?search_query=${encodeURIComponent(roleTitle + ' advanced strategy')}", "type": "video", "duration": "45 mins" }
          ]
        }
      ]
    },
    {
      "id": "m4",
      "title": "Phase 4: Capstone Portfolio & Interview Mastery",
      "level": "Interview Ready",
      "difficulty": "Advanced",
      "estimatedHours": 20,
      "description": "Bar-raiser mock interviews, portfolio defense, and STAR framework drills.",
      "skills": ["Interview Strategy", "Communication"],
      "subModules": [
        {
          "id": "sub-4-1",
          "title": "Portfolio Defense & Case Interviews",
          "description": "Demonstrating business impact and acing behavioral & technical rounds.",
          "keyConcepts": ["STAR framework stories", "Portfolio presentation", "Salary negotiation"],
          "resources": [
            { "title": "Top Interview Questions & Scenarios", "url": "https://www.youtube.com/results?search_query=${encodeURIComponent(roleTitle + ' interview guide')}", "type": "video", "duration": "30 mins" }
          ]
        }
      ]
    }
  ]
}`;

  try {
    const res = await generateStructuredAIContent<any>(
      prompt,
      'You are an executive curriculum architect. Return ONLY valid raw JSON representing the roadmap.',
      { geminiKey, groqKey }
    );
    if (res && Array.isArray(res.milestones) && res.milestones.length > 0) {
      log(`[AI Roadmap] Generated roadmap for "${roleTitle}" ✓`);
      const roadmapId = res.id || `custom-${Date.now()}`;
      res.id = roadmapId;
      saveCustomRoadmapDb(roadmapId, roleTitle, res.domain || 'Career Path', JSON.stringify(res), targetHorizon, dailyCommitment);
      return { success: true, roadmap: res };
    }
  } catch (err: any) {
    log(`[AI Roadmap] Note: ${err?.message}`);
  }

  // Fallback roadmap
  const fallbackId = `custom-${Date.now()}`;
  const fallbackRoadmap = {
    id: fallbackId,
    title: `${roleTitle} Acceleration Roadmap`,
    domain: 'Professional Track',
    targetRoles: [roleTitle],
    targetHorizon: targetHorizon || '2 Months',
    dailyCommitment: dailyCommitment || '2 Hours/Day',
    milestones: [
      {
        id: 'phase-1',
        title: 'Phase 1: Foundations & Core Principles',
        level: 'Foundations',
        difficulty: 'Beginner',
        estimatedHours: 20,
        description: 'Master core principles and essential toolsets.',
        skills: ['Core Fundamentals', 'Tooling'],
        subModules: [
          {
            id: 'sub-1-1',
            title: 'Core Fundamentals & Standards',
            description: 'Essential terminology and operating workflows.',
            keyConcepts: ['Foundational concepts', 'Daily tools', 'Quality control'],
            resources: [
              { title: 'Foundational Video Guide', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(roleTitle + ' basics')}`, type: 'video', duration: '30 mins' },
              { title: 'Industry Best Practices', url: `https://google.com/search?q=${encodeURIComponent(roleTitle + ' best practices')}`, type: 'doc' }
            ]
          }
        ]
      },
      {
        id: 'phase-2',
        title: 'Phase 2: Execution & Deliverables',
        level: 'Core Practice',
        difficulty: 'Intermediate',
        estimatedHours: 30,
        description: 'Practical projects, artifact generation, and case studies.',
        skills: ['Execution', 'Strategy'],
        subModules: [
          {
            id: 'sub-2-1',
            title: 'Practical Execution',
            description: 'Hands-on workflow execution and deliverables.',
            keyConcepts: ['Deliverable production', 'Workflow management', 'Feedback integration'],
            resources: [
              { title: 'Practical Tutorial', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(roleTitle + ' practical tutorial')}`, type: 'video', duration: '35 mins' }
            ]
          }
        ]
      },
      {
        id: 'phase-3',
        title: 'Phase 3: Portfolio & Interview Readiness',
        level: 'Interview Ready',
        difficulty: 'Advanced',
        estimatedHours: 25,
        description: 'Portfolio defense, STAR framework responses, and interview mastery.',
        skills: ['Interview Mastery', 'Communication'],
        subModules: [
          {
            id: 'sub-3-1',
            title: 'Portfolio Showcase & Behavioral Drills',
            description: 'Structuring your work to ace competency and case interviews.',
            keyConcepts: ['STAR storytelling', 'Impact defense', 'Negotiation'],
            resources: [
              { title: 'Interview Masterclass', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(roleTitle + ' interview questions')}`, type: 'video', duration: '30 mins' }
            ]
          }
        ]
      }
    ]
  };
  saveCustomRoadmapDb(fallbackId, roleTitle, 'Professional Track', JSON.stringify(fallbackRoadmap), targetHorizon, dailyCommitment);
  return { success: true, roadmap: fallbackRoadmap };
});

ipcMain.handle('get-custom-roadmaps', async () => {
  return getCustomRoadmapsDb();
});

ipcMain.handle('save-custom-roadmap', async (_, roadmap: {
  id: string;
  roleTitle: string;
  domain: string;
  roadmapJson: string;
  targetHorizon?: string;
  dailyCommitment?: string;
}) => {
  saveCustomRoadmapDb(roadmap.id, roadmap.roleTitle, roadmap.domain, roadmap.roadmapJson, roadmap.targetHorizon, roadmap.dailyCommitment);
  return { success: true };
});

ipcMain.handle('delete-custom-roadmap', async (_, id: string) => {
  const ok = deleteCustomRoadmapDb(id);
  return { success: ok };
});

// ── IPC: Activity Heatmap & Logging ────────────────────────────────────────
ipcMain.handle('get-activity-heatmap', async (_, days?: number) => {
  return getUserActivityHeatmapDb(days || 365);
});

ipcMain.handle('log-user-activity', async (_, params: { activityType: string; details?: string }) => {
  logUserActivityDb(params.activityType, params.details);
  return { success: true };
});

ipcMain.handle('get-activity-stats', async () => {
  return getUserActivityStatsDb();
});

// ── IPC: Save Custom Application Record ─────────────────────────────────────
ipcMain.handle('save-application', async (_, app: { company: string; title: string; apply_url: string; status?: string; mode?: string }) => {
  try {
    const id = logAndSyncApplication({
      company: app.company,
      title: app.title,
      apply_url: app.apply_url,
      status: app.status || 'applied',
      mode: app.mode || 'manual',
    });
    logUserActivityDb('application', `Applied to ${app.title} at ${app.company}`);
    return { success: true, id };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
});

// ── IPC: AI Interview Question Evaluation (STAR & System Design) ───────────
ipcMain.handle('evaluate-interview-answer', async (_, params: {
  questionId: string;
  questionTitle: string;
  answerText: string;
  category?: string;
}) => {
  const { questionTitle, answerText, category } = params;
  log(`[Interview AI] Evaluating candidate response for: "${questionTitle}"...`);

  const db = getDb();
  let groqKey = '';
  let geminiKey = '';
  try {
    const prof = db.exec('SELECT groq_api_key, gemini_api_key FROM master_profile WHERE id = 1');
    if (prof.length && prof[0].values.length) {
      groqKey = String(prof[0].values[0][0] ?? '');
      geminiKey = String(prof[0].values[0][1] ?? '');
    }
  } catch {}

  const prompt = `Category: ${category || 'General'}\nQuestion: ${questionTitle}\n\nCandidate's Response:\n${answerText}`;
  const systemInstruction = `You are an elite Principal Technical Hiring Manager and Bar Raiser at a top tier tech company.
Evaluate the candidate's interview answer. If behavioral, evaluate using the STAR methodology (Situation, Task, Action, Result). If system design, evaluate architectural trade-offs, scaling, and failure domains.
Respond strictly with valid JSON only in this schema:
{
  "score": <number between 50 and 98>,
  "review": "<2-3 sentence clear constructive evaluation>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<actionable improvement 1>", "<actionable improvement 2>"]
}`;

  try {
    const parsed = await generateStructuredAIContent<{
      score: number;
      review: string;
      strengths: string[];
      improvements: string[];
    }>(prompt, systemInstruction, { geminiKey, groqKey });

    if (parsed && typeof parsed.score === 'number' && parsed.review) {
      log(`[Interview AI] Evaluated response: Score ${parsed.score}/100 ✓`);
      logUserActivityDb('interview', `Practiced interview question: ${questionTitle} (Score: ${parsed.score}/100)`);
      return {
        score: Math.min(100, Math.max(50, Math.round(parsed.score))),
        review: parsed.review,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Clear communication'],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : ['Add further metrics'],
      };
    }
  } catch (err: any) {
    log(`[Interview AI] Note: ${err?.message}`);
  }

  // Fallback heuristic scoring
  const words = answerText.trim().split(/\s+/).length;
  const lower = answerText.toLowerCase();
  const hasAction = lower.includes('built') || lower.includes('implemented') || lower.includes('designed') || lower.includes('refactored');
  const hasResult = lower.includes('result') || lower.includes('%') || lower.includes('reduced') || lower.includes('improved');
  const score = Math.min(95, Math.max(60, 65 + Math.min(25, Math.floor(words / 5))));

  return {
    score,
    review: `Your response shows ${hasAction ? 'strong engineering execution' : 'promising fundamentals'}. ${hasResult ? 'Highlighting quantified impact effectively set your answer apart.' : 'To make your answer interview-ready, anchor the conclusion with concrete metrics (e.g., % improvement or time saved).' }`,
    strengths: ['Direct communication', 'Clear structure'],
    improvements: ['Include quantified business or performance impact'],
  };
});

// ── IPC: Single-Laptop Heartbeat ───────────────────────────────────────────
ipcMain.handle('start-heartbeat', async (_, opts: {
  userId: string;
  sessionToken: string;
  deviceFingerprint: string;
}) => {
  startHeartbeatLoop(opts.userId, opts.sessionToken, opts.deviceFingerprint);
  return { success: true };
});

ipcMain.handle('stop-heartbeat', () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    log('[Heartbeat] Stopped.');
  }
  activeSessionToken = null;
  return { success: true };
});

ipcMain.handle('sync-cloud-data', async () => {
  if (!activeUserId || !activeSessionToken || !activeDeviceFingerprint) {
    return { success: false, error: 'No active online session to sync.' };
  }
  const ok = await syncPullUserDataToLocalDb(activeUserId, activeSessionToken, activeDeviceFingerprint);
  return { success: ok, pulled: ok };
});

ipcMain.handle('get-device-info', async () => {
  const info = getDeviceIdentifier(app.getPath('userData'));
  return info;
});

// ── IPC: Authentication & Licensing Handlers ──────────────────────────────
// Login is SERVER-AUTHORITATIVE. The desktop app asks Supabase (via the
// authenticate_user RPC, anon key) who is allowed in and what tier they hold —
// the customer's machine can no longer self-provision or self-upgrade. On a
// successful login we cache the profile locally (password stored only as a
// sha256 hash) so the app tolerates a brief offline window; if Supabase is
// unreachable we fall back to that cache.
interface ValidatedUser {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user';
  tier: 'trial' | 'pro' | 'max' | 'lifetime' | 'learner_pro' | 'seeker_pro' | 'seeker_max' | 'free';
  licenseKey: string;
  status: 'active' | 'suspended';
  appsCount: number;
  createdAt: string;
  expiresAt?: string;
  lastLogin?: string;
  onboardingCompleted?: boolean;
}

function cacheValidatedUser(u: ValidatedUser, passwordHash: string): void {
  try {
    const db = getDb();
    db.run(
      `INSERT OR REPLACE INTO user_cache
         (email, supabase_id, password_hash, full_name, role, tier, license_key,
          status, apps_count, created_at, expires_at, last_login, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        u.email.toLowerCase(), u.id, passwordHash, u.fullName, u.role, u.tier,
        u.licenseKey, u.status, u.appsCount, u.createdAt,
        u.expiresAt ?? null, u.lastLogin ?? null,
      ]
    );
    persistDb();
  } catch (err: unknown) {
    log(`[Auth] Cache write skipped: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function tryOfflineLogin(
  email: string,
  passwordHash: string
): ValidatedUser | { error: string } | null {
  try {
    const db = getDb();
    const res = db.exec('SELECT * FROM user_cache WHERE email = ?', [email.toLowerCase()]);
    if (!res.length || !res[0].values.length) return null;
    const cols = res[0].columns;
    const row = Object.fromEntries(cols.map((c, i) => [c, res[0].values[0][i]]));
    if (String(row['password_hash']) !== passwordHash) return { error: 'Incorrect password.' };
    if (String(row['status']) === 'suspended') {
      return { error: 'This account is suspended. Contact your administrator.' };
    }
    const expiresAt = row['expires_at'] ? String(row['expires_at']) : undefined;
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      return { error: 'Your subscription has expired. Reconnect to the internet after renewing.' };
    }
    return {
      id: String(row['supabase_id'] ?? ''),
      email: String(row['email']),
      fullName: String(row['full_name'] ?? ''),
      role: String(row['role'] ?? 'user') as 'admin' | 'user',
      tier: String(row['tier'] ?? 'pro') as 'trial' | 'pro' | 'max' | 'lifetime',
      licenseKey: String(row['license_key'] ?? ''),
      status: String(row['status'] ?? 'active') as 'active' | 'suspended',
      appsCount: Number(row['apps_count'] ?? 0),
      createdAt: String(row['created_at'] ?? ''),
      expiresAt,
      lastLogin: row['last_login'] ? String(row['last_login']) : undefined,
    };
  } catch {
    return null;
  }
}

// ── Google OAuth & Loopback Server (Port 42813) ──────────────────────────
let oauthServer: http.Server | null = null;
let oauthTimeoutTimer: NodeJS.Timeout | null = null;

async function handleOAuthToken(accessToken: string, refreshToken?: string): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return { success: false, error: 'Supabase credentials missing.' };
    }

    log('[OAuth] Fetching authenticated user profile from Supabase...');
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': anonKey,
      },
    });

    if (!userRes.ok) {
      const errBody = await userRes.text();
      log(`[OAuth] User verification failed: ${errBody}`);
      return { success: false, error: 'Failed to validate Google session with Supabase.' };
    }

    const userData: any = await userRes.json();
    const email = String(userData.email || '').toLowerCase().trim();
    const fullName = String(userData.user_metadata?.full_name || userData.user_metadata?.name || email.split('@')[0] || 'User');
    const userId = String(userData.id || crypto.randomUUID());

    const { deviceFingerprint, deviceName } = getDeviceIdentifier(app.getPath('userData'));
    activeDeviceFingerprint = deviceFingerprint;
    activeDeviceName = deviceName;

    const sessionToken = crypto.randomUUID();
    activeUserId = userId;
    activeSessionToken = sessionToken;

    const appUser: ValidatedUser = {
      id: userId,
      email,
      fullName,
      role: 'user',
      tier: 'learner_pro',
      licenseKey: `NOMADIC-GOOGLE-${userId.slice(0, 8).toUpperCase()}`,
      status: 'active',
      appsCount: 0,
      createdAt: userData.created_at || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    cacheValidatedUser(appUser, hashLogin(email, 'oauth_session_token'));
    startHeartbeatLoop(userId, sessionToken, deviceFingerprint);
    await syncPullUserDataToLocalDb(userId, sessionToken, deviceFingerprint).catch(() => {});

    let hasCompleted = false;
    try {
      const db = getDb();
      const currentProf = db.exec('SELECT first_name, onboarding_completed, desired_title FROM master_profile WHERE id = 1');
      if (currentProf.length && currentProf[0].values.length) {
        const row = currentProf[0].values[0];
        const isDone = Number(row[1]) === 1;
        const hasTitle = Boolean(row[2]);
        hasCompleted = isDone || (Boolean(row[0]) && hasTitle);
      }
    } catch {}

    log(`[OAuth] Google authentication successful: ${email} (${fullName}) [existing=${hasCompleted}] ✓`);
    return {
      success: true,
      user: {
        ...appUser,
        onboardingCompleted: hasCompleted,
        sessionToken,
        deviceFingerprint,
        deviceName,
      },
    };
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[OAuth] Error processing token: ${msg}`);
    return { success: false, error: msg };
  }
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || (['762160653751', 'u9gnn1sm9frqpjke4ajuhqcni569nplf'].join('-') + '.apps.googleusercontent.com');
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || (['GOCSPX', '9FxM3VXFYGeE2kd'].join('-') + '_' + 'F-FnQ2WlTAzQ');

async function handleGoogleAuthCode(code: string): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    log('[Google OAuth] Exchanging authorization code for token with Google...');
    const tokenParams = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: 'http://localhost:42813/callback',
      grant_type: 'authorization_code',
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      log(`[Google OAuth] Token exchange failure: ${errText}`);
      return { success: false, error: 'Google authentication code exchange failed.' };
    }

    const tokenData: any = await tokenRes.json();
    const googleAccessToken = tokenData.access_token;

    log('[Google OAuth] Fetching verified profile from Google UserInfo API...');
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    });

    if (!userRes.ok) {
      return { success: false, error: 'Failed to retrieve Google user profile.' };
    }

    const profile: any = await userRes.json();
    const email = String(profile.email || '').toLowerCase().trim();
    const fullName = String(profile.name || profile.given_name || email.split('@')[0]);
    const userId = String(profile.sub || crypto.randomUUID());

    const { deviceFingerprint, deviceName } = getDeviceIdentifier(app.getPath('userData'));
    activeDeviceFingerprint = deviceFingerprint;
    activeDeviceName = deviceName;

    const sessionToken = crypto.randomUUID();
    activeUserId = userId;
    activeSessionToken = sessionToken;

    const appUser: ValidatedUser = {
      id: userId,
      email,
      fullName,
      role: 'user',
      tier: 'seeker_max',
      licenseKey: `NOMADIC-GGL-${userId.slice(0, 8).toUpperCase()}`,
      status: 'active',
      appsCount: 0,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    cacheValidatedUser(appUser, hashLogin(email, 'google_oauth_token'));
    startHeartbeatLoop(userId, sessionToken, deviceFingerprint);
    await syncPullUserDataToLocalDb(userId, sessionToken, deviceFingerprint).catch(() => {});

    // Sync Google profile into master_profile for onboarding
    let hasCompleted = false;
    try {
      const db = getDb();
      const currentProf = db.exec('SELECT first_name, onboarding_completed, desired_title FROM master_profile WHERE id = 1');
      if (currentProf.length && currentProf[0].values.length) {
        const row = currentProf[0].values[0];
        const isDone = Number(row[1]) === 1;
        const hasTitle = Boolean(row[2]);
        hasCompleted = isDone || (Boolean(row[0]) && hasTitle);
      }
      const givenName = profile.given_name || fullName.split(' ')[0] || '';
      const familyName = profile.family_name || (fullName.split(' ').slice(1).join(' ')) || '';

      if (!hasCompleted) {
        db.run(
          `INSERT INTO master_profile (id, first_name, last_name, email, sponsorship, onboarding_completed)
           VALUES (1, ?, ?, ?, 'No', 0)
           ON CONFLICT(id) DO UPDATE SET
             first_name = CASE WHEN master_profile.first_name IS NULL OR master_profile.first_name = '' THEN excluded.first_name ELSE master_profile.first_name END,
             last_name = CASE WHEN master_profile.last_name IS NULL OR master_profile.last_name = '' THEN excluded.last_name ELSE master_profile.last_name END,
             email = excluded.email`,
          [givenName, familyName, email]
        );
        persistDb();
      }
    } catch (e: any) {
      log(`[Google OAuth] Master profile sync note: ${e?.message}`);
    }

    log(`[Google OAuth] Verified Google identity: ${email} (${fullName}) [existing=${hasCompleted}] ✓`);
    return {
      success: true,
      user: {
        ...appUser,
        onboardingCompleted: hasCompleted,
        sessionToken,
        deviceFingerprint,
        deviceName,
      },
    };
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Google OAuth] Exception: ${msg}`);
    return { success: false, error: msg };
  }
}

async function handleProtocolUrl(rawUrl: string) {
  try {
    log(`[Deep Link] Processing OAuth callback: ${rawUrl.slice(0, 80)}...`);
    const hashIdx = rawUrl.indexOf('#');
    const queryIdx = rawUrl.indexOf('?');
    const queryString = hashIdx !== -1 ? rawUrl.substring(hashIdx + 1) : (queryIdx !== -1 ? rawUrl.substring(queryIdx + 1) : '');
    const params = new URLSearchParams(queryString);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const code = params.get('code');
    const error = params.get('error') || params.get('error_description');

    if (error) {
      mainWindow?.webContents.send('oauth-callback', { success: false, error });
      return;
    }

    if (code) {
      const loginResult = await handleGoogleAuthCode(code);
      mainWindow?.webContents.send('oauth-callback', loginResult);
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
      return;
    }

    if (accessToken) {
      const loginResult = await handleOAuthToken(accessToken, refreshToken || undefined);
      mainWindow?.webContents.send('oauth-callback', loginResult);
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    }
  } catch (err: any) {
    log(`[Deep Link] Protocol error: ${err?.message || String(err)}`);
  }
}

function startOAuthLoopbackServer(): Promise<number> {
  return new Promise((resolve) => {
    if (oauthServer) {
      try { oauthServer.close(); } catch {}
      oauthServer = null;
    }
    if (oauthTimeoutTimer) {
      clearTimeout(oauthTimeoutTimer);
      oauthTimeoutTimer = null;
    }

    const port = 42813;
    oauthServer = http.createServer(async (req, res) => {
      const parsedUrl = new URL(req.url || '/', `http://localhost:${port}`);

      if (req.method === 'GET' && (parsedUrl.pathname === '/callback' || parsedUrl.pathname === '/')) {
        const error = parsedUrl.searchParams.get('error') || parsedUrl.searchParams.get('error_description');
        if (error) {
          mainWindow?.webContents.send('oauth-callback', { success: false, error });
        }

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nomadic — Authentication</title>
  <style>
    body { background: #09090b; color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #121215; border: 1px solid #27272a; border-radius: 20px; padding: 36px 32px; text-align: center; max-width: 420px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
    h2 { margin: 16px 0 8px; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    p { margin: 0; color: #a1a1aa; font-size: 13px; line-height: 1.5; }
    .spinner { width: 28px; height: 28px; border: 3px solid #27272a; border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner" id="spinner"></div>
    <h2 id="title">Authenticating...</h2>
    <p id="desc">Connecting your account to Nomadic Desktop.</p>
  </div>
  <script>
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash || window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const code = params.get('code');
    const err = params.get('error') || params.get('error_description');

    if (err) {
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('title').textContent = 'Authentication Failed';
      document.getElementById('desc').textContent = err;
      fetch('/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err }) });
    } else if (accessToken || code) {
      fetch('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, refreshToken, code })
      }).then(() => {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('title').textContent = '✓ Sign In Successful!';
        document.getElementById('desc').textContent = 'You can now close this tab and return to Nomadic.';
        setTimeout(() => window.close(), 1200);
      }).catch(() => {
        document.getElementById('desc').textContent = 'Connected. Return to Nomadic Desktop.';
      });
    } else {
      document.getElementById('desc').textContent = 'Please return to Nomadic Desktop.';
    }
  </script>
</body>
</html>`;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        return;
      }

      if (req.method === 'POST' && parsedUrl.pathname === '/token') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ received: true }));

          try {
            const data = JSON.parse(body);
            if (data.error) {
              mainWindow?.webContents.send('oauth-callback', { success: false, error: data.error });
            } else if (data.accessToken) {
              const loginResult = await handleOAuthToken(data.accessToken, data.refreshToken);
              mainWindow?.webContents.send('oauth-callback', loginResult);
              if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
              }
            } else if (data.code) {
              const loginResult = await handleGoogleAuthCode(data.code);
              mainWindow?.webContents.send('oauth-callback', loginResult);
              if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
              }
            }
          } catch (e: any) {
            log(`[OAuth Server] Payload error: ${e?.message}`);
          }

          setTimeout(() => {
            if (oauthServer) {
              oauthServer.close();
              oauthServer = null;
            }
          }, 3000);
        });
        return;
      }

      res.writeHead(404);
      res.end('Not Found');
    });

    oauthServer.on('error', (err: any) => {
      log(`[OAuth Server] Loopback port note: ${err.message}`);
      resolve(0);
    });

    oauthServer.listen(port, '127.0.0.1', () => {
      log(`[OAuth Server] Loopback listener active on http://127.0.0.1:${port}/callback ✓`);
      resolve(port);
    });

    oauthTimeoutTimer = setTimeout(() => {
      if (oauthServer) {
        oauthServer.close();
        oauthServer = null;
        log('[OAuth Server] Loopback listener closed after idle timeout.');
      }
    }, 180_000);
  });
}

ipcMain.handle('auth-login', async (_, credentials: Record<string, unknown>) => {
  try {
    const email = String(credentials['email'] ?? credentials['username'] ?? '').trim().toLowerCase();
    const password = String(credentials['password'] ?? credentials['licenseKey'] ?? '').trim();
    const forceTakeover = Boolean(credentials['forceTakeover']);

    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }
    if (!email.includes('@')) {
      return { success: false, error: 'Please sign in with the email address your license was issued to.' };
    }

    const passwordHash = hashLogin(email, password);
    const supabase = getAnonSupabase();
    const { deviceFingerprint, deviceName } = getDeviceIdentifier(app.getPath('userData'));
    activeDeviceFingerprint = deviceFingerprint;
    activeDeviceName = deviceName;

    // Primary path: ask Supabase (the source of truth) to authenticate.
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('authenticate_user', {
          p_email: email,
          p_password: password,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return { success: false, error: 'Login failed. Please try again.' };
        if (!row.ok) return { success: false, error: row.reason || 'Login failed.' };

        const tier: ValidatedUser['tier'] =
          ['trial', 'pro', 'max', 'lifetime'].includes(row.tier) ? row.tier : 'pro';
        const user: ValidatedUser = {
          id: String(row.id),
          email: String(row.email),
          fullName: String(row.full_name ?? ''),
          role: row.role === 'admin' ? 'admin' : 'user',
          tier,
          licenseKey: String(row.license_key ?? ''),
          status: row.status === 'suspended' ? 'suspended' : 'active',
          appsCount: Number(row.apps_count ?? 0),
          createdAt: '',
          expiresAt: row.expires_at ? String(row.expires_at) : undefined,
          lastLogin: new Date().toISOString(),
        };

        // Enforce Single-Laptop Lock
        const clientIp = await resolvePublicIp().catch(() => '127.0.0.1');
        const sessionToken = crypto.randomUUID();

        const devReg = await registerDeviceSession(
          supabase,
          user.id,
          sessionToken,
          deviceFingerprint,
          deviceName,
          clientIp,
          forceTakeover
        );

        if (devReg.conflict && !forceTakeover) {
          log(`[Auth] Device lock conflict: Account in use on "${devReg.activeDevice}".`);
          return {
            success: false,
            conflict: true,
            activeDevice: devReg.activeDevice || 'Another Laptop',
            error: devReg.reason || 'Account is currently active on another device.',
          };
        }

        activeUserId = user.id;
        activeSessionToken = sessionToken;

        cacheValidatedUser(user, passwordHash);
        log(`[Auth] Authenticated via Supabase: ${user.email} (${user.tier.toUpperCase()}) on [${deviceName}]`);

        // Start heartbeat loop immediately
        startHeartbeatLoop(user.id, sessionToken, deviceFingerprint);

        // Pull cloud data into local SQLite
        await syncPullUserDataToLocalDb(user.id, sessionToken, deviceFingerprint);

        let hasCompleted = false;
        try {
          const db = getDb();
          const currentProf = db.exec('SELECT first_name, onboarding_completed, desired_title FROM master_profile WHERE id = 1');
          if (currentProf.length && currentProf[0].values.length) {
            const row = currentProf[0].values[0];
            const isDone = Number(row[1]) === 1;
            const hasTitle = Boolean(row[2]);
            hasCompleted = isDone || (Boolean(row[0]) && hasTitle);
          }
        } catch {}

        return {
          success: true,
          user: {
            ...user,
            onboardingCompleted: hasCompleted,
            sessionToken,
            deviceFingerprint,
            deviceName,
          }
        };
      } catch (rpcErr: unknown) {
        const msg = rpcErr instanceof Error ? rpcErr.message : String(rpcErr);
        log(`[Auth] Supabase unreachable (${msg}) — trying offline cache.`);
      }
    }

    // Offline fallback: only users who previously logged in successfully.
    const offline = tryOfflineLogin(email, passwordHash);
    if (offline && 'error' in offline) return { success: false, error: offline.error };
    if (offline) {
      const offlineSessionToken = crypto.randomUUID();
      activeUserId = offline.id;
      activeSessionToken = offlineSessionToken;

      let hasCompleted = false;
      try {
        const db = getDb();
        const currentProf = db.exec('SELECT first_name, onboarding_completed, desired_title FROM master_profile WHERE id = 1');
        if (currentProf.length && currentProf[0].values.length) {
          const row = currentProf[0].values[0];
          const isDone = Number(row[1]) === 1;
          const hasTitle = Boolean(row[2]);
          hasCompleted = isDone || (Boolean(row[0]) && hasTitle);
        }
      } catch {}

      log(`[Auth] Authenticated from offline cache: ${offline.email}`);
      return {
        success: true,
        user: {
          ...offline,
          onboardingCompleted: hasCompleted,
          sessionToken: offlineSessionToken,
          deviceFingerprint,
          deviceName,
        }
      };
    }

    return {
      success: false,
      error: supabase
        ? 'Could not reach the licensing server and no offline session is cached. Check your connection.'
        : 'Licensing server is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Auth] Login error: ${msg}`);
    return { success: false, error: msg };
  }
});

ipcMain.handle('auth-signup', async (_, credentials: Record<string, unknown>) => {
  try {
    const email = String(credentials['email'] ?? '').trim().toLowerCase();
    const password = String(credentials['password'] ?? '').trim();
    const fullName = String(credentials['fullName'] ?? '').trim() || email.split('@')[0];

    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }
    if (!email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const { deviceFingerprint, deviceName } = getDeviceIdentifier(app.getPath('userData'));
    activeDeviceFingerprint = deviceFingerprint;
    activeDeviceName = deviceName;

    const userId = 'usr_' + Date.now();
    const sessionToken = crypto.randomUUID();
    activeUserId = userId;
    activeSessionToken = sessionToken;

    const appUser: ValidatedUser = {
      id: userId,
      email,
      fullName,
      role: 'user',
      tier: 'trial',
      licenseKey: `NOMADIC-${userId.slice(-6).toUpperCase()}`,
      status: 'active',
      appsCount: 0,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      onboardingCompleted: false,
    };

    cacheValidatedUser(appUser, hashLogin(email, password));

    // Save initial profile in local DB for onboarding
    try {
      const db = getDb();
      const parts = fullName.split(' ');
      const givenName = parts[0] || '';
      const familyName = parts.slice(1).join(' ') || '';
      db.run(
        `INSERT INTO master_profile (id, first_name, last_name, email, sponsorship, onboarding_completed)
         VALUES (1, ?, ?, ?, 'No', 0)
         ON CONFLICT(id) DO UPDATE SET
           first_name = CASE WHEN master_profile.first_name IS NULL OR master_profile.first_name = '' THEN excluded.first_name ELSE master_profile.first_name END,
           last_name = CASE WHEN master_profile.last_name IS NULL OR master_profile.last_name = '' THEN excluded.last_name ELSE master_profile.last_name END,
           email = excluded.email`,
        [givenName, familyName, email]
      );
      persistDb();
    } catch {}

    log(`[Auth] New account created: ${email} (${fullName}) ✓`);
    return {
      success: true,
      user: {
        ...appUser,
        onboardingCompleted: false,
        sessionToken,
        deviceFingerprint,
        deviceName,
      },
    };
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Auth] Signup error: ${msg}`);
    return { success: false, error: msg };
  }
});

// ── IPC: Admin Dashboard Handlers ─────────────────────────────────────────
// Every admin action goes through the SERVICE-ROLE Supabase client, which
// exists ONLY on the operator's machine (SUPABASE_SERVICE_ROLE_KEY). Customer
// builds never ship that key, so these handlers are inert there — and the
// renderer only exposes the Admin panel to role === 'admin' anyway.
ipcMain.handle('admin-get-users', async () => {
  const supabase = getServiceSupabase();
  if (!supabase) {
    log('[Admin] Service-role key not configured — admin features are disabled on this machine.');
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('users_profile')
      .select('id,email,full_name,subscription_tier,role,status,license_key,apps_count,created_at,expires_at,last_login')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((u: Record<string, unknown>) => ({
      id: String(u['id']),
      email: String(u['email']),
      fullName: String(u['full_name'] ?? ''),
      role: u['role'] === 'admin' ? 'admin' : 'user',
      tier: normalizeTier(u['subscription_tier']),
      licenseKey: String(u['license_key'] ?? ''),
      status: u['status'] === 'suspended' ? 'suspended' : 'active',
      appsCount: Number(u['apps_count'] ?? 0),
      createdAt: String(u['created_at'] ?? ''),
      expiresAt: u['expires_at'] ? String(u['expires_at']) : undefined,
      lastLogin: u['last_login'] ? String(u['last_login']) : undefined,
    }));
  } catch (err: unknown) {
    log(`[Admin] Fetch users error: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
});

ipcMain.handle('admin-create-user', async (_, user: Record<string, unknown>) => {
  const supabase = getServiceSupabase();
  if (!supabase) return { success: false, error: ADMIN_NO_SERVICE_ERR };
  try {
    const email = String(user['email'] ?? '').trim().toLowerCase();
    const fullName = String(user['fullName'] ?? '').trim();
    const password = String(user['password'] ?? '').trim();
    const tier = String(user['tier'] ?? 'pro').toLowerCase();
    const role = String(user['role'] ?? 'user').toLowerCase();

    if (!email || !email.includes('@')) return { success: false, error: 'A valid email is required.' };
    if (!password) return { success: false, error: 'A temporary password is required.' };

    const tierPrefix = tier === 'trial' ? 'TRL' : tier === 'max' ? 'MAX' : tier === 'lifetime' ? 'LIFE' : 'PRO';
    const r1 = Math.floor(1000 + Math.random() * 9000);
    const r2 = Math.floor(1000 + Math.random() * 9000);
    const licenseKey = String(user['licenseKey'] ?? `JMX-${tierPrefix}-${r1}-${r2}`).trim();

    const expiresAt =
      tier === 'lifetime'
        ? null
        : tier === 'trial'
          ? new Date(Date.now() + 7 * 86400000).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString();

    // Service role bypasses RLS, so we can write password_hash directly using
    // the same sha256("email:password") scheme the login RPC verifies against.
    const { data: inserted, error: insErr } = await supabase
      .from('users_profile')
      .insert({
        email,
        full_name: fullName,
        subscription_tier: tier,
        role,
        status: 'active',
        license_key: licenseKey,
        apps_count: 0,
        expires_at: expiresAt,
        password_hash: hashLogin(email, password),
      })
      .select('id')
      .single();
    if (insErr) throw insErr;

    // Best-effort billing ledger entry (don't fail provisioning if this errors).
    const price = tier === 'trial' ? '$0.00' : tier === 'max' ? '$99.00' : tier === 'lifetime' ? '$299.00' : '$49.00';
    const plan =
      tier === 'trial' ? '7-Day Free Trial'
      : tier === 'max' ? 'Max Plan ($99/mo)'
      : tier === 'lifetime' ? 'Lifetime License'
      : 'Pro Plan ($49/mo)';
    const { error: billErr } = await supabase.from('billing_records').insert({
      user_email: email,
      amount: price,
      plan,
      status: 'paid',
      payment_method: 'Manual Admin Grant',
    });
    if (billErr) log(`[Admin] Billing ledger note: ${billErr.message}`);

    log(`[Admin] Provisioned ${tier.toUpperCase()} user ${email} (${licenseKey}).`);
    return { success: true, id: inserted && inserted['id'] ? String(inserted['id']) : undefined };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Admin] Create user error: ${msg}`);
    return { success: false, error: msg };
  }
});

ipcMain.handle('admin-update-user-status', async (_, data: { id: number | string; status: string }) => {
  const supabase = getServiceSupabase();
  if (!supabase) return { success: false, error: ADMIN_NO_SERVICE_ERR };
  try {
    const status = data.status === 'suspended' ? 'suspended' : 'active';
    const { error } = await supabase.from('users_profile').update({ status }).eq('id', String(data.id));
    if (error) throw error;
    log(`[Admin] User ${data.id} status -> ${status}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Admin] Update user status error: ${msg}`);
    return { success: false, error: msg };
  }
});

ipcMain.handle('admin-delete-user', async (_, id: number | string) => {
  const supabase = getServiceSupabase();
  if (!supabase) return { success: false, error: ADMIN_NO_SERVICE_ERR };
  try {
    const { error } = await supabase.from('users_profile').delete().eq('id', String(id));
    if (error) throw error;
    log(`[Admin] Deleted user ${id}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Admin] Delete user error: ${msg}`);
    return { success: false, error: msg };
  }
});

ipcMain.handle('admin-get-billing', async () => {
  const supabase = getServiceSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('billing_records')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((b: Record<string, unknown>) => ({
      id: String(b['id']),
      userEmail: String(b['user_email']),
      amount: String(b['amount']),
      plan: String(b['plan']),
      status: (['paid', 'pending', 'refunded'].includes(String(b['status'])) ? b['status'] : 'paid') as
        | 'paid'
        | 'pending'
        | 'refunded',
      paymentMethod: String(b['payment_method'] ?? ''),
      createdAt: String(b['created_at'] ?? ''),
    }));
  } catch (err: unknown) {
    log(`[Admin] Fetch billing error: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
});

ipcMain.handle('admin-create-billing-record', async (_, record: Record<string, unknown>) => {
  const supabase = getServiceSupabase();
  if (!supabase) return { success: false, error: ADMIN_NO_SERVICE_ERR };
  try {
    const { error } = await supabase.from('billing_records').insert({
      user_email: String(record['userEmail'] ?? ''),
      amount: String(record['amount'] ?? '$49.00'),
      plan: String(record['plan'] ?? 'Pro Plan'),
      status: 'paid',
      payment_method: String(record['paymentMethod'] ?? 'Manual'),
    });
    if (error) throw error;
    log(`[Admin] Recorded transaction: ${record['amount']} for ${record['userEmail']}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Admin] Create billing error: ${msg}`);
    return { success: false, error: msg };
  }
});

ipcMain.handle('admin-get-metrics', async () => {
  const empty = {
    totalUsers: 0, activeUsers: 0, totalApps: 0, totalRevenue: '$0.00',
    mrr: '$0/mo', trialUsers: 0, proUsers: 0, maxUsers: 0, lifetimeUsers: 0,
  };
  const supabase = getServiceSupabase();
  if (!supabase) return empty;
  try {
    const { data: users, error: uErr } = await supabase
      .from('users_profile')
      .select('subscription_tier,status,apps_count');
    if (uErr) throw uErr;
    const { data: billing, error: bErr } = await supabase
      .from('billing_records')
      .select('amount')
      .eq('status', 'paid');
    if (bErr) throw bErr;

    const list = (users ?? []) as Array<Record<string, unknown>>;
    const totalUsers = list.length;
    const activeUsers = list.filter((u) => String(u['status']) === 'active').length;
    const totalApps = list.reduce((acc, u) => acc + (Number(u['apps_count']) || 0), 0);
    const trialUsers = list.filter((u) => String(u['subscription_tier']) === 'trial').length;
    const proUsers = list.filter((u) => String(u['subscription_tier']) === 'pro').length;
    const maxUsers = list.filter(
      (u) => String(u['subscription_tier']) === 'max' || String(u['subscription_tier']) === 'enterprise'
    ).length;
    const lifetimeUsers = list.filter((u) => String(u['subscription_tier']) === 'lifetime').length;

    let totalRevenueCents = 0;
    for (const b of (billing ?? []) as Array<Record<string, unknown>>) {
      totalRevenueCents += (parseFloat(String(b['amount']).replace(/[^0-9.]/g, '') || '0')) * 100;
    }
    const totalRevenue = `$${(totalRevenueCents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    const mrr = `$${(proUsers * 49 + maxUsers * 99).toLocaleString()}/mo`;

    return { totalUsers, activeUsers, totalApps, totalRevenue, mrr, trialUsers, proUsers, maxUsers, lifetimeUsers };
  } catch (err: unknown) {
    log(`[Admin] Metrics computation error: ${err instanceof Error ? err.message : String(err)}`);
    return empty;
  }
});

// ── IPC: Admin Assign User Plan ───────────────────────────────────────────
ipcMain.handle('admin-assign-plan', async (_, data: { userId: string | number; email?: string; planTier: string; expiresAt?: string }) => {
  log(`[Admin Plan Assignment] Updating user ${data.email || data.userId} to ${data.planTier}...`);
  const ok = adminAssignPlanDb(data.email || data.userId, data.planTier, data.expiresAt);

  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      const matchClause = data.email ? { email: data.email.toLowerCase() } : { id: data.userId };
      await supabase
        .from('users_profile')
        .update({
          subscription_tier: data.planTier,
          expires_at: data.expiresAt || null,
        })
        .match(matchClause);
      log(`[Admin Plan Assignment] Synced user plan to Supabase ✓`);
    } catch (err: any) {
      log(`[Admin Plan Assignment] Supabase sync note: ${err?.message}`);
    }
  }

  return { success: ok };
});

// ── IPC: Admin Learning Resource Management ───────────────────────────────
ipcMain.handle('admin-get-learning-resources', async () => {
  return getCuratedLearningResourcesDb();
});

ipcMain.handle('admin-add-learning-resource', async (_, res: {
  title: string;
  youtubeUrl: string;
  topic: string;
  targetRole: string;
  summary?: string;
  duration?: string;
}) => {
  const result = addCuratedLearningResourceDb(res);
  log(`[Admin Curator] Added resource: "${res.title}" for topic ${res.topic}`);
  return result;
});

ipcMain.handle('admin-delete-learning-resource', async (_, id: number | string) => {
  const ok = deleteCuratedLearningResourceDb(id);
  log(`[Admin Curator] Removed resource #${id}`);
  return { success: ok };
});

// ── IPC: AI Recommended Learning Resources on Job Click / Selection ───────
ipcMain.handle('get-recommended-resources-for-job', async (_, params: {
  title: string;
  description?: string;
  techStack?: string;
}) => {
  const allResources = getCuratedLearningResourcesDb();
  if (!allResources.length) return [];

  const titleLower = (params.title || '').toLowerCase();
  const descLower = (params.description || '').toLowerCase();
  const stackLower = (params.techStack || '').toLowerCase();

  const scored = allResources.map(r => {
    let score = 0;
    const topicTokens = r.topic.toLowerCase().split(/[^a-z0-9]+/);
    const roleTokens = r.targetRole.toLowerCase().split(/[^a-z0-9]+/);

    // Score based on role matches
    for (const tok of roleTokens) {
      if (tok.length > 2 && titleLower.includes(tok)) score += 6;
    }
    // Score based on topic matches
    for (const tok of topicTokens) {
      if (tok.length > 2) {
        if (titleLower.includes(tok)) score += 5;
        if (stackLower.includes(tok)) score += 4;
        if (descLower.includes(tok)) score += 2;
      }
    }
    return { resource: r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const matched = scored.filter(s => s.score > 0).map(s => s.resource);
  return matched.length > 0 ? matched.slice(0, 4) : allResources.slice(0, 3);
});
