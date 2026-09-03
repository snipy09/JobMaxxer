import React from 'react';
import { BookOpen, Zap, Sparkles } from 'lucide-react';
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
  activeTab,
  onNavigate,
  activeTrack = 'learner',
  setTrack,
  onOpenUpgrade,
}) => {
  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 flex items-center justify-between z-20 select-none transition-colors">
      
      {/* 1. Nomadic Brand Icon & Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <img
            src="./assets/logo-icon.png"
            alt="Nomadic Logo"
            className="w-7 h-7 rounded-lg object-contain shadow-xs"
          />
          <span className="font-black text-sm tracking-tight text-slate-950 dark:text-white font-sans">
            Nomadic
          </span>
        </div>
      </div>

      {/* 2. Track Selector (Learner Track vs Seeker Track) */}
      {setTrack && (
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
          <button
            onClick={() => {
              setTrack('learner');
              onNavigate('learner-roadmaps');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTrack === 'learner'
                ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTrack === 'seeker'
                ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-slate-950 dark:text-white" />
            <span>Seeker Track</span>
          </button>
        </div>
      )}

      {/* 3. Upgrade Icon / Action Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenUpgrade}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
          title="View Subscription Plans"
        >
          <Zap className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 fill-current" />
          <span>Upgrade</span>
        </button>
      </div>

    </header>
  );
};
