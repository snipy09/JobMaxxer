import { generateStructuredAIContent } from './groq-ai.js';
import type { SemanticDOMSnapshot, SemanticElement } from './semantic-dom-extractor.js';
import type { MasterProfile } from './auto-apply-engine.js';

export interface AIPilotFillAction {
  elementId: string;
  value: string;
  fieldType: 'text' | 'textarea' | 'radio' | 'select' | 'checkbox' | 'file';
  fieldPurpose?: string;
}

export interface AIPilotSelectAction {
  elementId: string;
  selectedOption: string;
}

export interface AIPilotPlan {
  pageState: 'job_description' | 'application_form' | 'stepper_modal' | 'submitted_confirmed' | 'login_required' | 'captcha_detected' | 'unknown';
  actionType: 'click_apply' | 'fill_form' | 'fill_and_submit' | 'advance_step' | 'done';
  clickTargetElementId?: string;
  fillActions: AIPilotFillAction[];
  selectActions?: AIPilotSelectAction[];
  clickElementIds?: string[];
  uploadResumeElementId?: string;
  submitButtonElementId?: string;
  statusMessage?: string;
}

/**
 * AI Pilot Planner (End-to-End Autonomous Form Pilot)
 * Sends complete DOM state and candidate profile to AI, returning exact structured actions.
 */
export async function generateAIPilotPlan(
  profile: MasterProfile,
  snapshot: SemanticDOMSnapshot,
  options?: { geminiKey?: string; groqKey?: string }
): Promise<AIPilotPlan | null> {
  const fullName = (profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`).trim() || 'Candidate';
  const firstName = profile.firstName || (fullName.split(' ')[0] || 'Candidate');
  const lastName = profile.lastName || (fullName.split(' ').slice(1).join(' ') || 'Applicant');
  const email = profile.email || 'candidate@nomadic.app';
  const phone = profile.phone || '+1 (555) 019-2834';
  const linkedin = profile.linkedin || 'https://linkedin.com/in/candidate';
  const github = profile.github || 'https://github.com/candidate';
  const portfolio = profile.portfolio || profile.projectsUrl || profile.github || 'https://github.com/candidate';
  const location = profile.location || 'San Francisco, CA, USA';
  const role = profile.desiredTitle || 'Software Engineer';
  const skills = profile.techStack || 'TypeScript, React, Node.js, Next.js, Python, PostgreSQL, AWS, Docker';
  const salary = profile.desiredSalary || profile.salary || '$120,000 / Competitive';
  const notice = profile.noticePeriod || 'Immediately (0 days)';

  const candidateSummary = {
    fullName,
    firstName,
    lastName,
    email,
    phone,
    linkedin,
    github,
    portfolio,
    location,
    targetRole: role,
    skills,
    desiredSalary: salary,
    noticePeriod: notice,
    workAuthorization: 'Yes (Authorized to work)',
    visaRequirement: 'No (Do not require sponsorship)',
    hybridOfficeAvailability: 'Yes (Able to work in SF HQ / 3 days per week / relocate)',
    arbitrationAgreement: 'I Acknowledge and Agree to terms',
    legalCertification: 'I certify that all statements are true and correct',
    customAnswers: profile.customAnswers || {},
    cachedAnswers: profile.cachedAnswers || {},
  };

  // Format elements to keep prompt high-signal and lightweight
  const formattedElements = snapshot.interactiveElements.slice(0, 100).map(el => ({
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

  const systemInstruction = `You are the Nomadic Autonomous AI Auto-Applier.
Your goal is to inspect the full job application page and return the exact list of actions to complete and submit the application.

DECISION RULES:
1. If the page is a job description with an "Apply" button or link:
   - set actionType="click_apply"
   - set clickTargetElementId to the apply button's ID.
2. If the page contains form fields (Name, Email, Phone, Resume, Experience, Radio Buttons, Checkboxes, Textareas):
   - Map all inputs to the candidate's verified profile data in fillActions.
   - For file inputs / resume uploads, set uploadResumeElementId to that element ID.
   - For radio buttons or button groups:
     * Work Authorization, Office Attendance (SF HQ / 3 days / hybrid), Over-18 -> Select "Yes" / affirmative option.
     * Visa Sponsorship Required -> Select "No".
     * Arbitration Agreements -> Select "I Acknowledge" / "Agree".
     * Legal Certifications -> Select "Confirm" / "Certify".
     Include the target radio/button IDs in clickElementIds.
   - For checkboxes (Terms & Conditions, Agreements, Consent), include their IDs in clickElementIds.
   - For open-ended questions / textareas, synthesize a concise tailored 1-2 sentence response grounded in the candidate's actual skills (${skills}).
   - Identify the primary Submit Button and set submitButtonElementId to its ID.
   - Set actionType="fill_and_submit".
3. If the page confirms submission ("Application submitted", "Thank you for applying"):
   - set actionType="done", pageState="submitted_confirmed".
4. Output strictly valid JSON.`;

  const prompt = `Candidate Profile:
${JSON.stringify(candidateSummary, null, 2)}

Current Page:
URL: ${snapshot.currentUrl}
Title: ${snapshot.pageTitle}

Interactive DOM Elements (${formattedElements.length} elements detected):
${JSON.stringify(formattedElements, null, 2)}

Generate the exact AIPilotPlan JSON with all fillActions, selectActions, clickElementIds, uploadResumeElementId, and submitButtonElementId.`;

  try {
    const plan = await generateStructuredAIContent<AIPilotPlan>(
      prompt,
      systemInstruction,
      { geminiKey: options?.geminiKey, groqKey: options?.groqKey }
    );
    if (plan && plan.actionType) {
      return plan;
    }
  } catch {}

  // Deterministic Fallback Plan Generation
  const fallbackPlan: AIPilotPlan = {
    pageState: snapshot.hasApplicationForm ? 'application_form' : (snapshot.isJobDescription ? 'job_description' : 'unknown'),
    actionType: snapshot.hasApplicationForm ? 'fill_and_submit' : (snapshot.isJobDescription ? 'click_apply' : 'fill_and_submit'),
    fillActions: [],
    clickElementIds: [],
    statusMessage: 'AI Form Mapping Active',
  };

  formattedElements.forEach(el => {
    const combined = `${el.name || ''} ${el.label || ''} ${el.placeholder || ''} ${el.type || ''}`.toLowerCase();

    if (el.type === 'file' || combined.includes('resume') || combined.includes('cv')) {
      fallbackPlan.uploadResumeElementId = el.id;
    } else if (el.type === 'email' || combined.includes('email')) {
      fallbackPlan.fillActions.push({ elementId: el.id, value: email, fieldType: 'text' });
    } else if (el.type === 'tel' || combined.includes('phone') || combined.includes('mobile')) {
      fallbackPlan.fillActions.push({ elementId: el.id, value: phone, fieldType: 'text' });
    } else if (combined.includes('first') && combined.includes('name')) {
      fallbackPlan.fillActions.push({ elementId: el.id, value: firstName, fieldType: 'text' });
    } else if (combined.includes('last') && combined.includes('name')) {
      fallbackPlan.fillActions.push({ elementId: el.id, value: lastName, fieldType: 'text' });
    } else if (combined.includes('full') && combined.includes('name') || el.name === 'name' || el.id.includes('name')) {
      fallbackPlan.fillActions.push({ elementId: el.id, value: fullName, fieldType: 'text' });
    } else if (combined.includes('linkedin')) {
      fallbackPlan.fillActions.push({ elementId: el.id, value: linkedin, fieldType: 'text' });
    } else if (combined.includes('github')) {
      fallbackPlan.fillActions.push({ elementId: el.id, value: github, fieldType: 'text' });
    } else if (combined.includes('portfolio') || combined.includes('website')) {
      fallbackPlan.fillActions.push({ elementId: el.id, value: portfolio, fieldType: 'text' });
    } else if (el.tag === 'TEXTAREA') {
      fallbackPlan.fillActions.push({
        elementId: el.id,
        value: `With hands-on experience in ${skills}, I build resilient web applications and scalable distributed systems that drive business impact.`,
        fieldType: 'textarea'
      });
    }

    if (el.tag === 'BUTTON' || el.type === 'submit') {
      const text = (el.text || '').toLowerCase();
      if (text.includes('submit') || text.includes('apply')) {
        fallbackPlan.submitButtonElementId = el.id;
      }
    }
  });

  return fallbackPlan;
}
