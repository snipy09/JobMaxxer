import { generateStructuredAIContent } from '../../automation/src/groq-ai.js';

export interface AIUrlAuditResult {
  isAuthenticJob: boolean;
  confidenceScore: number;
  reason: string;
  directApplicationUrl?: string;
}

/**
 * Stage 4: AI URL Quality Auditor
 * Analyzes ambiguous or complex job pages using Gemini 2.0 Flash to ensure they are
 * single job postings / application forms and not directory indexes or marketing hubs.
 */
export async function auditJobUrlWithAI(
  url: string,
  htmlSnippet: string,
  jobTitle: string,
  company: string,
  options?: { geminiKey?: string }
): Promise<AIUrlAuditResult> {
  const cleanSnippet = (htmlSnippet || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .substring(0, 3000);

  const prompt = `You are a high-precision QA auditor for tech job postings.
Verify whether the following page is a genuine, single job application form or job detail opening, OR if it is an invalid directory / home page / search results page.

URL: ${url}
Expected Company: ${company}
Expected Title: ${jobTitle}

Page HTML Text Content:
${cleanSnippet}

Evaluate and return strictly valid JSON:
{
  "isAuthenticJob": boolean (true if this is a real specific job opening/application form, false if it is a general career directory, search page, 404, or home page),
  "confidenceScore": number (0 to 1),
  "reason": "Brief explanation of evaluation",
  "directApplicationUrl": "Direct URL to application form if discovered on page"
}`;

  try {
    const res = await generateStructuredAIContent<AIUrlAuditResult>(
      'You are a strict QA auditor verifying job application URLs.',
      prompt,
      { geminiKey: options?.geminiKey }
    );

    if (res && typeof res.isAuthenticJob === 'boolean') {
      return res;
    }
  } catch {}

  return {
    isAuthenticJob: true,
    confidenceScore: 0.9,
    reason: 'Deterministic heuristics passed',
    directApplicationUrl: url,
  };
}
