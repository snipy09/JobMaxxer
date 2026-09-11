import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowRight, ArrowLeft, Check, Sparkles,
  Shield, Laptop, Terminal, CheckCircle2, Clock, Lock,
  ExternalLink, Zap, Users, MessageSquare
} from 'lucide-react';
import { animate, stagger } from 'animejs';

export default function Download() {
  const [waitlistEmail, setWaitlistEmail] = useState<string>('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const registrationCardRef = useRef<HTMLDivElement>(null);

  const WHATSAPP_PRE_REGISTER_URL = 'https://wa.me/919493833632?text=Hi%20Nomadic%20Team%2C%20I%20want%20to%20pre-register%20for%20the%20Nomadic%20Closed%20Alpha%20Testing%20Program%20(INR%2099).%20Please%20reserve%20my%20spot.';

  useEffect(() => {
    window.scrollTo(0, 0);

    try {
      animate('.animate-in', {
        translateY: [24, 0],
        opacity: [0, 1],
        delay: stagger(100, { start: 100 }),
        duration: 800,
        ease: 'outQuart',
      });
    } catch (e) {}
  }, []);

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail || !waitlistEmail.includes('@')) return;
    setWaitlistSubmitted(true);
    window.open(`https://wa.me/919493833632?text=Hi%20Nomadic%20Team%2C%20I%20am%20pre-registering%20for%20the%20Closed%20Alpha%20Testing%20Program%20(INR%2099)%20with%20email%3A%20${encodeURIComponent(waitlistEmail)}`, '_blank');
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-sans flex flex-col antialiased selection:bg-[#0A0A0A] selection:text-white">
      {/* Top Announcement Bar */}
      <div className="border-b border-[#E5E5E5] bg-white px-4 py-2.5 text-center text-xs text-[#555555] font-medium tracking-tight flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#0284c7] animate-ping shrink-0" />
        <span>Nomadic Closed Alpha Testing Program · Cohort Launches Next Monday · Pre-Register for ₹99</span>
      </div>

      {/* Main Navigation */}
      <header className="border-b border-[#E5E5E5] bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="#/" className="flex items-center gap-2.5 group">
            <img
              src="./logo-icon.png"
              alt="Nomadic Logo Icon"
              className="h-7 w-7 rounded-md object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-bold text-base sm:text-lg tracking-tight text-[#0A0A0A]">
              Nomadic
            </span>
          </a>

          <a
            href="#/"
            className="text-xs font-semibold text-[#555555] hover:text-[#0A0A0A] transition-colors flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#E5E5E5] hover:bg-[#F5F5F5]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 pt-12 sm:pt-16 pb-20 space-y-12">
        {/* Hero Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-4 animate-in">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#f0f7ff] border border-[#bae2fd] rounded-full text-xs font-semibold text-[#0369a1]">
            <Lock className="w-3.5 h-3.5" />
            <span>Closed Alpha Testing Only · No Public Downloads</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#0A0A0A] leading-tight">
            Nomadic Alpha Testing Program
          </h1>

          <p className="text-sm sm:text-base text-[#555555] leading-relaxed max-w-xl mx-auto font-normal">
            Nomadic is available exclusively to members of the closed Alpha cohort starting <strong className="text-[#0A0A0A] font-semibold">next Monday</strong>. Public access is closed.
          </p>
        </div>

        {/* Alpha Pre-Registration Card */}
        <div
          ref={registrationCardRef}
          className="bg-white border border-[#E5E5E5] rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden space-y-8 animate-in"
        >
          {/* Top Pill & Pricing */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E5E5]">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#0A0A0A] text-white text-[11px] font-bold tracking-wide uppercase">
                <Sparkles className="w-3 h-3 text-[#bae2fd]" />
                <span>Exclusive Closed Alpha</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0A0A0A]">
                Reserve Your Alpha Seat
              </h2>
              <p className="text-xs sm:text-sm text-[#666666]">
                Only 100 tester slots available. Receive direct private build access next Monday.
              </p>
            </div>

            <div className="bg-[#f0f7ff] border border-[#bae2fd] px-5 py-3 rounded-2xl text-right shrink-0">
              <span className="text-[11px] font-semibold text-[#0369a1] block uppercase tracking-wider">
                Alpha Entry Fee
              </span>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#0A0A0A]">₹99</span>
                <span className="text-xs text-[#777777] font-medium">one-time</span>
              </div>
            </div>
          </div>

          {/* Included Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5]">
              <div className="p-2 rounded-xl bg-white border border-[#E5E5E5] text-[#0A0A0A] shrink-0">
                <Zap className="w-4 h-4 text-[#0284c7]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0A0A0A]">Guaranteed Monday Access</h4>
                <p className="text-[11px] text-[#666666] mt-0.5">
                  Receive your private installer link and licensed credentials on launch morning.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5]">
              <div className="p-2 rounded-xl bg-white border border-[#E5E5E5] text-[#0A0A0A] shrink-0">
                <Shield className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0A0A0A]">Full Autonomous Engine</h4>
                <p className="text-[11px] text-[#666666] mt-0.5">
                  Unrestricted access to the 1-click ATS Form Solver and Parallel Batch Co-Pilot.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5]">
              <div className="p-2 rounded-xl bg-white border border-[#E5E5E5] text-[#0A0A0A] shrink-0">
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0A0A0A]">Autonomous Assistant on Steroids</h4>
                <p className="text-[11px] text-[#666666] mt-0.5">
                  Max AI Career Assistant with full workspace control and live interview calibration.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5]">
              <div className="p-2 rounded-xl bg-white border border-[#E5E5E5] text-[#0A0A0A] shrink-0">
                <MessageSquare className="w-4 h-4 text-[#0A0A0A]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0A0A0A]">Direct Developer VIP Channel</h4>
                <p className="text-[11px] text-[#666666] mt-0.5">
                  Private 1-on-1 support and priority feature request roadmap access.
                </p>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-4 pt-2">
            <a
              href={WHATSAPP_PRE_REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 rounded-2xl bg-[#0A0A0A] hover:bg-black text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 group active:scale-[0.99]"
            >
              <Sparkles className="w-4 h-4 text-[#bae2fd] group-hover:rotate-12 transition-transform" />
              <span>Pre-Register on WhatsApp for ₹99</span>
              <ExternalLink className="w-4 h-4 opacity-70" />
            </a>

            <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-2 pt-2">
              <input
                type="email"
                required
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                placeholder="Enter your email to reserve your Alpha slot..."
                className="flex-1 px-4 py-3 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] text-xs font-medium text-[#0A0A0A] focus:outline-hidden focus:border-[#0A0A0A] transition-colors"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-white hover:bg-[#F5F5F5] text-[#0A0A0A] font-bold text-xs border border-[#E5E5E5] transition-colors shrink-0 flex items-center justify-center gap-1.5"
              >
                <span>Reserve Seat (₹99)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {waitlistSubmitted && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Thank you! Your spot is reserved. We have opened WhatsApp to complete your ₹99 Alpha registration.</span>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Schedule */}
        <div className="bg-white border border-[#E5E5E5] rounded-3xl p-6 sm:p-8 space-y-6 animate-in">
          <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0284c7]" />
            <span>Alpha Cohort Schedule</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-1">
              <span className="text-[10px] font-bold text-[#0369a1] uppercase tracking-wider">Phase 1 · Open Now</span>
              <h4 className="text-xs font-bold text-[#0A0A0A]">Closed Alpha Pre-Registration</h4>
              <p className="text-[11px] text-[#666666]">
                Reserve your slot for ₹99. Strictly limited to the first 100 verified applicants.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Phase 2 · Next Monday</span>
              <h4 className="text-xs font-bold text-[#0A0A0A]">Alpha Cohort Deployment</h4>
              <p className="text-[11px] text-[#666666]">
                Private executable delivered directly to registered candidates with full Max entitlements.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E5] bg-white py-8 px-4 text-center text-xs text-[#777777]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Nomadic Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#/terms" className="hover:text-[#0A0A0A] transition-colors">Terms of Service</a>
            <a href="#/privacy" className="hover:text-[#0A0A0A] transition-colors">Privacy Policy</a>
            <a href="https://wa.me/919493833632" target="_blank" rel="noopener noreferrer" className="hover:text-[#0A0A0A] transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
