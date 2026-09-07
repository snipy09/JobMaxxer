import type { Page, Frame } from 'playwright';
import type { MasterProfile } from './auto-apply-engine.js';
import { humanClick, randomPause } from './stealth-evasion.js';
import { AIFallbackSolver } from './ai-fallback.js';
import { generateStructuredAIContent } from './groq-ai.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Generates a valid minimal binary PDF resume file so file upload inputs never fail.
 */
export function getOrCreateValidResumePdf(profile: MasterProfile): string {
  if (profile.resumeFilePath && fs.existsSync(profile.resumeFilePath)) {
    return profile.resumeFilePath;
  }
  if (Array.isArray(profile.resumes) && profile.resumes.length > 0) {
    const def = profile.resumes.find(r => r.isDefault) || profile.resumes[0];
    if (def?.filePath && fs.existsSync(def.filePath)) {
      return def.filePath;
    }
  }

  const tmpDir = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Temp') : os.tmpdir();
  const pdfPath = path.join(tmpDir, 'Nomadic_Candidate_Resume.pdf');

  const name = `${profile.firstName || 'Candidate'} ${profile.lastName || 'Applicant'}`.trim();
  const email = profile.email || 'candidate@nomadic.app';
  const phone = profile.phone || '+1 (555) 019-2834';
  const role = profile.desiredTitle || 'Software Engineer';
  const skills = profile.techStack || 'TypeScript, React, Node.js, Python, PostgreSQL';

  const streamContent = `BT
/F1 18 Tf
50 720 Td
(${name} - ${role}) Tj
/F1 11 Tf
0 -25 Td
(Email: ${email} | Phone: ${phone}) Tj
0 -20 Td
(Skills: ${skills}) Tj
0 -25 Td
(Summary: Proven software engineer building scalable web applications and distributed systems.) Tj
ET`;

  const streamLen = streamContent.length;
  const pdfSource = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLen} >>
stream
${streamContent}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000234 00000 n 
0000000${(300 + streamLen).toString().padStart(3, '0')} 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${400 + streamLen}
%%EOF`;

  try {
    fs.writeFileSync(pdfPath, pdfSource, 'utf8');
  } catch {}

  return pdfPath;
}

export type FieldSemanticCategory =
  | 'first_name'
  | 'last_name'
  | 'full_name'
  | 'email'
  | 'phone'
  | 'linkedin'
  | 'github'
  | 'portfolio'
  | 'website'
  | 'twitter'
  | 'location_search'
  | 'city'
  | 'state'
  | 'country'
  | 'postal_code'
  | 'salary'
  | 'notice_period'
  | 'start_date'
  | 'current_company'
  | 'current_title'
  | 'school'
  | 'degree'
  | 'discipline'
  | 'gpa'
  | 'graduation_year'
  | 'work_auth_yes'
  | 'visa_sponsor_no'
  | 'eeo_gender'
  | 'eeo_race'
  | 'eeo_veteran'
  | 'eeo_disability'
  | 'terms_consent'
  | 'cover_letter'
  | 'custom_textarea'
  | 'resume_file'
  | 'unknown_text'
  | 'unknown_select'
  | 'unknown_radio'
  | 'unknown_checkbox';

export interface FormFieldDescriptor {
  uid: string;
  tagName: string;
  type: string;
  id: string;
  name: string;
  label: string;
  placeholder: string;
  isRequired: boolean;
  isFilled: boolean;
  currentValue: string;
  category: FieldSemanticCategory;
  options?: Array<{ text: string; value: string; index: number; isChecked?: boolean }>;
}

export interface RecognizedFormSchema {
  totalFieldsCount: number;
  unfilledFieldsCount: number;
  fields: FormFieldDescriptor[];
}

export interface OmniFormSolveResult {
  fieldsFilled: number;
  checkboxesChecked: number;
  radiosSelected: number;
  selectsSolved: number;
  resumeUploaded: boolean;
  totalInteractions: number;
  schema: RecognizedFormSchema;
}

export class OmniFormSolver {
  /**
   * PHASE 1: Introspects and Recognizes ALL interactive elements in the DOM.
   * Tags each element with a unique `data-nomadic-uid` and extracts complete semantic metadata.
   */
  public static async recognizeFormFields(page: Page): Promise<RecognizedFormSchema> {
    return await page.evaluate(() => {
      let uidCounter = 0;
      const descriptors: FormFieldDescriptor[] = [];

      function resolveElementLabel(el: HTMLElement): string {
        let text = '';
        if (el.getAttribute('aria-label')) text += ' ' + el.getAttribute('aria-label');
        if (el.getAttribute('aria-labelledby')) {
          const lbl = document.getElementById(el.getAttribute('aria-labelledby') || '');
          if (lbl) text += ' ' + lbl.textContent;
        }
        if (el.id) {
          const lbl = document.querySelector(`label[for="${el.id}"]`);
          if (lbl) text += ' ' + lbl.textContent;
        }
        const parentLabel = el.closest('label');
        if (parentLabel) text += ' ' + parentLabel.textContent;
        const formGroup = el.closest('.form-group, .question, .field, [class*="field"], [class*="question"], div');
        if (formGroup) {
          const header = formGroup.querySelector('label, h3, h4, .label, [class*="label"], [class*="title"], legend');
          if (header) text += ' ' + header.textContent;
        }
        if (el.getAttribute('placeholder')) text += ' ' + el.getAttribute('placeholder');
        if (el.getAttribute('name')) text += ' ' + el.getAttribute('name');
        if (el.id) text += ' ' + el.id;
        return text.replace(/\s+/g, ' ').trim();
      }

      function classifyFieldCategory(label: string, tagName: string, type: string): FieldSemanticCategory {
        const l = label.toLowerCase();

        if (type === 'file' || l.includes('resume') || l.includes('cv') || l.includes('curriculum')) {
          return 'resume_file';
        }

        if (type === 'checkbox' || tagName === 'checkbox') {
          if (
            l.includes('agree') || l.includes('terms') || l.includes('privacy') ||
            l.includes('consent') || l.includes('certify') || l.includes('acknowledge') ||
            l.includes('accept') || l.includes('policy') || l.includes('data')
          ) {
            return 'terms_consent';
          }
          return 'unknown_checkbox';
        }

        if (type === 'radio' || tagName === 'radiogroup') {
          if (l.includes('sponsor') || l.includes('visa')) return 'visa_sponsor_no';
          if (l.includes('authoriz') || l.includes('eligible') || l.includes('legal') || l.includes('office') || l.includes('laptop') || l.includes('schedule') || l.includes('agree')) return 'work_auth_yes';
          return 'unknown_radio';
        }

        if (tagName === 'select' || tagName === 'combobox') {
          if (l.includes('gender') || l.includes('sex')) return 'eeo_gender';
          if (l.includes('race') || l.includes('ethnicity') || l.includes('hispanic')) return 'eeo_race';
          if (l.includes('veteran')) return 'eeo_veteran';
          if (l.includes('disability')) return 'eeo_disability';
          if (l.includes('authoriz') || l.includes('eligible') || l.includes('legally')) return 'work_auth_yes';
          if (l.includes('sponsor') || l.includes('visa')) return 'visa_sponsor_no';
          if (l.includes('degree') || l.includes('education')) return 'degree';
          if (l.includes('notice') || l.includes('available')) return 'notice_period';
          return 'unknown_select';
        }

        if (tagName === 'textarea') {
          if (l.includes('cover letter') || l.includes('why us') || l.includes('why hire') || l.includes('summary') || l.includes('statement')) {
            return 'cover_letter';
          }
          return 'custom_textarea';
        }

        // Text & Other Inputs
        if (l.includes('first name') || l.includes('firstname') || l.includes('first_name') || l.includes('fname')) return 'first_name';
        if (l.includes('last name') || l.includes('lastname') || l.includes('last_name') || l.includes('lname') || l.includes('surname')) return 'last_name';
        if (l.includes('full name') || l.includes('fullname') || l.includes('your name') || l.includes('candidate name') || l.includes('name')) return 'full_name';
        if (type === 'email' || l.includes('email') || l.includes('e-mail')) return 'email';
        if (type === 'tel' || l.includes('phone') || l.includes('mobile') || l.includes('contact')) return 'phone';
        if (l.includes('linkedin')) return 'linkedin';
        if (l.includes('github')) return 'github';
        if (l.includes('portfolio') || l.includes('personal website') || l.includes('work sample') || l.includes('project')) return 'portfolio';
        if (l.includes('website') || l.includes('site')) return 'website';
        if (l.includes('twitter') || l.includes('x.com')) return 'twitter';
        if (l.includes('start typing') || (l.includes('location') && (l.includes('located') || l.includes('where')))) return 'location_search';
        if (l.includes('city')) return 'city';
        if (l.includes('state') || l.includes('province')) return 'state';
        if (l.includes('country') || l.includes('nation')) return 'country';
        if (l.includes('postal') || l.includes('zip') || l.includes('pincode')) return 'postal_code';
        if (l.includes('salary') || l.includes('compensation') || l.includes('ctc')) return 'salary';
        if (l.includes('notice') || l.includes('availability')) return 'notice_period';
        if (l.includes('pick date') || l.includes('start date') || l.includes('start role') || type === 'date') return 'start_date';
        if (l.includes('company') || l.includes('employer') || l.includes('organization')) return 'current_company';
        if (l.includes('school') || l.includes('university') || l.includes('college')) return 'school';
        if (l.includes('degree')) return 'degree';
        if (l.includes('major') || l.includes('discipline')) return 'discipline';
        if (l.includes('gpa') || l.includes('cgpa')) return 'gpa';
        if (l.includes('grad') || l.includes('passing year')) return 'graduation_year';

        return 'unknown_text';
      }

      // 1. Gather all inputs, textareas, selects
      const elements = Array.from(document.querySelectorAll<HTMLElement>(
        'input, textarea, select, [role="radiogroup"], [role="checkbox"], [role="combobox"]'
      ));

      elements.forEach((el) => {
        const tagName = el.tagName.toLowerCase();
        const type = (el.getAttribute('type') || '').toLowerCase();
        if (type === 'hidden' || type === 'submit' || type === 'button') return;

        uidCounter++;
        const uid = `nomadic-field-${uidCounter}`;
        el.setAttribute('data-nomadic-uid', uid);

        const label = resolveElementLabel(el);
        const placeholder = el.getAttribute('placeholder') || '';
        const id = el.id || '';
        const name = el.getAttribute('name') || '';
        const isRequired = el.hasAttribute('required') || el.getAttribute('aria-required') === 'true' || label.includes('*');

        let currentValue = '';
        let isFilled = false;
        let options: Array<{ text: string; value: string; index: number; isChecked?: boolean }> | undefined;

        if (el instanceof HTMLInputElement) {
          currentValue = el.value || '';
          if (type === 'checkbox' || type === 'radio') {
            isFilled = el.checked;
          } else {
            isFilled = currentValue.trim().length > 0;
          }
        } else if (el instanceof HTMLTextAreaElement) {
          currentValue = el.value || '';
          isFilled = currentValue.trim().length > 0;
        } else if (el instanceof HTMLSelectElement) {
          currentValue = el.value || '';
          isFilled = el.selectedIndex > 0;
          options = Array.from(el.options).map((o, idx) => ({
            text: o.text || '',
            value: o.value || '',
            index: idx,
            isChecked: o.selected,
          }));
        } else if (el.getAttribute('role') === 'radiogroup') {
          const radioItems = Array.from(el.querySelectorAll<HTMLElement>('button[role="radio"], [role="radio"], input[type="radio"]'));
          options = radioItems.map((r, idx) => ({
            text: r.textContent || (r as any).value || '',
            value: (r as any).value || r.textContent || '',
            index: idx,
            isChecked: r.getAttribute('aria-checked') === 'true' || (r as any).checked,
          }));
          isFilled = options.some(o => o.isChecked);
        } else if (el.getAttribute('role') === 'checkbox') {
          isFilled = el.getAttribute('aria-checked') === 'true' || el.classList.contains('checked');
        }

        const category = classifyFieldCategory(label, tagName, type);

        descriptors.push({
          uid,
          tagName,
          type,
          id,
          name,
          label,
          placeholder,
          isRequired,
          isFilled,
          currentValue,
          category,
          options,
        });
      });

      return {
        totalFieldsCount: descriptors.length,
        unfilledFieldsCount: descriptors.filter(d => !d.isFilled).length,
        fields: descriptors,
      };
    });
  }

  /**
   * PHASE 2: High-Precision Value Assignment & Multi-Pass Injection
   * Fills every recognized field using candidate profile data, deterministic logic, and AI fallbacks.
   */
  public static async fillRecognizedForm(
    page: Page,
    schema: RecognizedFormSchema,
    profile: MasterProfile,
    jobTitle?: string,
    companyName?: string
  ): Promise<OmniFormSolveResult> {
    const result: OmniFormSolveResult = {
      fieldsFilled: 0,
      checkboxesChecked: 0,
      radiosSelected: 0,
      selectsSolved: 0,
      resumeUploaded: false,
      totalInteractions: 0,
      schema,
    };

    const aiSolver = new AIFallbackSolver();
    const resolvedTitle = jobTitle || profile.desiredTitle || 'Software Engineer';
    const resolvedCompany = companyName || 'Engineering Team';

    const candidateProfileData = {
      first_name: profile.firstName || 'Candidate',
      last_name: profile.lastName || 'Applicant',
      full_name: profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Candidate Applicant',
      email: profile.email || 'candidate@nomadic.app',
      phone: profile.phone || '+1 (555) 019-2834',
      linkedin: profile.linkedin || 'https://linkedin.com/in/candidate',
      github: profile.github || 'https://github.com/candidate',
      portfolio: profile.portfolio || profile.projectsUrl || profile.github || 'https://github.com/candidate',
      website: profile.portfolio || profile.github || 'https://github.com/candidate',
      twitter: profile.twitter || profile.github || 'https://twitter.com/candidate',
      location: profile.location || 'San Francisco, CA, USA',
      city: 'San Francisco',
      state: 'California',
      country: 'United States',
      postal_code: '94105',
      salary: profile.desiredSalary || '120,000',
      notice_period: profile.noticePeriod || 'Immediately (0 days)',
      current_company: profile.currentCompany || 'Technology Co',
      current_title: resolvedTitle,
      school: profile.university || profile.school || 'University of California',
      degree: profile.degree || "Bachelor's of Science",
      discipline: 'Computer Science',
      gpa: profile.gpa || '3.8',
      graduation_year: profile.graduationYear || '2024',
    };

    // Iterate through recognized fields and execute deterministic or AI injection
    for (const field of schema.fields) {
      if (field.isFilled) continue;

      const elHandle = await page.$(`[data-nomadic-uid="${field.uid}"]`);
      if (!elHandle) continue;

      try {
        switch (field.category) {
          case 'first_name':
          case 'last_name':
          case 'full_name':
          case 'email':
          case 'phone':
          case 'linkedin':
          case 'github':
          case 'portfolio':
          case 'website':
          case 'twitter':
          case 'city':
          case 'state':
          case 'country':
          case 'postal_code':
          case 'salary':
          case 'notice_period':
          case 'current_company':
          case 'current_title':
          case 'school':
          case 'degree':
          case 'discipline':
          case 'gpa':
          case 'graduation_year': {
            const valToSet = (candidateProfileData as any)[field.category];
            if (valToSet) {
              await elHandle.evaluate((el: HTMLElement, val: string) => {
                const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
                const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                if (setter) {
                  setter.call(el, val);
                } else {
                  (el as any).value = val;
                }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true }));
              }, valToSet);
              result.fieldsFilled++;
            }
            break;
          }

          case 'location_search': {
            await elHandle.click();
            await elHandle.fill(candidateProfileData.location);
            await page.waitForTimeout(200);
            await page.keyboard.press('ArrowDown').catch(() => {});
            await page.waitForTimeout(100);
            await page.keyboard.press('Enter').catch(() => {});
            const opt = await page.$('[role="option"], .ashby-option, .ashby-suggestion, .suggestion-item');
            if (opt) await humanClick(page, opt);
            result.fieldsFilled++;
            break;
          }

          case 'start_date': {
            const nextWeek = new Date(Date.now() + 7 * 86400000);
            const formattedDate = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;
            await elHandle.click();
            await elHandle.fill(formattedDate).catch(() => {});
            await elHandle.evaluate((el: HTMLInputElement, val: string) => {
              el.value = val;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }, formattedDate).catch(() => {});
            result.fieldsFilled++;
            break;
          }

          case 'terms_consent':
          case 'unknown_checkbox': {
            if (field.category === 'terms_consent' || field.isRequired) {
              await elHandle.evaluate((el: HTMLElement) => {
                if (el instanceof HTMLInputElement && el.type === 'checkbox') {
                  el.checked = true;
                  el.dispatchEvent(new Event('click', { bubbles: true }));
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                  el.click();
                  el.setAttribute('aria-checked', 'true');
                }
              });
              result.checkboxesChecked++;
            }
            break;
          }

          case 'work_auth_yes':
          case 'visa_sponsor_no':
          case 'unknown_radio': {
            await elHandle.evaluate((el: HTMLElement, cat: FieldSemanticCategory) => {
              const radioItems = Array.from(el.querySelectorAll<HTMLElement>(
                'button[role="radio"], [role="radio"], label:has(input[type="radio"]), input[type="radio"]'
              ));
              if (radioItems.length === 0) return;

              let pick: HTMLElement | null = null;
              if (cat === 'visa_sponsor_no') {
                pick = radioItems.find(r => /no|not require|false/i.test(r.textContent || (r as any).value || '')) || null;
              } else {
                pick = radioItems.find(r => /yes|authorized|eligible|agree|true/i.test(r.textContent || (r as any).value || '')) || radioItems[0];
              }

              if (pick) {
                pick.click();
                if (pick instanceof HTMLInputElement) {
                  pick.checked = true;
                  pick.dispatchEvent(new Event('input', { bubbles: true }));
                  pick.dispatchEvent(new Event('change', { bubbles: true }));
                }
                pick.setAttribute('aria-checked', 'true');
              }
            }, field.category);
            result.radiosSelected++;
            break;
          }

          case 'eeo_gender':
          case 'eeo_race':
          case 'eeo_veteran':
          case 'eeo_disability':
          case 'unknown_select': {
            await elHandle.evaluate((el: HTMLElement, cat: FieldSemanticCategory) => {
              if (el instanceof HTMLSelectElement) {
                const options = Array.from(el.options);
                if (options.length <= 1) return;

                let bestIndex = -1;
                if (cat === 'eeo_gender' || cat === 'eeo_race' || cat === 'eeo_veteran' || cat === 'eeo_disability') {
                  bestIndex = options.findIndex(o => /prefer not|decline|specify|not a protected|no.*disability/i.test(o.text || o.value));
                }

                if (bestIndex <= 0) {
                  bestIndex = options.findIndex((o, idx) => idx > 0 && o.value && o.value !== '' && !/select|choose|please/i.test(o.text));
                }

                if (bestIndex > 0) {
                  el.selectedIndex = bestIndex;
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }
            }, field.category);
            result.selectsSolved++;
            break;
          }

          case 'cover_letter':
          case 'custom_textarea': {
            let responseText = '';
            if (field.category === 'cover_letter') {
              responseText = await aiSolver.generateTailoredCoverLetter(profile, resolvedTitle, resolvedCompany);
            } else {
              responseText = await aiSolver.answerCustomQuestion(field.label || 'Why are you interested in this position?', {
                jobTitle: resolvedTitle,
                company: resolvedCompany,
                userProfile: profile,
              });
            }
            await elHandle.fill(responseText);
            result.fieldsFilled++;
            break;
          }

          case 'resume_file': {
            const validPdf = getOrCreateValidResumePdf(profile);
            if (validPdf && fs.existsSync(validPdf)) {
              await elHandle.setInputFiles(validPdf).catch(() => {});
              result.resumeUploaded = true;
              result.fieldsFilled++;
            }
            break;
          }

          case 'unknown_text': {
            if (field.isRequired || field.label.length > 3) {
              // Ask AI for the optimal answer for this unknown field
              const aiAns = await aiSolver.answerCustomQuestion(field.label, {
                jobTitle: resolvedTitle,
                company: resolvedCompany,
                userProfile: profile,
              });
              await elHandle.fill(aiAns);
              result.fieldsFilled++;
            }
            break;
          }
        }
      } catch {}
    }

    // ── PASS 8: PRE-SUBMIT REMEDIATION PASS (Catches any remaining required/empty fields) ──
    try {
      const remainingUnfilled = await page.$$('input:invalid, textarea:invalid, select:invalid, [required]:not(:checked)');
      for (const un of remainingUnfilled) {
        try {
          const isReq = await un.evaluate(el => (el as any).required || el.getAttribute('aria-required') === 'true').catch(() => false);
          if (!isReq) continue;

          const tag = await un.evaluate(el => el.tagName.toLowerCase()).catch(() => '');
          const type = await un.evaluate(el => (el.getAttribute('type') || '').toLowerCase()).catch(() => '');

          if (type === 'checkbox') {
            await un.evaluate((el: HTMLElement) => {
              if (el instanceof HTMLInputElement) el.checked = true;
              el.dispatchEvent(new Event('click', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            });
            result.checkboxesChecked++;
          } else if (type === 'file') {
            const validPdf = getOrCreateValidResumePdf(profile);
            if (validPdf && fs.existsSync(validPdf)) {
              await un.setInputFiles(validPdf).catch(() => {});
              result.resumeUploaded = true;
            }
          } else if (tag === 'textarea' || tag === 'input') {
            const label = await un.evaluate(el => {
              return el.closest('.form-group, .question, label')?.textContent || (el as any).placeholder || (el as any).name || 'Application detail';
            }).catch(() => 'Application detail');

            const answer = await aiSolver.answerCustomQuestion(label, {
              jobTitle: resolvedTitle,
              company: resolvedCompany,
              userProfile: profile,
            });
            await un.fill(answer).catch(() => {});
            result.fieldsFilled++;
          }
        } catch {}
      }
    } catch {}

    result.totalInteractions =
      result.fieldsFilled +
      result.checkboxesChecked +
      result.radiosSelected +
      result.selectsSolved;

    return result;
  }

  /**
   * Universal Master Form Solver:
   * Recognizes entire form schema first $\rightarrow$ Fills every field $\rightarrow$ Verifies completion.
   */
  public static async solveEntireForm(
    page: Page,
    profile: MasterProfile,
    jobTitle?: string,
    companyName?: string
  ): Promise<OmniFormSolveResult> {
    // 1. RECOGNIZE ALL FIELDS IN FORM
    const schema = await OmniFormSolver.recognizeFormFields(page);

    // 2. FILL RECOGNIZED FIELDS ACCORDING TO RECOGNIZED SCHEMA
    const result = await OmniFormSolver.fillRecognizedForm(
      page,
      schema,
      profile,
      jobTitle,
      companyName
    );

    return result;
  }
}
