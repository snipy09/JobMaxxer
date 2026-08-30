import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, Check, X, Shield, Terminal,
  Laptop, Search, Mail, Zap, BookOpen,
  ChevronDown, ChevronUp, Menu, Briefcase,
  Download as DownloadIcon, Layers, Sparkles
} from 'lucide-react';
import { animate, stagger } from 'animejs';

const CAREER_DOMAINS = [
  {
    id: 'product-management',
    title: 'Product & Project Management',
    badge: 'High Demand',
    tag: 'Product Discovery · PRDs · Agile Sprints · User Metrics',
    hours: '90 Hours',
    role: 'Associate Product Manager / Project Lead',
    modules: [
      'Product Opportunity Analysis & Customer Interviews',
      'PRD Documentation & User Story Mapping',
      'Data-Driven Prioritization (RICE / MoSCoW Frameworks)',
      'Cross-Functional Stakeholder Alignment & Go-To-Market'
    ],
    skills: ['Product Discovery', 'PRD Authoring', 'Roadmapping', 'Agile / Scrum', 'Metrics & KPIs']
  },
  {
    id: 'tech-engineering',
    title: 'Software & Technology',
    badge: 'Top Comp',
    tag: 'Web Development · Mobile Apps · Cloud Systems · AI',
    hours: '140 Hours',
    role: 'Software Developer / Technical Specialist',
    modules: [
      'Core Programming Fundamentals & Algorithmic Problem Solving',
      'Web & Mobile Application Architecture',
      'Databases, APIs & Backend Integration',
      'System Reliability, Debugging & Deployment'
    ],
    skills: ['Programming Fundamentals', 'API Integration', 'Databases', 'Git & CI/CD', 'System Architecture']
  },
  {
    id: 'design-ux',
    title: 'Design & User Experience',
    badge: 'Creative',
    tag: 'UI/UX · Figma · Design Systems · Usability Testing',
    hours: '85 Hours',
    role: 'Product Designer / UX Specialist',
    modules: [
      'User Research, Persona Development & Journey Mapping',
      'Wireframing, Rapid Prototyping & Micro-Interactions',
      'Design System Creation & Component Tokens',
      'Usability Audits & Design-to-Development Handoff'
    ],
    skills: ['Figma', 'UI/UX Design', 'Design Systems', 'User Research', 'Prototyping']
  },
  {
    id: 'data-analytics',
    title: 'Data & Business Analytics',
    badge: 'Analytical',
    tag: 'SQL · Excel / Sheets · PowerBI · Statistical Modeling',
    hours: '95 Hours',
    role: 'Business Analyst / Data Strategist',
    modules: [
      'Advanced SQL Querying & Relational Data Models',
      'Business Intelligence Dashboards & Visualizations',
      'Exploratory Data Analysis & Statistical Inference',
      'Translating Complex Data into Actionable Business Decisions'
    ],
    skills: ['SQL', 'Data Visualization', 'Spreadsheet Modeling', 'Business Intelligence', 'Analytics']
  },
  {
    id: 'growth-marketing',
    title: 'Marketing, Growth & Content',
    badge: 'Strategic',
    tag: 'Performance Marketing · SEO · Brand Strategy · Funnels',
    hours: '80 Hours',
    role: 'Growth Associate / Marketing Specialist',
    modules: [
      'Audience Segmentation & Acquisition Funnel Design',
      'Content Strategy, Copywriting & Search Optimization (SEO)',
      'Paid Campaign Management & Multi-Touch Attribution',
      'Conversion Rate Optimization (CRO) & Retention Loops'
    ],
    skills: ['Performance Marketing', 'SEO / SEM', 'Copywriting', 'Funnel Optimization', 'Campaign Analytics']
  },
  {
    id: 'finance-operations',
    title: 'Finance, Operations & Sales',
    badge: 'Commercial',
    tag: 'Financial Modeling · Operations Workflows · Client Success',
    hours: '85 Hours',
    role: 'Operations Lead / Financial Analyst / Account Executive',
    modules: [
      'Financial Statements, Forecasting & Valuation Basics',
      'Operational Process Automation & Supply Chain Workflows',
      'Consultative Selling, Pipeline Management & CRM Systems',
      'Customer Retention, Client Success & Account Expansion'
    ],
    skills: ['Financial Modeling', 'Operations Strategy', 'CRM & Pipeline', 'Client Relations', 'Process Mapping']
  }
];

const SAMPLE_LISTINGS = [
  {
    title: 'Associate Product Manager',
    company: 'Linear',
    location: 'Remote / Hybrid',
    source: 'Ashby API',
    match: '96% Match',
    compensation: 'Competitive Base + Equity',
    type: 'Full-time',
    field: 'Product'
  },
  {
    title: 'Business Operations Associate',
    company: 'Stripe',
    location: 'Remote',
    source: 'Greenhouse API',
    match: '94% Match',
    compensation: 'Tier-1 Industry Comp',
    type: 'Full-time',
    field: 'Operations'
  },
  {
    title: 'Growth & Marketing Specialist',
    company: 'Vercel',
    location: 'Remote',
    source: 'Greenhouse API',
    match: '91% Match',
    compensation: 'Global Remote Package',
    type: 'Full-time',
    field: 'Marketing'
  },
  {
    title: 'Graduate Analyst / Trainee',
    company: 'Supabase',
    location: 'Remote',
    source: 'Lever API',
    match: '89% Match',
    compensation: 'Entry-Level / Fast Track',
    type: 'Internship / Fresher',
    field: 'Analytics'
  }
];

const FAQ_ITEMS = [
  {
    question: 'Is Hirestack only for software engineers?',
    answer: 'No. Hirestack is built for anyone searching for a job or internship across any industry — including Product, Marketing, Sales, Design, Finance, Operations, Data Analytics, Customer Success, and Software. The application automation engine fills candidate forms across all standard company job portals regardless of the role.'
  },
  {
    question: 'How does Hirestack automate applications across different portals?',
    answer: 'Hirestack runs a local Chromium automation engine on your machine. It navigates directly to authentic company career portals (Greenhouse, Lever, Ashby, Internshala, and custom company career pages), inputs your profile data, uploads your resume, dynamically answers custom form prompts, and submits applications without third-party middleware.'
  },
  {
    question: 'Where do the job postings come from?',
    answer: 'Rather than scraping third-party aggregator websites filled with expired posts, Hirestack connects directly to public ATS endpoints and verified company feeds. Postings are cryptographically deduplicated with SHA-256 hashes to guarantee active, live positions across all job roles and departments.'
  },
  {
    question: 'Is my candidate data, work history, and resume secure?',
    answer: 'Yes. Hirestack operates local-first. Your master candidate profile, resume files, and private keys are encrypted and stored in an isolated local SQLite database on your computer. Your files and personal details are never uploaded to tracking or advertising databases.'
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
  const [activeDomainId, setActiveDomainId] = useState<string>('product-management');
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
  const [selectedJobIndex, setSelectedJobIndex] = useState<number>(0);

  const heroRef = useRef<HTMLDivElement>(null);
  const domainCardRef = useRef<HTMLDivElement>(null);

  const selectedDomain = CAREER_DOMAINS.find(d => d.id === activeDomainId) || CAREER_DOMAINS[0];

  useEffect(() => {
    // Initial Staggered Anime.js Entrance Animation
    try {
      animate('.anime-hero-fade', {
        translateY: [20, 0],
        opacity: [0, 1],
        delay: stagger(100, { start: 50 }),
        duration: 800,
        ease: 'outQuart',
      });
    } catch (e) {
      // Fallback
    }
  }, []);

  const handleDomainChange = (domainId: string) => {
    setActiveDomainId(domainId);
    if (domainCardRef.current) {
      try {
        animate(domainCardRef.current, {
          opacity: [0.4, 1],
          translateY: [8, 0],
          duration: 350,
          ease: 'outQuad'
        });
      } catch (e) {
        // Fallback
      }
    }
  };

  const toggleFaq = (idx: number) => {
    setActiveFaqIndex(activeFaqIndex === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-white text-ink-950 font-sans flex flex-col antialiased selection:bg-ink-950 selection:text-white">
      {/* Top Announcement Bar */}
      <div className="border-b border-ink-100 bg-ink-50 px-4 py-2 text-center text-[11px] sm:text-xs text-ink-600 font-mono tracking-tight flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-ink-950 shrink-0" />
        <span className="truncate">Hirestack v2.0.1 Released · Desktop App for Job Seekers Across All Fields</span>
      </div>

      {/* Main Navigation Header */}
      <header className="border-b border-ink-100 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8 lg:gap-10">
            <a href="#/" className="flex items-center gap-2.5 group">
              <img
                src="./logo-icon.png"
                alt="Hirestack Logo Icon"
                className="h-7 w-7 rounded-md object-contain shadow-fine transition-transform group-hover:scale-105"
              />
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-ink-950">
                Hirestack
              </span>
            </a>

            <nav className="hidden md:flex items-center gap-5 lg:gap-7 text-xs font-semibold text-ink-500">
              <a href="#overview" className="hover:text-ink-950 transition-colors">Overview</a>
              <a href="#learner" className="hover:text-ink-950 transition-colors">Learner Track</a>
              <a href="#seeker" className="hover:text-ink-950 transition-colors">Seeker Track</a>
              <a href="#preview" className="hover:text-ink-950 transition-colors">Live Preview</a>
              <a href="#capabilities" className="hover:text-ink-950 transition-colors">Capabilities</a>
              <a href="#pricing" className="hover:text-ink-950 transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-ink-950 transition-colors">FAQ</a>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#/download"
              className="text-[11px] sm:text-xs font-bold bg-ink-950 hover:bg-ink-800 text-white px-3.5 sm:px-4 py-2 rounded-lg transition-all shadow-fine flex items-center gap-1.5 hover:shadow-lifted active:scale-95"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              <span>Download Desktop App</span>
            </a>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg border border-ink-200 text-ink-600 hover:text-ink-950 hover:bg-ink-50 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-ink-200 bg-white/95 backdrop-blur-xl px-6 py-4 space-y-3 text-xs font-semibold text-ink-600 shadow-lifted animate-fade-up">
            <a href="#overview" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-ink-950">Overview</a>
            <a href="#learner" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-ink-950">Learner Track</a>
            <a href="#seeker" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-ink-950">Seeker Track</a>
            <a href="#preview" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-ink-950">Live Preview</a>
            <a href="#capabilities" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-ink-950">Capabilities</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-ink-950">Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-ink-950">FAQ</a>
            <div className="pt-2 border-t border-ink-100">
              <a
                href="#/download"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2 bg-ink-950 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 shadow-fine"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                <span>Download for Desktop</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="overview" ref={heroRef} className="relative pt-16 sm:pt-24 pb-14 sm:pb-20 px-4 sm:px-6 max-w-5xl mx-auto w-full text-center">
        <div className="anime-hero-fade inline-flex items-center gap-2 px-3 py-1 bg-ink-50 border border-ink-200 rounded-full text-[11px] sm:text-xs font-mono text-ink-600 mb-6 sm:mb-8 shadow-fine max-w-full">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-950 shrink-0" />
          <span className="truncate">Desktop App for All Job Seekers &amp; Students</span>
        </div>

        <h1 className="anime-hero-fade text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-ink-950 leading-[1.08] sm:leading-[1.05] mb-5 sm:mb-6">
          Master the skills.<br />
          <span className="text-ink-400">Automate the applications.</span>
        </h1>

        <p className="anime-hero-fade text-sm sm:text-base md:text-lg text-ink-600 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed font-normal px-2">
          Hirestack is the desktop automation platform for job seekers, students, and professionals across all industries. Master step-by-step career roadmaps, stream verified direct-company job feeds, and execute client-side stealth batch applications directly from your machine.
        </p>

        <div className="anime-hero-fade flex flex-col sm:flex-row gap-3 justify-center items-center w-full max-w-md sm:max-w-none mx-auto">
          <a
            href="#/download"
            className="w-full sm:w-auto bg-ink-950 hover:bg-ink-800 text-white px-6 sm:px-7 py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lifted active:scale-95"
          >
            <DownloadIcon className="w-4 h-4" />
            <span>Download for Windows (Free)</span>
          </a>
          <a
            href="#preview"
            className="w-full sm:w-auto bg-white hover:bg-ink-50 text-ink-950 border border-ink-200 px-6 sm:px-7 py-3.5 rounded-xl font-bold text-xs flex items-center justify-center transition-colors"
          >
            Inspect Interactive Preview
          </a>
        </div>

        {/* Feature Badges */}
        <div className="anime-hero-fade mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-ink-100 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-[11px] sm:text-xs text-ink-500 font-mono">
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-ink-950 shrink-0" /> Local-first SQLite privacy</span>
          <span className="flex items-center gap-1.5"><Laptop className="w-3.5 h-3.5 text-ink-950 shrink-0" /> Single-laptop hardware lock</span>
          <span className="flex items-center gap-1.5"><Search className="w-3.5 h-3.5 text-ink-950 shrink-0" /> Direct ATS ingest</span>
          <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-ink-950 shrink-0" /> Works across all career domains</span>
        </div>
      </section>

      {/* Interactive Desktop Client Mockup */}
      <section id="preview" className="px-4 sm:px-6 pb-16 sm:pb-24 max-w-5xl mx-auto w-full">
        <div className="bg-ink-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-float border border-ink-800 transition-all hover:border-ink-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink-800 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-ink-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-ink-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-ink-700" />
              <span className="text-xs font-mono text-ink-400 ml-1.5 truncate">Hirestack Client / Cross-Industry Opportunity Feed</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-ink-900 text-ink-300 border border-ink-800">
                Live ATS Stream Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left mb-4">
            {SAMPLE_LISTINGS.map((job, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedJobIndex(idx)}
                className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  selectedJobIndex === idx
                    ? 'bg-ink-900 border-white text-white shadow-dark-fine'
                    : 'bg-ink-900/60 border-ink-800 hover:border-ink-700 text-ink-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ink-400 font-bold truncate max-w-[120px]">{job.company}</span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white text-ink-950 shrink-0">{job.match}</span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1">{job.title}</h4>
                <div className="text-[11px] text-ink-400 font-mono truncate">{job.field} · {job.type}</div>
                <div className="flex items-center justify-between pt-2 border-t border-ink-800 text-[10px] sm:text-[11px] text-ink-400 font-mono">
                  <span className="truncate">{job.location}</span>
                  <span className="text-white font-semibold flex items-center gap-1 shrink-0">
                    Auto-Fill <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-ink-900 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-ink-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs font-mono">
            <div className="flex items-center gap-2 text-ink-300 text-left">
              <Terminal className="w-4 h-4 text-white shrink-0" />
              <span className="text-[11px] sm:text-xs">Target: <strong className="text-white">{SAMPLE_LISTINGS[selectedJobIndex].title}</strong> at <strong className="text-white">{SAMPLE_LISTINGS[selectedJobIndex].company}</strong></span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-ink-400 self-end sm:self-auto">
              Client-Side Form Automation Ready
            </div>
          </div>
        </div>
      </section>

      {/* The Bottleneck Comparison Matrix */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-ink-100 bg-ink-50">
        <div className="max-w-5xl mx-auto space-y-10 sm:space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono tracking-widest text-ink-400 uppercase font-semibold">The Bottleneck</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950">Why traditional job hunting is broken.</h2>
            <p className="text-xs text-ink-500">Manual forms and aggregator reposts waste hours of your time with low response rates.</p>
          </div>

          <div className="bg-white border border-ink-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-fine overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 text-xs font-mono">
              <div className="space-y-4">
                <div className="text-ink-400 uppercase font-bold tracking-wider border-b border-ink-100 pb-2">
                  Traditional Job Hunting
                </div>
                <div className="space-y-3 text-ink-600">
                  <div className="flex items-center gap-2 text-ink-700">
                    <X className="w-4 h-4 text-ink-400 shrink-0" />
                    <span>20-minute manual form re-entry per position</span>
                  </div>
                  <div className="flex items-center gap-2 text-ink-700">
                    <X className="w-4 h-4 text-ink-400 shrink-0" />
                    <span>Expired &amp; ghost listings on third-party job boards</span>
                  </div>
                  <div className="flex items-center gap-2 text-ink-700">
                    <X className="w-4 h-4 text-ink-400 shrink-0" />
                    <span>Guessing recruiter email addresses with high bounce rates</span>
                  </div>
                  <div className="flex items-center gap-2 text-ink-700">
                    <X className="w-4 h-4 text-ink-400 shrink-0" />
                    <span>Scattered self-study without readiness benchmarks</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t md:border-t-0 md:border-l border-ink-100 pt-6 md:pt-0 md:pl-8">
                <div className="text-ink-950 uppercase font-bold tracking-wider border-b border-ink-100 pb-2">
                  Hirestack Desktop OS
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
                    <span>4-Stage SMTP/DNS verified HR &amp; Hiring Manager inboxes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>Structured career roadmaps with 1-click profile skill sync</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Architecture */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-ink-100">
        <div className="max-w-6xl mx-auto space-y-12 sm:space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono tracking-widest text-ink-400 uppercase font-semibold">Core Architecture</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950">Designed for both learning and applying.</h2>
            <p className="text-xs text-ink-500">Whether developing foundational domain skills or actively submitting job applications, Hirestack adapts to your journey.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Learner Track */}
            <div id="learner" className="bg-ink-50 border border-ink-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-5 sm:space-y-6 shadow-fine">
              <div className="w-10 h-10 rounded-xl bg-white border border-ink-200 flex items-center justify-center text-ink-950 shadow-fine">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-bold text-ink-950 tracking-tight">The Learner Track</h3>
                <p className="text-xs text-ink-600 leading-relaxed">
                  Tailored for students, graduates, and professionals building job-ready competency in any field or specialization.
                </p>
              </div>
              <ul className="space-y-2.5 sm:space-y-3 text-xs text-ink-700">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-ink-950 shrink-0 mt-0.5" />
                  <span>Dynamic step-by-step roadmaps across technical, business, design, and operational careers</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-ink-950 shrink-0 mt-0.5" />
                  <span>Curated industry resources, interview question banks &amp; case study preparation</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-ink-950 shrink-0 mt-0.5" />
                  <span>Job-Readiness score meter with 1-click skill synchronization into your candidate profile</span>
                </li>
              </ul>
            </div>

            {/* Seeker Track */}
            <div id="seeker" className="bg-ink-50 border border-ink-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-5 sm:space-y-6 shadow-fine">
              <div className="w-10 h-10 rounded-xl bg-white border border-ink-200 flex items-center justify-center text-ink-950 shadow-fine">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-bold text-ink-950 tracking-tight">The Seeker Track</h3>
                <p className="text-xs text-ink-600 leading-relaxed">
                  Designed for active candidates ready to execute automated applications and direct recruiter outreach.
                </p>
              </div>
              <ul className="space-y-2.5 sm:space-y-3 text-xs text-ink-700">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-ink-950 shrink-0 mt-0.5" />
                  <span>Direct ATS job stream from Greenhouse, Lever, Ashby, Internshala, and top company portals</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-ink-950 shrink-0 mt-0.5" />
                  <span>Semi-Auto 20-tab review mode + 100% Autonomous form auto-submitter</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-ink-950 shrink-0 mt-0.5" />
                  <span>Direct Hiring Manager &amp; HR discovery with 4-stage verified email outreach</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Cross-Industry Career Roadmaps */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-ink-100 bg-white">
        <div className="max-w-6xl mx-auto space-y-10 sm:space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono tracking-widest text-ink-400 uppercase font-semibold">Career Intelligence</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950">Cross-Field Career Roadmaps</h2>
            <p className="text-xs text-ink-500">Unrestricted career roadmaps for any role or industry. Select a domain below to inspect curriculum structures, or build custom tracks in the app.</p>
          </div>

          {/* Horizontally scrollable on mobile, flex-wrapped on tablet/desktop */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap sm:justify-center no-scrollbar -mx-4 px-4 sm:mx-0">
            {CAREER_DOMAINS.map(d => (
              <button
                key={d.id}
                onClick={() => handleDomainChange(d.id)}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  activeDomainId === d.id
                    ? 'bg-ink-950 text-white shadow-fine scale-105'
                    : 'bg-ink-50 text-ink-600 hover:text-ink-950 hover:bg-ink-100 border border-ink-200'
                }`}
              >
                {d.title}
              </button>
            ))}
          </div>

          <div ref={domainCardRef} className="bg-ink-50 border border-ink-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-fine space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink-200 pb-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-bold text-ink-950">{selectedDomain.title}</h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white text-ink-800 border border-ink-200 shrink-0">
                    {selectedDomain.badge}
                  </span>
                </div>
                <p className="text-xs text-ink-500 font-mono mt-1">{selectedDomain.tag}</p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[11px] font-mono text-ink-400">Target Role Focus:</span>
                <div className="text-xs sm:text-sm font-bold text-ink-950">{selectedDomain.role}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-ink-400 font-bold">Curriculum Modules:</h4>
                <ul className="space-y-2 text-xs text-ink-700">
                  {selectedDomain.modules.map((m, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-white p-3 rounded-xl border border-ink-200">
                      <span className="text-[10px] font-mono text-ink-400 font-bold shrink-0 mt-0.5">0{idx + 1}</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-ink-400 font-bold">Skills Pushed to Profile:</h4>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {selectedDomain.skills.map((sk, idx) => (
                    <span key={idx} className="text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg bg-white border border-ink-200 text-ink-900">
                      {sk}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-ink-500 pt-2 leading-relaxed">
                  Checking off milestones in the desktop application dynamically updates your Job-Readiness Score. When ready, 1-click transfers all acquired competencies directly into your Seeker candidate profile for automated job matching.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Bento Grid */}
      <section id="capabilities" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-ink-100 bg-ink-50">
        <div className="max-w-6xl mx-auto space-y-12 sm:space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono tracking-widest text-ink-400 uppercase font-semibold">Core Capabilities</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950">Precision automation for every candidate.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white border border-ink-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3 shadow-fine md:col-span-2 hover:border-ink-300 transition-all hover:shadow-lifted">
              <div className="w-9 h-9 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-center text-ink-950">
                <Search className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm sm:text-base text-ink-950">Direct ATS Opportunity Stream</h4>
              <p className="text-xs text-ink-600 leading-relaxed">
                Job listings across all departments are ingested directly from verified company ATS portals (Greenhouse, Lever, Ashby, and Internshala) with SHA-256 deduplication. Filter by remote, compensation, experience level, or match score without aggregator noise.
              </p>
            </div>

            <div className="bg-white border border-ink-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3 shadow-fine hover:border-ink-300 transition-all hover:shadow-lifted">
              <div className="w-9 h-9 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-center text-ink-950">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm sm:text-base text-ink-950">Client-Side Stealth Form Engine</h4>
              <p className="text-xs text-ink-600 leading-relaxed">
                Launches local Chromium instances with natural interaction patterns, avoiding anti-bot triggers while accurately pre-filling and submitting multi-field application forms.
              </p>
            </div>

            <div className="bg-white border border-ink-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3 shadow-fine hover:border-ink-300 transition-all hover:shadow-lifted">
              <div className="w-9 h-9 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-center text-ink-950">
                <Mail className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm sm:text-base text-ink-950">0-Bounce Recruiter Outreach</h4>
              <p className="text-xs text-ink-600 leading-relaxed">
                4-stage verification (Syntax / Role Filter / DNS MX / Real-time SMTP Handshake) ensures networking messages reach the hiring manager's primary inbox without bouncing.
              </p>
            </div>

            <div className="bg-white border border-ink-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3 shadow-fine md:col-span-2 hover:border-ink-300 transition-all hover:shadow-lifted">
              <div className="w-9 h-9 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-center text-ink-950">
                <Shield className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm sm:text-base text-ink-950">Local-First Storage &amp; Hardware Lock</h4>
              <p className="text-xs text-ink-600 leading-relaxed">
                Your candidate profile, resume documents, and private data are saved locally in SQLite (`sql.js`). Hardware fingerprinting guarantees that your active session is securely tied to your authorized laptop.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (3 Tiers, All Sales Final) */}
      <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-ink-100 bg-white">
        <div className="max-w-6xl mx-auto text-center space-y-12 sm:space-y-16">
          <div className="max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono tracking-widest text-ink-400 uppercase font-semibold">Pricing</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950">Start Free. Scale With Automation.</h2>
            <p className="text-xs text-ink-500">Upgrade directly inside the desktop application via Razorpay. All sales are final.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 text-left max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className="border border-ink-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-white flex flex-col justify-between hover:border-ink-300 transition-all shadow-fine">
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg text-ink-950">Learner &amp; Seeker Free</h3>
                  <p className="text-xs text-ink-500 mt-1">For exploring career roadmaps &amp; live job feeds</p>
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-6 text-ink-950">
                    ₹0 <span className="text-xs text-ink-400 font-normal font-mono">/ forever</span>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-ink-700 border-t border-ink-100 pt-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>Access to all Career Roadmaps &amp; Tracks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>Curated Resource Vault &amp; Interview Question Banks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-ink-950 shrink-0" />
                    <span>Live Job Board stream across all industries</span>
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
                href="#/download"
                className="mt-8 block text-center w-full py-3 bg-ink-50 hover:bg-ink-100 border border-ink-200 text-ink-950 rounded-xl font-bold text-xs transition-colors"
              >
                Download Free Version
              </a>
            </div>

            {/* Pro Tier */}
            <div className="border border-ink-300 rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-white flex flex-col justify-between hover:border-ink-950 transition-all shadow-lifted relative">
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-ink-950 bg-ink-100 px-2.5 py-0.5 rounded-full mb-1 font-bold">
                    Semi-Autonomous
                  </div>
                  <h3 className="font-bold text-lg text-ink-950">Seeker Pro</h3>
                  <p className="text-xs text-ink-500 mt-1">Accelerate applications with review mode</p>
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-6 text-ink-950">
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
                href="#/download"
                className="mt-8 block text-center w-full py-3 bg-ink-950 hover:bg-ink-800 text-white rounded-xl font-bold text-xs transition-colors shadow-fine"
              >
                Get Seeker Pro (₹299)
              </a>
            </div>

            {/* Turbo Tier */}
            <div className="border border-ink-950 rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-ink-950 text-white flex flex-col justify-between relative shadow-float">
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
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-6 text-white">
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
                    <span>Automated networking email sequences</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-white shrink-0" />
                    <span>Priority live feed refreshes (every 15 mins)</span>
                  </li>
                </ul>
              </div>

              <a
                href="#/download"
                className="mt-8 block text-center w-full py-3 bg-white hover:bg-ink-100 text-ink-950 rounded-xl font-bold text-xs transition-colors shadow-fine"
              >
                Get Seeker Turbo (₹599)
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-ink-100 bg-ink-50">
        <div className="max-w-3xl mx-auto space-y-10 sm:space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono tracking-widest text-ink-400 uppercase font-semibold">FAQ</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} className="border border-ink-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-white shadow-fine">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between text-left font-bold text-xs sm:text-sm text-ink-950 gap-3"
                >
                  <span>{item.question}</span>
                  {activeFaqIndex === idx ? <ChevronUp className="w-4 h-4 text-ink-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-ink-400 shrink-0" />}
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
      <footer className="border-t border-ink-100 py-10 sm:py-12 px-4 sm:px-6 bg-white text-xs text-ink-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <img
              src="./logo-icon.png"
              alt="Hirestack Logo Icon"
              className="h-6 w-6 rounded object-contain shadow-fine"
            />
            <div>
              <div className="text-sm font-extrabold tracking-tight text-ink-950">Hirestack</div>
              <p className="text-[11px] text-ink-400 mt-0.5 font-mono">Desktop Automation Software for All Job Seekers / 2026</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-5 sm:gap-6 font-semibold">
            <a href="#/download" className="hover:text-ink-950 transition-colors">Download App</a>
            <a href="#/terms" className="hover:text-ink-950 transition-colors">Terms of Service</a>
            <a href="#/privacy" className="hover:text-ink-950 transition-colors">Privacy Policy</a>
            <a href="mailto:support@hirestack.app" className="hover:text-ink-950 transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
