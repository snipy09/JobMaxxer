import React, { useState } from 'react';
import { Lock, Mail, Loader2, AlertCircle, ArrowRight, ShieldCheck, Zap, Send, Search } from 'lucide-react';
import { AppUser, getApi } from '../types';
import { TermsModal } from './TermsModal';

interface LoginViewProps {
  onLoginSuccess: (user: AppUser) => void;
  onLog: (msg: string) => void;
}

const TRUST_POINTS: Array<{ icon: React.ComponentType<{ className?: string }>; label: string }> = [
  { icon: Search, label: '1000+ job sources' },
  { icon: Zap, label: 'One-click auto-apply' },
  { icon: Send, label: 'Referral outreach' },
];

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onLog,
}) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conflictDevice, setConflictDevice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent, forceTakeover: boolean = false) => {
    if (e) e.preventDefault();
    const cleanUser = email.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    if (!agreedToTerms) {
      setErrorMsg('You must agree to the Terms & Conditions to continue.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    if (forceTakeover) {
      setConflictDevice(null);
    }

    try {
      const api = getApi();
      const res = await api.authLogin({
        username: cleanUser,
        email: cleanUser,
        password: cleanPass,
        licenseKey: cleanPass,
        forceTakeover,
      });

      if (res.success && res.user) {
        onLog(`[Auth] Logged in as: ${res.user.fullName} (${res.user.role})`);
        onLoginSuccess(res.user);
      } else if (res.conflict) {
        setConflictDevice(res.activeDevice || 'Another Laptop');
        setErrorMsg(res.error || `Your account is already in use on ${res.activeDevice || 'another device'}.`);
      } else {
        setErrorMsg(res.error || 'Invalid email or password.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not reach the licensing server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen brand-aurora flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-sm animate-fade-up">
        {/* Brand identity — the signature element */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl brand-gradient shadow-brand flex items-center justify-center mb-4">
            <span className="text-white font-black text-xl tracking-tight">JM</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Job<span className="brand-text-gradient">Maxxer</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 max-w-[16rem] leading-relaxed">
            Your job hunt on autopilot — scrape, apply, and get referred while you sleep.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 p-7 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-[11px] font-bold text-slate-700">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="text"
                  autoFocus
                  required
                  autoComplete="username"
                  placeholder="you@college.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-[11px] font-bold text-slate-700">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all font-mono"
                />
              </div>
            </div>

            {/* Terms & Conditions toggle */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="checkbox"
                id="terms-toggle"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-200 cursor-pointer accent-brand-600"
              />
              <label htmlFor="terms-toggle" className="text-[11px] text-slate-600 cursor-pointer">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTermsModal(true);
                  }}
                  className="font-bold text-brand-600 underline hover:text-brand-700"
                >
                  Terms &amp; Conditions
                </button>
              </label>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
                {conflictDevice && (
                  <div className="pt-1 border-t border-rose-200 flex flex-col gap-1.5">
                    <p className="text-[10px] text-rose-700">
                      Do you want to disconnect <strong>{conflictDevice}</strong> and make this laptop your active device?
                    </p>
                    <button
                      type="button"
                      onClick={(e) => handleSubmit(e, true)}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] py-1.5 rounded-lg transition-colors"
                    >
                      Disconnect Other Laptop &amp; Sign In Here
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full brand-gradient hover:opacity-95 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-brand disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Trust row — what the license unlocks (replaces demo credential buttons) */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2">
            {TRUST_POINTS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center text-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-medium text-slate-500 leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-[10px] text-slate-400 text-center mt-4 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3 h-3" />
          Licensed access · accounts issued by your administrator
        </p>
      </div>

      {/* Terms & Conditions Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setAgreedToTerms(true)}
        hasAccepted={agreedToTerms}
      />
    </div>
  );
};
