import type { Page, BrowserContext } from 'playwright';

const BLOCKED_RESOURCE_TYPES = new Set(['media', 'imageset']);

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
 * Enables network route interception:
 * Aborts heavy media, tracking ads, and promotional course domains
 * while preserving JavaScript, styles, and fonts required by security WAFs.
 */
export async function enableFastRouteInterception(target: Page | BrowserContext): Promise<void> {
  try {
    await target.route('**/*', (route) => {
      const request = route.request();
      const resourceType = request.resourceType();
      const url = request.url().toLowerCase();

      // 1. Block heavy binary media
      if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
        return route.abort();
      }

      // 2. Block third-party tracking scripts & promotional course subdomains
      for (const domain of BLOCKED_TRACKER_DOMAINS) {
        if (url.includes(domain)) {
          return route.abort();
        }
      }

      // Allow HTML, scripts, XHR, Fetch, stylesheets, and fonts
      return route.continue();
    });
  } catch {}
}
