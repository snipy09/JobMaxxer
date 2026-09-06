import { generateStructuredAIContent } from './groq-ai.js';
import type { CandidateProfile } from './form-filler.js';
import type { MasterProfile } from './auto-apply-engine.js';

export class AIFallbackSolver {
  constructor(
    private logger?: { info: (m: string, meta?: any) => void; debug: (m: string, meta?: any) => void; warn: (m: string, meta?: any) => void; error: (m: string, meta?: any) => void }
  ) {}

  /**
   * Generates a tailored, high-converting cover letter / why-us response for a specific role and company.
   */
  async generateTailoredCoverLetter(
    profile: MasterProfile | CandidateProfile,
    jobTitle: string,
    company: string,
    geminiKey?: string
  ): Promise<string> {
    const candidateName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Candidate';
    const skills = profile.techStack || 'TypeScript, React, Node.js, Python, PostgreSQL, AWS';

    const prompt = `Write a punchy, tailored, high-impact job application cover letter / intro pitch.
Candidate: ${candidateName}
Skills: ${skills}
Target Role: ${jobTitle || 'Software Engineer'}
Target Company: ${company || 'your team'}

RULES:
- Length: 3 to 4 punchy sentences (under 90 words).
- Focus on technical alignment, building production software, and immediate readiness to contribute.
- No generic fluff ("I am writing to enthusiastically apply...").
- Return strictly valid JSON: { "coverLetter": "..." }`;

    try {
      const res = await generateStructuredAIContent<{ coverLetter: string }>(
        'You are an expert engineer writing an authentic high-signal cover pitch.',
        prompt,
        { geminiKey: (profile as MasterProfile).geminiApiKey || geminiKey }
      );
      if (res && res.coverLetter) {
        return res.coverLetter;
      }
    } catch {}

    return `I am excited to apply for the ${jobTitle || 'Software Engineer'} role at ${company || 'your team'}. With hands-on experience building systems in ${skills}, I have developed production-grade applications that scale reliably. I look forward to bringing this technical background to your engineering team.`;
  }

  /**
   * Synthesizes custom application questions (e.g. "Tell us about a time you solved a hard bug", "Why this company?").
   */
  async answerCustomQuestion(
    question: string,
    context: {
      jobTitle: string;
      company: string;
      userProfile: CandidateProfile | MasterProfile;
    },
    geminiKey?: string
  ): Promise<string> {
    this.logger?.info(`Asking AI for custom question: ${question}`);

    const candidateName = `${context.userProfile.firstName || ''} ${context.userProfile.lastName || ''}`.trim() || 'Candidate';
    const skills = context.userProfile.techStack || 'Full Stack Software Engineering';

    const prompt = `You are a job application assistant. Answer the following job application question concisely (1-2 sentences max).

Candidate Name: ${candidateName}
Target Role: ${context.jobTitle}
Company: ${context.company}
Tech Stack: ${skills}

Application Question: "${question}"

RULES:
- Be direct, professional, and authentic
- Max 2 sentences (under 45 words)
- No fluff or corporate buzzwords
- Return strictly a JSON object: { "answer": "..." }`;

    try {
      const res = await generateStructuredAIContent<{ answer: string }>(
        'You are an expert job applicant responding concisely.',
        prompt,
        { geminiKey: (context.userProfile as MasterProfile).geminiApiKey || geminiKey }
      );
      if (res && res.answer) {
        this.logger?.debug(`AI answered: ${res.answer}`);
        return res.answer;
      }
    } catch (err) {
      this.logger?.warn('AI question answering failed, using fallback', { err });
    }

    return `I have hands-on experience designing and shipping scalable software in ${skills}. I am eager to apply my technical background to help ${context.company} build high-quality systems.`;
  }
}
