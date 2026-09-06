import type { Page, Frame } from 'playwright';
import type { SemanticElement } from './groq-ai.js';
import { humanClick, humanType } from './stealth-evasion.js';

export interface PageVisionCapture {
  screenshotBase64: string;
  elements: SemanticElement[];
}

/**
 * Captures real-time visual viewport screenshot and extracts an indexed semantic tree
 * of interactive elements across all frames and shadow roots.
 */
export async function capturePageVisionAndDOM(page: Page): Promise<PageVisionCapture> {
  // 1. Capture base64 screenshot
  let screenshotBase64 = '';
  try {
    const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 75, fullPage: false });
    screenshotBase64 = screenshotBuffer.toString('base64');
  } catch {}

  // 2. Extract and tag interactive elements across all frames
  const elements: SemanticElement[] = [];
  const frames = [page, ...page.frames()];

  for (const frame of frames) {
    try {
      const frameElements = await frame.evaluate(() => {
        const results: any[] = [];
        const selector = [
          'input',
          'textarea',
          'select',
          'button',
          'a[href]',
          '[role="button"]',
          '[role="textbox"]',
          '[role="combobox"]',
          '[role="listbox"]',
          '[role="checkbox"]',
          '[role="radio"]',
          '[data-qa*="apply"]',
          '[data-qa*="submit"]',
          '[class*="select"]',
          '[class*="dropdown"]',
          '[class*="apply"]',
          '[class*="button"]'
        ].join(', ');

        const nodes = document.querySelectorAll(selector);

        nodes.forEach((node: any, idx) => {
          try {
            // Check visibility
            const style = window.getComputedStyle(node);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

            const rect = node.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return;

            // Generate or preserve unique nomadic ID
            let nomadicId = node.getAttribute('data-nomadic-id');
            if (!nomadicId) {
              nomadicId = `nomadic_node_${idx}_${Math.random().toString(36).substr(2, 6)}`;
              node.setAttribute('data-nomadic-id', nomadicId);
            }

            // Extract label & context text
            let labelText = '';
            if (node.id) {
              const labelEl = document.querySelector(`label[for="${node.id}"]`);
              if (labelEl) labelText = labelEl.textContent || '';
            }
            if (!labelText) {
              const parentLabel = node.closest('label');
              if (parentLabel) labelText = parentLabel.textContent || '';
            }
            if (!labelText) {
              labelText = node.getAttribute('aria-label') ||
                          node.getAttribute('placeholder') ||
                          node.name ||
                          node.innerText ||
                          node.textContent ||
                          node.getAttribute('title') || '';
            }

            const options: string[] = [];
            if (node.tagName.toLowerCase() === 'select') {
              Array.from(node.options).forEach((opt: any) => {
                if (opt.text && opt.text.trim()) options.push(opt.text.trim());
              });
            }

            results.push({
              id: nomadicId,
              tag: node.tagName.toLowerCase(),
              type: (node.getAttribute('type') || '').toLowerCase(),
              name: node.name || '',
              placeholder: node.getAttribute('placeholder') || '',
              label: labelText.trim().replace(/\s+/g, ' ').slice(0, 140),
              value: node.value || '',
              ariaLabel: node.getAttribute('aria-label') || '',
              options: options.slice(0, 15),
              role: node.getAttribute('role') || '',
            });
          } catch {}
        });

        return results;
      });

      if (Array.isArray(frameElements)) {
        elements.push(...frameElements);
      }
    } catch {}
  }

  return { screenshotBase64, elements };
}

/**
 * Dispatches a rapid element fill action by its unique nomadic ID across frames.
 */
export async function executeNomadicFill(page: Page, nomadicId: string, value: string): Promise<boolean> {
  const frames = [page, ...page.frames()];
  for (const frame of frames) {
    try {
      const el = await frame.$(`[data-nomadic-id="${nomadicId}"]`);
      if (el) {
        const isVisible = typeof el.isVisible === 'function' ? await el.isVisible().catch(() => false) : true;
        if (isVisible) {
          if (typeof el.scrollIntoViewIfNeeded === 'function') {
            await el.scrollIntoViewIfNeeded().catch(() => {});
          }
          if (typeof el.evaluate === 'function') {
            await el.evaluate((node: any) => {
              node.style.outline = '2px solid #22c55e';
              node.style.boxShadow = '0 0 8px rgba(34,197,94,0.3)';
            }).catch(() => {});
          }
          return await humanType(frame, el, value);
        }
      }
    } catch {}
  }
  return false;
}

/**
 * Universal Dropdown & Combobox Selector:
 * Handles standard <select>, custom React/Radix selects, ARIA comboboxes, and listbox menus.
 */
export async function executeNomadicSelect(page: Page, nomadicId: string, optionValueOrText: string): Promise<boolean> {
  const frames = [page, ...page.frames()];
  const optLower = (optionValueOrText || '').toLowerCase().trim();

  for (const frame of frames) {
    try {
      const el = await frame.$(`[data-nomadic-id="${nomadicId}"]`);
      if (!el) continue;

      const isVisible = typeof el.isVisible === 'function' ? await el.isVisible().catch(() => false) : true;
      if (!isVisible) continue;

      if (typeof el.scrollIntoViewIfNeeded === 'function') {
        await el.scrollIntoViewIfNeeded().catch(() => {});
      }

      const tagName = await el.evaluate((node: any) => (node.tagName || '').toLowerCase()).catch(() => '');

      // 1. Standard <select> element
      if (tagName === 'select') {
        const options = await el.$$eval('option', (opts: any[]) =>
          opts.map(o => ({ value: o.value, text: (o.textContent || '').trim().toLowerCase() }))
        ).catch(() => []);

        if (options.length > 0) {
          const matched = options.find(o => o.text.includes(optLower) || o.value.toLowerCase() === optLower || optLower.includes(o.text));
          if (matched && matched.value) {
            await (el as any).selectOption(matched.value).catch(() => {});
            return true;
          } else if (options.length > 1) {
            // Pick first non-empty option
            const firstValid = options.find(o => o.value && o.value !== '' && !o.text.includes('select') && !o.text.includes('choose')) || options[1];
            if (firstValid) {
              await (el as any).selectOption(firstValid.value).catch(() => {});
              return true;
            }
          }
        }
      }

      // 2. Custom Combobox, ARIA Select, or Dropdown Button
      // Click trigger to open dropdown
      await humanClick(frame, el);
      if (typeof page.waitForTimeout === 'function') {
        await page.waitForTimeout(200);
      }

      // Look for popup options in current frame and main page
      const optionSelectors = [
        '[role="option"]',
        'li[role="option"]',
        '.select__option',
        'div[class*="option"]',
        'div[id*="react-select"]',
        'button.dropdown-item',
        'li.dropdown-item',
        'div[role="listbox"] div',
        'ul[role="listbox"] li'
      ];

      for (const sel of optionSelectors) {
        try {
          const optionElements = await frame.$$(sel).catch(() => []);
          for (const optEl of optionElements) {
            const isOptVis = typeof optEl.isVisible === 'function' ? await optEl.isVisible().catch(() => false) : true;
            if (!isOptVis) continue;

            const text = (await optEl.textContent().catch(() => ''))?.toLowerCase().trim() || '';
            if (text && (text.includes(optLower) || optLower.includes(text))) {
              await humanClick(frame, optEl);
              return true;
            }
          }
        } catch {}
      }

      // If search input exists inside combobox, type and press Enter
      const innerInput = await el.$('input[type="text"], input[role="combobox"]').catch(() => null);
      if (innerInput) {
        await humanType(frame, innerInput, optionValueOrText);
        if ('keyboard' in page && page.keyboard) {
          await page.keyboard.press('Enter').catch(() => {});
        }
        return true;
      }

      return true;
    } catch {}
  }
  return false;
}

/**
 * Dispatches a checkbox action by its unique nomadic ID across frames.
 */
export async function executeNomadicCheckbox(page: Page, nomadicId: string, checked: boolean = true): Promise<boolean> {
  const frames = [page, ...page.frames()];
  for (const frame of frames) {
    try {
      const el = await frame.$(`[data-nomadic-id="${nomadicId}"]`);
      if (el) {
        const isVisible = typeof el.isVisible === 'function' ? await el.isVisible().catch(() => false) : true;
        if (isVisible) {
          const isCurrentlyChecked = typeof el.isChecked === 'function' ? await el.isChecked().catch(() => false) : false;
          if (isCurrentlyChecked !== checked) {
            return await humanClick(frame, el);
          }
          return true;
        }
      }
    } catch {}
  }
  return false;
}

/**
 * Dispatches a click action by its unique nomadic ID across frames.
 */
export async function executeNomadicClick(page: Page, nomadicId: string): Promise<boolean> {
  const frames = [page, ...page.frames()];
  for (const frame of frames) {
    try {
      const el = await frame.$(`[data-nomadic-id="${nomadicId}"]`);
      if (el) {
        const isVisible = typeof el.isVisible === 'function' ? await el.isVisible().catch(() => false) : true;
        const isEnabled = typeof el.isEnabled === 'function' ? await el.isEnabled().catch(() => false) : true;
        if (isVisible && isEnabled) {
          if (typeof el.evaluate === 'function') {
            await el.evaluate((node: any) => {
              node.style.outline = '2px solid #38bdf8';
            }).catch(() => {});
          }
          return await humanClick(frame, el);
        }
      }
    } catch {}
  }
  return false;
}

/**
 * Dispatches a resume upload action to a file input by its nomadic ID across frames.
 */
export async function executeNomadicUploadResume(page: Page, nomadicId: string, resumePath: string): Promise<boolean> {
  const frames = [page, ...page.frames()];
  for (const frame of frames) {
    try {
      const el = await frame.$(`[data-nomadic-id="${nomadicId}"]`);
      if (el) {
        await (el as any).setInputFiles(resumePath).catch(() => {});
        return true;
      }
    } catch {}
  }
  return false;
}
