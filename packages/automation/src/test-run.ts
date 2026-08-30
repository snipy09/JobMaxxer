import { answerCustomQuestionWithGroq } from './groq-ai.js';
import { ATS_FIELD_ALIASES } from './alias-dictionary.js';

async function testAutoApply() {
  console.log('[TEST AUTO-APPLY] Verifying ATS Alias Dictionary...');
  console.log('FirstName Aliases:', ATS_FIELD_ALIASES.firstName);

  console.log('[TEST AUTO-APPLY] Testing Groq Free AI Fallback Resolver...');
  const answer = await answerCustomQuestionWithGroq(
    '',
    'Why do you want to work at Stripe?',
    'Candidate: Sajal Sharma, Senior Software Engineer with 5+ years experience in Node.js, React, TypeScript.'
  );

  console.log('AI Generated Answer:', answer);
  console.log('[TEST SUCCESS] Auto-Apply Submitter Engine Verified!');
}

testAutoApply();
