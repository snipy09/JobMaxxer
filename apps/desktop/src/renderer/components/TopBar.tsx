import React from 'react';
import { Shield, User, LogOut, BookOpen, Zap, Sparkles, Laptop } from 'lucide-react';
import { AppUser, TabType, PersonaTrack } from '../types';

interface TopBarProps {
  currentUser: AppUser | null;
  onLogout: () => void;
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
  activeTrack?: PersonaTrack;
  setTrack?: (track: PersonaTrack) => void;
  onOpenUpgrade?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  onLogout,
  activeTab,
  onNavigate,
  activeTrack = 'seeker',
  setTrack,
  onOpenUpgrade,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const isInAdminView = activeTab.startsWith('admin');

  const pageTitle = isInAdminView
    ? 'Admin Dashboard'
    : activeTab === 'home' ? 'Overview'
    : activeTab === 'feed' ? 'Opportunity Feed'
    : activeTab === 'outreach' ? 'Recruiter Outreach'
    : activeTab === 'logs' ? 'Activity Stream'
    : activeTab === 'settings' ? 'Settings'
    : activeTab === 'profile' ? 'Candidate Profile'
    : activeTab === 'applications' ? 'Pipeline Board'
    : activeTab.startsWith('learner') ? 'Learner Hub'
    : 'Dashboard';

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 flex items-center justify-between z-20 select-none transition-colors">
      {/* Brand & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <img
            src="./assets/logo-icon.png"
            alt="Hirestack Logo Icon"
            className="w-6 h-6 rounded object-contain shadow-sm"
          />
          <span className="font-extrabold text-sm tracking-tight text-slate-950 dark:text-white font-sans">
            Hire<span className="text-brand-600">stack</span>
          </span>
        </div>

        <span className="text-slate-300 dark:text-slate-700 font-light">/</span>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          {pageTitle}
        </span>

        {isAdmin && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
            <Shield className="w-2.5 h-2.5 fill-amber-500 text-amber-600" /> Admin
          </span>
        )}
      </div>

      {/* Track Switcher (Learner vs. Seeker) */}
      {!isInAdminView && setTrack && (
        <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
          <button
            onClick={() => {
              setTrack('learner');
              onNavigate('learner-roadmaps');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTrack === 'learner'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Learner Track</span>
          </button>

          <button
            onClick={() => {
              setTrack('seeker');
              onNavigate('feed');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTrack === 'seeker'
                ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-brand-600" />
            <span>Seeker Track</span>
          </button>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {onOpenUpgrade && currentUser?.tier === 'free' && (
          <button
            onClick={onOpenUpgrade}
            className="text-[11px] font-bold bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1 rounded-lg shadow-sm transition-all flex items-center gap-1"
          >
            <Zap className="w-3 h-3" />
            <span>Upgrade</span>
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => onNavigate(isInAdminView ? 'home' : 'admin-overview')}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
              isInAdminView
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{isInAdminView ? 'Exit Admin' : 'Admin'}</span>
          </button>
        )}

        {currentUser && (
          <div className="flex items-center gap-2 pl-1">
            <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 hidden sm:inline px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {currentUser.tier.toUpperCase()}
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline border-l border-slate-200 dark:border-slate-700 pl-2">
              {currentUser.fullName.split(' ')[0]}
            </span>

            <button
              type="button"
              onClick={onLogout}
              className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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
