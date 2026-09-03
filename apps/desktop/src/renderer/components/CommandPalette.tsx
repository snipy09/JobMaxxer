import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Compass, BookOpen, MessageSquare, Briefcase,
  Mail, LayoutGrid, Settings, Sun, Moon, ArrowRight,
  Code2, ExternalLink, Zap, X
} from 'lucide-react';
import { TabType, PersonaTrack } from '../types';
import { VAULT_QUESTIONS } from '../data/resourceVault';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: TabType) => void;
  activeTrack: PersonaTrack;
  onToggleTrack: (track: PersonaTrack) => void;
  theme?: string;
  onToggleTheme?: () => void;
}

interface CommandItem {
  id: string;
  category: 'Navigation' | 'Actions' | 'Questions' | 'Jobs';
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  activeTrack,
  onToggleTrack,
  theme,
  onToggleTheme,
}) => {
  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Base list of searchable commands
  const allCommands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // Navigation
      {
        id: 'nav-home',
        category: 'Navigation',
        title: 'Go to Home (Curriculum)',
        subtitle: 'Roadmap progression & activity heatmap',
        icon: Compass,
        action: () => { onToggleTrack('learner'); onSelectTab('learner-roadmaps'); },
      },
      {
        id: 'nav-resources',
        category: 'Navigation',
        title: 'Go to Resources Vault',
        subtitle: '1,500+ Question Bank & Textbooks',
        icon: BookOpen,
        action: () => { onToggleTrack('learner'); onSelectTab('learner-resources'); },
      },
      {
        id: 'nav-interview-prep',
        category: 'Navigation',
        title: 'Go to Interview Prep',
        subtitle: 'STAR method drills & evaluation',
        icon: MessageSquare,
        action: () => { onToggleTrack('learner'); onSelectTab('learner-interview-prep'); },
      },
      {
        id: 'nav-jobs',
        category: 'Navigation',
        title: 'Go to Job Board',
        subtitle: 'Pinterest-style live opportunity radar',
        icon: Briefcase,
        action: () => { onToggleTrack('seeker'); onSelectTab('feed'); },
      },
      {
        id: 'nav-outreach',
        category: 'Navigation',
        title: 'Go to Recruiter Outreach',
        subtitle: 'Verified hiring contacts & Gmail drafts',
        icon: Mail,
        action: () => { onToggleTrack('seeker'); onSelectTab('outreach'); },
      },
      {
        id: 'nav-tracking',
        category: 'Navigation',
        title: 'Go to Tracking (Pipeline)',
        subtitle: 'Submitted applications Kanban board',
        icon: LayoutGrid,
        action: () => { onToggleTrack('seeker'); onSelectTab('applications'); },
      },
      {
        id: 'nav-settings',
        category: 'Navigation',
        title: 'Go to Settings',
        subtitle: 'Candidate profile, resumes & AI keys',
        icon: Settings,
        action: () => onSelectTab('settings'),
      },

      // Actions
      {
        id: 'action-switch-track',
        category: 'Actions',
        title: activeTrack === 'learner' ? 'Switch to Seeker Track' : 'Switch to Learner Track',
        subtitle: 'Toggle primary workspace persona',
        icon: Zap,
        action: () => {
          const next = activeTrack === 'learner' ? 'seeker' : 'learner';
          onToggleTrack(next);
          onSelectTab(next === 'learner' ? 'learner-roadmaps' : 'feed');
        },
      },
    ];

    // Append sample questions from Question Bank
    VAULT_QUESTIONS.slice(0, 15).forEach((q) => {
      list.push({
        id: `q-${q.id}`,
        category: 'Questions',
        title: q.title,
        subtitle: `${q.category || ''} · ${q.difficulty || ''} · ${(q.companyTags || []).join(', ')}`,
        icon: Code2,
        action: () => {
          onToggleTrack('learner');
          onSelectTab('learner-resources');
        },
      });
    });

    return list;
  }, [activeTrack, onSelectTab, onToggleTrack]);

  // Filter commands by query
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allCommands;
    return allCommands.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
      c.category.toLowerCase().includes(q)
    );
  }, [allCommands, query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-start justify-center pt-24 p-4 font-sans select-none animate-fade-in">
      <div
        className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, question, or page name..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-zinc-100 outline-none placeholder:text-slate-400"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-500">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = idx === selectedIndex;

            return (
              <div
                key={item.id}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`p-3 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                    : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-slate-800 text-white dark:bg-zinc-200 dark:text-zinc-900' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{item.title}</div>
                    {item.subtitle && (
                      <div className={`text-[11px] font-mono truncate ${isSelected ? 'text-slate-300 dark:text-zinc-600' : 'text-slate-400'}`}>
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase ${isSelected ? 'bg-slate-800 text-slate-300 dark:bg-zinc-200 dark:text-zinc-700' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'}`}>
                    {item.category}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400 font-mono">
              No matching commands or questions found.
            </div>
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="p-3 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span>↑↓ to navigate</span>
            <span>·</span>
            <span>↵ to select</span>
          </div>
          <span>Nomadic Spotlight</span>
        </div>
      </div>
    </div>
  );
};
