export interface LearnResource {
  title: string;
  url: string;
  type: 'video' | 'doc' | 'book' | 'cheatsheet';
  duration?: string;
  provider?: string;
}

export interface PracticeExercise {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  type: 'code' | 'quiz' | 'architecture';
  prompt: string;
  starterCode?: string;
  solutionCode?: string;
  quizOptions?: string[];
  correctOptionIndex?: number;
  explanation?: string;
  testCases?: Array<{ input: string; expectedOutput: string }>;
}

export interface ProjectChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  techStack: string[];
  deliverables: string[];
  steps: string[];
  starterRepoUrl?: string;
}

export interface RoadmapMilestone {
  id: string;
  title: string;
  category: 'Fundamentals' | 'Core Frameworks' | 'Databases & APIs' | 'DevOps & Tooling' | 'Strategy & Discovery' | 'Execution & Metrics' | 'Portfolio Project';
  estimatedHours: number;
  description: string;
  topics: string[];
  skillsGained: string[];
  learn: LearnResource[];
  practice: PracticeExercise[];
  apply: ProjectChallenge;
  interviewQuestions: string[];
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
    title: 'Frontend & UI Engineering',
    icon: 'Layout',
    badge: 'High Demand',
    targetRoles: ['Frontend Engineer', 'React Developer', 'UI Engineer', 'Full Stack Associate'],
    description: 'Build responsive, accessible, high-performance web applications using React, TypeScript, Tailwind, and Next.js.',
    salaryRangeIndia: '₹6 LPA – ₹26 LPA',
    salaryRangeGlobal: '$75k – $155k',
    milestones: [
      {
        id: 'html-css-dom',
        title: 'Semantic HTML5, Modern CSS & DOM Architecture',
        category: 'Fundamentals',
        estimatedHours: 20,
        description: 'Master semantic layout, CSS Flexbox/Grid, responsive breakpoints, accessibility (WCAG), and browser rendering trees.',
        topics: ['Semantic markup & SEO tags', 'CSS Grid & Flexbox layouts', 'Tailwind CSS utility tokens', 'WCAG 2.1 AA Accessibility', 'DOM Tree & Event Bubbling'],
        skillsGained: ['HTML5', 'CSS3', 'Tailwind CSS', 'Accessibility', 'DOM APIs'],
        learn: [
          { title: 'MDN Web Docs: Modern HTML & Semantic Tags', url: 'https://developer.mozilla.org/en-US/docs/Learn/HTML', type: 'doc', provider: 'Mozilla' },
          { title: 'CSS Grid & Flexbox Complete Masterclass', url: 'https://www.youtube.com/watch?v=rg7Fvvl3taU', type: 'video', duration: '2.5 hrs', provider: 'YouTube / FreeCodeCamp' },
          { title: 'Tailwind CSS Utility-First Handbook', url: 'https://tailwindcss.com/docs', type: 'cheatsheet', provider: 'Tailwind Labs' },
          { title: 'Web.dev Accessibility Audit Principles', url: 'https://web.dev/accessibility', type: 'doc', provider: 'Google' }
        ],
        practice: [
          {
            id: 'p-css-flex',
            title: 'Center a Dynamic Hero Card with Flexbox & Grid',
            difficulty: 'Easy',
            type: 'code',
            prompt: 'Write CSS utility classes or styles to center a modal vertically and horizontally with responsive padding.',
            starterCode: '<div className="hero-container">\n  <div className="card">Hello Nomadic</div>\n</div>',
            solutionCode: '<div className="min-h-screen flex items-center justify-center p-4">\n  <div className="max-w-md w-full p-6 bg-slate-900 rounded-2xl shadow-xl">Hello Nomadic</div>\n</div>',
            explanation: 'Using `flex items-center justify-center` provides perfect cross-device centering without fixed pixel offsets.'
          },
          {
            id: 'q-html-aria',
            title: 'Quiz: Semantic HTML & Accessibility',
            difficulty: 'Easy',
            type: 'quiz',
            prompt: 'Which HTML element should be used for a clickable element that triggers a state change on the page rather than navigating to a new URL?',
            quizOptions: ['<a href="#">', '<button type="button">', '<div onClick="...">', '<span role="link">'],
            correctOptionIndex: 1,
            explanation: 'Buttons are natively keyboard-navigable (via Space and Enter) and communicate appropriate ARIA roles to screen readers.'
          }
        ],
        apply: {
          id: 'proj-landing',
          title: 'Responsive SaaS Landing Page with Dark Mode',
          description: 'Build a production-grade responsive landing page with sticky navigation, feature bento grid, pricing cards, and dark theme toggling.',
          difficulty: 'Beginner',
          techStack: ['HTML5', 'Tailwind CSS', 'TypeScript'],
          deliverables: [
            'Sticky navigation with mobile hamburger drawer',
            'Bento grid showcasing 4 product capabilities',
            '3-tier pricing comparison table with monthly/annual toggle',
            'Lighthouse Accessibility & Performance score > 95'
          ],
          steps: [
            '1. Initialize Vite project with Tailwind CSS setup',
            '2. Create color tokens in tailwind.config.js for high-contrast dark theme',
            '3. Code semantic layout: Header, Hero, BentoGrid, Pricing, Footer',
            '4. Verify responsive viewports on mobile (375px), tablet (768px), and desktop (1280px)'
          ],
          starterRepoUrl: 'https://github.com/nomadic/template-saas-landing'
        },
        interviewQuestions: [
          'Explain the CSS Box Model and how box-sizing: border-box alters layout calculation.',
          'What is the difference between event bubbling and event capturing?'
        ]
      },
      {
        id: 'javascript-es6',
        title: 'Modern JavaScript (ES6+), Async/Await & Event Loop',
        category: 'Fundamentals',
        estimatedHours: 35,
        description: 'Deep dive into asynchronous JavaScript, Promises, Closures, Prototypes, Array methods, and memory management.',
        topics: ['Event Loop & Microtask Queue', 'Promises, async/await & Error handling', 'Closures & Lexical Scope', 'Higher Order Functions (map, filter, reduce)', 'Fetch API & AbortController'],
        skillsGained: ['JavaScript', 'ES6+', 'Async/Await', 'Event Loop', 'REST Client'],
        learn: [
          { title: 'JavaScript.info: The Modern JavaScript Tutorial', url: 'https://javascript.info', type: 'doc', provider: 'JavaScript.info' },
          { title: 'What the heck is the event loop anyway? (Philip Roberts)', url: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ', type: 'video', duration: '30 mins', provider: 'JSConf / YouTube' },
          { title: 'You Don’t Know JS Yet: Scope & Closures', url: 'https://github.com/getify/You-Dont-Know-JS', type: 'book', provider: 'Kyle Simpson' },
          { title: 'Async/Await & Error Handling Masterclass', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function', type: 'doc', provider: 'MDN' }
        ],
        practice: [
          {
            id: 'p-js-promise',
            title: 'Implement a Resilient Fetch Wrapper with Timeout',
            difficulty: 'Medium',
            type: 'code',
            prompt: 'Write a function `fetchWithTimeout(url, timeoutMs)` using Promise.race or AbortController that rejects with an error if the request exceeds timeoutMs.',
            starterCode: 'async function fetchWithTimeout(url, timeoutMs = 5000) {\n  // TODO: implement with AbortController\n}',
            solutionCode: 'async function fetchWithTimeout(url, timeoutMs = 5000) {\n  const controller = new AbortController();\n  const id = setTimeout(() => controller.abort(), timeoutMs);\n  try {\n    const response = await fetch(url, { signal: controller.signal });\n    clearTimeout(id);\n    return response;\n  } catch (err) {\n    clearTimeout(id);\n    throw err;\n  }\n}',
            explanation: 'Using `AbortController` cleanly cancels the pending HTTP request without leaving dangling promises.'
          },
          {
            id: 'q-js-eventloop',
            title: 'Quiz: Event Loop Execution Order',
            difficulty: 'Medium',
            type: 'quiz',
            prompt: 'In what order will logs print? console.log("A"); setTimeout(() => console.log("B"), 0); Promise.resolve().then(() => console.log("C")); console.log("D");',
            quizOptions: ['A, B, C, D', 'A, D, C, B', 'A, D, B, C', 'A, C, D, B'],
            correctOptionIndex: 1,
            explanation: 'Synchronous logs (A, D) run first, followed by microtasks (Promise.then -> C), followed by macrotasks (setTimeout -> B).'
          }
        ],
        apply: {
          id: 'proj-crypto-radar',
          title: 'Real-Time Market Ticker & Search Filter App',
          description: 'Build a live financial/crypto dashboard fetching from public APIs with client-side debounce search, sorting, and offline caching.',
          difficulty: 'Intermediate',
          techStack: ['JavaScript ES6+', 'Fetch API', 'Local Storage', 'CSS Grid'],
          deliverables: [
            'Asynchronous data fetching with loading skeletons and error boundaries',
            '300ms debounced search input filtering hundreds of items',
            'Multi-column sorting (Price, Change %, Volume)',
            'Favorite items persisted in browser LocalStorage'
          ],
          steps: [
            '1. Create API service module with fetchWithTimeout',
            '2. Implement custom debounce utility function',
            '3. Render responsive data grid with sorting state',
            '4. Add retry button with exponential backoff on network failure'
          ],
          starterRepoUrl: 'https://github.com/nomadic/template-market-radar'
        },
        interviewQuestions: [
          'How does the JavaScript Event Loop handle microtasks vs macrotasks?',
          'What is a closure, and describe a real-world scenario where closures are useful in React custom hooks?'
        ]
      },
      {
        id: 'react-typescript-state',
        title: 'React 18 Architecture, Custom Hooks & TypeScript',
        category: 'Core Frameworks',
        estimatedHours: 45,
        description: 'Build robust component architectures with React 18, strict TypeScript interfaces, custom hooks, Zustand state, and TanStack Query.',
        topics: ['React Hooks (useState, useEffect, useMemo, useCallback)', 'TypeScript Generics & Component Props', 'Zustand Global State Store', 'TanStack Query / SWR for Server State', 'Virtual DOM & Reconciliation'],
        skillsGained: ['React 18', 'TypeScript', 'Zustand', 'TanStack Query', 'Custom Hooks'],
        learn: [
          { title: 'React Official Documentation (react.dev)', url: 'https://react.dev/learn', type: 'doc', provider: 'React Core Team' },
          { title: 'Total TypeScript: React with TypeScript Essentials', url: 'https://www.totaltypescript.com', type: 'cheatsheet', provider: 'Matt Pocock' },
          { title: 'TanStack Query v5 Complete Guide', url: 'https://tanstack.com/query/latest', type: 'doc', provider: 'Tanner Linsley' },
          { title: 'Zustand: Bearbones State Management', url: 'https://zustand.docs.pmnd.rs', type: 'doc', provider: 'Poimandres' }
        ],
        practice: [
          {
            id: 'p-react-hook',
            title: 'Build a `useDebounce` Custom React Hook in TypeScript',
            difficulty: 'Medium',
            type: 'code',
            prompt: 'Write a generic custom hook `useDebounce<T>(value: T, delay: number): T` that delays updating the state until the delay has passed.',
            starterCode: 'import { useState, useEffect } from "react";\n\nexport function useDebounce<T>(value: T, delay: number): T {\n  // TODO: implement\n}',
            solutionCode: 'import { useState, useEffect } from "react";\n\nexport function useDebounce<T>(value: T, delay: number): T {\n  const [debouncedValue, setDebouncedValue] = useState<T>(value);\n\n  useEffect(() => {\n    const timer = setTimeout(() => setDebouncedValue(value), delay);\n    return () => clearTimeout(timer);\n  }, [value, delay]);\n\n  return debouncedValue;\n}',
            explanation: 'The cleanup function inside `useEffect` clears the timeout whenever the input value changes before the delay finishes.'
          },
          {
            id: 'q-react-memo',
            title: 'Quiz: useMemo vs useCallback',
            difficulty: 'Medium',
            type: 'quiz',
            prompt: 'When should you use `useCallback` instead of `useMemo`?',
            quizOptions: [
              'To cache a computed calculated value like a filtered list',
              'To preserve function instance identity between renders when passed to memoized children',
              'To trigger asynchronous side-effects on mount',
              'To replace Redux for global state'
            ],
            correctOptionIndex: 1,
            explanation: '`useCallback(fn, deps)` returns a memoized function reference, preventing unnecessary child re-renders when passed down via props.'
          }
        ],
        apply: {
          id: 'proj-kanban-board',
          title: 'Interactive Trello-Style Kanban Board with Drag & Drop',
          description: 'Build a production-grade Kanban project board with column reordering, task cards, tag filtering, modal editors, and optimistic state updates.',
          difficulty: 'Advanced',
          techStack: ['React 18', 'TypeScript', 'Tailwind CSS', 'Zustand', 'dnd-kit'],
          deliverables: [
            'Drag-and-drop cards across columns (To Do, In Progress, Done)',
            'Zustand store with undo/redo action history',
            'Card modal editor with markdown description and tag badges',
            'Full TypeScript type safety without any `any` types'
          ],
          steps: [
            '1. Define TypeScript interfaces for Task, Column, and BoardState',
            '2. Create Zustand store with moveTask, addTask, and reorderColumn actions',
            '3. Integrate dnd-kit pointer listeners and collision detection',
            '4. Add keyboard shortcuts (Ctrl+N for new card, Escape to close modals)'
          ],
          starterRepoUrl: 'https://github.com/nomadic/template-kanban-board'
        },
        interviewQuestions: [
          'How does the React 18 reconciliation algorithm and Fiber architecture handle batching?',
          'What are the performance implications of anonymous functions in JSX props, and when does it actually cause re-renders?'
        ]
      },
      {
        id: 'fullstack-capstone',
        title: 'Full-Stack Capstone: Cloud SaaS Platform with Auth & Payments',
        category: 'Portfolio Project',
        estimatedHours: 40,
        description: 'Design, code, and deploy a complete production web SaaS with Supabase PostgreSQL, Google Auth, Razorpay/Stripe billing, and edge deployments.',
        topics: ['Next.js / Vite SPA Architecture', 'PostgreSQL Schema & RLS Security', 'Google OAuth & JWT Sessions', 'Webhook Ingestion (Razorpay)', 'CI/CD Vercel Deployment'],
        skillsGained: ['Full Stack', 'Next.js', 'Supabase', 'Razorpay', 'Vercel CI/CD'],
        learn: [
          { title: 'Supabase Architecture & Row Level Security Deep Dive', url: 'https://supabase.com/docs/guides/auth/row-level-security', type: 'doc', provider: 'Supabase' },
          { title: 'Razorpay API & Webhook Verification Documentation', url: 'https://razorpay.com/docs/webhooks', type: 'doc', provider: 'Razorpay' },
          { title: 'Next.js App Router Architecture Best Practices', url: 'https://nextjs.org/docs/app', type: 'doc', provider: 'Vercel' }
        ],
        practice: [
          {
            id: 'p-auth-jwt',
            title: 'Verify Razorpay Webhook Signature in Node/Edge Runtime',
            difficulty: 'Hard',
            type: 'code',
            prompt: 'Write a function that calculates HMAC-SHA256 of the request payload with your webhook secret and verifies if the signature matches.',
            starterCode: 'import crypto from "crypto";\n\nexport function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {\n  // TODO: implement\n}',
            solutionCode: 'import crypto from "crypto";\n\nexport function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {\n  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");\n  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));\n}',
            explanation: 'Using `crypto.timingSafeEqual` prevents timing attack vulnerabilities when validating payment signatures.'
          },
          {
            id: 'q-rls-security',
            title: 'Quiz: Supabase Row Level Security',
            difficulty: 'Medium',
            type: 'quiz',
            prompt: 'Why is Row Level Security (RLS) mandatory when shipping a client-side frontend using Supabase anon keys?',
            quizOptions: [
              'It speeds up database indexing queries by 50%',
              'It ensures users can only read and write their own rows even if the anon key is public',
              'It automatically generates TypeScript types',
              'It encrypts the database hard drive'
            ],
            correctOptionIndex: 1,
            explanation: 'With RLS enabled, PostgreSQL enforces policies per user UUID, guaranteeing that a malicious client cannot modify other users\' records.'
          }
        ],
        apply: {
          id: 'proj-nomadic-clone',
          title: 'Full Capstone: Production Job Hunter SaaS with Razorpay',
          description: 'Ship your complete portfolio SaaS project with live user authentication, database persistence, automated email alerts, and live payment processing.',
          difficulty: 'Advanced',
          techStack: ['React', 'TypeScript', 'Supabase', 'PostgreSQL', 'Tailwind', 'Vercel'],
          deliverables: [
            'Complete live web app deployed on custom Vercel domain',
            'PostgreSQL database with secure Row Level Security policies',
            'Working Razorpay test payment integration with instant role provisioning',
            'GitHub repository with comprehensive README, system architecture diagram, and demo video'
          ],
          steps: [
            '1. Architect SQL schema for users, subscriptions, and records',
            '2. Implement secure RLS policies for least-privilege client access',
            '3. Connect Razorpay checkout script and webhook server',
            '4. Deploy to Vercel and run Lighthouse audits'
          ],
          starterRepoUrl: 'https://github.com/nomadic/template-fullstack-saas'
        },
        interviewQuestions: [
          'Walk me through your database schema design and how you secured user data using Row Level Security.',
          'How did you handle webhook idempotency to prevent double-crediting customer subscriptions?'
        ]
      }
    ]
  },
  {
    id: 'backend',
    title: 'Backend & Systems Engineering',
    icon: 'Server',
    badge: 'Top Salary',
    targetRoles: ['Backend Developer', 'Node.js Engineer', 'Systems Developer', 'API Specialist'],
    description: 'Design distributed architectures, relational schemas, caching tiers, message queues, and resilient microservices.',
    salaryRangeIndia: '₹7 LPA – ₹28 LPA',
    salaryRangeGlobal: '$80k – $165k',
    milestones: [
      {
        id: 'node-rest-apis',
        title: 'Node.js, Express & RESTful / GraphQL API Design',
        category: 'Fundamentals',
        estimatedHours: 35,
        description: 'Build type-safe, resilient APIs with JWT authentication, rate limiting, and structured logging.',
        topics: ['Node.js Event Loop & Streams', 'Express & Fastify Middleware', 'JWT Auth & RBAC', 'Zod Schema Validation', 'Error Handling Pipelines'],
        skillsGained: ['Node.js', 'Express', 'JWT', 'REST APIs', 'Zod'],
        learn: [
          { title: 'Node.js Architecture & Streams Documentation', url: 'https://nodejs.org/docs', type: 'doc', provider: 'Node.js Foundation' },
          { title: 'RESTful API Design Best Practices (HTTP Statuses, Idempotency)', url: 'https://restfulapi.net', type: 'doc', provider: 'RESTfulAPI' }
        ],
        practice: [
          {
            id: 'p-rate-limit',
            title: 'Implement an In-Memory Token Bucket Rate Limiter',
            difficulty: 'Medium',
            type: 'code',
            prompt: 'Write an Express middleware that limits users to 10 requests per minute based on their IP address.',
            starterCode: 'export function rateLimiter(limit = 10, windowMs = 60000) {\n  // TODO: implement\n}',
            solutionCode: 'const ipHits = new Map<string, { count: number; expiresAt: number }>();\n\nexport function rateLimiter(limit = 10, windowMs = 60000) {\n  return (req: any, res: any, next: any) => {\n    const ip = req.ip || "127.0.0.1";\n    const now = Date.now();\n    const record = ipHits.get(ip);\n    if (!record || now > record.expiresAt) {\n      ipHits.set(ip, { count: 1, expiresAt: now + windowMs });\n      return next();\n    }\n    if (record.count >= limit) {\n      return res.status(429).json({ error: "Too many requests. Please try again later." });\n    }\n    record.count += 1;\n    next();\n  };\n}',
            explanation: 'The token bucket algorithm prevents DDoS and scraper abuse by capping request frequency per client.'
          }
        ],
        apply: {
          id: 'proj-auth-api',
          title: 'High-Throughput Authentication & User Management Service',
          description: 'Build an enterprise-ready auth service supporting email/password, refresh tokens, role-based permissions, and password resets.',
          difficulty: 'Intermediate',
          techStack: ['Node.js', 'TypeScript', 'Express', 'PostgreSQL', 'Argon2'],
          deliverables: [
            'Registration and login with Argon2id password hashing',
            'Short-lived JWT access tokens + rotating refresh tokens',
            'Role-Based Access Control (Admin, Member, Guest) middleware',
            'Full unit test suite in Vitest with >85% code coverage'
          ],
          steps: [
            '1. Define PostgreSQL schema for users, sessions, and roles',
            '2. Implement Argon2 password hashing and verification',
            '3. Write JWT sign/verify utilities with asymmetric keys',
            '4. Test edge cases: expired tokens, duplicate emails, SQL injections'
          ]
        },
        interviewQuestions: [
          'How does Node.js handle asynchronous non-blocking I/O with libuv?',
          'What is the difference between authentication (AuthN) and authorization (AuthZ)?'
        ]
      },
      {
        id: 'postgres-redis',
        title: 'PostgreSQL Query Optimization & Redis Caching',
        category: 'Databases & APIs',
        estimatedHours: 40,
        description: 'Master relational schema modeling, B-Tree & GIN indexing, ACID isolation levels, and Redis distributed caching.',
        topics: ['PostgreSQL Schema & Normalization', 'B-Tree & Composite Indexes', 'EXPLAIN ANALYZE Query Profiling', 'Redis Caching & Cache-Aside Patterns', 'Transactions & Deadlocks'],
        skillsGained: ['PostgreSQL', 'Redis', 'SQL Optimization', 'Database Indexing'],
        learn: [
          { title: 'Use The Index, Luke (SQL Indexing Guide)', url: 'https://use-the-index-luke.com', type: 'doc', provider: 'Markus Winand' },
          { title: 'Redis University: Caching Architecture Patterns', url: 'https://university.redis.com', type: 'doc', provider: 'Redis' }
        ],
        practice: [
          {
            id: 'p-cache-aside',
            title: 'Implement the Cache-Aside Pattern with Redis & PostgreSQL',
            difficulty: 'Medium',
            type: 'code',
            prompt: 'Write a function `getUserById(id)` that checks Redis first, falls back to Postgres query on cache miss, and populates Redis with 60s TTL.',
            starterCode: 'async function getUserById(id: string) {\n  // TODO: implement cache-aside\n}',
            solutionCode: 'async function getUserById(id: string) {\n  const cached = await redis.get(`user:${id}`);\n  if (cached) return JSON.parse(cached);\n  const user = await db.query("SELECT * FROM users WHERE id = $1", [id]);\n  if (user.rows[0]) {\n    await redis.set(`user:${id}`, JSON.stringify(user.rows[0]), "EX", 60);\n  }\n  return user.rows[0] || null;\n}',
            explanation: 'Cache-Aside minimizes direct database load for hot read queries while guaranteeing data availability.'
          }
        ],
        apply: {
          id: 'proj-distributed-queue',
          title: 'Distributed Background Job Queue with Redis Pub/Sub',
          description: 'Build a fault-tolerant worker queue for email dispatching and image processing with automatic retries and dead-letter queues.',
          difficulty: 'Advanced',
          techStack: ['Node.js', 'Redis', 'BullMQ', 'PostgreSQL'],
          deliverables: [
            'Job producer API with exponential retry backoff',
            'Worker pool processing concurrency of 5 parallel tasks',
            'Dead-letter queue capturing failed jobs after 3 retries',
            'Admin dashboard displaying queue throughput and failure metrics'
          ],
          steps: [
            '1. Set up Redis connection and BullMQ queue definitions',
            '2. Create email worker processor with simulated delay',
            '3. Configure retry backoff strategy and error logging',
            '4. Benchmark throughput up to 1,000 jobs per minute'
          ]
        },
        interviewQuestions: [
          'What is the difference between a Clustered and Non-Clustered index?',
          'How do you prevent cache stampede / Thundering Herd problem in high-concurrency caching systems?'
        ]
      }
    ]
  },
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
        title: 'Customer Discovery & Opportunity Solution Trees',
        category: 'Strategy & Discovery',
        estimatedHours: 25,
        description: 'Conduct user interviews, synthesize qualitative insights, and prioritize user pain points.',
        topics: ['User Interview Frameworks', 'Opportunity Solution Trees', 'Jobs To Be Done (JTBD)', 'Competitive Benchmarking'],
        skillsGained: ['Customer Discovery', 'User Interviews', 'JTBD', 'Opportunity Trees'],
        learn: [
          { title: 'Continuous Discovery Habits Guide', url: 'https://www.producttalk.org', type: 'doc', provider: 'Teresa Torres' },
          { title: 'Jobs To Be Done (JTBD) Framework Handbook', url: 'https://jtbd.info', type: 'doc', provider: 'Clayton Christensen' }
        ],
        practice: [
          {
            id: 'q-pm-interview',
            title: 'Quiz: User Interview Methodology',
            difficulty: 'Easy',
            type: 'quiz',
            prompt: 'Which of the following is the most effective user interview question to uncover real customer pain points?',
            quizOptions: [
              '"Would you pay ₹500 for an auto-apply job search tool?"',
              '"Tell me about the last time you applied for a job and what parts were most frustrating."',
              '"Do you think our UI looks modern?"',
              '"How often do you want us to email you new features?"'
            ],
            correctOptionIndex: 1,
            explanation: 'Asking about past actual behavior rather than speculative future intent yields unbiased, actionable customer insights.'
          }
        ],
        apply: {
          id: 'proj-prd-spec',
          title: 'Comprehensive Product Requirement Document (PRD)',
          description: 'Author a complete, technical Product Requirement Document for a new high-impact feature using the Linear method.',
          difficulty: 'Intermediate',
          techStack: ['PRD Writing', 'Linear Method', 'User Story Mapping', 'Gherkin Syntax'],
          deliverables: [
            'Problem statement and validated customer quote evidence',
            'User story map with MVP vs Post-MVP scopes',
            'Functional and Non-functional requirement specifications',
            'Success metrics (Leading and Lagging KPIs)'
          ],
          steps: [
            '1. Define target user persona and core JTBD hypothesis',
            '2. Map user journey from discovery to completion',
            '3. Write acceptance criteria in Given/When/Then format',
            '4. Define North Star metric and secondary guardrail metrics'
          ]
        },
        interviewQuestions: [
          'How do you prioritize between high-friction technical debt and new feature requests?',
          'Describe a time you had to say no to a high-profile stakeholder feature request.'
        ]
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
