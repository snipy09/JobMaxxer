export type SubscriptionTier = 'free' | 'lite' | 'pro' | 'max';

/**
 * Lossless Tier Normalization Engine
 * Maps legacy database tier strings and aliases to canonical 4-tier system:
 * - 'free' | 'trial' -> 'free'
 * - 'lite' | 'learner_pro' | 'learner' -> 'lite'
 * - 'pro' | 'seeker_pro' | 'seeker' -> 'pro'
 * - 'max' | 'seeker_max' | 'lifetime' | 'enterprise' | 'turbo' -> 'max'
 */
export function normalizeTier(tier?: string | null): SubscriptionTier {
  if (!tier) return 'free';
  const clean = String(tier).toLowerCase().trim();
  if (clean === 'lite' || clean === 'learner_pro' || clean === 'learner') return 'lite';
  if (clean === 'pro' || clean === 'seeker_pro' || clean === 'seeker') return 'pro';
  if (
    clean === 'max' ||
    clean === 'seeker_max' ||
    clean === 'lifetime' ||
    clean === 'enterprise' ||
    clean === 'turbo'
  ) {
    return 'max';
  }
  return 'free';
}

/**
 * Returns numeric hierarchy rank for permissions:
 * 0: Free
 * 1: Lite (Roadmaps, Question Bank, Textbooks)
 * 2: Pro (Lite + Full Feed + 50 Auto-Applies/wk + 25 Leads/wk)
 * 3: Max (Unlimited Autopilot + Unlimited Outreach + Priority)
 */
export function getTierLevel(tier?: string | null): number {
  const norm = normalizeTier(tier);
  switch (norm) {
    case 'lite':
      return 1;
    case 'pro':
      return 2;
    case 'max':
      return 3;
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
    case 'lite':
      return 'Lite Plan';
    case 'pro':
      return 'Pro Plan';
    case 'max':
      return 'Max Plan';
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
    case 'lite':
      return {
        label: 'LITE',
        bgClass: 'bg-emerald-600',
        textClass: 'text-white',
        borderClass: 'border-emerald-500',
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
