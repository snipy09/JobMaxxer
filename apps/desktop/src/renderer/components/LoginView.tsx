import React, { useState, useEffect } from 'react';
import {
  Loader2, AlertCircle, CheckCircle2, X, RefreshCw, Sparkles, Shield
} from 'lucide-react';
import { AppUser, getApi } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: AppUser) => void;
  onLog: (msg: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onLog,
}) => {
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [googleSuccess, setGoogleSuccess] = useState<boolean>(false);
  const [googleWaitSeconds, setGoogleWaitSeconds] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Listen for Google OAuth callback from electron main process
  useEffect(() => {
    const api = getApi();
    if (!api || !api.onOauthCallback) return;

    const unsub = api.onOauthCallback((data: any) => {
      if (data && data.success && data.user) {
        setGoogleSuccess(true);
        onLog(`[Auth] Google authentication verified for ${data.user.email} ✓`);
        setTimeout(() => {
          setGoogleLoading(false);
          onLoginSuccess(data.user);
        }, 800);
      } else if (data && data.error) {
        setGoogleLoading(false);
        setErrorMsg(`Google sign-in error: ${data.error}`);
      }
    });

    return () => unsub();
  }, [onLoginSuccess, onLog]);

  // Google wait timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (googleLoading && !googleSuccess) {
      interval = setInterval(() => {
        setGoogleWaitSeconds((s) => s + 1);
      }, 1000);
    } else {
      setGoogleWaitSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [googleLoading, googleSuccess]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setGoogleSuccess(false);
    setErrorMsg(null);
    try {
      const api = getApi();
      const res = await api.authGoogle();
      if (!res.success) {
        setErrorMsg(res.error || 'Could not open Google authentication in browser.');
        setGoogleLoading(false);
      } else {
        onLog('[Auth] Google sign-in opened in your browser. Waiting for authorization callback...');
      }
    } catch {
      setErrorMsg('Could not initialize Google authentication loopback.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] dark:bg-[#0A0A0C] text-slate-900 dark:text-zinc-100 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-powder-500/10 dark:bg-powder-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Centered Auth Card */}
      <div className="w-full max-w-sm space-y-6 relative z-10 animate-in fade-in duration-200">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-md mb-1 border border-slate-800 dark:border-slate-200">
            <img src="./assets/logo-icon.png" alt="Nomadic" className="w-7 h-7 object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Welcome to Nomadic
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Intelligent career roadmaps, interview prep &amp; autonomous job radar.
          </p>
        </div>

        {/* ── CARD CONTAINER ────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-5">
          
          {/* ══════════════════════════════════════════════════════════════
              GOOGLE OAUTH ACTIVE PROCESSING OVERLAY
          ══════════════════════════════════════════════════════════════ */}
          {googleLoading ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 space-y-3.5 animate-in fade-in duration-150">
              {googleSuccess ? (
                <div className="text-center py-4 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    Google Identity Verified!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Connecting your profile and launching your workspace...
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center justify-center">
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center shadow-xs">
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </div>
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Connecting with Google</h4>
                        <p className="text-[10px] text-slate-400 font-mono">Listening for callback ({googleWaitSeconds}s)</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGoogleLoading(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-3 bg-white dark:bg-zinc-800/80 rounded-xl border border-slate-200/80 dark:border-zinc-700/80 space-y-2 text-[11px]">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px]">✓</span>
                      <span>Secure loopback authorization active</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300 font-medium">
                      <Loader2 className="w-4 h-4 text-powder-500 animate-spin shrink-0" />
                      <span>Waiting for you in browser window...</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Re-open Browser</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoogleLoading(false)}
                      className="py-2 px-3 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* 1-Click Exclusive Google Sign In Button */
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-3.5 px-4 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 border border-slate-800 dark:border-zinc-200 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-3 shadow-md active:scale-98"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google (1-Click)</span>
              </button>

              <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-zinc-400 text-center leading-relaxed">
                Click above to authenticate securely via Google in your browser.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-400 font-mono">
          Encrypted with local SQLite WAL &amp; single-laptop hardware locks.
        </p>
      </div>
    </div>
  );
};
