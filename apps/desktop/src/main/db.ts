import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;
let dbFilePath = '';

export async function initLocalDatabase(userDataPath: string): Promise<Database> {
  // Ensure directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  dbFilePath = path.join(userDataPath, 'job_automator_local.db');

  const SQL = await initSqlJs();

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

    CREATE TABLE IF NOT EXISTS app_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
      tier TEXT DEFAULT 'pro' CHECK (tier IN ('pro', 'enterprise', 'lifetime')),
      license_key TEXT UNIQUE,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
      apps_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      last_login DATETIME
    );

    CREATE TABLE IF NOT EXISTS billing_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      amount TEXT NOT NULL,
      plan TEXT NOT NULL,
      status TEXT DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'refunded')),
      payment_method TEXT DEFAULT 'Stripe Card',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrate existing databases
  try { db.run(`ALTER TABLE master_profile ADD COLUMN smtp_password TEXT`); } catch {}
  try { db.run(`ALTER TABLE master_profile ADD COLUMN onboarding_completed INTEGER DEFAULT 0`); } catch {}
  try { db.run(`ALTER TABLE master_profile ADD COLUMN desired_title TEXT`); } catch {}
  try { db.run(`ALTER TABLE master_profile ADD COLUMN tech_stack TEXT`); } catch {}
  try { db.run(`ALTER TABLE app_users ADD COLUMN username TEXT`); } catch {}

  // Clean up any legacy admin entries and ensure single master admin exists
  try {
    db.run(`DELETE FROM app_users WHERE username = 'admin' OR email = 'admin@jobmaxxer.com'`);
    db.run(
      `INSERT OR REPLACE INTO app_users (id, username, email, password, full_name, role, tier, license_key, status, apps_count, created_at)
       VALUES (1, 'raksha', 'raksha@jobmaxxer.com', 'raksha@sajal', 'Raksha (Master Admin)', 'admin', 'lifetime', 'RAKSHA-MASTER-ADMIN-2026', 'active', 0, datetime('now', '-30 days'))`
    );
  } catch (err: any) {
    console.warn('[SQLite] Error configuring master admin user:', err.message);
  }

  // Seed demo clients if app_users only has admin
  try {
    const userCheck = db.exec('SELECT COUNT(*) as count FROM app_users');
    const userCount = userCheck.length && userCheck[0].values.length ? Number(userCheck[0].values[0][0]) : 0;
    if (userCount <= 1) {
      // 1. Seed Demo Active Buyers
      db.run(
        `INSERT INTO app_users (email, password, full_name, role, tier, license_key, status, apps_count, created_at, last_login)
         VALUES 
         ('alex.dev@gmail.com', 'pass123', 'Alex Vance', 'user', 'pro', 'JMX-PRO-9842-8821', 'active', 142, datetime('now', '-12 days'), datetime('now', '-2 hours')),
         ('elena.cloud@outlook.com', 'pass123', 'Elena Rostova', 'user', 'enterprise', 'JMX-ENT-4412-9901', 'active', 318, datetime('now', '-25 days'), datetime('now', '-30 minutes')),
         ('david.chen@icloud.com', 'pass123', 'David Chen', 'user', 'pro', 'JMX-PRO-7731-1029', 'active', 89, datetime('now', '-5 days'), datetime('now', '-1 day')),
         ('sarah.react@yahoo.com', 'pass123', 'Sarah Jenkins', 'user', 'lifetime', 'JMX-LIFE-5501-3329', 'active', 450, datetime('now', '-40 days'), datetime('now', '-4 hours'))`
      );

      // 2. Seed Initial Billing Transactions
      db.run(
        `INSERT INTO billing_records (user_email, amount, plan, status, payment_method, created_at)
         VALUES
         ('elena.cloud@outlook.com', '$99.00', 'Enterprise Plan (Monthly)', 'paid', 'Stripe Card (Visa •••• 4242)', datetime('now', '-25 days')),
         ('sarah.react@yahoo.com', '$299.00', 'Lifetime Founder License', 'paid', 'Stripe Card (Mastercard •••• 8821)', datetime('now', '-40 days')),
         ('alex.dev@gmail.com', '$49.00', 'Pro Plan (Monthly)', 'paid', 'Stripe Card (Visa •••• 1092)', datetime('now', '-12 days')),
         ('david.chen@icloud.com', '$49.00', 'Pro Plan (Monthly)', 'paid', 'Stripe Card (Amex •••• 3001)', datetime('now', '-5 days'))`
      );
    }
  } catch (err: any) {
    console.warn('[SQLite] Error seeding admin/billing defaults:', err.message);
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
