import React from 'react';
import { ArrowRight, Briefcase, Zap, Search, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900">
      {/* Header */}
      <header className="px-6 py-6 flex justify-between items-center max-w-5xl mx-auto w-full">
        <div className="font-bold text-xl tracking-tight flex items-center gap-1.5">
          <div className="w-6 h-6 bg-black rounded-lg text-white flex items-center justify-center text-xs">JM</div>
          JobMaxxer
        </div>
        <nav className="gap-6 text-sm font-medium hidden sm:flex">
          <a href="#features" className="hover:text-gray-500 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-gray-500 transition-colors">Pricing</a>
        </nav>
        <a href="https://github.com/snipy09/JobMaxxer/releases/latest" className="text-sm font-semibold bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition-colors">
          Download Windows App
        </a>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 max-w-3xl mx-auto">
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-tight mb-6">
          Your job hunt.<br /> Completely automated.
        </h1>
        <p className="text-lg text-gray-500 mb-10 max-w-xl leading-relaxed">
          JobMaxxer scrapes, filters, and applies to jobs while you sleep. Stop manually filling out forms and start focusing on your interviews.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a href="https://github.com/snipy09/JobMaxxer/releases/latest" className="bg-black text-white px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-xl shadow-black/10">
            Download for Windows <ArrowRight className="w-4 h-4" />
          </a>
          <a href="#pricing" className="bg-white text-black border border-gray-200 px-6 py-3 rounded-full font-bold flex items-center justify-center hover:bg-gray-50 transition-colors">
            View Pricing
          </a>
        </div>
      </main>

      {/* Features */}
      <section id="features" className="py-24 bg-gray-50 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg tracking-tight">Curated Feed</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Scrapes from 1000+ sources including Greenhouse, Lever, Ashby, and Internshala directly into your dashboard.</p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg tracking-tight">Auto-Apply Engine</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Playwright-powered stealth forms. Autonomous mode evaluates drop-downs and text inputs via local AI logic.</p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg tracking-tight">Automated Outreach</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Discover Hiring Managers and HRs. Validate emails through 4-stage SMTP pings and trigger automated referral blasts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 border-t border-gray-200">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-black tracking-tight mb-4">Simple, transparent pricing.</h2>
          <p className="text-sm text-gray-500 mb-12">No hidden fees. Secure checkout via Razorpay inside the app.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
            <div className="border border-gray-200 rounded-3xl p-8 flex flex-col hover:border-black transition-colors">
              <h3 className="font-bold text-xl tracking-tight">Seeker Pro</h3>
              <p className="text-sm text-gray-500 mt-2 mb-6">Perfect for students actively applying.</p>
              <div className="text-4xl font-black tracking-tight mb-8">₹299<span className="text-sm text-gray-500 font-medium tracking-normal">/mo</span></div>
              <ul className="space-y-3 text-sm text-gray-700 mb-8 flex-1">
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500 shrink-0" /> Full Job Board with ATS Match</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500 shrink-0" /> Semi-Auto Review Mode</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500 shrink-0" /> 25 Verified HR Contacts / Week</li>
              </ul>
              <a href="https://github.com/snipy09/JobMaxxer/releases/latest" className="block text-center w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors">Download App to Buy</a>
            </div>

            <div className="border-2 border-black bg-gray-50 rounded-3xl p-8 flex flex-col relative shadow-xl shadow-gray-200/50">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full whitespace-nowrap">Most Popular</span>
              <h3 className="font-bold text-xl tracking-tight">Seeker Turbo</h3>
              <p className="text-sm text-gray-500 mt-2 mb-6">100% Autopilot + Custom Answers.</p>
              <div className="text-4xl font-black tracking-tight mb-8">₹599<span className="text-sm text-gray-500 font-medium tracking-normal">/mo</span></div>
              <ul className="space-y-3 text-sm text-gray-700 mb-8 flex-1">
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-gray-900 shrink-0" /> 100% Autonomous Groq AI Auto-Apply</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-gray-900 shrink-0" /> Unlimited HR Direct Outreach</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-gray-900 shrink-0" /> Automated SMTP Drip Support</li>
              </ul>
              <a href="https://github.com/snipy09/JobMaxxer/releases/latest" className="block text-center w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-md shadow-black/10">Download App to Buy</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 px-6 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="text-sm font-bold tracking-tight">JobMaxxer</div>
          <div className="flex flex-wrap justify-center gap-4 text-xs font-medium text-gray-500">
            <a href="#/terms" className="hover:text-black hover:underline transition-colors">Terms & Conditions</a>
            <a href="#/privacy" className="hover:text-black hover:underline transition-colors">Privacy Policy</a>
            <a href="#/refund" className="hover:text-black hover:underline transition-colors">Refund Policy</a>
            <a href="mailto:support@jobmaxxer.app" className="hover:text-black hover:underline transition-colors">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
