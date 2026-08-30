import {
  EmailVerificationPipeline,
  type VerificationResult,
} from './pipeline.ts';
import {
  LocalOutreachSender,
  type SmtpConfig,
  type OutreachEmail,
} from './sender.ts';
import {
  ExternalChromeOutreach,
  type OutreachRecipient,
  type OutreachDispatchResult,
} from './chrome-outreach.ts';

export {
  EmailVerificationPipeline,
  LocalOutreachSender,
  ExternalChromeOutreach,
};

export type {
  VerificationResult,
  SmtpConfig,
  OutreachEmail,
  OutreachRecipient,
  OutreachDispatchResult,
};
