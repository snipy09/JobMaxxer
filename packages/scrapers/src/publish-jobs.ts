import { runAllScrapers, type ScoredJob } from './index.ts';
import { getScraperEnv, getScraperSupabase } from './env-helper.ts';

async function publishJobsLocally() {
  const startTime = Date.now();
  const env = getScraperEnv();
  const supabase = getScraperSupabase();

  console.log('========================================================================');
  console.log('⚡ NOMADIC — LOCAL JOB RADAR SCRAPER & SUPABASE PUBLISHER');
  console.log('========================================================================');
  console.log(`[Config] Target Supabase URL : ${env.SUPABASE_URL}`);
  console.log(`[Config] Service Key Active : ${env.isServiceRole ? 'YES (Service Role)' : 'NO (Using Anon Key)'}`);
  console.log(`[Status] Starting multi-source scraping engine across 500+ tech endpoints...\n`);

  try {
    // 1. Run all scrapers
    const jobs: ScoredJob[] = await runAllScrapers();

    if (!jobs || jobs.length === 0) {
      console.warn('⚠️ [Job Scraper] Scraper completed but returned 0 jobs. Please check network connectivity.');
      process.exit(0);
    }

    console.log(`\n✓ [Scraper] Successfully extracted ${jobs.length} unique deduplicated positions.`);

    // 2. Prepare database payload
    console.log(`[Supabase] Batch upserting ${jobs.length} jobs into "jobs" table...`);
    const BATCH_SIZE = 100;
    let totalUpserted = 0;
    let failedBatches = 0;

    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const chunk = jobs.slice(i, i + BATCH_SIZE);
      const batchPayload = chunk.map(j => ({
        job_hash: j.jobHash,
        company: j.company,
        title: j.title,
        location: j.location || 'Remote',
        description: (j.description || '').slice(0, 5000),
        apply_url: j.applyUrl,
        source: j.source || 'Direct ATS API',
        salary_range: j.salary || null,
        is_active: true,
      }));

      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(jobs.length / BATCH_SIZE);

      const { error } = await supabase
        .from('jobs')
        .upsert(batchPayload, { onConflict: 'job_hash', ignoreDuplicates: false });

      if (error) {
        console.warn(`  ↳ Batch ${batchNum}/${totalBatches} Warning: ${error.message}`);
        failedBatches++;
      } else {
        totalUpserted += batchPayload.length;
        console.log(`  ↳ Batch ${batchNum}/${totalBatches} processed: +${batchPayload.length} jobs synced.`);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n========================================================================');
    console.log(`✓ JOB SCRAPER COMPLETE in ${elapsed}s`);
    console.log(`  • Total Scraped & Deduplicated : ${jobs.length}`);
    console.log(`  • Successfully Synced to Cloud : ${totalUpserted}`);
    if (failedBatches > 0) {
      console.log(`  • Failed Batches               : ${failedBatches}`);
    }
    console.log(`  • Live Database                : ${env.SUPABASE_URL}`);
    console.log('========================================================================\n');
  } catch (err: any) {
    console.error('\n❌ [Job Scraper Fatal Error]:', err?.message || String(err));
    process.exit(1);
  }
}

publishJobsLocally();
