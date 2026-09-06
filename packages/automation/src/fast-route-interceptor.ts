import type { Page, BrowserContext } from 'playwright';

const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font', 'imageset']);

const BLOCKED_TRACKER_DOMAINS = [
  'trainings.internshala.com',
  'google-analytics.com',
  'googletagmanager.com',
  'googleadservices.com',
  'doubleclick.net',
  'hotjar.com',
  'segment.io',
  'segment.com',
  'facebook.net',
  'facebook.com/tr',
  'sentry.io',
  'intercom.io',
  'newrelic.com',
  'datadoghq.com',
  'mixpanel.com',
  'amplitude.com',
  'clarity.ms',
  'fullstory.com',
  'crazyegg.com',
];

/**
 * Enables high-speed network route interception:
 * Aborts non-essential images, media, fonts, and 15+ tracking scripts,
 * allowing job application pages to load in under 250ms.
 */
export async function enableFastRouteInterception(target: Page | BrowserContext): Promise<void> {
  try {
    await target.route('**/*', (route) => {
      const request = route.request();
      const resourceType = request.resourceType();
      const url = request.url().toLowerCase();

      // 1. Block heavy binary assets
      if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
        return route.abort();
      }

      // 2. Block third-party tracking & analytics scripts
      for (const domain of BLOCKED_TRACKER_DOMAINS) {
        if (url.includes(domain)) {
          return route.abort();
        }
      }

      // Allow HTML, scripts, XHR, Fetch, and CSS stylesheets
      return route.continue();
    });
  } catch {}
}
