export type QuestionIntent = 
  | 'AFFIRMATIVE_YES' 
  | 'NEGATIVE_NO' 
  | 'AGREEMENT_ACKNOWLEDGE' 
  | 'LEGAL_CERTIFICATION' 
  | 'DEMOGRAPHIC_DECLINE' 
  | 'GENERAL';

export function classifyQuestionIntent(questionText: string): QuestionIntent {
  const text = (questionText || '').toLowerCase();

  // 1. Visa Sponsorship -> No
  if (text.includes('sponsor') || text.includes('visa')) {
    return 'NEGATIVE_NO';
  }

  // 2. Arbitration & Agreements -> Acknowledge / Agree
  if (
    text.includes('arbitration') ||
    text.includes('dispute') ||
    text.includes('acknowledgement') ||
    text.includes('acknowledge') ||
    text.includes('i agree') ||
    text.includes('applicant agreement')
  ) {
    return 'AGREEMENT_ACKNOWLEDGE';
  }

  // 3. Legal Certifications -> Certify / True & Correct
  if (
    text.includes('hereby certify') ||
    text.includes('withheld') ||
    text.includes('true and correct') ||
    text.includes('personally completed') ||
    text.includes('under penalty')
  ) {
    return 'LEGAL_CERTIFICATION';
  }

  // 4. Demographics -> Decline / Prefer not to say
  if (
    text.includes('gender') ||
    text.includes('race') ||
    text.includes('veteran') ||
    text.includes('disability') ||
    text.includes('ethnicity')
  ) {
    return 'DEMOGRAPHIC_DECLINE';
  }

  // 5. Office schedule, HQ, hybrid, work authorization, laptop -> Yes
  if (
    text.includes('san francisco') ||
    text.includes('hq') ||
    text.includes('office') ||
    text.includes('days per week') ||
    text.includes('onsite') ||
    text.includes('hybrid') ||
    text.includes('relocate') ||
    text.includes('authorized') ||
    text.includes('eligible') ||
    text.includes('work from') ||
    text.includes('able to work') ||
    text.includes('schedule') ||
    text.includes('laptop') ||
    text.includes('background check')
  ) {
    return 'AFFIRMATIVE_YES';
  }

  return 'GENERAL';
}

export function matchBestOptionIndex(options: string[], intent: QuestionIntent): number {
  if (options.length === 0) return -1;

  switch (intent) {
    case 'NEGATIVE_NO': {
      const idx = options.findIndex(o => /^(no|false|do not require|not require|will not require)/i.test(o.trim()));
      return idx >= 0 ? idx : options.length - 1;
    }
    case 'AGREEMENT_ACKNOWLEDGE': {
      const idx = options.findIndex(o => /^(i acknowledge|acknowledge|i agree|agree|accept|yes)/i.test(o.trim()));
      return idx >= 0 ? idx : 0;
    }
    case 'DEMOGRAPHIC_DECLINE': {
      const idx = options.findIndex(o => /prefer not|decline|choose not|not to say|not a protected/i.test(o));
      return idx >= 0 ? idx : 0;
    }
    case 'AFFIRMATIVE_YES':
    case 'LEGAL_CERTIFICATION':
    default: {
      const idx = options.findIndex(o => /^(yes|i am able|i can|agree|true|authorized|eligible)/i.test(o.trim()));
      return idx >= 0 ? idx : 0;
    }
  }
}
