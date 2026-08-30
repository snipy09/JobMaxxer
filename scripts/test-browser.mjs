import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

chromium.use(stealthPlugin());

console.log('1. Checking browser paths...');
const candidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

for (const c of candidates) {
  if (fs.existsSync(c)) console.log('Found candidate:', c);
}

async function test() {
  console.log('2. Launching chromium with channel chrome...');
  try {
    const browser = await chromium.launch({
      headless: false,
      channel: 'chrome',
      args: ['--start-maximized'],
    });
    console.log('3. Browser launched successfully!');
    const page = await browser.newPage();
    await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
    console.log('4. Navigated to example.com!');
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
    console.log('5. Closed!');
  } catch (err) {
    console.error('Launch failed:', err);
  }
}

test();
