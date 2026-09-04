import React, { useState } from 'react';
import {
  ArrowRight, Check, X, Shield, Terminal,
  Laptop, Search, Mail, Zap, BookOpen,
  ChevronDown, ChevronUp, Menu, Briefcase,
  Download as DownloadIcon, Layers, Sparkles,
  Code, CheckCircle2, Cpu, ExternalLink,
  Lock, Play, RefreshCw, Send, Star,
  Database, FileText, Clock, Target, Compass,
  CheckSquare, Filter, Building2, User, ArrowUpRight,
  SlidersHorizontal, Inbox, Columns
} from 'lucide-react';

// Curriculum data for Learning section
const ROADMAP_NODES = [
  {
    id: 'foundations',
    stage: '01',
    level: 'Foundations',
    title: 'HTML / CSS',
    status: 'completed',
    description: 'Semantic document structure, CSS flexbox/grid tokens, responsive layouts, and accessibility standards.',
    skills: ['Semantic HTML', 'CSS Grid', 'Flexbox', 'Accessibility (a11y)'],
    progress: 100
  },
  {
    id: 'core-frontend',
    stage: '02',
    level: 'Practice',
    title: 'React',
    status: 'active',
    description: 'Component lifecycles, state management, custom hooks, virtual DOM reconciler, and client routing.',
    skills: ['Component Architecture', 'Custom Hooks', 'State Management', 'TypeScript'],
    progress: 85
  },
  {
    id: 'backend-apis',
    stage: '03',
    level: 'Practice',
    title: 'Backend APIs',
    status: 'upcoming',
    description: 'RESTful architecture, asynchronous event handling, HTTP verbs, middleware, and request validation.',
    skills: ['Node.js', 'Express', 'API Routing', 'Auth Handlers'],
    progress: 0
  },
  {
    id: 'databases',
    stage: '04',
    level: 'Projects',
    title: 'PostgreSQL',
    status: 'locked',
    description: 'Relational data modeling, ACID transactions, star schemas, indexing, and query optimization.',
    skills: ['SQL Schemas', 'Indexes', 'Foreign Keys', 'Query Tuning'],
    progress: 0
  },
  {
    id: 'production',
    stage: '05',
    level: 'Interview Ready',
    title: 'Production / CI/CD',
    status: 'locked',
    description: 'Containerization, automated test pipelines, GitHub Actions, cloud deployment, and system monitoring.',
    skills: ['Docker', 'GitHub Actions', 'Deployment', 'Monitoring'],
    progress: 0
  }
];

// Factual job discovery listings
const JOB_DISCOVERY_LISTINGS = [
  {
    id: 'job-1',
    company: 'Linear',
    role: 'Full-Stack Software Engineer',
    location: 'Remote · Global',
    source: 'Ashby Direct ATS',
    date: '2d ago',
    match: 96,
    skills: ['TypeScript', 'React', 'Node.js']
  },
  {
    id: 'job-2',
    company: 'Stripe',
    role: 'Backend Platform Engineer',
    location: 'Remote · US / Remote',
    source: 'Greenhouse Direct ATS',
    date: '1d ago',
    match: 94,
    skills: ['PostgreSQL', 'APIs', 'Distributed Systems']
  },
  {
    id: 'job-3',
    company: 'Vercel',
    role: 'Frontend Systems Engineer',
    location: 'Remote · US / EU',
    source: 'Lever Direct ATS',
    date: '3d ago',
    match: 92,
    skills: ['Next.js', 'React', 'Performance Tuning']
  },
  {
    id: 'job-4',
    company: 'Supabase',
    role: 'Database & Infrastructure Specialist',
    location: 'Remote · Global',
    source: 'Company Career Portal',
    date: 'Just now',
    match: 90,
    skills: ['PostgreSQL', 'Docker', 'Go']
  }
];

interface KanbanCard {
  company: string;
  role: string;
  location: string;
  salary?: string;
  status?: string;
  deadline?: string;
  scheduled?: string;
  note?: string;
}

// Kanban columns for application tracking
const KANBAN_STAGES: Array<{ title: string; count: number; cards: KanbanCard[] }> = [
  {
    title: 'Saved',
    count: 12,
    cards: [
      { company: 'Figma', role: 'Product Systems Engineer', location: 'Remote', salary: '$140k - $180k' },
      { company: 'Notion', role: 'Full-Stack Developer', location: 'Remote', salary: '$135k - $175k' }
    ]
  },
  {
    title: 'Applied',
    count: 8,
    cards: [
      { company: 'Linear', role: 'Full-Stack Engineer', location: 'Remote', status: 'Submitted · Ashby' },
      { company: 'Supabase', role: 'Infrastructure Specialist', location: 'Remote', status: 'Submitted · Direct' }
    ]
  },
  {
    title: 'Assessment',
    count: 3,
    cards: [
      { company: 'Vercel', role: 'Frontend Engineer', location: 'Remote', deadline: 'Due in 3 days' }
    ]
  },
  {
    title: 'Interview',
    count: 2,
    cards: [
      { company: 'Stripe', role: 'Backend Platform Engineer', location: 'Remote', scheduled: 'Tomorrow, 2:00 PM' }
    ]
  },
  {
    title: 'Offer',
    count: 1,
    cards: [
      { company: 'Raycast', role: 'Desktop App Engineer', location: 'Remote', note: 'Offer under review' }
    ]
  }
];

// Recruiter outreach sample contacts
const RECRUITER_CONTACTS = [
  { name: 'Sarah Chen', role: 'Technical Recruiting Lead', company: 'Linear', domain: 'linear.app', verified: true },
  { name: 'David Miller', role: 'Engineering Talent Partner', company: 'Stripe', domain: 'stripe.com', verified: true },
  { name: 'Elena Rostova', role: 'Head of People & Hiring', company: 'Vercel', domain: 'vercel.com', verified: true },
  { name: 'Marcus Vance', role: 'Senior Technical Recruiter', company: 'Supabase', domain: 'supabase.com', verified: true }
];

// 9 Factual FAQs as requested
const FAQS = [
  {
    q: 'What is Nomadic?',
    a: 'Nomadic is a desktop career platform combining structured career learning, direct ATS job discovery, application automation, and application tracking into one focused workspace.'
  },
  {
    q: 'How does Nomadic work?',
    a: 'Nomadic connects your skill development with your job search. You select your target role, work through practical milestones in the Learner Hub, discover matching openings from direct company hiring sources in the Seeker Hub, and use saved profile data to automate repetitive application steps.'
  },
  {
    q: 'What operating systems are supported?',
    a: 'Nomadic is built for Windows, macOS, and Linux as a native desktop application.'
  },
  {
    q: 'Can Nomadic automatically apply to jobs?',
    a: 'Supported plans can automate repetitive parts of the application process. In semi-automatic mode, Nomadic pre-fills your saved candidate information while you review each submission. In autonomous mode for supported workflows, repetitive steps can run according to your saved criteria and preferences. Availability depends on the specific job portal and configuration.'
  },
  {
    q: 'Which job sources are supported?',
    a: 'Nomadic supports discovery from major ATS platforms and hiring sources, including Greenhouse, Lever, Ashby, Internshala, and supported company career pages.'
  },
  {
    q: 'Where is my data stored?',
    a: 'Nomadic uses local-first architecture. Your candidate profile, resumes, notes, and application history are stored locally on your machine in an SQLite database.'
  },
  {
    q: 'Can I use Nomadic only for learning?',
    a: 'Yes. The Learner Hub can be used independently to follow structured career roadmaps, complete coding drills, and prepare for technical interviews.'
  },
  {
    q: 'Can I use Nomadic only for job searching?',
    a: 'Yes. If you already have your skills and portfolio ready, you can use the Seeker Hub solely for job discovery, application tracking, and automation.'
  },
  {
    q: 'What plans are available?',
    a: 'Nomadic offers a 3-day Free Trial (₹0), Learner Pro (₹199 for 3 months), Seeker Pro (₹379 for 3 months), and Seeker Max (₹749 for 3 months, which includes the complete feature set).'
  }
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'jobs' | 'roadmap' | 'tracker' | 'outreach'>('jobs');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');

  return (
    <div className="min-h-screen bg-white text-[#111111] font-sans antialiased selection:bg-black selection:text-white flex flex-col">
      {/* 1. Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E5E5E5] transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="#/" className="flex items-center gap-2.5 group">
              <img
                src="./logo-icon.png"
                alt="Nomadic Logo"
                className="h-6 w-6 rounded object-contain"
              />
              <span className="font-semibold text-base tracking-tight text-[#0A0A0A]">
                Nomadic
              </span>
            </a>

            <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-[#666666]">
              <a href="#platform" className="hover:text-[#0A0A0A] transition-colors">Platform</a>
              <a href="#learning" className="hover:text-[#0A0A0A] transition-colors">Learning</a>
              <a href="#discovery" className="hover:text-[#0A0A0A] transition-colors">Job Search</a>
              <a href="#automation" className="hover:text-[#0A0A0A] transition-colors">Automation</a>
              <a href="#pricing" className="hover:text-[#0A0A0A] transition-colors">Pricing</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#/download"
              className="hidden sm:inline-flex text-[13px] font-medium text-[#666666] hover:text-[#0A0A0A] transition-colors px-3 py-1.5"
            >
              Download
            </a>
            <a
              href="#/download"
              className="text-[13px] font-medium bg-[#0A0A0A] hover:bg-black text-white px-4 py-2 rounded-lg transition-all shadow-xs active:scale-[0.98]"
            >
              Get Started
            </a>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-md border border-[#E5E5E5] text-[#111111] hover:bg-[#F5F5F5] transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#E5E5E5] bg-white px-6 py-4 space-y-3 text-sm font-medium text-[#111111] shadow-md">
            <a href="#platform" onClick={() => setMobileMenuOpen(false)} className="block py-1">Platform</a>
            <a href="#learning" onClick={() => setMobileMenuOpen(false)} className="block py-1">Learning</a>
            <a href="#discovery" onClick={() => setMobileMenuOpen(false)} className="block py-1">Job Search</a>
            <a href="#automation" onClick={() => setMobileMenuOpen(false)} className="block py-1">Automation</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-1">Pricing</a>
            <div className="pt-2 border-t border-[#E5E5E5] flex flex-col gap-2">
              <a
                href="#/download"
                className="w-full text-center text-xs font-medium bg-[#0A0A0A] text-white py-2 rounded-lg"
              >
                Download Nomadic
              </a>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="pt-16 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#f0f7ff] text-[#0369a1] border border-[#bae2fd]/70 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
            <span>Universal Career OS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-[#0A0A0A] leading-[1.1]">
            Build your career.<br />
            Automate the busywork.
          </h1>

          <p className="text-base sm:text-lg text-[#555555] max-w-2xl mx-auto leading-relaxed font-normal">
            Nomadic brings career learning, job discovery, application automation, and application tracking into one focused desktop workspace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href="#/download"
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#0A0A0A] hover:bg-black text-white font-medium text-sm transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Download Nomadic</span>
            </a>

            <a
              href="#platform"
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-white hover:bg-[#F5F5F5] text-[#0A0A0A] font-medium text-sm border border-[#E5E5E5] transition-all flex items-center justify-center gap-2"
            >
              <span>Explore the Platform</span>
              <ArrowRight className="w-4 h-4 text-[#777777]" />
            </a>
          </div>

          <p className="text-xs text-[#777777] font-medium tracking-wide">
            Windows · macOS · Linux
          </p>
        </div>

        {/* 3. Hero Product Visual (Realistic Product Frame) */}
        <div id="proof" className="mt-12 sm:mt-16 max-w-5xl mx-auto">
          <div className="rounded-xl border border-[#E5E5E5] bg-white shadow-xl overflow-hidden">
            {/* Window chrome header */}
            <div className="bg-[#FAFAFA] px-4 py-2.5 border-b border-[#E5E5E5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5]" />
                <span className="ml-2 text-xs font-medium text-[#777777]">Nomadic Desktop Workspace</span>
              </div>
              <div className="text-[11px] font-mono text-[#666666] bg-white px-2 py-0.5 rounded border border-[#E5E5E5]">
                Local SQLite · Ready
              </div>
            </div>

            {/* In-app mockup layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[380px] bg-white text-xs">
              {/* Internal Sidebar */}
              <div className="md:col-span-3 border-r border-[#E5E5E5] bg-[#FAFAFA] p-3 space-y-4">
                <div className="space-y-1">
                  <span className="px-2 text-[10px] font-semibold text-[#888888] uppercase tracking-wider">Workspaces</span>
                  <button
                    onClick={() => setActiveWorkspaceTab('jobs')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium flex items-center justify-between transition-colors ${
                      activeWorkspaceTab === 'jobs' ? 'bg-[#EEEEEE] text-[#0A0A0A]' : 'text-[#555555] hover:bg-[#EEEEEE]'
                    }`}
                  >
                    <span className="flex items-center gap-2"><Search className="w-3.5 h-3.5" /> Job Board</span>
                    <span className="text-[10px] text-[#777777]">1,280+</span>
                  </button>

                  <button
                    onClick={() => setActiveWorkspaceTab('tracker')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium flex items-center justify-between transition-colors ${
                      activeWorkspaceTab === 'tracker' ? 'bg-[#EEEEEE] text-[#0A0A0A]' : 'text-[#555555] hover:bg-[#EEEEEE]'
                    }`}
                  >
                    <span className="flex items-center gap-2"><Columns className="w-3.5 h-3.5" /> Tracker</span>
                    <span className="text-[10px] text-[#777777]">14 active</span>
                  </button>

                  <button
                    onClick={() => setActiveWorkspaceTab('roadmap')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium flex items-center justify-between transition-colors ${
                      activeWorkspaceTab === 'roadmap' ? 'bg-[#EEEEEE] text-[#0A0A0A]' : 'text-[#555555] hover:bg-[#EEEEEE]'
                    }`}
                  >
                    <span className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5" /> Learning Path</span>
                    <span className="text-[10px] text-[#777777]">85%</span>
                  </button>

                  <button
                    onClick={() => setActiveWorkspaceTab('outreach')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium flex items-center justify-between transition-colors ${
                      activeWorkspaceTab === 'outreach' ? 'bg-[#EEEEEE] text-[#0A0A0A]' : 'text-[#555555] hover:bg-[#EEEEEE]'
                    }`}
                  >
                    <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Recruiter Leads</span>
                    <span className="text-[10px] text-[#777777]">Verified</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-[#E5E5E5] space-y-2">
                  <span className="px-2 text-[10px] font-semibold text-[#888888] uppercase tracking-wider">Candidate Profile</span>
                  <div className="px-2 py-1.5 bg-white rounded border border-[#E5E5E5] space-y-1">
                    <div className="font-semibold text-[#0A0A0A]">Software Engineer</div>
                    <div className="text-[10px] text-[#777777]">Resume: resume_2026.pdf</div>
                    <div className="flex gap-1 pt-1 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-[#F5F5F5] text-[9px] font-mono">React</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#F5F5F5] text-[9px] font-mono">TypeScript</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#F5F5F5] text-[9px] font-mono">Node.js</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="md:col-span-9 p-4 bg-white flex flex-col justify-between">
                {activeWorkspaceTab === 'jobs' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                      <div className="font-semibold text-sm text-[#0A0A0A]">Live Job Radar (Direct ATS)</div>
                      <div className="flex items-center gap-2 text-[11px] text-[#666666]">
                        <span className="px-2 py-0.5 rounded bg-[#F5F5F5] border border-[#E5E5E5]">Ashby</span>
                        <span className="px-2 py-0.5 rounded bg-[#F5F5F5] border border-[#E5E5E5]">Greenhouse</span>
                        <span className="px-2 py-0.5 rounded bg-[#F5F5F5] border border-[#E5E5E5]">Lever</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {JOB_DISCOVERY_LISTINGS.map(job => (
                        <div key={job.id} className="p-3 rounded-lg border border-[#E5E5E5] hover:border-[#CCCCCC] transition-colors flex items-center justify-between bg-white">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#0A0A0A]">{job.role}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F5F5F5] border border-[#E5E5E5] text-[#555555]">{job.source}</span>
                            </div>
                            <div className="text-[11px] text-[#666666] flex items-center gap-2">
                              <span>{job.company}</span>
                              <span>·</span>
                              <span>{job.location}</span>
                              <span>·</span>
                              <span className="text-[#888888]">{job.date}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-medium text-[#111111]">{job.match}% Match</span>
                            <button className="px-2.5 py-1 rounded bg-[#0A0A0A] text-white text-[11px] font-medium hover:bg-black transition-colors">
                              Apply
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeWorkspaceTab === 'tracker' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                      <div className="font-semibold text-sm text-[#0A0A0A]">Application Pipeline (Kanban)</div>
                      <span className="text-[11px] text-[#666666]">14 Active Applications</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
                        <div className="flex justify-between font-semibold text-[11px] text-[#0A0A0A]">
                          <span>Applied</span>
                          <span className="text-[#888888]">8</span>
                        </div>
                        <div className="p-2 rounded bg-white border border-[#E5E5E5] text-[10px] space-y-1">
                          <div className="font-medium text-[#0A0A0A]">Linear</div>
                          <div className="text-[#666666]">Full-Stack Engineer</div>
                          <div className="text-[#888888]">Ashby Direct · 2d ago</div>
                        </div>
                        <div className="p-2 rounded bg-white border border-[#E5E5E5] text-[10px] space-y-1">
                          <div className="font-medium text-[#0A0A0A]">Supabase</div>
                          <div className="text-[#666666]">Database Specialist</div>
                          <div className="text-[#888888]">Direct · 3d ago</div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
                        <div className="flex justify-between font-semibold text-[11px] text-[#0A0A0A]">
                          <span>Assessment</span>
                          <span className="text-[#888888]">3</span>
                        </div>
                        <div className="p-2 rounded bg-white border border-[#E5E5E5] text-[10px] space-y-1">
                          <div className="font-medium text-[#0A0A0A]">Vercel</div>
                          <div className="text-[#666666]">Frontend Engineer</div>
                          <div className="text-[#0A0A0A] font-semibold">Take-Home · Due Friday</div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
                        <div className="flex justify-between font-semibold text-[11px] text-[#0A0A0A]">
                          <span>Interview</span>
                          <span className="text-[#888888]">2</span>
                        </div>
                        <div className="p-2 rounded bg-white border border-[#E5E5E5] text-[10px] space-y-1">
                          <div className="font-medium text-[#0A0A0A]">Stripe</div>
                          <div className="text-[#666666]">Backend Platform</div>
                          <div className="text-[#0A0A0A] font-semibold">System Design · 2:00 PM</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeWorkspaceTab === 'roadmap' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                      <div className="font-semibold text-sm text-[#0A0A0A]">Target Role: Full-Stack Engineer</div>
                      <span className="text-[11px] font-medium text-[#0A0A0A]">Overall Progress: 68%</span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-[11px] text-[#0A0A0A]">1. Foundations: Semantic HTML &amp; Modern CSS</div>
                          <div className="text-[10px] text-[#666666]">Semantic HTML, CSS Tokens, Flexbox, Responsive Grid</div>
                        </div>
                        <span className="text-[10px] font-medium text-[#0A0A0A] px-2 py-0.5 rounded bg-white border border-[#E5E5E5]">Done ✓</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-[#0A0A0A] bg-white flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-[11px] text-[#0A0A0A]">2. Practice: TypeScript &amp; React Architecture</div>
                          <div className="text-[10px] text-[#666666]">Custom Hooks, Reconciler, State Machine, Type Guards</div>
                        </div>
                        <span className="text-[10px] font-semibold text-white px-2 py-0.5 rounded bg-[#0A0A0A]">Active · 85%</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-[11px] text-[#0A0A0A]">3. Projects: Backend APIs &amp; PostgreSQL</div>
                          <div className="text-[10px] text-[#666666]">Node.js, Relational Modeling, Indexing, REST Handlers</div>
                        </div>
                        <span className="text-[10px] text-[#888888] px-2 py-0.5 rounded bg-white border border-[#E5E5E5]">Up Next</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeWorkspaceTab === 'outreach' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                      <div className="font-semibold text-sm text-[#0A0A0A]">Recruiter &amp; Hiring Contacts Directory</div>
                      <span className="text-[11px] text-[#666666]">4 Validated Contacts</span>
                    </div>
                    <div className="space-y-1.5">
                      {RECRUITER_CONTACTS.map(c => (
                        <div key={c.name} className="p-2.5 rounded-lg border border-[#E5E5E5] flex items-center justify-between bg-white text-[11px]">
                          <div>
                            <span className="font-semibold text-[#0A0A0A]">{c.name}</span>
                            <span className="text-[#666666] ml-2">· {c.role} at {c.company}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F5F5F5] border border-[#E5E5E5] text-[#555555]">
                              Verified MX
                            </span>
                            <button className="px-2 py-0.5 rounded border border-[#E5E5E5] text-[10px] font-medium hover:bg-[#F5F5F5]">
                              Draft Email
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Bar */}
                <div className="mt-4 pt-2 border-t border-[#E5E5E5] flex items-center justify-between text-[11px] text-[#777777]">
                  <span>Controlled queue: 1 active worker</span>
                  <span>Data stored locally in SQLite</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Trust / Value Strip */}
      <section className="py-8 border-y border-[#E5E5E5] bg-[#FAFAFA]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-[#0A0A0A] tracking-wider uppercase">Local-First</div>
              <p className="text-xs text-[#666666] leading-relaxed">Your career data stays close to your device.</p>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-[#0A0A0A] tracking-wider uppercase">Direct Sources</div>
              <p className="text-xs text-[#666666] leading-relaxed">Discover opportunities from supported ATS platforms.</p>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-[#0A0A0A] tracking-wider uppercase">Automation</div>
              <p className="text-xs text-[#666666] leading-relaxed">Reduce repetitive application work.</p>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-[#0A0A0A] tracking-wider uppercase">One Workspace</div>
              <p className="text-xs text-[#666666] leading-relaxed">Learning, jobs, applications and progress in one place.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section: The Problem */}
      <section className="py-20 px-4 sm:px-6 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A]">
              Job hunting is a workflow.<br />
              Why manage it across five different tools?
            </h2>
            <p className="text-sm sm:text-base text-[#555555] leading-relaxed">
              When each step of your career search is disconnected, you spend more time managing tools than making progress.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
              <span className="text-[11px] font-mono font-bold text-[#888888] uppercase tracking-wider">Learning</span>
              <p className="text-sm font-semibold text-[#0A0A0A]">Random courses without a clear path.</p>
              <p className="text-xs text-[#666666] leading-relaxed">
                Collecting disconnected tutorials without knowing what skills are required for your target role.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
              <span className="text-[11px] font-mono font-bold text-[#888888] uppercase tracking-wider">Discovery</span>
              <p className="text-sm font-semibold text-[#0A0A0A]">Repeated listings across job boards.</p>
              <p className="text-xs text-[#666666] leading-relaxed">
                Sorting through stale postings and third-party aggregators instead of direct hiring sources.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
              <span className="text-[11px] font-mono font-bold text-[#888888] uppercase tracking-wider">Applications</span>
              <p className="text-sm font-semibold text-[#0A0A0A]">The same information entered over and over.</p>
              <p className="text-xs text-[#666666] leading-relaxed">
                Manually copying your contact details, education, resume, and experience into every form.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
              <span className="text-[11px] font-mono font-bold text-[#888888] uppercase tracking-wider">Tracking</span>
              <p className="text-sm font-semibold text-[#0A0A0A]">Applications scattered everywhere.</p>
              <p className="text-xs text-[#666666] leading-relaxed">
                Losing track of dates, interview stages, follow-ups, and recruiter emails across messy spreadsheets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Section: One Workspace */}
      <section id="platform" className="py-20 px-4 sm:px-6 bg-[#FAFAFA] border-b border-[#E5E5E5]">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A]">
              Everything around your job search,<br />
              in one workspace.
            </h2>
            <p className="text-sm sm:text-base text-[#555555] leading-relaxed">
              Nomadic consolidates the key stages of your career preparation and job hunt into a single, cohesive workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: UI Display */}
            <div className="lg:col-span-7 rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
                <span className="text-xs font-semibold text-[#0A0A0A]">Nomadic Unified Engine</span>
                <span className="text-[11px] text-[#666666] font-mono">SQLite Local DB</span>
              </div>
              <div className="space-y-2.5">
                <div className="p-3 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#0A0A0A] block">01 — Learn</span>
                    <span className="text-[11px] text-[#666666]">Structured milestone progression based on target roles</span>
                  </div>
                  <Check className="w-4 h-4 text-[#0A0A0A]" />
                </div>
                <div className="p-3 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#0A0A0A] block">02 — Discover</span>
                    <span className="text-[11px] text-[#666666]">Real-time direct company ATS feed (Ashby, Greenhouse, Lever)</span>
                  </div>
                  <Check className="w-4 h-4 text-[#0A0A0A]" />
                </div>
                <div className="p-3 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#0A0A0A] block">03 — Apply</span>
                    <span className="text-[11px] text-[#666666]">Semi-automatic and autonomous supported application workflows</span>
                  </div>
                  <Check className="w-4 h-4 text-[#0A0A0A]" />
                </div>
                <div className="p-3 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#0A0A0A] block">04 — Track</span>
                    <span className="text-[11px] text-[#666666]">Kanban application tracker and verified recruiter directory</span>
                  </div>
                  <Check className="w-4 h-4 text-[#0A0A0A]" />
                </div>
              </div>
            </div>

            {/* Right: Four Numbered Items */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-1">
                <span className="font-mono text-xl font-bold text-[#0A0A0A]">01 — Learn</span>
                <p className="text-xs sm:text-sm text-[#555555] leading-relaxed">
                  Follow structured roadmaps for your target role.
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-xl font-bold text-[#0A0A0A]">02 — Discover</span>
                <p className="text-xs sm:text-sm text-[#555555] leading-relaxed">
                  Find opportunities from supported hiring sources.
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-xl font-bold text-[#0A0A0A]">03 — Apply</span>
                <p className="text-xs sm:text-sm text-[#555555] leading-relaxed">
                  Automate repetitive parts of supported applications.
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-xl font-bold text-[#0A0A0A]">04 — Track</span>
                <p className="text-xs sm:text-sm text-[#555555] leading-relaxed">
                  Keep your applications and progress organized.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Section: Learning */}
      <section id="learning" className="py-20 px-4 sm:px-6 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="max-w-2xl space-y-3">
            <span className="text-[11px] font-mono font-bold text-[#888888] uppercase tracking-wider">Career Roadmap</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A]">
              Know what to learn next.
            </h2>
            <p className="text-sm sm:text-base text-[#555555] leading-relaxed">
              Build skills around the role you actually want. Move through structured milestones from core fundamentals to practical exercises and portfolio projects.
            </p>
          </div>

          {/* Interactive-looking Roadmap UI */}
          <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E5E5E5]">
              <div>
                <span className="text-xs text-[#777777] font-medium">Curriculum Progression</span>
                <h3 className="text-base font-bold text-[#0A0A0A]">Full-Stack Software Engineering</h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0A0A0A]">
                <span className="w-2 h-2 rounded-full bg-[#0A0A0A]" />
                <span>Foundations → Practice → Projects → Interview Ready</span>
              </div>
            </div>

            <div className="space-y-3">
              {ROADMAP_NODES.map((node) => (
                <div
                  key={node.id}
                  className={`p-4 rounded-lg border transition-all ${
                    node.status === 'active'
                      ? 'border-[#0A0A0A] bg-white shadow-xs'
                      : node.status === 'completed'
                      ? 'border-[#E5E5E5] bg-white'
                      : 'border-[#E5E5E5] bg-[#F5F5F5] opacity-75'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#777777]">{node.stage}</span>
                        <span className="text-xs font-semibold text-[#0A0A0A] uppercase tracking-wider">
                          {node.level}
                        </span>
                        <span className="text-sm font-bold text-[#0A0A0A]">· {node.title}</span>
                      </div>
                      <p className="text-xs text-[#666666] max-w-xl">
                        {node.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      {node.status === 'completed' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EEEEEE] text-[#0A0A0A] border border-[#E5E5E5]">
                          Completed ✓
                        </span>
                      )}
                      {node.status === 'active' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#0A0A0A] text-white">
                          In Progress ({node.progress}%)
                        </span>
                      )}
                      {node.status === 'upcoming' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-white text-[#666666] border border-[#E5E5E5]">
                          Up Next
                        </span>
                      )}
                      {node.status === 'locked' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#E5E5E5] text-[#777777]">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-3">
                    {node.skills.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded bg-[#F5F5F5] text-[10px] font-mono text-[#555555] border border-[#E5E5E5]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-xs text-[#666666] flex items-center justify-between">
              <span>5 Milestones · Lessons, exercises, projects &amp; interview preparation</span>
              <span className="font-semibold text-[#0A0A0A]">Progress synced to Seeker Profile</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Section: Job Discovery */}
      <section id="discovery" className="py-20 px-4 sm:px-6 bg-[#FAFAFA] border-b border-[#E5E5E5]">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="max-w-2xl space-y-3">
            <span className="text-[11px] font-mono font-bold text-[#888888] uppercase tracking-wider">Direct Discovery</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A]">
              Find opportunities closer to the source.
            </h2>
            <p className="text-sm sm:text-base text-[#555555] leading-relaxed">
              Search supported ATS and company hiring sources without jumping between dozens of tabs.
            </p>
          </div>

          {/* Job Discovery Dashboard */}
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#0A0A0A]">Sources:</span>
                <span className="px-2 py-1 rounded bg-[#F5F5F5] border border-[#E5E5E5] text-[11px] font-medium text-[#444444]">Greenhouse</span>
                <span className="px-2 py-1 rounded bg-[#F5F5F5] border border-[#E5E5E5] text-[11px] font-medium text-[#444444]">Lever</span>
                <span className="px-2 py-1 rounded bg-[#F5F5F5] border border-[#E5E5E5] text-[11px] font-medium text-[#444444]">Ashby</span>
                <span className="px-2 py-1 rounded bg-[#F5F5F5] border border-[#E5E5E5] text-[11px] font-medium text-[#444444]">Internshala</span>
                <span className="px-2 py-1 rounded bg-[#F5F5F5] border border-[#E5E5E5] text-[11px] font-medium text-[#444444]">Direct Portals</span>
              </div>
              <span className="text-xs text-[#777777] font-mono">Deduplicated Feed</span>
            </div>

            <div className="divide-y divide-[#E5E5E5]">
              {JOB_DISCOVERY_LISTINGS.map(job => (
                <div key={job.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[#0A0A0A]">{job.role}</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#F5F5F5] text-[10px] font-mono border border-[#E5E5E5] text-[#555555]">{job.source}</span>
                    </div>
                    <div className="text-xs text-[#666666] flex items-center gap-2">
                      <span className="font-medium text-[#0A0A0A]">{job.company}</span>
                      <span>·</span>
                      <span>{job.location}</span>
                      <span>·</span>
                      <span className="text-[#888888]">{job.date}</span>
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      {job.skills.map(s => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-[#FAFAFA] text-[10px] text-[#666666] border border-[#EEEEEE]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#0A0A0A]">{job.match}% Match</span>
                    <a
                      href="#/download"
                      className="px-3 py-1.5 rounded-lg bg-[#0A0A0A] hover:bg-black text-white text-xs font-medium transition-colors"
                    >
                      Apply
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#E5E5E5] text-xs text-[#666666] flex items-center justify-between">
              <span>Jobs are deduplicated so you can focus on relevant opportunities without repeated listings.</span>
              <span className="font-mono text-[#0A0A0A]">Updated in real time</span>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Section: Application Automation */}
      <section id="automation" className="py-20 px-4 sm:px-6 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-3">
            <span className="text-[11px] font-mono font-bold text-[#888888] uppercase tracking-wider">Application Automation</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A]">
              Stop re-entering the same information.
            </h2>
            <p className="text-sm sm:text-base text-[#555555] leading-relaxed">
              Nomadic can automate repetitive parts of supported job application workflows using your saved candidate information.
            </p>
          </div>

          {/* Visual Sequence */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-4 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] space-y-1">
              <span className="font-mono text-xs text-[#888888]">STEP 01</span>
              <div className="font-bold text-sm text-[#0A0A0A]">PROFILE</div>
              <p className="text-[11px] text-[#666666]">Saved candidate info &amp; resume</p>
            </div>
            <div className="p-4 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] space-y-1">
              <span className="font-mono text-xs text-[#888888]">STEP 02</span>
              <div className="font-bold text-sm text-[#0A0A0A]">JOB</div>
              <p className="text-[11px] text-[#666666]">Direct ATS opening detected</p>
            </div>
            <div className="p-4 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] space-y-1">
              <span className="font-mono text-xs text-[#888888]">STEP 03</span>
              <div className="font-bold text-sm text-[#0A0A0A]">APPLICATION</div>
              <p className="text-[11px] text-[#666666]">Forms pre-filled accurately</p>
            </div>
            <div className="p-4 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] space-y-1">
              <span className="font-mono text-xs text-[#888888]">STEP 04</span>
              <div className="font-bold text-sm text-[#0A0A0A]">TRACKED</div>
              <p className="text-[11px] text-[#666666]">Logged automatically in pipeline</p>
            </div>
          </div>

          {/* Two distinct modes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] space-y-3">
              <div className="text-xs font-mono font-bold text-[#888888] uppercase tracking-wider">Mode 1</div>
              <h3 className="text-lg font-bold text-[#0A0A0A]">Semi-Automatic</h3>
              <p className="text-xs sm:text-sm text-[#555555] leading-relaxed">
                Review opportunities and let Nomadic handle repetitive application steps while keeping you involved in the process. You review the filled application before final submission.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] space-y-3">
              <div className="text-xs font-mono font-bold text-[#888888] uppercase tracking-wider">Mode 2</div>
              <h3 className="text-lg font-bold text-[#0A0A0A]">Autonomous</h3>
              <p className="text-xs sm:text-sm text-[#555555] leading-relaxed">
                Supported workflows can handle more of the application process automatically according to your configuration and criteria. You stay in control of your target roles and preferences.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-[#E5E5E5] bg-white text-xs text-[#666666] leading-relaxed">
            <strong className="text-[#0A0A0A]">Note:</strong> Application automation is supported for platforms with standard web forms and supported ATS layouts. You remain in full control of your candidate profile, criteria, and credentials.
          </div>
        </div>
      </section>

      {/* 10. Section: Application Tracker */}
      <section className="py-20 px-4 sm:px-6 bg-[#FAFAFA] border-b border-[#E5E5E5]">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="max-w-2xl space-y-3">
            <span className="text-[11px] font-mono font-bold text-[#888888] uppercase tracking-wider">Pipeline Management</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A]">
              Know where every application stands.
            </h2>
            <p className="text-sm sm:text-base text-[#555555] leading-relaxed">
              Keep applications, statuses, target companies, and upcoming deadlines organized in one clean board.
            </p>
          </div>

          {/* Kanban Board Visual */}
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm overflow-x-auto">
            <div className="min-w-[700px] grid grid-cols-5 gap-3">
              {KANBAN_STAGES.map(stage => (
                <div key={stage.title} className="rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] p-3 space-y-2">
                  <div className="flex items-center justify-between font-semibold text-xs text-[#0A0A0A] pb-2 border-b border-[#E5E5E5]">
                    <span>{stage.title}</span>
                    <span className="text-[10px] text-[#777777] font-mono bg-white px-1.5 py-0.5 rounded border border-[#E5E5E5]">
                      {stage.count}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {stage.cards.map((card, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-white border border-[#E5E5E5] text-[11px] space-y-1 shadow-2xs">
                        <div className="font-semibold text-[#0A0A0A]">{card.company}</div>
                        <div className="text-[#555555]">{card.role}</div>
                        {card.salary && <div className="text-[10px] text-[#888888]">{card.salary}</div>}
                        {card.status && <div className="text-[10px] text-[#666666]">{card.status}</div>}
                        {card.deadline && <div className="text-[10px] font-medium text-[#0A0A0A]">{card.deadline}</div>}
                        {card.scheduled && <div className="text-[10px] font-medium text-[#0A0A0A]">{card.scheduled}</div>}
                        {card.note && <div className="text-[10px] font-medium text-[#0A0A0A]">{card.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 11. Section: Recruiter Outreach */}
      <section className="py-20 px-4 sm:px-6 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="max-w-2xl space-y-3">
            <span className="text-[11px] font-mono font-bold text-[#888888] uppercase tracking-wider">Outreach Management</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A]">
              Reach the right people.
            </h2>
            <p className="text-sm sm:text-base text-[#555555] leading-relaxed">
              Organize recruiter and hiring contacts and manage targeted outreach from the same workspace.
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <span className="text-xs font-semibold text-[#0A0A0A]">Direct Contacts Directory</span>
              <span className="text-xs text-[#666666]">Organized by company</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RECRUITER_CONTACTS.map(contact => (
                <div key={contact.name} className="p-3.5 rounded-lg bg-white border border-[#E5E5E5] flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-[#0A0A0A]">{contact.name}</div>
                    <div className="text-[#666666]">{contact.role} · {contact.company}</div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#0A0A0A] font-medium bg-[#FAFAFA] px-2 py-0.5 rounded border border-[#E5E5E5]">
                    <Check className="w-3 h-3" />
                    <span>Domain verified</span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-[#666666] pt-2 border-t border-[#E5E5E5]">
              Supported verification workflows can check whether an email address appears valid before outreach.
            </p>
          </div>
        </div>
      </section>

      {/* 12. Section: How It Works */}
      <section className="py-20 px-4 sm:px-6 bg-[#FAFAFA] border-b border-[#E5E5E5]">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-3">
            <span className="text-[11px] font-mono font-bold text-[#888888] uppercase tracking-wider">Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A]">
              How it works
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-xl border border-[#E5E5E5] bg-white space-y-2">
              <span className="font-mono text-2xl font-bold text-[#0A0A0A]">01</span>
              <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider">Set your goal</h3>
              <p className="text-xs text-[#555555] leading-relaxed">
                Choose the role or career direction you're targeting.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-[#E5E5E5] bg-white space-y-2">
              <span className="font-mono text-2xl font-bold text-[#0A0A0A]">02</span>
              <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider">Build your profile</h3>
              <p className="text-xs text-[#555555] leading-relaxed">
                Add your skills, experience, resume and preferences.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-[#E5E5E5] bg-white space-y-2">
              <span className="font-mono text-2xl font-bold text-[#0A0A0A]">03</span>
              <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider">Discover &amp; apply</h3>
              <p className="text-xs text-[#555555] leading-relaxed">
                Find relevant jobs and automate supported repetitive steps.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-[#E5E5E5] bg-white space-y-2">
              <span className="font-mono text-2xl font-bold text-[#0A0A0A]">04</span>
              <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider">Keep improving</h3>
              <p className="text-xs text-[#555555] leading-relaxed">
                Use your learning roadmap and application data to improve your search.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 13. Section: Privacy / Technical (Desktop Architecture - Dark Contrast) */}
      <section className="py-20 px-4 sm:px-6 bg-[#0A0A0A] text-white border-y border-[#222222]">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-3">
            <span className="text-[11px] font-mono font-bold text-[#888888] uppercase tracking-wider">Desktop Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Built for your desktop.<br />
              Designed around your data.
            </h2>
            <p className="text-sm sm:text-base text-[#AAAAAA] leading-relaxed">
              Nomadic operates as a native application on your machine rather than a hosted cloud scraper, keeping your private candidate credentials under your direct ownership.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-[#262626] bg-[#141414] space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#222222] flex items-center justify-center text-white">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Local-First</h3>
              <p className="text-xs text-[#888888] leading-relaxed">
                Candidate information and application data can be stored locally using SQLite on your machine.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-[#262626] bg-[#141414] space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#222222] flex items-center justify-center text-white">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Controlled Automation</h3>
              <p className="text-xs text-[#888888] leading-relaxed">
                Browser automation runs through controlled workflows designed to manage system resources responsibly.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-[#262626] bg-[#141414] space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#222222] flex items-center justify-center text-white">
                <Laptop className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cross-Platform</h3>
              <p className="text-xs text-[#888888] leading-relaxed">
                Engineered natively for Windows, macOS and Linux.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 14. Section: Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[11px] font-mono font-bold text-[#888888] uppercase tracking-wider">Pricing</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A]">
              Simple, transparent pricing
            </h2>
            <p className="text-sm text-[#555555]">
              Start with a free 3-day trial. Upgrade as your job search expands.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Free Trial */}
            <div className="p-6 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider">Free Trial</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-[#0A0A0A]">₹0</span>
                    <span className="text-xs text-[#777777]">/ 3 days</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-[#555555]">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span>3-day trial</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span>Standard career roadmaps</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span>Curated job feed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span>Local data storage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span>Direct application links</span>
                  </li>
                </ul>
              </div>

              <a
                href="#/download"
                className="w-full text-center py-2 px-3 rounded-lg border border-[#E5E5E5] bg-white hover:bg-[#F5F5F5] text-xs font-semibold text-[#0A0A0A] transition-colors block"
              >
                Download Free Trial
              </a>
            </div>

            {/* Learner Pro */}
            <div className="p-6 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider">Learner Pro</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-[#0A0A0A]">₹79</span>
                    <span className="text-xs text-[#777777]">/ mo</span>
                  </div>
                  <p className="text-xs text-[#666666] mt-1">Complete Learner Track + Full Job Board.</p>
                </div>

                <ul className="space-y-2 text-xs text-[#555555]">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span><strong>Complete Learner Track</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span><strong>428+ Company LeetCode Question Bank</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span>Unlimited AI custom roadmaps</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span>All 12+ textbooks &amp; sheets</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span>52-Week activity streak heatmap</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span><strong>Full 1,000+ Job Board Feed</strong></span>
                  </li>
                </ul>
              </div>

              <a
                href="https://wa.me/919493833632?text=Hi%2C%20I%20want%20to%20upgrade%20to%20Nomadic%20Learner%20Pro%20(%E2%82%B979%2Fmo)."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors block"
              >
                Upgrade via WhatsApp (₹79)
              </a>
            </div>

            {/* Seeker Pro */}
            <div className="p-6 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider">Seeker Pro</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-[#0A0A0A]">₹149</span>
                    <span className="text-xs text-[#777777]">/ mo</span>
                  </div>
                  <p className="text-xs text-[#666666] mt-1">For active applicants &amp; job hunters.</p>
                </div>

                <ul className="space-y-2 text-xs text-[#555555]">
                  <li className="flex items-center gap-2 font-medium text-[#0A0A0A]">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span><strong>Complete Learner Pro</strong> included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span>Expanded 1,000+ source ATS feed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span>Semi-Auto Apply (50 apps/wk)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span>25 Verified HR leads/wk</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span>Multi-Resume library (up to 5)</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://wa.me/919493833632?text=Hi%2C%20I%20want%20to%20upgrade%20to%20Nomadic%20Seeker%20Pro%20(%E2%82%B9149%2Fmo)."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors block"
              >
                Upgrade via WhatsApp (₹149)
              </a>
            </div>

            {/* Seeker Max (Highlighted as complete product) */}
            <div className="p-6 rounded-xl border-2 border-[#0A0A0A] bg-white flex flex-col justify-between space-y-6 shadow-sm relative">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider">Seeker Max</h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0A0A0A] text-white">Full Autopilot</span>
                </div>
                <div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-[#0A0A0A]">₹299</span>
                    <span className="text-xs text-[#777777]">/ mo</span>
                  </div>
                  <p className="text-xs text-[#666666] mt-1">Full suite: 100% Autonomous Autopilot.</p>
                </div>

                <ul className="space-y-2 text-xs text-[#555555]">
                  <li className="flex items-center gap-2 font-medium text-[#0A0A0A]">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span><strong>Complete Learner Pro</strong> included</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium text-[#0A0A0A]">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span><strong>100% Autonomous Auto-Apply</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span>Automated 0%-bounce HR email drip</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span>Priority 15-min ATS ingest</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0A0A0A] shrink-0" />
                    <span>Hardware lock security</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://wa.me/919493833632?text=Hi%2C%20I%20want%20to%20upgrade%20to%20Nomadic%20Seeker%20Max%20(%E2%82%B9299%2Fmo)."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors block"
              >
                Upgrade via WhatsApp (₹299)
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 15. Section: FAQ */}
      <section id="faq" className="py-20 px-4 sm:px-6 bg-[#FAFAFA] border-b border-[#E5E5E5]">
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-[11px] font-mono font-bold text-[#888888] uppercase tracking-wider">FAQ</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A]">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-2">
            {FAQS.map((faq, idx) => (
              <div
                key={faq.q}
                className="rounded-lg border border-[#E5E5E5] bg-white overflow-hidden transition-all"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left font-semibold text-sm text-[#0A0A0A] flex items-center justify-between gap-4 hover:bg-[#FAFAFA] transition-colors"
                >
                  <span>{faq.q}</span>
                  {activeFaq === idx ? (
                    <ChevronUp className="w-4 h-4 text-[#777777] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#777777] shrink-0" />
                  )}
                </button>
                {activeFaq === idx && (
                  <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-[#555555] leading-relaxed border-t border-[#E5E5E5] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 16. Final CTA */}
      <section className="py-20 px-4 sm:px-6 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#0A0A0A] leading-tight">
            Your next opportunity<br />
            starts with a better workflow.
          </h2>

          <p className="text-sm sm:text-base text-[#555555] max-w-xl mx-auto leading-relaxed">
            Learn the skills. Find the opportunities. Spend less time on repetitive job-search work.
          </p>

          <div className="pt-2">
            <a
              href="#/download"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#0A0A0A] hover:bg-black text-white font-medium text-sm transition-all shadow-xs"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Download Nomadic</span>
            </a>
          </div>

          <div className="text-xs text-[#777777] font-medium pt-1">
            Windows · macOS · Linux
          </div>
        </div>
      </section>

      {/* 17. Footer */}
      <footer className="py-12 px-4 sm:px-6 bg-white text-xs text-[#666666]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <img
                src="./logo-icon.png"
                alt="Nomadic Logo"
                className="h-5 w-5 rounded object-contain"
              />
              <span className="font-bold text-sm text-[#0A0A0A]">Nomadic</span>
            </div>
            <p className="text-xs text-[#777777]">Career learning and job-search automation for your desktop.</p>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-medium text-[#555555]">
            <a href="#platform" className="hover:text-[#0A0A0A] transition-colors">Platform</a>
            <a href="#learning" className="hover:text-[#0A0A0A] transition-colors">Learning</a>
            <a href="#discovery" className="hover:text-[#0A0A0A] transition-colors">Job Search</a>
            <a href="#pricing" className="hover:text-[#0A0A0A] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#0A0A0A] transition-colors">FAQ</a>
            <a href="#/download" className="hover:text-[#0A0A0A] transition-colors">Download</a>
            <a href="#/terms" className="hover:text-[#0A0A0A] transition-colors">Terms</a>
            <a href="#/privacy" className="hover:text-[#0A0A0A] transition-colors">Privacy</a>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 mt-6 border-t border-[#E5E5E5] text-left text-[11px] text-[#888888]">
          © 2026 Nomadic Technologies. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
