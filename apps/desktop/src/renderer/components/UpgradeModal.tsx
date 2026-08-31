import React, { useState } from 'react';
import { Zap, Check, ShieldCheck, ExternalLink, X, RefreshCw, Laptop, Shield } from 'lucide-react';
import { AppUser, getApi } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onUpgradeSuccess?: () => void;
  triggerFeature?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpgradeSuccess,
  triggerFeature
}) => {
  const [checkingSync, setCheckingSync] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!isOpen) return null;
  const api = getApi();

  const handleRazorpayCheckout = (plan: 'pro' | 'turbo') => {
    const userId = currentUser?.id || '';
    const email = encodeURIComponent(currentUser?.email || '');
    const paymentUrl = `https://rzp.io/l/hirestack-${plan}?notes[user_id]=${userId}&notes[email]=${email}&notes[plan]=${plan}&prefill[email]=${email}`;
    api.openExternalUrl(paymentUrl);
  };

  const handleRefreshLicenseStatus = async () => {
    setCheckingSync(true);
    setSyncFeedback(null);
    try {
      const res = await api.syncCloudData();
      if (res.success) {
        setSyncFeedback('License status synchronized! Your account is now upgraded.');
        onUpgradeSuccess?.();
        setTimeout(() => onClose(), 1500);
      } else {
        setSyncFeedback('Payment still processing or not found yet. Please verify after completing checkout.');
      }
    } catch {
      setSyncFeedback('Could not reach synchronization servers. Please check your internet connection.');
    } finally {
      setCheckingSync(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative animate-fade-up">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg border border-slate-200 dark:border-slate-800"
          title="Close Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[11px] font-bold text-slate-900 dark:text-white">
            <Zap className="w-3.5 h-3.5 text-slate-950 dark:text-white" />
            {triggerFeature ? `Unlock ${triggerFeature}` : 'Automate Your Search'}
          </div>
          <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight">Choose Your Seeker Plan</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Pay securely with Razorpay via UPI (GPay/PhonePe/Paytm), Cards, or Netbanking. All sales are final.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Seeker Pro */}
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-5 space-y-4 hover:border-slate-400 dark:hover:border-slate-700 transition-all flex flex-col justify-between shadow-sm">
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Semi-Autonomous</span>
                <h3 className="font-bold text-slate-950 dark:text-white text-base">Seeker Pro</h3>
                <p className="text-[11px] text-slate-500">Accelerate applications with review mode</p>
                <div className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">
                  ₹299 <span className="text-xs font-normal text-slate-400 font-mono">/ month</span>
                </div>
              </div>

              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-3">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> 20-Tab Parallel Review Mode</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Smart ATS Match Scoring (0–100%)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> 25 Verified HR Contacts / Week</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Cloud Sync &amp; Hardware Lock</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handleRazorpayCheckout('pro')}
              className="w-full py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-xl text-xs font-bold transition-all hover:bg-slate-800 shadow-sm active:scale-95"
            >
              Get Seeker Pro (₹299)
            </button>
          </div>

          {/* Seeker Turbo */}
          <div className="border-2 border-slate-950 dark:border-white bg-slate-950 text-white rounded-2xl p-5 space-y-4 transition-all flex flex-col justify-between shadow-lg relative overflow-hidden">
            <span className="absolute top-3 right-3 bg-white text-slate-950 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase">
              100% Autopilot
            </span>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Autonomous Mode</span>
                <h3 className="font-bold text-white text-base">Seeker Turbo</h3>
                <p className="text-[11px] text-slate-400">Full hands-off autonomous workflow</p>
                <div className="mt-2 text-2xl font-extrabold text-white">
                  ₹599 <span className="text-xs font-normal text-slate-400 font-mono">/ month</span>
                </div>
              </div>

              <ul className="space-y-2 text-xs text-slate-300 border-t border-slate-800 pt-3">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> 100% Autonomous Form Submissions</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Adaptive custom question answering</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Unlimited Verified Recruiter Inboxes</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Priority ATS Feed Sync</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handleRazorpayCheckout('turbo')}
              className="w-full py-2.5 bg-white text-slate-950 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              Get Seeker Turbo (₹599)
            </button>
          </div>
        </div>

        {/* Sync Status Button */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={handleRefreshLicenseStatus}
            disabled={checkingSync}
            className="text-slate-500 hover:text-slate-950 dark:hover:text-white flex items-center gap-1.5 transition-colors font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingSync ? 'animate-spin' : ''}`} />
            <span>Already completed payment? Sync Status</span>
          </button>

          {syncFeedback && (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {syncFeedback}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
