import React, { useState } from 'react';
import {
  PanelLeftClose, PanelLeft,
  Home, BookOpen, MessageSquare, Settings as SettingsIcon,
  Briefcase, Mail, LayoutGrid, Terminal, Shield, Compass
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
  activeTrack = 'learner',
  onOpenUpgrade,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Learner Edition: Home, Resources, Interview Prep, Opportunity Board, Settings
  const learnerItems: Array<{ id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'learner-roadmaps', label: 'Home', icon: Home },
    { id: 'learner-resources', label: 'Resources', icon: BookOpen },
    { id: 'learner-interview-prep', label: 'Interview Prep', icon: MessageSquare },
    { id: 'opportunities', label: 'Opportunity Board', icon: Compass },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  // Seeker Edition: Job Board, Opportunity Board, Outreach, Tracking, Logs, Settings
  const seekerItems: Array<{ id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'feed', label: 'Job Board', icon: Briefcase },
    { id: 'opportunities', label: 'Opportunity Board', icon: Compass },
    { id: 'outreach', label: 'Outreach', icon: Mail },
    { id: 'applications', label: 'Tracking', icon: LayoutGrid },
    { id: 'logs', label: 'Logs', icon: Terminal },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const navigationItems = activeTrack === 'learner' ? learnerItems : seekerItems;

  const isLocalOrAdmin =
    currentUser?.role === 'admin' ||
    Boolean(activeTab && activeTab.startsWith('admin')) ||
    (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

  if (isLocalOrAdmin) {
    navigationItems.push({
      id: 'admin-overview',
      label: 'Admin Control',
      icon: Shield,
    });
  }

  return (
    <aside
      className={`border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between select-none transition-all duration-300 ease-in-out z-10 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      <div className="p-2 space-y-2">
        {/* Clean Navigation Links */}
        <div className="space-y-1 pt-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === 'learner-roadmaps' && activeTab === 'learner-roadmaps') ||
              (item.id === 'settings' && (activeTab === 'settings' || activeTab === 'profile'));

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full rounded-xl text-xs font-bold transition-all flex items-center ${
                  collapsed ? 'justify-center py-2.5 px-0' : 'text-left px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
                title={item.label}
              >
                {collapsed ? (
                  <Icon className="w-4 h-4" />
                ) : (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Area with Collapse Toggle Button */}
      <div className="p-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
        {/* Subscription Plan Indicator */}
        {!collapsed && (
          <div className="px-2 py-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span className="uppercase font-bold tracking-wider">{currentUser?.tier || 'Free Trial'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Account Active" />
          </div>
        )}

        {/* Collapse / Expand Button */}
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
