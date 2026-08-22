import React from 'react';
import { Shield, User, LogOut } from 'lucide-react';
import { AppUser, TabType } from '../types';

interface TopBarProps {
  currentUser: AppUser | null;
  onLogout: () => void;
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  onLogout,
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

        {currentUser && (
          <div className="flex items-center gap-2 pl-1">
            <span className="text-xs font-medium text-slate-600 hidden sm:inline">
              {currentUser.fullName.split(' ')[0]}
            </span>

            <button
              type="button"
              onClick={onLogout}
              className="text-xs text-slate-400 hover:text-slate-700 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
