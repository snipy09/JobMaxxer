import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface ScraperEnv {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  isServiceRole: boolean;
}

/**
 * Loads Supabase credentials from process.env or the project's root .env file.
 */
export function getScraperEnv(): ScraperEnv {
  let supabaseUrl = process.env.SUPABASE_URL || '';
  let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    // Attempt to locate root .env
    const candidatePaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '..', '..', '.env'),
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '.env'),
    ];

    for (const envPath of candidatePaths) {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
            if (key === 'SUPABASE_URL' && !supabaseUrl) supabaseUrl = val;
            if ((key === 'SUPABASE_SERVICE_ROLE_KEY' || key === 'SUPABASE_ANON_KEY') && !supabaseKey) {
              supabaseKey = val;
            }
          }
        }
        if (supabaseUrl && supabaseKey) break;
      }
    }
  }

  // Fallback defaults from repository configuration
  if (!supabaseUrl) {
    supabaseUrl = 'https://jympejesevicwleptfzq.supabase.co';
  }
  if (!supabaseKey) {
    supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bXBlamVzZXZpY3dsZXB0ZnpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczOTU5NzQsImV4cCI6MjEwMjk3MTk3NH0.1b6XFrIxH1hLVdjp2arHLdJ4fkiKV-0gb6yNZ7eMbPA';
  }

  const isServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_KEY: supabaseKey,
    isServiceRole,
  };
}

export function getScraperSupabase(): SupabaseClient {
  const env = getScraperEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
}
