export interface VaultQuestion {
  id: string;
  title: string;
  category: 'Frontend & JS' | 'Backend & System Design' | 'Data Structures & Algorithms' | 'Databases & SQL' | 'Product & Behavioral';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  companyTags: string[];
  isPaid: boolean;
  frequency: 'Very High' | 'High' | 'Medium';
  prompt: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string[];
  starterCode?: string;
  solutionCode?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  detailedExplanation: string;
  videoWalkthroughUrl?: string;
}

export interface VaultTextbook {
  id: string;
  title: string;
  author: string;
  category: 'System Architecture' | 'Software Craftsmanship' | 'Frontend Engineering' | 'Product Management' | 'Databases & Performance';
  isPaid: boolean;
  rating: number;
  coverImage?: string;
  summary: string;
  keyTakeaways: string[];
  chapters: string[];
  readUrl: string;
  notesDocUrl?: string;
}

export interface VaultCheatsheet {
  id: string;
  title: string;
  category: string;
  isPaid: boolean;
  downloadsCount: number;
  description: string;
  highlights: string[];
  viewUrl: string;
}

export const VAULT_QUESTIONS: VaultQuestion[] = [
  {
    id: 'q-js-promise-all',
    title: 'Implement Custom Promise.all Polyfill',
    category: 'Frontend & JS',
    difficulty: 'Medium',
    companyTags: ['Google', 'Meta', 'Uber', 'Stripe'],
    isPaid: false,
    frequency: 'Very High',
    prompt: 'Write a function `customPromiseAll(promises)` that returns a single Promise that resolves to an array of the results of the input promises. If any promise rejects, it rejects immediately with that error.',
    examples: [
      {
        input: 'customPromiseAll([Promise.resolve(1), Promise.resolve(2), 3])',
        output: '[1, 2, 3]',
        explanation: 'Non-promise values are treated as resolved promises.'
      },
      {
        input: 'customPromiseAll([Promise.resolve(1), Promise.reject("Error"), 3])',
        output: 'Rejects with "Error"',
        explanation: 'Fails fast on the first rejected promise.'
      }
    ],
    constraints: [
      'Must preserve the exact order of resolved values matching input array.',
      'Must handle empty arrays by resolving to `[]` immediately.',
      'Must not rely on native `Promise.all`.'
    ],
    starterCode: `function customPromiseAll(promises) {
  return new Promise((resolve, reject) => {
    // Write your implementation here
  });
}`,
    solutionCode: `function customPromiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError('Input must be an array'));
    }
    const results = [];
    let completedCount = 0;
    const total = promises.length;

    if (total === 0) {
      return resolve(results);
    }

    promises.forEach((p, index) => {
      Promise.resolve(p)
        .then((val) => {
          results[index] = val;
          completedCount += 1;
          if (completedCount === total) {
            resolve(results);
          }
        })
        .catch(reject);
    });
  });
}`,
    timeComplexity: 'O(N) where N is the number of promises',
    spaceComplexity: 'O(N) to store the results array',
    detailedExplanation: 'We wrap each item in `Promise.resolve()` to safely handle primitive values. An index pointer ensures results stay ordered even if later promises resolve earlier. A counter tracks completion to avoid premature resolution.',
    videoWalkthroughUrl: 'https://youtube.com'
  },
  {
    id: 'q-sys-rate-limiter',
    title: 'Design a Distributed Token Bucket Rate Limiter',
    category: 'Backend & System Design',
    difficulty: 'Hard',
    companyTags: ['Stripe', 'Cloudflare', 'Netflix', 'Amazon'],
    isPaid: true,
    frequency: 'Very High',
    prompt: 'Design a high-throughput, distributed rate-limiting service capable of handling 50,000 requests/sec across multi-region server clusters using Redis and Lua scripting.',
    examples: [
      {
        input: 'User requests 15 tokens in 1 second with 10 max bucket capacity',
        output: 'First 10 return 200 OK, remaining 5 return 429 Too Many Requests',
        explanation: 'Refill rate determines tokens replenished over time.'
      }
    ],
    constraints: [
      'Latency overhead < 2ms per request.',
      'Zero race conditions across distributed worker instances.',
      'Sliding window accuracy.'
    ],
    starterCode: `// Redis Lua Script for Atomic Token Bucket
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local current_time = tonumber(ARGV[2])
-- TODO: Complete atomic token bucket evaluation`,
    solutionCode: `local key = KEYS[1]
local limit = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local current_time = tonumber(ARGV[3])
local capacity = tonumber(ARGV[4])

local data = redis.call("HMGET", key, "tokens", "last_updated")
local tokens = tonumber(data[1]) or capacity
local last_updated = tonumber(data[2]) or current_time

-- Calculate replenished tokens
local delta = math.max(0, current_time - last_updated)
tokens = math.min(capacity, tokens + (delta * refill_rate))

if tokens >= 1 then
    tokens = tokens - 1
    redis.call("HMSET", key, "tokens", tokens, "last_updated", current_time)
    redis.call("EXPIRE", key, math.ceil(capacity / refill_rate) + 60)
    return 1
else
    return 0
end`,
    timeComplexity: 'O(1) in-memory Redis execution',
    spaceComplexity: 'O(U) where U is active concurrent users',
    detailedExplanation: 'Executing the token bucket calculation inside a single Redis Lua script guarantees atomicity, eliminating distributed race conditions without expensive locking protocols.',
    videoWalkthroughUrl: 'https://youtube.com'
  },
  {
    id: 'q-react-virtualized-list',
    title: 'Build a High-Performance Virtualized Windowing List',
    category: 'Frontend & JS',
    difficulty: 'Hard',
    companyTags: ['Meta', 'Twitter / X', 'LinkedIn'],
    isPaid: true,
    frequency: 'High',
    prompt: 'Implement a React virtualized scroll container that renders only the items visible in the viewport plus an overscan buffer of 3 items, rendering 100,000 items at 60 FPS.',
    examples: [
      {
        input: '100,000 items in a 500px container with 50px row height',
        output: 'DOM tree contains exactly 16 rendered rows instead of 100,000',
        explanation: 'Uses translateY absolute positioning based on scrollTop.'
      }
    ],
    constraints: [
      'Must not lag on fast scrolling.',
      'Must compute dynamic startIndex and endIndex from container scrollTop.'
    ],
    starterCode: `export function VirtualList({ items, itemHeight, containerHeight, renderItem }) {
  // TODO: implement virtual scroll calculation
}`,
    solutionCode: `import React, { useState } from 'react';

export function VirtualList({ items, itemHeight, containerHeight, renderItem }) {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 3);
  const endIndex = Math.min(items.length - 1, Math.floor((scrollTop + containerHeight) / itemHeight) + 3);

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        }}
      >
        {renderItem(items[i], i)}
      </div>
    );
  }

  return (
    <div
      style={{ height: containerHeight, overflowY: 'auto', position: 'relative' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
}`,
    timeComplexity: 'O(1) render complexity independent of dataset size',
    spaceComplexity: 'O(V) where V is the visible viewport row count',
    detailedExplanation: 'By maintaining an outer scroll spacer with `totalHeight` and absolutely positioning only the visible subset (`startIndex` to `endIndex`), we prevent DOM memory bloat.',
    videoWalkthroughUrl: 'https://youtube.com'
  },
  {
    id: 'q-sql-optimizing-joins',
    title: 'Optimize Slow Aggregation on 50M Row Table',
    category: 'Databases & SQL',
    difficulty: 'Medium',
    companyTags: ['Postman', 'Razorpay', 'Swiggy', 'Amazon'],
    isPaid: true,
    frequency: 'High',
    prompt: 'A query calculating monthly revenue per customer over 50,000,000 transactions takes 42 seconds. Write the optimized query and recommend the appropriate composite index.',
    examples: [
      {
        input: 'SELECT customer_id, SUM(amount) FROM orders WHERE created_at >= "2026-01-01" GROUP BY customer_id;',
        output: 'Reduced execution time from 42,000ms to 18ms via Index-Only Scan.'
      }
    ],
    constraints: [
      'Must avoid sequential table scans.',
      'Must provide the exact CREATE INDEX statement.'
    ],
    starterCode: `-- Write optimized index and query
CREATE INDEX idx_orders_optimization ON orders (...);`,
    solutionCode: `-- Step 1: Create covering composite index
CREATE INDEX idx_orders_covering 
ON orders (created_at DESC, customer_id) 
INCLUDE (amount);

-- Step 2: Query using index scan
SELECT customer_id, SUM(amount) as total_revenue
FROM orders
WHERE created_at >= '2026-01-01 00:00:00'
GROUP BY customer_id;`,
    timeComplexity: 'O(log N + M) where M is matching date rows',
    spaceComplexity: 'B-Tree index storage in RAM',
    detailedExplanation: 'Using the PostgreSQL `INCLUDE (amount)` clause creates an Index-Only Scan, allowing the engine to calculate sums directly from the index pages without touching the heap table on disk.',
    videoWalkthroughUrl: 'https://youtube.com'
  },
  {
    id: 'q-dsa-lru-cache',
    title: 'LRU Cache Design (O(1) Get & Put)',
    category: 'Data Structures & Algorithms',
    difficulty: 'Medium',
    companyTags: ['Google', 'Microsoft', 'Apple', 'Uber'],
    isPaid: false,
    frequency: 'Very High',
    prompt: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement `get(key)` and `put(key, value)` with average O(1) time complexity.',
    examples: [
      {
        input: 'LRUCache(2); put(1,1); put(2,2); get(1); put(3,3); get(2);',
        output: '[null, null, null, 1, null, -1]',
        explanation: 'Key 2 was evicted because Key 1 was accessed before Key 3 was inserted.'
      }
    ],
    constraints: [
      'Capacity >= 1',
      'Both get and put operations must run in O(1) time complexity.'
    ],
    starterCode: `class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
  }
  get(key) {}
  put(key, value) {}
}`,
    solutionCode: `class Node {
  constructor(key, val) {
    this.key = key;
    this.val = val;
    this.prev = null;
    this.next = null;
  }
}

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
    this.head = new Node(0, 0);
    this.tail = new Node(0, 0);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  insert(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this.remove(node);
    this.insert(node);
    return node.val;
  }

  put(key, value) {
    if (this.map.has(key)) {
      this.remove(this.map.get(key));
    }
    const newNode = new Node(key, value);
    this.insert(newNode);
    this.map.set(key, newNode);

    if (this.map.size > this.capacity) {
      const lru = this.tail.prev;
      this.remove(lru);
      this.map.delete(lru.key);
    }
  }
}`,
    timeComplexity: 'O(1) for both get() and put()',
    spaceComplexity: 'O(C) where C is capacity',
    detailedExplanation: 'Combining a Hash Map (for O(1) key lookups) with a Doubly Linked List (for O(1) node removals and insertions at the head) gives perfect O(1) LRU eviction.',
    videoWalkthroughUrl: 'https://youtube.com'
  },
  {
    id: 'q-pm-metric-drop',
    title: 'Root-Cause Analysis: 15% Drop in Core Conversion',
    category: 'Product & Behavioral',
    difficulty: 'Hard',
    companyTags: ['Airbnb', 'Uber', 'Swiggy', 'Zomato'],
    isPaid: true,
    frequency: 'High',
    prompt: 'You are the PM for checkout. On Monday morning, analytics shows that checkout conversion dropped by 15% over the weekend. Walk through your systematic diagnostic framework.',
    examples: [
      {
        input: 'Diagnose conversion decline step-by-step',
        output: 'Structured framework: Data Integrity -> Segmentation -> Funnel Step -> External Factors -> Release Audit'
      }
    ],
    constraints: [
      'Must identify potential data tracking outages before concluding real drop.',
      'Must slice metrics by dimension (Platform, Geo, Payment Gateway, App Version).'
    ],
    starterCode: `// Framework outline:
1. Clarify & Validate Data
2. Segment by Dimensions
3. Funnel Drop-off Analysis
4. Hypothesis Generation & Action Plan`,
    solutionCode: `Root-Cause Diagnostic Framework:
1. Validate Data Integrity: Verify tracking scripts, telemetry events, and logging pipeline latency.
2. Segment Dimensions:
   - Platform: iOS vs Android vs Web
   - Geography: Tier 1 vs Tier 2 cities
   - Payment Gateway: UPI vs Credit Cards vs Netbanking (e.g. Razorpay downtime)
   - App Version: New release rollout percentage
3. Funnel Stage Isolation:
   - Cart View -> Address Selection -> Payment Screen -> OTP Confirmation -> Success
4. Internal vs External Checks:
   - Internal: New frontend deployments, experiment variants, rate limiter bugs
   - External: Banking server outages, holidays, competitor campaigns
5. Immediate Containment & Communication:
   - Roll back suspect deployment / disable failing payment gateway variant.`,
    detailedExplanation: 'Structured problem solving separates high-level PM candidates. Always rule out telemetry failures first, isolate the exact funnel step second, and communicate containment steps clearly.',
    videoWalkthroughUrl: 'https://youtube.com'
  }
];

export const VAULT_TEXTBOOKS: VaultTextbook[] = [
  {
    id: 'book-ddia',
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    category: 'System Architecture',
    isPaid: true,
    rating: 4.9,
    summary: 'The definitive bible of distributed systems, replication, partitioning, transactions, consensus, and batch/stream processing architectures.',
    keyTakeaways: [
      'Trade-offs between Single-Leader, Multi-Leader, and Leaderless replication',
      'ACID vs BASE isolation levels and read-skew/write-skew anomalies',
      'LSM-Trees vs B-Trees for write-heavy vs read-heavy database engines',
      'Raft & Paxos distributed consensus algorithms'
    ],
    chapters: [
      '1. Reliable, Scalable, and Maintainable Applications',
      '2. Data Models and Query Languages',
      '3. Storage and Retrieval (SSTables & LSM-Trees)',
      '5. Replication & Failover Protocols',
      '7. Transactions & Serializability',
      '9. Consistency and Consensus'
    ],
    readUrl: 'https://dataintensive.net',
    notesDocUrl: 'https://github.com/ept/ddia-references'
  },
  {
    id: 'book-clean-code',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    author: 'Robert C. Martin ("Uncle Bob")',
    category: 'Software Craftsmanship',
    isPaid: false,
    rating: 4.8,
    summary: 'Foundational principles of writing readable, maintainable, and refactorable code with meaningful naming, single-responsibility functions, and SOLID design patterns.',
    keyTakeaways: [
      'Functions should do one thing and do it well',
      'Meaningful variable and class naming eliminates need for redundant comments',
      'SOLID principles (Single Responsibility, Open-Closed, Liskov, Interface Segregation, Dependency Inversion)',
      'TDD (Test-Driven Development) cycle: Red ➔ Green ➔ Refactor'
    ],
    chapters: [
      '1. Clean Code Philosophy',
      '2. Meaningful Names',
      '3. Functions & Argument Counts',
      '6. Objects and Data Structures',
      '10. Classes & Cohesion',
      '14. Successive Refinement'
    ],
    readUrl: 'https://www.oreilly.com/library/view/clean-code-a/9780136083238/',
  },
  {
    id: 'book-system-design',
    title: 'System Design Interview – An Insider’s Guide (Vol 1 & 2)',
    author: 'Alex Xu',
    category: 'System Architecture',
    isPaid: true,
    rating: 4.9,
    summary: 'Step-by-step blueprints for architecting large-scale systems (URL Shortener, Rate Limiter, Chat System, Video Streaming, Distributed Cache).',
    keyTakeaways: [
      '4-step interview framework: Scope Requirements ➔ High-Level Architecture ➔ Deep Dive ➔ Wrap Up',
      'Capacity estimation calculations (QPS, storage, bandwidth)',
      'WebSockets vs Long Polling for real-time messaging',
      'Consistent Hashing algorithms to minimize cache remapping'
    ],
    chapters: [
      '1. Scale From Zero to Millions of Users',
      '4. Design a Rate Limiter',
      '5. Design Consistent Hashing',
      '6. Design a Key-Value Store',
      '10. Design a Notification System',
      '12. Design a Chat System'
    ],
    readUrl: 'https://bytebytego.com',
  },
  {
    id: 'book-ydkjs',
    title: 'You Don’t Know JS Yet: Scope, Closures & Objects',
    author: 'Kyle Simpson',
    category: 'Frontend Engineering',
    isPaid: false,
    rating: 4.9,
    summary: 'Master the deepest mechanics of the JavaScript engine: lexical scope, hoisting, closures, prototypes, `this` binding, and asynchronous microtasks.',
    keyTakeaways: [
      'Lexical scope compilation phases and shadowed variables',
      'Closures as persistent scope references',
      'Explicit, implicit, and default `this` binding rules',
      'Prototypal inheritance vs classical OOP classes'
    ],
    chapters: [
      '1. What is Scope?',
      '2. Illustrating Lexical Scope',
      '4. Around the Global Scope',
      '5. The (Not So) Secret Lifecycle of Variables',
      '7. Using Closures'
    ],
    readUrl: 'https://github.com/getify/You-Dont-Know-JS',
  },
  {
    id: 'book-cracking-pm',
    title: 'Cracking the PM Interview',
    author: 'Gayle McDowell & Jackie Bavaro',
    category: 'Product Management',
    isPaid: true,
    rating: 4.8,
    summary: 'Comprehensive guide to product sense, execution, metrics estimation, user journey mapping, and behavioral case studies.',
    keyTakeaways: [
      'CIRCLES framework for product design questions',
      'Structuring ambiguous problem statements with MECE trees',
      'A/B testing statistical significance and cohort tracking',
      'Executive stakeholder trade-off communication'
    ],
    chapters: [
      '3. The Associate Product Manager Role',
      '6. Product Design Questions',
      '7. Case Questions & Estimation',
      '9. Behavioral & Leadership Questions'
    ],
    readUrl: 'https://crackingthepminterview.com',
  }
];

export const VAULT_CHEATSHEETS: VaultCheatsheet[] = [
  {
    id: 'cs-react18',
    title: 'React 18 & Next.js App Router Architecture Cheatsheet',
    category: 'Frontend',
    isPaid: false,
    downloadsCount: 14200,
    description: 'Server Components vs Client Components, Suspense boundaries, streaming SSR, and custom hook optimization rules.',
    highlights: ['RSC rendering boundaries', 'useMemo/useCallback heuristics', 'TanStack Query cache lifecycle', 'Zustand state patterns'],
    viewUrl: 'https://react.dev'
  },
  {
    id: 'cs-sql-indexes',
    title: 'PostgreSQL Indexing & EXPLAIN ANALYZE Guide',
    category: 'Databases',
    isPaid: true,
    downloadsCount: 18900,
    description: 'B-Tree, GIN, GiST, BRIN index selection matrix, composite index left-prefix rules, and vacuuming strategies.',
    highlights: ['Composite index column ordering', 'Partial indexes for soft-deleted rows', 'Index-Only Scan optimization', 'Lock contention mitigation'],
    viewUrl: 'https://postgresql.org'
  },
  {
    id: 'cs-docker-k8s',
    title: 'Docker & Kubernetes Production Deployment Cheatsheet',
    category: 'DevOps',
    isPaid: true,
    downloadsCount: 12400,
    description: 'Multi-stage Docker builds, non-root user security, Kubernetes Ingress, and horizontal pod autoscalers.',
    highlights: ['Multi-stage Dockerfile templates', 'Health check probe definitions', 'Resource limits and requests', 'Secret management protocols'],
    viewUrl: 'https://kubernetes.io'
  }
];
