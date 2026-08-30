import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jympejesevicwleptfzq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bXBlamVzZXZpY3dsZXB0ZnpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczOTU5NzQsImV4cCI6MjEwMjk3MTk3NH0.1b6XFrIxH1hLVdjp2arHLdJ4fkiKV-0gb6yNZ7eMbPA'
);

async function main() {
  const { data: jobs, error: err1 } = await supabase.from('jobs').select('id, title, company, source').limit(5);
  console.log('Jobs query error:', err1);
  console.log('Sample jobs in Supabase:', jobs?.length, jobs?.slice(0, 3));

  const { data: hr, error: err2 } = await supabase.from('hr_contacts').select('id, name, email, company').limit(5);
  console.log('HR query error:', err2);
  console.log('Sample HR contacts in Supabase:', hr?.length, hr?.slice(0, 3));
}

main();
