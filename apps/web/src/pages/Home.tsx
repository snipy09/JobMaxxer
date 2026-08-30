import React, { useState } from 'react';
import {
  ArrowRight, Check, ShieldCheck,
  Search, Zap, Mail, ChevronDown, ChevronUp,
  Terminal, Laptop, Lock, Globe, Sparkles, BookOpen,
  Layers, Code, Server, Play, Cpu, CheckCircle2
} from 'lucide-react';

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-foreground bg-background-base selection:bg-accent/30 relative z-10">
      {/* Ambient Lighting Blobs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-accent/20 blur-[160px] pointer-events-none rounded-full animate-float -z-10" />
      <div className="fixed top-1/3 left-10 w-[500px] h-[500px] bg-indigo-900/15 blur-[140px] pointer-events-none rounded-full animate-float-delayed -z-10" />
      <div className="fixed bottom-10 right-10 w-[600px] h-[600px] bg-accent/10 blur-[150px] pointer-events-none rounded-full animate-float -z-10" />

      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center max-w-6xl mx-auto w-full border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background-base/60">
        <div className="flex items-center gap-8">
          <a href="#/" className="font-semibold text-lg tracking-tight text-foreground hover:text-white transition-colors">
            JobMaxxer
          </a>
          <nav className="gap-6 text-xs font-medium text-foreground-muted hidden md:flex items-center">
            <a href="#problem" className="hover:text-foreground transition-colors">The Problem</a>
            <a href="#learner" className="hover:text-foreground transition-colors">Learner Track</a>
            <a href="#seeker" className="hover:text-foreground transition-colors">Seeker Track</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/snipy09/JobMaxxer/releases/latest"
            className="text-xs font-medium bg-accent hover:bg-accent-bright text-white px-4 py-2 rounded-lg transition-all shadow-glow flex items-center gap-1.5"
          >
            <span>Download App</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-28 pb-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-surface border border-border rounded-full text-xs font-mono tracking-wide text-foreground-muted mb-8 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
          <span>Desktop Career Engine · Build 2.0.1</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-semibold tracking-[-0.03em] leading-[1.08] mb-6 text-gradient">
          Master the skills.<br />
          <span className="text-gradient-accent">Automate the applications.</span>
        </h1>

        <p className="text-base sm:text-lg text-foreground-muted mb-10 max-w-2xl leading-relaxed font-normal">
          JobMaxxer is the high-performance desktop platform for engineers. Master structured roadmaps, tap into verified direct-company ATS feeds, and deploy local stealth automation to apply and reach hiring managers at scale.
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
            href="#pricing"
            className="bg-surface hover:bg-surface-hover text-foreground border border-border px-7 py-3.5 rounded-lg font-medium text-sm flex items-center justify-center transition-all"
          >
            View Pricing
          </a>
        </div>

        {/* Feature Badges */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-xs text-foreground-muted font-mono tracking-wider">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-accent" /> Local-first SQLite</span>
          <span className="flex items-center gap-1.5"><Laptop className="w-4 h-4 text-accent" /> Single-device hardware lock</span>
          <span className="flex items-center gap-1.5"><Terminal className="w-4 h-4 text-accent" /> Direct ATS scrapers</span>
        </div>
      </main>

      {/* The Problem Section */}
      <section id="problem" className="py-24 px-6 border-t border-border/40 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <span className="text-xs font-mono tracking-widest text-accent uppercase">The Bottleneck</span>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Why job hunting today is fundamentally broken.</h2>
            <p className="text-sm text-foreground-muted leading-relaxed">
              Job boards are filled with outdated listings, recruiter reposts, and thousands of candidates applying to the same stale links. Manually filling out 20-field ATS forms for hours every day is a complete waste of engineering bandwidth.
            </p>
            <p className="text-sm text-foreground-muted leading-relaxed">
              JobMaxxer flips the model: directly ingest live listings from Greenhouse, Lever, and Ashby, and let local automation handle the repetitive form work while you focus on technical interviews.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 text-foreground-muted">
              <span>TRADITIONAL HUNT</span>
              <span>JOBMAXXER OS</span>
            </div>
            <div className="space-y-2 text-foreground-muted">
              <div className="flex justify-between py-1 text-rose-400">
                <span>✕ Manual 15-min ATS forms</span>
                <span className="text-emerald-400">✓ 1-Click Stealth Apply</span>
              </div>
              <div className="flex justify-between py-1 text-rose-400">
                <span>✕ Stale LinkedIn spam</span>
                <span className="text-emerald-400">✓ Direct ATS JSON feeds</span>
              </div>
              <div className="flex justify-between py-1 text-rose-400">
                <span>✕ Cold email guesswork</span>
                <span className="text-emerald-400">✓ 4-Stage Verified HR Inbox</span>
              </div>
              <div className="flex justify-between py-1 text-rose-400">
                <span>✕ Unclear skill direction</span>
                <span className="text-emerald-400">✓ Interactive Roadmaps</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Persona Architecture */}
      <section className="py-24 px-6 border-t border-border/40 bg-background-elevated/40">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono tracking-widest text-accent uppercase">Dual-Persona Platform</span>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Built for both learning and scaling.</h2>
            <p className="text-sm text-foreground-muted">Whether you're breaking into tech or actively landing interviews, JobMaxxer is tailored to your phase.</p>
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
                  Designed for students and developers who want a clear path to becoming job-ready.
                </p>
              </div>
              <ul className="space-y-2.5 text-xs text-foreground-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>4 Interactive Career Roadmaps (Frontend, Backend, Fullstack, AI)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Curated documentation, open-source projects &amp; interview flashcards</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Live Job-Readiness Score Meter with 1-click skill sync to resume</span>
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
                  Designed for active candidates who want to deploy automated applications at scale.
                </p>
              </div>
              <ul className="space-y-2.5 text-xs text-foreground-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>High-throughput live ATS feed (Greenhouse, Lever, Ashby, Internshala)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Semi-Auto 20-tab review mode + 100% Autonomous form submitter</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Direct Hiring Manager discovery with 4-stage verified inbox outreach</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive (Bento Grid Style) */}
      <section id="features" className="py-24 px-6 border-t border-border/40 max-w-6xl mx-auto w-full space-y-16">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-mono tracking-widest text-accent uppercase">Core Capabilities</span>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Obsessively engineered features.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-3 shadow-card md:col-span-2">
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-foreground">
              <Search className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-base text-foreground">Direct ATS Opportunity Stream</h4>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Job listings are pulled straight from public company ATS endpoints (Greenhouse, Lever, Ashby, and top boards) with SHA-256 deduplication. Filter by remote, compensation, experience level, or match score.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-6 space-y-3 shadow-card">
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-foreground">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-base text-foreground">Playwright Stealth Engine</h4>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Launches local Chromium instances that simulate human behavior to avoid bot detection and pre-fill applications seamlessly.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-6 space-y-3 shadow-card">
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-foreground">
              <Mail className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-base text-foreground">0-Bounce Outreach</h4>
            <p className="text-xs text-foreground-muted leading-relaxed">
              4-stage verification (Syntax → Role Filter → DNS MX → Real-time SMTP Handshake) ensures messages land directly in the recruiter's primary inbox.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-6 space-y-3 shadow-card md:col-span-2">
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-foreground">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-base text-foreground">Local-First Storage &amp; Hardware Lock</h4>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Your profile, resume text, and credentials are saved locally in SQLite (`sql.js`). Hardware fingerprinting guarantees your session runs on only your authorized machine.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section (3 Tiers, No Refund Mentions) */}
      <section id="pricing" className="py-24 px-6 border-t border-border/40 bg-background-elevated/40">
        <div className="max-w-6xl mx-auto text-center space-y-16">
          <div className="max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono tracking-widest text-accent uppercase">Subscription Plans</span>
            <p className="text-3xl font-semibold tracking-tight text-foreground">Start Free. Scale With Automation.</p>
            <p className="text-xs text-foreground-muted">Upgrade directly within the desktop app via Razorpay. All sales are final.</p>
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
                    <span>Full access to all 4 Career Roadmaps</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-foreground shrink-0" />
                    <span>Curated Resource Vault &amp; Interview Questions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-foreground shrink-0" />
                    <span>Live Job Board access (1,000+ positions)</span>
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
                    <span>20-Tab Parallel Review Mode</span>
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
                    <span>Adaptive AI custom question answering</span>
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
            {[
              {
                q: 'How does JobMaxxer auto-apply to jobs?',
                a: 'JobMaxxer runs an automated Chromium instance on your desktop. It navigates to official company career portals (Greenhouse, Lever, Ashby, etc.), parses form fields, maps your profile answers, attaches your selected resume, and submits the application securely.'
              },
              {
                q: 'Is my personal data and resume secure?',
                a: 'Yes. JobMaxxer is local-first. Your master profile and resume are stored in an isolated SQLite database on your computer. Your files and credentials never touch external tracking servers.'
              },
              {
                q: 'What is the difference between Semi-Auto and Autonomous mode?',
                a: 'Semi-Auto mode opens up to 20 pre-filled browser tabs simultaneously for you to review and click submit yourself. Autonomous mode fills out all inputs (including dynamic questions) and submits on your behalf.'
              },
              {
                q: 'What payment methods are supported?',
                a: 'We accept UPI (Google Pay, PhonePe, Paytm, CRED), Debit/Credit cards, and Netbanking via Razorpay directly inside the desktop application.'
              }
            ].map((faq, i) => (
              <div key={i} className="border border-border rounded-xl p-5 bg-surface backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => toggleFaq(i)}
                  className="w-full flex items-center justify-between text-left font-medium text-sm text-foreground"
                >
                  <span>{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-foreground-muted" /> : <ChevronDown className="w-4 h-4 text-foreground-muted" />}
                </button>
                {openFaq === i && (
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
          <div className="flex flex-wrap justify-center gap-5">
            <a href="#/terms" className="hover:text-foreground transition-colors">Terms &amp; Conditions</a>
            <a href="#/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="mailto:support@jobmaxxer.app" className="hover:text-foreground transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
