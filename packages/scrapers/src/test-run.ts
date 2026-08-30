import { runAllScrapers } from './index.js';

async function test() {
  const jobs = await runAllScrapers();
  console.log(`[TEST SUCCESS] Total deduplicated jobs fetched: ${jobs.length}`);
  if (jobs.length > 0) {
    console.log('Sample Job:', {
      company: jobs[0].company,
      title: jobs[0].title,
      hash: jobs[0].jobHash,
      source: jobs[0].source
    });
  }
}

test();
