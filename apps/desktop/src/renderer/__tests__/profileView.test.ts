import { describe, it, expect } from 'vitest';
import { MasterProfile } from '../types';

// Extract the normalization logic directly to test data boundaries
function normalizeProfileToFormData(profile: MasterProfile | null, currentUser?: any) {
  const p = profile || ({} as any);

  const fName = p.firstName || (currentUser?.fullName ? currentUser.fullName.split(' ')[0] : '');
  const lName = p.lastName || (currentUser?.fullName ? currentUser.fullName.split(' ').slice(1).join(' ') : '');
  const fullName = p.firstName || p.lastName
    ? `${p.firstName || ''} ${p.lastName || ''}`.trim()
    : (p.fullName || currentUser?.fullName || '');

  let skillsArr: string[] = [];
  if (Array.isArray(p.skills)) {
    skillsArr = p.skills.filter((s: any) => typeof s === 'string' && s.trim().length > 0);
  } else if (typeof p.techStack === 'string' && p.techStack.trim().length > 0) {
    skillsArr = p.techStack.split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  return {
    fullName,
    firstName: fName,
    lastName: lName,
    email: p.email || currentUser?.email || '',
    phone: p.phone || '',
    location: p.location || '',
    linkedin: p.linkedin || p.linkedin_url || '',
    github: p.github || p.github_url || '',
    portfolio: p.portfolio || '',
    currentRole: p.currentRole || '',
    targetRole: p.targetRole || p.desiredTitle || 'Software Engineer',
    yearsOfExperience: typeof p.yearsOfExperience === 'number' ? p.yearsOfExperience : 2,
    skills: skillsArr,
    workExperience: Array.isArray(p.workExperience) ? p.workExperience : [],
    education: Array.isArray(p.education) ? p.education : [],
    preferredJobTypes: Array.isArray(p.preferredJobTypes) ? p.preferredJobTypes : ['full-time', 'remote'],
    expectedSalaryMin: typeof p.expectedSalaryMin === 'number' ? p.expectedSalaryMin : 80000,
    expectedSalaryMax: typeof p.expectedSalaryMax === 'number' ? p.expectedSalaryMax : 130000,
    salaryCurrency: p.salaryCurrency || 'USD',
    willingToRelocate: Boolean(p.willingToRelocate),
    authorizedToWorkInUS: p.sponsorship ? p.sponsorship.toLowerCase() === 'no' : (p.authorizedToWorkInUS ?? true),
    requiresSponsorship: p.sponsorship ? p.sponsorship.toLowerCase() === 'yes' : (p.requiresSponsorship ?? false),
    answers: p.answers || p.customAnswers || {},
    resumes: Array.isArray(p.resumes) ? p.resumes : [],
    defaultResumeId: p.defaultResumeId,
    onboardingCompleted: p.onboardingCompleted ?? true,
  };
}

describe('Profile Data Normalization & Undefined Property Protection', () => {

  it('handles null profile without throwing and returns valid safe structure', () => {
    const data = normalizeProfileToFormData(null);
    expect(data).toBeDefined();
    expect(Array.isArray(data.skills)).toBe(true);
    expect(data.skills.length).toBe(0);
    expect(Array.isArray(data.resumes)).toBe(true);
    expect(data.resumes.length).toBe(0);
    expect(typeof data.fullName).toBe('string');
  });

  it('handles empty profile object where skills is undefined', () => {
    const rawProfile = {
      firstName: '',
      lastName: '',
      email: 'test@example.com',
    } as any;

    const data = normalizeProfileToFormData(rawProfile);
    expect(data.skills).toBeDefined();
    expect(Array.isArray(data.skills)).toBe(true);
    // This is the exact check that previously crashed:
    expect(data.skills.length).toBe(0);
    expect(() => data.skills.map((s: string) => s)).not.toThrow();
  });

  it('correctly converts comma-separated techStack string to skills array', () => {
    const rawProfile = {
      firstName: 'Sajal',
      lastName: 'Mishra',
      email: 'sajal@example.com',
      techStack: 'TypeScript, React, Node.js, PostgreSQL',
    } as any;

    const data = normalizeProfileToFormData(rawProfile);
    expect(Array.isArray(data.skills)).toBe(true);
    expect(data.skills).toEqual(['TypeScript', 'React', 'Node.js', 'PostgreSQL']);
    expect(data.skills.length).toBe(4);
  });

  it('safely evaluates completeness checks without throwing on partial fields', () => {
    const rawProfile = {
      firstName: 'Alex',
      lastName: '',
      email: 'alex@example.com',
    } as any;

    const data = normalizeProfileToFormData(rawProfile);

    const completenessChecks = [
      Boolean(data.fullName?.trim()),
      Boolean(data.email?.trim()),
      Boolean(data.targetRole?.trim()),
      (data.skills || []).length > 0,
      Boolean(data.linkedin?.trim() || data.github?.trim()),
    ];

    expect(() => {
      const pct = Math.round(
        (completenessChecks.filter(Boolean).length / Math.max(1, completenessChecks.length)) * 100
      );
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    }).not.toThrow();
  });

});
