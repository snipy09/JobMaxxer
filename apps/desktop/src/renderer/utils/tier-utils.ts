export type SubscriptionTier = 'free' | 'pro' | 'max';

/**
 * Lossless 3-Tier Normalization Engine (Free, Pro ₹249, Max ₹599)
 * Maps legacy database tier strings and aliases to canonical 3-tier system:
 * - 'free' | 'trial' -> 'free'
 * - 'pro' | 'lite' | 'learner_pro' | 'seeker_pro' | 'learner' | 'seeker' -> 'pro'
 * - 'max' | 'seeker_max' | 'lifetime' | 'enterprise' | 'turbo' -> 'max'
 */
export function normalizeTier(tier?: string | null): SubscriptionTier {
  if (!tier) return 'free';
  const clean = String(tier).toLowerCase().trim();
  if (
    clean === 'max' ||
    clean === 'seeker_max' ||
    clean === 'lifetime' ||
    clean === 'enterprise' ||
    clean === 'turbo'
  ) {
    return 'max';
  }
  if (
    clean === 'pro' ||
    clean === 'lite' ||
    clean === 'learner_pro' ||
    clean === 'seeker_pro' ||
    clean === 'learner' ||
    clean === 'seeker'
  ) {
    return 'pro';
  }
  return 'free';
}

/**
 * Returns numeric hierarchy rank for permissions:
 * 0: Free (₹0 · Preview roadmaps, top 10 jobs, 3 LC companies, 2 textbooks)
 * 1: Pro (₹249/mo · All 52-Wk Roadmaps, 428+ LC companies, 12+ textbooks, Full Job Feed, 50 Auto-Applies/wk, 25 Leads/wk)
 * 2: Max (₹599/mo · 100% Unlimited Autopilot, Unlimited Outreach, Priority Radar)
 */
export function getTierLevel(tier?: string | null): number {
  const norm = normalizeTier(tier);
  switch (norm) {
    case 'pro':
      return 1;
    case 'max':
      return 2;
    default:
      return 0;
  }
}

/**
 * Checks if a user's tier has at least the required tier level
 */
export function hasFeatureAccess(
  userTier: string | null | undefined,
  requiredTier: SubscriptionTier
): boolean {
  return getTierLevel(userTier) >= getTierLevel(requiredTier);
}

export function getTierDisplayName(tier?: string | null): string {
  const norm = normalizeTier(tier);
  switch (norm) {
    case 'pro':
      return 'Pro Plan (₹249/mo)';
    case 'max':
      return 'Max Plan (₹599/mo)';
    default:
      return 'Free Plan';
  }
}

export function getTierBadgeProps(tier?: string | null): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  const norm = normalizeTier(tier);
  switch (norm) {
    case 'max':
      return {
        label: 'MAX',
        bgClass: 'bg-ink-950 dark:bg-white',
        textClass: 'text-white dark:text-ink-950',
        borderClass: 'border-ink-800 dark:border-white',
      };
    case 'pro':
      return {
        label: 'PRO',
        bgClass: 'bg-powder-600',
        textClass: 'text-white',
        borderClass: 'border-powder-500',
      };
    default:
      return {
        label: 'FREE',
        bgClass: 'bg-ink-100 dark:bg-ink-800',
        textClass: 'text-ink-600 dark:text-ink-400',
        borderClass: 'border-ink-200 dark:border-ink-700',
      };
  }
}
