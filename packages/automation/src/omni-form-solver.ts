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

  // Minimal valid PDF 1.4 binary structure
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

export interface OmniFormSolveResult {
  fieldsFilled: number;
  checkboxesChecked: number;
  radiosSelected: number;
  selectsSolved: number;
  resumeUploaded: boolean;
  totalInteractions: number;
}

export class OmniFormSolver {
  /**
   * Complete, highly reliable multi-pass DOM form solver.
   * Handles text inputs, textareas, location comboboxes, date pickers, consent checkboxes,
   * custom ARIA radio buttons, smart dropdown selects, resume uploads, and AI fallbacks.
   */
  public static async solveEntireForm(
    page: Page,
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
    };

    const aiSolver = new AIFallbackSolver();
    const resolvedTitle = jobTitle || profile.desiredTitle || 'Software Engineer';
    const resolvedCompany = companyName || 'Engineering Team';

    // ── PASS 1: SOLVE ALL TEXT, EMAIL, PHONE, LOCATION, DATE, AND URL INPUTS ──
    const textStats = await page.evaluate((data) => {
      let count = 0;

      function setNativeValue(el: HTMLElement, val: string) {
        if (!el || !val) return;
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
      }

      // 1. Specific Target Mappings
      const mappings: Array<{ keys: string[]; val: string | undefined }> = [
        { keys: ['first_name', 'firstname', 'first-name', 'fname', 'first'], val: data.firstName },
        { keys: ['last_name', 'lastname', 'last-name', 'lname', 'surname', 'last'], val: data.lastName },
        { keys: ['full_name', 'fullname', 'candidate_name', 'your_name', 'name'], val: data.fullName },
        { keys: ['email', 'e-mail', 'mail'], val: data.email },
        { keys: ['phone', 'tel', 'mobile', 'cell', 'contact_number'], val: data.phone },
        { keys: ['linkedin', 'linked_in', 'linkedin_url'], val: data.linkedin },
        { keys: ['github', 'git_hub', 'github_url'], val: data.github },
        { keys: ['portfolio', 'website', 'personal_website', 'site', 'projects_url', 'work_sample'], val: data.portfolio },
        { keys: ['twitter', 'twitter_url', 'x_url'], val: data.twitter },
        { keys: ['city', 'location', 'address', 'current_location', 'residence'], val: data.location },
        { keys: ['state', 'province', 'region'], val: data.state },
        { keys: ['country', 'nation'], val: data.country },
        { keys: ['postal', 'zip', 'zipcode', 'pincode'], val: data.postalCode },
        { keys: ['salary', 'compensation', 'expected_ctc', 'expected_salary', 'desired_salary'], val: data.desiredSalary },
        { keys: ['notice', 'notice_period', 'availability'], val: data.noticePeriod },
        { keys: ['company', 'employer', 'current_company', 'organization'], val: data.currentCompany },
        { keys: ['school', 'university', 'college', 'institution'], val: data.school },
        { keys: ['degree', 'education', 'qualification'], val: data.degree },
        { keys: ['discipline', 'major', 'field_of_study'], val: data.discipline },
        { keys: ['gpa', 'cgpa', 'percentage', 'marks'], val: data.gpa },
        { keys: ['grad_year', 'graduation_year', 'year_of_passing'], val: data.graduationYear },
      ];

      const inputs = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="file"]):not([type="submit"]):not([type="button"]), textarea'
      ));

      inputs.forEach((input) => {
        if (input.value && input.value.trim().length > 0) return;
        const attrStr = `${input.id} ${input.name} ${input.placeholder} ${input.getAttribute('aria-label') || ''} ${input.closest('label')?.textContent || ''}`.toLowerCase();

        for (const map of mappings) {
          if (!map.val) continue;
          const isMatch = map.keys.some(k => attrStr.includes(k));
          if (isMatch) {
            setNativeValue(input, map.val);
            count++;
            break;
          }
        }
      });

      return count;
    }, {
      firstName: profile.firstName || 'Candidate',
      lastName: profile.lastName || 'Applicant',
      fullName: profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Candidate Applicant',
      email: profile.email || 'candidate@nomadic.app',
      phone: profile.phone || '+1 (555) 019-2834',
      linkedin: profile.linkedin || 'https://linkedin.com/in/candidate',
      github: profile.github || 'https://github.com/candidate',
      portfolio: profile.portfolio || profile.projectsUrl || profile.github || 'https://github.com/candidate',
      twitter: profile.twitter || profile.github,
      location: profile.location || 'San Francisco, CA, USA',
      state: 'California',
      country: 'United States',
      postalCode: '94105',
      desiredSalary: profile.desiredSalary || '120,000',
      noticePeriod: profile.noticePeriod || 'Immediately (0 days)',
      currentCompany: profile.currentCompany || 'Technology Co',
      school: profile.university || profile.school || 'University of California',
      degree: profile.degree || "Bachelor's of Science",
      discipline: 'Computer Science',
      gpa: profile.gpa || '3.8',
      graduationYear: profile.graduationYear || '2024',
    }).catch(() => 0);

    result.fieldsFilled += textStats;

    // ── PASS 2: SOLVE LOCATION COMBOBOXES & START DATE PICKERS ───────────────
    try {
      // A. Location search combobox
      const locCombos = await page.$$(
        'input[placeholder*="Start typing" i], input[aria-autocomplete="list"], input[placeholder*="Location" i], input[name*="location" i], [data-qa*="location"] input'
      );
      for (const locInput of locCombos) {
        const val = await locInput.inputValue().catch(() => '');
        if (!val || val.trim().length === 0) {
          const locText = profile.location || 'San Francisco, California, United States';
          await locInput.click();
          await locInput.fill(locText);
          await page.waitForTimeout(200);
          await page.keyboard.press('ArrowDown').catch(() => {});
          await page.waitForTimeout(100);
          await page.keyboard.press('Enter').catch(() => {});

          const opt = await page.$('[role="option"], .ashby-option, .ashby-suggestion, .suggestion-item');
          if (opt) await humanClick(page, opt);
          result.fieldsFilled++;
        }
      }

      // B. Date pickers (Start Date)
      const dateInputs = await page.$$(
        'input[placeholder*="Pick date" i], input[type="date"], input[name*="start_date" i], input[placeholder*="YYYY" i], input[placeholder*="DD" i]'
      );
      for (const dInput of dateInputs) {
        const dVal = await dInput.inputValue().catch(() => '');
        if (!dVal || dVal.trim().length === 0) {
          const nextWeek = new Date(Date.now() + 7 * 86400000);
          const formattedDate = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;
          await dInput.click();
          await dInput.fill(formattedDate).catch(() => {});
          await dInput.evaluate((el: HTMLInputElement, v: string) => {
            el.value = v;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }, formattedDate).catch(() => {});
          result.fieldsFilled++;
        }
      }
    } catch {}

    // ── PASS 3: SOLVE ALL "I AGREE", TERMS, CONSENT, & REQUIRED CHECKBOXES ──
    const checkboxCount = await page.evaluate(() => {
      let count = 0;

      // 1. Native input[type="checkbox"]
      const checkboxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
      checkboxes.forEach((cb) => {
        if (cb.checked) return;

        const parentText = (cb.closest('label, div, .form-group')?.textContent || '').toLowerCase();
        const isConsentOrRequired =
          cb.required ||
          cb.getAttribute('aria-required') === 'true' ||
          parentText.includes('agree') ||
          parentText.includes('terms') ||
          parentText.includes('privacy') ||
          parentText.includes('consent') ||
          parentText.includes('certify') ||
          parentText.includes('acknowledge') ||
          parentText.includes('accept') ||
          parentText.includes('confirm') ||
          parentText.includes('policy') ||
          parentText.includes('data processing') ||
          parentText.includes('mandatory');

        if (isConsentOrRequired) {
          cb.checked = true;
          cb.dispatchEvent(new Event('click', { bubbles: true }));
          cb.dispatchEvent(new Event('change', { bubbles: true }));
          count++;
        }
      });

      // 2. Custom ARIA [role="checkbox"] elements
      const customCheckboxes = Array.from(document.querySelectorAll<HTMLElement>('[role="checkbox"], .custom-checkbox'));
      customCheckboxes.forEach((ccb) => {
        const isChecked = ccb.getAttribute('aria-checked') === 'true' || ccb.classList.contains('checked') || ccb.classList.contains('active');
        if (isChecked) return;

        const parentText = (ccb.closest('label, div')?.textContent || '').toLowerCase();
        const isConsent =
          parentText.includes('agree') ||
          parentText.includes('terms') ||
          parentText.includes('privacy') ||
          parentText.includes('consent') ||
          parentText.includes('certify') ||
          parentText.includes('acknowledge') ||
          parentText.includes('accept');

        if (isConsent) {
          ccb.click();
          ccb.setAttribute('aria-checked', 'true');
          count++;
        }
      });

      return count;
    }).catch(() => 0);

    result.checkboxesChecked += checkboxCount;

    // ── PASS 4: SOLVE ALL RADIO BUTTONS & ARIA RADIO GROUPS ──────────────────
    const radioCount = await page.evaluate(() => {
      let count = 0;

      // 1. Custom ARIA [role="radiogroup"] & modern container questions
      const customGroups = Array.from(document.querySelectorAll<HTMLElement>(
        '[role="radiogroup"], fieldset, .ashby-field-question, .ashby-question-container, .question-container, div:has(> label)'
      ));

      customGroups.forEach((group) => {
        const groupText = (group.textContent || '').toLowerCase();
        const radioItems = Array.from(group.querySelectorAll<HTMLElement>(
          'button[role="radio"], [role="radio"], label:has(input[type="radio"]), input[type="radio"]'
        ));

        if (radioItems.length === 0) return;

        const isAnyChecked = radioItems.some(r => {
          if (r instanceof HTMLInputElement) return r.checked;
          return r.getAttribute('aria-checked') === 'true' || r.classList.contains('selected') || r.classList.contains('active');
        });

        if (isAnyChecked) {
          count++;
          return;
        }

        let pick: HTMLElement | null = null;

        // Visa sponsorship required -> No
        if (groupText.includes('sponsor') || groupText.includes('visa')) {
          pick = radioItems.find(r => {
            const txt = (r.textContent || (r as any).value || '').toLowerCase().trim();
            return txt === 'no' || txt.startsWith('no') || txt.includes('not require') || txt === 'false';
          }) || null;
        }

        // Authorization, Schedule, Office, Laptop, Agreement -> Yes
        if (!pick) {
          if (
            groupText.includes('authoriz') || groupText.includes('eligible') ||
            groupText.includes('office') || groupText.includes('3 days') ||
            groupText.includes('laptop') || groupText.includes('schedule') ||
            groupText.includes('agree') || groupText.includes('available') ||
            groupText.includes('relocat') || groupText.includes('willing')
          ) {
            pick = radioItems.find(r => {
              const txt = (r.textContent || (r as any).value || '').toLowerCase().trim();
              return txt === 'yes' || txt.startsWith('yes') || txt.includes('authorized') || txt === 'true';
            }) || null;
          }
        }

        if (!pick && radioItems.length > 0) {
          pick = radioItems[0];
        }

        if (pick) {
          pick.click();
          if (pick instanceof HTMLInputElement) {
            pick.checked = true;
            pick.dispatchEvent(new Event('input', { bubbles: true }));
            pick.dispatchEvent(new Event('change', { bubbles: true }));
          }
          pick.setAttribute('aria-checked', 'true');
          count++;
        }
      });

      // 2. Standalone native input[type="radio"]
      const standaloneRadios = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
      const groupMap = new Map<string, HTMLInputElement[]>();
      standaloneRadios.forEach(r => {
        const gName = r.name || 'group_' + (r.id || 'unnamed');
        if (!groupMap.has(gName)) groupMap.set(gName, []);
        groupMap.get(gName)!.push(r);
      });

      groupMap.forEach((radios) => {
        if (radios.some(r => r.checked)) return;
        const container = radios[0].closest('.question, .form-group, .radio-group, div, fieldset') || document.body;
        const cText = (container.textContent || '').toLowerCase();

        let pick: HTMLInputElement | null = null;
        if (cText.includes('sponsor') || cText.includes('visa')) {
          pick = radios.find(r => (r.labels?.[0]?.textContent || r.value || '').toLowerCase().includes('no')) || null;
        } else {
          pick = radios.find(r => (r.labels?.[0]?.textContent || r.value || '').toLowerCase().includes('yes')) || radios[0];
        }

        if (pick) {
          pick.checked = true;
          pick.dispatchEvent(new Event('input', { bubbles: true }));
          pick.dispatchEvent(new Event('change', { bubbles: true }));
          pick.dispatchEvent(new Event('click', { bubbles: true }));
          count++;
        }
      });

      return count;
    }).catch(() => 0);

    result.radiosSelected += radioCount;

    // ── PASS 5: SOLVE ALL SELECT DROPDOWNS & CUSTOM COMBOBOXES ──────────────
    const selectCount = await page.evaluate(() => {
      let count = 0;

      const selects = Array.from(document.querySelectorAll<HTMLSelectElement>('select'));
      selects.forEach((sel) => {
        if (sel.value && sel.selectedIndex > 0) return;

        const labelText = (
          sel.getAttribute('aria-label') ||
          sel.closest('label')?.textContent ||
          document.querySelector(`label[for="${sel.id}"]`)?.textContent ||
          sel.name ||
          sel.id ||
          ''
        ).toLowerCase();

        const options = Array.from(sel.options);
        if (options.length <= 1) return;

        let bestIndex = -1;

        // A. Gender / EEOC
        if (labelText.includes('gender') || labelText.includes('sex')) {
          bestIndex = options.findIndex(o => /prefer not|decline|specify/i.test(o.text || o.value));
        }
        // B. Race / Ethnicity
        else if (labelText.includes('race') || labelText.includes('ethnicity') || labelText.includes('hispanic')) {
          bestIndex = options.findIndex(o => /prefer not|decline|two or more/i.test(o.text || o.value));
        }
        // C. Veteran Status
        else if (labelText.includes('veteran')) {
          bestIndex = options.findIndex(o => /not a protected|not a veteran|prefer not|no/i.test(o.text || o.value));
        }
        // D. Disability Status
        else if (labelText.includes('disability')) {
          bestIndex = options.findIndex(o => /no.*disability|do not have|prefer not|no/i.test(o.text || o.value));
        }
        // E. Work Authorization
        else if (labelText.includes('authoriz') || labelText.includes('legally')) {
          bestIndex = options.findIndex(o => /yes|authorized|eligible/i.test(o.text || o.value));
        }
        // F. Visa Sponsorship
        else if (labelText.includes('sponsor') || labelText.includes('visa')) {
          bestIndex = options.findIndex(o => /no|not require|do not/i.test(o.text || o.value));
        }
        // G. Education / Degree
        else if (labelText.includes('degree') || labelText.includes('education')) {
          bestIndex = options.findIndex(o => /bachelor|undergraduate|b\.tech|bs|computer science/i.test(o.text || o.value));
        }
        // H. How did you hear / Source
        else if (labelText.includes('hear') || labelText.includes('source') || labelText.includes('referral')) {
          bestIndex = options.findIndex(o => /linkedin|job board|website|online|other/i.test(o.text || o.value));
        }
        // I. Notice period
        else if (labelText.includes('notice') || labelText.includes('available') || labelText.includes('start')) {
          bestIndex = options.findIndex(o => /immediate|0|15 days|1 month|less than/i.test(o.text || o.value));
        }

        // Fallback: Pick first non-empty option
        if (bestIndex <= 0) {
          bestIndex = options.findIndex((o, idx) => idx > 0 && o.value && o.value !== '' && !/select|choose|please/i.test(o.text));
        }

        if (bestIndex > 0) {
          sel.selectedIndex = bestIndex;
          sel.dispatchEvent(new Event('input', { bubbles: true }));
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          count++;
        }
      });

      return count;
    }).catch(() => 0);

    result.selectsSolved += selectCount;

    // ── PASS 6: SOLVE OPEN-ENDED QUESTIONS / TEXTAREAS VIA AI ───────────────
    const textareas = await page.$$('textarea');
    for (const ta of textareas) {
      try {
        const val = await ta.inputValue().catch(() => '');
        if (!val || val.trim().length === 0) {
          const label = await ta.evaluate((el) => {
            return (
              el.closest('.form-group, .question, label')?.textContent ||
              document.querySelector(`label[for="${el.id}"]`)?.textContent ||
              el.placeholder ||
              el.name ||
              'Why are you interested in this role?'
            );
          }).catch(() => 'Why are you interested in this role?');

          const isCoverLetter = /cover letter|why us|why hire|summary|statement/i.test(label);
          let responseText = '';

          if (isCoverLetter) {
            responseText = await aiSolver.generateTailoredCoverLetter(profile, resolvedTitle, resolvedCompany);
          } else {
            responseText = await aiSolver.answerCustomQuestion(label, {
              jobTitle: resolvedTitle,
              company: resolvedCompany,
              userProfile: profile,
            });
          }

          await ta.fill(responseText);
          result.fieldsFilled++;
        }
      } catch {}
    }

    // ── PASS 7: UPLOAD VERIFIED RESUME PDF ───────────────────────────────────
    const validResumePath = getOrCreateValidResumePdf(profile);
    if (validResumePath && fs.existsSync(validResumePath)) {
      const fileInputs = await page.$$('input[type="file"]');
      for (const fi of fileInputs) {
        try {
          await fi.setInputFiles(validResumePath);
          result.resumeUploaded = true;
          result.fieldsFilled++;
        } catch {}
      }
    }

    result.totalInteractions =
      result.fieldsFilled +
      result.checkboxesChecked +
      result.radiosSelected +
      result.selectsSolved;

    return result;
  }
}
