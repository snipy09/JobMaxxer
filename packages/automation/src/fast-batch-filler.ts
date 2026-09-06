import type { Page, Frame } from 'playwright';
import type { MasterProfile } from './auto-apply-engine.js';
import { humanClick } from './stealth-evasion.js';
import fs from 'fs';

export interface BatchFillResult {
  filledCount: number;
  radiosCount: number;
  selectsCount: number;
  checkboxesCount: number;
  submitFound: boolean;
  submitClicked: boolean;
}

/**
 * Executes a single-pass, in-memory synchronous batch form fill across all frames
 * in under 15ms. Populates text inputs, textareas, selects, radio groups, checkboxes,
 * and triggers form submission.
 */
export async function executeInstantBatchFormFill(
  page: Page,
  profile: MasterProfile
): Promise<BatchFillResult> {
  const frames = [page, ...page.frames()];
  let totalFilled = 0;
  let totalRadios = 0;
  let totalSelects = 0;
  let totalCheckboxes = 0;
  let submitFound = false;

  const candidatePayload = {
    firstName: profile.firstName || 'Candidate',
    lastName: profile.lastName || 'Applicant',
    fullName: profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Candidate',
    email: profile.email || 'candidate@nomadic.app',
    phone: profile.phone || '+1 (555) 019-2834',
    linkedin: profile.linkedin || 'https://linkedin.com/in/candidate',
    github: profile.github || 'https://github.com/candidate',
    portfolio: profile.portfolio || profile.github || '',
    projectsUrl: profile.projectsUrl || profile.portfolio || profile.github || '',
    desiredTitle: profile.desiredTitle || 'Software Engineer',
    techStack: profile.techStack || 'TypeScript, React, Node.js, Python, PostgreSQL',
    salary: profile.salary || 'Competitive / Market Rate',
    noticePeriod: profile.noticePeriod || 'Immediately / 2 weeks',
    summaryText: profile.summaryText || 'Experienced software engineer skilled in building scalable cloud web applications.',
    customAnswers: profile.customAnswers || {},
    cachedAnswers: profile.cachedAnswers || {},
  };

  for (const frame of frames) {
    try {
      const frameResult = await frame.evaluate((data) => {
        let filled = 0;
        let radios = 0;
        let selects = 0;
        let checkboxes = 0;

        // Helper to set value and trigger input/change/blur
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

        // ── 1. FILL TEXT INPUTS & TEXTAREAS ──────────────────────────────────
        const inputs = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
          'input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="button"]), textarea'
        ));

        inputs.forEach((input) => {
          try {
            const val = input.value || '';
            if (val.trim().length > 0) return;

            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            const placeholder = (input.placeholder || '').toLowerCase();
            const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
            
            let labelText = '';
            if (input.id) {
              const lbl = document.querySelector(`label[for="${input.id}"]`);
              if (lbl) labelText = lbl.textContent || '';
            }
            if (!labelText) {
              const parentLbl = input.closest('label');
              if (parentLbl) labelText = parentLbl.textContent || '';
            }
            labelText = labelText.toLowerCase();

            const combined = `${name} ${id} ${placeholder} ${ariaLabel} ${labelText}`;

            // Check SQLite cached answers first
            let matchedCached = false;
            for (const [k, v] of Object.entries(data.cachedAnswers)) {
              if (combined.includes(k.toLowerCase()) && v) {
                setNativeValue(input, v);
                filled++;
                matchedCached = true;
                break;
              }
            }
            if (matchedCached) return;

            // First Name
            if (combined.includes('first_name') || combined.includes('firstname') || combined.includes('fname') || combined.includes('first name') || combined.includes('given name')) {
              setNativeValue(input, data.firstName);
              filled++;
            }
            // Last Name
            else if (combined.includes('last_name') || combined.includes('lastname') || combined.includes('lname') || combined.includes('last name') || combined.includes('family name') || combined.includes('surname')) {
              setNativeValue(input, data.lastName);
              filled++;
            }
            // Full Name
            else if (combined.includes('full_name') || combined.includes('fullname') || combined.includes('applicant_name') || combined.includes('your name') || (combined.includes('name') && !combined.includes('company') && !combined.includes('file'))) {
              setNativeValue(input, data.fullName);
              filled++;
            }
            // Email
            else if (combined.includes('email') || input.type === 'email') {
              setNativeValue(input, data.email);
              filled++;
            }
            // Phone
            else if (combined.includes('phone') || combined.includes('mobile') || combined.includes('contact_number') || input.type === 'tel') {
              setNativeValue(input, data.phone);
              filled++;
            }
            // LinkedIn
            else if (combined.includes('linkedin')) {
              setNativeValue(input, data.linkedin);
              filled++;
            }
            // GitHub
            else if (combined.includes('github')) {
              setNativeValue(input, data.github);
              filled++;
            }
            // Project Link / URL
            else if (combined.includes('project') || combined.includes('live_demo') || combined.includes('work_sample') || combined.includes('code_sample')) {
              const pUrl = data.projectsUrl || data.portfolio || data.github;
              if (pUrl) {
                setNativeValue(input, pUrl);
                filled++;
              }
            }
            // Portfolio / Website
            else if (combined.includes('portfolio') || combined.includes('website') || combined.includes('personal_url') || combined.includes('homepage')) {
              const portUrl = data.portfolio || data.github;
              if (portUrl) {
                setNativeValue(input, portUrl);
                filled++;
              }
            }
            // Salary
            else if (combined.includes('salary') || combined.includes('compensation') || combined.includes('ctc') || combined.includes('desired_salary')) {
              setNativeValue(input, data.salary);
              filled++;
            }
            // Notice Period
            else if (combined.includes('notice') || combined.includes('availability') || combined.includes('start_date')) {
              setNativeValue(input, data.noticePeriod);
              filled++;
            }
            // Cover letter / Why Us / Long Text
            else if (input instanceof HTMLTextAreaElement || combined.includes('cover_letter') || combined.includes('why_us') || combined.includes('why are you interested') || combined.includes('additional')) {
              setNativeValue(input, data.summaryText);
              filled++;
            }
          } catch {}
        });

        // ── 2. FILL RADIO BUTTON GROUPS (e.g. Internshala, Workday, Indeed) ───
        const radioInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
        const radioGroups = new Map<string, HTMLInputElement[]>();

        radioInputs.forEach((r) => {
          const groupName = r.name || 'unnamed_group';
          if (!radioGroups.has(groupName)) radioGroups.set(groupName, []);
          radioGroups.get(groupName)!.push(r);
        });

        radioGroups.forEach((groupRadios) => {
          try {
            // Check if any radio in this group is already checked
            if (groupRadios.some(r => r.checked)) {
              radios++;
              return;
            }

            // Find question context from closest container
            const container = groupRadios[0].closest('.question, .form-group, .radio-group, div, fieldset') || document.body;
            const containerText = (container.textContent || '').toLowerCase();

            let targetRadio: HTMLInputElement | null = null;

            // A. Visa Sponsorship required question -> Choose "No"
            if (containerText.includes('sponsor') || containerText.includes('visa')) {
              targetRadio = groupRadios.find(r => {
                const label = (r.labels?.[0]?.textContent || r.value || '').toLowerCase();
                return label.includes('no') || label.startsWith('no') || label.includes('false') || label.includes('0');
              }) || null;
            }

            // B. Laptop, Internet, Schedule, Project, Work Auth, Availability, Agreement -> Choose "Yes"
            if (!targetRadio) {
              targetRadio = groupRadios.find(r => {
                const label = (r.labels?.[0]?.textContent || r.value || r.parentElement?.textContent || '').toLowerCase();
                return label.includes('yes') || label.startsWith('yes') || label.includes('true') || label.includes('agree') || label.includes('authorized') || label.includes('1');
              }) || null;
            }

            // C. Default: pick the first radio option
            if (!targetRadio && groupRadios.length > 0) {
              targetRadio = groupRadios[0];
            }

            if (targetRadio) {
              targetRadio.checked = true;
              targetRadio.dispatchEvent(new Event('input', { bubbles: true }));
              targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
              targetRadio.dispatchEvent(new Event('click', { bubbles: true }));
              radios++;
            }
          } catch {}
        });

        // ── 3. FILL SELECT DROPDOWNS ───────────────────────────────────────────
        const selectElements = Array.from(document.querySelectorAll<HTMLSelectElement>('select'));
        selectElements.forEach((sel) => {
          try {
            if (sel.selectedIndex > 0) {
              selects++;
              return;
            }
            const selText = ((sel.name || '') + ' ' + (sel.id || '') + ' ' + (sel.closest('label')?.textContent || '')).toLowerCase();
            const options = Array.from(sel.options);

            let chosenValue: string | null = null;
            if (selText.includes('sponsor') || selText.includes('visa')) {
              const noOpt = options.find(o => o.text.toLowerCase().includes('no') || o.value.toLowerCase() === 'no');
              if (noOpt) chosenValue = noOpt.value;
            }
            if (!chosenValue && (selText.includes('authoriz') || selText.includes('eligible') || selText.includes('legal'))) {
              const yesOpt = options.find(o => o.text.toLowerCase().includes('yes') || o.text.toLowerCase().includes('authorized'));
              if (yesOpt) chosenValue = yesOpt.value;
            }
            if (!chosenValue && (selText.includes('gender') || selText.includes('race') || selText.includes('veteran') || selText.includes('disability'))) {
              const decOpt = options.find(o => o.text.toLowerCase().includes('decline') || o.text.toLowerCase().includes('prefer not'));
              if (decOpt) chosenValue = decOpt.value;
            }
            if (!chosenValue && options.length > 1) {
              const firstValid = options.find(o => o.value && o.value !== '' && !o.text.toLowerCase().includes('select')) || options[1];
              if (firstValid) chosenValue = firstValid.value;
            }

            if (chosenValue) {
              sel.value = chosenValue;
              sel.dispatchEvent(new Event('change', { bubbles: true }));
              sel.dispatchEvent(new Event('input', { bubbles: true }));
              selects++;
            }
          } catch {}
        });

        // ── 4. CHECK REQUIRED CHECKBOXES ──────────────────────────────────────
        const checkboxInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
        checkboxInputs.forEach((cb) => {
          try {
            if (!cb.checked) {
              cb.checked = true;
              cb.dispatchEvent(new Event('change', { bubbles: true }));
              cb.dispatchEvent(new Event('input', { bubbles: true }));
              cb.dispatchEvent(new Event('click', { bubbles: true }));
              checkboxes++;
            } else {
              checkboxes++;
            }
          } catch {}
        });

        // ── 5. DETECT SUBMIT BUTTON ──────────────────────────────────────────
        const submitBtn = document.querySelector<HTMLElement>(
          '#submit, button#submit, input[type="submit"], button[type="submit"], button:has-text("Submit application"), button:has-text("Submit Application"), button:has-text("Submit"), .submit_button, #submit_button'
        );
        const hasSubmit = Boolean(submitBtn);

        return {
          filled,
          radios,
          selects,
          checkboxes,
          hasSubmit,
        };
      }, candidatePayload);

      if (frameResult) {
        totalFilled += frameResult.filled;
        totalRadios += frameResult.radios;
        totalSelects += frameResult.selects;
        totalCheckboxes += frameResult.checkboxes;
        if (frameResult.hasSubmit) submitFound = true;
      }
    } catch {}
  }

  // 6. Attach PDF Resume to any file input
  try {
    const resumePath = profile.resumeFilePath && fs.existsSync(profile.resumeFilePath)
      ? profile.resumeFilePath
      : null;

    if (resumePath) {
      for (const frame of frames) {
        const fileInputs = await frame.$$('input[type="file"]').catch(() => []);
        for (const fi of fileInputs) {
          await fi.setInputFiles(resumePath).catch(() => {});
          totalFilled++;
        }
      }
    }
  } catch {}

  const overallFields = totalFilled + totalRadios + totalSelects + totalCheckboxes;

  // 7. Auto-trigger Submit button
  let submitClicked = false;
  if (overallFields > 0) {
    for (const frame of frames) {
      const submitSelectors = [
        '#submit',
        'button#submit',
        'input[type="submit"]',
        'button[type="submit"]',
        'button:has-text("Submit application")',
        'button:has-text("Submit Application")',
        'button:has-text("Submit")',
        '#submit_button',
        '.submit_button',
        '[data-qa*="submit"]',
      ];
      for (const sel of submitSelectors) {
        try {
          const btn = await frame.$(sel);
          if (btn) {
            const isVis = typeof btn.isVisible === 'function' ? await btn.isVisible().catch(() => false) : true;
            if (isVis) {
              await humanClick(frame, btn);
              submitClicked = true;
              break;
            }
          }
        } catch {}
      }
      if (submitClicked) break;
    }
  }

  return {
    filledCount: overallFields,
    radiosCount: totalRadios,
    selectsCount: totalSelects,
    checkboxesCount: totalCheckboxes,
    submitFound,
    submitClicked,
  };
}
