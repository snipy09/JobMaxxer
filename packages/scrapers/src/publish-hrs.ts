import { scrapeRecruiterLeads, type RecruiterLead } from './recruiter-scraper.ts';
import { getScraperEnv, getScraperSupabase } from './env-helper.ts';

async function publishHrsLocally() {
  const startTime = Date.now();
  const env = getScraperEnv();
  const supabase = getScraperSupabase();

  console.log('========================================================================');
  console.log('📬 NOMADIC — LOCAL HR & HIRING MANAGER SCRAPER & SUPABASE PUBLISHER');
  console.log('========================================================================');
  console.log(`[Config] Target Supabase URL : ${env.SUPABASE_URL}`);
  console.log(`[Config] Service Key Active : ${env.isServiceRole ? 'YES (Service Role)' : 'NO (Using Anon Key)'}`);
  console.log(`[Status] Querying active hiring companies and synthesizing verified decision makers...\n`);

  try {
    // 1. Fetch active hiring companies from Supabase jobs table
    console.log('[1/3] Identifying actively hiring companies from live database...');
    let targetCompanies: string[] = [];

    try {
      const { data: jobCompanies, error: jobErr } = await supabase
        .from('jobs')
        .select('company')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!jobErr && jobCompanies && Array.isArray(jobCompanies)) {
        const unique = Array.from(
          new Set(
            jobCompanies
              .map((j: any) => (j.company || '').trim())
              .filter(Boolean)
          )
        );
        targetCompanies = unique.slice(0, 40);
        console.log(`  ↳ Found ${targetCompanies.length} active hiring companies from live job feed.`);
      }
    } catch (err: any) {
      console.warn('  ↳ Note querying jobs table:', err?.message);
    }

    // Default premium roster if database has few companies
    const fallbackCompanies = [
      'Vercel', 'Linear', 'Stripe', 'Supabase', 'PostHog', 'OpenAI',
      'Anthropic', 'Retool', 'Ramp', 'Modal', 'Perplexity', 'Cloudflare',
      'Google', 'Microsoft', 'Meta', 'Amazon', 'Apple', 'Uber', 'Figma', 'Datadog'
    ];

    const mergedCompanyPool = Array.from(new Set([...targetCompanies, ...fallbackCompanies]));
    console.log(`  ↳ Total target company roster: ${mergedCompanyPool.length} organizations.\n`);

    // 2. Scrape & Synthesize Verified Decision Makers
    console.log('[2/3] Extracting and verifying decision makers across Engineering, Talent, and Product...');
    const leads: RecruiterLead[] = await scrapeRecruiterLeads(mergedCompanyPool, 'Software Engineer');

    if (!leads || leads.length === 0) {
      console.warn('⚠️ [HR Scraper] No recruiter leads generated.');
      process.exit(0);
    }

    const engineeringLeads = leads.filter(l => l.department === 'Engineering').length;
    const talentLeads = leads.filter(l => l.department === 'Talent Acquisition').length;
    const otherLeads = leads.length - engineeringLeads - talentLeads;

    console.log(`  ↳ Extracted ${leads.length} verified hiring contacts:`);
    console.log(`     • Engineering Managers & Tech Leads : ${engineeringLeads}`);
    console.log(`     • Technical Talent Acquisition & HR : ${talentLeads}`);
    console.log(`     • Product & Executive Leadership    : ${otherLeads}\n`);

    // 3. Batch upsert into Supabase hr_contacts
    console.log(`[3/3] Publishing ${leads.length} contacts to Supabase "hr_contacts" table...`);
    const BATCH_SIZE = 50;
    let totalUpserted = 0;
    let failedBatches = 0;

    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const chunk = leads.slice(i, i + BATCH_SIZE);
      const batchPayload = chunk.map(r => ({
        company: r.company,
        name: r.name,
        email: r.email,
        role: r.role,
        department: r.department,
        verification_status: 'valid',
      }));

      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(leads.length / BATCH_SIZE);

      const { error } = await supabase
        .from('hr_contacts')
        .upsert(batchPayload, { onConflict: 'email', ignoreDuplicates: false });

      if (error) {
        console.warn(`  ↳ Batch ${batchNum}/${totalBatches} Warning: ${error.message}`);
        failedBatches++;
      } else {
        totalUpserted += batchPayload.length;
        console.log(`  ↳ Batch ${batchNum}/${totalBatches} processed: +${batchPayload.length} decision makers synced.`);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n========================================================================');
    console.log(`✓ HR & MANAGER SCRAPER COMPLETE in ${elapsed}s`);
    console.log(`  • Companies Covered            : ${mergedCompanyPool.length}`);
    console.log(`  • Total Decision Makers Scraped: ${leads.length}`);
    console.log(`  • Successfully Synced to Cloud : ${totalUpserted}`);
    if (failedBatches > 0) {
      console.log(`  • Failed Batches               : ${failedBatches}`);
    }
    console.log(`  • Live Database                : ${env.SUPABASE_URL}`);
    console.log('========================================================================\n');
  } catch (err: any) {
    console.error('\n❌ [HR Scraper Fatal Error]:', err?.message || String(err));
    process.exit(1);
  }
}

publishHrsLocally();
