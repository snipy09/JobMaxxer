import { describe, it, expect } from 'vitest';
import { normalizeTier, getTierLevel, hasFeatureAccess, getTierDisplayName } from '../../renderer/utils/tier-utils';

describe('3-Tier Normalization Engine (Free, Pro ₹249, Max ₹599)', () => {
  it('correctly maps canonical and legacy tiers', () => {
    expect(normalizeTier('free')).toBe('free');
    expect(normalizeTier('trial')).toBe('free');
    expect(normalizeTier(null)).toBe('free');
    expect(normalizeTier(undefined)).toBe('free');

    // Pro (Consolidates Lite, Learner Pro, Seeker Pro)
    expect(normalizeTier('pro')).toBe('pro');
    expect(normalizeTier('lite')).toBe('pro');
    expect(normalizeTier('learner_pro')).toBe('pro');
    expect(normalizeTier('learner')).toBe('pro');
    expect(normalizeTier('seeker_pro')).toBe('pro');
    expect(normalizeTier('seeker')).toBe('pro');

    // Max (Unlimited Autopilot & Outreach)
    expect(normalizeTier('max')).toBe('max');
    expect(normalizeTier('seeker_max')).toBe('max');
    expect(normalizeTier('enterprise')).toBe('max');
    expect(normalizeTier('lifetime')).toBe('max');
    expect(normalizeTier('turbo')).toBe('max');
  });

  it('ranks tier hierarchy correctly', () => {
    expect(getTierLevel('free')).toBe(0);
    expect(getTierLevel('pro')).toBe(1);
    expect(getTierLevel('max')).toBe(2);
  });

  it('evaluates feature access correctly', () => {
    // Free user
    expect(hasFeatureAccess('free', 'pro')).toBe(false);
    expect(hasFeatureAccess('free', 'max')).toBe(false);

    // Pro user (₹249)
    expect(hasFeatureAccess('pro', 'pro')).toBe(true);
    expect(hasFeatureAccess('pro', 'max')).toBe(false);

    // Max user (₹599)
    expect(hasFeatureAccess('max', 'pro')).toBe(true);
    expect(hasFeatureAccess('max', 'max')).toBe(true);
  });

  it('returns clean display names', () => {
    expect(getTierDisplayName('free')).toBe('Free Plan');
    expect(getTierDisplayName('pro')).toBe('Pro Plan (₹249/mo)');
    expect(getTierDisplayName('max')).toBe('Max Plan (₹599/mo)');
  });
});
