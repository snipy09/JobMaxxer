import { describe, it, expect } from 'vitest';
import { normalizeTier, getTierLevel, hasFeatureAccess, getTierDisplayName } from '../../renderer/utils/tier-utils';

describe('4-Tier Normalization Engine (Free, Lite, Pro, Max)', () => {
  it('correctly maps canonical and legacy tiers', () => {
    expect(normalizeTier('free')).toBe('free');
    expect(normalizeTier('trial')).toBe('free');
    expect(normalizeTier(null)).toBe('free');
    expect(normalizeTier(undefined)).toBe('free');

    // Lite
    expect(normalizeTier('lite')).toBe('lite');
    expect(normalizeTier('learner_pro')).toBe('lite');
    expect(normalizeTier('learner')).toBe('lite');

    // Pro
    expect(normalizeTier('pro')).toBe('pro');
    expect(normalizeTier('seeker_pro')).toBe('pro');
    expect(normalizeTier('seeker')).toBe('pro');

    // Max
    expect(normalizeTier('max')).toBe('max');
    expect(normalizeTier('seeker_max')).toBe('max');
    expect(normalizeTier('enterprise')).toBe('max');
    expect(normalizeTier('lifetime')).toBe('max');
    expect(normalizeTier('turbo')).toBe('max');
  });

  it('ranks tier hierarchy correctly', () => {
    expect(getTierLevel('free')).toBe(0);
    expect(getTierLevel('lite')).toBe(1);
    expect(getTierLevel('pro')).toBe(2);
    expect(getTierLevel('max')).toBe(3);
  });

  it('evaluates feature access correctly', () => {
    // Free user
    expect(hasFeatureAccess('free', 'lite')).toBe(false);
    expect(hasFeatureAccess('free', 'pro')).toBe(false);
    expect(hasFeatureAccess('free', 'max')).toBe(false);

    // Lite user
    expect(hasFeatureAccess('lite', 'lite')).toBe(true);
    expect(hasFeatureAccess('lite', 'pro')).toBe(false);
    expect(hasFeatureAccess('lite', 'max')).toBe(false);

    // Pro user
    expect(hasFeatureAccess('pro', 'lite')).toBe(true);
    expect(hasFeatureAccess('pro', 'pro')).toBe(true);
    expect(hasFeatureAccess('pro', 'max')).toBe(false);

    // Max user
    expect(hasFeatureAccess('max', 'lite')).toBe(true);
    expect(hasFeatureAccess('max', 'pro')).toBe(true);
    expect(hasFeatureAccess('max', 'max')).toBe(true);
  });

  it('returns clean display names', () => {
    expect(getTierDisplayName('free')).toBe('Free Plan');
    expect(getTierDisplayName('lite')).toBe('Lite Plan');
    expect(getTierDisplayName('pro')).toBe('Pro Plan');
    expect(getTierDisplayName('max')).toBe('Max Plan');
  });
});
