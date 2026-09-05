import React, { useState, useEffect } from 'react';
import { BookOpen, Zap, Sparkles, ArrowDownToLine } from 'lucide-react';
import { AppUser, TabType, PersonaTrack, AppUpdateInfo, getApi } from '../types';
import { UpdateModal } from './UpdateModal';

interface TopBarProps {
  currentUser: AppUser | null;
  onLogout: () => void;
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
  activeTrack?: PersonaTrack;
  setTrack?: (track: PersonaTrack) => void;
  onOpenUpgrade?: () => void;
  onLog?: (msg: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  activeTab,
  onNavigate,
  activeTrack = 'learner',
  setTrack,
  onOpenUpgrade,
  onLog
}) => {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);

  // Background update check on launch
  useEffect(() => {
    const checkUpdates = async () => {
      const api = getApi();
      if (!api || !api.checkForUpdates) return;
      try {
        const res = await api.checkForUpdates();
        if (res && res.updateAvailable) {
          const dismissedVersion = sessionStorage.getItem('nomadic_dismissed_update_version');
          if (dismissedVersion !== res.latestVersion) {
            setUpdateInfo(res);
            onLog?.(`[Updates] New version available: v${res.latestVersion}`);
          }
        } else {
          setUpdateInfo(null);
        }
      } catch {}
    };
    checkUpdates();
  }, []);

  return (
    <>
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
              {activeTrack === 'learner' && <span className="w-1.5 h-1.5 rounded-full bg-powder-400 dark:bg-powder-400" />}
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
              {activeTrack === 'seeker' && <span className="w-1.5 h-1.5 rounded-full bg-powder-400 dark:bg-powder-400" />}
            </button>
          </div>
        )}

        {/* 3. Action Buttons & Subtle Invisible-by-default Update Pill */}
        <div className="flex items-center gap-2">
          
          {/* Subtle Powder-Blue Update Button (ONLY VISIBLE WHEN UPDATE IS AVAILABLE) */}
          {updateInfo && updateInfo.updateAvailable && (
            <button
              type="button"
              onClick={() => setShowUpdateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-powder-50 hover:bg-powder-100 text-powder-900 dark:bg-powder-950/60 dark:hover:bg-powder-900/60 dark:text-powder-300 border border-powder-300 dark:border-powder-800/80 rounded-xl text-xs font-bold transition-all shadow-xs animate-in fade-in"
              title="A new version of Nomadic is available"
            >
              <ArrowDownToLine className="w-3.5 h-3.5 text-powder-600 dark:text-powder-400" />
              <span>Update Available (v{updateInfo.latestVersion})</span>
            </button>
          )}

          {/* Upgrade CTA: Hidden if user is already on Seeker Max or Lifetime */}
          {!Boolean(
            currentUser?.tier === 'seeker_max' ||
            currentUser?.tier === 'max' ||
            currentUser?.tier === 'lifetime' ||
            currentUser?.subscription_tier === 'seeker_max' ||
            currentUser?.subscription_tier === 'max' ||
            currentUser?.subscription_tier === 'lifetime'
          ) && (
            <button
              onClick={onOpenUpgrade}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
              title="View Subscription Plans"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 fill-current" />
              <span>Upgrade</span>
            </button>
          )}
        </div>

      </header>

      {/* In-App Update Modal */}
      {showUpdateModal && updateInfo && (
        <UpdateModal
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          updateInfo={updateInfo}
          onLog={onLog}
        />
      )}
    </>
  );
};
