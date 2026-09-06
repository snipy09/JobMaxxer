import type { Page, ElementHandle } from 'playwright';
import type { ATSPortal } from './ats-portals.js';
import { humanClick, injectStealthScripts } from './stealth-evasion.js';
import { enableFastRouteInterception } from './fast-route-interceptor.js';

export interface NavigationResult {
  success: boolean;
  formPage: Page | null;
  navType: 'direct' | 'modal' | 'new-tab' | 'stepper';
  error?: string;
}

export class ApplicationNavigator {
  constructor(
    private page: Page,
    private atsConfig: ATSPortal,
    private logger?: { info: (m: string, meta?: any) => void; debug: (m: string, meta?: any) => void; warn: (m: string, meta?: any) => void; error: (m: string, meta?: any) => void }
  ) {}

  /**
   * MAIN ENTRY: Navigate from job description page to application form.
   * Handles: Modal clicks, new tabs / popups, stepper forms, direct endpoints.
   */
  async navigateToApplicationForm(): Promise<NavigationResult> {
    try {
      this.logger?.info(`Navigating to form on ${this.atsConfig.name}`);

      // 1. Check if application form is ALREADY open and present in DOM
      const isAlreadyOpen = await this.isFormContainerPresent();
      if (isAlreadyOpen) {
        this.logger?.debug('Form container already visible in DOM, skipping Apply button click');
        return {
          success: true,
          formPage: this.page,
          navType: 'direct'
        };
      }

      // 2. Find Apply button using priority-ordered selectors
      const applyButton = await this.findApplyButton();
      if (!applyButton) {
        // If no Apply button found, check once more if the page itself is the direct form
        const isDirect = await this.isFormContainerPresent();
        if (isDirect) {
          return { success: true, formPage: this.page, navType: 'direct' };
        }
        return {
          success: false,
          formPage: null,
          navType: this.atsConfig.navigation.type,
          error: 'Apply button not found on portal'
        };
      }

      this.logger?.debug('Apply button located, executing click...');

      // 3. Click Apply button and handle popup / modal / redirect
      const formPage = await this.clickApplyButton(applyButton);

      // 4. Wait for form container to mount
      await this.waitForFormContainer(formPage || this.page);

      this.logger?.info('Successfully navigated to application form');
      return {
        success: true,
        formPage: formPage || this.page,
        navType: this.atsConfig.navigation.type
      };
    } catch (error) {
      this.logger?.error('Navigation failed', { error });
      return {
        success: false,
        formPage: null,
        navType: this.atsConfig.navigation.type,
        error: String(error)
      };
    }
  }

  /**
   * Find apply button using priority-ordered selectors from ATS config
   */
  private async findApplyButton(): Promise<ElementHandle<HTMLElement> | null> {
    const frames = [this.page, ...this.page.frames()];

    for (const frame of frames) {
      for (const selector of this.atsConfig.selectors.applyButton) {
        try {
          const button = await frame.$(selector);
          if (button) {
            const isVis = typeof button.isVisible === 'function' ? await button.isVisible().catch(() => false) : true;
            if (isVis) {
              const text = (await button.textContent().catch(() => ''))?.toLowerCase().trim() || '';
              // Exclude promotional training courses
              if (!text.includes('course') && !text.includes('specialization') && !text.includes('placement guarantee')) {
                this.logger?.debug(`Found apply button: ${selector}`);
                return button as ElementHandle<HTMLElement>;
              }
            }
          }
        } catch {}
      }
    }

    return null;
  }

  /**
   * Click apply button, handling different navigation scenarios (modal, popup tab, direct redirect)
   */
  private async clickApplyButton(button: ElementHandle<HTMLElement>): Promise<Page | null> {
    const navType = this.atsConfig.navigation.type;
    const context = this.page.context();

    if (navType === 'new-tab') {
      try {
        const [newPage] = await Promise.all([
          context.waitForEvent('page', { timeout: 4000 }),
          humanClick(this.page, button)
        ]);
        if (newPage) {
          await injectStealthScripts(newPage);
          await enableFastRouteInterception(newPage);
          await newPage.bringToFront().catch(() => {});
          this.logger?.info('New tab opened, bound to target application page');
          return newPage;
        }
      } catch {
        // Fallback: check all open pages in context
        const pages = context.pages();
        if (pages.length > 1) {
          const latest = pages[pages.length - 1];
          if (latest !== this.page) {
            await injectStealthScripts(latest);
            await enableFastRouteInterception(latest);
            return latest;
          }
        }
      }
      return this.page;
    } else {
      // Modal or Direct or Stepper
      await humanClick(this.page, button);
      await this.page.waitForTimeout(this.atsConfig.navigation.waitAfterClick || 400);

      // Check if clicking opened a new tab anyway
      const allPages = context.pages();
      if (allPages.length > 1) {
        const latest = allPages[allPages.length - 1];
        if (latest && !latest.isClosed() && latest !== this.page) {
          await injectStealthScripts(latest);
          await enableFastRouteInterception(latest);
          await latest.bringToFront().catch(() => {});
          return latest;
        }
      }

      return this.page;
    }
  }

  /**
   * Check if a form container is already visible
   */
  private async isFormContainerPresent(): Promise<boolean> {
    const frames = [this.page, ...this.page.frames()];
    for (const frame of frames) {
      for (const selector of this.atsConfig.selectors.formContainer) {
        try {
          const el = await frame.$(selector);
          if (el) {
            const isVis = typeof el.isVisible === 'function' ? await el.isVisible().catch(() => false) : true;
            if (isVis) return true;
          }
        } catch {}
      }
    }
    return false;
  }

  /**
   * Wait for form container to mount in DOM
   */
  private async waitForFormContainer(targetPage: Page): Promise<void> {
    for (const selector of this.atsConfig.selectors.formContainer) {
      try {
        await targetPage.waitForSelector(selector, { timeout: 1500 });
        this.logger?.debug(`Form container verified: ${selector}`);
        return;
      } catch {}
    }
  }
}
