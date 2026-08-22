import React from 'react';
import { Shield, User, LogOut, Key } from 'lucide-react';
import { AppUser, TabType } from '../types';

interface TopBarProps {
  currentUser: AppUser | null;
  onOpenAuth: () => void;
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  onOpenAuth,
  activeTab,
  onNavigate,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const isInAdminView = activeTab.startsWith('admin');

  return (
    <header className="h-12 border-b border-slate-200 bg-white px-5 flex items-center justify-between z-10 select-none">
      <div className="flex items-center gap-3">
        <span className="font-bold text-sm tracking-tight text-slate-900 font-sans">
          JobMaxxer
        </span>

        {isAdmin && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Shield className="w-2.5 h-2.5 fill-amber-500 text-amber-600" /> Admin
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isAdmin && (
          <button
            type="button"
            onClick={() => onNavigate(isInAdminView ? 'home' : 'admin-overview')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 ${
              isInAdminView
                ? 'bg-slate-900 text-white border-slate-900'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{isInAdminView ? 'Exit to Client App' : 'Admin Dashboard'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenAuth}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 transition-colors"
          title={currentUser ? `Logged in as ${currentUser.email}` : 'Sign In'}
        >
          <User className="w-3.5 h-3.5 text-slate-500" />
          <span className="max-w-[120px] truncate">
            {currentUser ? currentUser.fullName.split(' ')[0] : 'Sign In'}
          </span>
        </button>
      </div>
    </header>
  );
};
