export interface LearnResource {
  title: string;
  url: string;
  type?: 'video' | 'doc' | 'book' | 'cheatsheet' | 'guide' | string;
  duration?: string;
  provider?: string;
}

export interface SubModule {
  id: string;
  title: string;
  description: string;
  keyConcepts: string[];
  resources: LearnResource[];
}

export interface RoadmapMilestone {
  id: string;
  title: string;
  level?: string;
  category?: string;
  difficulty?: string;
  estimatedHours: number;
  description: string;
  topics: string[];
  skills: string[];
  skillsGained: string[];
  learn: LearnResource[];
  subModules: SubModule[];
}

export interface Roadmap {
  id: string;
  title: string;
  icon?: string;
  badge?: string;
  domain?: string;
  targetRoles: string[];
  description: string;
  salaryRangeIndia?: string;
  salaryRangeGlobal?: string;
  targetHorizon?: string;
  dailyCommitment?: string;
  milestones: RoadmapMilestone[];
}

export const ROADMAPS: Roadmap[] = [
  {
    id: 'product-management',
    title: 'Product Management & Growth Strategy',
    icon: 'Compass',
    badge: 'Executive Track',
    domain: 'Product & Business',
    targetRoles: ['Product Manager', 'Associate Product Manager', 'Technical Product Manager', 'Product Operations'],
    description: 'Master user discovery, PRD authoring, product analytics, agile execution, and cross-functional leadership.',
    salaryRangeIndia: '₹12 LPA – ₹32 LPA',
    salaryRangeGlobal: '$95k – $180k',
    milestones: [
      {
        id: 'pm-foundations',
        title: 'Phase 1: User Discovery, Market Research & Problem Framing',
        level: 'Foundations',
        category: 'Fundamentals',
        difficulty: 'Beginner',
        estimatedHours: 20,
        description: 'Identify high-impact customer problems, conduct structured user interviews, and define target user personas.',
        topics: ['The Mom Test', 'User Personas', 'TAM/SAM/SOM Market Sizing', 'Competitor Moats'],
        skills: ['User Interviews', 'Market Research', 'Problem Framing', 'Persona Definition'],
        skillsGained: ['User Interviews', 'Market Research', 'Problem Framing', 'Persona Definition'],
        learn: [
          { title: 'The Mom Test: How to Talk to Customers (Summary Guide)', url: 'https://www.youtube.com/results?search_query=the+mom+test+summary', type: 'video', duration: '20 mins' },
          { title: 'User Research & Personas Handbook', url: 'https://library.gv.com/how-to-conduct-user-interviews-9b48b77054a8', type: 'doc' }
        ],
        subModules: [
          {
            id: 'pm-1-1',
            title: 'Customer Discovery & Qualitative Research',
            description: 'Techniques for conducting unbiased customer interviews using The Mom Test principles.',
            keyConcepts: ['The Mom Test framework', 'Customer empathy mapping', 'Identifying unaddressed pain points'],
            resources: [
              { title: 'The Mom Test: How to Talk to Customers (Summary Guide)', url: 'https://www.youtube.com/results?search_query=the+mom+test+summary', type: 'video', duration: '20 mins' },
              { title: 'User Research & Personas Handbook', url: 'https://library.gv.com/how-to-conduct-user-interviews-9b48b77054a8', type: 'doc' }
            ]
          },
          {
            id: 'pm-1-2',
            title: 'Market Sizing & Competitor Moats',
            description: 'Quantifying market opportunity and mapping competitor positioning.',
            keyConcepts: ['TAM/SAM/SOM Estimation', 'Value proposition canvas', 'Feature parity analysis'],
            resources: [
              { title: 'Sizing Markets: TAM, SAM, and SOM Guide', url: 'https://www.youtube.com/results?search_query=TAM+SAM+SOM+product+management', type: 'video', duration: '25 mins' }
            ]
          }
        ]
      },
      {
        id: 'pm-execution',
        title: 'Phase 2: PRD Authoring, Wireframing & Agile Roadmap Planning',
        level: 'Core Practice',
        category: 'Execution',
        difficulty: 'Intermediate',
        estimatedHours: 30,
        description: 'Write crystal-clear Product Requirement Documents (PRDs), prioritize features with RICE/MoSCoW, and lead sprints.',
        topics: ['PRD Structuring', 'RICE Scoring', 'Acceptance Criteria', 'Backlog Refinement'],
        skills: ['PRD Writing', 'RICE Prioritization', 'Figma Wireframing', 'Jira Sprint Planning'],
        skillsGained: ['PRD Writing', 'RICE Prioritization', 'Figma Wireframing', 'Jira Sprint Planning'],
        learn: [
          { title: 'Lenny’s Newsletter: How to Write a High-Standard PRD', url: 'https://google.com/search?q=lenny+rachitsky+how+to+write+a+prd', type: 'doc' },
          { title: 'PRD Masterclass & Walkthrough', url: 'https://www.youtube.com/results?search_query=how+to+write+a+product+requirements+document', type: 'video', duration: '30 mins' }
        ],
        subModules: [
          {
            id: 'pm-2-1',
            title: 'Writing Impactful PRDs & User Stories',
            description: 'Structuring PRDs with problem statements, user journeys, edge cases, and non-functional requirements.',
            keyConcepts: ['Problem definition vs solution bias', 'Acceptance criteria formulation', 'Non-functional constraints'],
            resources: [
              { title: 'Lenny’s Newsletter: How to Write a High-Standard PRD', url: 'https://google.com/search?q=lenny+rachitsky+how+to+write+a+prd', type: 'doc' },
              { title: 'PRD Masterclass & Walkthrough', url: 'https://www.youtube.com/results?search_query=how+to+write+a+product+requirements+document', type: 'video', duration: '30 mins' }
            ]
          }
        ]
      },
      {
        id: 'pm-metrics',
        title: 'Phase 3: Product Analytics, North Star Metric & Experimentation',
        level: 'Advanced',
        category: 'Metrics',
        difficulty: 'Advanced',
        estimatedHours: 25,
        description: 'Design A/B test hypotheses, track retention funnels (PostHog/Mixpanel), and define North Star Metrics.',
        topics: ['A/B Testing', 'Cohort Analysis', 'Drop-off Funnels', 'North Star Metrics'],
        skills: ['A/B Testing', 'Funnel Analytics', 'North Star Metrics', 'Cohort Retention'],
        skillsGained: ['A/B Testing', 'Funnel Analytics', 'North Star Metrics', 'Cohort Retention'],
        learn: [
          { title: 'PostHog Product Analytics & Funnel Guide', url: 'https://posthog.com/docs', type: 'doc' },
          { title: 'Designing North Star Metrics (Reforge Methodology)', url: 'https://www.youtube.com/results?search_query=north+star+metric+product+management', type: 'video', duration: '28 mins' }
        ],
        subModules: [
          {
            id: 'pm-3-1',
            title: 'Funnels, Cohort Retention & North Star Metric',
            description: 'Tracking activation, engagement, and retention curves with telemetry tools.',
            keyConcepts: ['North Star Metric vs input metrics', 'Cohort retention analysis', 'Drop-off funnel diagnosis'],
            resources: [
              { title: 'PostHog Product Analytics & Funnel Guide', url: 'https://posthog.com/docs', type: 'doc' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'ui-ux-design',
    title: 'UI/UX & Product Design',
    icon: 'Layout',
    badge: 'Creative Track',
    domain: 'Design & Experience',
    targetRoles: ['Product Designer', 'UI/UX Designer', 'UX Researcher', 'Interaction Designer'],
    description: 'Design delightful, accessible, design-system-driven interfaces and user experiences in Figma.',
    salaryRangeIndia: '₹8 LPA – ₹24 LPA',
    salaryRangeGlobal: '$85k – $160k',
    milestones: [
      {
        id: 'ui-foundations',
        title: 'Phase 1: Design Principles, Visual Hierarchy & Typography',
        level: 'Foundations',
        category: 'Fundamentals',
        difficulty: 'Beginner',
        estimatedHours: 20,
        description: 'Master grid systems, optical balance, typography scales, color contrast, and mental models.',
        topics: ['Visual Hierarchy', '8pt Grid Systems', 'WCAG Contrast', 'Typography Scales'],
        skills: ['Visual Hierarchy', 'Typography Scales', 'Color Theory', 'Grid Systems'],
        skillsGained: ['Visual Hierarchy', 'Typography Scales', 'Color Theory', 'Grid Systems'],
        learn: [
          { title: 'Refactoring UI: Practical Design Principles', url: 'https://www.youtube.com/results?search_query=refactoring+ui+principles', type: 'video', duration: '30 mins' },
          { title: 'Material Design & Human Interface Guidelines', url: 'https://m3.material.io', type: 'doc' }
        ],
        subModules: [
          {
            id: 'ui-1-1',
            title: 'Visual Hierarchy, Whitespace & Contrast',
            description: 'Designing scannable screens that direct user attention seamlessly.',
            keyConcepts: ['F-pattern & Z-pattern reading', '8pt grid systems', 'WCAG color contrast ratios'],
            resources: [
              { title: 'Refactoring UI: Practical Design Principles', url: 'https://www.youtube.com/results?search_query=refactoring+ui+principles', type: 'video', duration: '30 mins' }
            ]
          }
        ]
      },
      {
        id: 'ui-figma',
        title: 'Phase 2: Advanced Figma, Auto Layout & Design Systems',
        level: 'Core Practice',
        category: 'Design Systems',
        difficulty: 'Intermediate',
        estimatedHours: 30,
        description: 'Build production design systems with nested components, variables, auto-layout, and interactive prototypes.',
        topics: ['Auto Layout', 'Design Tokens', 'Component Variants', 'Interactive Prototypes'],
        skills: ['Figma Auto Layout', 'Component Variables', 'Design Tokens', 'Prototyping'],
        skillsGained: ['Figma Auto Layout', 'Component Variables', 'Design Tokens', 'Prototyping'],
        learn: [
          { title: 'Figma Auto Layout In-Depth Tutorial', url: 'https://www.youtube.com/results?search_query=figma+auto+layout+masterclass', type: 'video', duration: '40 mins' }
        ],
        subModules: [
          {
            id: 'ui-2-1',
            title: 'Figma Auto Layout & Responsive Components',
            description: 'Creating adaptable component libraries that flex across mobile, tablet, and desktop.',
            keyConcepts: ['Auto layout wrapping', 'Slot components', 'Component properties (variants & booleans)'],
            resources: [
              { title: 'Figma Auto Layout In-Depth Tutorial', url: 'https://www.youtube.com/results?search_query=figma+auto+layout+masterclass', type: 'video', duration: '40 mins' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'frontend',
    title: 'Frontend & UI Engineering',
    icon: 'Layout',
    badge: 'High Demand',
    domain: 'Software Engineering',
    targetRoles: ['Frontend Engineer', 'React Developer', 'UI Engineer', 'Full Stack Associate'],
    description: 'Build responsive, accessible, high-performance web applications using React, TypeScript, Tailwind, and Next.js.',
    salaryRangeIndia: '₹6 LPA – ₹26 LPA',
    salaryRangeGlobal: '$75k – $155k',
    milestones: [
      {
        id: 'html-css-dom',
        title: 'Semantic HTML5, Modern CSS & DOM Architecture',
        level: 'Foundations',
        category: 'Fundamentals',
        difficulty: 'Beginner',
        estimatedHours: 20,
        description: 'Master semantic layout, CSS Flexbox/Grid, responsive breakpoints, accessibility (WCAG), and browser rendering trees.',
        topics: ['Semantic markup & SEO tags', 'CSS Grid & Flexbox layouts', 'Tailwind CSS utility tokens', 'WCAG 2.1 AA Accessibility', 'DOM Tree & Event Bubbling'],
        skills: ['HTML5', 'CSS3', 'Tailwind CSS', 'Accessibility', 'DOM APIs'],
        skillsGained: ['HTML5', 'CSS3', 'Tailwind CSS', 'Accessibility', 'DOM APIs'],
        learn: [
          { title: 'MDN Web Docs: Modern HTML & Semantic Tags', url: 'https://developer.mozilla.org/en-US/docs/Learn/HTML', type: 'doc', provider: 'Mozilla' },
          { title: 'CSS Grid & Flexbox Complete Masterclass', url: 'https://www.youtube.com/watch?v=rg7Fvvl3taU', type: 'video', duration: '2.5 hrs', provider: 'YouTube / FreeCodeCamp' }
        ],
        subModules: [
          {
            id: 'sub-fe-1',
            title: 'DOM Architecture & Flexbox Layouts',
            description: 'Building flexible and responsive component structures.',
            keyConcepts: ['Flexbox alignment', 'CSS Grid templates', 'Semantic element roles'],
            resources: [
              { title: 'MDN Web Docs: Modern HTML & Semantic Tags', url: 'https://developer.mozilla.org/en-US/docs/Learn/HTML', type: 'doc' }
            ]
          }
        ]
      },
      {
        id: 'javascript-es6',
        title: 'Modern JavaScript (ES6+), Async/Await & Event Loop',
        level: 'Core Practice',
        category: 'Fundamentals',
        difficulty: 'Intermediate',
        estimatedHours: 35,
        description: 'Deep dive into asynchronous JavaScript, Promises, Closures, Prototypes, Array methods, and memory management.',
        topics: ['Event Loop & Microtask Queue', 'Promises, async/await & Error handling', 'Closures & Lexical Scope', 'Higher Order Functions (map, filter, reduce)', 'Fetch API & AbortController'],
        skills: ['JavaScript', 'ES6+', 'Async/Await', 'Event Loop', 'REST Client'],
        skillsGained: ['JavaScript', 'ES6+', 'Async/Await', 'Event Loop', 'REST Client'],
        learn: [
          { title: 'JavaScript.info: The Modern JavaScript Tutorial', url: 'https://javascript.info', type: 'doc', provider: 'JavaScript.info' },
          { title: 'What the heck is the event loop anyway? (Philip Roberts)', url: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ', type: 'video', duration: '30 mins', provider: 'JSConf / YouTube' }
        ],
        subModules: [
          {
            id: 'sub-fe-2',
            title: 'Asynchronous Event Loop Execution',
            description: 'Understanding microtask queues, non-blocking asynchronous I/O, and promise chains.',
            keyConcepts: ['Microtask vs macrotask execution', 'Async/await error boundaries', 'AbortController cancellation'],
            resources: [
              { title: 'What the heck is the event loop anyway?', url: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ', type: 'video' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'backend',
    title: 'Backend & Systems Engineering',
    icon: 'Database',
    badge: 'Core Infrastructure',
    domain: 'Software Engineering',
    targetRoles: ['Backend Engineer', 'Node.js Developer', 'Go Systems Engineer', 'API Architect'],
    description: 'Design distributed architectures, REST & GraphQL APIs, relational database schema models, and caching layers.',
    salaryRangeIndia: '₹10 LPA – ₹30 LPA',
    salaryRangeGlobal: '$95k – $175k',
    milestones: [
      {
        id: 'backend-apis',
        title: 'RESTful Architecture, Middleware & Request Routing',
        level: 'Foundations',
        category: 'Databases & APIs',
        difficulty: 'Beginner',
        estimatedHours: 25,
        description: 'Construct idempotent HTTP endpoints, JWT authentication middleware, and input validation schemas.',
        topics: ['HTTP Verbs & Status Codes', 'Express/FastAPI middleware', 'JWT token lifecycles', 'Zod request validation'],
        skills: ['Node.js', 'REST APIs', 'JWT Auth', 'Request Validation'],
        skillsGained: ['Node.js', 'REST APIs', 'JWT Auth', 'Request Validation'],
        learn: [
          { title: 'RESTful API Design Best Practices (Google Cloud)', url: 'https://cloud.google.com/apis/design', type: 'doc' }
        ],
        subModules: [
          {
            id: 'sub-be-1',
            title: 'API Routing & Security Middleware',
            description: 'Constructing secure, type-safe API gateways and service layers.',
            keyConcepts: ['Idempotency keys', 'Rate limiting', 'Token authentication'],
            resources: [
              { title: 'RESTful API Design Best Practices', url: 'https://cloud.google.com/apis/design', type: 'doc' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'fullstack',
    title: 'Full Stack Web Architecture',
    icon: 'Layers',
    badge: 'Full Lifecycle',
    domain: 'Software Engineering',
    targetRoles: ['Full Stack Engineer', 'Software Engineer', 'Full Stack Lead'],
    description: 'End-to-end web engineering from component trees to database queries and cloud infrastructure.',
    salaryRangeIndia: '₹10 LPA – ₹28 LPA',
    salaryRangeGlobal: '$95k – $170k',
    milestones: [
      {
        id: 'fullstack-core',
        title: 'End-to-End Type Safety & Data Synchronization',
        level: 'Core Practice',
        category: 'Core Frameworks',
        difficulty: 'Intermediate',
        estimatedHours: 30,
        description: 'Connect React clients with PostgreSQL backends via type-safe ORMs and caching layers.',
        topics: ['End-to-End TypeScript', 'Prisma/Drizzle ORM', 'Server Actions', 'Optimistic UI Updates'],
        skills: ['TypeScript', 'Prisma', 'React', 'PostgreSQL'],
        skillsGained: ['TypeScript', 'Prisma', 'React', 'PostgreSQL'],
        learn: [
          { title: 'Full Stack Architecture Masterclass', url: 'https://www.youtube.com/results?search_query=full+stack+web+architecture', type: 'video' }
        ],
        subModules: [
          {
            id: 'sub-fs-1',
            title: 'Type-Safe API Contracts',
            description: 'Sharing interfaces and models seamlessly between frontend and backend.',
            keyConcepts: ['Shared type packages', 'Schema validation with Zod', 'Database migrations'],
            resources: [
              { title: 'Full Stack Architecture Masterclass', url: 'https://www.youtube.com/results?search_query=full+stack+web+architecture', type: 'video' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'ai',
    title: 'AI Engineering & Applied Machine Learning',
    icon: 'Cpu',
    badge: 'Modern Frontier',
    domain: 'AI & Data Systems',
    targetRoles: ['AI Engineer', 'LLM Application Developer', 'Machine Learning Engineer'],
    description: 'Build intelligent applications with LLMs, prompt engineering, RAG pipelines, vector embeddings, and fine-tuning.',
    salaryRangeIndia: '₹14 LPA – ₹38 LPA',
    salaryRangeGlobal: '$120k – $210k',
    milestones: [
      {
        id: 'ai-rag',
        title: 'Vector Embeddings, RAG Architecture & Context Retrieval',
        level: 'Core Practice',
        category: 'Core Frameworks',
        difficulty: 'Intermediate',
        estimatedHours: 30,
        description: 'Design Retrieval-Augmented Generation systems with vector databases (Pinecone/pgvector) and hybrid search.',
        topics: ['Vector Similarity Search', 'Embedding Models', 'Chunking Strategies', 'Hybrid Keyword/Vector Retrieval'],
        skills: ['Python', 'RAG Pipelines', 'Vector Databases', 'Prompt Engineering'],
        skillsGained: ['Python', 'RAG Pipelines', 'Vector Databases', 'Prompt Engineering'],
        learn: [
          { title: 'RAG Architecture & Vector Embeddings Deep Dive', url: 'https://www.youtube.com/results?search_query=rag+architecture+vector+database', type: 'video' }
        ],
        subModules: [
          {
            id: 'sub-ai-1',
            title: 'Vector Embeddings & Semantic Search',
            description: 'Transforming text into vector spaces for sub-millisecond retrieval.',
            keyConcepts: ['Cosine similarity', 'Chunk size tradeoffs', 'Context window optimization'],
            resources: [
              { title: 'RAG Architecture & Vector Embeddings Deep Dive', url: 'https://www.youtube.com/results?search_query=rag+architecture+vector+database', type: 'video' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'devops',
    title: 'DevOps & Cloud Platform Engineering',
    icon: 'Terminal',
    badge: 'Infrastructure',
    domain: 'Cloud Infrastructure',
    targetRoles: ['DevOps Engineer', 'Cloud Architect', 'Site Reliability Engineer (SRE)', 'Platform Engineer'],
    description: 'Automate CI/CD pipelines, containerize microservices, orchestrate Kubernetes clusters, and scale cloud infra.',
    salaryRangeIndia: '₹10 LPA – ₹32 LPA',
    salaryRangeGlobal: '$100k – $185k',
    milestones: [
      {
        id: 'devops-cicd',
        title: 'Docker Containerization & GitHub Actions Pipelines',
        level: 'Foundations',
        category: 'DevOps & Tooling',
        difficulty: 'Beginner',
        estimatedHours: 25,
        description: 'Create multi-stage Dockerfiles, build matrix test pipelines, and automate zero-downtime deployment workflows.',
        topics: ['Multi-Stage Docker Builds', 'GitHub Actions Workflows', 'Secrets Management', 'Zero-Downtime Deployments'],
        skills: ['Docker', 'GitHub Actions', 'CI/CD', 'Linux'],
        skillsGained: ['Docker', 'GitHub Actions', 'CI/CD', 'Linux'],
        learn: [
          { title: 'Docker & Kubernetes Mastery (Bret Fisher)', url: 'https://www.youtube.com/results?search_query=docker+and+kubernetes+mastery', type: 'video' }
        ],
        subModules: [
          {
            id: 'sub-do-1',
            title: 'Containerization & Image Optimization',
            description: 'Building slim, production-grade container images with security best practices.',
            keyConcepts: ['Layer caching', 'Non-root execution', 'Multi-stage builds'],
            resources: [
              { title: 'Docker & Kubernetes Mastery', url: 'https://www.youtube.com/results?search_query=docker+and+kubernetes+mastery', type: 'video' }
            ]
          }
        ]
      }
    ]
  }
];

export function calculateReadinessScore(roadmapId: string, completedNodes: string[]): number {
  const roadmap = ROADMAPS.find(r => r.id === roadmapId);
  if (!roadmap || !roadmap.milestones || roadmap.milestones.length === 0) return 0;
  const matchCount = completedNodes.filter(id => roadmap.milestones.some(m => m.id === id)).length;
  return Math.round((matchCount / roadmap.milestones.length) * 100);
}
