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
          '[role="checkbox"]',
          '[role="radio"]',
          '[data-qa*="apply"]',
          '[data-qa*="submit"]',
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
 * Dispatches an element fill action by its unique nomadic ID across frames.
 */
export async function executeNomadicFill(page: Page, nomadicId: string, value: string): Promise<boolean> {
  const frames = [page, ...page.frames()];
  for (const frame of frames) {
    try {
      const el = await frame.$(`[data-nomadic-id="${nomadicId}"]`);
      if (el) {
        const isVisible = await el.isVisible().catch(() => false);
        if (isVisible) {
          await el.scrollIntoViewIfNeeded().catch(() => {});
          await el.evaluate((node: any) => {
            node.style.outline = '2px solid #22c55e';
            node.style.boxShadow = '0 0 10px rgba(34,197,94,0.4)';
          }).catch(() => {});
          return await humanType(frame, el, value);
        }
      }
    } catch {}
  }
  return false;
}

/**
 * Dispatches an element select action by its unique nomadic ID across frames.
 */
export async function executeNomadicSelect(page: Page, nomadicId: string, optionValueOrText: string): Promise<boolean> {
  const frames = [page, ...page.frames()];
  for (const frame of frames) {
    try {
      const el = await frame.$(`[data-nomadic-id="${nomadicId}"]`);
      if (el) {
        const isVisible = await el.isVisible().catch(() => false);
        if (isVisible) {
          const optLower = optionValueOrText.toLowerCase().trim();
          const options = await el.$$eval('option', (opts: any[]) =>
            opts.map(o => ({ value: o.value, text: (o.textContent || '').trim().toLowerCase() }))
          );

          const matched = options.find(o => o.text.includes(optLower) || o.value.toLowerCase() === optLower);
          if (matched && matched.value) {
            await (el as any).selectOption(matched.value);
            return true;
          } else if (options.length > 1) {
            await (el as any).selectOption(options[1].value);
            return true;
          }
        }
      }
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
        const isVisible = await el.isVisible().catch(() => false);
        if (isVisible) {
          const isCurrentlyChecked = await el.isChecked().catch(() => false);
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
