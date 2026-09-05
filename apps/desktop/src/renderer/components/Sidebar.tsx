import React, { useState } from 'react';
import {
  PanelLeftClose, PanelLeft,
  BookOpen, MessageSquare, Settings as SettingsIcon,
  Briefcase, Mail, LayoutGrid, Terminal, Shield, Compass,
  Target, Activity, TrendingUp, Layers
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

interface NavSection {
  title: string;
  items: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  activeTrack = 'learner',
  onOpenUpgrade,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Grouped Navigation for Learner Workspace
  const learnerSections: NavSection[] = [
    {
      title: 'LEARN',
      items: [
        { id: 'learner-roadmaps', label: 'Roadmaps', icon: Compass },
        { id: 'learner-resources', label: 'Resources', icon: BookOpen },
        { id: 'learner-interview-prep', label: 'Interview Prep', icon: MessageSquare },
      ],
    },
    {
      title: 'DISCOVER',
      items: [
        { id: 'opportunities', label: 'Opportunities', icon: Target },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'logs', label: 'Activity', icon: TrendingUp },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
      ],
    },
  ];

  // Grouped Navigation for Seeker Workspace
  const seekerSections: NavSection[] = [
    {
      title: 'SEEK',
      items: [
        { id: 'feed', label: 'Job Board', icon: Briefcase },
        { id: 'opportunities', label: 'Opportunities', icon: Target },
        { id: 'outreach', label: 'Outreach', icon: Mail },
        { id: 'applications', label: 'Tracking', icon: LayoutGrid },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'logs', label: 'Activity', icon: TrendingUp },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
      ],
    },
  ];

  const sections = activeTrack === 'learner' ? learnerSections : seekerSections;

  const isLocalOrAdmin =
    currentUser?.role === 'admin' ||
    Boolean(activeTab && activeTab.startsWith('admin')) ||
    (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

  if (isLocalOrAdmin) {
    sections.push({
      title: 'ADMIN',
      items: [
        { id: 'admin-overview', label: 'Admin Control', icon: Shield },
      ],
    });
  }

  return (
    <aside
      className={`border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between select-none transition-all duration-300 ease-in-out z-20 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      <div className="p-2.5 space-y-5 overflow-y-auto">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {/* Section Header */}
            {!collapsed && (
              <div className="px-3 pb-1 text-[10px] font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                {section.title}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
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
                    className={`w-full rounded-xl text-xs font-semibold transition-all flex items-center relative ${
                      collapsed ? 'justify-center py-2.5 px-0' : 'text-left px-3 py-2'
                    } ${
                      isActive
                        ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                    title={item.label}
                  >
                    {isActive && !collapsed && (
                      <span className="absolute left-1.5 w-1 h-3 rounded-full bg-powder-400 dark:bg-powder-600" />
                    )}
                    <Icon className={`w-4 h-4 shrink-0 ${collapsed ? '' : 'mr-2.5'}`} />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Area with Collapse Toggle Button */}
      <div className="p-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
        {/* Subscription Plan Indicator */}
        {!collapsed && (
          <div className="px-2.5 py-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span className="uppercase font-bold tracking-wider">{currentUser?.tier || 'Free'}</span>
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
