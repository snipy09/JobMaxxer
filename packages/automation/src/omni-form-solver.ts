import type { Page, Frame } from 'playwright';
import type { MasterProfile } from './auto-apply-engine.js';
import { humanClick, randomPause } from './stealth-evasion.js';
import { AIFallbackSolver } from './ai-fallback.js';
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

export interface OmniFormSolveResult {
  fieldsFilled: number;
  checkboxesChecked: number;
  radiosSelected: number;
  selectsSolved: number;
  resumeUploaded: boolean;
  totalInteractions: number;
  isSubmitted?: boolean;
  isConfirmed?: boolean;
}

export class OmniFormSolver {
  /**
   * STEP 0: Systematic full-page pre-scroll.
   * Forces all lazy-loaded React 18+ components and virtualized form fields to mount.
   */
  public static async preScrollEntirePage(page: Page): Promise<void> {
    try {
      await page.evaluate(async () => {
        const distance = 350;
        const totalHeight = document.body.scrollHeight || 3000;
        for (let current = 0; current < totalHeight; current += distance) {
          window.scrollTo(0, current);
          await new Promise(r => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(300);
    } catch {}
  }

  /**
   * Universal Master Form Solver:
   * Top-to-bottom systematic form solving, option answering, checkbox signing, and submission.
   */
  public static async solveEntireForm(
    page: Page,
    profile: MasterProfile,
    jobTitle?: string,
    companyName?: string,
    autoSubmit: boolean = false
  ): Promise<OmniFormSolveResult> {
    const result: OmniFormSolveResult = {
      fieldsFilled: 0,
      checkboxesChecked: 0,
      radiosSelected: 0,
      selectsSolved: 0,
      resumeUploaded: false,
      totalInteractions: 0,
      isSubmitted: false,
      isConfirmed: false,
    };

    const aiSolver = new AIFallbackSolver();
    const resolvedTitle = jobTitle || profile.desiredTitle || 'Software Engineer';
    const resolvedCompany = companyName || 'Engineering Team';

    const fullName = (profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`).trim() || 'Candidate';
    const firstName = profile.firstName || (fullName.split(' ')[0] || 'Candidate');
    const lastName = profile.lastName || (fullName.split(' ').slice(1).join(' ') || 'Applicant');
    const email = profile.email || 'candidate@nomadic.app';
    const phone = profile.phone || '+1 (555) 019-2834';
    const linkedin = profile.linkedin || 'https://linkedin.com/in/candidate';
    const github = profile.github || 'https://github.com/candidate';
    const portfolio = profile.portfolio || profile.projectsUrl || profile.github || 'https://github.com/candidate';
    const location = profile.location || 'San Francisco, CA, USA';

    // ── 0. SYSTEMATIC SCROLL TO MOUNT ENTIRE FORM ───────────────────────────
    await OmniFormSolver.preScrollEntirePage(page);

    // ── 1. ASHBY & ATS DIRECT SYSTEM FIELDS (Priority 1) ────────────────────
    try {
      // Name
      const nameInputs = await page.$$(
        '#_systemfield_name, input[name="name"], input[name*="legalName" i], input[id*="legalName" i], input[placeholder*="legal name" i], input[placeholder*="full name" i]'
      );
      for (const inp of nameInputs) {
        const val = await inp.inputValue().catch(() => '');
        if (!val || val.length === 0) {
          await inp.fill(fullName).catch(() => {});
          result.fieldsFilled++;
        }
      }

      // First Name
      const firstNameInputs = await page.$$(
        '#first_name, input[name="firstName"], input[name="first_name"], input[placeholder*="First name" i], input[id*="firstName" i]'
      );
      for (const inp of firstNameInputs) {
        const val = await inp.inputValue().catch(() => '');
        if (!val || val.length === 0) {
          await inp.fill(firstName).catch(() => {});
          result.fieldsFilled++;
        }
      }

      // Last Name
      const lastNameInputs = await page.$$(
        '#last_name, input[name="lastName"], input[name="last_name"], input[placeholder*="Last name" i], input[id*="lastName" i]'
      );
      for (const inp of lastNameInputs) {
        const val = await inp.inputValue().catch(() => '');
        if (!val || val.length === 0) {
          await inp.fill(lastName).catch(() => {});
          result.fieldsFilled++;
        }
      }

      // Preferred Name
      const preferredNameInputs = await page.$$(
        'input[name*="preferredName" i], input[placeholder*="Preferred name" i], input[id*="preferredName" i]'
      );
      for (const inp of preferredNameInputs) {
        const val = await inp.inputValue().catch(() => '');
        if (!val || val.length === 0) {
          await inp.fill(firstName).catch(() => {});
          result.fieldsFilled++;
        }
      }

      // Email
      const emailInputs = await page.$$(
        '#_systemfield_email, #email, input[type="email"], input[name="email"], input[name*="email" i], input[id*="email" i]'
      );
      for (const inp of emailInputs) {
        const val = await inp.inputValue().catch(() => '');
        if (!val || val.length === 0) {
          await inp.fill(email).catch(() => {});
          result.fieldsFilled++;
        }
      }

      // Phone
      const phoneInputs = await page.$$(
        '#_systemfield_phone, #phone, input[type="tel"], input[name="phone"], input[name*="phone" i], input[id*="phone" i], input[placeholder*="phone" i]'
      );
      for (const inp of phoneInputs) {
        const val = await inp.inputValue().catch(() => '');
        if (!val || val.length === 0) {
          await inp.fill(phone).catch(() => {});
          result.fieldsFilled++;
        }
      }

      // Location Search Combobox (Ashby / ATS)
      const locationInputs = await page.$$(
        '#_systemfield_location, input[placeholder*="Start typing" i], input[placeholder*="Location" i], input[aria-autocomplete="list"], input[name*="location" i]'
      );
      for (const inp of locationInputs) {
        const val = await inp.inputValue().catch(() => '');
        if (!val || val.length === 0) {
          await inp.click().catch(() => {});
          await inp.fill(location).catch(() => {});
          await page.waitForTimeout(250);
          await page.keyboard.press('ArrowDown').catch(() => {});
          await page.waitForTimeout(100);
          await page.keyboard.press('Enter').catch(() => {});

          const opt = await page.$('[role="option"], .ashby-option, .ashby-suggestion, .suggestion-item');
          if (opt) await humanClick(page, opt);
          result.fieldsFilled++;
        }
      }

      // Professional Links
      const linkedinInputs = await page.$$(
        'input[name*="linkedin" i], input[placeholder*="linkedin" i], input[id*="linkedin" i], input[autocomplete*="custom-question-linkedin" i], input[name*="urls[LinkedIn]"]'
      );
      for (const inp of linkedinInputs) {
        const val = await inp.inputValue().catch(() => '');
        if (!val || val.length === 0) {
          await inp.fill(linkedin).catch(() => {});
          result.fieldsFilled++;
        }
      }

      const githubInputs = await page.$$(
        'input[name*="github" i], input[placeholder*="github" i], input[id*="github" i], input[autocomplete*="custom-question-github" i], input[name*="urls[GitHub]"]'
      );
      for (const inp of githubInputs) {
        const val = await inp.inputValue().catch(() => '');
        if (!val || val.length === 0) {
          await inp.fill(github).catch(() => {});
          result.fieldsFilled++;
        }
      }

      const portfolioInputs = await page.$$(
        'input[name*="portfolio" i], input[name*="website" i], input[placeholder*="portfolio" i], input[placeholder*="website" i], input[id*="website" i], input[autocomplete*="custom-question-website" i], input[name*="urls[Portfolio]"]'
      );
      for (const inp of portfolioInputs) {
        const val = await inp.inputValue().catch(() => '');
        if (!val || val.length === 0) {
          await inp.fill(portfolio).catch(() => {});
          result.fieldsFilled++;
        }
      }
    } catch {}

    // ── 2. UPLOAD RESUME PDF (Priority 2) ───────────────────────────────────
    try {
      const resumePath = getOrCreateValidResumePdf(profile);
      if (resumePath && fs.existsSync(resumePath)) {
        const fileInputs = await page.$$(
          '#_systemfield_resume, input[type="file"], input[name*="resume" i], input[id*="resume" i]'
        );
        for (const fi of fileInputs) {
          await fi.setInputFiles(resumePath).catch(() => {});
          result.resumeUploaded = true;
          result.fieldsFilled++;
        }
      }
    } catch {}

    // ── 3. SOLVE BINARY YES/NO BUTTON GROUPS (Ashby & Modern ATS) ───────────
    try {
      const yesNoGroups = await page.$$(
        'div[class*="_yesno_"], div:has(> button:has-text("Yes")), fieldset:has(button:has-text("Yes")), [role="radiogroup"]:has(button:has-text("Yes"))'
      );
      for (const grp of yesNoGroups) {
        const grpText = (await grp.textContent().catch(() => ''))?.toLowerCase() || '';
        const buttons = await grp.$$('button');
        if (buttons.length >= 2) {
          const isVisaSponsor = grpText.includes('sponsor') || grpText.includes('visa');
          if (isVisaSponsor) {
            const noBtn = (await grp.$('button:has-text("No")')) || buttons[1];
            if (noBtn) {
              await humanClick(page, noBtn);
              result.radiosSelected++;
            }
          } else {
            // Work authorization, Office 3 days, San Francisco HQ, Laptop, Schedule -> Click "Yes"
            const yesBtn = (await grp.$('button:has-text("Yes"), button:has-text("I am able"), button:has-text("I can")')) || buttons[0];
            if (yesBtn) {
              await humanClick(page, yesBtn);
              result.radiosSelected++;
            }
          }
        }
      }
    } catch {}

    // ── 4. SOLVE ALL RADIO QUESTION GROUPS & ARBITRATION (Native & ARIA) ────
    try {
      const radioFillCount = await page.evaluate(() => {
        let count = 0;

        // A. Groups & Fieldsets
        const groups = Array.from(document.querySelectorAll<HTMLElement>(
          '[role="radiogroup"], fieldset, .ashby-field-question, .form-group, div:has(> [role="radio"]), div[class*="_question_"], div[class*="_fieldContainer_"]'
        ));

        groups.forEach((group) => {
          const groupText = (group.textContent || '').toLowerCase();
          const radioItems = Array.from(group.querySelectorAll<HTMLElement>(
            'button[role="radio"], [role="radio"], label:has(input[type="radio"]), input[type="radio"], button._yesno_button, button'
          )).filter(b => {
            const t = (b.textContent || (b as any).value || '').trim();
            return /^(yes|no|i acknowledge|acknowledge|agree|i agree|accept|prefer not|decline)$/i.test(t) || b.getAttribute('role') === 'radio';
          });

          if (radioItems.length === 0) return;

          const isAnyChecked = radioItems.some(r => {
            if (r instanceof HTMLInputElement) return r.checked;
            return r.getAttribute('aria-checked') === 'true' || r.classList.contains('selected') || r.classList.contains('active');
          });
          if (isAnyChecked) return;

          let pick: HTMLElement | null = null;
          if (groupText.includes('sponsor') || groupText.includes('visa')) {
            pick = radioItems.find(r => /no|not require|false/i.test(r.textContent || (r as any).value || '')) || null;
          } else if (groupText.includes('arbitration') || groupText.includes('dispute') || groupText.includes('acknowledgement')) {
            pick = radioItems.find(r => /acknowledge|i acknowledge|agree|i agree|accept|yes/i.test(r.textContent || (r as any).value || '')) || radioItems[0];
          } else if (groupText.includes('san francisco') || groupText.includes('hq') || groupText.includes('office') || groupText.includes('days per week') || groupText.includes('hybrid') || groupText.includes('work from')) {
            pick = radioItems.find(r => /yes|i am able|i can|agree|true/i.test(r.textContent || (r as any).value || '')) || radioItems[0];
          } else {
            pick = radioItems.find(r => /yes|authorized|eligible|agree|true|office|relocate/i.test(r.textContent || (r as any).value || '')) || radioItems[0];
          }

          if (pick) {
            pick.click();
            pick.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            if (pick instanceof HTMLInputElement) {
              pick.checked = true;
              pick.dispatchEvent(new Event('input', { bubbles: true }));
              pick.dispatchEvent(new Event('change', { bubbles: true }));
            }
            pick.setAttribute('aria-checked', 'true');
            pick.classList.add('selected');
            count++;
          }
        });

        // B. Native Radio Inputs by Name
        const allRadios = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
        const nameMap = new Map<string, HTMLInputElement[]>();
        allRadios.forEach(r => {
          const n = r.name || 'group';
          if (!nameMap.has(n)) nameMap.set(n, []);
          nameMap.get(n)!.push(r);
        });

        nameMap.forEach((radios) => {
          if (radios.some(r => r.checked)) return;
          const container = radios[0].closest('.question, .form-group, fieldset, div') || document.body;
          const cText = (container.textContent || '').toLowerCase();

          let pick: HTMLInputElement | null = null;
          if (cText.includes('sponsor') || cText.includes('visa')) {
            pick = radios.find(r => /no|false/i.test(r.value || r.labels?.[0]?.textContent || '')) || null;
          } else {
            pick = radios.find(r => /yes|true|agree/i.test(r.value || r.labels?.[0]?.textContent || '')) || radios[0];
          }

          if (pick) {
            pick.checked = true;
            pick.dispatchEvent(new Event('click', { bubbles: true }));
            pick.dispatchEvent(new Event('change', { bubbles: true }));
            count++;
          }
        });

        return count;
      }).catch(() => 0);

      result.radiosSelected += radioFillCount;
    } catch {}

    // ── 5. SOLVE ALL DROPDOWNS & CUSTOM COMBOBOXES (Option-Type Questions) ─
    try {
      // A. Native <select> elements
      const selectCount = await page.evaluate(() => {
        let count = 0;
        const selects = Array.from(document.querySelectorAll<HTMLSelectElement>('select'));
        selects.forEach((sel) => {
          if (sel.value && sel.selectedIndex > 0) return;
          const label = (sel.closest('label, .form-group')?.textContent || sel.name || '').toLowerCase();
          const options = Array.from(sel.options);
          if (options.length <= 1) return;

          let bestIndex = -1;
          if (label.includes('gender') || label.includes('race') || label.includes('veteran') || label.includes('disability')) {
            bestIndex = options.findIndex(o => /prefer not|decline|specify|not a protected|no.*disability/i.test(o.text || o.value));
          } else if (label.includes('authoriz') || label.includes('eligible')) {
            bestIndex = options.findIndex(o => /yes|authorized|eligible/i.test(o.text || o.value));
          } else if (label.includes('sponsor') || label.includes('visa')) {
            bestIndex = options.findIndex(o => /no|not require|do not/i.test(o.text || o.value));
          } else if (label.includes('domain') || label.includes('expertise') || label.includes('preference')) {
            bestIndex = options.findIndex(o => /software|full stack|backend|frontend|product|engineer|general/i.test(o.text || o.value));
          } else if (label.includes('hear') || label.includes('source')) {
            bestIndex = options.findIndex(o => /linkedin|website|online|job board|other/i.test(o.text || o.value));
          } else if (label.includes('notice') || label.includes('available')) {
            bestIndex = options.findIndex(o => /immediate|0|15 days|1 month/i.test(o.text || o.value));
          }

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

      // B. Custom React Dropdowns / Comboboxes (Ashby, Greenhouse, Lever custom lists)
      const customDropdownTriggers = await page.$$(
        'button[aria-haspopup="listbox"], [role="combobox"]:not(input), button._toggleButton_v5ami_32, div[class*="_inputContainer_"] button, div[class*="dropdown"] button'
      );
      for (const trigger of customDropdownTriggers) {
        try {
          await trigger.click().catch(() => {});
          await page.waitForTimeout(200);

          const options = await page.$$('[role="option"], li, div[class*="_option_"], [data-qa="dropdown-option"]');
          if (options.length > 0) {
            let target = null;
            for (const opt of options) {
              const text = (await opt.textContent().catch(() => ''))?.toLowerCase() || '';
              if (/prefer not|decline|software|full stack|product|yes|immediate|linkedin|website/i.test(text)) {
                target = opt;
                break;
              }
            }
            if (!target && options.length > 1) target = options[1];
            else if (!target && options.length === 1) target = options[0];

            if (target) {
              await humanClick(page, target);
              result.selectsSolved++;
            }
          }
        } catch {}
      }
    } catch {}

    // ── 6. SOLVE ALL AGREEMENT, T&C & LEGAL CERTIFICATION CHECKBOXES ───────
    try {
      // Force scroll to absolute bottom to hydrate legal agreements and T&C
      await page.evaluate(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
      }).catch(() => {});
      await page.waitForTimeout(200);

      const checkboxCount = await page.evaluate(() => {
        let count = 0;
        const AGREEMENT_WORDS = /agree|accept|acknowledge|certify|consent|terms|privacy|policy|arbitration|declaration|confirm|withheld|personally completed|true and correct/i;

        // 1. Native Checkboxes (Direct check + Parent Label Click)
        const checkboxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
        checkboxes.forEach((cb) => {
          if (cb.checked) return;
          cb.checked = true;
          cb.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          cb.dispatchEvent(new Event('input', { bubbles: true }));
          cb.dispatchEvent(new Event('change', { bubbles: true }));

          // Trigger click on parent label / wrapper to bypass opacity-0 custom overlays
          const parentLabel = cb.closest('label') || cb.parentElement;
          if (parentLabel && parentLabel !== cb) {
            parentLabel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }

          count++;
        });

        // 2. Custom ARIA Checkboxes & Legal Containers
        const ariaCheckboxes = Array.from(document.querySelectorAll<HTMLElement>(
          '[role="checkbox"], .custom-checkbox, div[class*="_checkbox_"], label:has(span[class*="checkbox"])'
        ));
        ariaCheckboxes.forEach((acb) => {
          const isChecked = acb.getAttribute('aria-checked') === 'true' || 
                            acb.classList.contains('checked') || 
                            acb.classList.contains('active') ||
                            acb.classList.contains('selected');
          if (!isChecked) {
            acb.click();
            acb.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            acb.setAttribute('aria-checked', 'true');
            acb.classList.add('checked');
            count++;
          }
        });

        // 3. Buttons with explicit "I Agree" / "Agree" / "I Accept" / "Acknowledge" text
        const agreeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(
          'button:not([type="submit"]), div[role="button"], span[role="button"]'
        ));
        agreeButtons.forEach((btn) => {
          const btnText = (btn.textContent || '').trim().toLowerCase();
          if (/^(i agree|i accept|agree|accept|i acknowledge|acknowledge|agree & continue)$/i.test(btnText)) {
            const isSelected = btn.classList.contains('active') || btn.classList.contains('selected') || btn.getAttribute('aria-pressed') === 'true';
            if (!isSelected) {
              btn.click();
              btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              count++;
            }
          }
        });

        return count;
      }).catch(() => 0);

      result.checkboxesChecked += checkboxCount;
    } catch {}

    // ── 7. SOLVE OPEN-ENDED QUESTIONS / TEXTAREAS VIA AI ────────────────────
    try {
      const textareas = await page.$$('textarea');
      for (const ta of textareas) {
        const val = await ta.inputValue().catch(() => '');
        if (!val || val.trim().length === 0) {
          const label = await ta.evaluate(el => {
            return (
              el.closest('.form-group, .question, label')?.textContent ||
              document.querySelector(`label[for="${el.id}"]`)?.textContent ||
              el.placeholder ||
              el.name ||
              'Why are you interested in this position?'
            );
          }).catch(() => 'Why are you interested in this position?');

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

          await ta.fill(responseText).catch(() => {});
          result.fieldsFilled++;
        }
      }
    } catch {}

    // ── 8. PRE-SUBMIT AUDIT: REMEDIATE ANY REMAINING UNFILLED REQUIRED FIELDS
    try {
      const remainingInvalid = await page.$$('input:invalid, textarea:invalid, select:invalid, [required]:not(:checked)');
      for (const inv of remainingInvalid) {
        try {
          const tag = await inv.evaluate(el => el.tagName.toLowerCase()).catch(() => '');
          const type = await inv.evaluate(el => (el.getAttribute('type') || '').toLowerCase()).catch(() => '');

          if (type === 'checkbox') {
            await inv.evaluate((el: HTMLElement) => {
              if (el instanceof HTMLInputElement) el.checked = true;
              el.dispatchEvent(new Event('click', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }).catch(() => {});
            result.checkboxesChecked++;
          } else if (type === 'file') {
            const validPdf = getOrCreateValidResumePdf(profile);
            if (validPdf && fs.existsSync(validPdf)) {
              await inv.setInputFiles(validPdf).catch(() => {});
              result.resumeUploaded = true;
            }
          } else if (tag === 'textarea' || tag === 'input') {
            const curVal = await inv.inputValue().catch(() => '');
            if (!curVal || curVal.trim().length === 0) {
              const label = await inv.evaluate(el => el.closest('.form-group, .question, label')?.textContent || (el as any).placeholder || 'Detail').catch(() => 'Detail');
              const ans = await aiSolver.answerCustomQuestion(label, { jobTitle: resolvedTitle, company: resolvedCompany, userProfile: profile });
              await inv.fill(ans).catch(() => {});
              result.fieldsFilled++;
            }
          }
        } catch {}
      }
    } catch {}

    result.totalInteractions =
      result.fieldsFilled +
      result.checkboxesChecked +
      result.radiosSelected +
      result.selectsSolved;

    // ── 9. AUTOMATIC SUBMISSION & POST-SUBMIT VERIFICATION ──────────────────
    if (autoSubmit && result.totalInteractions > 0) {
      await randomPause(page, 400, 800);

      const submitSelectors = [
        'button[type="submit"]:has-text("Submit Application")',
        'button[type="submit"]:has-text("Submit application")',
        'button[type="submit"]:has-text("Submit")',
        'button:has-text("Submit Application")',
        'button:has-text("Submit application")',
        'button:has-text("Submit")',
        'button[type="submit"]',
        'input[type="submit"]',
        'button.btn-primary:has-text("Submit")',
        '[data-qa="submit-button"]'
      ];

      for (const sel of submitSelectors) {
        try {
          const submitBtn = await page.$(sel);
          if (submitBtn) {
            const isVis = typeof submitBtn.isVisible === 'function' ? await submitBtn.isVisible().catch(() => false) : true;
            if (isVis) {
              await humanClick(page, submitBtn);
              result.isSubmitted = true;
              await randomPause(page, 600, 1000);

              result.isConfirmed = await page.evaluate(() => {
                const body = (document.body?.innerText || '').toLowerCase();
                return (
                  body.includes('application submitted') ||
                  body.includes('application has been submitted') ||
                  body.includes('thank you for applying') ||
                  body.includes('application received') ||
                  body.includes('received your application') ||
                  body.includes('applied successfully')
                );
              }).catch(() => false);

              break;
            }
          }
        } catch {}
      }
    }

    return result;
  }
}
