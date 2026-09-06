import type { Page, Frame, ElementHandle } from 'playwright';

/**
 * Injects undetectable stealth scripts into page and all nested frames.
 * Strips webdriver signatures, injects window.chrome, mocks plugins, permissions, and WebGL.
 */
export async function injectStealthScripts(target: Page | Frame): Promise<void> {
  const stealthScript = `
    (() => {
      // 1. Strip navigator.webdriver and automation indicators
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });

      // 1b. Mock chrome cdc_ / webdriver symbols
      try {
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
      } catch {}

      // 1c. Mock Notification and Permissions
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          Object.defineProperty(Notification, 'permission', { get: () => 'default' });
        } catch {}
      }

      // 2. Mock window.chrome
      if (!window.chrome) {
        window.chrome = {
          app: { isInstalled: false, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' }, RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' } },
          runtime: { OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' }, PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' }, PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' }, PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' }, RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' } },
          loadTimes: () => ({
            commitLoadTime: Date.now() / 1000 - 0.5,
            connectionInfo: 'h2',
            finishDocumentLoadTime: Date.now() / 1000 - 0.2,
            finishLoadTime: Date.now() / 1000 - 0.1,
            firstPaintAfterLoadTime: 0,
            firstPaintTime: Date.now() / 1000 - 0.4,
            navigationType: 'Other',
            npnNegotiatedProtocol: 'h2',
            requestTime: Date.now() / 1000 - 1.0,
            startLoadTime: Date.now() / 1000 - 0.9,
            wasAlternateProtocolAvailable: false,
            wasFetchedViaSpdy: true,
            wasNpnNegotiated: true
          }),
          csi: () => ({
            onloadT: Date.now() - 100,
            pageT: 250.5,
            startE: Date.now() - 350,
            tran: 15
          })
        };
      }

      // 3. Mock navigator.languages and plugins
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        configurable: true
      });

      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const plugins = [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbicgflfkfknnimggajndmptblijf', description: '' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
          ];
          return plugins;
        },
        configurable: true
      });

      // 4. Mock Permissions API
      if (navigator.permissions && navigator.permissions.query) {
        const origQuery = navigator.permissions.query;
        navigator.permissions.query = (parameters) => {
          if (parameters.name === 'notifications') {
            return Promise.resolve({ state: Notification.permission === 'granted' ? 'granted' : 'prompt', onchange: null } as any);
          }
          return origQuery(parameters);
        };
      }

      // 5. Mask WebGL vendor and renderer
      try {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(param) {
          if (param === 37445) return 'Google Inc. (NVIDIA)';
          if (param === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce RTX Direct3D11 vs_5_0 ps_5_0)';
          return getParameter.apply(this, [param]);
        };
      } catch {}
    })();
  `;

  try {
    if ('addInitScript' in target) {
      await (target as Page).addInitScript(stealthScript).catch(() => {});
    }
    await target.evaluate(stealthScript).catch(() => {});
  } catch {}
}

/**
 * Executes a randomized human pause with micro-jitter to completely evade bot timing heuristics.
 */
export async function randomPause(page?: Page | Frame | null, minMs: number = 220, maxMs: number = 520): Promise<void> {
  const delay = Math.floor(minMs + Math.random() * (maxMs - minMs));
  if (page && typeof page.waitForTimeout === 'function') {
    await page.waitForTimeout(delay);
  } else {
    await new Promise(r => setTimeout(r, delay));
  }
}

/**
 * Returns a randomized millisecond integer between min and max.
 */
export function getRandomDelay(minMs: number = 200, maxMs: number = 500): number {
  return Math.floor(minMs + Math.random() * (maxMs - minMs));
}

/**
 * Rapid-Fast Element Value Setter & Form Filler (< 5ms per field).
 * Instantly populates inputs/textareas while cleanly triggering DOM change and input events.
 */
export async function humanType(
  page: Page | Frame,
  element: ElementHandle<any> | string,
  text: string
): Promise<boolean> {
  try {
    let el: ElementHandle<any> | null = null;
    if (typeof element === 'string') {
      el = await page.$(element);
    } else {
      el = element;
    }

    if (!el) return false;

    if (typeof el.scrollIntoViewIfNeeded === 'function') {
      await el.scrollIntoViewIfNeeded().catch(() => {});
    }

    // Try Playwright high-speed fill first
    if (typeof el.fill === 'function') {
      try {
        await el.fill(text);
        return true;
      } catch {}
    }

    // DOM rapid-paste fallback with native React/standard event dispatch
    if (typeof el.evaluate === 'function') {
      await el.evaluate((input: HTMLInputElement, val: string) => {
        if (!input) return;
        const nativeInputValueSetter = (Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') ||
                                        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value'))?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(input, val);
        } else {
          input.value = val;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
      }, text).catch(() => {});
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Clicks an element with smooth hover and realistic human mousedown-mouseup duration.
 */
export async function humanClick(
  page: Page | Frame,
  element: ElementHandle<any> | string
): Promise<boolean> {
  try {
    let el: ElementHandle<any> | null = null;
    if (typeof element === 'string') {
      el = await page.$(element);
    } else {
      el = element;
    }

    if (!el) return false;

    if (typeof el.scrollIntoViewIfNeeded === 'function') {
      await el.scrollIntoViewIfNeeded().catch(() => {});
    }
    if (typeof page.waitForTimeout === 'function') {
      await page.waitForTimeout(60 + Math.random() * 80);
    }

    const box = typeof el.boundingBox === 'function' ? await el.boundingBox().catch(() => null) : null;
    if (box && 'mouse' in page && page.mouse && typeof page.mouse.move === 'function') {
      const x = box.x + box.width / 2 + (Math.random() * 4 - 2);
      const y = box.y + box.height / 2 + (Math.random() * 4 - 2);
      await (page as Page).mouse.move(x, y, { steps: 5 });
      if (typeof page.waitForTimeout === 'function') await page.waitForTimeout(30 + Math.random() * 50);
      await (page as Page).mouse.down();
      if (typeof page.waitForTimeout === 'function') await page.waitForTimeout(40 + Math.random() * 60);
      await (page as Page).mouse.up();
    } else if (typeof el.click === 'function') {
      await el.click().catch(() => {});
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Detects and automatically resolves Cloudflare Turnstile challenges.
 */
export async function handleCloudflareTurnstile(page: Page): Promise<{ detected: boolean; resolved: boolean }> {
  try {
    // 1. Check if Cloudflare Turnstile or Challenge is active
    const isCf = await page.evaluate(() => {
      const bodyText = (document.body?.innerText || '').toLowerCase();
      const hasCfText = bodyText.includes('checking your browser') ||
                        bodyText.includes('verify you are human') ||
                        bodyText.includes('cloudflare') ||
                        bodyText.includes('just a moment...');
      const hasCfElement = Boolean(
        document.querySelector('#challenge-stage') ||
        document.querySelector('.cf-turnstile') ||
        document.querySelector('#cf-turnstile') ||
        document.querySelector('iframe[src*="cloudflare"]') ||
        document.querySelector('iframe[src*="turnstile"]')
      );
      return hasCfText && hasCfElement;
    });

    if (!isCf) return { detected: false, resolved: true };

    console.log('[Anti-Bot Evasion] Cloudflare Turnstile challenge detected. Attempting autonomous verification...');

    // 2. Wait up to 5s for auto-verification
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(1000);
      const stillPresent = await page.evaluate(() => {
        return Boolean(document.querySelector('#challenge-stage') || document.querySelector('.cf-turnstile'));
      });
      if (!stillPresent) {
        console.log('[Anti-Bot Evasion] Cloudflare Turnstile automatically resolved ✓');
        return { detected: true, resolved: true };
      }

      // Try locating and clicking the Turnstile checkbox inside iframes
      for (const frame of page.frames()) {
        try {
          const checkbox = await frame.$('input[type="checkbox"], .ctp-checkbox-label, #challenge-stage input');
          if (checkbox) {
            await humanClick(frame, checkbox);
            await page.waitForTimeout(2000);
            break;
          }
        } catch {}
      }
    }

    // Check final status
    const resolved = await page.evaluate(() => {
      const text = (document.body?.innerText || '').toLowerCase();
      return !text.includes('checking your browser') && !text.includes('just a moment...');
    });

    return { detected: true, resolved };
  } catch {
    return { detected: false, resolved: true };
  }
}
