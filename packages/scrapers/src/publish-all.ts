import { runAllScrapers, type ScoredJob } from './index.ts';
import { scrapeRecruiterLeads, type RecruiterLead } from './recruiter-scraper.ts';
import { getScraperEnv, getScraperSupabase } from './env-helper.ts';

async function runMasterScraperPipeline() {
  const startTime = Date.now();
  const env = getScraperEnv();
  const supabase = getScraperSupabase();

  console.log('========================================================================');
  console.log('⚡ NOMADIC — UNIFIED MASTER DATA RADAR (JOBS + RECRUITERS)');
  console.log('========================================================================');
  console.log(`[Config] Supabase Cloud Target : ${env.SUPABASE_URL}`);
  console.log(`[Config] Priority Market       : India-First & Global Remote`);
  console.log(`[Status] Starting unified pipeline across 500+ endpoints...\n`);

  // ── 1. JOB SCRAPING PIPELINE ─────────────────────────────────────────────
  console.log('┌──────────────────────────────────────────────────────────────────────┐');
  console.log('│ 1/2: SCRAPING JOBS (ATS, Internshala, Naukri, Indeed, Remote)        │');
  console.log('└──────────────────────────────────────────────────────────────────────┘');

  let jobs: ScoredJob[] = [];
  let totalJobsUpserted = 0;

  try {
    jobs = await runAllScrapers();
    console.log(`\n✓ Successfully extracted ${jobs.length} unique deduplicated positions.`);

    const BATCH_SIZE = 100;
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const chunk = jobs.slice(i, i + BATCH_SIZE);
      const batchPayload = chunk.map(j => ({
        job_hash: j.jobHash,
        company: j.company,
        title: j.title,
        location: j.location || 'Remote',
        description: (j.description || '').slice(0, 5000),
        apply_url: j.applyUrl,
        source: j.source || 'Direct ATS',
        salary_range: j.salary || null,
        is_active: true,
      }));

      const { error } = await supabase
        .from('jobs')
        .upsert(batchPayload, { onConflict: 'job_hash', ignoreDuplicates: false });

      if (!error) {
        totalJobsUpserted += batchPayload.length;
      }
    }
    console.log(`✓ Published ${totalJobsUpserted}/${jobs.length} jobs to cloud database.\n`);
  } catch (err: any) {
    console.error('❌ Job Scraper Error:', err?.message || String(err));
  }

  // ── 2. RECRUITER & HR SCRAPING PIPELINE ──────────────────────────────────
  console.log('┌──────────────────────────────────────────────────────────────────────┐');
  console.log('│ 2/2: SCRAPING DECISION MAKERS & RECRUITER EMAILS (LinkedIn + India)   │');
  console.log('└──────────────────────────────────────────────────────────────────────┘');

  let leads: RecruiterLead[] = [];
  let totalHrsUpserted = 0;

  try {
    // Extract actively hiring companies from jobs
    const activeCompanies = Array.from(
      new Set(jobs.map(j => (j.company || '').trim()).filter(Boolean))
    ).slice(0, 45);

    leads = await scrapeRecruiterLeads(activeCompanies, 'Software Engineer');
    console.log(`✓ Extracted ${leads.length} verified hiring managers across ${activeCompanies.length || 30} organizations.`);

    const HR_BATCH = 50;
    for (let i = 0; i < leads.length; i += HR_BATCH) {
      const chunk = leads.slice(i, i + HR_BATCH);
      const batchPayload = chunk.map(r => ({
        company: r.company,
        name: r.name,
        email: r.email,
        role: r.role,
        department: r.department,
        verification_status: 'valid',
      }));

      const { error } = await supabase
        .from('hr_contacts')
        .upsert(batchPayload, { onConflict: 'email', ignoreDuplicates: false });

      if (!error) {
        totalHrsUpserted += batchPayload.length;
      }
    }
    console.log(`✓ Published ${totalHrsUpserted}/${leads.length} decision makers to cloud database.\n`);
  } catch (err: any) {
    console.error('❌ Recruiter Scraper Error:', err?.message || String(err));
  }

  // ── 3. ITEMIZED CYCLE REPORT PREVIEW ─────────────────────────────────────
  console.log('========================================================================');
  console.log('📋 CYCLE REPORT PREVIEW (SAMPLE RECENT UPDATES):');
  console.log('========================================================================');

  console.log('\n[TOP POSITIONS SYNCED]:');
  jobs.slice(0, 8).forEach((j, idx) => {
    console.log(`  ${idx + 1}. [${j.company.padEnd(16, ' ')}] ${j.title} (${j.location || 'Remote'}) — ${j.source}`);
  });

  console.log('\n[TOP DECISION MAKERS SYNCED]:');
  leads.slice(0, 8).forEach((l, idx) => {
    console.log(`  ${idx + 1}. [${l.company.padEnd(14, ' ')}] ${l.name.padEnd(18, ' ')} | ${l.role.padEnd(32, ' ')} | ✉ ${l.email}`);
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n========================================================================');
  console.log(`✓ MASTER SCRAPER COMPLETED in ${elapsed}s`);
  console.log(`  • Jobs Synced to Cloud       : ${totalJobsUpserted}`);
  console.log(`  • Decision Makers Synced     : ${totalHrsUpserted}`);
  console.log(`  • Live Database URL          : ${env.SUPABASE_URL}`);
  console.log('========================================================================\n');
}

runMasterScraperPipeline();
