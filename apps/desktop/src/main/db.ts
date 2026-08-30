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

  // Initialize schema (includes smtp_password)
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
      mode TEXT CHECK (mode IN ('semi-auto', 'autonomous')),
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS outreach_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_email TEXT NOT NULL UNIQUE,
      contact_name TEXT,
      company TEXT,
      verification_status TEXT CHECK (verification_status IN ('valid', 'invalid', 'pending')),
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

    -- Offline login cache. Supabase is the source of truth for accounts &
    -- licensing (see migration 002_secure_rls.sql). We only cache the profile
    -- of users who have ALREADY authenticated successfully against Supabase, so
    -- the app keeps working for a short offline window. We never store plaintext
    -- passwords — only the sha256("email:password") hash the server also stores.
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
  `);

  // Migrate existing databases
  try { db.run(`ALTER TABLE master_profile ADD COLUMN smtp_password TEXT`); } catch {}
  try { db.run(`ALTER TABLE master_profile ADD COLUMN onboarding_completed INTEGER DEFAULT 0`); } catch {}
  try { db.run(`ALTER TABLE master_profile ADD COLUMN desired_title TEXT`); } catch {}
  try { db.run(`ALTER TABLE master_profile ADD COLUMN tech_stack TEXT`); } catch {}

  // Purge v1 tables that stored plaintext credentials, demo accounts and the
  // hardcoded master-admin login on the customer's machine. These are gone for
  // good — accounts now live server-side in Supabase.
  try { db.run(`DROP TABLE IF EXISTS app_users`); } catch {}
  try { db.run(`DROP TABLE IF EXISTS billing_records`); } catch {}

  // Ensure default master profile row exists
  try {
    const profCheck = db.exec('SELECT COUNT(*) as count FROM master_profile WHERE id = 1');
    const profCount = profCheck.length && profCheck[0].values.length ? Number(profCheck[0].values[0][0]) : 0;
    if (profCount === 0) {
      db.run(
        `INSERT OR IGNORE INTO master_profile (id, first_name, last_name, email, phone, desired_title, tech_stack, sponsorship, onboarding_completed)
         VALUES (1, 'Candidate', 'User', 'candidate@example.com', '+1 555-0100', 'Software Engineer, Full Stack Engineer', 'TypeScript, React, Node.js', 'No', 1)`
      );
    }
  } catch (err: any) {
    console.warn('[SQLite] Error seeding master profile default:', err.message);
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
