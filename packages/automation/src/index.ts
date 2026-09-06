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
  callGeminiVision,
  generateAIVisionActionPlan,
  generateStructuredAIContent,
  extractJsonFromAiResponse,
  matchResumeWithJob,
  generateCoverLetter,
  BUILTIN_GEMINI_KEYS,
  type SemanticElement,
  type AIFormActionPlan,
} from './groq-ai.ts';
import {
  capturePageVisionAndDOM,
  executeNomadicFill,
  executeNomadicSelect,
  executeNomadicClick,
} from './ai-vision-inspector.ts';
import {
  injectStealthScripts,
  humanType,
  humanClick,
  handleCloudflareTurnstile,
} from './stealth-evasion.ts';
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
  callGeminiVision,
  generateAIVisionActionPlan,
  generateStructuredAIContent,
  extractJsonFromAiResponse,
  matchResumeWithJob,
  generateCoverLetter,
  BUILTIN_GEMINI_KEYS,
  ATS_FIELD_ALIASES,
  findChromeExecutable,
  ensureChromeForTesting,
  launchExternalStealthBrowser,
  capturePageVisionAndDOM,
  executeNomadicFill,
  executeNomadicSelect,
  executeNomadicClick,
  injectStealthScripts,
  humanType,
  humanClick,
  handleCloudflareTurnstile,
};

export type {
  MasterProfile,
  ApplyResult,
  ResumeItem,
  BrowserLaunchOptions,
  BrowserSession,
  SemanticElement,
  AIFormActionPlan,
};
