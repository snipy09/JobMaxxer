import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jympejesevicwleptfzq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbG...MbPA';

async function purgeAll() {
  console.log('[Supabase Purge] Connecting to Supabase at:', SUPABASE_URL);
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const { count: jobCount, error: jobErr } = await supabase
      .from('jobs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (jobErr) {
      console.warn('[Supabase Purge] Jobs table delete note:', jobErr.message);
    } else {
      console.log('[Supabase Purge] Successfully purged jobs table.');
    }

    const { count: contactCount, error: contactErr } = await supabase
      .from('hr_contacts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (contactErr) {
      console.warn('[Supabase Purge] HR Contacts table delete note:', contactErr.message);
    } else {
      console.log('[Supabase Purge] Successfully purged hr_contacts table.');
    }

    console.log('[Supabase Purge] Fresh clean state established ✓');
  } catch (err: any) {
    console.error('[Supabase Purge Error]:', err?.message);
  }
}

purgeAll();
