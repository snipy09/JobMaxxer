import React, { useEffect, useState } from 'react';

export default function Legal({ type }: { type: 'terms' | 'privacy' }) {
  useEffect(() => { window.scrollTo(0, 0); }, [type]);

  const content = {
    terms: {
      title: "Terms and Conditions",
      body: `Last updated: August 2026

1. Acceptance of Terms: By downloading and using the JobMaxxer software, you agree to comply with and be bound by these Terms.
2. License: We grant you a revocable, non-exclusive, non-transferable license to use the app for personal, individual job-seeking use.
3. Fair Use: You agree not to abuse third-party APIs, website forms, or SMTP limits. Excessive automation causing service disruption may result in license termination without notice.
4. Disclaimer: JobMaxxer does not guarantee employment or interviews. The software assists in application automation and drafting, but hiring decisions remain solely with employers.
5. All Sales Final: Due to the nature of the software and automation limits, all payments are final and non-refundable.`
    },
    privacy: {
      title: "Privacy Policy",
      body: `Last updated: August 2026

1. Local-First Security: Your master profile data, including local resume text, email passwords, and API keys, are stored locally on your machine in encrypted/isolated SQLite storage.
2. Cloud Synchronization: Basic user identifier metadata, subscription tier validity, and job bookmarks are synced securely via Supabase.
3. No Data Selling: We strictly do not sell, rent, or trade your personal information, email contacts, or resume documents to third parties.
4. Telemetry: We may collect generic error logs to maintain application stability.`
    },
  };

  return (
    <div className="min-h-screen bg-background-base pt-24 pb-12 px-6 flex flex-col font-sans relative z-10">
      <div className="max-w-3xl mx-auto w-full bg-surface border border-border rounded-2xl p-8 sm:p-12 shadow-card flex-1 backdrop-blur-xl">
        <a href="#/" className="inline-block text-xs font-mono tracking-widest text-foreground-muted hover:text-foreground mb-8 border border-border px-3 py-1.5 rounded-full transition-colors">&larr; BACK TO HOME</a>
        <h1 className="text-3xl font-semibold tracking-tight mb-6 text-foreground">{content[type].title}</h1>
        <div className="text-sm text-foreground-muted whitespace-pre-line leading-relaxed">
          {content[type].body}
        </div>
        <div className="mt-12 pt-6 border-t border-border/50 text-xs text-foreground-subtle hover:text-foreground transition-colors">
          For inquiries or support, contact <a href="mailto:support@jobmaxxer.app" className="underline">support@jobmaxxer.app</a>
        </div>
      </div>
    </div>
  );
}
