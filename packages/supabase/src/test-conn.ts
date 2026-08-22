import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jympejesevicwleptfzq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bXBlamVzZXZpY3dsZXB0ZnpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczOTU5NzQsImV4cCI6MjEwMjk3MTk3NH0.1b6XFrIxH1hLVdjp2arHLdJ4fkiKV-0gb6yNZ7eMbPA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('[Supabase] Testing connection to:', SUPABASE_URL);
  try {
    const { data, error } = await supabase.from('jobs').select('*').limit(1);
    if (error) {
      console.log('[Supabase API Response] Note:', error.message);
    } else {
      console.log('[Supabase API Response] Connected successfully! Records found:', data?.length || 0);
    }
  } catch (err: any) {
    console.log('[Supabase Error]:', err.message);
  }
}

main();
