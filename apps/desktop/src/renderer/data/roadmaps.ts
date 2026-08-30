export interface RoadmapMilestone {
  id: string;
  title: string;
  category: 'Fundamentals' | 'Core Frameworks' | 'Databases & APIs' | 'DevOps & Tooling' | 'Portfolio Project';
  estimatedHours: number;
  description: string;
  topics: string[];
  recommendedResources: Array<{ title: string; url: string; type: 'doc' | 'video' | 'repo' | 'practice' }>;
  interviewQuestions: string[];
  skillsGained: string[];
}

export interface Roadmap {
  id: string;
  title: string;
  icon: string;
  badge: string;
  targetRoles: string[];
  description: string;
  salaryRangeIndia: string;
  salaryRangeGlobal: string;
  milestones: RoadmapMilestone[];
}

export const ROADMAPS: Roadmap[] = [
  {
    id: 'frontend',
    title: 'Frontend Engineer',
    icon: 'Layout',
    badge: 'High Demand',
    targetRoles: ['Frontend Developer', 'React Developer', 'UI Engineer'],
    description: 'Master modern web applications using React, TypeScript, Tailwind, and Next.js.',
    salaryRangeIndia: '₹6 LPA – ₹24 LPA',
    salaryRangeGlobal: '$70k – $150k',
    milestones: [
      {
        id: 'html-css',
        title: 'Modern HTML5 & Semantic CSS / Tailwind',
        category: 'Fundamentals',
        estimatedHours: 20,
        description: 'Responsive design, Flexbox/Grid, CSS Variables, and Accessibility.',
        topics: ['Semantic markup', 'Flexbox & CSS Grid', 'Tailwind CSS utility-first workflow', 'WCAG Accessibility'],
        recommendedResources: [
          { title: 'MDN Web Docs - HTML & CSS', url: 'https://developer.mozilla.org', type: 'doc' },
          { title: 'Tailwind CSS Official Guide', url: 'https://tailwindcss.com/docs', type: 'doc' },
        ],
        interviewQuestions: ['Explain the CSS Box Model and box-sizing property.', 'What is the difference between Flexbox and CSS Grid?'],
        skillsGained: ['HTML5', 'CSS3', 'Tailwind CSS', 'Responsive UI'],
      },
      {
        id: 'javascript-es6',
        title: 'Deep JavaScript & ES6+ Fundamentals',
        category: 'Fundamentals',
        estimatedHours: 40,
        description: 'Closures, Event Loop, Promises/Async-Await, Prototypes, and DOM manipulation.',
        topics: ['Scope & Hoisting', 'Event Loop & Concurrency', 'Promises & Fetch API'],
        recommendedResources: [{ title: 'JavaScript.info Complete Guide', url: 'https://javascript.info', type: 'doc' }],
        interviewQuestions: ['How does the JavaScript Event Loop handle microtasks?'],
        skillsGained: ['JavaScript', 'ES6+', 'Async/Await', 'DOM APIs'],
      },
      {
        id: 'react-ts',
        title: 'React 18 & TypeScript Modern Architecture',
        category: 'Core Frameworks',
        estimatedHours: 50,
        description: 'Hooks, State Management (Zustand/Redux), Custom Hooks, and TypeScript type safety.',
        topics: ['useState, useEffect', 'TypeScript Generics', 'Zustand & TanStack Query'],
        recommendedResources: [{ title: 'React Official Docs', url: 'https://react.dev', type: 'doc' }],
        interviewQuestions: ['When would you use useMemo vs useCallback?'],
        skillsGained: ['React', 'TypeScript', 'State Management'],
      }
    ],
  },
  {
    id: 'backend',
    title: 'Backend & Distributed Systems Engineer',
    icon: 'Server',
    badge: 'Top Salary',
    targetRoles: ['Backend Developer', 'Node.js Engineer', 'API Developer'],
    description: 'Design high-throughput APIs, databases, caches, and microservices.',
    salaryRangeIndia: '₹7 LPA – ₹28 LPA',
    salaryRangeGlobal: '$80k – $165k',
    milestones: [
      {
        id: 'node-apis',
        title: 'Node.js & Express Architecture',
        category: 'Fundamentals',
        estimatedHours: 30,
        description: 'Build robust REST APIs, auth middleware, and error handlers.',
        topics: ['Node.js Runtime', 'Express Middleware', 'JWT Auth'],
        recommendedResources: [{ title: 'Node.js Docs', url: 'https://nodejs.org/docs', type: 'doc' }],
        interviewQuestions: ['How does Node.js handle concurrency?'],
        skillsGained: ['Node.js', 'Express', 'JWT', 'REST APIs'],
      }
    ],
  }
];

export function calculateReadinessScore(roadmapId: string, completedNodeIds: string[]): number {
  const rm = ROADMAPS.find(r => r.id === roadmapId);
  if (!rm || !rm.milestones.length) return 0;
  const validCompleted = completedNodeIds.filter(id => rm.milestones.some(m => m.id === id));
  return Math.min(100, Math.round((validCompleted.length / rm.milestones.length) * 100));
}