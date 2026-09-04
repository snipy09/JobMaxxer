import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

let db: Database | null = null;
let dbFilePath = '';

export async function initLocalDatabase(userDataPath: string): Promise<Database> {
  // Ensure directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  dbFilePath = path.join(userDataPath, 'job_automator_local.db');

  const locateWasm = (file: string) => {
    let baseDir = process.cwd();
    try {
      baseDir = path.dirname(fileURLToPath(import.meta.url));
    } catch {}

    const candidates = [
      path.join(baseDir, file),
      path.join(baseDir, '..', '..', 'node_modules', 'sql.js', 'dist', file),
      path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return file;
  };

  const SQL = await initSqlJs({ locateFile: locateWasm });

  // Load existing DB file if present, otherwise create fresh
  if (fs.existsSync(dbFilePath)) {
    try {
      const fileBuffer = fs.readFileSync(dbFilePath);
      db = new SQL.Database(fileBuffer);
    } catch (err: any) {
      console.warn('[SQLite] Existing DB file unreadable, creating fresh:', err.message);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Initialize schema
  db.run(`
    CREATE TABLE IF NOT EXISTS master_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      linkedin TEXT,
      github TEXT,
      sponsorship TEXT,
      desired_salary TEXT,
      notice_period TEXT,
      groq_api_key TEXT,
      gemini_api_key TEXT,
      smtp_password TEXT,
      resume_text TEXT,
      custom_answers_json TEXT,
      onboarding_completed INTEGER DEFAULT 0,
      desired_title TEXT,
      tech_stack TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS local_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      title TEXT NOT NULL,
      apply_url TEXT NOT NULL,
      status TEXT DEFAULT 'applied',
      mode TEXT CHECK (mode IN ('semi-auto', 'autonomous', 'outreach', 'manual')),
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS outreach_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_email TEXT NOT NULL UNIQUE,
      contact_name TEXT,
      company TEXT,
      verification_status TEXT CHECK (verification_status IN ('valid', 'invalid', 'pending', 'catch-all', 'risky')),
      sent_status TEXT DEFAULT 'unsent',
      sent_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS saved_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      apply_url TEXT NOT NULL UNIQUE,
      location TEXT,
      salary TEXT,
      source TEXT,
      score INTEGER,
      description TEXT,
      saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_role TEXT,
      file_path TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_cache (
      email         TEXT PRIMARY KEY,
      supabase_id   TEXT,
      password_hash TEXT NOT NULL,
      full_name     TEXT,
      role          TEXT DEFAULT 'user',
      tier          TEXT DEFAULT 'pro',
      license_key   TEXT,
      status        TEXT DEFAULT 'active',
      apps_count    INTEGER DEFAULT 0,
      created_at    TEXT,
      expires_at    TEXT,
      last_login    TEXT,
      cached_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS learner_progress (
      roadmap_id           TEXT PRIMARY KEY,
      completed_nodes_json TEXT DEFAULT '[]',
      target_horizon       TEXT DEFAULT '2 Months',
      daily_commitment     TEXT DEFAULT '2 Hours/Day',
      streak_count         INTEGER DEFAULT 1,
      last_active_date     TEXT,
      updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cached_form_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_key TEXT NOT NULL UNIQUE,
      answer_text  TEXT NOT NULL,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS curated_learning_resources (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT NOT NULL,
      youtube_url  TEXT NOT NULL,
      topic        TEXT NOT NULL,
      target_role  TEXT NOT NULL,
      summary      TEXT,
      duration     TEXT DEFAULT '20 mins',
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_activity_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_type TEXT NOT NULL,
      details       TEXT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS custom_roadmaps (
      id               TEXT PRIMARY KEY,
      role_title       TEXT NOT NULL,
      domain           TEXT NOT NULL,
      target_horizon   TEXT DEFAULT '2 Months',
      daily_commitment TEXT DEFAULT '2 Hours/Day',
      roadmap_json     TEXT NOT NULL,
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrate existing databases safely
  try { db.run(`ALTER TABLE master_profile ADD COLUMN gemini_api_key TEXT`); } catch {}
  try { db.run(`ALTER TABLE master_profile ADD COLUMN smtp_password TEXT`); } catch {}
  try { db.run(`ALTER TABLE master_profile ADD COLUMN onboarding_completed INTEGER DEFAULT 0`); } catch {}
  try { db.run(`ALTER TABLE master_profile ADD COLUMN desired_title TEXT`); } catch {}
  try { db.run(`ALTER TABLE master_profile ADD COLUMN tech_stack TEXT`); } catch {}
  
  try {
    db.run(`CREATE TABLE IF NOT EXISTS user_activity_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_type TEXT NOT NULL,
      details       TEXT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  } catch {}

  try {
    db.run(`CREATE TABLE IF NOT EXISTS custom_roadmaps (
      id               TEXT PRIMARY KEY,
      role_title       TEXT NOT NULL,
      domain           TEXT NOT NULL,
      target_horizon   TEXT DEFAULT '3 Months',
      daily_commitment TEXT DEFAULT '2 Hours/Day',
      roadmap_json     TEXT NOT NULL,
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    try { db.run(`ALTER TABLE custom_roadmaps ADD COLUMN target_horizon TEXT DEFAULT '3 Months'`); } catch {}
    try { db.run(`ALTER TABLE custom_roadmaps ADD COLUMN daily_commitment TEXT DEFAULT '2 Hours/Day'`); } catch {}
  } catch {}

  try {
    db.run(`CREATE TABLE IF NOT EXISTS curated_learning_resources (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT NOT NULL,
      youtube_url  TEXT NOT NULL,
      topic        TEXT NOT NULL,
      target_role  TEXT NOT NULL,
      summary      TEXT,
      duration     TEXT DEFAULT '20 mins',
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    // Seed initial resources if empty
    const checkRes = db.exec('SELECT COUNT(*) FROM curated_learning_resources');
    if (!checkRes.length || !Number(checkRes[0].values[0][0])) {
      db.run(`
        INSERT INTO curated_learning_resources (title, youtube_url, topic, target_role, summary, duration) VALUES
        ('Next.js 14 Full Stack Architecture & Server Components', 'https://www.youtube.com/watch?v=wm5gMKuwSYk', 'React & Next.js', 'Frontend Engineer, Full Stack Developer', 'Deep dive into React Server Components, streaming SSR, App Router architecture, and edge caching.', '35 mins'),
        ('System Design Interview: Distributed Cache & Redis Sharding', 'https://www.youtube.com/watch?v=iuqZvajTOyA', 'System Design & Scalability', 'Backend Engineer, Full Stack Developer, Systems Architect', 'LRU eviction algorithms, cache-aside patterns, write-through vs write-back, and cluster failover mechanisms.', '45 mins'),
        ('Node.js Event Loop, Worker Threads & Concurrency In-Depth', 'https://www.youtube.com/watch?v=8aGhZQkoFbQ', 'Node.js & Backend Architecture', 'Backend Developer, Node.js Engineer, Full Stack', 'Microtask queues, libuv thread pool architecture, non-blocking asynchronous I/O, and CPU profiling.', '28 mins'),
        ('Docker & Production Kubernetes Deployment Pipelines', 'https://www.youtube.com/watch?v=X48VuDVv0do', 'DevOps & Cloud Infrastructure', 'DevOps Engineer, Platform Engineer, Cloud Architect', 'Multi-stage container optimization, zero-downtime rolling deploys, Helm templates, and ingress networking.', '40 mins'),
        ('PostgreSQL Performance Tuning & Indexing Optimization', 'https://www.youtube.com/watch?v=clqv_X5q8QY', 'Databases & Performance', 'Backend Engineer, Database Engineer, Data Platform', 'B-tree vs GIN indexes, EXPLAIN ANALYZE query plans, partition pruning, and WAL vacuum optimization.', '30 mins');
      `);
    }
  } catch {}

  // Ensure default master profile row exists
  try {
    const profCheck = db.exec('SELECT COUNT(*) as count FROM master_profile WHERE id = 1');
    const profCount = profCheck.length && profCheck[0].values.length ? Number(profCheck[0].values[0][0]) : 0;
    if (profCount === 0) {
      db.run(
        `INSERT OR IGNORE INTO master_profile (id, first_name, last_name, email, phone, desired_title, tech_stack, sponsorship, onboarding_completed)
         VALUES (1, '', '', '', '', '', '', 'No', 0)`
      );
    }
  } catch (err: any) {
    console.warn('[SQLite] Error initializing master profile:', err.message);
  }

  persistDb();
  console.log('[SQLite (sql.js)] Initialized local database at', dbFilePath);
  return db;
}

/** Flush in-memory DB to disk. Call after every write. */
export function persistDb(): void {
  if (!db || !dbFilePath) return;
  try {
    const dir = path.dirname(dbFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = db.export();
    fs.writeFileSync(dbFilePath, Buffer.from(data));
  } catch (err: any) {
    console.error('[SQLite] Failed to persist DB to disk:', err.message);
  }
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized! Call initLocalDatabase first.');
  return db;
}

// ── Activity Logging & Heatmap ──────────────────────────────────────────────
export function logUserActivityDb(activityType: string, details?: string): void {
  try {
    const database = getDb();
    database.run(
      'INSERT INTO user_activity_log (activity_type, details, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [activityType, details || null]
    );
    persistDb();
  } catch (err: any) {
    console.warn('[Activity DB] Failed to log activity:', err?.message);
  }
}

export function getUserActivityHeatmapDb(days: number = 365): Array<{ date: string; count: number }> {
  try {
    const database = getDb();
    const res = database.exec(`
      SELECT date(created_at) as log_date, COUNT(*) as action_count
      FROM user_activity_log
      WHERE created_at >= date('now', '-${Math.max(1, days)} days')
      GROUP BY date(created_at)
      ORDER BY log_date ASC
    `);
    if (!res.length || !res[0].values.length) return [];
    return res[0].values.map(v => ({
      date: String(v[0]),
      count: Number(v[1]),
    }));
  } catch {
    return [];
  }
}

export function getUserActivityStatsDb(): { streakCount: number; totalActions: number } {
  try {
    const database = getDb();
    const totalRes = database.exec('SELECT COUNT(*) FROM user_activity_log');
    const totalActions = totalRes.length && totalRes[0].values.length ? Number(totalRes[0].values[0][0]) : 0;

    const streakRes = database.exec(`
      SELECT DISTINCT date(created_at) as log_date
      FROM user_activity_log
      ORDER BY log_date DESC
      LIMIT 100
    `);

    let streakCount = 0;
    if (streakRes.length && streakRes[0].values.length) {
      const dates = streakRes[0].values.map(v => String(v[0]));
      const today = new Date().toISOString().split('T')[0];
      const yesterdayDate = new Date(Date.now() - 86400000);
      const yesterday = yesterdayDate.toISOString().split('T')[0];

      let checkDate = new Date();
      if (!dates.includes(today) && dates.includes(yesterday)) {
        checkDate = yesterdayDate;
      }

      for (let i = 0; i < 365; i++) {
        const dStr = checkDate.toISOString().split('T')[0];
        if (dates.includes(dStr)) {
          streakCount++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return { streakCount: Math.max(1, streakCount), totalActions };
  } catch {
    return { streakCount: 1, totalActions: 0 };
  }
}

// ── Custom Roadmaps Persistence ─────────────────────────────────────────────
export function saveCustomRoadmapDb(
  id: string,
  roleTitle: string,
  domain: string,
  roadmapJson: string,
  targetHorizon: string = '2 Months',
  dailyCommitment: string = '2 Hours/Day'
): void {
  try {
    const database = getDb();
    database.run(`
      INSERT INTO custom_roadmaps (id, role_title, domain, target_horizon, daily_commitment, roadmap_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        role_title = excluded.role_title,
        domain = excluded.domain,
        target_horizon = excluded.target_horizon,
        daily_commitment = excluded.daily_commitment,
        roadmap_json = excluded.roadmap_json,
        updated_at = CURRENT_TIMESTAMP
    `, [id, roleTitle, domain, targetHorizon, dailyCommitment, roadmapJson]);
    persistDb();
  } catch (err: any) {
    console.warn('[Custom Roadmap DB] Failed to save:', err?.message);
  }
}

export function getCustomRoadmapsDb(): Array<{
  id: string;
  roleTitle: string;
  domain: string;
  targetHorizon: string;
  dailyCommitment: string;
  roadmapJson: string;
  updatedAt: string;
}> {
  try {
    const database = getDb();
    const res = database.exec('SELECT id, role_title, domain, target_horizon, daily_commitment, roadmap_json, updated_at FROM custom_roadmaps ORDER BY updated_at DESC');
    if (!res.length || !res[0].values.length) return [];
    return res[0].values.map(v => ({
      id: String(v[0]),
      roleTitle: String(v[1]),
      domain: String(v[2]),
      targetHorizon: String(v[3] || '2 Months'),
      dailyCommitment: String(v[4] || '2 Hours/Day'),
      roadmapJson: String(v[5]),
      updatedAt: String(v[6] || ''),
    }));
  } catch {
    return [];
  }
}

export function getCustomRoadmapByIdDb(id: string): string | null {
  try {
    const database = getDb();
    const res = database.exec('SELECT roadmap_json FROM custom_roadmaps WHERE id = ? LIMIT 1', [id]);
    if (res.length && res[0].values.length) {
      return String(res[0].values[0][0]);
    }
  } catch {}
  return null;
}

export function deleteCustomRoadmapDb(id: string): boolean {
  try {
    const database = getDb();
    database.run('DELETE FROM custom_roadmaps WHERE id = ?', [id]);
    persistDb();
    return true;
  } catch {
    return false;
  }
}

// ── Learner Progress ────────────────────────────────────────────────────────
export function getLearnerProgressDb(roadmapId: string) {
  const database = getDb();
  const res = database.exec('SELECT * FROM learner_progress WHERE roadmap_id = ?', [roadmapId]);
  if (!res.length || !res[0].values.length) return null;
  const cols = res[0].columns;
  const row = res[0].values[0];
  const obj = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
  let completedNodes: string[] = [];
  try {
    completedNodes = JSON.parse(String(obj['completed_nodes_json'] || '[]'));
  } catch {}
  return {
    roadmapId: String(obj['roadmap_id']),
    completedNodes,
    targetHorizon: String(obj['target_horizon'] || '2 Months'),
    dailyCommitment: String(obj['daily_commitment'] || '2 Hours/Day'),
    streakCount: Number(obj['streak_count'] || 1),
    lastActiveDate: obj['last_active_date'] ? String(obj['last_active_date']) : undefined,
  };
}

export function saveLearnerProgressDb(p: {
  roadmapId: string;
  completedNodes: string[];
  targetHorizon?: string;
  dailyCommitment?: string;
  streakCount?: number;
}) {
  const database = getDb();
  const nodesJson = JSON.stringify(p.completedNodes || []);
  const today = new Date().toISOString().split('T')[0];

  database.run(`
    INSERT INTO learner_progress (roadmap_id, completed_nodes_json, target_horizon, daily_commitment, streak_count, last_active_date)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(roadmap_id) DO UPDATE SET
      completed_nodes_json = excluded.completed_nodes_json,
      target_horizon = COALESCE(excluded.target_horizon, learner_progress.target_horizon),
      daily_commitment = COALESCE(excluded.daily_commitment, learner_progress.daily_commitment),
      streak_count = COALESCE(excluded.streak_count, learner_progress.streak_count),
      last_active_date = excluded.last_active_date,
      updated_at = CURRENT_TIMESTAMP
  `, [
    p.roadmapId,
    nodesJson,
    p.targetHorizon || '2 Months',
    p.dailyCommitment || '2 Hours/Day',
    p.streakCount ?? 1,
    today,
  ]);
  persistDb();
  return true;
}

export function getCachedFormAnswerDb(questionText: string): string | null {
  try {
    const database = getDb();
    const cleanKey = questionText.toLowerCase().trim().replace(/[^a-z0-9]/g, ' ').slice(0, 100);
    const res = database.exec('SELECT answer_text FROM cached_form_answers WHERE question_key = ? LIMIT 1', [cleanKey]);
    if (res.length && res[0].values.length) {
      return String(res[0].values[0][0]);
    }
  } catch {}
  return null;
}

export function saveCachedFormAnswerDb(questionText: string, answerText: string): void {
  try {
    const database = getDb();
    const cleanKey = questionText.toLowerCase().trim().replace(/[^a-z0-9]/g, ' ').slice(0, 100);
    database.run(`
      INSERT INTO cached_form_answers (question_key, answer_text)
      VALUES (?, ?)
      ON CONFLICT(question_key) DO UPDATE SET answer_text = excluded.answer_text
    `, [cleanKey, answerText]);
    persistDb();
  } catch {}
}

export function updateApplicationStatusDb(id: number | string, status: string): boolean {
  try {
    const database = getDb();
    database.run('UPDATE local_applications SET status = ? WHERE id = ?', [status, id]);
    persistDb();
    return true;
  } catch {
    return false;
  }
}

export function deleteApplicationDb(id: number | string): boolean {
  try {
    const database = getDb();
    database.run('DELETE FROM local_applications WHERE id = ?', [id]);
    persistDb();
    return true;
  } catch {
    return false;
  }
}

export function getCuratedLearningResourcesDb(): Array<{
  id: number;
  title: string;
  youtubeUrl: string;
  topic: string;
  targetRole: string;
  summary: string;
  duration: string;
  createdAt: string;
}> {
  try {
    const database = getDb();
    const res = database.exec('SELECT id, title, youtube_url, topic, target_role, summary, duration, created_at FROM curated_learning_resources ORDER BY id DESC');
    if (!res.length || !res[0].values.length) return [];
    return res[0].values.map(v => ({
      id: Number(v[0]),
      title: String(v[1]),
      youtubeUrl: String(v[2]),
      topic: String(v[3]),
      targetRole: String(v[4]),
      summary: String(v[5] || ''),
      duration: String(v[6] || '20 mins'),
      createdAt: String(v[7] || ''),
    }));
  } catch {
    return [];
  }
}

export function addCuratedLearningResourceDb(resource: {
  title: string;
  youtubeUrl: string;
  topic: string;
  targetRole: string;
  summary?: string;
  duration?: string;
}): { success: boolean; id?: number } {
  try {
    const database = getDb();
    database.run(`
      INSERT INTO curated_learning_resources (title, youtube_url, topic, target_role, summary, duration)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      resource.title,
      resource.youtubeUrl,
      resource.topic,
      resource.targetRole,
      resource.summary || '',
      resource.duration || '20 mins',
    ]);
    persistDb();
    return { success: true };
  } catch {
    return { success: false };
  }
}

export function deleteCuratedLearningResourceDb(id: number | string): boolean {
  try {
    const database = getDb();
    database.run('DELETE FROM curated_learning_resources WHERE id = ?', [id]);
    persistDb();
    return true;
  } catch {
    return false;
  }
}

export function adminAssignPlanDb(emailOrId: string | number, planTier: string, expiresAt?: string): boolean {
  try {
    const database = getDb();
    const isEmail = typeof emailOrId === 'string' && emailOrId.includes('@');
    if (isEmail) {
      database.run(
        'UPDATE user_cache SET tier = ?, expires_at = ? WHERE email = ?',
        [planTier, expiresAt || null, emailOrId]
      );
    } else {
      database.run(
        'UPDATE user_cache SET tier = ?, expires_at = ? WHERE rowid = ? OR supabase_id = ?',
        [planTier, expiresAt || null, emailOrId, String(emailOrId)]
      );
    }
    persistDb();
    return true;
  } catch {
    return false;
  }
}

export function getDailyApplicationCountDb(): number {
  try {
    const database = getDb();
    const todayStr = new Date().toISOString().split('T')[0];
    const res = database.exec(`SELECT COUNT(*) FROM local_applications WHERE applied_at LIKE '${todayStr}%'`);
    if (res.length && res[0].values.length) {
      return Number(res[0].values[0][0]);
    }
  } catch {}
  return 0;
}

export function checkUserPlanLimitDb(requestedCount: number, userTier: string = 'pro'): {
  allowed: boolean;
  maxAllowed: number;
  currentUsage: number;
  remaining: number;
  reason?: string;
} {
  const currentUsage = getDailyApplicationCountDb();
  let maxDaily = 100; // Pro default

  const tier = userTier.toLowerCase();
  if (tier === 'trial' || tier === 'free') {
    maxDaily = 10;
  } else if (tier === 'pro') {
    maxDaily = 100;
  } else if (tier === 'max' || tier === 'lifetime') {
    maxDaily = 200;
  }

  const remaining = Math.max(0, maxDaily - currentUsage);
  if (currentUsage >= maxDaily) {
    return {
      allowed: false,
      maxAllowed: maxDaily,
      currentUsage,
      remaining: 0,
      reason: `Daily application limit reached (${currentUsage}/${maxDaily}). Upgrade your tier for expanded limits.`,
    };
  }

  return {
    allowed: true,
    maxAllowed: maxDaily,
    currentUsage,
    remaining,
  };
}
