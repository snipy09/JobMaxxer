import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function Legal({ type }: { type: 'terms' | 'privacy' }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [type]);

  const content = {
    terms: {
      title: "Terms and Conditions",
      subtitle: "Software licensing, fair usage, and non-refundable subscription terms.",
      body: `Last updated: August 2026

1. Acceptance of Terms: By downloading, installing, or accessing the JobMaxxer desktop application, you agree to comply with and be bound by these Terms of Service.
2. License Grant: We grant you a revocable, non-exclusive, non-transferable, single-machine license to use JobMaxxer solely for personal job-seeking and career skill development.
3. Single-Device Enforcement: Each licensed subscription is locked to one designated computer hardware fingerprint. Concurrent usage across multiple machines is strictly prohibited.
4. Client-Side Automation & Fair Use: JobMaxxer executes local browser automation directly on your machine. You agree to use the software responsibly and comply with standard rate limits. Any intentional abuse, reverse-engineering, or unauthorized distribution may result in immediate license termination.
5. All Sales Final: Due to the immediate delivery of digital software capabilities and API access limits, all subscription payments are final, non-refundable, and non-transferable.
6. Disclaimer: JobMaxxer is an efficiency platform that automates application workflows and provides structured learning roadmaps. JobMaxxer does not guarantee interviews, offers, or employment decisions, which remain solely at the discretion of hiring companies.`
    },
    privacy: {
      title: "Privacy Policy",
      subtitle: "Our commitment to local-first data storage and zero telemetry tracking.",
      body: `Last updated: August 2026

1. Local-First Architecture: Your master candidate profile, resume files, and private credentials remain strictly stored in an isolated SQLite database on your local computer.
2. Cloud Synchronization: Minimal metadata (user identifier, active subscription tier validity, and bookmarked job URLs) is synchronized securely with Supabase for license validation and cross-session persistence.
3. No Data Harvesting: We do not sell, rent, monetize, or transmit your personal application data, resume text, or email outreach history to third-party advertisers or data brokers.
4. Security: All network communications with our licensing infrastructure use industry-standard 256-bit SSL encryption.`
    },
  };

  return (
    <div className="min-h-screen bg-ink-50 text-ink-900 font-sans flex flex-col antialiased selection:bg-ink-900 selection:text-white">
      <header className="border-b border-ink-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#/" className="font-extrabold text-base tracking-tight flex items-center gap-2 text-ink-950">
            <span className="w-2 h-2 rounded-full bg-ink-950" />
            JobMaxxer
          </a>
          <a
            href="#/"
            className="text-xs font-semibold text-ink-600 hover:text-ink-950 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
        <div className="bg-white border border-ink-200 rounded-3xl p-8 sm:p-12 shadow-fine space-y-8">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-ink-400 font-semibold">
              Legal Documentation
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-950 mt-1">
              {content[type].title}
            </h1>
            <p className="text-xs text-ink-500 mt-1">
              {content[type].subtitle}
            </p>
          </div>

          <div className="text-xs sm:text-sm text-ink-700 whitespace-pre-line leading-relaxed border-t border-ink-100 pt-6">
            {content[type].body}
          </div>

          <div className="pt-8 border-t border-ink-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-ink-400 font-mono">
            <span>Support &amp; Verification Inquiries:</span>
            <a
              href="mailto:support@jobmaxxer.app"
              className="text-ink-950 underline hover:text-ink-600 font-semibold transition-colors"
            >
              support@jobmaxxer.app
            </a>
          </div>
        </div>
      </main>

      <footer className="border-t border-ink-200 bg-white py-8 px-6 text-center text-xs text-ink-400">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>JobMaxxer / Desktop Application for All Job Seekers</span>
          <div className="flex gap-4">
            <a href="#/terms" className="hover:text-ink-950 transition-colors">Terms of Service</a>
            <a href="#/privacy" className="hover:text-ink-950 transition-colors">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
