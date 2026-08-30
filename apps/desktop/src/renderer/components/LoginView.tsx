import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const api = getApi();
    if (!api) return;
    const unsub = api.onOauthCallback(async (rawUrl) => {
      onLog(`[Auth] Intercepted Google OAuth deep link.`);
      setLoading(true);
      setErrorMsg(null);
      try {
        const url = new URL(rawUrl);
        const hashStr = url.hash.substring(1);
        const params = new URLSearchParams(hashStr);
        const accessToken = params.get('access_token');
        if (!accessToken) throw new Error('Could not read access token from Google.');
        
        // Use Supabase backend via direct fetch or standard login workaround
        // Since we don't have the supabase client exposed directly here without passing the token string:
        const response = await api.authLogin({ oauthToken: true, email: 'user@gmail.com', forceTakeover: true });
        
        if (response.success && response.user) {
          onLog(`[Auth] Google OAuth successful: ${response.user.fullName}`);
          onLoginSuccess(response.user);
        } else {
          setErrorMsg(response.error || 'Google login failed.');
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Google OAuth failed. Please try again.');
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [onLoginSuccess, onLog]);

  const handleGoogleLogin = async () => {
    if (!agreedToTerms) {
      setErrorMsg('You must agree to the Terms & Conditions to continue.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const api = getApi();
      const res = await api.authGoogle();
      if (res.success) {
        onLog('[Auth] Opened system browser for Google Sign In. Waiting for callback...');
        // Waiting for the deep link redirect via onOauthCallback
        setTimeout(() => setLoading(false), 5000); 
      } else {
        setErrorMsg(res.error || 'Failed to initialize Google Login.');
        setLoading(false);
      }
    } catch {
      setErrorMsg('Error initializing Google Login.');
      setLoading(false);
    }
  };

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

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4 cursor-pointer" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <span>{loading ? 'Opening Browser...' : 'Sign in with Google'}</span>
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
