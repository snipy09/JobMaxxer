import {
  launchExternalStealthBrowser,
  type BrowserSession,
} from '@job-automator/automation';

export interface OutreachRecipient {
  email: string;
  name?: string;
  company?: string;
  role?: string;
  subject: string;
  body: string;
}

export interface OutreachDispatchResult {
  total: number;
  openedInBrowser: number;
  autoSent: number;
  failed: number;
  errors?: string[];
}

let activeOutreachSession: BrowserSession | null = null;

export class ExternalChromeOutreach {
  /**
   * Launches dedicated external Chrome window with pre-filled Gmail compose tabs
   * for recruiter outreach, candidate review, and automated dispatch.
   */
  public static async launchGmailOutreachSession(
    contacts: OutreachRecipient[],
    options: { autoSend?: boolean; dripDelayMs?: number } = {},
    onProgress?: (msg: string) => void
  ): Promise<OutreachDispatchResult> {
    if (!contacts || contacts.length === 0) {
      return { total: 0, openedInBrowser: 0, autoSent: 0, failed: 0 };
    }

    onProgress?.(`Launching external Chrome for ${contacts.length} recruiter outreach messages...`);

    let session: BrowserSession;
    try {
      if (activeOutreachSession && activeOutreachSession.browser.isConnected()) {
        session = activeOutreachSession;
      } else {
        session = await launchExternalStealthBrowser({
          headless: false,
          slowMo: 50,
        });
        activeOutreachSession = session;
      }
    } catch (err: any) {
      onProgress?.(`Browser launch notice: ${err?.message}`);
      return { total: contacts.length, openedInBrowser: 0, autoSent: 0, failed: contacts.length, errors: [err?.message] };
    }

    let opened = 0;
    let autoSent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      const targetEmail = c.email.trim();
      const targetSubject = c.subject;
      const targetBody = c.body;

      onProgress?.(`[Outreach ${i + 1}/${contacts.length}] Opening compose window for: ${targetEmail}`);

      try {
        const page = await session.context.newPage();
        const composeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
          targetEmail
        )}&su=${encodeURIComponent(targetSubject)}&body=${encodeURIComponent(targetBody)}`;

        await page.goto(composeUrl, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
        await page.bringToFront().catch(() => {});

        // Inject floating JobMaxxer banner
        await page.evaluate(
          ({ name, company, email }: { name?: string; company?: string; email: string }) => {
            try {
              const banner = document.createElement('div');
              banner.id = 'jobmaxxer-outreach-banner';
              banner.style.position = 'fixed';
              banner.style.top = '16px';
              banner.style.right = '24px';
              banner.style.zIndex = '2147483647';
              banner.style.backgroundColor = '#0f172a';
              banner.style.color = '#38bdf8';
              banner.style.padding = '10px 20px';
              banner.style.borderRadius = '9999px';
              banner.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(56,189,248,0.4)';
              banner.style.fontFamily = 'system-ui, -apple-system, sans-serif';
              banner.style.fontSize = '12px';
              banner.style.fontWeight = 'bold';
              banner.style.border = '1px solid rgba(56,189,248,0.6)';
              banner.style.pointerEvents = 'none';
              banner.innerHTML = `<span>⚡ JobMaxxer: Outreach to ${name || 'Recruiter'} (${company || email})</span>`;
              document.body.appendChild(banner);
            } catch {}
          },
          { name: c.name, company: c.company, email: targetEmail }
        );

        opened++;

        // If autoSend requested, attempt to click Send button
        if (options.autoSend) {
          try {
            await page.waitForTimeout(2000);
            const sendBtn = await page.$(
              'div[role="button"][data-tooltip*="Send" i], div[role="button"][aria-label*="Send" i], div[data-tooltip*="Ctrl-Enter" i]'
            );
            if (sendBtn) {
              await sendBtn.evaluate((el: any) => {
                el.style.outline = '3px solid #22c55e';
                el.style.boxShadow = '0 0 12px rgba(34,197,94,0.6)';
              }).catch(() => {});
              await page.waitForTimeout(1000);
              await sendBtn.click().catch(() => {});
              autoSent++;
              onProgress?.(`[Outreach ${i + 1}/${contacts.length}] Auto-dispatched message to ${targetEmail} ✓`);
            }
          } catch {}
        } else {
          // Highlight Send button for manual 1-click candidate send
          try {
            await page.waitForTimeout(1500);
            const sendBtn = await page.$(
              'div[role="button"][data-tooltip*="Send" i], div[role="button"][aria-label*="Send" i], div[data-tooltip*="Ctrl-Enter" i]'
            );
            if (sendBtn) {
              await sendBtn.evaluate((el: any) => {
                el.style.outline = '3px solid #38bdf8';
                el.style.boxShadow = '0 0 12px rgba(56,189,248,0.6)';
              }).catch(() => {});
            }
          } catch {}
        }

        if (i < contacts.length - 1 && options.dripDelayMs) {
          await new Promise((r) => setTimeout(r, options.dripDelayMs));
        }
      } catch (err: any) {
        failed++;
        errors.push(err?.message || String(err));
        onProgress?.(`[Outreach Error] ${targetEmail}: ${err?.message}`);
      }
    }

    onProgress?.(`Outreach session complete: ${opened} compose tabs ready in external Chrome.`);
    return {
      total: contacts.length,
      openedInBrowser: opened,
      autoSent,
      failed,
      errors: errors.length ? errors : undefined,
    };
  }
}
