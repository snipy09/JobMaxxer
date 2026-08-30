import React, { useState } from 'react';
import {
  ArrowRight, Check, ShieldCheck,
  Search, Zap, Mail, ChevronDown, ChevronUp,
  Terminal, Laptop, Lock, Globe, Sparkles
} from 'lucide-react';

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-zinc-900 bg-white selection:bg-zinc-100">
      {/* Header */}
      <header className="px-6 py-5 flex justify-between items-center max-w-6xl mx-auto w-full border-b border-zinc-100">
        <div className="flex items-center gap-6">
          <a href="#/" className="font-extrabold text-lg tracking-tight text-zinc-900 hover:opacity-80 transition-opacity">
            JobMaxxer
          </a>
          <nav className="gap-6 text-xs font-medium text-zinc-500 hidden md:flex items-center">
            <a href="#features" className="hover:text-zinc-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-zinc-900 transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-zinc-900 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-zinc-900 transition-colors">FAQ</a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/snipy09/JobMaxxer/releases/latest"
            className="text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 px-4 py-2 rounded-full transition-all shadow-xs flex items-center gap-1.5"
          >
            <span>Download for Windows</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-zinc-50 border border-zinc-200 rounded-full text-xs font-medium text-zinc-600 mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Desktop Career Engine · v2.0 Released</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 text-zinc-900">
          Automate your job search.<br />
          <span className="text-zinc-400">Land interviews on autopilot.</span>
        </h1>

        <p className="text-base sm:text-lg text-zinc-500 mb-10 max-w-2xl leading-relaxed font-normal">
          The desktop platform designed for engineers and students. Discover direct-company job listings, auto-fill applications with AI, and connect with hiring managers directly.
        </p>

        <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto">
          <a
            href="https://github.com/snipy09/JobMaxxer/releases/latest"
            className="bg-zinc-900 text-white px-7 py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10"
          >
            <span>Download Free Desktop App</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#pricing"
            className="bg-white text-zinc-800 border border-zinc-200 px-7 py-3.5 rounded-full font-bold text-sm flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-300 transition-all"
          >
            View Pricing Plans
          </a>
        </div>

        {/* Value Badges */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-8 text-xs text-zinc-400 font-medium">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-zinc-600" /> Local-first SQLite privacy</span>
          <span className="flex items-center gap-1.5"><Laptop className="w-4 h-4 text-zinc-600" /> Single-device hardware lock</span>
          <span className="flex items-center gap-1.5"><Terminal className="w-4 h-4 text-zinc-600" /> Direct company portals (Zero spam)</span>
        </div>
      </main>

      {/* App Interface Visual Preview */}
      <section className="px-6 pb-20 max-w-5xl mx-auto w-full">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
              <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
              <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
              <span className="text-xs font-mono text-zinc-500 ml-2">JobMaxxer Desktop — Opportunity Stream</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
              Live Feed Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
            {[
              { title: 'Frontend Engineer', comp: 'Vercel', loc: 'Remote', match: '96% Match', type: 'Full-time' },
              { title: 'Software Development Intern', comp: 'Linear', loc: 'Hybrid', match: '92% Match', type: 'Internship' },
              { title: 'Backend Systems Engineer', comp: 'Supabase', loc: 'Remote', match: '88% Match', type: 'Full-time' },
            ].map((j, i) => (
              <div key={i} className="bg-zinc-800/60 border border-zinc-700/60 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">{j.comp}</span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-800/50">{j.match}</span>
                </div>
                <h4 className="text-sm font-bold text-white">{j.title}</h4>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-700/40 text-[11px] text-zinc-400">
                  <span>{j.loc} · {j.type}</span>
                  <span className="text-white font-bold">1-Click Auto Apply</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-24 bg-zinc-50/70 border-t border-zinc-100 px-6">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Features</h2>
            <p className="text-3xl font-extrabold tracking-tight text-zinc-900">Everything you need to get hired faster.</p>
            <p className="text-sm text-zinc-500">Stop scrolling dead boards and filling duplicate forms manually.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border border-zinc-200 rounded-3xl p-8 space-y-4 shadow-xs hover:border-zinc-300 transition-all">
              <div className="w-10 h-10 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-center text-zinc-900 shadow-2xs">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-zinc-900 tracking-tight">Direct ATS Stream</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Direct job feeds from Greenhouse, Lever, Ashby, and Internshala. Eliminates stale postings, expired links, and recruitment agency spam.
              </p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-3xl p-8 space-y-4 shadow-xs hover:border-zinc-300 transition-all">
              <div className="w-10 h-10 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-center text-zinc-900 shadow-2xs">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-zinc-900 tracking-tight">Intelligent Auto-Apply</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Pre-fills form fields, uploads targeted resumes, and answers complex custom application questions automatically using smart context awareness.
              </p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-3xl p-8 space-y-4 shadow-xs hover:border-zinc-300 transition-all">
              <div className="w-10 h-10 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-center text-zinc-900 shadow-2xs">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-zinc-900 tracking-tight">Direct Recruiter Outreach</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Discover verified Engineering Managers and Technical Recruiters. Pre-fills customized referral pitch emails directly into your browser.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 border-t border-zinc-100">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Workflow</h2>
            <p className="text-3xl font-extrabold tracking-tight text-zinc-900">How JobMaxxer Works</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-zinc-400">01</span>
              <h4 className="font-bold text-base text-zinc-900">Save Your Master Profile</h4>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Add your resume, target job titles, GitHub profile, and tech stack once. Encrypted safely on your local machine.
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-zinc-400">02</span>
              <h4 className="font-bold text-base text-zinc-900">Filter &amp; Select Positions</h4>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Filter live opportunities by relevance score, compensation, or remote preferences with instant 1-click batch selection.
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-zinc-400">03</span>
              <h4 className="font-bold text-base text-zinc-900">Trigger Auto-Apply or Outreach</h4>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Review applications in parallel tabs or run hands-off autonomous submissions with personalized cover letter generation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (3 Tiers) */}
      <section id="pricing" className="py-24 px-6 bg-zinc-50/70 border-t border-zinc-100">
        <div className="max-w-6xl mx-auto text-center space-y-16">
          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Pricing</h2>
            <p className="text-3xl font-extrabold tracking-tight text-zinc-900">Start Free. Upgrade for Automation.</p>
            <p className="text-sm text-zinc-500">Free forever for discovery and manual applications. Upgrade when you are ready to scale.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className="border border-zinc-200 rounded-3xl p-8 bg-white flex flex-col justify-between hover:border-zinc-300 transition-all shadow-xs">
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-xl text-zinc-900">Free Tier</h3>
                  <p className="text-xs text-zinc-500 mt-1.5">For exploring opportunities &amp; roadmaps</p>
                  <div className="text-4xl font-extrabold tracking-tight mt-6 text-zinc-900">
                    ₹0 <span className="text-xs text-zinc-400 font-normal">/ forever</span>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-zinc-600 border-t border-zinc-100 pt-6">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-zinc-900 shrink-0" />
                    <span>Access to live curated Job Board</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-zinc-900 shrink-0" />
                    <span>All 4 Career Roadmaps &amp; Resource Vault</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-zinc-900 shrink-0" />
                    <span>Job-readiness calculation &amp; tracking</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-zinc-900 shrink-0" />
                    <span>Manual application career portal links</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-zinc-300 line-through">
                    <span>Automated batch form fill engine</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-zinc-300 line-through">
                    <span>Verified recruiter contact directory</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://github.com/snipy09/JobMaxxer/releases/latest"
                className="mt-8 block text-center w-full py-3 bg-zinc-100 text-zinc-900 rounded-2xl font-bold text-xs hover:bg-zinc-200 transition-colors"
              >
                Download Free Version
              </a>
            </div>

            {/* Pro Tier */}
            <div className="border border-zinc-200 rounded-3xl p-8 bg-white flex flex-col justify-between hover:border-zinc-900 transition-all shadow-xs">
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-full mb-1">
                    Semi-Auto Review
                  </div>
                  <h3 className="font-bold text-xl text-zinc-900">Seeker Pro</h3>
                  <p className="text-xs text-zinc-500 mt-1.5">For active candidates accelerating submissions</p>
                  <div className="text-4xl font-extrabold tracking-tight mt-6 text-zinc-900">
                    ₹299 <span className="text-xs text-zinc-400 font-normal">/ month</span>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-zinc-600 border-t border-zinc-100 pt-6">
                  <li className="flex items-center gap-2.5 font-semibold text-zinc-900">
                    <Check className="w-4 h-4 text-zinc-900 shrink-0 font-bold" />
                    <span>Everything in Free Tier</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-zinc-900 shrink-0 font-bold" />
                    <span>20-Tab Parallel Review Mode</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-zinc-900 shrink-0 font-bold" />
                    <span>Smart ATS match scoring algorithm</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-zinc-900 shrink-0 font-bold" />
                    <span>25 Verified HR / Manager contacts per week</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-zinc-900 shrink-0 font-bold" />
                    <span>Cloud sync for application history</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-zinc-900 shrink-0 font-bold" />
                    <span>Single-laptop hardware license protection</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://github.com/snipy09/JobMaxxer/releases/latest"
                className="mt-8 block text-center w-full py-3 bg-zinc-900 text-white rounded-2xl font-bold text-xs hover:bg-zinc-800 transition-colors shadow-xs"
              >
                Get Seeker Pro (₹299)
              </a>
            </div>

            {/* Turbo Tier */}
            <div className="border-2 border-zinc-900 rounded-3xl p-8 bg-white flex flex-col justify-between relative shadow-xl shadow-zinc-900/10">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                Complete Autopilot
              </span>

              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-full mb-1">
                    Hands-Off Automation
                  </div>
                  <h3 className="font-bold text-xl text-zinc-900">Seeker Turbo</h3>
                  <p className="text-xs text-zinc-500 mt-1.5">Full hands-off autonomous application workflow</p>
                  <div className="text-4xl font-extrabold tracking-tight mt-6 text-zinc-900">
                    ₹599 <span className="text-xs text-zinc-400 font-normal">/ month</span>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-zinc-700 border-t border-zinc-100 pt-6">
                  <li className="flex items-center gap-2.5 font-bold text-zinc-900">
                    <Check className="w-4 h-4 text-zinc-900 shrink-0 font-bold" />
                    <span>Everything in Seeker Pro</span>
                  </li>
                  <li className="flex items-center gap-2.5 font-semibold text-zinc-900">
                    <Check className="w-4 h-4 text-zinc-900 shrink-0 font-bold" />
                    <span>100% Autonomous Form Submissions</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-zinc-900 shrink-0 font-bold" />
                    <span>AI-powered custom question answering</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-zinc-900 shrink-0 font-bold" />
                    <span>Unlimited Verified Recruiter Outreach</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-zinc-900 shrink-0 font-bold" />
                    <span>Smart referral email sequence generator</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-zinc-900 shrink-0 font-bold" />
                    <span>Priority live feed refreshes (every 15 mins)</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://github.com/snipy09/JobMaxxer/releases/latest"
                className="mt-8 block text-center w-full py-3 bg-zinc-900 text-white rounded-2xl font-bold text-xs hover:bg-zinc-800 transition-all shadow-md shadow-zinc-900/10"
              >
                Get Seeker Turbo (₹599)
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6 border-t border-zinc-100">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Questions &amp; Answers</h2>
            <p className="text-3xl font-extrabold tracking-tight text-zinc-900">Frequently Asked Questions</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'How does JobMaxxer auto-apply to jobs?',
                a: 'JobMaxxer runs an automated Chromium instance on your desktop. It navigates to career portals, parses form fields, maps your profile answers, attaches your selected resume, and submits the application securely.'
              },
              {
                q: 'Is my personal data and resume secure?',
                a: 'Yes. JobMaxxer is local-first. Your master profile and resume are stored in an isolated SQLite database on your computer. Your files and credentials are never sold or exposed.'
              },
              {
                q: 'What is the difference between Semi-Auto and Autonomous mode?',
                a: 'Semi-Auto mode opens up to 20 prefilled browser tabs for you to review and click submit yourself. Autonomous mode fills out all inputs (including dynamic questions) and submits on your behalf.'
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept UPI (Google Pay, PhonePe, Paytm, CRED), Debit/Credit cards, and Netbanking via Razorpay. Subscriptions are billed monthly with no long-term lock-in.'
              },
              {
                q: 'What is the refund policy?',
                a: 'We offer a 7-day no-questions-asked refund policy on first-time purchases. If you have any issue, email support@jobmaxxer.app and we will process your refund.'
              }
            ].map((faq, i) => (
              <div key={i} className="border border-zinc-200 rounded-2xl p-5 bg-white">
                <button
                  type="button"
                  onClick={() => toggleFaq(i)}
                  className="w-full flex items-center justify-between text-left font-bold text-sm text-zinc-900"
                >
                  <span>{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                </button>
                {openFaq === i && (
                  <p className="mt-3 text-xs text-zinc-500 leading-relaxed border-t border-zinc-100 pt-3">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="text-sm font-extrabold tracking-tight text-zinc-900">JobMaxxer</div>
            <p className="text-[11px] text-zinc-400 mt-0.5">Desktop Career Operating System &copy; 2026</p>
          </div>
          <div className="flex flex-wrap justify-center gap-5 text-xs font-medium text-zinc-500">
            <a href="#/terms" className="hover:text-zinc-900 hover:underline transition-colors">Terms &amp; Conditions</a>
            <a href="#/privacy" className="hover:text-zinc-900 hover:underline transition-colors">Privacy Policy</a>
            <a href="#/refund" className="hover:text-zinc-900 hover:underline transition-colors">Refund &amp; Cancellation</a>
            <a href="mailto:support@jobmaxxer.app" className="hover:text-zinc-900 hover:underline transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
