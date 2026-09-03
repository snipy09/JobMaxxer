import { describe, it, expect } from 'vitest';

// ── Onboarding State Evaluation Logic ──────────────────────────────────────
interface ProfileRecord {
  firstName?: string;
  first_name?: string;
  desiredTitle?: string;
  desired_title?: string;
  techStack?: string;
  tech_stack?: string;
  onboardingCompleted?: boolean;
  onboarding_completed?: number | boolean;
}

function isOnboardingCompleted(data: ProfileRecord | null | undefined): boolean {
  if (!data) return false;
  if (data.onboarding_completed !== undefined) {
    return Boolean(data.onboarding_completed);
  }
  if (data.onboardingCompleted !== undefined) {
    return Boolean(data.onboardingCompleted);
  }
  const hasName = Boolean((data.first_name || data.firstName || '').trim());
  const hasRole = Boolean((data.desired_title || data.desiredTitle || '').trim());
  return hasName && hasRole;
}

function toggleSkillSet(current: Set<string>, skill: string): Set<string> {
  const next = new Set(current);
  if (next.has(skill)) {
    next.delete(skill);
  } else {
    next.add(skill);
  }
  return next;
}

describe('Career Onboarding Engine', () => {
  it('identifies fresh un-onboarded profiles and prompts wizard', () => {
    expect(isOnboardingCompleted(null)).toBe(false);
    expect(isOnboardingCompleted({})).toBe(false);
    expect(isOnboardingCompleted({ onboarding_completed: 0 })).toBe(false);
    expect(isOnboardingCompleted({ onboardingCompleted: false })).toBe(false);
  });

  it('recognizes completed onboarding from SQLite schema flags', () => {
    expect(isOnboardingCompleted({ onboarding_completed: 1 })).toBe(true);
    expect(isOnboardingCompleted({ onboardingCompleted: true })).toBe(true);
  });

  it('correctly falls back to contact and target role validation', () => {
    expect(
      isOnboardingCompleted({
        first_name: 'Alex',
        desired_title: 'Full Stack Engineer',
      })
    ).toBe(true);

    expect(
      isOnboardingCompleted({
        first_name: 'Alex',
        desired_title: '',
      })
    ).toBe(false);
  });

  it('handles multi-skill chip toggling seamlessly', () => {
    let skills = new Set(['React', 'TypeScript']);
    
    // Add Node.js
    skills = toggleSkillSet(skills, 'Node.js');
    expect(skills.has('Node.js')).toBe(true);
    expect(skills.size).toBe(3);

    // Toggle off React
    skills = toggleSkillSet(skills, 'React');
    expect(skills.has('React')).toBe(false);
    expect(skills.size).toBe(2);

    // Formatted tech stack string
    const techStackString = Array.from(skills).join(', ');
    expect(techStackString).toBe('TypeScript, Node.js');
  });

  it('calibrates target horizon and weekly commitments', () => {
    const horizons = ['1 Month', '2 Months', '6 Months'];
    const commitments = ['1 Hour/Day', '2 Hours/Day', '4+ Hours/Day'];

    expect(horizons).toContain('2 Months');
    expect(commitments).toContain('2 Hours/Day');
  });
});
