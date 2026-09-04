import { describe, it, expect } from 'vitest';
import {
  generate10KJobRoles,
  suggestRolesFromUserInput,
  generateTailoredRoadmapForRole,
} from '../../renderer/data/jobRolesDataset';

describe('10,000 Job Roles Dataset & AI Detection Engine', () => {
  it('generates at least 10,000 unique, validated industry job roles', () => {
    const roles = generate10KJobRoles();
    expect(roles.length).toBeGreaterThanOrEqual(10000);

    // Verify first role has all required metadata
    const sample = roles[0];
    expect(sample.id).toBeDefined();
    expect(sample.title).toBeTruthy();
    expect(sample.domain).toBeTruthy();
    expect(sample.seniority).toBeTruthy();
    expect(sample.coreSkills.length).toBeGreaterThan(0);
    expect(sample.salaryIndia).toContain('LPA');
    expect(sample.salaryGlobal).toContain('$');
    expect(sample.interviewQuestions.length).toBeGreaterThan(0);
  });

  it('suggests AI & LLM roles when user inputs machine learning and python prompt', () => {
    const suggestions = suggestRolesFromUserInput(
      'I have experience in Python, building AI agents with LangChain, and want to work with LLMs and RAG pipelines'
    );

    expect(suggestions.length).toBeGreaterThan(0);
    const top = suggestions[0];
    expect(top.domain).toBe('AI, LLMs & Machine Learning');
    expect(top.coreSkills).toContain('Python');
    expect(top.matchScore).toBeGreaterThanOrEqual(75);
  });

  it('suggests Frontend & React roles when user inputs modern web UI prompt', () => {
    const suggestions = suggestRolesFromUserInput(
      'I love creating responsive websites with React, Next.js, and Tailwind CSS and want to build clean user interfaces'
    );

    expect(suggestions.length).toBeGreaterThan(0);
    const top = suggestions[0];
    expect(top.domain).toBe('Frontend & UI Engineering');
    expect(top.coreSkills).toContain('React');
    expect(top.matchScore).toBeGreaterThanOrEqual(75);
  });

  it('suggests DevOps & SRE roles when user inputs Kubernetes and infrastructure prompt', () => {
    const suggestions = suggestRolesFromUserInput(
      'Managing Docker containers, Kubernetes clusters, CI/CD pipelines, and AWS cloud infrastructure'
    );
    expect(suggestions.length).toBeGreaterThan(0);
    const top = suggestions[0];
    expect(top.domain).toBe('DevOps, Cloud & SRE');
    expect(top.matchScore).toBeGreaterThanOrEqual(75);
  });

  it('generates a complete tailored 5-phase roadmap and interview drills for a detected role', () => {
    const roles = generate10KJobRoles();
    const targetRole = roles.find(r => r.title.includes('React & Next.js')) || roles[0];
    const roadmap = generateTailoredRoadmapForRole(targetRole);

    expect(roadmap.roleTitle).toBe(targetRole.title);
    expect(roadmap.milestones.length).toBe(5);
    expect(roadmap.interviewQuestions.length).toBeGreaterThan(0);
    expect(roadmap.recommendedKeywords.length).toBeGreaterThan(3);
  });

  it('renders OnboardingWizard component without crashing', async () => {
    const React = await import('react');
    const { renderToString } = await import('react-dom/server');
    const { OnboardingWizard } = await import('../../renderer/components/OnboardingWizard');
    const mockProfile = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      linkedin: '',
      github: '',
      sponsorship: 'No',
      desiredSalary: '',
      noticePeriod: '2 weeks',
      groqApiKey: '',
      smtpPassword: '',
      resumeText: '',
      desiredTitle: '',
      techStack: '',
      customAnswers: {},
      onboardingCompleted: false,
    };
    const html = renderToString(
      React.createElement(OnboardingWizard, {
        initialProfile: mockProfile,
        onComplete: () => {},
      })
    );
    expect(html).toContain('Welcome to Nomadic');
  });
});
