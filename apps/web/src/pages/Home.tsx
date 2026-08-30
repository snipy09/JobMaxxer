import React, { useState } from 'react';
import {
  ArrowRight, ArrowUpRight, Check, X,
  Shield, Terminal, Laptop, Database,
  Search, Mail, Zap, Layers, BookOpen,
  Code2, Server, Globe, ChevronDown, ChevronUp,
  Menu, FileText, CornerDownRight, CheckCircle2
} from 'lucide-react';

const DISCIPLINES = [
  {
    id: 'frontend',
    title: 'Frontend Architecture',
    badge: 'High Demand',
    tag: 'React 18 · TypeScript · Next.js · Tailwind CSS',
    hours: '140 Hours',
    role: 'UI & Frontend Engineer',
    modules: [
      'Semantic HTML5 & Responsive Layout Engine',
      'Advanced JavaScript (Event Loop, Closures, Async/Await)',
      'React State Architecture & TanStack Query',
      'Browser Performance Profiling & Web Vitals'
    ],
    skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'State Management']
  },
  {
    id: 'backend',
    title: 'Backend & Systems',
    badge: 'Top Comp',
    tag: 'Node.js · Go · PostgreSQL · Redis · Docker',
    hours: '130 Hours',
    role: 'Backend Systems Engineer',
    modules: [
      'RESTful & GraphQL API Architecture',
      'PostgreSQL Schema Design & Query Indexing',
      'Redis Distributed Caching & Pub/Sub',
      'Asynchronous Task Processing & Queues'
    ],
    skills: ['Node.js', 'PostgreSQL', 'Redis', 'Docker', 'System Design']
  },
  {
    id: 'fullstack',
    title: 'Full Stack Engineering',
    badge: 'Versatile',
    tag: 'TypeScript · Full Stack Web · Cloud Architecture',
    hours: '175 Hours',
    role: 'Full Stack Developer',
    modules: [
      'End-to-End Type Safety & Data Validation',
      'Database ORM Integration (Prisma / Drizzle)',
      'Authentication, JWTs & Access Control',
      'CI/CD Pipelines & Cloud Containerization'
    ],
    skills: ['Full Stack', 'TypeScript', 'Prisma', 'REST APIs', 'Cloud']
  },
  {
    id: 'ai',
    title: 'AI & Data Systems',
    badge: 'Emerging',
    tag: 'Vector DBs · RAG Pipelines · pgvector · Python',
    hours: '105 Hours',
    role: 'AI Application Engineer',
    modules: [
      'Vector Embeddings & Similarity Search',
      'Retrieval-Augmented Generation (RAG) Systems',
      'Tool Calling & Autonomous Agent Loops',
      'Evaluation, Caching & System Guardrails'
    ],
    skills: ['AI Architecture', 'RAG Pipelines', 'Vector DBs', 'Python', 'Embeddings']
  },
  {
    id: 'devops',
    title: 'DevOps & Platform',
    badge: 'Infrastructure',
    tag: 'Kubernetes · Terraform · Linux · CI/CD',
    hours: '120 Hours',
    role: 'DevOps Platform Engineer',
    modules: [
      'Linux Kernel Basics & Network Troubleshooting',
      'Infrastructure as Code with Terraform',
      'Container Orchestration with Kubernetes',
      'Observability, Metrics & Telemetry'
    ],
    skills: ['Kubernetes', 'Terraform', 'CI/CD', 'Linux', 'AWS']
  },
  {
    id: 'mobile',
    title: 'Mobile Applications',
    badge: 'Cross-Platform',
    tag: 'React Native · Expo · iOS · Android',
    hours: '115 Hours',
    role: 'Mobile Engineer',
    modules: [
      'React Native Core Primitives & Gesture Handlers',
      'Native Module Bridging & Device Hardware APIs',
      'Offline-First Local Storage Architecture',
      'App Store & Google Play Build Pipelines'
    ],
    skills: ['React Native', 'Expo', 'Mobile UI', 'Offline Sync']
  }
];

const SAMPLE_LISTINGS = [
  {
    title: 'Frontend Engineer',
    company: 'Vercel',
    location: 'Remote',
    source: 'Greenhouse API',
    match: '96% Match',
    compensation: '₹22 LPA · $140k',
    type: 'Full-time'
  },
  {
    title: 'Software Engineering Intern',
    company: 'Linear',
    location: 'Hybrid',
    source: 'Ashby API',
    match: '93% Match',
    compensation: '₹65,000 / mo',
    type: 'Internship'
  },
  {
    title: 'Backend Systems Engineer',
    company: 'Supabase',
    location: 'Remote',
    source: 'Lever API',
    match: '89% Match',
    compensation: '₹26 LPA · $155k',
    type: 'Full-time'
  }
];

const FAQ_ITEMS = [
  {
    question: 'How does JobMaxxer execute automated applications?',
    answer: 'JobMaxxer runs a local, user-controlled Chromium automation engine on your machine. It navigates directly to authentic company career portals (Greenhouse, Lever, Ashby, Internshala), inputs your profile data, uploads your resume, dynamically answers custom form prompts, and submits applications without third-party middleware.'
  },
  {
    question: 'Where do the job postings come from?',
    answer: 'Rather than scraping third-party aggregator websites filled with expired posts, JobMaxxer connects directly to public ATS endpoints and verified company feeds. Postings are cryptographically deduplicated with SHA-256 hashes to guarantee active, live positions.'
  },
  {
    question: 'Is my candidate data and resume secure?',
    answer: 'Yes. JobMaxxer operates local-first. Your master candidate profile, resume files, and private keys are encrypted and stored in an isolated local SQLite database on your computer. Your files and personal details are never uploaded to tracking or advertising databases.'
  },
  {
    question: 'What is the difference between Semi-Auto and Autonomous mode?',
    answer: 'Semi-Auto mode launches up to 20 pre-filled browser tabs simultaneously, allowing you to review each application with one click before submission. Autonomous mode evaluates all fields and custom questions, submitting applications hands-off on your behalf.'
  },
  {
    question: 'What payment methods are supported for subscriptions?',
    answer: 'Upgrades are processed securely through Razorpay inside the desktop application, supporting direct UPI (Google Pay, PhonePe, Paytm, CRED), all major Debit and Credit cards, and Netbanking across Indian and international banks.'
  }
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [activeTrackId, setActiveTrackId] = useState<string>('frontend');
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
  const [selectedJobIndex, setSelectedJobIndex] = useState<number>(0);

  const selectedDiscipline = DISCIPLINES.find(d => d.id === activeTrackId) || DISCIPLINES[0];

  const toggleFaq = (idx: number) => {
    setActiveFaqIndex(activeFaqIndex === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-white text-ink-950 font-sans flex flex-col antialiased selection:bg-ink-950 selection:text-white">
      {/* Top Announcement Bar */}
      <div className="border-b border-ink-100 bg-ink-50 px-4 py-2 text-center text-xs text-ink-600 font-mono tracking-tight flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-ink-950" />
        <span>Desktop Career Operating System v2.0.1 Released · Windows Native</span>
      </div>

      {/* Main Navigation Header */}
      <header className="border-b border-ink-100 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <a href="#/" className="flex items-center gap-2 group">
              <div className="w-6 h-6 rounded bg-ink-950 text-white flex items-center justify-center font-bold text-xs tracking-tighter shadow-fine">
                JM
              </div>
              <span className="font-extrabold text-base tracking-tight text-ink-950">
                JobMaxxer
              </span>
            </a>

            <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-ink-500">
              <a href="#overview" className="hover:text-ink-950 transition-colors">Overview</a>
              <a href="#learner" className="hover:text-ink-950 transition-colors">Learner Track</a>
              <a href="#seeker" className="hover:text-ink-950 transition-colors">Seeker Track</a>
              <a href="#preview" className="hover:text-ink-950 transition-colors">Live Preview</a>
              <a href="#capabilities" className="hover:text-ink-950 transition-colors">Capabilities</a>
              <a href="#pricing" className="hover:text-ink-950 transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-ink-950 transition-colors">FAQ</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/snipy09/JobMaxxer"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex text-xs font-semibold text-ink-600 hover:text-ink-950 px-3.5 py-2 rounded-lg border border-ink-200 hover:bg-ink-50 transition-colors"
            >
              GitHub
            </a>

            <a
              href="https://github.com/snipy09/JobMaxxer/releases/latest"
              className="text-xs font-bold bg-ink-950 hover:bg-ink-800 text-white px-4 py-2 rounded-lg transition-all shadow-fine flex items-center gap-1.5"
            >
              <span>Download Desktop App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg border border-ink-200 text-ink-600 hover:text-ink-950 hover:bg-ink-50 transition-colors"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-ink-200 bg-white px-6 py-4 space-y-3 text-xs font-semibold text-ink-600">
            <a href="#overview" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-ink-950">Overview</a>
            <a href="#learner" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-ink-950">Learner Track</a>
            <a href="#seeker" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-ink-950">Seeker Track</a>
            <a href="#preview" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-ink-950">Live Preview</a>
            <a href="#capabilities" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-ink-950">Capabilities</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-ink-950">Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-ink-950">FAQ</a>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="overview" className="relative pt-24 pb-20 px-6 max-w-5xl mx-auto w-full text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-ink-50 border border-ink-200 rounded-full text-xs font-mono text-ink-600 mb-8 shadow-fine">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-950" />
          <span>Dual-Track Career Operating System</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-ink-950 leading-[1.06] mb-6">
          Learn the skills.<br />
          <span className="text-ink-400">Automate the applications.</span>
        </h1>

        <p className="text-base sm:text-lg text-ink-600 mb-10 max-w-2xl mx-auto leading-relaxed font-normal">
          JobMaxxer is the desktop operating system for software engineers. Master structured technical roadmaps, stream verified direct-company job feeds, and execute client-side stealth automation to apply and connect with hiring teams at scale.
        </p>

        <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center">
          <a
            href="https://github.com/snipy09/JobMaxxer/releases/latest"
            className="w-full sm:w-auto bg-ink-950 hover:bg-ink-800 text-white px-7 py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lifted"
          >
            <span>Download for Windows (Free)</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#preview"
            className="w-full sm:w-auto bg-white hover:bg-ink-50 text-ink-950 border border-ink-200 px-7 py-3.5 rounded-xl font-bold text-xs flex items-center justify-center transition-colors"
          >
            Inspect Interactive Preview
          </a>
        </div>

        {/* Feature Badges */}
        <div className="mt-16 pt-8 border-t border-ink-100 flex flex-wrap items-center justify-center gap-8 text-xs text-ink-500 font-mono">
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-ink-950" /> Local-first SQLite privacy</span>
          <span className="flex items-center gap-1.5"><Laptop className="w-3.5 h-3.5 text-ink-950" /> Single-laptop hardware lock</span>
          <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-ink-950" /> Direct ATS ingest (Zero spam)</span>
        </div>
      </section>

      {/* Interactive Desktop Client Mockup */}
      <section id="preview" className="px-6 pb-24 max-w-5xl mx-auto w-full">
        <div className="bg-ink-950 text-white rounded-3xl p-6 sm:p-8 shadow-float border border-ink-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink-800 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-ink-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-ink-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-ink-700" />
              <span className="text-xs font-mono text-ink-400 ml-2">JobMaxxer Client / Opportunity Stream</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-ink-900 text-ink-300 border border-ink-800">
                Direct ATS Feed Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-left mb-5">
            {SAMPLE_LISTINGS.map((job, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedJobIndex(idx)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                  selectedJobIndex === idx
                    ? 'bg-ink-900 border-white text-white shadow-dark-fine'
                    : 'bg-ink-900/60 border-ink-800 hover:border-ink-700 text-ink-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ink-400 font-bold">{job.company}</span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white text-ink-950">{job.match}</span>
                </div>
                <h4 className="text-sm font-bold text-white">{job.title}</h4>
                <div className="text-xs text-ink-400 font-mono">{job.compensation}</div>
                <div className="flex items-center justify-between pt-2 border-t border-ink-800 text-[11px] text-ink-400 font-mono">
                  <span>{job.location} · {job.type}</span>
                  <span className="text-white font-semibold flex items-center gap-1">
                    Auto-Fill <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-ink-900 rounded-2xl p-4 border border-ink-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-ink-300">
              <Terminal className="w-4 h-4 text-white shrink-0" />
              <span>Target: <strong className="text-white">{SAMPLE_LISTINGS[selectedJobIndex].title}</strong> at <strong className="text-white">{SAMPLE_LISTINGS[selectedJobIndex].company}</strong> ({SAMPLE_LISTINGS[selectedJobIndex].source})</span>
            </div>
            <div className="text-[11px] text-ink-400">
              Playwright Stealth Engine Ready
            </div>
          </div>
        </div>
      </section>

      {/* The Bottleneck Comparison Matrix */}
      <section className="py-24 px-6 border-t border-ink-100 bg-ink-50">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono tracking-widest text-ink-400 uppercase font-semibold">The Bottleneck</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink-950">Why traditional job hunting is broken.</h2>
            <p className="text-xs text-ink-500">Manual forms and aggregator reposts consume hours of engineering bandwidth with low returns.</p>
          </div>

          <div className="bg-white border border-ink-200 rounded-3xl p-8 shadow-fine overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-mono">
              <div className="space-y-4">
                <div className="text-ink-400 uppercase font-bold tracking-wider border-b border-ink-100 pb-2">
                  Traditional Job Hunting
                </div>
                <div className="space-y-3 text-ink-600">
                  <div className="flex items-center gap-2 text-ink-700">
                    <X className="w-4 h-4 text-ink-400 shrink-0" />
                    <span>20-minute manual form entry per position</span>
                  </div>
                  <div className="flex items-center gap-2 text-ink-700">
                    <X className="w-4 h-4 text-ink-400 shrink-0" />
                    <span>Expired &amp; reposted third-party listings</span>
                  </div>
                  <div className="flex items-center gap-2 text-ink-700">
                    <X className="w-4 h-4 text-ink-400 shrink-0" />
                    <span>Guessing recruiter emails with high bounce rates</span>
                  </div>
                  <div className="flex items-center gap-2 text-ink-700">
                    <X className="w-4 h-4 text-ink-400 shrink-0" />
                    <span>Disconnected learning paths with no skill tracking</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t md:border-t-0 md:border-l border-ink-100 pt-6 md:pt-0 md:pl-8">
                <div className="text-ink-950 uppercase font-bold tracking-wider border-b border-ink-100 pb-2">
                  JobMaxxer Operating System
                </div>
                <div className="space-y-3 text-ink-900 font-semibold">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>1-Click stealth batch apply in Chromium</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>Direct ATS JSON streaming (Greenhouse, Lever, Ashby)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>4-Stage SMTP/DNS verified HR inboxes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>Structured roadmaps with 1-click profile skill sync</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dual-Persona Architecture */}
      <section className="py-24 px-6 border-t border-ink-100">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono tracking-widest text-ink-400 uppercase font-semibold">Dual-Track Architecture</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink-950">Designed for both learning and scaling.</h2>
            <p className="text-xs text-ink-500">Whether mastering new technologies or executing active application campaigns, JobMaxxer adapts to your phase.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Learner Track */}
            <div id="learner" className="bg-ink-50 border border-ink-200 rounded-3xl p-8 space-y-6 shadow-fine">
              <div className="w-10 h-10 rounded-xl bg-white border border-ink-200 flex items-center justify-center text-ink-950 shadow-fine">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-ink-950 tracking-tight">The Learner Track</h3>
                <p className="text-xs text-ink-600 leading-relaxed">
                  Tailored for students and engineers establishing job-ready competency across modern technical stacks.
                </p>
              </div>
              <ul className="space-y-3 text-xs text-ink-700">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-ink-950 shrink-0" />
                  <span>Structured roadmaps across Frontend, Backend, Fullstack, AI, DevOps &amp; Mobile</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-ink-950 shrink-0" />
                  <span>Curated documentation links, open-source repositories &amp; interview flashcards</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-ink-950 shrink-0" />
                  <span>Job-Readiness score meter with 1-click skill synchronization into your profile</span>
                </li>
              </ul>
            </div>

            {/* Seeker Track */}
            <div id="seeker" className="bg-ink-50 border border-ink-200 rounded-3xl p-8 space-y-6 shadow-fine">
              <div className="w-10 h-10 rounded-xl bg-white border border-ink-200 flex items-center justify-center text-ink-950 shadow-fine">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-ink-950 tracking-tight">The Seeker Track</h3>
                <p className="text-xs text-ink-600 leading-relaxed">
                  Designed for active candidates ready to execute automated applications and direct recruiter outreach.
                </p>
              </div>
              <ul className="space-y-3 text-xs text-ink-700">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-ink-950 shrink-0" />
                  <span>Direct ATS job stream from Greenhouse, Lever, Ashby, and top boards</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-ink-950 shrink-0" />
                  <span>Semi-Auto 20-tab review mode + 100% Autonomous form submitter</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-ink-950 shrink-0" />
                  <span>Direct Hiring Manager discovery with 4-stage verified email outreach</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Career Track Explorer */}
      <section className="py-24 px-6 border-t border-ink-100 bg-white">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono tracking-widest text-ink-400 uppercase font-semibold">Curriculum Breakdown</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink-950">Engineering Roadmaps</h2>
            <p className="text-xs text-ink-500">Select a discipline to inspect modules, estimated duration, and target skills.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {DISCIPLINES.map(d => (
              <button
                key={d.id}
                onClick={() => setActiveTrackId(d.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTrackId === d.id
                    ? 'bg-ink-950 text-white shadow-fine'
                    : 'bg-ink-50 text-ink-600 hover:text-ink-950 hover:bg-ink-100 border border-ink-200'
                }`}
              >
                {d.title}
              </button>
            ))}
          </div>

          <div className="bg-ink-50 border border-ink-200 rounded-3xl p-6 sm:p-8 shadow-fine space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink-200 pb-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-bold text-ink-950">{selectedDiscipline.title}</h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white text-ink-800 border border-ink-200">
                    {selectedDiscipline.badge}
                  </span>
                </div>
                <p className="text-xs text-ink-500 font-mono mt-1">{selectedDiscipline.tag}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-ink-400">Estimated Duration:</span>
                <div className="text-sm font-bold text-ink-950">{selectedDiscipline.hours}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-ink-400 font-bold">Curriculum Modules:</h4>
                <ul className="space-y-2 text-xs text-ink-700">
                  {selectedDiscipline.modules.map((m, idx) => (
                    <li key={idx} className="flex items-center gap-2 bg-white p-3 rounded-xl border border-ink-200">
                      <span className="text-[10px] font-mono text-ink-400 font-bold">0{idx + 1}</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-ink-400 font-bold">Skills Pushed to Profile:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDiscipline.skills.map((sk, idx) => (
                    <span key={idx} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-ink-200 text-ink-900">
                      {sk}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-ink-500 pt-3 leading-relaxed">
                  Completing milestones in the desktop application dynamically calculates your Job-Readiness Score. When ready, 1-click transfers all acquired skills into your Seeker profile for automated matching.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Bento Grid */}
      <section id="capabilities" className="py-24 px-6 border-t border-ink-100 bg-ink-50">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono tracking-widest text-ink-400 uppercase font-semibold">Core Capabilities</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink-950">Precision engineering for your search.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-ink-200 rounded-3xl p-8 space-y-3 shadow-fine md:col-span-2 hover:border-ink-300 transition-all">
              <div className="w-9 h-9 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-center text-ink-950">
                <Search className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-base text-ink-950">Direct ATS Opportunity Stream</h4>
              <p className="text-xs text-ink-600 leading-relaxed">
                Job listings are ingested directly from public ATS endpoints (Greenhouse, Lever, Ashby, and Internshala) with SHA-256 deduplication. Filter by remote, compensation, experience level, or match score without aggregator noise.
              </p>
            </div>

            <div className="bg-white border border-ink-200 rounded-3xl p-8 space-y-3 shadow-fine hover:border-ink-300 transition-all">
              <div className="w-9 h-9 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-center text-ink-950">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-base text-ink-950">Playwright Stealth Engine</h4>
              <p className="text-xs text-ink-600 leading-relaxed">
                Launches local Chromium instances with natural interaction patterns, avoiding anti-bot triggers while accurately pre-filling and submitting forms.
              </p>
            </div>

            <div className="bg-white border border-ink-200 rounded-3xl p-8 space-y-3 shadow-fine hover:border-ink-300 transition-all">
              <div className="w-9 h-9 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-center text-ink-950">
                <Mail className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-base text-ink-950">0-Bounce Recruiter Outreach</h4>
              <p className="text-xs text-ink-600 leading-relaxed">
                4-stage verification (Syntax / Role Filter / DNS MX / Real-time SMTP Handshake) ensures messages reach the hiring manager's primary inbox.
              </p>
            </div>

            <div className="bg-white border border-ink-200 rounded-3xl p-8 space-y-3 shadow-fine md:col-span-2 hover:border-ink-300 transition-all">
              <div className="w-9 h-9 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-center text-ink-950">
                <Shield className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-base text-ink-950">Local-First Storage &amp; Hardware Lock</h4>
              <p className="text-xs text-ink-600 leading-relaxed">
                Your profile, resume documents, and private keys are saved locally in SQLite (`sql.js`). Hardware fingerprinting guarantees that your active session is securely tied to your authorized machine.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (3 Tiers, All Sales Final) */}
      <section id="pricing" className="py-24 px-6 border-t border-ink-100 bg-white">
        <div className="max-w-6xl mx-auto text-center space-y-16">
          <div className="max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono tracking-widest text-ink-400 uppercase font-semibold">Pricing</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink-950">Start Free. Scale With Automation.</h2>
            <p className="text-xs text-ink-500">Upgrade directly inside the desktop application via Razorpay. All sales are final.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className="border border-ink-200 rounded-3xl p-8 bg-white flex flex-col justify-between hover:border-ink-300 transition-all shadow-fine">
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg text-ink-950">Learner &amp; Seeker Free</h3>
                  <p className="text-xs text-ink-500 mt-1">For exploring roadmaps &amp; live job boards</p>
                  <div className="text-4xl font-extrabold tracking-tight mt-6 text-ink-950">
                    ₹0 <span className="text-xs text-ink-400 font-normal font-mono">/ forever</span>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-ink-700 border-t border-ink-100 pt-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>Access to all Engineering Roadmaps</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>Curated Resource Vault &amp; Interview Questions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>Live Job Board stream (1,000+ positions)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>Job-readiness score calculation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>Direct manual career portal links</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://github.com/snipy09/JobMaxxer/releases/latest"
                className="mt-8 block text-center w-full py-3 bg-ink-50 hover:bg-ink-100 border border-ink-200 text-ink-950 rounded-xl font-bold text-xs transition-colors"
              >
                Download Free Version
              </a>
            </div>

            {/* Pro Tier */}
            <div className="border border-ink-300 rounded-3xl p-8 bg-white flex flex-col justify-between hover:border-ink-950 transition-all shadow-lifted relative">
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-ink-950 bg-ink-100 px-2.5 py-0.5 rounded-full mb-1 font-bold">
                    Semi-Autonomous
                  </div>
                  <h3 className="font-bold text-lg text-ink-950">Seeker Pro</h3>
                  <p className="text-xs text-ink-500 mt-1">Accelerate applications with review mode</p>
                  <div className="text-4xl font-extrabold tracking-tight mt-6 text-ink-950">
                    ₹299 <span className="text-xs text-ink-400 font-normal font-mono">/ month</span>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-ink-700 border-t border-ink-100 pt-6">
                  <li className="flex items-center gap-2 font-bold text-ink-950">
                    <Check className="w-4 h-4 text-ink-950 shrink-0 font-bold" />
                    <span>Everything in Free Tier</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>20-Tab Parallel Review Mode in Chromium</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>Smart ATS Match Scoring (0–100%)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>25 Verified HR / Manager contacts per week</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>Cloud Sync for saved jobs &amp; history</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>Single-laptop hardware lock</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://github.com/snipy09/JobMaxxer/releases/latest"
                className="mt-8 block text-center w-full py-3 bg-ink-950 hover:bg-ink-800 text-white rounded-xl font-bold text-xs transition-colors shadow-fine"
              >
                Get Seeker Pro (₹299)
              </a>
            </div>

            {/* Turbo Tier */}
            <div className="border border-ink-950 rounded-3xl p-8 bg-ink-950 text-white flex flex-col justify-between relative shadow-float">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-ink-950 text-[10px] font-mono uppercase tracking-widest px-3 py-0.5 rounded-full whitespace-nowrap font-bold shadow-fine">
                100% Autopilot
              </span>

              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-ink-300 bg-ink-900 px-2.5 py-0.5 rounded-full mb-1 font-bold">
                    Hands-Off Automation
                  </div>
                  <h3 className="font-bold text-lg text-white">Seeker Turbo</h3>
                  <p className="text-xs text-ink-400 mt-1">Full hands-off autonomous workflow</p>
                  <div className="text-4xl font-extrabold tracking-tight mt-6 text-white">
                    ₹599 <span className="text-xs text-ink-400 font-normal font-mono">/ month</span>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-ink-300 border-t border-ink-800 pt-6">
                  <li className="flex items-center gap-2 font-bold text-white">
                    <Check className="w-4 h-4 text-white shrink-0 font-bold" />
                    <span>Everything in Seeker Pro</span>
                  </li>
                  <li className="flex items-center gap-2 font-bold text-white">
                    <Check className="w-4 h-4 text-white shrink-0 font-bold" />
                    <span>100% Autonomous Form Submissions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-white shrink-0" />
                    <span>Adaptive custom question answering</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-white shrink-0" />
                    <span>Unlimited Verified Recruiter Outreach</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-white shrink-0" />
                    <span>Automated referral email sequences</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-white shrink-0" />
                    <span>Priority live feed refreshes (every 15 mins)</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://github.com/snipy09/JobMaxxer/releases/latest"
                className="mt-8 block text-center w-full py-3 bg-white hover:bg-ink-100 text-ink-950 rounded-xl font-bold text-xs transition-colors shadow-fine"
              >
                Get Seeker Turbo (₹599)
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6 border-t border-ink-100 bg-ink-50">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono tracking-widest text-ink-400 uppercase font-semibold">FAQ</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink-950">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} className="border border-ink-200 rounded-2xl p-5 bg-white shadow-fine">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between text-left font-bold text-xs sm:text-sm text-ink-950"
                >
                  <span>{item.question}</span>
                  {activeFaqIndex === idx ? <ChevronUp className="w-4 h-4 text-ink-400" /> : <ChevronDown className="w-4 h-4 text-ink-400" />}
                </button>
                {activeFaqIndex === idx && (
                  <p className="mt-3 text-xs text-ink-600 leading-relaxed border-t border-ink-100 pt-3">
                    {item.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Minimalist Monochrome Footer */}
      <footer className="border-t border-ink-100 py-12 px-6 bg-white text-xs text-ink-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="text-sm font-extrabold tracking-tight text-ink-950">JobMaxxer</div>
            <p className="text-[11px] text-ink-400 mt-0.5 font-mono">Desktop Career Operating System / 2026</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 font-semibold">
            <a href="#/terms" className="hover:text-ink-950 transition-colors">Terms of Service</a>
            <a href="#/privacy" className="hover:text-ink-950 transition-colors">Privacy Policy</a>
            <a href="mailto:support@jobmaxxer.app" className="hover:text-ink-950 transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
