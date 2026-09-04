import {
  AutoApplyEngine,
  type MasterProfile,
  type ApplyResult,
  type ResumeItem,
} from './auto-apply-engine.ts';
import {
  answerCustomQuestion,
  answerCustomQuestionWithGroq,
  callGeminiFlash,
  generateStructuredAIContent,
  extractJsonFromAiResponse,
  matchResumeWithJob,
  generateCoverLetter,
  BUILTIN_GEMINI_KEYS,
} from './groq-ai.ts';
import { ATS_FIELD_ALIASES } from './alias-dictionary.ts';
import {
  findChromeExecutable,
  ensureChromeForTesting,
  launchExternalStealthBrowser,
  type BrowserLaunchOptions,
  type BrowserSession,
} from './chrome-manager.ts';

export {
  AutoApplyEngine,
  answerCustomQuestion,
  answerCustomQuestionWithGroq,
  callGeminiFlash,
  generateStructuredAIContent,
  extractJsonFromAiResponse,
  matchResumeWithJob,
  generateCoverLetter,
  BUILTIN_GEMINI_KEYS,
  ATS_FIELD_ALIASES,
  findChromeExecutable,
  ensureChromeForTesting,
  launchExternalStealthBrowser,
};

export type {
  MasterProfile,
  ApplyResult,
  ResumeItem,
  BrowserLaunchOptions,
  BrowserSession,
};
