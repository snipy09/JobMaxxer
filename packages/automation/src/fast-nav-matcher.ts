import type { Page, Frame } from 'playwright';
import { humanClick, humanType } from './stealth-evasion.js';

export interface FastNavResult {
  triggered: boolean;
  action: 'apply_clicked' | 'job_link_clicked' | 'search_executed' | 'form_already_present' | 'none';
  targetText?: string;
}

const BLOCKED_PROMO_TEXTS = [
  'get job ready',
  'placement guarantee',
  'courses',
  'trainings',
  'specialization',
  'enroll now',
  'explore courses',
  'upskill',
  'free guide',
  'career guide',
  'view syllabus',
  'certif',
  'internshala trainings',
  'resume builder',
  'launchpad',
  'short-term courses',
  'trending courses',
  'learn ',
];

const BLOCKED_PROMO_PATHS = [
  'trainings.internshala.com',
  '/courses',
  '/trainings',
  '/specialization',
  '/launchpad',
  '/placement-guarantee',
  '/career-guide',
  '/pricing',
  '/blog',
  '/short-term-courses',
];

/**
 * Validates if an element or link is a promotional / course advertisement.
 */
export function isPromotionalElement(text: string, href: string = ''): boolean {
  const t = (text || '').toLowerCase().trim();
  const h = (href || '').toLowerCase().trim();

  for (const promo of BLOCKED_PROMO_TEXTS) {
    if (t.includes(promo)) return true;
  }
  for (const path of BLOCKED_PROMO_PATHS) {
    if (h.includes(path)) return true;
  }
  return false;
}

/**
 * Checks if the current page URL is already a direct job/internship detail posting.
 */
export function isDirectJobDetailPage(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('/internship/detail/') ||
    lower.includes('/job/detail/') ||
    lower.includes('boards.greenhouse.io') ||
    lower.includes('jobs.lever.co') ||
    lower.includes('jobs.ashbyhq.com') ||
    lower.includes('/job/') ||
    lower.includes('/jobs/') ||
    lower.includes('/careers/') ||
    lower.includes('/posting/')
  );
}

/**
 * Tier 1: Local Fast Navigation & Search Matcher (10ms - 0 AI, 0 Photos)
 * Automatically navigates from job descriptions or directories directly into the application form,
 * while strictly ignoring marketing, upskill, and course upsells.
 */
export async function runFastLocalNavMatcher(
  page: Page,
  targetTitle?: string,
  companyName?: string
): Promise<FastNavResult> {
  const currentUrl = page.url() || '';
  const isDetailPage = isDirectJobDetailPage(currentUrl);
  const frames = [page, ...page.frames()];

  for (const frame of frames) {
    try {
      // 1. Check if an application form is ALREADY open and visible in DOM
      const isFormVisible = await frame.evaluate(() => {
        const formInput = document.querySelector(
          'input[type="email"], input[name*="email"], input[name*="first_name"], input[name*="name"], #application-form, form[action*="apply"], #application_form'
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

      // 2. High-Priority "Apply" Button Scanner (Prioritizes genuine apply CTAs)
      const primaryApplySelectors = [
        '#apply_now_button',
        'button#apply_now_button',
        'a#apply_now_button',
        '.apply_now_button',
        'button.apply_now_button',
        'a.postings-btn',
        'button[data-qa="apply-button"]',
        'button.apply-button',
        '#apply_button',
        'button:has-text("Apply now")',
        'a:has-text("Apply now")',
        'button:has-text("Apply for this job")',
        'a:has-text("Apply for this job")',
        'button:has-text("Apply with Resume")',
        'button:has-text("Apply")',
        'a[href$="/apply"]',
        'a[href$="/application"]',
        'a[href*="/apply?"]',
      ];

      for (const sel of primaryApplySelectors) {
        try {
          const btn = await frame.$(sel);
          if (btn) {
            const isVis = typeof btn.isVisible === 'function' ? await btn.isVisible().catch(() => false) : true;
            if (isVis) {
              const text = (await btn.textContent().catch(() => ''))?.toLowerCase().trim() || '';
              const href = (await btn.getAttribute('href').catch(() => '')) || '';

              // Ensure it is NOT a promotional / course link
              if (!isPromotionalElement(text, href)) {
                await humanClick(frame, btn);
                return { triggered: true, action: 'apply_clicked', targetText: sel };
              }
            }
          }
        } catch {}
      }

      // If already on a detail page, NEVER click directory cards or search inputs!
      if (isDetailPage) {
        continue;
      }

      // 3. Exact / Partial Job Title Link Scanner (ONLY for Directory/Index Pages)
      if (targetTitle && targetTitle.trim().length > 2) {
        const titleClean = targetTitle.toLowerCase().trim();
        const titleKeywords = titleClean.split(/\s+/).filter(w => w.length > 2);

        const linkElements = await frame.$$('a[href], [role="link"]').catch(() => []);
        for (const el of linkElements) {
          try {
            const text = (await el.textContent().catch(() => ''))?.toLowerCase().trim() || '';
            const href = (await el.getAttribute('href').catch(() => '')) || '';

            // Ignore marketing banners, courses, and promotional links
            if (isPromotionalElement(text, href)) {
              continue;
            }

            if (text.length > 3) {
              // Exact match or contains significant title keywords
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
