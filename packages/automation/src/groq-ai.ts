/**
 * Zero-Cost Dynamic Open-Ended Question Resolver
 * Uses Groq Free LLaMA 3.1 8B Cloud API (14,400 free requests/day)
 * Uses native fetch -- no axios or external HTTP libraries required.
 */
export async function answerCustomQuestionWithGroq(
  apiKey: string,
  question: string,
  candidateProfileContext: string
): Promise<string> {
  if (!apiKey) {
    return 'Detailed experience provided upon request in accordance with candidate profile.';
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are an executive job candidate assistant. Answer the job application question concisely, professionally, and accurately in first-person based ONLY on candidate details provided.'
          },
          {
            role: 'user',
            content: `Candidate Context:\n${candidateProfileContext}\n\nJob Application Question:\n${question}`
          }
        ],
        temperature: 0.2,
        max_tokens: 250
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Groq AI Error] HTTP ${res.status}: ${errText}`);
      return 'Experience aligns with job description requirements.';
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return data?.choices?.[0]?.message?.content?.trim() || '';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Groq AI Error]:', msg);
    return 'Experience aligns with job description requirements.';
  }
}

export async function matchResumeWithJob(
  apiKey: string,
  resumeText: string,
  jobDescription: string
): Promise<{ score: number; explanation: string }> {
  if (!apiKey) {
    return { score: 75, explanation: 'Score estimated -- Groq API key not configured.' };
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are a senior technical recruiter. Score the candidate resume against the job description on a 0-100 scale. Respond ONLY with valid JSON: {"score": <number>, "explanation": "<one_sentence>"}'
          },
          {
            role: 'user',
            content: `Resume:\n${resumeText}\n\nJob Description:\n${jobDescription}`
          }
        ],
        temperature: 0.1,
        max_tokens: 150
      })
    });

    if (!res.ok) return { score: 70, explanation: 'Groq API unavailable.' };

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data?.choices?.[0]?.message?.content?.trim() || '{}';
    const parsed = JSON.parse(raw) as { score?: number; explanation?: string };
    return {
      score: Number(parsed.score) || 70,
      explanation: parsed.explanation || 'Good match.'
    };
  } catch {
    return { score: 70, explanation: 'Could not parse match score.' };
  }
}

export async function generateCoverLetter(
  apiKey: string,
  candidateProfileContext: string,
  jobDescription: string,
  companyName: string
): Promise<string> {
  if (!apiKey) {
    return `Dear Hiring Manager at ${companyName},\n\nI am excited to apply for this role. My background aligns closely with the requirements listed, and I am eager to contribute to your team's success.\n\nBest regards`;
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are an expert cover letter writer. Write a concise, compelling 3-paragraph cover letter in first person. Do not use placeholder text. Return only the letter body, no subject line.'
          },
          {
            role: 'user',
            content: `Candidate Profile:\n${candidateProfileContext}\n\nJob Description:\n${jobDescription}\n\nCompany: ${companyName}`
          }
        ],
        temperature: 0.4,
        max_tokens: 400
      })
    });

    if (!res.ok) return `Dear Hiring Manager at ${companyName},\n\nI am excited to apply. My experience aligns well with this role.\n\nBest regards`;

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data?.choices?.[0]?.message?.content?.trim() || '';
  } catch {
    return `Dear Hiring Manager at ${companyName},\n\nI am excited to apply. My experience aligns well with this role.\n\nBest regards`;
  }
}
