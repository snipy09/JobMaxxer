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
          <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            Scale Your Career Acceleration
          </h2>
          <p className="text-xs text-slate-500">
            Instant activation &amp; license setup directly via WhatsApp at{' '}
            <strong className="text-slate-900 dark:text-white font-mono">{DISPLAY_WHATSAPP}</strong>
          </p>
        </div>

        {/* 2-Paid-Tier Grid (Pro ₹249 & Max ₹599) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Plan 1: Pro Plan (₹249) */}
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Complete Career Acceleration</span>
                <h3 className="font-extrabold text-slate-950 dark:text-white text-xl">Pro Plan</h3>
                <p className="text-xs text-slate-500 mt-1">Full skill mastery &amp; active job seeking</p>
                <div className="mt-4 text-4xl font-black text-slate-950 dark:text-white">
                  ₹249 <span className="text-xs font-normal text-slate-400 font-mono">/ mo</span>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-4">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>All 52-Week AI Roadmaps &amp; Curriculums</strong></span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>428+ Company Problem Sets (17,300+ Qs)</strong></span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> <span>Full 12+ CS Textbook Library &amp; Streak Heatmap</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> <span>Direct ATS Job Radar (18/36/54 Page Navigation)</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> <span>Semi-Auto Apply (up to 50 apps/week)</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> <span>25 Verified HR / Recruiter leads/week + 5 Resumes</span></li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleWhatsAppUpgrade('Pro Plan', '₹249/mo')}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Upgrade to Pro (₹249/mo)</span>
              </button>
            </div>
          </div>

          {/* Plan 2: Max Plan (₹599) - Featured / Full Autopilot */}
          <div className="border-2 border-slate-950 dark:border-white bg-slate-950 text-white dark:bg-white dark:text-slate-950 rounded-3xl p-6 space-y-5 flex flex-col justify-between relative shadow-xl">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] font-mono uppercase tracking-widest px-3 py-0.5 rounded-full font-black shadow-sm">
              Most Popular · Full Autopilot
            </span>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600">Autonomous Career OS</span>
                <h3 className="font-extrabold text-white dark:text-slate-950 text-xl">Max Plan</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">100% Autopilot Suite (Learning + Unlimited Applications)</p>
                <div className="mt-4 text-4xl font-black text-white dark:text-slate-950">
                  ₹599 <span className="text-xs font-normal text-slate-400 dark:text-slate-500 font-mono">/ mo</span>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-200 dark:text-slate-800 border-t border-slate-800 dark:border-slate-200 pt-4">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0 mt-0.5 font-bold" /> <span><strong>Complete Pro Plan Included</strong></span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0 mt-0.5 font-bold" /> <span><strong>100% Autonomous Auto-Apply (Unlimited)</strong></span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0 mt-0.5 font-bold" /> <span><strong>Unlimited Background HR Email Outreach</strong></span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0 mt-0.5 font-bold" /> <span>Priority Real-Time ATS Radar Streaming (Every 15m)</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0 mt-0.5 font-bold" /> <span>Highest Priority Cloud Sync &amp; OmniForm Solver</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0 mt-0.5 font-bold" /> <span>Upgrade CTAs Completely Hidden</span></li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleWhatsAppUpgrade('Max Plan', '₹599/mo')}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>Upgrade to Max (₹599/mo)</span>
              </button>
            </div>
          </div>
        </div>

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
