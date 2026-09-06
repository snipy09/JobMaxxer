import { generateStructuredAIContent } from './groq-ai.js';
import type { CandidateProfile } from './form-filler.js';

export class AIFallbackSolver {
  constructor(
    private logger?: { info: (m: string, meta?: any) => void; debug: (m: string, meta?: any) => void; warn: (m: string, meta?: any) => void; error: (m: string, meta?: any) => void }
  ) {}

  /**
   * ONLY USED: When an open-ended custom question requires synthesis
   * NEVER used for: Form structure detection, button finding, navigation
   */
  async answerCustomQuestion(
    question: string,
    context: {
      jobTitle: string;
      company: string;
      userProfile: CandidateProfile;
    },
    geminiKey?: string
  ): Promise<string> {
    this.logger?.info(`Asking AI for custom question: ${question}`);

    const prompt = `You are a job application assistant. Answer job application questions concisely (1-2 sentences max).

Candidate Profile:
- Name: ${context.userProfile.firstName} ${context.userProfile.lastName}
- Target Role: ${context.jobTitle}
- Company: ${context.company}
- Tech Skills: ${context.userProfile.techStack || 'Full Stack Software Engineering'}

Question: "${question}"

RULES:
- Be direct, professional, and authentic
- Max 2 sentences
- No fluff or corporate jargon
- Return strictly a JSON object: { "answer": "your answer here" }`;

    try {
      const res = await generateStructuredAIContent<{ answer: string }>(
        'You are an expert job applicant responding concisely.',
        prompt,
        { geminiKey }
      );
      if (res && res.answer) {
        this.logger?.debug(`AI answered: ${res.answer}`);
        return res.answer;
      }
    } catch (err) {
      this.logger?.warn('AI question answering failed, using fallback', { err });
    }

    return `I am excited to apply for the ${context.jobTitle} position at ${context.company}. My technical background and project experience align closely with your team's engineering goals.`;
  }
}
