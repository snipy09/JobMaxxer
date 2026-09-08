import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Briefcase, Zap, Sparkles, ArrowDownToLine,
  Search, User, Settings as SettingsIcon, LogOut, ChevronDown,
  FileText, Shield
} from 'lucide-react';
import { AppUser, TabType, PersonaTrack, AppUpdateInfo, getApi, WorkspaceMode } from '../types';
import { UpdateModal } from './UpdateModal';
import { normalizeTier, getTierBadgeProps } from '../utils/tier-utils';

interface TopBarProps {
  currentUser: AppUser | null;
  onLogout: () => void;
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
  activeTrack?: PersonaTrack;
  setTrack?: (track: PersonaTrack) => void;
  workspaceMode?: WorkspaceMode;
  onOpenUpgrade?: () => void;
  onOpenCommandPalette?: () => void;
  onLog?: (msg: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  onLogout,
  activeTab,
  onNavigate,
  activeTrack = 'learner',
  setTrack,
  workspaceMode = 'unified',
  onOpenUpgrade,
  onOpenCommandPalette,
  onLog
}) => {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

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

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userTier = normalizeTier(currentUser?.tier || currentUser?.subscription_tier);
  const isMaxTier = userTier === 'max';
  const tierBadge = getTierBadgeProps(userTier);

  return (
    <>
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 flex items-center justify-between z-30 select-none transition-colors">
        
        {/* 1. Left: Nomadic Brand Icon & Name */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onNavigate(activeTrack === 'learner' ? 'learner-roadmaps' : 'feed')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <img
              src="./assets/logo-icon.png"
              alt="Nomadic Logo"
              className="w-7 h-7 rounded-lg object-contain shadow-xs group-hover:scale-105 transition-transform"
            />
            <span className="font-extrabold text-sm tracking-tight text-slate-950 dark:text-white font-sans">
              Nomadic
            </span>
          </div>

          {/* Canonical Tier Pill Badge */}
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border shadow-xs ${tierBadge.bgClass} ${tierBadge.textClass} ${tierBadge.borderClass}`}>
            {tierBadge.label}
          </span>
        </div>

        {/* 2. Center: Top-Level Workspace Mode Switcher [ Learn | Seek ] (Only visible in unified mode) */}
        {setTrack && workspaceMode === 'unified' && (
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-inner">
            <button
              type="button"
              onClick={() => setTrack('learner')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTrack === 'learner'
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-700'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Learn</span>
            </button>

            <button
              type="button"
              onClick={() => setTrack('seeker')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTrack === 'seeker'
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-700'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Seek</span>
            </button>
          </div>
        )}

        {/* 3. Right: Search (⌘K), Updates, Upgrade, and User Profile Dropdown */}
        <div className="flex items-center gap-2.5">
          
          {/* Global Search Button (⌘K) */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium transition-colors shadow-2xs"
            title="Search Nomadic (⌘K / Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
              ⌘K
            </kbd>
          </button>

          {/* Update Available Badge */}
          {updateInfo && updateInfo.updateAvailable && (
            <button
              type="button"
              onClick={() => setShowUpdateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-powder-50 hover:bg-powder-100 text-powder-900 dark:bg-powder-950/60 dark:hover:bg-powder-900/60 dark:text-powder-300 border border-powder-300 dark:border-powder-800/80 rounded-xl text-xs font-bold transition-all shadow-xs"
              title="A new version of Nomadic is available"
            >
              <ArrowDownToLine className="w-3.5 h-3.5 text-powder-600 dark:text-powder-400" />
              <span>Update (v{updateInfo.latestVersion})</span>
            </button>
          )}

          {/* Upgrade CTA (Hidden for Max Tier) */}
          {!isMaxTier && (
            <button
              type="button"
              onClick={onOpenUpgrade}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95"
              title="View Subscription Plans"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 fill-current" />
              <span>Upgrade</span>
            </button>
          )}

          {/* User Profile Button with Dropdown Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`flex items-center gap-2 p-1.5 pr-2 rounded-xl border transition-all ${
                showUserMenu || activeTab === 'settings' || activeTab === 'profile'
                  ? 'border-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              title="User Profile & Settings Menu"
            >
              <div className="w-6 h-6 rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center text-xs font-bold font-mono">
                {currentUser?.fullName ? currentUser.fullName[0].toUpperCase() : 'N'}
              </div>
              <span className="text-xs font-semibold max-w-[90px] truncate hidden md:inline">
                {currentUser?.fullName ? currentUser.fullName.split(' ')[0] : 'Account'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 animate-fadeIn space-y-1">
                
                {/* User Info Header */}
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="font-bold text-xs text-slate-950 dark:text-white truncate">
                    {currentUser?.fullName || 'Nomadic User'}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    {currentUser?.email || ''}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${tierBadge.bgClass} ${tierBadge.textClass} ${tierBadge.borderClass}`}>
                      {tierBadge.label} PLAN
                    </span>
                    {currentUser?.role === 'admin' && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        ADMIN
                      </span>
                    )}
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="space-y-0.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('settings');
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Profile &amp; Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('settings');
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Resumes &amp; Multi-CVs</span>
                  </button>
                </div>

                {/* Sign Out Button */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>

              </div>
            )}
          </div>

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
