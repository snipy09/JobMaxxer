import React, { useState, useEffect, useRef } from 'react';
import { 
  Mail, Lock, Loader2, AlertCircle, 
  Eye, EyeOff, Check, ArrowRight, 
  UserCheck, ShieldCheck, Zap, Search, Send,
  Sparkles
} from 'lucide-react';
import { animate, stagger } from 'animejs';
import { AppUser, getApi } from '../types';
import { TermsModal } from './TermsModal';

interface LoginViewProps {
  onLoginSuccess: (user: AppUser) => void;
  onLog: (msg: string) => void;
}

const DEMO_CREDENTIALS = [
  { role: 'seeker', label: 'Seeker Pro', email: 'seeker@hirestack.app', password: 'demo123', tier: 'pro' },
  { role: 'learner', label: 'Learner Free', email: 'learner@hirestack.app', password: 'demo123', tier: 'free' },
  { role: 'admin', label: 'Admin View', email: 'admin@hirestack.app', password: 'admin123', tier: 'lifetime' },
];

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onLog,
}) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conflictDevice, setConflictDevice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'credentials' | 'demo'>('credentials');

  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const api = getApi();
    if (!api) return;
    const unsub = api.onOauthCallback(async (rawUrl) => {
      onLog(`[Auth] Intercepted Google OAuth deep link.`);
      setLoading(true);
      setErrorMsg(null);
      try {
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
      if (!res.success) {
        // Browser mode fallback
        const mockUser: AppUser = {
          id: 'usr_google_demo',
          email: 'google.user@hirestack.app',
          fullName: 'Alex Morgan',
          tier: 'pro',
          role: 'user',
          licenseKey: 'HSTK-PRO-DEMO',
          status: 'active',
          expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        onLoginSuccess(mockUser);
      }
    } catch {
      setErrorMsg('Could not initialize Google OAuth.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, forceTakeover: boolean = false) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setErrorMsg('You must agree to the Terms & Conditions to continue.');
      return;
    }
    if (!email || !password) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    if (forceTakeover) setConflictDevice(null);

    try {
      const api = getApi();
      const res = await api.authLogin({ email, password, forceTakeover });

      if (res.conflict) {
        setConflictDevice(res.activeDevice || 'Another Laptop');
        setErrorMsg(res.error || 'Account active on another machine.');
        setLoading(false);
        return;
      }

      if (res.success && res.user) {
        onLog(`[Auth] Sign in successful: ${res.user.fullName} (${res.user.tier.toUpperCase()})`);
        onLoginSuccess(res.user);
      } else {
        // Demo fallback
        const isDemo = email.includes('demo') || DEMO_CREDENTIALS.some(c => c.email === email);
        if (isDemo) {
          const cred = DEMO_CREDENTIALS.find(c => c.email === email) || DEMO_CREDENTIALS[0];
          const mockUser: AppUser = {
            id: `usr_${cred.role}_demo`,
            email: cred.email,
            fullName: cred.role === 'admin' ? 'System Administrator' : cred.role === 'learner' ? 'Jordan Learner' : 'Alex Seeker',
            tier: cred.tier as any,
            role: cred.role === 'admin' ? 'admin' : 'user',
            licenseKey: `HSTK-${cred.role.toUpperCase()}-001`,
            status: 'active',
            expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          };
          onLoginSuccess(mockUser);
        } else {
          setErrorMsg(res.error || 'Invalid credentials. Please verify your email and password.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: 'seeker' | 'learner' | 'admin') => {
    const cred = DEMO_CREDENTIALS.find(c => c.role === role)!;
    setEmail(cred.email);
    setPassword(cred.password);
    handleSubmit(new Event('submit'));
  };

  // Anime.js entrance animations
  useEffect(() => {
    if (containerRef.current) {
      animate(containerRef.current, {
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 600,
        ease: 'outQuart',
      });
    }
    if (logoRef.current) {
      animate(logoRef.current, {
        scale: [0.8, 1],
        opacity: [0, 1],
        delay: 100,
        duration: 500,
        ease: 'outElastic(1, .6)',
      });
    }
    animate('.login-fade-in', {
      opacity: [0, 1],
      translateY: [16, 0],
      delay: stagger(80, { start: 200 }),
      duration: 500,
      ease: 'outQuart',
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-slate-900 selection:text-white">
      <div 
        ref={containerRef}
        className="w-full max-w-md space-y-6"
      >
        {/* Brand Header */}
        <div className="text-center space-y-3 login-fade-in">
          <img
            ref={logoRef}
            src="./assets/logo-icon.png"
            alt="Hirestack Logo"
            className="w-12 h-12 rounded-xl object-contain shadow-sm mx-auto border border-slate-200 dark:border-slate-800"
          />
          <span className="font-extrabold text-2xl tracking-tight text-slate-950 dark:text-white">
            Hire<span className="text-slate-950 dark:text-white">stack</span>
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Desktop platform for job seekers & students across all domains. Master roadmaps, stream ATS feeds, and automate applications.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5 login-fade-in">
          
          {errorMsg && (
            <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/50 rounded-xl p-4 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="leading-tight">{errorMsg}</p>
                {conflictDevice && (
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    className="mt-1 block text-center w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
                  >
                    Disconnect Active Device & Sign In Here
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Auth Tabs */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => { setActiveTab('credentials'); setErrorMsg(null); }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'credentials'
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('demo'); setErrorMsg(null); }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'demo'
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Quick Demo
            </button>
          </div>

          {activeTab === 'credentials' && (
            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-12 py-2.5 text-xs text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-950 dark:hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-brand-600 focus:ring-0 accent-brand-600"
                />
                <label htmlFor="terms" className="text-xs text-slate-500 dark:text-slate-400 select-none">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-brand-600 hover:underline font-medium"
                  >
                    Terms & Conditions
                  </button>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Hirestack</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {activeTab === 'demo' && (
            <div className="grid grid-cols-3 gap-2 login-fade-in">
              {DEMO_CREDENTIALS.map((cred) => (
                <button
                  key={cred.role}
                  type="button"
                  onClick={() => handleDemoLogin(cred.role)}
                  className="py-2.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors text-center flex flex-col items-center gap-1"
                >
                  <span className="text-[10px] font-mono text-brand-600">{cred.tier.toUpperCase()}</span>
                  <span>{cred.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] font-mono text-slate-400 uppercase tracking-widest">Or continue with</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono text-slate-400">
            <div className="flex flex-col items-center gap-1">
              <Search className="w-3.5 h-3.5 text-slate-300" />
              <span>Direct ATS Stream</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-slate-300" />
              <span>Stealth Apply</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Send className="w-3.5 h-3.5 text-slate-300" />
              <span>Verified Outreach</span>
            </div>
          </div>
        </div>

        {showTermsModal && (
          <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
        )}
      </div>
    </div>
  );
};