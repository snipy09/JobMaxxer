import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, Check, X, Shield, Terminal,
  Laptop, Search, Mail, Zap, BookOpen,
  ChevronDown, ChevronUp, Menu, Briefcase,
  Download as DownloadIcon, Layers, Sparkles,
  Code, Flame, CheckCircle2, Cpu, ExternalLink,
  Lock, Unlock, Play, RefreshCw, Send, Star,
  Award, Activity, Sliders, Eye
} from 'lucide-react';
import { SpotlightCard } from '../components/SpotlightCard';

// Career Roadmaps data aligned with the latest unified specification
const CAREER_DOMAINS = [
  {
    id: 'tech-engineering',
    title: 'Software & Cloud Engineering',
    badge: 'Top Demand',
    tag: 'Full-Stack · Distributed Systems · React 18 · Node.js · APIs',
    hours: '140 Hours',
    role: 'Full-Stack Developer / Cloud Software Engineer',
    modules: [
      'Semantic HTML, CSS Tokens & Modern Web Accessibility',
      'JavaScript ES6+, Asynchronous Event Loops & Performance',
      'React 18 Architecture, Custom Hooks & Server Components',
      'Relational Databases, API Design, Docker & CI/CD Pipelines'
    ],
    skills: ['React 18', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'System Design']
  },
  {
    id: 'product-management',
    title: 'Product & Project Management',
    badge: 'High Impact',
    tag: 'Product Discovery · PRDs · Agile Sprints · RICE Prioritization',
    hours: '90 Hours',
    role: 'Associate Product Manager / Technical Project Lead',
    modules: [
      'Product Opportunity Analysis & Customer User Interviews',
      'PRD Documentation & User Story Journey Mapping',
      'Data-Driven Prioritization (RICE / MoSCoW Frameworks)',
      'Cross-Functional Stakeholder Alignment & Go-To-Market Execution'
    ],
    skills: ['Product Discovery', 'PRD Authoring', 'Roadmapping', 'Agile / Scrum', 'Metrics & KPIs']
  },
  {
    id: 'design-ux',
    title: 'UI/UX & Product Design',
    badge: 'Creative',
    tag: 'Figma Systems · Micro-Interactions · WCAG A11y · Usability',
    hours: '85 Hours',
    role: 'Product Designer / Design Systems Specialist',
    modules: [
      'User Research, Persona Development & Mental Models',
      'Wireframing, Rapid Prototyping & Micro-Interactions',
      'Design System Creation & Multi-Platform Component Tokens',
      'Usability Audits & Design-to-Development Engineering Handoff'
    ],
    skills: ['Figma', 'UI/UX Architecture', 'Design Systems', 'Usability Audits', 'Prototyping']
  },
  {
    id: 'data-analytics',
    title: 'Data & Business Intelligence',
    badge: 'Analytical',
    tag: 'SQL Modeling · Python · Dashboards · Statistical Inference',
    hours: '95 Hours',
    role: 'Data Analyst / Business Intelligence Strategist',
    modules: [
      'Advanced SQL Querying, Window Functions & Star Schemas',
      'Business Intelligence Dashboards & Actionable Visualizations',
      'Exploratory Data Analysis & Statistical Hypothesis Testing',
      'Translating Complex Metrics into Executive Strategic Decisions'
    ],
    skills: ['SQL', 'Data Modeling', 'PowerBI / Tableau', 'Python', 'Statistical Inference']
  },
  {
    id: 'growth-marketing',
    title: 'Growth & Performance Marketing',
    badge: 'Strategic',
    tag: 'Attribution · SEO · CRO · Paid Acquisition · Retention Loops',
    hours: '80 Hours',
    role: 'Growth Specialist / Performance Marketing Lead',
    modules: [
      'Audience Segmentation & Multi-Touch Acquisition Funnels',
      'Technical SEO, High-Authority Content & Semantic Search',
      'Paid Ad Strategy (Google / Meta) & Unit Economics (CAC/LTV)',
      'Conversion Rate Optimization (CRO) & Product Retention Loops'
    ],
    skills: ['Performance Marketing', 'Technical SEO', 'CRO Testing', 'Funnel Analytics', 'Attribution']
  },
  {
    id: 'finance-operations',
    title: 'Finance, Sales & Operations',
    badge: 'Commercial',
    tag: 'Financial Modeling · CRM Pipelines · Supply Chain · B2B Sales',
    hours: '85 Hours',
    role: 'Operations Analyst / B2B Account Executive',
    modules: [
      'Three-Statement Financial Models & Cash Flow Forecasting',
      'Operational Process Automation & Supply Chain Workflows',
      'Consultative Enterprise Sales & Pipeline Management in CRM',
      'Client Onboarding, Customer Success & Net Revenue Retention'
    ],
    skills: ['Financial Modeling', 'CRM Pipelines', 'Process Automation', 'B2B Sales', 'Unit Economics']
  }
];

// Curated live ATS job postings simulation
const SAMPLE_ATS_LISTINGS = [
  {
    id: 'job-1',
    title: 'Full-Stack Software Engineer',
    company: 'Linear',
    location: 'Remote · Global',
    source: 'Ashby Direct ATS',
    match: 98,
    type: 'Full-time',
    compensation: 'Competitive Base + Equity',
    sha256: '9f83a4...01ce',
    domain: 'tech-engineering'
  },
  {
    id: 'job-2',
    title: 'Associate Product Manager',
    company: 'Stripe',
    location: 'Remote · US/EU/India',
    source: 'Greenhouse Direct ATS',
    match: 95,
    type: 'Full-time',
    compensation: 'Tier-1 Industry Comp',
    sha256: 'e412b9...82aa',
    domain: 'product-management'
  },
  {
    id: 'job-3',
    title: 'Product Designer (Design Systems)',
    company: 'Vercel',
    location: 'Remote',
    source: 'Lever Direct ATS',
    match: 92,
    type: 'Full-time',
    compensation: 'Global Remote Package',
    sha256: '7b54d1...49cf',
    domain: 'design-ux'
  },
  {
    id: 'job-4',
    title: 'Data & Analytics Specialist',
    company: 'Supabase',
    location: 'Remote',
    source: 'Greenhouse Direct ATS',
    match: 89,
    type: 'Full-time',
    compensation: 'Competitive Package + Stock',
    sha256: 'c301ae...11d8',
    domain: 'data-analytics'
  }
];

// Authoritative FAQs for SEO rich snippets and user clarity
const FAQ_ITEMS = [
  {
    question: 'What is Hirestack and how does the desktop app operate?',
    answer: 'Hirestack is an enterprise-grade desktop career acceleration operating system built with Electron, React 18, and local SQLite (sql.js). It consolidates two critical workflows into one app: the Learner Hub (a Duolingo-style milestone tree with interactive code practice, quizzes, and project challenges) and the Seeker Hub (a 1,000+ source direct ATS job radar, RAM-safe Chromium auto-apply, and 4-stage 0%-bounce HR cold email outreach).'
  },
  {
    question: 'How does the Duolingo-style Learner Hub accelerate career readiness?',
    answer: 'The Learner Hub dynamically calibrates to your target role, target timeline (1 month, 2–3 months, 6 months, or 1 year), and daily commitment (1h, 3h, or 5h/day). It guides you through an interactive serpentine progression tree where every node contains a 3-step loop: Learn (zero-fluff masterclasses, official docs, textbook references), Practice (embedded interactive code sandbox and quizzes), and Apply (real-world portfolio projects). With 1 click, all unlocked competencies sync into your candidate profile for ATS ranking.'
  },
  {
    question: 'How does the 1,000+ Source ATS Radar eliminate ghost jobs?',
    answer: 'Unlike third-party aggregator sites that repost stale listings, Hirestack streams directly from official company ATS JSON endpoints (Greenhouse, Lever, Ashby, Internshala, and custom company career portals). Every single listing is cryptographically deduplicated with SHA-256 hashes, and unrefreshed postings are auto-purged after 14 days, guaranteeing a 100% live feed with zero aggregator noise.'
  },
  {
    question: 'What is the difference between Semi-Auto and 100% Autonomous Auto-Apply?',
    answer: 'Semi-Autonomous Mode launches a controlled queue of 3–5 parallel Chromium tabs (strictly capped so student laptops with 8GB RAM never crash), pre-filling all candidate information and resume files while pausing for your 1-click final review. 100% Autonomous Mode uses Playwright Stealth and Groq LLaMA 3.1 8B to resolve custom open-ended questions in the background, caching recurring responses locally in SQLite to guarantee zero-latency execution.'
  },
  {
    question: 'How does the 4-Stage HR Email Verifier guarantee 0% bounce rates?',
    answer: 'Before dispatching cold outreach, Hirestack runs a mandatory 4-stage verification: (1) RFC 5322 Syntax Validation, (2) Role & Disposable filter to exclude generic inboxes, (3) Real-time DNS MX record verification, and (4) Direct SMTP socket ping with a non-existent mailbox probe (xyzrandom123@domain.com) to detect catch-all servers. Messages are dispatched with humanized 60s–180s delays capped at 15–25 emails/day to protect your sender reputation.'
  },
  {
    question: 'How is candidate privacy and license security handled?',
    answer: 'Hirestack operates local-first. Your master candidate profile, work history, resumes, and credentials remain securely stored in an isolated SQLite database on your computer. Free 3-day trials and paid licenses are cryptographically bound to your hardware fingerprint (UUID + CPU ID) via Google OAuth, preventing throwaway email abuse.'
  },
  {
    question: 'What are the subscription plans and payment methods?',
    answer: 'Hirestack offers 4 tiers: Free 3-Day Trial (₹0, hardware-locked full trial with top 10 job stream), Learner Pro (₹79/month, full Duolingo skill trees, coding drills, textbook vault), Seeker Pro (₹149/month, 1,000+ ATS radar, 50 semi-auto applies/week, 25 HR leads), and Seeker Max (₹299/month, complete suite with unlimited autonomous auto-apply and HR outreach). Upgrades are processed securely through Razorpay via UPI (GPay, PhonePe, Paytm, CRED), Netbanking, and Cards. All sales are final.'
  }
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [activeDomainId, setActiveDomainId] = useState<string>('tech-engineering');
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
  
  // Interactive OS Showcase State
  const [osActiveTab, setOsActiveTab] = useState<'learner' | 'seeker' | 'outreach'>('learner');
  
  // Learner Hub interactive demo state
  const [activeNodeIndex, setActiveNodeIndex] = useState<number>(2); // Node 3 (Active)
  const [learnerStep, setLearnerStep] = useState<'learn' | 'practice' | 'apply'>('practice');
  const [codeTestRan, setCodeTestRan] = useState<boolean>(false);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [skillsSynced, setSkillsSynced] = useState<boolean>(false);

  // Seeker Hub interactive demo state
  const [selectedJobId, setSelectedJobId] = useState<string>('job-1');
  const [autoApplyMode, setAutoApplyMode] = useState<'semi' | 'auto'>('auto');
  const [applyStep, setApplyStep] = useState<number>(0);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // Outreach Simulator state
  const [testEmail, setTestEmail] = useState<string>('alex.turner@linear.app');
  const [verifyingEmail, setVerifyingEmail] = useState<boolean>(false);
  const [verifyResult, setVerifyResult] = useState<{
    syntax: boolean;
    roleFilter: boolean;
    dnsMx: boolean;
    smtpHandshake: boolean;
    catchAllSafe: boolean;
  } | null>({
    syntax: true,
    roleFilter: true,
    dnsMx: true,
    smtpHandshake: true,
    catchAllSafe: true,
  });

  // Pricing duration toggle: monthly vs 3-month pass
  const [pricingCycle, setPricingCycle] = useState<'monthly' | 'quarterly'>('monthly');

  const selectedDomain = CAREER_DOMAINS.find(d => d.id === activeDomainId) || CAREER_DOMAINS[0];
  const selectedJob = SAMPLE_ATS_LISTINGS.find(j => j.id === selectedJobId) || SAMPLE_ATS_LISTINGS[0];

  // Simulation: Run Code Challenge in Learner Hub
  const handleRunCodeTest = () => {
    setCodeTestRan(true);
  };

  // Simulation: Sync Skills to Seeker Profile
  const handleSyncSkills = () => {
    setSkillsSynced(true);
    setTimeout(() => setSkillsSynced(false), 3500);
  };

  // Simulation: Auto-Apply Flow
  const handleStartApplySimulation = () => {
    if (isApplying) return;
    setIsApplying(true);
    setApplyStep(1);

    setTimeout(() => setApplyStep(2), 700);
    setTimeout(() => setApplyStep(3), 1500);
    setTimeout(() => {
      setApplyStep(4);
      setIsApplying(false);
    }, 2300);
  };

  // Simulation: Verify HR Email
  const handleVerifyEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setVerifyingEmail(true);
    setVerifyResult(null);

    setTimeout(() => {
      setVerifyingEmail(false);
      const isBad = testEmail.includes('info@') || testEmail.includes('support@') || !testEmail.includes('@');
      setVerifyResult({
        syntax: testEmail.includes('@') && testEmail.includes('.'),
        roleFilter: !isBad,
        dnsMx: true,
        smtpHandshake: true,
        catchAllSafe: true,
      });
    }, 600);
  };

  const toggleFaq = (idx: number) => {
    setActiveFaqIndex(activeFaqIndex === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f] font-sans antialiased selection:bg-[#0071e3] selection:text-white flex flex-col">
      {/* Apple-Style Minimal Release Banner */}
      <aside aria-label="Announcement" className="border-b border-black/[0.06] bg-white/70 backdrop-blur-md px-4 py-2 text-center text-[11px] sm:text-xs text-[#86868b] font-medium tracking-tight flex items-center justify-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" />
        <span className="font-semibold text-[#1d1d1f]">Hirestack v2.0.1 Released</span>
        <span className="hidden sm:inline text-[#86868b]">· Duolingo-style skill progression, 1,000+ source direct ATS radar &amp; 0%-bounce HR outreach.</span>
        <a href="#/download" className="text-[#0071e3] hover:underline font-semibold ml-1 inline-flex items-center gap-0.5">
          Download Free <ArrowRight className="w-3 h-3" />
        </a>
      </aside>

      {/* Floating Apple-Grade Frosted Navigation */}
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/80 apple-blur transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-6 lg:gap-8">
            <a href="#/" className="flex items-center gap-2.5 group">
              <img
                src="./logo-icon.png"
                alt="Hirestack Official Logo"
                className="h-7 w-7 rounded-lg object-contain transition-transform group-hover:scale-105 shadow-sm"
              />
              <span className="font-bold text-base tracking-tight text-[#1d1d1f]">
                Hirestack
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/[0.05] text-[#86868b] border border-black/[0.04]">
                v2.0.1
              </span>
            </a>

            <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-[#86868b]">
              <a href="#interactive-os" className="hover:text-[#1d1d1f] transition-colors">Platform OS</a>
              <a href="#learner-hub" className="hover:text-[#1d1d1f] transition-colors">Learner Hub</a>
              <a href="#seeker-hub" className="hover:text-[#1d1d1f] transition-colors">Seeker Hub</a>
              <a href="#capabilities" className="hover:text-[#1d1d1f] transition-colors">Defensive Tech</a>
              <a href="#roadmaps" className="hover:text-[#1d1d1f] transition-colors">Roadmaps</a>
              <a href="#pricing" className="hover:text-[#1d1d1f] transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-[#1d1d1f] transition-colors">FAQ</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#/download"
              className="text-xs font-semibold bg-[#1d1d1f] hover:bg-[#000000] text-white px-4 py-2 rounded-full transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              <span>Download Desktop App</span>
            </a>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg border border-black/[0.08] text-[#1d1d1f] hover:bg-black/[0.04] transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-black/[0.08] bg-white/95 apple-blur px-6 py-4 space-y-3 text-xs font-medium text-[#1d1d1f] shadow-lg">
            <a href="#interactive-os" onClick={() => setMobileMenuOpen(false)} className="block py-1">Platform OS</a>
            <a href="#learner-hub" onClick={() => setMobileMenuOpen(false)} className="block py-1">Learner Hub</a>
            <a href="#seeker-hub" onClick={() => setMobileMenuOpen(false)} className="block py-1">Seeker Hub</a>
            <a href="#capabilities" onClick={() => setMobileMenuOpen(false)} className="block py-1">Defensive Tech</a>
            <a href="#roadmaps" onClick={() => setMobileMenuOpen(false)} className="block py-1">Roadmaps</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-1">Pricing (₹0 – ₹299)</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-1">FAQ</a>
            <div className="pt-2 border-t border-black/[0.06]">
              <a
                href="#/download"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 bg-[#1d1d1f] text-white rounded-xl font-semibold flex items-center justify-center gap-1.5"
              >
                <DownloadIcon className="w-4 h-4" />
                <span>Download for Windows (Free)</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section — Apple Minimalist Typography & Space */}
      <main className="flex-1">
        <section className="relative pt-16 sm:pt-24 pb-16 sm:pb-24 px-4 sm:px-6 max-w-5xl mx-auto w-full text-center">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-tr from-[#0071e3]/10 via-[#42a5f5]/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

          {/* Frosted Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/80 border border-black/[0.08] rounded-full text-xs font-medium text-[#1d1d1f] mb-6 sm:mb-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <span className="w-2 h-2 rounded-full bg-[#0071e3]" />
            <span>Single-Laptop Desktop OS · Windows, macOS &amp; Linux · Local SQLite Privacy</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#1d1d1f] leading-[1.08] mb-6 sm:mb-8">
            Master every skill.<br />
            <span className="text-[#86868b]">Automate every application.</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-[#6e6e73] mb-10 max-w-2xl mx-auto leading-relaxed font-normal">
            Hirestack is the desktop career operating system. Progress through an interactive Duolingo-style milestone tree, stream 1,000+ verified direct-company ATS opportunities without ghost jobs, and execute stealth client-side auto-apply with 0%-bounce HR outreach.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center w-full max-w-md sm:max-w-none mx-auto mb-14">
            <a
              href="#/download"
              className="w-full sm:w-auto bg-[#1d1d1f] hover:bg-[#000000] text-white px-7 py-3.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Download for Windows (Free)</span>
            </a>
            <a
              href="#interactive-os"
              className="w-full sm:w-auto bg-white/80 hover:bg-white text-[#1d1d1f] border border-black/[0.1] px-7 py-3.5 rounded-full font-semibold text-sm flex items-center justify-center transition-all shadow-sm"
            >
              Explore Interactive Platform OS
            </a>
          </div>

          {/* Apple Trust Features Ribbon */}
          <div className="pt-8 border-t border-black/[0.06] flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-[#86868b] font-mono">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#1d1d1f]" /> Local-First SQLite Privacy
            </span>
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[#1d1d1f]" /> 1,000+ Direct ATS Ingestion
            </span>
            <span className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#1d1d1f]" /> Hardware Fingerprint Locked
            </span>
            <span className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#1d1d1f]" /> 4-Stage 0%-Bounce HR Inboxes
            </span>
          </div>
        </section>

        {/* Interactive Desktop OS Showcase Window (The Apple Hardware / App Mockup) */}
        <section id="interactive-os" className="px-4 sm:px-6 pb-20 sm:pb-32 max-w-6xl mx-auto w-full">
          <div className="text-center max-w-xl mx-auto space-y-2 mb-8 sm:mb-10">
            <span className="text-xs font-mono tracking-widest text-[#86868b] uppercase font-bold">Interactive Platform OS</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#1d1d1f]">
              Experience the dual-engine client.
            </h2>
            <p className="text-xs sm:text-sm text-[#86868b]">
              Switch between the Learner Hub, Seeker Hub, and HR Outreach Verifier below to test real in-app workflows.
            </p>
          </div>

          {/* macOS Style Window Container */}
          <div className="bg-[#121215] text-white rounded-3xl p-4 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.08)] border border-white/[0.08]">
            {/* macOS Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                <span className="text-xs font-mono text-zinc-400 ml-2 truncate">
                  Hirestack Desktop Client · Hardware Session: <strong className="text-zinc-200">UUID-9482-LOCKED</strong>
                </span>
              </div>

              {/* Segmented Control Switcher */}
              <div className="inline-flex p-1 bg-zinc-900/90 rounded-xl border border-white/[0.1] text-xs font-semibold">
                <button
                  onClick={() => setOsActiveTab('learner')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    osActiveTab === 'learner'
                      ? 'bg-white text-black shadow-sm font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Learner Hub</span>
                </button>
                <button
                  onClick={() => setOsActiveTab('seeker')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    osActiveTab === 'seeker'
                      ? 'bg-white text-black shadow-sm font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Seeker Hub</span>
                </button>
                <button
                  onClick={() => setOsActiveTab('outreach')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    osActiveTab === 'outreach'
                      ? 'bg-white text-black shadow-sm font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Outreach Verifier</span>
                </button>
              </div>
            </div>

            {/* TAB 1: LEARNER HUB (Duolingo-Style Tree & Mastery Loop) */}
            {osActiveTab === 'learner' && (
              <div className="space-y-6">
                {/* Learner Dashboard Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-900/80 p-3.5 rounded-2xl border border-white/[0.06] text-xs font-mono">
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Target Domain</span>
                    <div className="font-bold text-white text-xs truncate">Frontend &amp; Full-Stack</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Commitment</span>
                    <div className="font-bold text-white text-xs">3h / Day · 2-Mo Track</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Current Streak</span>
                    <div className="font-bold text-[#ff9f0a] text-xs flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" /> 5 Days Hot
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">XP &amp; Level</span>
                    <div className="font-bold text-[#30d158] text-xs">1,480 XP (Lvl 4)</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Duolingo-Style Serpentine Milestone Tree */}
                  <div className="lg:col-span-5 bg-zinc-900/60 p-4 sm:p-5 rounded-2xl border border-white/[0.06] space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white">Duolingo-Style Milestone Tree</h4>
                        <p className="text-[11px] text-zinc-400">Click a node to inspect the 3-Step Mastery Loop</p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        Node 03 / 05 Active
                      </span>
                    </div>

                    {/* Nodes Path */}
                    <div className="space-y-2.5">
                      {/* Node 1: Completed */}
                      <div
                        onClick={() => setActiveNodeIndex(0)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          activeNodeIndex === 0
                            ? 'bg-zinc-800 border-white text-white'
                            : 'bg-zinc-900/50 border-white/[0.05] hover:border-white/[0.15] text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-[#30d158]/20 border border-[#30d158]/40 flex items-center justify-center text-[#30d158]">
                            <Check className="w-4 h-4 font-bold" />
                          </div>
                          <div>
                            <div className="text-xs font-bold">Node 01: Semantic DOM &amp; HTML5</div>
                            <div className="text-[10px] text-zinc-400 font-mono">Completed · 5 Lessons Checked</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[#30d158] bg-[#30d158]/10 px-2 py-0.5 rounded">100%</span>
                      </div>

                      {/* Node 2: Completed */}
                      <div
                        onClick={() => setActiveNodeIndex(1)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          activeNodeIndex === 1
                            ? 'bg-zinc-800 border-white text-white'
                            : 'bg-zinc-900/50 border-white/[0.05] hover:border-white/[0.15] text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-[#30d158]/20 border border-[#30d158]/40 flex items-center justify-center text-[#30d158]">
                            <Check className="w-4 h-4 font-bold" />
                          </div>
                          <div>
                            <div className="text-xs font-bold">Node 02: Responsive CSS &amp; Tailwind Tokens</div>
                            <div className="text-[10px] text-zinc-400 font-mono">Completed · Flexbox &amp; Grid</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[#30d158] bg-[#30d158]/10 px-2 py-0.5 rounded">100%</span>
                      </div>

                      {/* Node 3: Active / In Progress */}
                      <div
                        onClick={() => setActiveNodeIndex(2)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between relative overflow-hidden ${
                          activeNodeIndex === 2
                            ? 'bg-zinc-800/90 border-[#0071e3] text-white shadow-[0_0_20px_rgba(0,113,227,0.25)]'
                            : 'bg-zinc-900/50 border-white/[0.05] hover:border-white/[0.15] text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-[#0071e3]/20 border border-[#0071e3] flex items-center justify-center text-[#0071e3] animate-pulse">
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </div>
                          <div>
                            <div className="text-xs font-bold flex items-center gap-1.5">
                              <span>Node 03: React 18 &amp; Custom Hooks</span>
                              <span className="text-[9px] font-mono bg-[#0071e3] text-white px-1.5 py-0.2 rounded">ACTIVE</span>
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">Day 14 Milestone · 2/3 Steps Completed</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[#0071e3] bg-[#0071e3]/10 px-2 py-0.5 rounded">66%</span>
                      </div>

                      {/* Node 4: Locked */}
                      <div
                        onClick={() => setActiveNodeIndex(3)}
                        className="p-3 rounded-xl border border-white/[0.04] bg-zinc-950/40 text-zinc-500 flex items-center justify-between cursor-not-allowed opacity-60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
                            <Lock className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold">Node 04: Backend APIs &amp; PostgreSQL</div>
                            <div className="text-[10px] font-mono">Requires Node 03 Completion</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">Locked</span>
                      </div>

                      {/* Node 5: Locked Capstone */}
                      <div
                        onClick={() => setActiveNodeIndex(4)}
                        className="p-3 rounded-xl border border-white/[0.04] bg-zinc-950/40 text-zinc-500 flex items-center justify-between cursor-not-allowed opacity-60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
                            <Award className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold">Node 05: Production Capstone &amp; CI/CD</div>
                            <div className="text-[10px] font-mono">Full-Stack Architecture Deployment</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">Locked</span>
                      </div>
                    </div>

                    {/* 1-Click Skill Sync Action */}
                    <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                      <button
                        onClick={handleSyncSkills}
                        className="w-full py-2 px-3 rounded-xl bg-white hover:bg-zinc-100 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${skillsSynced ? 'animate-spin' : ''}`} />
                        <span>{skillsSynced ? '✓ 12 Skills Synced to Seeker Profile!' : '1-Click Sync Skills to Seeker Radar'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: The 3-Step Mastery Loop Inspector */}
                  <div className="lg:col-span-7 bg-zinc-900/60 p-4 sm:p-5 rounded-2xl border border-white/[0.06] space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                        <div>
                          <span className="text-[10px] font-mono text-[#0071e3] uppercase tracking-wider font-bold">The 3-Step Mastery Loop</span>
                          <h4 className="text-sm font-bold text-white">Node 03: React 18 Architecture &amp; State</h4>
                        </div>

                        {/* Step Switcher */}
                        <div className="flex items-center gap-1 bg-zinc-800 p-0.5 rounded-lg text-xs font-mono">
                          <button
                            onClick={() => setLearnerStep('learn')}
                            className={`px-2 py-1 rounded ${learnerStep === 'learn' ? 'bg-white text-black font-bold' : 'text-zinc-400'}`}
                          >
                            1. Learn
                          </button>
                          <button
                            onClick={() => setLearnerStep('practice')}
                            className={`px-2 py-1 rounded ${learnerStep === 'practice' ? 'bg-white text-black font-bold' : 'text-zinc-400'}`}
                          >
                            2. Practice
                          </button>
                          <button
                            onClick={() => setLearnerStep('apply')}
                            className={`px-2 py-1 rounded ${learnerStep === 'apply' ? 'bg-white text-black font-bold' : 'text-zinc-400'}`}
                          >
                            3. Apply
                          </button>
                        </div>
                      </div>

                      {/* Step 1: Learn */}
                      {learnerStep === 'learn' && (
                        <div className="space-y-3 text-xs">
                          <p className="text-zinc-300">
                            Curated zero-fluff video masterclass, official documentation, and chapter summaries from iconic textbooks.
                          </p>
                          <div className="space-y-2">
                            <div className="bg-zinc-800/80 p-3 rounded-xl border border-white/[0.06] flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <BookOpen className="w-4 h-4 text-[#0071e3]" />
                                <div>
                                  <div className="font-bold text-white">Official React 18 RFC &amp; Hooks Specs</div>
                                  <div className="text-[10px] text-zinc-400 font-mono">react.dev official documentation (Verified)</div>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-400">18 min</span>
                            </div>
                            <div className="bg-zinc-800/80 p-3 rounded-xl border border-white/[0.06] flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <BookOpen className="w-4 h-4 text-[#af52de]" />
                                <div>
                                  <div className="font-bold text-white">Textbook Vault: Designing Data-Intensive Applications</div>
                                  <div className="text-[10px] text-zinc-400 font-mono">Chapter 3: Storage &amp; Retrieval Architectures</div>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-400">Paid Vault</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 2: Practice (Interactive In-App Code Runner) */}
                      {learnerStep === 'practice' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                            <span>Interactive Code Sandbox &amp; Test Suite</span>
                            <span className="text-[#30d158]">Web Worker Isolated</span>
                          </div>

                          <div className="bg-black/90 p-3 rounded-xl border border-white/[0.1] font-mono text-[11px] text-zinc-300 space-y-1">
                            <div className="text-zinc-500">// Challenge: Implement useDebounce hook with cleanup</div>
                            <div><span className="text-[#af52de]">function</span> <span className="text-[#0071e3]">useDebounce</span>&lt;T&gt;(value: T, delay: <span className="text-[#ff9f0a]">number</span>): T &#123;</div>
                            <div className="pl-4"><span className="text-[#af52de]">const</span> [debounced, setDebounced] = useState(value);</div>
                            <div className="pl-4">useEffect(() =&gt; &#123;</div>
                            <div className="pl-8"><span className="text-[#af52de]">const</span> timer = setTimeout(() =&gt; setDebounced(value), delay);</div>
                            <div className="pl-8"><span className="text-[#af52de]">return</span> () =&gt; clearTimeout(timer); <span className="text-zinc-500">// Cleanup</span></div>
                            <div className="pl-4">&#125;, [value, delay]);</div>
                            <div className="pl-4"><span className="text-[#af52de]">return</span> debounced;</div>
                            <div>&#125;</div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <button
                              onClick={handleRunCodeTest}
                              className="py-1.5 px-3 bg-[#0071e3] hover:bg-[#0077ed] text-white font-mono text-xs rounded-lg flex items-center gap-1.5 transition-all active:scale-95"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Run Sandbox Tests</span>
                            </button>

                            {codeTestRan && (
                              <div className="flex items-center gap-1.5 text-xs font-mono text-[#30d158]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>3/3 Tests Passed (14ms) · +50 XP</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Step 3: Apply (Project Blueprints) */}
                      {learnerStep === 'apply' && (
                        <div className="space-y-3 text-xs">
                          <p className="text-zinc-300">
                            Real-world portfolio challenge with architecture guidelines, deliverables checklist, and 1-click GitHub boilerplate.
                          </p>
                          <div className="bg-zinc-800/80 p-3.5 rounded-xl border border-white/[0.06] space-y-2">
                            <div className="font-bold text-white text-xs">Portfolio Project: High-Throughput Real-Time Dashboard</div>
                            <p className="text-[11px] text-zinc-400">
                              Build a WebSocket-connected analytics dashboard with optimistic UI updates and virtualized infinite scrolling.
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">GitHub Starter Kit</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">Figma Design Token</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Activity Heatmap Preview */}
                    <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-zinc-400">
                      <span>52-Week GitHub Heatmap Sync: 146 Sub-tasks Completed</span>
                      <span className="text-[#30d158] font-bold">Top 5% Consistency</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SEEKER HUB (1,000+ ATS Radar & Auto-Apply Simulation) */}
            {osActiveTab === 'seeker' && (
              <div className="space-y-6">
                {/* Seeker Control Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/80 p-3.5 rounded-2xl border border-white/[0.06] text-xs font-mono">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#30d158] animate-pulse" />
                    <span>Direct ATS Ingestion Active: <strong>Greenhouse, Lever, Ashby, Internshala</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20">
                      Anti-Ghost SHA-256 Verified
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      14-Day Purge Enabled
                    </span>
                  </div>
                </div>

                {/* Job Cards Radar Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {SAMPLE_ATS_LISTINGS.map(job => (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                        selectedJobId === job.id
                          ? 'bg-zinc-800 border-white text-white shadow-lg'
                          : 'bg-zinc-900/50 border-white/[0.06] hover:border-white/[0.15] text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold uppercase text-zinc-400 truncate max-w-[120px]">
                          {job.company}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white text-black">
                          {job.match}% Match
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white line-clamp-1">{job.title}</h4>
                      <div className="text-[10px] text-zinc-400 font-mono">{job.location}</div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-[10px] font-mono text-zinc-400">
                        <span className="truncate">{job.source}</span>
                        <span className="text-white font-semibold flex items-center gap-0.5">
                          Select <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Auto-Apply Execution Sandbox Panel */}
                <div className="bg-zinc-900/70 rounded-2xl p-4 sm:p-5 border border-white/[0.08] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3 text-xs">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Target Application</span>
                      <div className="font-bold text-white text-sm">
                        {selectedJob.title} at {selectedJob.company} ({selectedJob.source})
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-zinc-400">Mode:</span>
                      <div className="inline-flex p-0.5 bg-zinc-800 rounded-lg border border-white/[0.08] text-xs font-mono">
                        <button
                          onClick={() => setAutoApplyMode('semi')}
                          className={`px-2.5 py-1 rounded ${autoApplyMode === 'semi' ? 'bg-white text-black font-bold' : 'text-zinc-400'}`}
                        >
                          Semi-Auto (3-5 Tabs)
                        </button>
                        <button
                          onClick={() => setAutoApplyMode('auto')}
                          className={`px-2.5 py-1 rounded ${autoApplyMode === 'auto' ? 'bg-white text-black font-bold' : 'text-zinc-400'}`}
                        >
                          100% Autonomous
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Real-Time Stepper Visualization */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className={`p-2.5 rounded-xl border transition-all ${applyStep >= 1 ? 'bg-[#0071e3]/10 border-[#0071e3] text-white' : 'bg-zinc-800/40 border-white/[0.04] text-zinc-500'}`}>
                      <div className="font-bold text-[10px] text-zinc-400">STEP 1</div>
                      <div className="text-xs">Chromium FIFO Init (3-5 Tab RAM Safe)</div>
                    </div>
                    <div className={`p-2.5 rounded-xl border transition-all ${applyStep >= 2 ? 'bg-[#0071e3]/10 border-[#0071e3] text-white' : 'bg-zinc-800/40 border-white/[0.04] text-zinc-500'}`}>
                      <div className="font-bold text-[10px] text-zinc-400">STEP 2</div>
                      <div className="text-xs">Shadow DOM Pierced &amp; Resume Uploaded</div>
                    </div>
                    <div className={`p-2.5 rounded-xl border transition-all ${applyStep >= 3 ? 'bg-[#0071e3]/10 border-[#0071e3] text-white' : 'bg-zinc-800/40 border-white/[0.04] text-zinc-500'}`}>
                      <div className="font-bold text-[10px] text-zinc-400">STEP 3</div>
                      <div className="text-xs">EEOC Defaults &amp; Local AI Answer Cache</div>
                    </div>
                    <div className={`p-2.5 rounded-xl border transition-all ${applyStep >= 4 ? 'bg-[#30d158]/10 border-[#30d158] text-[#30d158]' : 'bg-zinc-800/40 border-white/[0.04] text-zinc-500'}`}>
                      <div className="font-bold text-[10px] text-zinc-400">STEP 4</div>
                      <div className="text-xs font-bold">✓ Submitted &amp; Logged to SQLite</div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                    <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-zinc-300" />
                      <span>Defensive Safeguard: Playwright Stealth, dial-code normalization, CAPTCHA chime ready.</span>
                    </div>

                    <button
                      onClick={handleStartApplySimulation}
                      disabled={isApplying}
                      className="py-2 px-4 bg-white hover:bg-zinc-100 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>{isApplying ? 'Executing Stealth Application...' : 'Simulate Auto-Apply Now'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: OUTREACH VERIFIER (4-Stage 0%-Bounce HR Simulator) */}
            {osActiveTab === 'outreach' && (
              <div className="space-y-6">
                <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Recruiter Outreach Safety Engine</span>
                    <div className="font-bold text-white text-sm">4-Stage 0%-Bounce Recruiter Verification Pipeline</div>
                  </div>
                  <div className="text-zinc-300 text-[11px]">
                    Quota Safeguard: <strong>15–25 emails/day</strong> · <strong>60s–180s randomized drip jitter</strong>
                  </div>
                </div>

                {/* Simulator Form */}
                <div className="bg-zinc-900/60 p-4 sm:p-5 rounded-2xl border border-white/[0.08] space-y-4">
                  <form onSubmit={handleVerifyEmail} className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={testEmail}
                      onChange={e => setTestEmail(e.target.value)}
                      placeholder="Enter recruiter email (e.g. alex.turner@linear.app)..."
                      className="flex-1 bg-black/70 border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#0071e3]"
                    />
                    <button
                      type="submit"
                      disabled={verifyingEmail}
                      className="py-2.5 px-4 bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50 font-mono"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{verifyingEmail ? 'Pinging Mail Exchange...' : 'Verify 4 Stages'}</span>
                    </button>
                  </form>

                  {/* Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-400">
                    <span>Try sample recruiter contacts:</span>
                    <button
                      type="button"
                      onClick={() => { setTestEmail('alex.turner@linear.app'); handleVerifyEmail(); }}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    >
                      alex.turner@linear.app
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTestEmail('sarah.recruiter@stripe.com'); handleVerifyEmail(); }}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    >
                      sarah.recruiter@stripe.com
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTestEmail('info@company.com'); handleVerifyEmail(); }}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[#ff453a]"
                    >
                      info@company.com (Rejected Role)
                    </button>
                  </div>

                  {/* 4-Stage Verification Visual Pipeline */}
                  {verifyResult && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
                      <div className={`p-3 rounded-xl border ${verifyResult.syntax ? 'bg-[#30d158]/10 border-[#30d158]/30 text-white' : 'bg-[#ff453a]/10 border-[#ff453a]/30 text-white'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-zinc-400">STAGE 1</span>
                          {verifyResult.syntax ? <Check className="w-3.5 h-3.5 text-[#30d158]" /> : <X className="w-3.5 h-3.5 text-[#ff453a]" />}
                        </div>
                        <div className="font-bold text-xs">RFC 5322 Syntax</div>
                        <div className="text-[10px] text-zinc-400">{verifyResult.syntax ? 'Compliant format' : 'Malformed string'}</div>
                      </div>

                      <div className={`p-3 rounded-xl border ${verifyResult.roleFilter ? 'bg-[#30d158]/10 border-[#30d158]/30 text-white' : 'bg-[#ff453a]/10 border-[#ff453a]/30 text-white'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-zinc-400">STAGE 2</span>
                          {verifyResult.roleFilter ? <Check className="w-3.5 h-3.5 text-[#30d158]" /> : <X className="w-3.5 h-3.5 text-[#ff453a]" />}
                        </div>
                        <div className="font-bold text-xs">Role &amp; Disposable Filter</div>
                        <div className="text-[10px] text-zinc-400">{verifyResult.roleFilter ? 'Decision-maker inbox' : 'Generic role rejected'}</div>
                      </div>

                      <div className={`p-3 rounded-xl border ${verifyResult.dnsMx ? 'bg-[#30d158]/10 border-[#30d158]/30 text-white' : 'bg-[#ff453a]/10 border-[#ff453a]/30 text-white'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-zinc-400">STAGE 3</span>
                          {verifyResult.dnsMx ? <Check className="w-3.5 h-3.5 text-[#30d158]" /> : <X className="w-3.5 h-3.5 text-[#ff453a]" />}
                        </div>
                        <div className="font-bold text-xs">DNS MX Verification</div>
                        <div className="text-[10px] text-zinc-400">Google / M365 verified</div>
                      </div>

                      <div className={`p-3 rounded-xl border ${verifyResult.smtpHandshake && verifyResult.roleFilter ? 'bg-[#30d158]/10 border-[#30d158]/30 text-white' : 'bg-[#ff453a]/10 border-[#ff453a]/30 text-white'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-zinc-400">STAGE 4</span>
                          {verifyResult.smtpHandshake && verifyResult.roleFilter ? <Check className="w-3.5 h-3.5 text-[#30d158]" /> : <X className="w-3.5 h-3.5 text-[#ff453a]" />}
                        </div>
                        <div className="font-bold text-xs">SMTP &amp; Catch-All Probe</div>
                        <div className="text-[10px] text-zinc-400">
                          {verifyResult.roleFilter ? '0% Bounce Guaranteed' : 'Dispatched Blocked'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* The Bottleneck Comparison Matrix (Traditional vs Hirestack OS) */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-black/[0.06] bg-[#f5f5f7]">
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-xs font-mono tracking-widest text-[#86868b] uppercase font-bold">The Bottleneck</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#1d1d1f]">
                Why manual job hunting is broken.
              </h2>
              <p className="text-xs sm:text-sm text-[#86868b]">
                Repetitive 20-minute forms, stale aggregator listings, and blind recruiter guesses waste hundreds of hours.
              </p>
            </div>

            <div className="bg-white border border-black/[0.06] rounded-3xl p-6 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-mono">
                {/* Traditional Side */}
                <div className="space-y-4">
                  <div className="text-[#86868b] uppercase font-bold tracking-wider border-b border-black/[0.06] pb-3 flex items-center justify-between">
                    <span>Traditional Job Search</span>
                    <span className="text-[#ff453a] font-normal">High Friction</span>
                  </div>
                  <div className="space-y-3.5 text-[#6e6e73]">
                    <div className="flex items-start gap-2.5">
                      <X className="w-4 h-4 text-[#ff453a] shrink-0 mt-0.5" />
                      <span>20-minute manual form re-entry per listing across company career portals</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <X className="w-4 h-4 text-[#ff453a] shrink-0 mt-0.5" />
                      <span>Expired and ghost job postings reposted on third-party aggregators</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <X className="w-4 h-4 text-[#ff453a] shrink-0 mt-0.5" />
                      <span>Blindly guessing hiring manager emails resulting in hard bounces and spam bans</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <X className="w-4 h-4 text-[#ff453a] shrink-0 mt-0.5" />
                      <span>Scattered self-study without verified milestone benchmarks or interview preparation</span>
                    </div>
                  </div>
                </div>

                {/* Hirestack OS Side */}
                <div className="space-y-4 border-t md:border-t-0 md:border-l border-black/[0.06] pt-6 md:pt-0 md:pl-8">
                  <div className="text-[#1d1d1f] uppercase font-bold tracking-wider border-b border-black/[0.06] pb-3 flex items-center justify-between">
                    <span>Hirestack Desktop OS</span>
                    <span className="text-[#30d158] font-bold">Autonomous</span>
                  </div>
                  <div className="space-y-3.5 text-[#1d1d1f] font-semibold">
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#0071e3] shrink-0 mt-0.5 font-bold" />
                      <span>Stealth Chromium batch application with Shadow DOM piercing &amp; dial-code normalization</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#0071e3] shrink-0 mt-0.5 font-bold" />
                      <span>Direct ATS JSON streaming (Greenhouse, Lever, Ashby, Internshala) with SHA-256 deduplication</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#0071e3] shrink-0 mt-0.5 font-bold" />
                      <span>4-Stage SMTP/DNS verified recruiter inboxes with catch-all probing for 0% bounce rate</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#0071e3] shrink-0 mt-0.5 font-bold" />
                      <span>Duolingo-style milestone tree with 1-click skill synchronization into your candidate profile</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Deep Defensive Engineering Capabilities — Apple Bento Grid */}
        <section id="capabilities" className="py-20 sm:py-28 px-4 sm:px-6 border-t border-black/[0.06] bg-white">
          <div className="max-w-6xl mx-auto space-y-12 sm:space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-xs font-mono tracking-widest text-[#86868b] uppercase font-bold">Defensive Architecture</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#1d1d1f]">
                Engineered for edge cases. Built for scale.
              </h2>
              <p className="text-xs sm:text-sm text-[#86868b]">
                Every component is fortified against memory crashes, anti-bot triggers, dynamic forms, and domain blacklists.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {/* Bento 1: 3-5 Tab RAM Safety */}
              <SpotlightCard className="bg-[#f5f5f7] border border-black/[0.06] rounded-3xl p-6 sm:p-8 space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-black/[0.06] flex items-center justify-center text-[#0071e3] shadow-sm">
                  <Laptop className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-[#1d1d1f]">3–5 Parallel Tab RAM Queue</h3>
                <p className="text-xs text-[#6e6e73] leading-relaxed">
                  Automated applications run in a strict FIFO queue capped at 3–5 parallel Chromium tabs. Student laptops with 8GB RAM never experience memory freezes, UI stutter, or OS crashes.
                </p>
              </SpotlightCard>

              {/* Bento 2: Direct ATS JSON Streaming */}
              <SpotlightCard className="bg-[#f5f5f7] border border-black/[0.06] rounded-3xl p-6 sm:p-8 space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-black/[0.06] flex items-center justify-center text-[#0071e3] shadow-sm">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-[#1d1d1f]">1,000+ Direct ATS Radar</h3>
                <p className="text-xs text-[#6e6e73] leading-relaxed">
                  Direct ingestion from Greenhouse, Lever, Ashby, and Internshala APIs. Cryptographic SHA-256 deduplication and 14-day inactivity auto-purging guarantee 0% expired ghost listings.
                </p>
              </SpotlightCard>

              {/* Bento 3: 4-Stage 0%-Bounce Outreach */}
              <SpotlightCard className="bg-[#f5f5f7] border border-black/[0.06] rounded-3xl p-6 sm:p-8 space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-black/[0.06] flex items-center justify-center text-[#0071e3] shadow-sm">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-[#1d1d1f]">0%-Bounce Recruiter Outreach</h3>
                <p className="text-xs text-[#6e6e73] leading-relaxed">
                  Mandatory 4-stage verification (Syntax ➔ Role Filter ➔ DNS MX ➔ SMTP Socket Ping + Catch-All Probing). Daily 15–25 email cap with 60s–180s randomized delays protects your domain reputation.
                </p>
              </SpotlightCard>

              {/* Bento 4: Shadow DOM Piercing */}
              <SpotlightCard className="bg-[#f5f5f7] border border-black/[0.06] rounded-3xl p-6 sm:p-8 space-y-3 md:col-span-2">
                <div className="w-10 h-10 rounded-2xl bg-white border border-black/[0.06] flex items-center justify-center text-[#0071e3] shadow-sm">
                  <Terminal className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-[#1d1d1f]">Shadow DOM Piercing &amp; Form Normalization</h3>
                <p className="text-xs text-[#6e6e73] leading-relaxed">
                  Playwright piercing engine penetrates complex Workday and Salesforce Shadow DOM trees. Handles custom dropdowns, hidden drag-drop resume dropzones, EEOC demographic compliant defaults, and phone dial codes (+91/+1) seamlessly.
                </p>
              </SpotlightCard>

              {/* Bento 5: Local-First SQLite & Hardware Lock */}
              <SpotlightCard className="bg-[#f5f5f7] border border-black/[0.06] rounded-3xl p-6 sm:p-8 space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-black/[0.06] flex items-center justify-center text-[#0071e3] shadow-sm">
                  <Shield className="w-4 h-4 text-[#1d1d1f]" />
                </div>
                <h3 className="font-bold text-base text-[#1d1d1f]">Local SQLite &amp; Hardware Lock</h3>
                <p className="text-xs text-[#6e6e73] leading-relaxed">
                  All candidate profiles, resume files, and private credentials are stored in local SQLite (<code className="font-mono text-[11px]">sql.js</code>). Free trials and subscriptions are bound to your CPU ID + Motherboard UUID.
                </p>
              </SpotlightCard>
            </div>
          </div>
        </section>

        {/* Cross-Domain Career Roadmaps Section */}
        <section id="roadmaps" className="py-20 sm:py-28 px-4 sm:px-6 border-t border-black/[0.06] bg-[#fbfbfd]">
          <div className="max-w-6xl mx-auto space-y-10 sm:space-y-12">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-xs font-mono tracking-widest text-[#86868b] uppercase font-bold">Curriculum Intelligence</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#1d1d1f]">
                Tailored roadmaps for any career path.
              </h2>
              <p className="text-xs sm:text-sm text-[#86868b]">
                Select a domain below to preview curriculum milestones, or calibrate custom roles directly inside the desktop app.
              </p>
            </div>

            {/* Horizontal Domain Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap sm:justify-center no-scrollbar -mx-4 px-4 sm:mx-0">
              {CAREER_DOMAINS.map(d => (
                <button
                  key={d.id}
                  onClick={() => setActiveDomainId(d.id)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    activeDomainId === d.id
                      ? 'bg-[#1d1d1f] text-white shadow-sm'
                      : 'bg-white text-[#6e6e73] hover:text-[#1d1d1f] border border-black/[0.08]'
                  }`}
                >
                  {d.title}
                </button>
              ))}
            </div>

            {/* Selected Domain Card */}
            <div className="bg-white border border-black/[0.06] rounded-3xl p-6 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.04)] space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#1d1d1f]">{selectedDomain.title}</h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/[0.05] text-[#1d1d1f] border border-black/[0.06]">
                      {selectedDomain.badge}
                    </span>
                  </div>
                  <p className="text-xs text-[#86868b] font-mono mt-1">{selectedDomain.tag}</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[11px] font-mono text-[#86868b]">Target Role Outcome:</span>
                  <div className="text-xs sm:text-sm font-bold text-[#1d1d1f]">{selectedDomain.role}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-[#86868b] font-bold">Curriculum Milestones:</h4>
                  <ul className="space-y-2.5 text-xs text-[#1d1d1f]">
                    {selectedDomain.modules.map((m, idx) => (
                      <li key={idx} className="flex items-start gap-3 bg-[#f5f5f7] p-3.5 rounded-2xl border border-black/[0.04]">
                        <span className="text-[10px] font-mono font-bold text-[#0071e3] shrink-0 mt-0.5">0{idx + 1}</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-[#86868b] font-bold">Transferable Profile Competencies:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDomain.skills.map((sk, idx) => (
                      <span key={idx} className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#f5f5f7] border border-black/[0.06] text-[#1d1d1f]">
                        {sk}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[#6e6e73] pt-2 leading-relaxed">
                    Completing exercises and project checkpoints dynamically increases your candidate readiness score. With 1 click, all verified skills are transferred to your candidate profile for instant match ranking across 1,000+ active company ATS listings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Architecture (Authoritative 4-Tier Model from Master Spec) */}
        <section id="pricing" className="py-20 sm:py-28 px-4 sm:px-6 border-t border-black/[0.06] bg-[#f5f5f7]">
          <div className="max-w-6xl mx-auto space-y-12 sm:space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="text-xs font-mono tracking-widest text-[#86868b] uppercase font-bold">Transparent Pricing</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#1d1d1f]">
                Start with a free trial. Upgrade as you scale.
              </h2>
              <p className="text-xs sm:text-sm text-[#86868b]">
                All plans include a 3-day unrestricted trial. Subscriptions are activated securely through Razorpay in the desktop app. Strict no-refund policy.
              </p>

              {/* Monthly vs 3-Month Pass Toggle */}
              <div className="inline-flex p-1 bg-white rounded-full border border-black/[0.08] shadow-sm text-xs font-semibold mt-2">
                <button
                  onClick={() => setPricingCycle('monthly')}
                  className={`px-4 py-1.5 rounded-full transition-all ${pricingCycle === 'monthly' ? 'bg-[#1d1d1f] text-white shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}
                >
                  Monthly Plan
                </button>
                <button
                  onClick={() => setPricingCycle('quarterly')}
                  className={`px-4 py-1.5 rounded-full transition-all ${pricingCycle === 'quarterly' ? 'bg-[#1d1d1f] text-white shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}
                >
                  3-Month Prepaid Pass (Save 15%)
                </button>
              </div>
            </div>

            {/* 4 Tier Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Tier 1: Free Trial */}
              <div className="border border-black/[0.06] rounded-3xl p-6 sm:p-7 bg-white flex flex-col justify-between hover:border-black/[0.15] transition-all shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="space-y-5">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#86868b] font-bold">Hardware-Locked</span>
                    <h3 className="font-bold text-lg text-[#1d1d1f]">Free 3-Day Trial</h3>
                    <p className="text-xs text-[#86868b] mt-1">Explore roadmaps &amp; live job stream</p>
                    <div className="text-3xl font-bold tracking-tight mt-5 text-[#1d1d1f]">
                      ₹0 <span className="text-xs text-[#86868b] font-normal font-mono">/ 3 days</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 text-xs text-[#6e6e73] border-t border-black/[0.06] pt-5">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#1d1d1f] shrink-0" />
                      <span>3-Day unrestricted free trial</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#1d1d1f] shrink-0" />
                      <span>Access to standard roadmaps</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#1d1d1f] shrink-0" />
                      <span>Today's Top 10 curated job feed</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#1d1d1f] shrink-0" />
                      <span>Local SQLite storage</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#1d1d1f] shrink-0" />
                      <span>Direct manual apply links</span>
                    </li>
                  </ul>
                </div>

                <a
                  href="#/download"
                  className="mt-8 block text-center w-full py-2.5 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] rounded-full font-semibold text-xs transition-colors"
                >
                  Download Free Trial
                </a>
              </div>

              {/* Tier 2: Learner Pro */}
              <div className="border border-black/[0.06] rounded-3xl p-6 sm:p-7 bg-white flex flex-col justify-between hover:border-black/[0.15] transition-all shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="space-y-5">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#0071e3] font-bold">Skills Mastery</span>
                    <h3 className="font-bold text-lg text-[#1d1d1f]">Learner Pro</h3>
                    <p className="text-xs text-[#86868b] mt-1">Duolingo milestone trees &amp; drills</p>
                    <div className="text-3xl font-bold tracking-tight mt-5 text-[#1d1d1f]">
                      {pricingCycle === 'monthly' ? '₹79' : '₹199'} <span className="text-xs text-[#86868b] font-normal font-mono">{pricingCycle === 'monthly' ? '/ mo' : '/ 3 mo'}</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 text-xs text-[#6e6e73] border-t border-black/[0.06] pt-5">
                    <li className="flex items-center gap-2 font-semibold text-[#1d1d1f]">
                      <Check className="w-4 h-4 text-[#0071e3] shrink-0" />
                      <span>Full Duolingo-style skill trees</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#1d1d1f] shrink-0" />
                      <span>Day-by-day scheduler &amp; tasks</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#1d1d1f] shrink-0" />
                      <span>1,500+ Interview question bank</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#1d1d1f] shrink-0" />
                      <span>Iconic textbook vault (DDIA, Clean Code)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#1d1d1f] shrink-0" />
                      <span>Interactive code runner &amp; quizzes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#1d1d1f] shrink-0" />
                      <span>GitHub streak heatmap &amp; AI companion</span>
                    </li>
                  </ul>
                </div>

                <a
                  href="#/download"
                  className="mt-8 block text-center w-full py-2.5 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] rounded-full font-semibold text-xs transition-colors"
                >
                  Start Learner Pro
                </a>
              </div>

              {/* Tier 3: Seeker Pro */}
              <div className="border border-black/[0.06] rounded-3xl p-6 sm:p-7 bg-white flex flex-col justify-between hover:border-black/[0.15] transition-all shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="space-y-5">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#ff9f0a] font-bold">Active Applications</span>
                    <h3 className="font-bold text-lg text-[#1d1d1f]">Seeker Pro</h3>
                    <p className="text-xs text-[#86868b] mt-1">1,000+ ATS radar &amp; semi-auto apply</p>
                    <div className="text-3xl font-bold tracking-tight mt-5 text-[#1d1d1f]">
                      {pricingCycle === 'monthly' ? '₹149' : '₹379'} <span className="text-xs text-[#86868b] font-normal font-mono">{pricingCycle === 'monthly' ? '/ mo' : '/ 3 mo'}</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 text-xs text-[#6e6e73] border-t border-black/[0.06] pt-5">
                    <li className="flex items-center gap-2 font-semibold text-[#1d1d1f]">
                      <Check className="w-4 h-4 text-[#ff9f0a] shrink-0" />
                      <span>Everything in Free Trial</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#1d1d1f] shrink-0" />
                      <span>1,000+ ATS job radar (Greenhouse, Lever, Ashby)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#1d1d1f] shrink-0" />
                      <span>Semi-Auto apply (up to 50 jobs/week)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#1d1d1f] shrink-0" />
                      <span>RAM-safe 3–5 parallel Chromium queue</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#1d1d1f] shrink-0" />
                      <span>25 Verified HR / Recruiter leads/week</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#1d1d1f] shrink-0" />
                      <span>Cloud sync for application tracker</span>
                    </li>
                  </ul>
                </div>

                <a
                  href="#/download"
                  className="mt-8 block text-center w-full py-2.5 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] rounded-full font-semibold text-xs transition-colors"
                >
                  Start Seeker Pro
                </a>
              </div>

              {/* Tier 4: Seeker Max (Flagship Suite) */}
              <div className="border border-black/[0.9] rounded-3xl p-6 sm:p-7 bg-[#121215] text-white flex flex-col justify-between relative shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-mono uppercase tracking-widest px-3 py-0.5 rounded-full whitespace-nowrap font-bold shadow-sm">
                  Complete Flagship Suite
                </span>

                <div className="space-y-5">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#30d158] font-bold">100% Autopilot</span>
                    <h3 className="font-bold text-lg text-white">Seeker Max</h3>
                    <p className="text-xs text-zinc-400 mt-1">Full Learner + Autonomous Seeker</p>
                    <div className="text-3xl font-bold tracking-tight mt-5 text-white">
                      {pricingCycle === 'monthly' ? '₹299' : '₹749'} <span className="text-xs text-zinc-400 font-normal font-mono">{pricingCycle === 'monthly' ? '/ mo' : '/ 3 mo'}</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 text-xs text-zinc-300 border-t border-white/[0.1] pt-5">
                    <li className="flex items-center gap-2 font-bold text-white">
                      <Check className="w-4 h-4 text-[#30d158] shrink-0" />
                      <span>Full Learner Pro + Seeker Pro included</span>
                    </li>
                    <li className="flex items-center gap-2 font-bold text-white">
                      <Check className="w-4 h-4 text-[#30d158] shrink-0" />
                      <span>100% Autonomous Auto-Apply (Unlimited)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white shrink-0" />
                      <span>Groq LLaMA 3.1 8B dynamic form resolution</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white shrink-0" />
                      <span>0%-Bounce HR email outreach campaigns</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white shrink-0" />
                      <span>Catch-all probing &amp; non-existent mailbox tests</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white shrink-0" />
                      <span>Priority ATS radar stream (every 15 mins)</span>
                    </li>
                  </ul>
                </div>

                <a
                  href="#/download"
                  className="mt-8 block text-center w-full py-2.5 bg-white hover:bg-zinc-100 text-black rounded-full font-bold text-xs transition-colors shadow-sm"
                >
                  Get Complete Suite (₹299)
                </a>
              </div>
            </div>

            {/* Payment & Refund Disclaimers */}
            <div className="text-center text-[11px] font-mono text-[#86868b] max-w-2xl mx-auto space-y-1">
              <p>Supported Payment Methods: Direct UPI (Google Pay, PhonePe, Paytm, CRED), Netbanking, Debit &amp; Credit Cards via Razorpay.</p>
              <p>Licensing: Bound to CPU ID + Motherboard UUID. Single laptop authorized per account. Strict no-refund policy explicitly acknowledged before purchase.</p>
            </div>
          </div>
        </section>

        {/* SEO-Rich FAQ Section */}
        <section id="faq" className="py-20 sm:py-28 px-4 sm:px-6 border-t border-black/[0.06] bg-white">
          <div className="max-w-3xl mx-auto space-y-10 sm:space-y-12">
            <div className="text-center space-y-2">
              <span className="text-xs font-mono tracking-widest text-[#86868b] uppercase font-bold">Frequently Asked Questions</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#1d1d1f]">
                Everything you need to know about Hirestack.
              </h2>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, idx) => (
                <div key={idx} className="border border-black/[0.06] rounded-2xl p-4 sm:p-5 bg-[#f5f5f7] transition-all">
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between text-left font-semibold text-xs sm:text-sm text-[#1d1d1f] gap-3"
                  >
                    <span>{item.question}</span>
                    {activeFaqIndex === idx ? (
                      <ChevronUp className="w-4 h-4 text-[#86868b] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#86868b] shrink-0" />
                    )}
                  </button>
                  {activeFaqIndex === idx && (
                    <p className="mt-3 text-xs text-[#6e6e73] leading-relaxed border-t border-black/[0.06] pt-3 font-normal">
                      {item.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Apple-Grade Minimalist Monochrome Footer */}
      <footer className="border-t border-black/[0.06] py-12 px-4 sm:px-6 bg-[#fbfbfd] text-xs text-[#86868b]">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <img
                src="./logo-icon.png"
                alt="Hirestack Official Logo"
                className="h-7 w-7 rounded-lg object-contain shadow-sm"
              />
              <div>
                <div className="text-sm font-bold tracking-tight text-[#1d1d1f]">Hirestack</div>
                <p className="text-[11px] text-[#86868b] font-mono">Desktop Career Operating System · Electron + SQLite</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 font-medium text-[#1d1d1f]">
              <a href="#interactive-os" className="hover:text-[#0071e3] transition-colors">Platform OS</a>
              <a href="#roadmaps" className="hover:text-[#0071e3] transition-colors">Curriculum Roadmaps</a>
              <a href="#pricing" className="hover:text-[#0071e3] transition-colors">Pricing Plans</a>
              <a href="#/download" className="hover:text-[#0071e3] transition-colors">Download App</a>
              <a href="#/terms" className="hover:text-[#0071e3] transition-colors">Terms of Service</a>
              <a href="#/privacy" className="hover:text-[#0071e3] transition-colors">Privacy Policy</a>
            </div>
          </div>

          <div className="border-t border-black/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#86868b] font-mono">
            <div>
              &copy; {new Date().getFullYear()} Hirestack Technologies. All rights reserved. Single-laptop hardware licensing enforced.
            </div>
            <div className="flex items-center gap-2 text-[#30d158]">
              <span className="w-2 h-2 rounded-full bg-[#30d158] inline-block animate-pulse" />
              <span>All Direct ATS Radar Streams &amp; Email Verifiers Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
