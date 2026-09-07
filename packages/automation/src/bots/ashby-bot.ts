import type { Page } from 'playwright';
import type { MasterProfile } from '../auto-apply-engine.js';
import type { SpecializedBotResult } from './internshala-bot.js';
import { humanClick, randomPause } from '../stealth-evasion.js';
import { AIFallbackSolver } from '../ai-fallback.js';
import fs from 'fs';

export class AshbyBot {
  static async apply(page: Page, profile: MasterProfile): Promise<SpecializedBotResult> {
    try {
      let totalFilled = 0;
      const fullName = profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Candidate';
      const aiSolver = new AIFallbackSolver();

      // ── 1. FILL STANDARD TEXT INPUTS (Name, Email, Phone, URLs) ───────────
      const textFillStats = await page.evaluate((data) => {
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

        const map: Array<[string, string | undefined]> = [
          ['input[name*="name" i], input[id*="name" i]', data.fullName],
          ['input[type="email"], input[name*="email" i]', data.email],
          ['input[type="tel"], input[name*="phone" i]', data.phone],
          ['input[name*="linkedin" i], input[placeholder*="linkedin" i]', data.linkedin],
          ['input[name*="github" i], input[placeholder*="github" i]', data.github],
          ['input[name*="portfolio" i], input[placeholder*="website" i], input[placeholder*="portfolio" i]', data.portfolio],
        ];

        for (const [sel, val] of map) {
          if (!val) continue;
          const nodes = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(sel));
          for (const node of nodes) {
            if (node && (!node.value || node.value.trim().length === 0)) {
              setNativeValue(node, val);
              count++;
            }
          }
        }

        return count;
      }, {
        fullName,
        email: profile.email || 'candidate@nomadic.app',
        phone: profile.phone || '+1 (555) 019-2834',
        linkedin: profile.linkedin || 'https://linkedin.com/in/candidate',
        github: profile.github || 'https://github.com/candidate',
        portfolio: profile.portfolio || profile.github,
      });
      totalFilled += textFillStats;

      // ── 2. SOLVE LOCATION AUTOCOMPLETE COMBOBOX ───────────────────────────
      // (e.g. "Where are you currently located?*" -> input[placeholder*="Start typing"])
      try {
        const locationInput = await page.$(
          'input[placeholder*="Start typing" i], input[aria-autocomplete="list"], input[placeholder*="Location" i], input[name*="location" i]'
        );
        if (locationInput) {
          const locVal = await locationInput.inputValue().catch(() => '');
          if (!locVal || locVal.trim().length === 0) {
            const defaultLocation = 'San Francisco, California, United States';
            await locationInput.click();
            await locationInput.fill(defaultLocation);
            await page.waitForTimeout(300);

            // Trigger Enter or click first dropdown autocomplete item
            await page.keyboard.press('ArrowDown').catch(() => {});
            await page.waitForTimeout(100);
            await page.keyboard.press('Enter').catch(() => {});

            // Also check for visible option item click
            const opt = await page.$('[role="option"], .ashby-option, .ashby-suggestion, [id*="option"]');
            if (opt) {
              await humanClick(page, opt);
            }
            totalFilled++;
          }
        }
      } catch {}

      // ── 3. SOLVE START DATE INPUT ──────────────────────────────────────────
      // (e.g. "When can you start a new role?*" -> input[placeholder*="Pick date"])
      try {
        const dateInput = await page.$(
          'input[placeholder*="Pick date" i], input[type="date"], input[name*="start_date" i], input[placeholder*="YYYY" i], input[placeholder*="DD" i]'
        );
        if (dateInput) {
          const curDateVal = await dateInput.inputValue().catch(() => '');
          if (!curDateVal || curDateVal.trim().length === 0) {
            // Pick a realistic date (next Monday)
            const nextWeek = new Date(Date.now() + 7 * 86400000);
            const yyyy = nextWeek.getFullYear();
            const mm = String(nextWeek.getMonth() + 1).padStart(2, '0');
            const dd = String(nextWeek.getDate()).padStart(2, '0');
            const formattedDate = `${yyyy}-${mm}-${dd}`;

            await dateInput.click();
            await dateInput.fill(formattedDate).catch(() => {});
            await dateInput.evaluate((el: HTMLInputElement, val: string) => {
              el.value = val;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }, formattedDate).catch(() => {});
            totalFilled++;
          }
        }
      } catch {}

      // ── 4. SOLVE ASHBY CUSTOM RADIO GROUPS ─────────────────────────────────
      // (e.g. Work authorization -> Yes, Sponsorship -> No, Office 3 days -> Yes)
      const radioFillCount = await page.evaluate(() => {
        let count = 0;

        // 1. Standard and Custom Radio Groups
        const groups = Array.from(document.querySelectorAll<HTMLElement>(
          '[role="radiogroup"], fieldset, .ashby-question-container, .ashby-field-question, div:has(> label)'
        ));

        groups.forEach((group) => {
          const groupText = (group.textContent || '').toLowerCase();
          const radioItems = Array.from(group.querySelectorAll<HTMLElement>(
            'button[role="radio"], [role="radio"], label:has(input[type="radio"]), input[type="radio"]'
          ));

          if (radioItems.length === 0) return;

          // Check if already checked
          const isAnyChecked = radioItems.some(r => {
            if (r instanceof HTMLInputElement) return r.checked;
            return r.getAttribute('aria-checked') === 'true' || r.classList.contains('selected') || r.classList.contains('active');
          });

          if (isAnyChecked) {
            count++;
            return;
          }

          let chosenItem: HTMLElement | null = null;

          // A. Visa Sponsorship required -> Select "No"
          if (groupText.includes('sponsor') || groupText.includes('visa')) {
            chosenItem = radioItems.find(r => {
              const txt = (r.textContent || (r as any).value || '').toLowerCase().trim();
              return txt === 'no' || txt.startsWith('no') || txt.includes('not require') || txt === 'false';
            }) || null;
          }

          // B. Work Authorization, Office 3 days, Relocation, Schedule, Agreement -> Select "Yes"
          if (!chosenItem) {
            if (
              groupText.includes('authoriz') || groupText.includes('eligible') ||
              groupText.includes('office') || groupText.includes('3 days') ||
              groupText.includes('agree') || groupText.includes('willing') ||
              groupText.includes('laptop') || groupText.includes('relocat')
            ) {
              chosenItem = radioItems.find(r => {
                const txt = (r.textContent || (r as any).value || '').toLowerCase().trim();
                return txt === 'yes' || txt.startsWith('yes') || txt.includes('authorized') || txt === 'true';
              }) || null;
            }
          }

          // C. Fallback: Select first radio button
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

        // 2. Also sweep individual input[type="radio"] elements
        const standaloneRadios = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
        const radioNameMap = new Map<string, HTMLInputElement[]>();
        standaloneRadios.forEach(r => {
          const n = r.name || 'unnamed';
          if (!radioNameMap.has(n)) radioNameMap.set(n, []);
          radioNameMap.get(n)!.push(r);
        });

        radioNameMap.forEach((radios) => {
          if (radios.some(r => r.checked)) return;
          const container = radios[0].closest('div, fieldset') || document.body;
          const cText = (container.textContent || '').toLowerCase();

          let pick: HTMLInputElement | null = null;
          if (cText.includes('sponsor') || cText.includes('visa')) {
            pick = radios.find(r => (r.value || r.labels?.[0]?.textContent || '').toLowerCase().includes('no')) || null;
          } else {
            pick = radios.find(r => (r.value || r.labels?.[0]?.textContent || '').toLowerCase().includes('yes')) || radios[0];
          }

          if (pick) {
            pick.checked = true;
            pick.dispatchEvent(new Event('click', { bubbles: true }));
            pick.dispatchEvent(new Event('change', { bubbles: true }));
            count++;
          }
        });

        return count;
      });
      totalFilled += radioFillCount;

      // ── 5. SOLVE OPEN-ENDED QUESTIONS / TEXTAREAS VIA AI ───────────────────
      const textareas = await page.$$('textarea');
      for (const ta of textareas) {
        try {
          const val = await ta.inputValue().catch(() => '');
          if (!val || val.trim().length === 0) {
            const label = await ta.evaluate((el) => {
              return el.closest('label')?.textContent ||
                document.querySelector(`label[for="${el.id}"]`)?.textContent ||
                el.placeholder ||
                el.name || '';
            }).catch(() => '');

            const aiResponse = await aiSolver.answerCustomQuestion(label || 'Why are you interested in this role?', {
              jobTitle: profile.desiredTitle || 'Software Engineer',
              company: 'Engineering Team',
              userProfile: profile,
            });

            await ta.fill(aiResponse);
            totalFilled++;
          }
        } catch {}
      }

      // ── 6. UPLOAD RESUME PDF ───────────────────────────────────────────────
      const resumePath = profile.resumeFilePath && fs.existsSync(profile.resumeFilePath) ? profile.resumeFilePath : null;
      if (resumePath) {
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.setInputFiles(resumePath).catch(() => {});
          totalFilled++;
        }
      }

      // ── 7. SUBMIT FORM & VERIFY CONFIRMATION ───────────────────────────────
      const submitBtn = await page.$(
        'button[type="submit"], button:has-text("Submit Application"), button:has-text("Submit application"), button:has-text("Submit")'
      );
      let isSubmitted = false;
      let isConfirmed = false;

      if (submitBtn && totalFilled > 0) {
        await randomPause(page, 300, 600);
        await humanClick(page, submitBtn);
        isSubmitted = true;
        await randomPause(page, 450, 800);
        isConfirmed = await page.evaluate(() => {
          const body = (document.body?.innerText || '').toLowerCase();
          return body.includes('application submitted') || body.includes('thank you for applying') || body.includes('received');
        }).catch(() => false);
      }

      return {
        success: isSubmitted,
        fieldsFilled: totalFilled,
        submitted: isSubmitted,
        confirmed: isConfirmed,
      };
    } catch (err: any) {
      return { success: false, fieldsFilled: 0, submitted: false, confirmed: false, error: err.message };
    }
  }
}
