import React from 'react';
import {
  ArrowRight, Briefcase, Zap, Search, ShieldCheck,
  BookOpen, Mail, Check, Sparkles, Terminal, Laptop, Cpu
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-white selection:bg-gray-100">
      {/* Navigation */}
      <header className="px-6 py-5 flex justify-between items-center max-w-6xl mx-auto w-full border-b border-gray-100">
        <div className="font-extrabold text-xl tracking-tight flex items-center gap-2">
          <div className="w-7 h-7 bg-black rounded-lg text-white flex items-center justify-center text-xs font-black shadow-xs">
            JM
          </div>
          <span>Job<span className="text-gray-400 font-medium">Maxxer</span></span>
        </div>
        <nav className="gap-8 text-xs font-semibold text-gray-600 hidden md:flex items-center">
          <a href="#features" className="hover:text-black transition-colors">Features</a>
          <a href="#roadmaps" className="hover:text-black transition-colors">Learner Track</a>
          <a href="#pricing" className="hover:text-black transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/snipy09/JobMaxxer/releases/latest"
            className="text-xs font-bold bg-black text-white hover:bg-gray-800 px-4 py-2 rounded-full transition-all shadow-xs flex items-center gap-1.5"
          >
            <span>Download Desktop App</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs font-semibold text-gray-700 mb-8 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Dual-Track Career OS · Learner &amp; Seeker</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.08] mb-6 text-slate-900">
          Learn the skills.<br />
          <span className="text-gray-400">Automate the applications.</span>
        </h1>

        <p className="text-base sm:text-lg text-gray-500 mb-10 max-w-2xl leading-relaxed font-normal">
          JobMaxxer is an all-in-one desktop operating system for engineers. Master structured roadmaps, explore verified ATS feeds, and let local Playwright automation apply to jobs and reach recruiters while you sleep.
        </p>

        <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto">
          <a
            href="https://github.com/snipy09/JobMaxxer/releases/latest"
            className="bg-black text-white px-7 py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-xl shadow-black/10"
          >
            <span>Download for Windows (Free)</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#pricing"
            className="bg-white text-gray-800 border border-gray-200 px-7 py-3.5 rounded-full font-bold text-sm flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            View Tiers &amp; Pricing
          </a>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400 font-medium">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-gray-500" /> Local-first SQLite privacy</span>
          <span className="flex items-center gap-1.5"><Laptop className="w-4 h-4 text-gray-500" /> 1-Laptop device locking</span>
          <span className="flex items-center gap-1.5"><Terminal className="w-4 h-4 text-gray-500" /> Zero LinkedIn spam</span>
        </div>
      </main>

      {/* Feature Pillars */}
      <section id="features" className="py-24 bg-gray-50/70 border-t border-gray-100 px-6">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Pillars of JobMaxxer</h2>
            <p className="text-3xl font-black tracking-tight text-slate-900">Engineered for candidates who value their time.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white border border-gray-200/80 rounded-3xl p-8 space-y-4 shadow-xs hover:border-gray-300 transition-all">
              <div className="w-11 h-11 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center text-slate-900 shadow-2xs">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 tracking-tight">Curated ATS Job Feed</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Direct live scrapers for Greenhouse, Lever, Ashby, and Internshala. Cryptographic SHA-256 deduplication and keyword matching against your tech stack.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-gray-200/80 rounded-3xl p-8 space-y-4 shadow-xs hover:border-gray-300 transition-all">
              <div className="w-11 h-11 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center text-slate-900 shadow-2xs">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 tracking-tight">Playwright Auto-Apply</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Choose Semi-Auto review mode (pre-fills 20 Chromium tabs simultaneously) or 100% Autonomous mode with Groq LLaMA 3.1 8B answering custom form questions.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-gray-200/80 rounded-3xl p-8 space-y-4 shadow-xs hover:border-gray-300 transition-all">
              <div className="w-11 h-11 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center text-slate-900 shadow-2xs">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 tracking-tight">0-Bounce Recruiter Outreach</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Discover Engineering Managers and Tech Recruiters. 4-stage SMTP/DNS verification ensures deliverability with humanized drip delays.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Learner Track Showcase */}
      <section id="roadmaps" className="py-24 px-6 border-t border-gray-100">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Learner Track</h2>
            <p className="text-3xl font-black tracking-tight text-slate-900">Zero to Job-Ready with Interactive Milestones.</p>
            <p className="text-sm text-gray-500">Don't know where to start? Check off milestones, practice curated interview questions, and measure your job readiness.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { title: 'Frontend Engineer', tag: 'React · TS · Next.js', hours: '145h', role: 'UI / Web Dev' },
              { title: 'Backend Engineer', tag: 'Node · Postgres · Redis', hours: '120h', role: 'APIs & Systems' },
              { title: 'Full Stack Dev', tag: 'MERN · PERN · Cloud', hours: '180h', role: 'End-to-End Apps' },
              { title: 'AI / LLM Developer', tag: 'Groq · RAG · pgvector', hours: '95h', role: 'GenAI & Agents' },
            ].map((track, i) => (
              <div key={i} className="border border-gray-200 rounded-2xl p-5 space-y-3 bg-white hover:border-black transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Track 0{i + 1}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-bold">{track.hours}</span>
                </div>
                <h4 className="font-bold text-base text-slate-900">{track.title}</h4>
                <p className="text-xs text-gray-500 font-mono">{track.tag}</p>
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-medium">
                  <span>{track.role}</span>
                  <span className="text-black font-bold">1-Click Skill Sync &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section — 3 Tiers (Free, Pro, Turbo) */}
      <section id="pricing" className="py-24 px-6 bg-gray-50/70 border-t border-gray-100">
        <div className="max-w-6xl mx-auto text-center space-y-16">
          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Fair &amp; Transparent</h2>
            <p className="text-3xl font-black tracking-tight text-slate-900">Start Free. Upgrade When You’re Ready.</p>
            <p className="text-sm text-gray-500">Free forever for learning and manual job hunting. Upgrade to Pro or Turbo for automated scale.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left max-w-5xl mx-auto">
            {/* Free / Learner Tier */}
            <div className="border border-gray-200 rounded-3xl p-8 bg-white flex flex-col justify-between hover:border-gray-300 transition-all shadow-xs">
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-xl text-slate-900">Learner &amp; Seeker Free</h3>
                  <p className="text-xs text-gray-500 mt-1.5">For students learning skills &amp; discovering jobs</p>
                  <div className="text-4xl font-black tracking-tight mt-6 text-slate-900">
                    ₹0 <span className="text-xs text-gray-400 font-normal">/ forever</span>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-gray-600 border-t border-gray-100 pt-6">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-slate-900 shrink-0" />
                    <span>Full access to all 4 Career Roadmaps</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-slate-900 shrink-0" />
                    <span>Curated Resource Vault &amp; Interview Q&amp;A</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-slate-900 shrink-0" />
                    <span>Live Job Board access (1,000+ listings)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-slate-900 shrink-0" />
                    <span>Job-Readiness score calculation</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-slate-900 shrink-0" />
                    <span>Manual career portal application links</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-gray-300 line-through">
                    <span>Playwright batch auto-apply engine</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-gray-300 line-through">
                    <span>Recruiter email verification &amp; outreach</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://github.com/snipy09/JobMaxxer/releases/latest"
                className="mt-8 block text-center w-full py-3 bg-gray-100 text-slate-900 rounded-2xl font-bold text-xs hover:bg-gray-200 transition-colors"
              >
                Download Free Desktop App
              </a>
            </div>

            {/* Seeker Pro Tier */}
            <div className="border border-gray-200 rounded-3xl p-8 bg-white flex flex-col justify-between hover:border-black transition-all shadow-xs">
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mb-1">
                    Semi-Autonomous
                  </div>
                  <h3 className="font-bold text-xl text-slate-900">Seeker Pro</h3>
                  <p className="text-xs text-gray-500 mt-1.5">For active candidates accelerating their hunt</p>
                  <div className="text-4xl font-black tracking-tight mt-6 text-slate-900">
                    ₹299 <span className="text-xs text-gray-400 font-normal">/ month</span>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-gray-600 border-t border-gray-100 pt-6">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0 font-bold" />
                    <span className="font-semibold text-slate-900">Everything in Free Tier</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0 font-bold" />
                    <span>20-Tab Semi-Auto Review Mode in Chromium</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0 font-bold" />
                    <span>Smart ATS Match Scoring (0–100%)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0 font-bold" />
                    <span>25 Verified HR Contacts per week</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0 font-bold" />
                    <span>Cloud Sync for saved jobs &amp; application history</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0 font-bold" />
                    <span>1-Laptop Hardware License protection</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-gray-300 line-through">
                    <span>100% Autonomous Groq AI form answering</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://github.com/snipy09/JobMaxxer/releases/latest"
                className="mt-8 block text-center w-full py-3 bg-slate-900 text-white rounded-2xl font-bold text-xs hover:bg-slate-800 transition-colors shadow-xs"
              >
                Get Seeker Pro (₹299)
              </a>
            </div>

            {/* Seeker Turbo Tier */}
            <div className="border-2 border-black rounded-3xl p-8 bg-white flex flex-col justify-between relative shadow-xl shadow-gray-200/60">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                100% Autopilot
              </span>

              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-black bg-gray-100 px-2 py-0.5 rounded-full mb-1">
                    Full AI Automation
                  </div>
                  <h3 className="font-bold text-xl text-slate-900">Seeker Turbo</h3>
                  <p className="text-xs text-gray-500 mt-1.5">For students wanting hands-off job applications</p>
                  <div className="text-4xl font-black tracking-tight mt-6 text-slate-900">
                    ₹599 <span className="text-xs text-gray-400 font-normal">/ month</span>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-gray-700 border-t border-gray-100 pt-6">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-black shrink-0 font-bold" />
                    <span className="font-bold text-slate-900">Everything in Seeker Pro</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-black shrink-0 font-bold" />
                    <span className="font-semibold text-slate-900">100% Autonomous Groq AI Form Submitter</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-black shrink-0 font-bold" />
                    <span>Dynamic open-ended question answering</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-black shrink-0 font-bold" />
                    <span>Unlimited Verified HR &amp; Manager Outreach</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-black shrink-0 font-bold" />
                    <span>Automated Gmail &amp; SMTP referral drip campaigns</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-black shrink-0 font-bold" />
                    <span>Priority Feed Synchronization (every 15 mins)</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://github.com/snipy09/JobMaxxer/releases/latest"
                className="mt-8 block text-center w-full py-3 bg-black text-white rounded-2xl font-bold text-xs hover:bg-gray-800 transition-all shadow-md shadow-black/15"
              >
                Get Seeker Turbo (₹599)
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer & Compliance Links */}
      <footer className="border-t border-gray-200 py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="text-sm font-black tracking-tight text-slate-900">JobMaxxer</div>
            <p className="text-[11px] text-gray-400 mt-0.5">Desktop Career Operating System &copy; 2026</p>
          </div>
          <div className="flex flex-wrap justify-center gap-5 text-xs font-medium text-gray-500">
            <a href="#/terms" className="hover:text-black hover:underline transition-colors">Terms &amp; Conditions</a>
            <a href="#/privacy" className="hover:text-black hover:underline transition-colors">Privacy Policy</a>
            <a href="#/refund" className="hover:text-black hover:underline transition-colors">Refund &amp; Cancellation</a>
            <a href="mailto:support@jobmaxxer.app" className="hover:text-black hover:underline transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
