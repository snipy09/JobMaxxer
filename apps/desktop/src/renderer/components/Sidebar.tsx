import React, { useState } from 'react';
import {
  Home, Search, Mail, FileText, User,
  PanelLeftClose, PanelLeft, Shield, BookOpen, Layers, Crosshair
} from 'lucide-react';
import { TabType, HeartbeatStatus, AppUser, PersonaTrack } from '../types';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  heartbeat?: HeartbeatStatus | null;
  logsCount?: number;
  currentUser?: AppUser | null;
  activeTrack?: PersonaTrack;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  activeTrack,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  const learnerItems: Array<{ id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'learner-roadmaps', label: 'Career Roadmaps', icon: BookOpen },
    { id: 'learner-resources', label: 'Resource Vault', icon: Layers },
    { id: 'learner-interview-prep', label: 'Interview QA', icon: Crosshair },
    { id: 'settings', label: 'Profile', icon: User },
  ];

  const seekerItems: Array<{ id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'feed', label: 'Job feed', icon: Search },
    { id: 'outreach', label: 'Outreach', icon: Mail },
    { id: 'logs', label: 'Logs', icon: FileText },
    { id: 'settings', label: 'Settings', icon: User },
  ];

  const navigationItems = activeTrack === 'learner' ? learnerItems : seekerItems;

  if (currentUser?.role === 'admin') {
    navigationItems.push({
      id: 'admin-overview',
      label: 'Admin',
      icon: Shield,
    });
  }

  return (
    <aside
      className={`border-r border-slate-200 bg-white flex flex-col justify-between select-none transition-all duration-200 ease-in-out ${
        collapsed ? 'w-16' : 'w-52'
      }`}
    >
      <div>
        {/* Brand header */}
        <div className={`flex items-center border-b border-slate-100 h-12 ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'}`}>
          <div className="w-8 h-8 rounded-xl brand-gradient shadow-brand flex items-center justify-center shrink-0">
            <span className="text-white font-black text-[13px] tracking-tight">JM</span>
          </div>
          {!collapsed && (
            <span className="font-black text-sm tracking-tight text-slate-900">
              Job<span className="brand-text-gradient">Maxxer</span>
            </span>
          )}
        </div>

        {/* Navigation Links */}
        <div className="p-2 space-y-1">
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === 'admin-overview' && activeTab.startsWith('admin'));

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full text-left flex items-center rounded-xl text-xs transition-all ${
                  collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-brand-600 text-white font-bold shadow-brand'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-white' : 'text-slate-400'
                }`} />
                {!collapsed && (
                  <span className="truncate leading-snug font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom: Collapse Button */}
      <div className="p-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className={`w-full text-left flex items-center rounded-xl text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all ${
            collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
          }`}
        >
          {collapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4" />
              <span className="text-[11px] font-medium text-slate-500">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
