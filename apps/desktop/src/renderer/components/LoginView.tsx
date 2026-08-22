import React, { useState } from 'react';
import { Lock, User, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { AppUser, getApi } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: AppUser) => void;
  onLog: (msg: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onLog,
}) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const api = getApi();
      if (api) {
        const res = await api.authLogin({
          username: cleanUser,
          email: cleanUser,
          password: cleanPass,
          licenseKey: cleanPass,
        });

        if (res.success && res.user) {
          onLog(`[Auth] Logged in as: ${res.user.fullName} (${res.user.role})`);
          onLoginSuccess(res.user);
        } else {
          setErrorMsg(res.error || 'Invalid username or password.');
        }
      } else {
        // Browser demo fallback
        const isAdmin = cleanUser.toLowerCase() === 'raksha' && cleanPass === 'raksha@sajal';
        if (cleanUser.toLowerCase() === 'raksha' && cleanPass !== 'raksha@sajal') {
          setErrorMsg('Invalid password for administrator account.');
          return;
        }

        const mockUser: AppUser = {
          id: isAdmin ? 1 : 2,
          email: isAdmin ? 'raksha@jobmaxxer.com' : (cleanUser.includes('@') ? cleanUser : `${cleanUser}@example.com`),
          fullName: isAdmin ? 'Raksha (Master Admin)' : 'Licensed User',
          role: isAdmin ? 'admin' : 'user',
          tier: isAdmin ? 'lifetime' : 'pro',
          licenseKey: isAdmin ? 'RAKSHA-MASTER-ADMIN-2026' : 'JMX-PRO-9842-8821',
          status: 'active',
          appsCount: isAdmin ? 0 : 42,
          createdAt: new Date().toISOString(),
        };
        onLoginSuccess(mockUser);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-xl p-7 space-y-6">
        
        {/* Minimal Header */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            JobMaxxer
          </h1>
          <p className="text-xs text-slate-400">
            Sign in to continue
          </p>
        </div>

        {/* Simple Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                required
                placeholder="Username or email"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>

      </div>
    </div>
  );
};
