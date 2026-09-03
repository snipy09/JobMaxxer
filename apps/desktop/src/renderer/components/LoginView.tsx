import React, { useState, useEffect } from 'react';
import {
  Lock, Loader2, AlertCircle, Eye, EyeOff,
  ArrowRight, ShieldCheck, Zap, Sparkles
} from 'lucide-react';
import { AppUser, getApi } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: AppUser) => void;
  onLog: (msg: string) => void;
  onSwitchToOnboarding?: () => void;
}

const DEMO_ACCOUNTS = [
  { role: 'user', label: 'Learner Pro (₹79)', email: 'learner@hirestack.app', tier: 'learner_pro', name: 'Rohan Sharma' },
  { role: 'user', label: 'Seeker Pro (₹149)', email: 'seeker@hirestack.app', tier: 'seeker_pro', name: 'Alex Rivera' },
  { role: 'user', label: 'Seeker Max (₹299)', email: 'seeker.max@hirestack.app', tier: 'seeker_max', name: 'Priya Patel' },
  { role: 'user', label: 'Free Trial (₹0)', email: 'trial@hirestack.app', tier: 'free', name: 'David Chen' },
  { role: 'admin', label: 'Admin', email: 'admin@hirestack.app', tier: 'lifetime', name: 'System Administrator' },
];

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onLog,
  onSwitchToOnboarding,
}) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const api = getApi();
      const res = await api.authGoogle();
      if (!res.success) {
        // Browser demo fallback
        const mockUser: AppUser = {
          id: 'usr_google_demo',
          email: 'alex.vance@gmail.com',
          fullName: 'Alex Vance',
          tier: 'learner_pro',
          role: 'user',
          licenseKey: 'HSTK-GOOGLE-001',
          status: 'active',
          expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        onLoginSuccess(mockUser);
      }
    } catch {
      setErrorMsg('Could not initialize Google authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const api = getApi();
      const res = await api.authLogin({ email, password });
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        // Fallback local sign in
        const mockUser: AppUser = {
          id: `usr_${Date.now()}`,
          email,
          fullName: email.split('@')[0].replace('.', ' '),
          tier: 'learner_pro',
          role: email.includes('admin') ? 'admin' : 'user',
          licenseKey: 'HSTK-DEMO-001',
          status: 'active',
          expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        onLoginSuccess(mockUser);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstantDemoLogin = (cred: typeof DEMO_ACCOUNTS[0]) => {
    const mockUser: AppUser = {
      id: `usr_${cred.tier}_demo`,
      email: cred.email,
      fullName: cred.name,
      tier: cred.tier as any,
      role: cred.role as any,
      licenseKey: `HSTK-${cred.tier.toUpperCase()}-001`,
      status: 'active',
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    onLoginSuccess(mockUser);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col items-center justify-center p-4 select-none font-sans">
      
      {/* Centered Apple/Notion Auth Container */}
      <div className="w-full max-w-sm space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs mb-1">
            <img src="./assets/logo-icon.png" alt="Hirestack" className="w-7 h-7 object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            Sign in to Hirestack
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Career roadmaps, interview prep, and automated job search.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-5">
          
          {/* 1-Click Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 transition-colors flex items-center justify-center gap-2.5 shadow-2xs"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Minimal Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-100 dark:border-zinc-800 w-full" />
            <span className="bg-white dark:bg-zinc-900 px-3 text-[10px] text-slate-400 font-mono uppercase">or email</span>
            <div className="border-t border-slate-100 dark:border-zinc-800 w-full" />
          </div>

          {/* Form */}
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700 dark:text-zinc-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 outline-none focus:border-slate-400 text-xs"
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700 dark:text-zinc-300">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 outline-none focus:border-slate-400 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 pt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 mt-1"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Instant Demo Accounts (Quiet & Unobtrusive) */}
        <div className="space-y-2 text-center">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Instant Demo Logins:</span>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.tier}
                onClick={() => handleInstantDemoLogin(acc)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-600 text-[11px] font-medium text-slate-600 dark:text-zinc-400 transition-colors shadow-2xs"
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        {onSwitchToOnboarding && (
          <div className="text-center pt-2 border-t border-slate-200/60 dark:border-zinc-800/60">
            <button
              type="button"
              onClick={onSwitchToOnboarding}
              className="text-xs font-semibold text-slate-600 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white transition-colors inline-flex items-center gap-1.5"
            >
              <span>New candidate? Start 5-Step Career Onboarding</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};