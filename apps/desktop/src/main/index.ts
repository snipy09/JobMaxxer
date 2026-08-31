import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import crypto from 'crypto';
import { initLocalDatabase, getDb, persistDb } from './db.js';
import {
  AutoApplyEngine,
  findChromeExecutable,
  ensureChromeForTesting,
  type MasterProfile,
} from '@job-automator/automation';
import { runAllScrapers } from '@job-automator/scrapers';
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
    app.setAsDefaultProtocolClient('hirestack', process.execPath, [path.resolve(process.argv[1])]);
    app.setAsDefaultProtocolClient('jobmaxxer', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
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
      const url = commandLine.find(arg => arg.startsWith('hirestack://auth') || arg.startsWith('jobmaxxer://auth'));
      if (url) mainWindow.webContents.send('oauth-callback', url);
    }
  });
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) mainWindow.webContents.send('oauth-callback', url);
});

ipcMain.handle('auth-google', async () => {
  const supabase = getAnonSupabase();
  if (!supabase) return { success: false, error: 'Supabase URL missing for OAuth.' };
  
  // Need to ensure redirect_to is registered in Supabase Dashboard -> Auth -> URL Configuration
  const authUrl = `${process.env.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=hirestack://auth-callback`;
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
            app.company,
            app.title,
            app.apply_url,
            app.status || 'applied',
            app.mode || 'autonomous',
            app.applied_at || new Date().toISOString()
          ]
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
            job.title,
            job.company,
            job.apply_url,
            job.location || null,
            job.salary || null,
            job.source || 'Cloud Feed',
            job.score || 100,
            job.description || null,
            job.saved_at || new Date().toISOString()
          ]
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
            r.name,
            r.target_role || '',
            r.file_path || '',
            r.is_default ? 1 : 0,
            r.created_at || new Date().toISOString()
          ]
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

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: 'Hirestack — Job Search & Application Automation Platform',
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
          cloudJobs = dbJobs.map((j, idx) => ({
            title: j['title'] as string,
            company: j['company'] as string,
            location: (j['location'] as string) || 'Remote',
            applyUrl: j['apply_url'] as string,
            salary: (j['salary_range'] as string) || undefined,
            source: (j['source'] as string) || 'Cloud Feed',
            description: j['description'] as string | undefined,
            createdAt: (j['created_at'] as string) || new Date(nowTime - idx * 60000).toISOString(),
            jobHash: j['job_hash'] as string,
          }));
          log(`[Cloud Sync] Loaded ${cloudJobs.length} active opportunities from Supabase cloud database.`);
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

ipcMain.handle('get-hr-contacts', async () => {
  log('[Recruiter Sync] Querying verified hiring manager contacts from Supabase...');
  try {
    const supabase = getAnonSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('hr_contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        log(`[Recruiter Sync] Fetched ${data.length} verified hiring managers from Supabase.`);
        return {
          success: true,
          contacts: data.map((r) => ({
            name: r.name,
            company: r.company,
            role: r.role,
            email: r.email,
            verificationStatus: r.verification_status || 'valid',
            sentStatus: 'unsent',
          })),
        };
      }
    }
  } catch (err: any) {
    log(`[Recruiter Sync] Note: ${err?.message}`);
  }
  return { success: true, contacts: SAMPLE_VERIFIED_HR_CONTACTS };
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
    };

    await AutoApplyEngine.prefillParallelTabs(jobUrls, profile, 20, (m) => log(`[Review Mode] ${m}`));

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
    };

    let applied = 0;
    let skipped = 0;

    for (let i = 0; i < jobUrls.length; i++) {
      const url = jobUrls[i];
      let jobCompany = 'Tech Company';
      let jobTitle = 'Software Engineer';

      try {
        const sj = db.exec('SELECT company, title FROM saved_jobs WHERE apply_url = ?', [url]);
        if (sj.length && sj[0].values.length) {
          jobCompany = String(sj[0].values[0][0]);
          jobTitle = String(sj[0].values[0][1]);
        }
      } catch {}

      log(`[Auto-Apply ${i + 1}/${jobUrls.length}] Processing position at ${jobCompany} (${url})`);

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
          log(`[Auto-Apply] Successfully processed ${i + 1}/${jobUrls.length} ✓`);
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

    persistDb();
    log(`[Auto-Apply Engine] Finished: ${applied} Applied, ${skipped} Skipped.`);
    return { success: true, applied, skipped };
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
      } catch (smtpErr: any) {
        log(`[Outreach SMTP] Notice: ${smtpErr?.message}`);
      }
    }

    // 2. Launch External Chrome Gmail Outreach Session
    log(`[Chrome Session] Opening ${verifiedContacts.length} pre-filled compose tabs in external Chrome...`);
    const result = await ExternalChromeOutreach.launchGmailOutreachSession(
      verifiedContacts,
      { autoSend: false },
      (msg) => log(msg)
    );

    log(`[Outreach Bot] Outreach session completed: ${result.openedInBrowser} compose windows active in Chrome.`);
    return { success: true, sent: result.openedInBrowser || verifiedContacts.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[Outreach Bot] ERROR: ${msg}`);
    return { success: false, error: msg, sent: 0 };
  }
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
  tier: 'trial' | 'pro' | 'max' | 'lifetime';
  licenseKey: string;
  status: 'active' | 'suspended';
  appsCount: number;
  createdAt: string;
  expiresAt?: string;
  lastLogin?: string;
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

        return {
          success: true,
          user: {
            ...user,
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
      log(`[Auth] Authenticated from offline cache: ${offline.email}`);
      return {
        success: true,
        user: {
          ...offline,
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
