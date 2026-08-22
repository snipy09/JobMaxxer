import { AutoApplyEngine, type MasterProfile, type ApplyResult } from './auto-apply-engine.js';
import { answerCustomQuestionWithGroq } from './groq-ai.js';
import { ATS_FIELD_ALIASES } from './alias-dictionary.js';

export { AutoApplyEngine, answerCustomQuestionWithGroq, ATS_FIELD_ALIASES };
export type { MasterProfile, ApplyResult };

console.log('[Auto-Apply Engine] Initialized Playwright Stealth & Groq Free AI integration.');
