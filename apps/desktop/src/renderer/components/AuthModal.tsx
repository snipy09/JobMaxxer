import React, { useState } from 'react';
import {
  Key, Mail, Lock, ShieldCheck, AlertCircle,
  Loader2, CheckCircle2, User, Sparkles
} from 'lucide-react';
import { AppUser, getApi } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AppUser) => void;
  onLog: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onLog,
}) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (loginEmail?: string, loginPass?: string) => {
    const api = getApi();
    const finalEmail = (loginEmail || email).trim();
    const finalPass = (loginPass || password).trim();

    if (!finalEmail) {
      setErrorMsg('Email address is required.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      if (api) {
        const res = await api.authLogin({
          email: finalEmail,
          password: finalPass,
          licenseKey: finalPass,
        });

        if (res.success && res.user) {
          onLog(`[Auth] Welcome back, ${res.user.fullName} (${res.user.role})!`);
          onSuccess(res.user);
          onClose();
        } else {
          setErrorMsg(res.error || 'Invalid credentials or license key.');
        }
      } else {
        // Fallback for browser mode demo
        const mockUser: AppUser = {
          id: 1,
          email: finalEmail || 'admin@jobmaxxer.com',
          fullName: finalEmail.includes('admin') ? 'Master Admin' : 'Licensed Buyer',
          role: finalEmail.includes('admin') ? 'admin' : 'user',
          tier: 'enterprise',
          licenseKey: 'JMX-ENT-2026-9912',
          status: 'active',
          appsCount: 120,
          createdAt: new Date().toISOString(),
        };
        onSuccess(mockUser);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminQuickLogin = () => {
    setEmail('admin@jobmaxxer.com');
    setPassword('admin123');
    handleLogin('admin@jobmaxxer.com', 'admin123');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-5">
        
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-md">
            <Key className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Sign In to JobMaxxer
          </h2>
          <p className="text-xs text-slate-500">
            Enter your custom login credentials or issued license key.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleLogin();
          }}
          className="space-y-3.5 text-xs"
        >
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="your.email@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-slate-700">Password or License Key</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="Password or JMX-PRO-XXXX-XXXX"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Quick Admin Access */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleAdminQuickLogin}
            className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Sign In as Master Admin (admin@jobmaxxer.com)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-slate-400 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
