import React, { useState } from 'react';
import {
  Compass, Search, Mail, FileText, User,
  PanelLeftClose, PanelLeft, Shield, BookOpen, Layers,
  CheckCircle2, Laptop, CloudCheck, HardDrive, Zap,
  BarChart3, Settings
} from 'lucide-react';
import { TabType, HeartbeatStatus, AppUser, PersonaTrack } from '../types';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  heartbeat?: HeartbeatStatus | null;
  logsCount?: number;
  currentUser?: AppUser | null;
  activeTrack?: PersonaTrack;
  onOpenUpgrade?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  activeTrack = 'seeker',
  heartbeat,
  onOpenUpgrade,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  const learnerItems: Array<{ id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'learner-roadmaps', label: 'Career Roadmaps', icon: BookOpen },
    { id: 'learner-resources', label: 'Resource Vault', icon: Layers },
    { id: 'learner-interview-prep', label: 'Interview Prep', icon: FileText },
    { id: 'profile', label: 'My Skills & Profile', icon: User },
  ];

  const seekerItems: Array<{ id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'feed', label: 'Opportunity Stream', icon: Search },
    { id: 'outreach', label: 'Recruiter Outreach', icon: Mail },
    { id: 'applications', label: 'Pipeline Board', icon: BarChart3 },
    { id: 'profile', label: 'Candidate Profile', icon: User },
    { id: 'logs', label: 'Activity Logs', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navigationItems = activeTrack === 'learner' ? learnerItems : seekerItems;

  if (currentUser?.role === 'admin') {
    navigationItems.push({
      id: 'admin-overview',
      label: 'Admin Control',
      icon: Shield,
    });
  }

  return (
    <aside
      className={`border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between select-none transition-all duration-200 ease-in-out z-10 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      <div>
        {/* Brand header */}
        <div className={`flex items-center border-b border-slate-100 dark:border-slate-800 h-14 ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-3.5'}`}>
          <img
            src="./assets/logo-icon.png"
            alt="Hirestack Icon"
            className="w-7 h-7 rounded-md object-contain shadow-sm shrink-0"
          />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-slate-950 dark:text-white">
                Hire<span className="text-brand-600">stack</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 -mt-0.5">
                {activeTrack === 'learner' ? 'Learner Edition' : 'Seeker Edition'}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div className="p-2 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'learner-roadmaps' && activeTab.startsWith('learner'));

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white dark:text-slate-950' : 'text-slate-400'}`} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Area */}
      <div className="p-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
        {/* Upgrade Banner for Free Users */}
        {!collapsed && currentUser?.tier === 'free' && onOpenUpgrade && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <Zap className="w-3 h-3 text-brand-600" /> Unlock Seeker Pro
              </span>
              <span className="text-[10px] font-mono text-slate-400">₹299</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              20-tab review mode &amp; verified recruiter outreach.
            </p>
            <button
              onClick={onOpenUpgrade}
              className="w-full py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[10px] font-bold transition-colors shadow-sm"
            >
              Upgrade Plan
            </button>
          </div>
        )}

        {/* Device & Hardware Lock Status */}
        {!collapsed && (
          <div className="px-2 py-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Laptop className="w-3 h-3 text-slate-400" />
              <span>Hardware Locked</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Device License Active" />
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
