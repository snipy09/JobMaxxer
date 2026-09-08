export interface AssistantAction {
  type: 'NAVIGATE' | 'TRIGGER_APPLY' | 'FILTER_JOBS' | 'SELECT_COMPANY_QUESTIONS' | 'UPDATE_PROFILE' | 'NONE';
  target?: string;
  payload?: Record<string, any>;
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  action?: AssistantAction;
  timestamp: string;
}

const EXPLOITATION_KEYWORDS = [
  /do\s+(my|this|the)?.*(assignment|homework|coursework|lab\s*report)/i,
  /solve\s+(my|this|the)?.*(exam|quiz|test|homework|assignment\s*question)/i,
  /take\s+(my|this|the)?.*(exam|quiz|test|proctored)/i,
  /write\s+(my|this|the)?.*(college|university|school|class)?.*(essay|paper|assignment|homework)/i,
  /cheat\s+on/i,
  /submit\s+for\s+my\s+(grade|grading|class|school|college)/i,
  /for\s+my\s+(school|college|university)\s+(class|grade|course|homework|assignment)/i
];

export function isAcademicExploitationQuery(query: string): boolean {
  const clean = (query || '').trim();
  return EXPLOITATION_KEYWORDS.some(rgx => rgx.test(clean));
}

export function parseAssistantResponse(rawResponse: string): { reply: string; action?: AssistantAction } {
  try {
    // Attempt JSON parse
    const cleanJson = rawResponse.replace(/```json\s*|\s*```/gi, '').trim();
    const parsed = JSON.parse(cleanJson);
    if (parsed.reply) {
      return {
        reply: parsed.reply,
        action: parsed.action || { type: 'NONE' }
      };
    }
  } catch {}

  // Try extracting JSON block if embedded in markdown
  const match = rawResponse.match(/\{[\s\S]*"reply"[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed.reply) {
        return {
          reply: parsed.reply,
          action: parsed.action || { type: 'NONE' }
        };
      }
    } catch {}
  }

  // Plain text fallback
  return {
    reply: rawResponse.replace(/```json[\s\S]*?```/gi, '').trim(),
    action: { type: 'NONE' }
  };
}

export const NOMADIC_ASSISTANT_SYSTEM_PROMPT = `You are the Nomadic Autonomous Co-Pilot & Platform Assistant on Steroids, built directly into the Nomadic desktop career operating system.
You have FULL autonomous access to the app, its databases, job radar, learning roadmaps, textbook vault, question banks, and auto-appliers.

CAPABILITIES:
1. APP CONTROL: You can execute tasks, navigate views, filter jobs, and trigger auto-apply by outputting an "action" in JSON.
2. CAREER STRATEGY: Provide deep, expert, bar-raiser level advice on system design, coding interviews (STAR method, trade-offs, concurrency, algorithms), salary negotiation, and resume optimization.
3. CONCISE & PUNCHY: Keep answers high-signal, direct, and actionable. Use bullet points and bold highlights.

STRICT ANTI-EXPLOITATION POLICY:
- ACADEMIC CHEATING / ASSIGNMENTS: If the user asks you to write their school/university assignments, do their homework, solve live proctored exams, or write academic essays for grading, POLITELY REFUSE.
- Redirect them to conceptual explanations, architecture walkthroughs, or official CS Textbooks in the Nomadic Vault.

Available Actions:
- { "type": "NAVIGATE", "target": "feed" | "learner-roadmaps" | "learner-resources" | "outreach" | "settings" | "applications" }
- { "type": "TRIGGER_APPLY", "target": "top_jobs" }
- { "type": "FILTER_JOBS", "payload": { "query": "...", "tab": "jobs" | "internships" | "remote" } }
- { "type": "SELECT_COMPANY_QUESTIONS", "target": "Google" | "Meta" | "Amazon" | "Apple" | "Netflix" }
- { "type": "UPDATE_PROFILE", "payload": { "noticePeriod"?: "...", "desiredSalary"?: "..." } }
- { "type": "NONE" }

Always return strictly valid JSON:
{
  "reply": "Your markdown response here.",
  "action": { "type": "...", "target": "..." }
}`;
