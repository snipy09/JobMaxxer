import type { Page, Frame, ElementHandle } from 'playwright';
import type { ATSPortal } from './ats-portals.js';
import { humanClick } from './stealth-evasion.js';
import fs from 'fs';

export interface CandidateProfile {
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone: string;
  linkedIn?: string;
  github?: string;
  portfolio?: string;
  projectsUrl?: string;
  desiredTitle?: string;
  techStack?: string;
  salary?: string;
  noticePeriod?: string;
  summaryText?: string;
  resumeFilePath?: string;
  customAnswers?: Record<string, string>;
  cachedAnswers?: Record<string, string>;
}

export interface FillFormResult {
  success: boolean;
  fieldsFilled: number;
  radiosSolved: number;
  dropdownsFilled: number;
  checkboxesChecked: number;
  error?: string;
}

export class FormFiller {
  constructor(
    private page: Page,
    private atsConfig: ATSPortal,
    private profile: CandidateProfile,
    private logger?: { info: (m: string, meta?: any) => void; debug: (m: string, meta?: any) => void; warn: (m: string, meta?: any) => void; error: (m: string, meta?: any) => void }
  ) {}

  /**
   * MAIN ENTRY POINT: Fill entire form deterministically
   */
  async fillFormDeterministic(): Promise<FillFormResult> {
    try {
      let totalFilled = 0;
      let radiosCount = 0;
      let dropdownsCount = 0;
      let checkboxesCount = 0;

      const frames = [this.page, ...this.page.frames()];

      for (const frame of frames) {
        // 1. Fill Text inputs & textareas (fastest path via native V8 setter)
        const textCount = await this.fillTextInputs(frame);
        totalFilled += textCount;

        // 2. Solve radio buttons deterministically (Laptop, Internet, Schedule, Authorization)
        const radioCount = await this.solveRadioGroups(frame);
        radiosCount += radioCount;
        totalFilled += radioCount;

        // 3. Solve select dropdowns & comboboxes
        const dropCount = await this.fillDropdowns(frame);
        dropdownsCount += dropCount;
        totalFilled += dropCount;

        // 4. Solve consent and agreement checkboxes
        const checkCount = await this.solveCheckboxes(frame);
        checkboxesCount += checkCount;
        totalFilled += checkCount;

        // 5. Fill resume file inputs
        const resumeCount = await this.fillResume(frame);
        totalFilled += resumeCount;
      }

      this.logger?.info(`Form filled deterministically: ${totalFilled} fields`, {
        fieldsFilled: totalFilled,
        radiosCount,
        dropdownsCount,
        checkboxesCount
      });

      return {
        success: totalFilled > 0,
        fieldsFilled: totalFilled,
        radiosSolved: radiosCount,
        dropdownsFilled: dropdownsCount,
        checkboxesChecked: checkboxesCount,
      };
    } catch (error) {
      this.logger?.error('Form filling failed', { error });
      return {
        success: false,
        fieldsFilled: 0,
        radiosSolved: 0,
        dropdownsFilled: 0,
        checkboxesChecked: 0,
        error: String(error)
      };
    }
  }

  /**
   * STEP 1: Fill text inputs using hardcoded selector map & candidate data
   */
  private async fillTextInputs(frame: Page | Frame): Promise<number> {
    const fullName = this.profile.fullName || `${this.profile.firstName || ''} ${this.profile.lastName || ''}`.trim() || 'Candidate';
    const payload = {
      firstName: this.profile.firstName || 'Candidate',
      lastName: this.profile.lastName || 'Applicant',
      fullName,
      email: this.profile.email || 'candidate@nomadic.app',
      phone: this.profile.phone || '+1 (555) 019-2834',
      linkedIn: this.profile.linkedIn || 'https://linkedin.com/in/candidate',
      github: this.profile.github || 'https://github.com/candidate',
      portfolio: this.profile.portfolio || this.profile.github || '',
      projectsUrl: this.profile.projectsUrl || this.profile.portfolio || this.profile.github || '',
      desiredTitle: this.profile.desiredTitle || 'Software Engineer',
      salary: this.profile.salary || 'Competitive / Market Rate',
      noticePeriod: this.profile.noticePeriod || 'Immediately / 2 weeks',
      summaryText: this.profile.summaryText || 'Experienced software engineer skilled in building scalable cloud web applications.',
      customAnswers: this.profile.customAnswers || {},
      cachedAnswers: this.profile.cachedAnswers || {},
      fieldMapping: this.atsConfig.fieldMapping,
    };

    return await frame.evaluate((data) => {
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

      // Priority: check explicit field selectors from ATS mapping
      if (data.fieldMapping) {
        const directMaps: Array<[string | undefined, string | undefined]> = [
          [data.fieldMapping.firstName, data.firstName],
          [data.fieldMapping.lastName, data.lastName],
          [data.fieldMapping.fullName, data.fullName],
          [data.fieldMapping.email, data.email],
          [data.fieldMapping.phone, data.phone],
          [data.fieldMapping.linkedIn, data.linkedIn],
          [data.fieldMapping.github, data.github],
          [data.fieldMapping.portfolio, data.portfolio],
        ];

        for (const [sel, val] of directMaps) {
          if (!sel || !val) continue;
          try {
            const els = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(sel));
            for (const el of els) {
              if (el && (!el.value || el.value.trim().length === 0)) {
                setNativeValue(el, val);
                count++;
              }
            }
          } catch {}
        }
      }

      // General sweep: check all visible text inputs & textareas
      const allInputs = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="button"]):not([type="search"]), textarea'
      ));

      allInputs.forEach((input) => {
        try {
          const val = input.value || '';
          if (val.trim().length > 0) return;

          const name = (input.name || '').toLowerCase();
          const id = (input.id || '').toLowerCase();
          const placeholder = (input.placeholder || '').toLowerCase();
          const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();

          // Ignore search and newsletter subscription bars
          if (
            input.type === 'search' ||
            name.includes('search') ||
            placeholder.includes('search') ||
            id.includes('search') ||
            name.includes('newsletter') ||
            placeholder.includes('newsletter') ||
            placeholder.includes('subscribe') ||
            name.includes('subscribe')
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

          // SQLite cached answers first
          for (const [k, v] of Object.entries(data.cachedAnswers)) {
            if (combined.includes(k.toLowerCase()) && v) {
              setNativeValue(input, v);
              count++;
              return;
            }
          }

          // First Name
          if (combined.includes('first_name') || combined.includes('firstname') || combined.includes('fname') || combined.includes('first name') || combined.includes('given name')) {
            setNativeValue(input, data.firstName);
            count++;
          }
          // Last Name
          else if (combined.includes('last_name') || combined.includes('lastname') || combined.includes('lname') || combined.includes('last name') || combined.includes('family name')) {
            setNativeValue(input, data.lastName);
            count++;
          }
          // Full Name
          else if (combined.includes('full_name') || combined.includes('fullname') || combined.includes('applicant_name') || (combined.includes('name') && !combined.includes('company') && !combined.includes('file'))) {
            setNativeValue(input, data.fullName);
            count++;
          }
          // Email
          else if (combined.includes('email') || input.type === 'email') {
            setNativeValue(input, data.email);
            count++;
          }
          // Phone
          else if (combined.includes('phone') || combined.includes('mobile') || combined.includes('contact') || input.type === 'tel') {
            setNativeValue(input, data.phone);
            count++;
          }
          // LinkedIn
          else if (combined.includes('linkedin')) {
            setNativeValue(input, data.linkedIn);
            count++;
          }
          // GitHub
          else if (combined.includes('github')) {
            setNativeValue(input, data.github);
            count++;
          }
          // Project Link / URL
          else if (combined.includes('project') || combined.includes('live_demo') || combined.includes('work_sample')) {
            const pUrl = data.projectsUrl || data.portfolio || data.github;
            if (pUrl) {
              setNativeValue(input, pUrl);
              count++;
            }
          }
          // Portfolio / Website
          else if (combined.includes('portfolio') || combined.includes('website') || combined.includes('personal_url') || combined.includes('homepage')) {
            const portUrl = data.portfolio || data.github;
            if (portUrl) {
              setNativeValue(input, portUrl);
              count++;
            }
          }
          // Salary / CTC
          else if (combined.includes('salary') || combined.includes('compensation') || combined.includes('ctc') || combined.includes('desired_salary')) {
            setNativeValue(input, data.salary);
            count++;
          }
          // Notice Period / Availability
          else if (combined.includes('notice') || combined.includes('availability') || combined.includes('start_date')) {
            setNativeValue(input, data.noticePeriod);
            count++;
          }
          // Cover Letter / Why Us
          else if (input instanceof HTMLTextAreaElement || combined.includes('cover_letter') || combined.includes('why_us') || combined.includes('why are you interested') || combined.includes('additional')) {
            setNativeValue(input, data.summaryText);
            count++;
          }
        } catch {}
      });

      return count;
    }, payload).catch(() => 0);
  }

  /**
   * STEP 2: Upload resume to file input
   */
  private async fillResume(frame: Page | Frame): Promise<number> {
    try {
      const resumePath = this.profile.resumeFilePath && fs.existsSync(this.profile.resumeFilePath)
        ? this.profile.resumeFilePath
        : null;

      if (!resumePath) return 0;

      const fileInputSelector = this.atsConfig.fieldMapping.resume || 'input[type="file"]';
      const fileInputs = await frame.$$(fileInputSelector).catch(() => []);

      let count = 0;
      for (const fi of fileInputs) {
        await fi.setInputFiles(resumePath).catch(() => {});
        count++;
        this.logger?.info('Resume PDF attached successfully');
      }
      return count;
    } catch (error) {
      this.logger?.warn('Resume upload failed', { error });
      return 0;
    }
  }

  /**
   * STEP 3: Solve radio button groups deterministically (Handles standard inputs & custom ARIA buttons)
   */
  private async solveRadioGroups(frame: Page | Frame): Promise<number> {
    const patterns = this.atsConfig.radioBehavior.patterns.map(p => ({
      regexStr: p.questionMatch.source,
      flags: p.questionMatch.flags,
      selectValue: p.selectValue,
    }));

    return await frame.evaluate((data) => {
      let count = 0;

      // 1. Check custom and standard radio groups
      const groups = Array.from(document.querySelectorAll<HTMLElement>(
        '[role="radiogroup"], fieldset, .ashby-question-container, .ashby-field-question, div:has(> label)'
      ));

      groups.forEach((group) => {
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

        let chosenItem: HTMLElement | null = null;

        // A. Match against ATS patterns
        for (const pat of data.patterns) {
          const re = new RegExp(pat.regexStr, pat.flags);
          if (re.test(groupText)) {
            chosenItem = radioItems.find(r => {
              const label = (r.textContent || (r as any).value || '').toLowerCase().trim();
              return label.includes(pat.selectValue.toLowerCase());
            }) || null;
            if (chosenItem) break;
          }
        }

        // B. Visa Sponsorship required -> Select "No"
        if (!chosenItem && (groupText.includes('sponsor') || groupText.includes('visa'))) {
          chosenItem = radioItems.find(r => {
            const txt = (r.textContent || (r as any).value || '').toLowerCase().trim();
            return txt === 'no' || txt.startsWith('no') || txt.includes('not require') || txt === 'false';
          }) || null;
        }

        // C. Work Authorization, Office 3 days, Schedule, Agreement -> Select "Yes"
        if (!chosenItem) {
          if (
            groupText.includes('authoriz') || groupText.includes('eligible') ||
            groupText.includes('office') || groupText.includes('3 days') ||
            groupText.includes('agree') || groupText.includes('willing') ||
            groupText.includes('laptop') || groupText.includes('relocat') ||
            groupText.includes('available')
          ) {
            chosenItem = radioItems.find(r => {
              const txt = (r.textContent || (r as any).value || '').toLowerCase().trim();
              return txt === 'yes' || txt.startsWith('yes') || txt.includes('authorized') || txt === 'true';
            }) || null;
          }
        }

        // D. Fallback: Select first radio option
        if (!chosenItem && radioItems.length > 0) {
          chosenItem = radioItems[0];
        }

        if (chosenItem) {
          chosenItem.click();
          if (chosenItem instanceof HTMLInputElement) {
            chosenItem.checked = true;
            chosenItem.dispatchEvent(new Event('input', { bubbles: true }));
            chosenItem.dispatchEvent(new Event('change', { bubbles: true }));
          }
          chosenItem.setAttribute('aria-checked', 'true');
          count++;
        }
      });

      // 2. Also sweep standalone input[type="radio"] elements
      const standaloneRadios = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
      const radioGroupsMap = new Map<string, HTMLInputElement[]>();

      standaloneRadios.forEach((r) => {
        const gName = r.name || 'group_' + (r.id || 'unnamed');
        if (!radioGroupsMap.has(gName)) radioGroupsMap.set(gName, []);
        radioGroupsMap.get(gName)!.push(r);
      });

      radioGroupsMap.forEach((groupRadios) => {
        try {
          if (groupRadios.some(r => r.checked)) {
            count++;
            return;
          }

          const container = groupRadios[0].closest('.question, .form-group, .radio-group, fieldset, [role="group"], div') || document.body;
          const containerText = (container.textContent || '').toLowerCase();

          let chosenRadio: HTMLInputElement | null = null;

          for (const pat of data.patterns) {
            const re = new RegExp(pat.regexStr, pat.flags);
            if (re.test(containerText)) {
              chosenRadio = groupRadios.find(r => {
                const label = (r.labels?.[0]?.textContent || r.value || r.parentElement?.textContent || '').toLowerCase();
                return label.includes(pat.selectValue.toLowerCase());
              }) || null;
              if (chosenRadio) break;
            }
          }

          if (!chosenRadio) {
            if (containerText.includes('sponsor') || containerText.includes('visa')) {
              chosenRadio = groupRadios.find(r => {
                const txt = (r.labels?.[0]?.textContent || r.value || '').toLowerCase();
                return txt.includes('no') || txt.startsWith('no') || txt.includes('false') || txt.includes('0');
              }) || null;
            } else {
              chosenRadio = groupRadios.find(r => {
                const txt = (r.labels?.[0]?.textContent || r.value || r.parentElement?.textContent || '').toLowerCase();
                return txt.includes('yes') || txt.startsWith('yes') || txt.includes('true') || txt.includes('agree') || txt.includes('1');
              }) || groupRadios[0];
            }
          }

          if (chosenRadio) {
            chosenRadio.checked = true;
            chosenRadio.dispatchEvent(new Event('input', { bubbles: true }));
            chosenRadio.dispatchEvent(new Event('change', { bubbles: true }));
            chosenRadio.dispatchEvent(new Event('click', { bubbles: true }));
            count++;
          }
        } catch {}
      });

      return count;
    }, { patterns }).catch(() => 0);
  }

  /**
   * STEP 4: Solve consent and agreement checkboxes
   */
  private async solveCheckboxes(frame: Page | Frame): Promise<number> {
    return await frame.evaluate(() => {
      let count = 0;
      const checkboxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));

      checkboxes.forEach((cb) => {
        try {
          const label = cb.closest('label')?.textContent ||
            document.querySelector(`label[for="${cb.id}"]`)?.textContent ||
            cb.getAttribute('aria-label') || '';

          if (/agree|accept|consent|policy|terms|confirm|acknowledge|certify/i.test(label) || cb.required) {
            if (!cb.checked) {
              cb.checked = true;
              cb.dispatchEvent(new Event('input', { bubbles: true }));
              cb.dispatchEvent(new Event('change', { bubbles: true }));
              cb.dispatchEvent(new Event('click', { bubbles: true }));
              count++;
            } else {
              count++;
            }
          }
        } catch {}
      });

      return count;
    }).catch(() => 0);
  }

  /**
   * STEP 5: Fill select dropdowns and custom comboboxes
   */
  private async fillDropdowns(frame: Page | Frame): Promise<number> {
    return await frame.evaluate(() => {
      let count = 0;
      const selects = Array.from(document.querySelectorAll<HTMLSelectElement>('select'));

      selects.forEach((sel) => {
        try {
          if (sel.selectedIndex > 0) {
            count++;
            return;
          }

          const label = sel.closest('label')?.textContent ||
            document.querySelector(`label[for="${sel.id}"]`)?.textContent ||
            sel.name || sel.id || '';
          const options = Array.from(sel.options);

          let chosenVal: string | null = null;
          if (/work.*authorization|legal.*right|authorized/i.test(label)) {
            const yesOpt = options.find(o => /yes|authorized|citizen/i.test(o.text) || o.value.toLowerCase() === 'yes');
            if (yesOpt) chosenVal = yesOpt.value;
          } else if (/sponsorship|visa/i.test(label)) {
            const noOpt = options.find(o => /no|not require/i.test(o.text) || o.value.toLowerCase() === 'no');
            if (noOpt) chosenVal = noOpt.value;
          } else if (/demographics|gender|race|ethnicity|veteran|disability/i.test(label)) {
            const decOpt = options.find(o => /decline|prefer not|not wish/i.test(o.text));
            if (decOpt) chosenVal = decOpt.value;
          }

          if (!chosenVal && options.length > 1) {
            const firstValid = options.find(o => o.value && o.value !== '' && !o.text.toLowerCase().includes('select')) || options[1];
            if (firstValid) chosenVal = firstValid.value;
          }

          if (chosenVal) {
            sel.value = chosenVal;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            sel.dispatchEvent(new Event('input', { bubbles: true }));
            count++;
          }
        } catch {}
      });

      return count;
    }).catch(() => 0);
  }
}
