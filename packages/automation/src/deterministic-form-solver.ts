import type { Page, Frame } from 'playwright';
import type { MasterProfile } from './auto-apply-engine.js';
import { humanClick } from './stealth-evasion.js';
import fs from 'fs';

export interface DeterministicSolveResult {
  filledCount: number;
  radiosCount: number;
  selectsCount: number;
  checkboxesCount: number;
  submitClicked: boolean;
  isConfirmed: boolean;
}

/**
 * Universal Single-Pass Deterministic Form Solver.
 * Executes inside the page context in < 20ms and populates:
 * - Text, email, phone, URL, textarea inputs
 * - Contextual radio button groups (laptop, internet, schedule, work authorization)
 * - Standard and custom combobox dropdowns
 * - Required agreement checkboxes
 * - File attachments (resume PDF)
 * - Triggers instant submission and verifies completion
 */
export async function executeDeterministicFormSolve(
  page: Page,
  profile: MasterProfile
): Promise<DeterministicSolveResult> {
  const frames = [page, ...page.frames()];
  let totalFilled = 0;
  let totalRadios = 0;
  let totalSelects = 0;
  let totalCheckboxes = 0;

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
      const result = await frame.evaluate((data) => {
        let filled = 0;
        let radios = 0;
        let selects = 0;
        let checkboxes = 0;

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

        // 1. Text & Textarea Inputs
        const textInputs = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
          'input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="button"]), textarea'
        ));

        textInputs.forEach((input) => {
          try {
            const val = input.value || '';
            if (val.trim().length > 0) return;

            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            const placeholder = (input.placeholder || '').toLowerCase();
            const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();

            // Ignore search bars, newsletter subscriptions, feedback forms
            if (
              input.type === 'search' ||
              name.includes('search') ||
              placeholder.includes('search') ||
              id.includes('search') ||
              name.includes('newsletter') ||
              placeholder.includes('newsletter') ||
              placeholder.includes('subscribe') ||
              name.includes('subscribe') ||
              id.includes('subscribe') ||
              name.includes('comment') ||
              placeholder.includes('leave a comment')
            ) {
              return;
            }

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

            let matched = false;
            for (const [k, v] of Object.entries(data.cachedAnswers)) {
              if (combined.includes(k.toLowerCase()) && v) {
                setNativeValue(input, v);
                filled++;
                matched = true;
                break;
              }
            }
            if (matched) return;

            if (combined.includes('first_name') || combined.includes('firstname') || combined.includes('fname') || combined.includes('first name') || combined.includes('given name')) {
              setNativeValue(input, data.firstName);
              filled++;
            } else if (combined.includes('last_name') || combined.includes('lastname') || combined.includes('lname') || combined.includes('last name') || combined.includes('family name')) {
              setNativeValue(input, data.lastName);
              filled++;
            } else if (combined.includes('full_name') || combined.includes('fullname') || combined.includes('applicant_name') || (combined.includes('name') && !combined.includes('company') && !combined.includes('file'))) {
              setNativeValue(input, data.fullName);
              filled++;
            } else if (combined.includes('email') || input.type === 'email') {
              setNativeValue(input, data.email);
              filled++;
            } else if (combined.includes('phone') || combined.includes('mobile') || combined.includes('contact') || input.type === 'tel') {
              setNativeValue(input, data.phone);
              filled++;
            } else if (combined.includes('linkedin')) {
              setNativeValue(input, data.linkedin);
              filled++;
            } else if (combined.includes('github')) {
              setNativeValue(input, data.github);
              filled++;
            } else if (combined.includes('project') || combined.includes('live_demo') || combined.includes('work_sample')) {
              const pUrl = data.projectsUrl || data.portfolio || data.github;
              if (pUrl) {
                setNativeValue(input, pUrl);
                filled++;
              }
            } else if (combined.includes('portfolio') || combined.includes('website') || combined.includes('personal_url') || combined.includes('homepage')) {
              const portUrl = data.portfolio || data.github;
              if (portUrl) {
                setNativeValue(input, portUrl);
                filled++;
              }
            } else if (combined.includes('salary') || combined.includes('compensation') || combined.includes('ctc') || combined.includes('desired_salary')) {
              setNativeValue(input, data.salary);
              filled++;
            } else if (combined.includes('notice') || combined.includes('availability') || combined.includes('start_date')) {
              setNativeValue(input, data.noticePeriod);
              filled++;
            } else if (input instanceof HTMLTextAreaElement || combined.includes('cover_letter') || combined.includes('why_us') || combined.includes('why are you interested') || combined.includes('additional')) {
              setNativeValue(input, data.summaryText);
              filled++;
            }
          } catch {}
        });

        // 2. Radio Button Groups (Internshala, Workday, Indeed, Lever)
        const radioInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
        const radioGroups = new Map<string, HTMLInputElement[]>();
        radioInputs.forEach((r) => {
          const gName = r.name || 'group_' + (r.id || 'unnamed');
          if (!radioGroups.has(gName)) radioGroups.set(gName, []);
          radioGroups.get(gName)!.push(r);
        });

        radioGroups.forEach((groupRadios) => {
          try {
            if (groupRadios.some(r => r.checked)) {
              radios++;
              return;
            }
            const container = groupRadios[0].closest('.question, .form-group, .radio-group, div, fieldset') || document.body;
            const containerText = (container.textContent || '').toLowerCase();

            let chosenRadio: HTMLInputElement | null = null;
            if (containerText.includes('sponsor') || containerText.includes('visa')) {
              chosenRadio = groupRadios.find(r => {
                const txt = (r.labels?.[0]?.textContent || r.value || '').toLowerCase();
                return txt.includes('no') || txt.startsWith('no') || txt.includes('false') || txt.includes('0');
              }) || null;
            }
            if (!chosenRadio) {
              chosenRadio = groupRadios.find(r => {
                const txt = (r.labels?.[0]?.textContent || r.value || r.parentElement?.textContent || '').toLowerCase();
                return txt.includes('yes') || txt.startsWith('yes') || txt.includes('true') || txt.includes('agree') || txt.includes('authorized') || txt.includes('1');
              }) || null;
            }
            if (!chosenRadio && groupRadios.length > 0) {
              chosenRadio = groupRadios[0];
            }
            if (chosenRadio) {
              chosenRadio.checked = true;
              chosenRadio.dispatchEvent(new Event('input', { bubbles: true }));
              chosenRadio.dispatchEvent(new Event('change', { bubbles: true }));
              chosenRadio.dispatchEvent(new Event('click', { bubbles: true }));
              radios++;
            }
          } catch {}
        });

        // 3. Select Dropdowns
        const selectEls = Array.from(document.querySelectorAll<HTMLSelectElement>('select'));
        selectEls.forEach((sel) => {
          try {
            if (sel.selectedIndex > 0) {
              selects++;
              return;
            }
            const selText = ((sel.name || '') + ' ' + (sel.id || '') + ' ' + (sel.closest('label')?.textContent || '')).toLowerCase();
            const opts = Array.from(sel.options);

            let val: string | null = null;
            if (selText.includes('sponsor') || selText.includes('visa')) {
              const noOpt = opts.find(o => o.text.toLowerCase().includes('no') || o.value.toLowerCase() === 'no');
              if (noOpt) val = noOpt.value;
            }
            if (!val && (selText.includes('authoriz') || selText.includes('eligible') || selText.includes('legal'))) {
              const yesOpt = opts.find(o => o.text.toLowerCase().includes('yes') || o.text.toLowerCase().includes('authorized'));
              if (yesOpt) val = yesOpt.value;
            }
            if (!val && (selText.includes('gender') || selText.includes('race') || selText.includes('veteran') || selText.includes('disability'))) {
              const decOpt = opts.find(o => o.text.toLowerCase().includes('decline') || o.text.toLowerCase().includes('prefer not'));
              if (decOpt) val = decOpt.value;
            }
            if (!val && opts.length > 1) {
              const firstValid = opts.find(o => o.value && o.value !== '' && !o.text.toLowerCase().includes('select')) || opts[1];
              if (firstValid) val = firstValid.value;
            }
            if (val) {
              sel.value = val;
              sel.dispatchEvent(new Event('change', { bubbles: true }));
              sel.dispatchEvent(new Event('input', { bubbles: true }));
              selects++;
            }
          } catch {}
        });

        // 4. Checkboxes
        const checkboxesEls = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
        checkboxesEls.forEach((cb) => {
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

        return { filled, radios, selects, checkboxes };
      }, candidatePayload);

      if (result) {
        totalFilled += result.filled;
        totalRadios += result.radios;
        totalSelects += result.selects;
        totalCheckboxes += result.checkboxes;
      }
    } catch {}
  }

  // 5. PDF Resume File Attachment
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

  // 6. Submit Button Click
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
        '.btn-primary.submit',
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

  // 7. Verify Confirmation
  let isConfirmed = false;
  if (submitClicked) {
    await page.waitForTimeout(400);
    isConfirmed = await page.evaluate(() => {
      const body = (document.body?.innerText || '').toLowerCase();
      const successPhrases = [
        'application submitted',
        'application has been submitted',
        'thank you for applying',
        'thanks for applying',
        'application received',
        'we have received your application',
        'your application was sent',
        'applied successfully',
        'application confirmed',
      ];
      return successPhrases.some(p => body.includes(p));
    }).catch(() => false);
  }

  return {
    filledCount: overallFields,
    radiosCount: totalRadios,
    selectsCount: totalSelects,
    checkboxesCount: totalCheckboxes,
    submitClicked,
    isConfirmed,
  };
}
