import type { Page } from 'playwright';
import type { MasterProfile } from '../auto-apply-engine.js';
import { InternshalaBot, type SpecializedBotResult } from './internshala-bot.js';
import { LeverBot } from './lever-bot.js';
import { GreenhouseBot } from './greenhouse-bot.js';
import { AshbyBot } from './ashby-bot.js';

export {
  InternshalaBot,
  LeverBot,
  GreenhouseBot,
  AshbyBot,
  type SpecializedBotResult,
};

/**
 * Directs the browser session straight to the specialized bot for that portal.
 */
export async function dispatchSpecializedPortalBot(
  page: Page,
  url: string,
  profile: MasterProfile,
  logger?: { info: (m: string) => void; warn: (m: string) => void }
): Promise<SpecializedBotResult | null> {
  const lower = (url || '').toLowerCase();

  // 1. Internshala
  if (lower.includes('internshala.com')) {
    logger?.info('[Portal Dispatcher] Routing to Specialized InternshalaBot');
    return await InternshalaBot.apply(page, profile, logger);
  }

  // 2. Lever
  if (lower.includes('jobs.lever.co')) {
    logger?.info('[Portal Dispatcher] Routing to Specialized LeverBot');
    return await LeverBot.apply(page, profile);
  }

  // 3. Greenhouse
  if (lower.includes('greenhouse.io')) {
    logger?.info('[Portal Dispatcher] Routing to Specialized GreenhouseBot');
    return await GreenhouseBot.apply(page, profile);
  }

  // 4. Ashby
  if (lower.includes('jobs.ashbyhq.com')) {
    logger?.info('[Portal Dispatcher] Routing to Specialized AshbyBot');
    return await AshbyBot.apply(page, profile);
  }

  return null;
}
