import type { Page, Frame } from 'playwright';
import { humanClick, humanType } from './stealth-evasion.js';

export interface FastNavResult {
  triggered: boolean;
  action: 'apply_clicked' | 'job_link_clicked' | 'search_executed' | 'form_already_present' | 'none';
  targetText?: string;
}

/**
 * Tier 1: Local Fast Navigation & Search Matcher (10ms - 0 AI, 0 Photos)
 * Automatically navigates from job descriptions, company homepages, or careers indexes
 * straight into the application form without remote AI latency.
 */
export async function runFastLocalNavMatcher(
  page: Page,
  targetTitle?: string,
  companyName?: string
): Promise<FastNavResult> {
  const frames = [page, ...page.frames()];

  for (const frame of frames) {
    try {
      // 1. Check if an application form is ALREADY open and visible in DOM
      const isFormVisible = await frame.evaluate(() => {
        const formInput = document.querySelector(
          'input[type="email"], input[name*="email"], input[name*="first_name"], input[name*="name"], #application-form, form[action*="apply"]'
        );
        if (formInput) {
          const style = window.getComputedStyle(formInput);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }
        return false;
      }).catch(() => false);

      if (isFormVisible) {
        return { triggered: true, action: 'form_already_present' };
      }

      // 2. High-Speed "Apply" Button Scanner
      const applySelectors = [
        'a.postings-btn',
        'a[href$="/apply"]',
        'a[href$="/application"]',
        'a[href*="/apply?"]',
        'button[data-qa="apply-button"]',
        'button.apply-button',
        '#apply_button',
        'a:has-text("Apply for this job")',
        'button:has-text("Apply for this job")',
        'button:has-text("Apply with Resume")',
        'button:has-text("Apply Now")',
        'a:has-text("Apply Now")',
        'button:has-text("Apply")',
      ];

      for (const sel of applySelectors) {
        try {
          const btn = await frame.$(sel);
          if (btn) {
            const isVis = typeof btn.isVisible === 'function' ? await btn.isVisible().catch(() => false) : true;
            if (isVis) {
              await humanClick(frame, btn);
              return { triggered: true, action: 'apply_clicked', targetText: sel };
            }
          }
        } catch {}
      }

      // 3. Exact / Partial Job Title Link Scanner on Directory & Index Pages
      if (targetTitle && targetTitle.trim().length > 2) {
        const titleClean = targetTitle.toLowerCase().trim();
        const titleKeywords = titleClean.split(/\s+/).filter(w => w.length > 2);

        const linkElements = await frame.$$('a[href], [role="link"], button').catch(() => []);
        for (const el of linkElements) {
          try {
            const text = (await el.textContent().catch(() => ''))?.toLowerCase().trim() || '';
            if (text.length > 3) {
              // Exact match or contains title
              if (text.includes(titleClean) || (titleKeywords.length >= 2 && titleKeywords.every(k => text.includes(k)))) {
                const isVis = typeof el.isVisible === 'function' ? await el.isVisible().catch(() => false) : true;
                if (isVis) {
                  await humanClick(frame, el);
                  return { triggered: true, action: 'job_link_clicked', targetText: text };
                }
              }
            }
          } catch {}
        }

        // 4. Search Bar Auto-Fill (if on a search portal / careers catalog)
        const searchInput = await frame.$(
          'input[type="search"], input[placeholder*="search" i], input[placeholder*="title" i], input[placeholder*="role" i], input[name*="search" i]'
        ).catch(() => null);

        if (searchInput) {
          const isVis = typeof searchInput.isVisible === 'function' ? await searchInput.isVisible().catch(() => false) : true;
          if (isVis) {
            await humanType(frame, searchInput, targetTitle);
            if ('keyboard' in page && page.keyboard) {
              await page.keyboard.press('Enter').catch(() => {});
            }
            return { triggered: true, action: 'search_executed', targetText: targetTitle };
          }
        }
      }
    } catch {}
  }

  return { triggered: false, action: 'none' };
}
