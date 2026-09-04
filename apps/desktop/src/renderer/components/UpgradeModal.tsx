import React, { useState } from 'react';
import { Check, ShieldCheck, ExternalLink, X, MessageSquare, Sparkles } from 'lucide-react';
import { AppUser, getApi } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onUpgradeSuccess?: () => void;
  triggerFeature?: string;
}

const WHATSAPP_NUMBER = '919493833632';
const DISPLAY_WHATSAPP = '+91 94938 33632';

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpgradeSuccess,
  triggerFeature
}) => {
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!isOpen) return null;
  const api = getApi();

  const handleWhatsAppUpgrade = (planName: string, price: string) => {
    const userEmail = currentUser?.email || 'my-account@example.com';
    const message = encodeURIComponent(
      `Hi, I want to upgrade to Nomadic ${planName} (${price}).\nMy account email is: ${userEmail}`
    );
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
    
    if (api && api.openExternalUrl) {
      api.openExternalUrl(waUrl);
    } else {
      window.open(waUrl, '_blank');
    }
  };

  const handleSimulateUpgrade = (tier: string) => {
    setSyncFeedback(`✓ Upgraded successfully to ${tier.toUpperCase()} plan! (Dev Mode)`);
    if (currentUser) {
      const updated = { ...currentUser, subscription_tier: tier, tier };
      localStorage.setItem('nomadic_user', JSON.stringify(updated));
      localStorage.setItem('hirestack_user', JSON.stringify(updated));
    }
    onUpgradeSuccess?.();
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative animate-fade-up max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors"
          title="Close Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[11px] font-bold text-slate-900 dark:text-white">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            {triggerFeature ? `Unlock ${triggerFeature}` : 'Nomadic Membership Plans'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">Accelerate Your Career with Nomadic</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Instant activation &amp; license setup directly via WhatsApp at{' '}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-emerald-600 dark:text-emerald-400 underline underline-offset-2 hover:opacity-80 inline-flex items-center gap-1"
            >
              {DISPLAY_WHATSAPP} <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        {/* 3-Tier Plan Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          {/* Plan 1: Learner Pro (₹79) */}
          <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-5 space-y-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Mastery Track</span>
                <h3 className="font-extrabold text-slate-950 dark:text-white text-base">Learner Pro</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">For students &amp; self-learners</p>
                <div className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
                  ₹79 <span className="text-xs font-normal text-slate-400 font-mono">/ mo</span>
                </div>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-3">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>Complete Learner Track</strong> access</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> <span>Unlimited AI custom career roadmaps</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> <span>All 12+ technical textbooks &amp; system sheets</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> <span>52-Week activity streak heatmap</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>Complete 1,000+ Job Board</strong> access</span></li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleWhatsAppUpgrade('Learner Pro', '₹79/mo')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Upgrade via WhatsApp (₹79)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulateUpgrade('learner_pro')}
                className="w-full py-1.5 text-[10px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-center"
              >
                [Test Unlock Instant Free]
              </button>
            </div>
          </div>

          {/* Plan 2: Seeker Pro (₹149) */}
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-5 space-y-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Semi-Autonomous</span>
                <h3 className="font-extrabold text-slate-950 dark:text-white text-base">Seeker Pro</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Active candidates &amp; job hunters</p>
                <div className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
                  ₹149 <span className="text-xs font-normal text-slate-400 font-mono">/ mo</span>
                </div>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-3">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>Complete Learner Pro</strong> included</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> <span>1,000+ source ATS radar (Anti-ghost)</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> <span>Semi-Auto Apply (up to 50 apps/week)</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> <span>25 Verified HR / Recruiter leads/week</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> <span>Multi-Resume library (up to 5 resumes)</span></li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleWhatsAppUpgrade('Seeker Pro', '₹149/mo')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Upgrade via WhatsApp (₹149)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulateUpgrade('seeker_pro')}
                className="w-full py-1.5 text-[10px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-center"
              >
                [Test Unlock Instant Free]
              </button>
            </div>
          </div>

          {/* Plan 3: Seeker Max (₹299) - Featured / All-in-One */}
          <div className="border-2 border-slate-950 dark:border-white bg-slate-950 text-white dark:bg-white dark:text-slate-950 rounded-3xl p-5 space-y-4 flex flex-col justify-between relative shadow-xl">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] font-mono uppercase tracking-widest px-3 py-0.5 rounded-full font-black shadow-sm">
              Most Popular · All-in-One
            </span>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600">Full Autopilot</span>
                <h3 className="font-extrabold text-white dark:text-slate-950 text-base">Seeker Max</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Complete Suite (Learner + Seeker)</p>
                <div className="mt-3 text-3xl font-black text-white dark:text-slate-950">
                  ₹299 <span className="text-xs font-normal text-slate-400 dark:text-slate-500 font-mono">/ mo</span>
                </div>
              </div>

              <ul className="space-y-2 text-xs text-slate-200 dark:text-slate-800 border-t border-slate-800 dark:border-slate-200 pt-3">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0 mt-0.5 font-bold" /> <span><strong>Complete Learner Pro</strong> included</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0 mt-0.5 font-bold" /> <span><strong>100% Autonomous Auto-Apply</strong> (Unlimited)</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0 mt-0.5 font-bold" /> <span>Automated 0%-bounce HR cold email drip</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0 mt-0.5 font-bold" /> <span>Priority ATS ingest (Every 15 mins)</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0 mt-0.5 font-bold" /> <span>Cloud sync &amp; priority updates</span></li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleWhatsAppUpgrade('Seeker Max', '₹299/mo')}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-current" />
                <span>Upgrade via WhatsApp (₹299)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulateUpgrade('seeker_max')}
                className="w-full py-1.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-900 text-center"
              >
                [Test Unlock Instant Free]
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {syncFeedback && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200 text-center font-bold animate-fade-up">
            {syncFeedback}
          </div>
        )}

        {/* WhatsApp direct support footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Direct WhatsApp Support &amp; Activations: <strong className="text-emerald-600 dark:text-emerald-400">{DISPLAY_WHATSAPP}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Single-Device Hardware Lock Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
};
