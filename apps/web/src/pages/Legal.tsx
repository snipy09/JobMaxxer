import React, { useEffect } from 'react';

export default function Legal({ type }: { type: 'terms' | 'privacy' | 'refund' }) {
  useEffect(() => { window.scrollTo(0, 0); }, [type]);

  const content = {
    terms: {
      title: "Terms and Conditions",
      body: `Last updated: August 2026

1. Acceptance of Terms: By downloading and using the JobMaxxer software, you agree to comply with and be bound by these Terms.
2. License: We grant you a revocable, non-exclusive, non-transferable license to use the app for personal, individual job-seeking use.
3. Fair Use: You agree not to abuse third-party APIs, website forms, or SMTP limits. Excessive automation causing service disruption may result in license termination.
4. Disclaimer: JobMaxxer does not guarantee employment or interviews. The software assists in application automation and drafting, but hiring decisions remain solely with employers.`
    },
    privacy: {
      title: "Privacy Policy",
      body: `Last updated: August 2026

1. Local-First Security: Your master profile data, including local resume text, email passwords, and Groq API keys, are stored locally on your machine in encrypted/isolated SQLite storage.
2. Cloud Synchronization: Basic user identifier metadata, subscription tier validity, and job bookmarks are synced securely via Supabase.
3. No Data Selling: We strictly do not sell, rent, or trade your personal information, email contacts, or resume documents to third parties.
4. Telemetry: We may collect generic error logs to maintain application stability.`
    },
    refund: {
      title: "Refund & Cancellation Policy",
      body: `Last updated: August 2026

1. Cancellations: You may cancel your recurring monthly subscription at any time without penalty. Your access will continue until the end of your prepaid 30-day billing cycle.
2. 7-Day Refund Policy: We offer a 7-day no-questions-asked refund policy for first-time purchases. If JobMaxxer does not work for your setup, email support@jobmaxxer.app within 7 days of purchase with your transaction reference.
3. Processing: Approved refunds will be credited back to your original payment method (UPI / Cards) via Razorpay within 5-7 business days.`
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6 flex flex-col font-sans">
      <div className="max-w-3xl mx-auto w-full bg-white rounded-3xl border border-gray-200 p-8 sm:p-12 shadow-sm flex-1">
        <a href="#/" className="inline-block text-xs font-bold text-gray-500 hover:text-black mb-8 border border-gray-200 px-3 py-1.5 rounded-full">&larr; Back to Home</a>
        <h1 className="text-3xl font-black tracking-tight mb-6 text-gray-900">{content[type].title}</h1>
        <div className="prose prose-sm text-gray-600 whitespace-pre-line leading-relaxed">
          {content[type].body}
        </div>
        <div className="mt-12 pt-6 border-t border-gray-100 text-xs text-gray-400">
          For inquiries or support, contact <a href="mailto:support@jobmaxxer.app" className="underline text-gray-600">support@jobmaxxer.app</a>
        </div>
      </div>
    </div>
  );
}
