import { describe, expect, it } from 'vitest';
import { ROADMAPS, calculateReadinessScore } from '../data/roadmaps';
import { generateTailoredRoadmapForRole, searchRoleTitles } from '../data/jobRolesDataset';

describe('LearnerView & Roadmaps data integrity', () => {
  it('has valid roadmaps with all required properties', () => {
    expect(ROADMAPS.length).toBeGreaterThan(0);
    for (const r of ROADMAPS) {
      expect(r.id).toBeDefined();
      expect(r.title).toBeDefined();
      expect(Array.isArray(r.milestones)).toBe(true);
      for (const m of r.milestones) {
        expect(m.id).toBeDefined();
        expect(m.title).toBeDefined();
        expect(Array.isArray(m.skillsGained)).toBe(true);
        expect(Array.isArray(m.topics)).toBe(true);
        expect(Array.isArray(m.learn)).toBe(true);
        expect(Array.isArray(m.practice)).toBe(true);
      }
    }
  });

  it('calculates readiness score safely for any role id or empty id', () => {
    expect(calculateReadinessScore('frontend', ['html-css-dom'])).toBeGreaterThan(0);
    expect(calculateReadinessScore('nonexistent', ['abc'])).toBe(0);
    expect(calculateReadinessScore('', [])).toBe(0);
  });

  it('generates tailored roadmap for dynamic titles', () => {
    const roles = searchRoleTitles('Engineer', 5);
    expect(roles.length).toBeGreaterThan(0);
    for (const title of roles) {
      const plan = generateTailoredRoadmapForRole({
        id: 1,
        title,
        domain: 'Engineering',
        seniority: 'Mid',
        industry: 'Tech',
        coreSkills: ['TypeScript'],
        salaryIndia: '10 LPA',
        salaryGlobal: '100k',
        roadmapId: 'fullstack',
        keyTopics: ['Topic 1'],
        interviewQuestions: ['Question 1'],
        matchScore: 90,
      });
      expect(plan.milestones.length).toBe(5);
    }
  });
});
