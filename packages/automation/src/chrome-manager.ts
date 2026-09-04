import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { spawn } from 'child_process';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

export interface BrowserLaunchOptions {
  headless?: boolean;
  slowMo?: number;
  userDataDir?: string;
  args?: string[];
}

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  executablePath: string;
}

/**
 * Searches system and local directories for available Chrome, Chromium, Chrome for Testing, or Edge binaries.
 */
export function findChromeExecutable(): string | undefined {
  if (process.platform === 'win32') {
    const candidatePaths: (string | undefined)[] = [
      // Nomadic local downloads
      path.join(process.env.LOCALAPPDATA || '', 'Nomadic', 'chrome-for-testing', 'chrome-win64', 'chrome.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Nomadic', 'chrome-for-testing', 'chrome.exe'),
      path.join(process.env.APPDATA || '', 'Nomadic', 'chrome-for-testing', 'chrome.exe'),
      
      // Standard Google Chrome
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),

      // Microsoft Edge (Pre-installed on all Windows 10/11 machines)
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),

      // Brave Browser
      'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
    ];

    // Check Playwright installed binaries
    const msPlaywrightDir = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
    if (fs.existsSync(msPlaywrightDir)) {
      try {
        const items = fs.readdirSync(msPlaywrightDir);
        for (const item of items) {
          if (item.startsWith('chromium-') || item.startsWith('chrome-')) {
            const p1 = path.join(msPlaywrightDir, item, 'chrome-win', 'chrome.exe');
            const p2 = path.join(msPlaywrightDir, item, 'chrome-win64', 'chrome.exe');
            if (fs.existsSync(p1)) candidatePaths.unshift(p1);
            if (fs.existsSync(p2)) candidatePaths.unshift(p2);
          }
        }
      } catch {}
    }

    for (const c of candidatePaths) {
      if (c && fs.existsSync(c)) {
        return c;
      }
    }
  } else if (process.platform === 'darwin') {
    const macPaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
    for (const p of macPaths) {
      if (fs.existsSync(p)) return p;
    }
  } else {
    // Linux
    const linuxPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ];
    for (const p of linuxPaths) {
      if (fs.existsSync(p)) return p;
    }
  }

  // Check Playwright default executable
  try {
    const playwrightExec = chromium.executablePath();
    if (playwrightExec && fs.existsSync(playwrightExec)) {
      return playwrightExec;
    }
  } catch {}

  return undefined;
}

/**
 * Downloads and installs Chrome for Testing / Playwright Chromium if no browser is detected.
 */
export async function ensureChromeForTesting(
  onProgress?: (message: string) => void
): Promise<string> {
  const existing = findChromeExecutable();
  if (existing) {
    onProgress?.(`Found verified browser engine: ${existing}`);
    return existing;
  }

  onProgress?.('No browser binary found. Installing Playwright Chromium engine...');

  return new Promise<string>((resolve, reject) => {
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(npxCmd, ['playwright', 'install', 'chromium'], {
      shell: true,
      env: { ...process.env },
    });

    child.stdout?.on('data', (d) => {
      const line = d.toString().trim();
      if (line) onProgress?.(`[Install] ${line}`);
    });

    child.stderr?.on('data', (d) => {
      const line = d.toString().trim();
      if (line) onProgress?.(`[Install] ${line}`);
    });

    child.on('close', (code) => {
      const verified = findChromeExecutable();
      if (verified) {
        onProgress?.(`Browser engine successfully installed at: ${verified}`);
        resolve(verified);
      } else {
        const fallback = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        onProgress?.(`Installation finished (code ${code}). Using default fallback.`);
        resolve(fallback);
      }
    });

    child.on('error', (err) => {
      onProgress?.(`Installation notice: ${err.message}`);
      const verified = findChromeExecutable();
      if (verified) resolve(verified);
      else reject(err);
    });
  });
}

/**
 * Launches an external stealth browser window with full anti-bot evasion.
 */
export async function launchExternalStealthBrowser(
  options: BrowserLaunchOptions = {}
): Promise<BrowserSession> {
  const executablePath = findChromeExecutable();
  const headless = options.headless ?? false;
  const slowMo = options.slowMo ?? 40;

  const defaultArgs = [
    '--start-maximized',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-features=Translate',
    '--window-size=1400,900',
    ...(options.args || []),
  ];

  const launchConfig: any = {
    headless,
    slowMo,
    args: defaultArgs,
  };

  if (executablePath) {
    launchConfig.executablePath = executablePath;
  }

  let browser: Browser;
  try {
    if (executablePath) {
      browser = await chromium.launch(launchConfig);
    } else {
      // Try channel chrome, then msedge, then default
      try {
        browser = await chromium.launch({ ...launchConfig, channel: 'chrome' });
      } catch {
        try {
          browser = await chromium.launch({ ...launchConfig, channel: 'msedge' });
        } catch {
          browser = await chromium.launch(launchConfig);
        }
      }
    }
  } catch (err: any) {
    console.warn('[Chrome Manager] Launch fallback attempt:', err?.message);
    browser = await chromium.launch({ headless, slowMo, args: defaultArgs });
  }

  // Create isolated persistent-like context
  const context = await browser.newContext({
    viewport: null,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    permissions: ['clipboard-read', 'clipboard-write', 'notifications'],
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });

  // Inject anti-detection stealth scripts
  if (typeof context.addInitScript === 'function') {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      (window as any).chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });
  }

  return {
    browser,
    context,
    executablePath: executablePath || 'system-channel',
  };
}
