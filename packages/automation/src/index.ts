import {
  AutoApplyEngine,
  type MasterProfile,
  type ApplyResult,
  type ResumeItem,
} from './auto-apply-engine.ts';
import { answerCustomQuestionWithGroq } from './groq-ai.ts';
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
  answerCustomQuestionWithGroq,
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
