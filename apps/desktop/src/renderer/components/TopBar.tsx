import React from 'react';
import { Shield, User, LogOut, BookOpen, Zap } from 'lucide-react';
import { AppUser, TabType, PersonaTrack } from '../types';

interface TopBarProps {
  currentUser: AppUser | null;
  onLogout: () => void;
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
  activeTrack?: PersonaTrack;
  setTrack?: (track: PersonaTrack) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  onLogout,
  activeTab,
  onNavigate,
  activeTrack,
  setTrack,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const isInAdminView = activeTab.startsWith('admin');

  const pageTitle = isInAdminView
    ? 'Admin Dashboard'
    : activeTab === 'home' ? 'Home'
    : activeTab === 'feed' ? 'Job Feed'
    : activeTab === 'outreach' ? 'Outreach'
    : activeTab === 'logs' ? 'Activity Logs'
    : activeTab === 'settings' ? 'Settings'
    : activeTab.startsWith('learner') ? 'Learner Track'
    : 'Hirestack';

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-5 flex items-center justify-between z-10 select-none">
      <div className="flex items-center gap-3">
        <span className="font-black text-sm tracking-tight text-slate-900 font-sans">
          Hire<span className="text-brand-600">stack</span> <span className="opacity-40 px-1 font-normal">|</span> {pageTitle}
        </span>

        {isAdmin && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Shield className="w-2.5 h-2.5 fill-amber-500 text-amber-600" /> Admin
          </span>
        )}
      </div>

      {!isInAdminView && setTrack && (
        <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
          <button
            onClick={() => {
              setTrack('learner');
              onNavigate('learner-roadmaps');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTrack === 'learner'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>🎓 Learner Track</span>
          </button>

          <button
            onClick={() => {
              setTrack('seeker');
              onNavigate('feed');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTrack === 'seeker'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>🚀 Seeker Track</span>
          </button>
        </div>
      )}

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
            <span className="text-xs font-bold text-slate-600 hidden sm:inline px-2 py-1 rounded-lg bg-slate-50">
              {currentUser.tier.toUpperCase()}
            </span>
            <span className="text-xs font-medium text-slate-600 hidden sm:inline border-l border-slate-200 pl-2">
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
