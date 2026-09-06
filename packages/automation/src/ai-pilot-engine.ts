import { generateStructuredAIContent } from './groq-ai.js';
import type { SemanticDOMSnapshot, SemanticElement } from './semantic-dom-extractor.js';
import type { MasterProfile } from './auto-apply-engine.js';

export interface AIPilotFillAction {
  elementId: string;
  value: string;
  fieldType: 'text' | 'textarea' | 'radio' | 'select' | 'checkbox' | 'file';
}

export interface AIPilotPlan {
  pageState: 'job_description' | 'application_form' | 'stepper_modal' | 'submitted_confirmed';
  actionType: 'click_apply' | 'fill_and_submit' | 'advance_step' | 'done';
  clickTargetElementId?: string;
  fillActions: AIPilotFillAction[];
  submitButtonElementId?: string;
  statusMessage?: string;
}

/**
 * Ultra-Fast AI Pilot Planner (~120ms execution)
 * Given the candidate profile and a 2KB semantic DOM snapshot, returns an exact execution plan.
 */
export async function generateAIPilotPlan(
  profile: MasterProfile,
  snapshot: SemanticDOMSnapshot,
  options?: { geminiKey?: string; groqKey?: string }
): Promise<AIPilotPlan | null> {
  const candidateSummary = {
    firstName: profile.firstName || 'Candidate',
    lastName: profile.lastName || 'Applicant',
    fullName: profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Candidate',
    email: profile.email || 'candidate@nomadic.app',
    phone: profile.phone || '+1 (555) 019-2834',
    linkedIn: profile.linkedin || 'https://linkedin.com/in/candidate',
    github: profile.github || 'https://github.com/candidate',
    portfolio: profile.portfolio || profile.github || '',
    projectsUrl: profile.projectsUrl || profile.portfolio || profile.github || '',
    desiredTitle: profile.desiredTitle || 'Software Engineer',
    techStack: profile.techStack || 'TypeScript, React, Node.js, Python, PostgreSQL',
    salary: profile.salary || 'Competitive / Market Rate',
    noticePeriod: profile.noticePeriod || 'Immediately / 2 weeks',
    summaryText: profile.summaryText || 'Experienced software engineer skilled in building scalable web applications.',
    customAnswers: profile.customAnswers || {},
    cachedAnswers: profile.cachedAnswers || {},
  };

  // Filter and format interactive elements to keep payload under 2KB
  const formattedElements = snapshot.interactiveElements.map(el => ({
    id: el.id,
    tag: el.tagName,
    type: el.type,
    name: el.name,
    label: el.label,
    placeholder: el.placeholder,
    text: el.text,
    options: el.options,
    radioGroup: el.radioGroup,
  }));

  const systemInstruction = `You are the Nomadic High-Speed AI Auto-Apply Pilot.
Your task is to analyze interactive DOM elements and return an instant execution plan.

RULES:
1. If the page is a job description with an Apply CTA ("Apply for this position", "Apply now", "Apply with Resume"), set actionType: "click_apply" and point clickTargetElementId to that button.
2. If the page contains form fields:
   - Map text/email/phone/URL inputs to candidate data.
   - For radio button groups (laptop, internet, schedule, work authorization, agreements), select the positive option (e.g. "Yes" / "Agree"). For sponsorship required, select "No".
   - For file inputs, set fieldType: "file" and value: "RESUME_ATTACHMENT".
   - For custom questions or textareas, answer concisely (1-2 sentences).
   - Set submitButtonElementId to the primary submit button.
3. Output strictly valid JSON matching the schema.`;

  const prompt = `Candidate Profile:
${JSON.stringify(candidateSummary, null, 2)}

Current URL: ${snapshot.currentUrl}
Page Title: ${snapshot.pageTitle}

Interactive Elements:
${JSON.stringify(formattedElements, null, 2)}

Generate the AIPilotPlan JSON strictly formatted as:
{
  "pageState": "job_description" | "application_form" | "stepper_modal" | "submitted_confirmed",
  "actionType": "click_apply" | "fill_and_submit" | "advance_step" | "done",
  "clickTargetElementId": "nomadic-el-...",
  "fillActions": [
    {
      "elementId": "nomadic-el-...",
      "value": "...",
      "fieldType": "text" | "textarea" | "radio" | "select" | "checkbox" | "file"
    }
  ],
  "submitButtonElementId": "nomadic-el-...",
  "statusMessage": "..."
}`;

  try {
    const plan = await generateStructuredAIContent<AIPilotPlan>(
      systemInstruction,
      prompt,
      { geminiKey: options?.geminiKey, groqKey: options?.groqKey }
    );
    if (plan && plan.actionType) {
      return plan;
    }
  } catch (err) {
    // Return null to fallback to deterministic rule engine
  }

  return null;
}
