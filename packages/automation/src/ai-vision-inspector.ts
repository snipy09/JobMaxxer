import type { Page, Frame } from 'playwright';
import type { SemanticElement } from './groq-ai.js';

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
    const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 70, fullPage: false });
    screenshotBase64 = screenshotBuffer.toString('base64');
  } catch {}

  // 2. Extract and tag interactive elements across all frames
  const elements: SemanticElement[] = [];
  const frames = [page, ...page.frames()];

  for (const frame of frames) {
    try {
      const frameElements = await frame.evaluate(() => {
        const results: any[] = [];
        const selector = 'input, textarea, select, button, a.apply-button, a[href*="apply"], [role="button"], [role="textbox"], [role="combobox"], [data-qa*="apply"], [data-qa*="submit"]';
        const nodes = document.querySelectorAll(selector);

        nodes.forEach((node: any, idx) => {
          try {
            // Check visibility
            const style = window.getComputedStyle(node);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

            // Generate or preserve unique nomadic ID
            let nomadicId = node.getAttribute('data-nomadic-id');
            if (!nomadicId) {
              nomadicId = `nomadic_node_${idx}_${Math.random().toString(36).substr(2, 6)}`;
              node.setAttribute('data-nomadic-id', nomadicId);
            }

            // Extract label
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
              labelText = node.getAttribute('aria-label') || node.getAttribute('placeholder') || node.name || node.textContent || '';
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
              label: labelText.trim().replace(/\s+/g, ' ').slice(0, 120),
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
          await el.click().catch(() => {});
          await el.fill(value);
          await el.dispatchEvent('input').catch(() => {});
          await el.dispatchEvent('change').catch(() => {});
          return true;
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
 * Dispatches a click action by its unique nomadic ID across frames.
 */
export async function executeNomadicClick(page: Page, nomadicId: string): Promise<boolean> {
  const frames = [page, ...page.frames()];
  for (const frame of frames) {
    try {
      const el = await frame.$(`[data-nomadic-id="${nomadicId}"]`);
      if (el) {
        const isVisible = await el.isVisible().catch(() => false);
        const isEnabled = await el.isEnabled().catch(() => false);
        if (isVisible && isEnabled) {
          await el.scrollIntoViewIfNeeded().catch(() => {});
          await el.click().catch(() => {});
          return true;
        }
      }
    } catch {}
  }
  return false;
}
