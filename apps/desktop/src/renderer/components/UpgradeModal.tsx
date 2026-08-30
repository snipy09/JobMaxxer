import React, { useState } from 'react';
import { Zap, Check, ShieldCheck, ExternalLink, X, Sparkles, RefreshCw } from 'lucide-react';
import { AppUser, getApi } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onUpgradeSuccess?: () => void;
  triggerFeature?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, currentUser, onUpgradeSuccess, triggerFeature }) => {
  const [checkingSync, setCheckingSync] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!isOpen) return null;
  const api = getApi();

  const handleRazorpayCheckout = (plan: 'pro' | 'turbo') => {
    const userId = currentUser?.id || '';
    const email = encodeURIComponent(currentUser?.email || '');
    const paymentUrl = `https://rzp.io/l/jobmaxxer-${plan}?notes[user_id]=${userId}&notes[email]=${email}&notes[plan]=${plan}&prefill[email]=${email}`;
    api.openExternalUrl(paymentUrl);
  };

  const handleRefreshLicenseStatus = async () => {
    setCheckingSync(true);
    setSyncFeedback(null);
    try {
      const res = await api.syncCloudData();
      if (res.success) {
        setSyncFeedback('License status synchronized! You are now active.');
        onUpgradeSuccess?.();
        setTimeout(() => onClose(), 1500);
      } else {
        setSyncFeedback('Payment still processing or not found yet. Please check back in a few seconds.');
      }
    } catch {
      setSyncFeedback('Could not check status. Please check your internet connection.');
    } finally {
      setCheckingSync(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 relative animate-fade-in">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-200 rounded-full text-[11px] font-bold text-brand-800">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            {triggerFeature ? `Unlock ${triggerFeature}` : 'Automate Your Job Hunt'}
          </div>
          <h2 className="text-2xl font-black text-slate-900">Choose Your Seeker Plan</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">Pay securely with Razorpay via UPI (GPay/PhonePe/Paytm), Cards, or Netbanking. Instant autonomous activation.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-brand-300 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Seeker Pro</h3>
                <p className="text-[11px] text-slate-500">For students actively applying</p>
                <div className="mt-2 text-2xl font-black text-slate-900">₹299 <span className="text-xs font-normal text-slate-500">/ month</span></div>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Full Job Board with ATS Match</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> 20-Tab Semi-Auto Review Mode</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> 25 Verified HR Contacts / Week</li>
              </ul>
            </div>
            <button onClick={() => handleRazorpayCheckout('pro')} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
              <span>Pay ₹299 with Razorpay</span><ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="border-2 border-brand-500 bg-brand-50/20 rounded-2xl p-5 space-y-4 relative shadow-lg shadow-brand-100 flex flex-col justify-between">
            <span className="absolute -top-3 right-4 bg-brand-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">Most Popular</span>
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Seeker Turbo</h3>
                <p className="text-[11px] text-slate-500">100% Autopilot + AI Custom Answers</p>
                <div className="mt-2 text-2xl font-black text-brand-600">₹599 <span className="text-xs font-normal text-slate-500">/ month</span></div>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-600 font-bold" /> 100% Autonomous Groq AI Auto-Apply</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-600 font-bold" /> Automated Gmail Drip Outreach</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-600 font-bold" /> 1-Laptop Strict Hardware License</li>
              </ul>
            </div>
            <button onClick={() => handleRazorpayCheckout('turbo')} className="w-full py-2.5 brand-gradient hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-brand flex items-center justify-center gap-2">
              <Zap className="w-3.5 h-3.5 fill-white" /><span>Pay ₹599 with Razorpay</span><ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-2 text-center">
          <button onClick={handleRefreshLicenseStatus} disabled={checkingSync} className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1.5 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${checkingSync ? 'animate-spin' : ''}`} /><span>Already paid? Refresh License Status</span>
          </button>
          {syncFeedback && <p className="text-[11px] text-slate-600 font-medium">{syncFeedback}</p>}
        </div>
      </div>
    </div>
  );
};
