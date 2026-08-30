import React, { useState, useEffect } from 'react';
import {
  ArrowRight, Check, ShieldCheck,
  Search, Zap, Mail, ChevronDown, ChevronUp,
  Terminal, Laptop, Lock, Globe, Sparkles, BookOpen,
  Layers, Code, Server, Play, Cpu, CheckCircle2,
  Menu, X, ExternalLink, Filter, Send, Compass, UserCheck
} from 'lucide-react';

const TRACKS_DATA = [
  {
    id: 'frontend',
    title: 'Frontend Architecture',
    badge: 'High Demand',
    tag: 'React 18 · TypeScript · Next.js · Tailwind',
    hours: '140 Hours',
    role: 'UI & Frontend Engineer',
    topics: ['Semantic HTML5 & Modern Layouts', 'Deep JS (Closures, Event Loop, Async)', 'React State & TanStack Query', 'Performance & Web Vitals'],
    skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'State Management']
  },
  {
    id: 'backend',
    title: 'Backend & Systems',
    badge: 'Top Salary',
    tag: 'Node.js · Go · PostgreSQL · Redis · Docker',
    hours: '130 Hours',
    role: 'Backend & Systems Engineer',
    topics: ['REST & GraphQL API Architecture', 'PostgreSQL Schema & Indexing', 'Redis Caching & Pub/Sub', 'Microservices & Async Queues'],
    skills: ['Node.js', 'PostgreSQL', 'Redis', 'Docker', 'System Design']
  },
  {
    id: 'fullstack',
    title: 'Full Stack Engineering',
    badge: 'Most Versatile',
    tag: 'TypeScript · MERN / PERN · Cloud Deployment',
    hours: '175 Hours',
    role: 'Full Stack Developer',
    topics: ['End-to-End Type Safety', 'Prisma / Drizzle ORM Integration', 'Authentication & Role-Based Access', 'CI/CD & Cloud Infrastructure'],
    skills: ['Full Stack', 'TypeScript', 'Prisma', 'REST APIs', 'Cloud']
  },
  {
    id: 'ai',
    title: 'AI & LLM Applications',
    badge: 'Trending 2026',
    tag: 'RAG · pgvector · LangChain · Autonomous Agents',
    hours: '105 Hours',
    role: 'AI Engineer / LLM Specialist',
    topics: ['Vector Embeddings & Similarity Search', 'Retrieval-Augmented Generation (RAG)', 'Tool Calling & Agentic Loops', 'Prompt Evaluation & Guardrails'],
    skills: ['AI Engineering', 'RAG Pipelines', 'Vector DBs', 'Python', 'LLMs']
  },
  {
    id: 'devops',
    title: 'DevOps & Platform',
    badge: 'Infrastructure',
    tag: 'Kubernetes · Terraform · AWS · CI/CD Pipelines',
    hours: '120 Hours',
    role: 'DevOps & Cloud Engineer',
    topics: ['Linux Internals & Networking', 'Infrastructure as Code (Terraform)', 'Container Orchestration (K8s)', 'Observability (Prometheus/Grafana)'],
    skills: ['Kubernetes', 'Terraform', 'CI/CD', 'Linux', 'AWS']
  },
  {
    id: 'mobile',
    title: 'Mobile App Development',
    badge: 'Cross-Platform',
    tag: 'React Native · Expo · iOS · Android',
    hours: '115 Hours',
    role: 'Mobile Engineer',
    topics: ['React Native Core Components', 'Native Bridges & Modules', 'Offline-First SQLite Storage', 'App Store & Play Store Release'],
    skills: ['React Native', 'Expo', 'Mobile UI', 'Offline Sync']
  }
];

const SAMPLE_JOBS = [
  {
    title: 'Frontend Engineer',
    company: 'Vercel',
    location: 'Remote',
    source: 'Greenhouse API',
    match: '96% Match',
    comp: '₹22 LPA · $140k',
    type: 'Full-time'
  },
  {
    title: 'Software Development Intern',
    company: 'Linear',
    location: 'Hybrid',
    source: 'Ashby API',
    match: '93% Match',
    comp: '₹65,000 / month',
    type: 'Internship'
  },
  {
    title: 'Backend Systems Engineer',
    company: 'Supabase',
    location: 'Remote',
    source: 'Lever API',
    match: '89% Match',
    comp: '₹26 LPA · $155k',
    type: 'Full-time'
  }
];

const FAQS = [
  {
    q: 'How does JobMaxxer auto-apply to jobs?',
    a: 'JobMaxxer runs a local, user-controlled Chromium instance on your desktop using stealth browser automation. It navigates to authentic company career portals (Greenhouse, Lever, Ashby, etc.), maps your master profile answers, attaches your selected resume, answers custom open-ended prompts dynamically, and submits without triggering bot barriers.'
  },
  {
    q: 'Where do the job postings come from?',
    a: 'Unlike traditional aggregator boards that scrape outdated third-party listings, JobMaxxer connects directly to public ATS endpoints and verified company feeds. Postings are cryptographically deduplicated with SHA-256 hashes to guarantee active, live positions.'
  },
  {
    q: 'Is my personal data and resume secure?',
    a: 'Yes. JobMaxxer is built on a local-first philosophy. Your master candidate profile, resume documents, and private credentials are encrypted and stored in an isolated local SQLite database on your computer. Your sensitive files never touch advertising or tracking servers.'
  },
  {
    q: 'What is the difference between Semi-Auto and Autonomous mode?',
    a: 'Semi-Auto mode launches up to 20 pre-filled browser tabs simultaneously, allowing you to review each application with one click before submission. Autonomous mode evaluates all fields and custom questions, submitting applications hands-off on your behalf.'
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major payment methods including direct UPI (Google Pay, PhonePe, Paytm, CRED), all Debit/Credit cards, and Netbanking via Razorpay directly inside the desktop application.'
  }
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('frontend');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [selectedJobIndex, setSelectedJobIndex] = useState<number>(0);

  const selectedTrack = TRACKS_DATA.find(t => t.id === selectedTrackId) || TRACKS_DATA[0];

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-foreground bg-background-base selection:bg-accent/30 relative z-10 antialiased">
      {/* Ambient Lighting Blobs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-accent/20 blur-[170px] pointer-events-none rounded-full animate-float -z-10" />
      <div className="fixed top-1/3 left-4 w-[550px] h-[550px] bg-indigo-900/15 blur-[150px] pointer-events-none rounded-full animate-float-delayed -z-10" />
      <div className="fixed bottom-12 right-6 w-[650px] h-[650px] bg-accent/10 blur-[160px] pointer-events-none rounded-full animate-float -z-10" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background-base/75 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="#/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent font-black text-xs shadow-glow group-hover:bg-accent/25 transition-all">
                JM
              </div>
              <span className="font-semibold text-base tracking-tight text-foreground group-hover:text-white transition-colors">
                JobMaxxer
              </span>
            </a>

            <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-foreground-muted">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#learner" className="hover:text-foreground transition-colors">Learner Track</a>
              <a href="#seeker" className="hover:text-foreground transition-colors">Seeker Track</a>
              <a href="#preview" className="hover:text-foreground transition-colors">Live Preview</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/snipy09/JobMaxxer/releases/latest"
              className="text-xs font-semibold bg-accent hover:bg-accent-bright text-white px-4 py-2 rounded-lg transition-all shadow-glow flex items-center gap-1.5"
            >
              <span>Download Desktop App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg border border-border text-foreground-muted hover:text-foreground hover:bg-surface transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-background-base/95 backdrop-blur-xl px-6 py-4 space-y-3 text-sm animate-fade-up">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-foreground-muted hover:text-foreground py-1"
            >
              Features
            </a>
            <a
              href="#learner"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-foreground-muted hover:text-foreground py-1"
            >
              Learner Track
            </a>
            <a
              href="#seeker"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-foreground-muted hover:text-foreground py-1"
            >
              Seeker Track
            </a>
            <a
              href="#preview"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-foreground-muted hover:text-foreground py-1"
            >
              Live Preview
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-foreground-muted hover:text-foreground py-1"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-foreground-muted hover:text-foreground py-1"
            >
              FAQ
            </a>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-surface border border-border rounded-full text-xs font-mono tracking-wide text-foreground-muted mb-8 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
          <span>Dual-Track Career Operating System · v2.0.1</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-semibold tracking-[-0.03em] leading-[1.08] mb-6 text-gradient">
          Master the skills.<br />
          <span className="text-gradient-accent">Automate the applications.</span>
        </h1>

        <p className="text-base sm:text-lg text-foreground-muted mb-10 max-w-2xl leading-relaxed font-normal">
          JobMaxxer is the high-performance desktop platform for software engineers and students. Master structured career roadmaps, discover direct ATS job streams, and let stealth automation pre-fill applications and connect with hiring managers.
        </p>

        <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto">
          <a
            href="https://github.com/snipy09/JobMaxxer/releases/latest"
            className="bg-accent hover:bg-accent-bright text-white px-7 py-3.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-glow"
          >
            <span>Download for Windows (Free)</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#preview"
            className="bg-surface hover:bg-surface-hover text-foreground border border-border px-7 py-3.5 rounded-lg font-medium text-sm flex items-center justify-center transition-all"
          >
            Explore Live Mockup
          </a>
        </div>

        {/* Feature Badges */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-xs text-foreground-muted font-mono tracking-wider">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-accent" /> Local-first SQLite privacy</span>
          <span className="flex items-center gap-1.5"><Laptop className="w-4 h-4 text-accent" /> Single-device hardware lock</span>
          <span className="flex items-center gap-1.5"><Terminal className="w-4 h-4 text-accent" /> Direct ATS ingest (Zero spam)</span>
        </div>
      </main>

      {/* Interactive App Mockup Preview */}
      <section id="preview" className="px-6 pb-24 max-w-5xl mx-auto w-full">
        <div className="bg-background-elevated border border-border/70 rounded-3xl p-5 sm:p-7 shadow-card overflow-hidden backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              <span className="text-xs font-mono text-foreground-muted ml-2">JobMaxxer Desktop Client — Opportunity Stream</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Cron Feed Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-left mb-4">
            {SAMPLE_JOBS.map((j, i) => (
              <div
                key={i}
                onClick={() => setSelectedJobIndex(i)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                  selectedJobIndex === i
                    ? 'bg-surface-hover border-accent/60 shadow-glow'
                    : 'bg-surface border-border hover:border-border-hover'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-foreground-muted uppercase tracking-wider">{j.company}</span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/50">{j.match}</span>
                </div>
                <h4 className="text-sm font-semibold text-foreground">{j.title}</h4>
                <div className="text-xs text-foreground-muted font-mono">{j.comp}</div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-foreground-muted">
                  <span>{j.location} · {j.type}</span>
                  <span className="text-accent font-semibold flex items-center gap-1">
                    Auto-Fill <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-surface/50 border border-border/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-foreground-muted">
              <Terminal className="w-4 h-4 text-accent" />
              <span>Selected: <strong className="text-foreground">{SAMPLE_JOBS[selectedJobIndex].title}</strong> at <strong className="text-foreground">{SAMPLE_JOBS[selectedJobIndex].company}</strong> ({SAMPLE_JOBS[selectedJobIndex].source})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-foreground-muted">Playwright Stealth Engine Ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-24 px-6 border-t border-border/40 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <span className="text-xs font-mono tracking-widest text-accent uppercase">The Bottleneck</span>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Why traditional job hunting is broken.</h2>
            <p className="text-sm text-foreground-muted leading-relaxed">
              Standard aggregator boards are flooded with expired postings, third-party recruiters, and thousands of identical applicants. Spending hours each day re-typing your education, work history, and answers into 20-field portals is inefficient and exhausting.
            </p>
            <p className="text-sm text-foreground-muted leading-relaxed">
              JobMaxxer bypasses aggregator noise by streaming direct company ATS listings (Greenhouse, Lever, Ashby) and executing client-side form automation so you can focus entirely on interview preparation.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 text-foreground-muted">
              <span>TRADITIONAL APPLICATION PROCESS</span>
              <span className="text-accent">JOBMAXXER OS</span>
            </div>
            <div className="space-y-2.5 text-foreground-muted">
              <div className="flex justify-between py-1 border-b border-border/20">
                <span className="text-rose-400/90">✕ Manual 20-minute form entry</span>
                <span className="text-emerald-400">✓ 1-Click Stealth Batch Apply</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/20">
                <span className="text-rose-400/90">✕ Reposted &amp; stale aggregator jobs</span>
                <span className="text-emerald-400">✓ Direct ATS JSON streaming</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/20">
                <span className="text-rose-400/90">✕ Cold email deliverability guessing</span>
                <span className="text-emerald-400">✓ 4-Stage Verified HR inboxes</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-rose-400/90">✕ Disconnected skill roadmaps</span>
                <span className="text-emerald-400">✓ 1-Click Profile Skill Sync</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Persona Section */}
      <section className="py-24 px-6 border-t border-border/40 bg-background-elevated/40">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono tracking-widest text-accent uppercase">Dual-Persona Platform</span>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Engineered for both learning and scaling.</h2>
            <p className="text-sm text-foreground-muted">Whether you are building career fundamentals or actively landing interviews, JobMaxxer is tailored to your workflow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Persona 1: Learner */}
            <div id="learner" className="bg-surface border border-border rounded-2xl p-8 space-y-6 shadow-card hover:border-border-hover transition-all">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground tracking-tight">The Learner Track</h3>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  Tailored for students and developers who want a clear, milestone-driven path to becoming job-ready.
                </p>
              </div>
              <ul className="space-y-3 text-xs text-foreground-muted">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Structured Engineering Roadmaps covering modern tech stacks</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Curated documentation, open-source projects &amp; interview question sets</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Live Job-Readiness Score Meter with 1-click skill synchronization</span>
                </li>
              </ul>
            </div>

            {/* Persona 2: Seeker */}
            <div id="seeker" className="bg-surface border border-border rounded-2xl p-8 space-y-6 shadow-card hover:border-border-hover transition-all">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground tracking-tight">The Seeker Track</h3>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  Designed for active candidates ready to execute automated applications and direct recruiter outreach.
                </p>
              </div>
              <ul className="space-y-3 text-xs text-foreground-muted">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Direct ATS job stream from Greenhouse, Lever, Ashby &amp; top portals</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Semi-Auto 20-tab review mode + 100% Autonomous form submitter</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Direct Hiring Manager discovery with 4-stage verified email outreach</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Career Track Explorer */}
      <section className="py-24 px-6 border-t border-border/40 max-w-6xl mx-auto w-full space-y-12">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-mono tracking-widest text-accent uppercase">Career Disciplines</span>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Interactive Engineering Roadmaps</h2>
          <p className="text-sm text-foreground-muted">Select a discipline to inspect milestones and structured skill modules.</p>
        </div>

        {/* Track selector buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {TRACKS_DATA.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTrackId(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedTrackId === t.id
                  ? 'bg-accent text-white shadow-glow'
                  : 'bg-surface text-foreground-muted hover:text-foreground hover:bg-surface-hover border border-border'
              }`}
            >
              {t.title}
            </button>
          ))}
        </div>

        {/* Selected Track Details Card */}
        <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-bold text-foreground">{selectedTrack.title}</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/30">
                  {selectedTrack.badge}
                </span>
              </div>
              <p className="text-xs text-foreground-muted font-mono mt-1">{selectedTrack.tag}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-foreground-muted">Est. Duration:</span>
              <div className="text-sm font-bold text-foreground">{selectedTrack.hours}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-foreground-muted font-semibold">Core Curriculum Modules:</h4>
              <ul className="space-y-2 text-xs text-foreground-muted">
                {selectedTrack.topics.map((tp, idx) => (
                  <li key={idx} className="flex items-center gap-2 bg-background-base/60 p-2.5 rounded-xl border border-border/40">
                    <span className="text-[10px] font-mono text-accent font-bold">0{idx + 1}</span>
                    <span>{tp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-foreground-muted font-semibold">Skills Pushed to Profile:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedTrack.skills.map((sk, idx) => (
                  <span key={idx} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-surface border border-border text-foreground">
                    {sk}
                  </span>
                ))}
              </div>
              <p className="text-xs text-foreground-muted pt-3 leading-relaxed">
                Checking off milestones in the desktop app dynamically updates your Job-Readiness Score. When ready, 1-click transfers all acquired skills into your Seeker profile for instant job matching.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive (Bento Grid Style) */}
      <section id="features" className="py-24 px-6 border-t border-border/40 max-w-6xl mx-auto w-full space-y-16">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-mono tracking-widest text-accent uppercase">Core Capabilities</span>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Precision engineering for your job hunt.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface border border-border rounded-2xl p-7 space-y-3 shadow-card md:col-span-2 hover:border-border-hover transition-all">
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-foreground">
              <Search className="w-4 h-4 text-accent" />
            </div>
            <h4 className="font-semibold text-base text-foreground">Direct ATS Opportunity Stream</h4>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Job listings are pulled straight from public company ATS endpoints (Greenhouse, Lever, Ashby, and Internshala) with SHA-256 deduplication. Filter by remote, compensation, experience level, or match score without aggregator noise.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-7 space-y-3 shadow-card hover:border-border-hover transition-all">
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-foreground">
              <Zap className="w-4 h-4 text-accent" />
            </div>
            <h4 className="font-semibold text-base text-foreground">Playwright Stealth Engine</h4>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Launches local Chromium instances with natural interaction patterns, avoiding anti-bot triggers while accurately filling application forms.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-7 space-y-3 shadow-card hover:border-border-hover transition-all">
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-foreground">
              <Mail className="w-4 h-4 text-accent" />
            </div>
            <h4 className="font-semibold text-base text-foreground">0-Bounce Recruiter Outreach</h4>
            <p className="text-xs text-foreground-muted leading-relaxed">
              4-stage verification (Syntax → Role Filter → DNS MX → Real-time SMTP Handshake) ensures messages reach the hiring manager's primary inbox.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-7 space-y-3 shadow-card md:col-span-2 hover:border-border-hover transition-all">
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-foreground">
              <ShieldCheck className="w-4 h-4 text-accent" />
            </div>
            <h4 className="font-semibold text-base text-foreground">Local-First Storage &amp; Hardware Lock</h4>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Your profile, resume documents, and private keys are saved locally in SQLite (`sql.js`). Hardware fingerprinting guarantees that your active session is securely tied to your authorized machine.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 border-t border-border/40 bg-background-elevated/40">
        <div className="max-w-6xl mx-auto text-center space-y-16">
          <div className="max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono tracking-widest text-accent uppercase">Pricing</span>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Start Free. Scale With Automation.</h2>
            <p className="text-xs text-foreground-muted">Upgrade directly inside the desktop application via Razorpay. All sales are final.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className="border border-border rounded-2xl p-8 bg-surface flex flex-col justify-between hover:border-border-hover transition-all shadow-card">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">Learner &amp; Seeker Free</h3>
                  <p className="text-xs text-foreground-muted mt-1">For exploring roadmaps &amp; live job boards</p>
                  <div className="text-4xl font-semibold tracking-tight mt-6 text-foreground">
                    ₹0 <span className="text-xs text-foreground-muted font-normal">/ forever</span>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-foreground-muted border-t border-border/40 pt-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-foreground shrink-0" />
                    <span>Access to all Engineering Roadmaps</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-foreground shrink-0" />
                    <span>Curated Resource Vault &amp; Interview Questions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-foreground shrink-0" />
                    <span>Live Job Board stream (1,000+ positions)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-foreground shrink-0" />
                    <span>Job-readiness score calculation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-foreground shrink-0" />
                    <span>Direct manual career portal links</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://github.com/snipy09/JobMaxxer/releases/latest"
                className="mt-8 block text-center w-full py-2.5 bg-surface hover:bg-surface-hover border border-border text-foreground rounded-lg font-medium text-xs transition-colors"
              >
                Download Free Version
              </a>
            </div>

            {/* Pro Tier */}
            <div className="border border-border rounded-2xl p-8 bg-surface flex flex-col justify-between hover:border-accent/40 transition-all shadow-card">
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-full mb-1">
                    Semi-Autonomous
                  </div>
                  <h3 className="font-semibold text-lg text-foreground">Seeker Pro</h3>
                  <p className="text-xs text-foreground-muted mt-1">Accelerate applications with review mode</p>
                  <div className="text-4xl font-semibold tracking-tight mt-6 text-foreground">
                    ₹299 <span className="text-xs text-foreground-muted font-normal">/ month</span>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-foreground-muted border-t border-border/40 pt-6">
                  <li className="flex items-center gap-2 font-medium text-foreground">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Everything in Free Tier</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>20-Tab Parallel Review Mode in Chromium</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Smart ATS Match Scoring (0–100%)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>25 Verified HR / Manager contacts per week</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Cloud Sync for saved jobs &amp; history</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Single-laptop hardware lock</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://github.com/snipy09/JobMaxxer/releases/latest"
                className="mt-8 block text-center w-full py-2.5 bg-accent hover:bg-accent-bright text-white rounded-lg font-medium text-xs transition-colors shadow-glow"
              >
                Get Seeker Pro (₹299)
              </a>
            </div>

            {/* Turbo Tier */}
            <div className="border border-border-accent rounded-2xl p-8 bg-surface flex flex-col justify-between relative shadow-card">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap shadow-glow">
                100% Autopilot
              </span>

              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-full mb-1">
                    Hands-Off Automation
                  </div>
                  <h3 className="font-semibold text-lg text-foreground">Seeker Turbo</h3>
                  <p className="text-xs text-foreground-muted mt-1">Full hands-off autonomous workflow</p>
                  <div className="text-4xl font-semibold tracking-tight mt-6 text-foreground">
                    ₹599 <span className="text-xs text-foreground-muted font-normal">/ month</span>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-foreground-muted border-t border-border/40 pt-6">
                  <li className="flex items-center gap-2 font-medium text-foreground">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Everything in Seeker Pro</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium text-foreground">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>100% Autonomous Form Submissions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Adaptive custom question answering</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Unlimited Verified Recruiter Outreach</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Automated referral email sequences</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Priority live feed refreshes (every 15 mins)</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://github.com/snipy09/JobMaxxer/releases/latest"
                className="mt-8 block text-center w-full py-2.5 bg-accent hover:bg-accent-bright text-white rounded-lg font-medium text-xs transition-colors shadow-glow"
              >
                Get Seeker Turbo (₹599)
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6 border-t border-border/40">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono tracking-widest text-accent uppercase">FAQ</span>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-border rounded-xl p-5 bg-surface backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => toggleFaq(i)}
                  className="w-full flex items-center justify-between text-left font-medium text-sm text-foreground"
                >
                  <span>{faq.q}</span>
                  {activeFaq === i ? <ChevronUp className="w-4 h-4 text-foreground-muted" /> : <ChevronDown className="w-4 h-4 text-foreground-muted" />}
                </button>
                {activeFaq === i && (
                  <p className="mt-3 text-xs text-foreground-muted leading-relaxed border-t border-border/40 pt-3">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 px-6 bg-background-deep text-xs text-foreground-muted">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="text-sm font-semibold tracking-tight text-foreground">JobMaxxer</div>
            <p className="text-[11px] text-foreground-muted mt-0.5">Desktop Career Operating System &copy; 2026</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="#/terms" className="hover:text-foreground transition-colors">Terms &amp; Conditions</a>
            <a href="#/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="mailto:support@jobmaxxer.app" className="hover:text-foreground transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
