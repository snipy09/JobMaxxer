export interface RoadmapMilestone {
  id: string;
  title: string;
  category: 'Fundamentals' | 'Core Frameworks' | 'Databases & APIs' | 'DevOps & Tooling' | 'Strategy & Discovery' | 'Execution & Metrics' | 'Portfolio & Case Studies';
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
    id: 'product-management',
    title: 'Product & Project Management',
    icon: 'Briefcase',
    badge: 'High Demand',
    targetRoles: ['Associate Product Manager', 'Product Manager', 'Project Lead', 'Scrum Master'],
    description: 'Master customer discovery, PRD authoring, sprint planning, and data-driven product delivery.',
    salaryRangeIndia: '₹8 LPA – ₹30 LPA',
    salaryRangeGlobal: '$85k – $160k',
    milestones: [
      {
        id: 'pm-discovery',
        title: 'Customer Discovery & Opportunity Solution Tree',
        category: 'Strategy & Discovery',
        estimatedHours: 25,
        description: 'Conduct user interviews, synthesize qualitative insights, and prioritize user pain points.',
        topics: ['User Interview Frameworks', 'Opportunity Solution Trees', 'Jobs To Be Done (JTBD)', 'Competitive Benchmarking'],
        recommendedResources: [
          { title: 'Continuous Discovery Habits Guide', url: 'https://www.producttalk.org', type: 'doc' },
          { title: 'JTBD Playbook', url: 'https://jtbd.info', type: 'doc' }
        ],
        interviewQuestions: ['How do you validate a feature hypothesis before building?', 'Describe a time you said no to a high-profile feature request.'],
        skillsGained: ['Customer Discovery', 'User Interviews', 'JTBD', 'Opportunity Trees']
      },
      {
        id: 'pm-specs',
        title: 'PRD Authoring & User Story Mapping',
        category: 'Execution & Metrics',
        estimatedHours: 30,
        description: 'Draft comprehensive Product Requirement Documents, acceptance criteria, and edge-case specs.',
        topics: ['PRD Writing Standards', 'User Story Mapping', 'Acceptance Criteria (Gherkin)', 'Edge Case Identification'],
        recommendedResources: [
          { title: 'Linear Method for Product Specs', url: 'https://linear.app/method', type: 'doc' }
        ],
        interviewQuestions: ['Walk me through your standard PRD structure.', 'How do you define non-functional requirements?'],
        skillsGained: ['PRD Authoring', 'Story Mapping', 'Acceptance Criteria', 'Technical Scoping']
      },
      {
        id: 'pm-metrics',
        title: 'Product Analytics & Experimentation (A/B Testing)',
        category: 'Execution & Metrics',
        estimatedHours: 35,
        description: 'Set North Star metrics, configure event funnels, and design statistically valid experiments.',
        topics: ['North Star & Metric Hierarchies', 'Funnel Conversion Analysis', 'A/B Testing & Sample Sizes', 'Cohort Retention'],
        recommendedResources: [
          { title: 'Amplitude Product Analytics Playbook', url: 'https://amplitude.com/playbook', type: 'doc' }
        ],
        interviewQuestions: ['How would you diagnose a 15% drop in checkout conversion?', 'Explain the difference between leading and lagging indicators.'],
        skillsGained: ['Product Analytics', 'A/B Testing', 'Retention Analysis', 'Metrics & KPIs']
      }
    ]
  },
  {
    id: 'frontend',
    title: 'Frontend & UI Engineering',
    icon: 'Layout',
    badge: 'Core Track',
    targetRoles: ['Frontend Engineer', 'React Developer', 'UI Engineer', 'Full Stack Associate'],
    description: 'Build responsive, accessible, and high-performance web applications using React, TypeScript, and Tailwind.',
    salaryRangeIndia: '₹6 LPA – ₹26 LPA',
    salaryRangeGlobal: '$75k – $155k',
    milestones: [
      {
        id: 'html-css-ts',
        title: 'Semantic HTML5, Responsive CSS & TypeScript',
        category: 'Fundamentals',
        estimatedHours: 30,
        description: 'Modern CSS architecture, Flexbox/Grid, and strict TypeScript type systems.',
        topics: ['Semantic markup', 'CSS Grid & Flexbox', 'Tailwind CSS utility tokens', 'TypeScript Interfaces & Generics'],
        recommendedResources: [
          { title: 'MDN Web Docs', url: 'https://developer.mozilla.org', type: 'doc' },
          { title: 'Total TypeScript Essentials', url: 'https://www.totaltypescript.com', type: 'doc' }
        ],
        interviewQuestions: ['Explain the CSS Box Model and box-sizing property.', 'What are TypeScript utility types (Pick, Omit, Partial)?'],
        skillsGained: ['HTML5', 'CSS3', 'Tailwind CSS', 'TypeScript']
      },
      {
        id: 'react-state',
        title: 'React 18 Architecture & State Management',
        category: 'Core Frameworks',
        estimatedHours: 45,
        description: 'Component lifecycles, custom hooks, TanStack Query for server state, and client caches.',
        topics: ['React Hooks', 'TanStack Query / SWR', 'Zustand State Store', 'Performance Profiling & Web Vitals'],
        recommendedResources: [
          { title: 'React Official Documentation', url: 'https://react.dev', type: 'doc' }
        ],
        interviewQuestions: ['When should you use useMemo vs useCallback?', 'How does React reconciler handle batch state updates?'],
        skillsGained: ['React', 'Custom Hooks', 'TanStack Query', 'Zustand']
      }
    ]
  },
  {
    id: 'backend-systems',
    title: 'Backend & Systems Engineering',
    icon: 'Server',
    badge: 'Top Salary',
    targetRoles: ['Backend Developer', 'Node.js Engineer', 'Systems Developer', 'API Specialist'],
    description: 'Design distributed architectures, relational schemas, caching tiers, and asynchronous event queues.',
    salaryRangeIndia: '₹7 LPA – ₹28 LPA',
    salaryRangeGlobal: '$80k – $165k',
    milestones: [
      {
        id: 'node-apis',
        title: 'RESTful & GraphQL API Design',
        category: 'Fundamentals',
        estimatedHours: 35,
        description: 'Build type-safe, resilient APIs with JWT auth, rate limiting, and structured logging.',
        topics: ['Node.js Event Loop', 'RESTful API Standards', 'Authentication & JWT Middleware', 'Error Handling Pipelines'],
        recommendedResources: [
          { title: 'Node.js Architecture Docs', url: 'https://nodejs.org/docs', type: 'doc' }
        ],
        interviewQuestions: ['How does Node.js handle asynchronous non-blocking I/O?', 'Explain idempotent API design.'],
        skillsGained: ['Node.js', 'Express', 'JWT', 'REST APIs']
      },
      {
        id: 'db-caching',
        title: 'PostgreSQL Schema Indexing & Redis Caching',
        category: 'Databases & APIs',
        estimatedHours: 40,
        description: 'Relational data modeling, B-Tree query indexing, and Redis Pub/Sub distributed caching.',
        topics: ['PostgreSQL Indexing Strategies', 'ACID Transactions & Isolation Levels', 'Redis Caching Patterns', 'Connection Pooling'],
        recommendedResources: [
          { title: 'Use The Index, Luke (SQL Indexing)', url: 'https://use-the-index-luke.com', type: 'doc' }
        ],
        interviewQuestions: ['What is the difference between Clustered and Non-Clustered indexes?', 'How do you prevent cache stampede in Redis?'],
        skillsGained: ['PostgreSQL', 'Redis', 'SQL Optimization', 'Database Indexing']
      }
    ]
  },
  {
    id: 'design-ux',
    title: 'Design & User Experience',
    icon: 'Layout',
    badge: 'Creative',
    targetRoles: ['Product Designer', 'UI/UX Designer', 'Interaction Designer'],
    description: 'Create intuitive user journeys, wireframes, high-fidelity prototypes, and scalable design systems.',
    salaryRangeIndia: '₹6 LPA – ₹22 LPA',
    salaryRangeGlobal: '$70k – $140k',
    milestones: [
      {
        id: 'ux-research',
        title: 'User Research & Journey Mapping',
        category: 'Strategy & Discovery',
        estimatedHours: 25,
        description: 'Synthesize qualitative user research, personas, and task flows.',
        topics: ['User Personas', 'Information Architecture', 'Task Flows', 'Usability Auditing'],
        recommendedResources: [
          { title: 'Nielsen Norman Group UX Guides', url: 'https://www.nngroup.com', type: 'doc' }
        ],
        interviewQuestions: ['Walk through a usability test you designed.', 'How do you balance user needs with technical constraints?'],
        skillsGained: ['User Research', 'Information Architecture', 'Journey Mapping']
      },
      {
        id: 'figma-design-systems',
        title: 'Figma Auto-Layout & Design Systems',
        category: 'Core Frameworks',
        estimatedHours: 35,
        description: 'Build tokenized component libraries, interactive prototypes, and developer handoffs in Figma.',
        topics: ['Figma Auto-Layout & Variants', 'Design Tokens & Variables', 'Interactive Component Prototyping', 'Accessibility (WCAG AA)'],
        recommendedResources: [
          { title: 'Figma Best Practices Guide', url: 'https://help.figma.com', type: 'doc' }
        ],
        interviewQuestions: ['How do you structure design tokens for light/dark themes?', 'Describe your handoff process with frontend developers.'],
        skillsGained: ['Figma', 'Design Systems', 'Prototyping', 'Component Tokens']
      }
    ]
  },
  {
    id: 'data-analytics',
    title: 'Data & Business Analytics',
    icon: 'Database',
    badge: 'Analytical',
    targetRoles: ['Business Analyst', 'Data Analyst', 'Analytics Engineer', 'Operations Analyst'],
    description: 'Transform raw data into business intelligence dashboards, statistical models, and executive insights.',
    salaryRangeIndia: '₹6 LPA – ₹22 LPA',
    salaryRangeGlobal: '$70k – $135k',
    milestones: [
      {
        id: 'sql-modeling',
        title: 'Advanced SQL Querying & Relational Analysis',
        category: 'Fundamentals',
        estimatedHours: 30,
        description: 'Complex window functions, CTEs, self-joins, and aggregations for reporting.',
        topics: ['Window Functions (ROW_NUMBER, DENSE_RANK)', 'Common Table Expressions (CTEs)', 'Cohort Retention Queries', 'Data Cleansing'],
        recommendedResources: [
          { title: 'Mode SQL Tutorial', url: 'https://mode.com/sql-tutorial', type: 'doc' }
        ],
        interviewQuestions: ['Write a query to calculate month-over-month revenue growth.', 'Explain the difference between WHERE and HAVING.'],
        skillsGained: ['SQL', 'Window Functions', 'Data Modeling', 'Aggregation']
      },
      {
        id: 'bi-dashboards',
        title: 'BI Dashboards & Executive Storytelling',
        category: 'Execution & Metrics',
        estimatedHours: 35,
        description: 'Design executive KPI dashboards in PowerBI/Tableau and present actionable recommendations.',
        topics: ['KPI Dashboard Design', 'Data Visualization Principles', 'Executive Summary Presentations', 'Stakeholder Communication'],
        recommendedResources: [
          { title: 'Storytelling With Data Guides', url: 'https://www.storytellingwithdata.com', type: 'doc' }
        ],
        interviewQuestions: ['How do you choose between a bar chart, line chart, and scatter plot?', 'How do you handle missing or noisy data points?'],
        skillsGained: ['Business Intelligence', 'Data Visualization', 'Executive Reporting', 'Dashboarding']
      }
    ]
  },
  {
    id: 'growth-marketing',
    title: 'Growth, Marketing & Operations',
    icon: 'TrendingUp',
    badge: 'Commercial',
    targetRoles: ['Growth Associate', 'Marketing Manager', 'Operations Specialist', 'Account Executive'],
    description: 'Execute multi-channel customer acquisition funnels, retention loops, and automated business workflows.',
    salaryRangeIndia: '₹6 LPA – ₹24 LPA',
    salaryRangeGlobal: '$65k – $145k',
    milestones: [
      {
        id: 'growth-funnels',
        title: 'Customer Acquisition & Multi-Channel Funnels',
        category: 'Strategy & Discovery',
        estimatedHours: 25,
        description: 'Build organic and paid acquisition funnels, landing page conversion tests, and CAC/LTV models.',
        topics: ['Acquisition Channels & Attribution', 'Landing Page CRO', 'CAC to LTV Economics', 'Email Drip Sequences'],
        recommendedResources: [
          { title: 'Demand Curve Growth Playbook', url: 'https://www.demandcurve.com', type: 'doc' }
        ],
        interviewQuestions: ['How do you prioritize growth experiments (ICE framework)?', 'What metrics indicate product-market fit?'],
        skillsGained: ['Growth Strategy', 'Funnel Optimization', 'CRO', 'Campaign Analytics']
      },
      {
        id: 'ops-automation',
        title: 'Operations Automation & CRM Pipelines',
        category: 'Execution & Metrics',
        estimatedHours: 30,
        description: 'Automate repetitive workflows, pipeline tracking, and client onboarding sequences.',
        topics: ['CRM Pipeline Management', 'Workflow Automation (Zapier/Make)', 'SLA Tracking', 'Customer Success Playbooks'],
        recommendedResources: [
          { title: 'HubSpot Academy Inbound Guide', url: 'https://academy.hubspot.com', type: 'doc' }
        ],
        interviewQuestions: ['How do you streamline an inefficient onboarding process?', 'Explain how you manage sales pipeline stages.'],
        skillsGained: ['Operations Automation', 'CRM Management', 'Process Optimization', 'Client Onboarding']
      }
    ]
  }
];

export function calculateReadinessScore(roadmapId: string, completedNodeIds: string[]): number {
  const rm = ROADMAPS.find(r => r.id === roadmapId);
  if (!rm || !rm.milestones.length) return 0;
  const validCompleted = completedNodeIds.filter(id => rm.milestones.some(m => m.id === id));
  return Math.min(100, Math.round((validCompleted.length / rm.milestones.length) * 100));
}
