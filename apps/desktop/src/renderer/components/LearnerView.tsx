import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  RoadmapMilestone, LearnResource, SubModule, Roadmap
} from '../data/roadmaps';
import { MasterProfile, getApi, CustomRoadmapRecord, ActivityHeatmapDay, ActivityStats, AppUser } from '../types';
import {
  Check, CheckSquare, Square, ExternalLink,
  ChevronRight, ChevronDown, BookOpen,
  Laptop, X, ArrowRight, SlidersHorizontal,
  Clock, ShieldCheck, Layers, CheckCircle2,
  Plus, Loader2, Sparkles, RefreshCw, Award,
  Youtube, FileText, Compass, Trash2, Calendar,
  Pencil, MoreHorizontal, Target, TrendingUp, Info, Play
} from 'lucide-react';

interface LearnerViewProps {
  profile: MasterProfile;
  onUpdateProfile: (updated: Partial<MasterProfile>) => void;
  onNavigateToSeeker: () => void;
  onLog: (msg: string) => void;
  currentUser?: AppUser | null;
  onOpenUpgrade?: (feature?: string) => void;
}

const TIMELINE_OPTIONS = [
  { id: '1 Month', label: '1 Month', sub: 'Fast-Track / Sprint' },
  { id: '3 Months', label: '3 Months', sub: 'Standard (Recommended)' },
  { id: '6 Months', label: '6 Months', sub: 'Comprehensive Mastery' },
];

const COMMITMENT_OPTIONS = [
  { id: '1 Hour/Day', label: '1 Hour / Day', sub: 'Consistent Pacing' },
  { id: '2 Hours/Day', label: '2 Hours / Day', sub: 'Optimal Growth' },
  { id: '4+ Hours/Day', label: '4+ Hours / Day', sub: 'Full Immersion' },
];

const ensureArray = (val: any): string[] => {
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === 'string') return val.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  return [];
};

export const LearnerView: React.FC<LearnerViewProps> = ({
  profile,
  onUpdateProfile,
  onNavigateToSeeker,
  onLog,
  currentUser,
  onOpenUpgrade,
}) => {
  const [customRoadmaps, setCustomRoadmaps] = useState<Roadmap[]>(() => {
    try {
      const cached = localStorage.getItem('nomadic_cached_roadmap');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id) return [parsed];
      }
    } catch {}
    return [];
  });

  const [activeRoadmapId, setActiveRoadmapId] = useState<string>(() => {
    try {
      const cached = localStorage.getItem('nomadic_cached_roadmap');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id) return parsed.id;
      }
    } catch {}
    return '';
  });

  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [completedConcepts, setCompletedConcepts] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('nomadic_completed_concepts');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Selected Item for Right-Side Slide-Over Drawer
  const [activeDrawerMilestone, setActiveDrawerMilestone] = useState<RoadmapMilestone | null>(null);
  const [activeDrawerSubModule, setActiveDrawerSubModule] = useState<SubModule | null>(null);

  // Custom AI Roadmaps modal state
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [newRoleTitle, setNewRoleTitle] = useState<string>('');
  const [newCustomTitle, setNewCustomTitle] = useState<string>('');
  const [newSkillsInput, setNewSkillsInput] = useState<string>('');
  const [targetHorizon, setTargetHorizon] = useState<string>('3 Months');
  const [dailyCommitment, setDailyCommitment] = useState<string>('2 Hours/Day');
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // In-Place Roadmap Renaming State
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [editingTitleText, setEditingTitleText] = useState<string>('');
  const [showMenuDropdown, setShowMenuDropdown] = useState<boolean>(false);
  const [showReadinessBreakdown, setShowReadinessBreakdown] = useState<boolean>(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  // Expanded Phases in Vertical Journey
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  // Database-backed Activity Heatmap & Stats
  const [heatmapData, setHeatmapData] = useState<ActivityHeatmapDay[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats>({ streakCount: 1, totalActions: 0 });

  const menuRef = useRef<HTMLDivElement>(null);

  // Close utility menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenuDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load custom roadmaps from SQLite
  const loadCustomRoadmaps = async (forceTitle?: string) => {
    const api = getApi();
    if (!api || !api.getCustomRoadmaps) return;
    try {
      const records = await api.getCustomRoadmaps();
      if (records && Array.isArray(records) && records.length > 0) {
        const parsed: Roadmap[] = records.map((r: CustomRoadmapRecord) => {
          try {
            return JSON.parse(r.roadmapJson);
          } catch {
            return null;
          }
        }).filter(Boolean);

        if (parsed.length > 0) {
          setCustomRoadmaps(parsed);
          const found = parsed.find(p => p.id === activeRoadmapId);
          if (!found) {
            setActiveRoadmapId(parsed[0].id);
            try {
              localStorage.setItem('nomadic_cached_roadmap', JSON.stringify(parsed[0]));
            } catch {}
          }
          return;
        }
      }

      // If user deleted all roadmaps or none in DB, keep empty
      const userDeletedAll = localStorage.getItem('nomadic_user_deleted_all_roadmaps') === 'true';
      if (userDeletedAll) {
        setCustomRoadmaps([]);
        setActiveRoadmapId('');
        return;
      }

      // If we already have a cached roadmap in memory or state, do not auto-synthesize
      if (customRoadmaps.length > 0) return;

      const target = forceTitle || profile.desiredTitle;
      if (target && !isGeneratingRoadmap) {
        await autoSynthesizeFirstRoadmap(target);
      }
    } catch {}
  };

  const autoSynthesizeFirstRoadmap = async (roleTitle: string) => {
    const api = getApi();
    if (!api || !api.generateCustomRoadmap) return;
    setIsGeneratingRoadmap(true);
    try {
      const res = await api.generateCustomRoadmap({
        roleTitle,
        currentSkills: profile.techStack,
        targetHorizon,
        dailyCommitment,
        geminiKey: profile.geminiApiKey,
        groqKey: profile.groqApiKey,
      });

      if (res && res.success && res.roadmap) {
        setCustomRoadmaps([res.roadmap]);
        setActiveRoadmapId(res.roadmap.id);
        try {
          localStorage.setItem('nomadic_cached_roadmap', JSON.stringify(res.roadmap));
        } catch {}
        onLog(`[Curriculum Engine] Synthesized personalized curriculum for "${roleTitle}"`);
      }
    } catch (err: any) {
      console.warn('[Curriculum Engine] Synthesis note:', err?.message);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  // Load authentic activity logs and heatmap
  const loadActivityData = async () => {
    const api = getApi();
    if (!api) return;
    try {
      if (api.getActivityHeatmap) {
        const days = await api.getActivityHeatmap(365);
        setHeatmapData(days || []);
      }
      if (api.getActivityStats) {
        const stats = await api.getActivityStats();
        if (stats) setActivityStats(stats);
      }
    } catch {}
  };

  useEffect(() => {
    loadCustomRoadmaps();
    loadActivityData();
  }, [profile.desiredTitle]);

  // Load saved progress from SQLite on mount / roadmap change
  useEffect(() => {
    const loadProgress = async () => {
      if (!activeRoadmapId) return;
      const api = getApi();
      if (!api || !api.getLearnerProgress) return;
      try {
        const prog = await api.getLearnerProgress(activeRoadmapId);
        if (prog && prog.completedNodes && Array.isArray(prog.completedNodes)) {
          setCompletedNodes(prog.completedNodes);
          if (prog.targetHorizon) setTargetHorizon(prog.targetHorizon);
          if (prog.dailyCommitment) setDailyCommitment(prog.dailyCommitment);
        } else {
          setCompletedNodes([]);
        }
      } catch {}
    };
    loadProgress();
  }, [activeRoadmapId]);

  const currentRoadmap = useMemo(() => {
    return customRoadmaps.find(r => r.id === activeRoadmapId) || customRoadmaps[0] || null;
  }, [customRoadmaps, activeRoadmapId]);

  const totalCount = currentRoadmap?.milestones?.length || 0;
  const completedCount = completedNodes.filter(id => (currentRoadmap?.milestones || []).some((m: any) => m.id === id)).length;
  const score = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isRoadmapCompleted = totalCount > 0 && completedCount === totalCount;

  // Auto-expand the current active phase
  useEffect(() => {
    if (!currentRoadmap) return;
    const firstIncomplete = (currentRoadmap.milestones || []).find(m => !completedNodes.includes(m.id));
    if (firstIncomplete) {
      setExpandedPhases(new Set([firstIncomplete.id]));
    } else if (currentRoadmap.milestones && currentRoadmap.milestones.length > 0) {
      setExpandedPhases(new Set([currentRoadmap.milestones[0].id]));
    }
  }, [currentRoadmap?.id, completedNodes.length]);

  // ── NEXT ACTION RESOLUTION ENGINE ───────────────────────────────────────
  const nextAction = useMemo(() => {
    if (!currentRoadmap || !currentRoadmap.milestones || currentRoadmap.milestones.length === 0) {
      return null;
    }

    // If completely done
    if (isRoadmapCompleted) {
      return {
        type: 'completed' as const,
        phaseTitle: 'All Phases Finished',
        taskTitle: 'Roadmap Completed',
        description: `You've mastered all ${totalCount} phases for this track. Sync your progress to update your recruiter-facing candidate profile.`,
        estimatedTime: '100% Ready',
        milestone: currentRoadmap.milestones[currentRoadmap.milestones.length - 1],
        subModule: null,
      };
    }

    // Find the first incomplete milestone
    const activeMilestone = currentRoadmap.milestones.find(m => !completedNodes.includes(m.id)) || currentRoadmap.milestones[0];

    // Find incomplete submodule if present
    const subModules = activeMilestone.subModules || [];
    let targetSubModule: SubModule | null = null;

    for (const sub of subModules) {
      const concepts = sub.keyConcepts || [];
      const hasUncheckedConcepts = concepts.some((c, idx) => !completedConcepts.has(`${sub.id}-c${idx}`));
      if (hasUncheckedConcepts || concepts.length === 0) {
        targetSubModule = sub;
        break;
      }
    }

    if (!targetSubModule && subModules.length > 0) {
      targetSubModule = subModules[0];
    }

    const duration = targetSubModule?.resources?.[0]?.duration || `${Math.round(activeMilestone.estimatedHours / Math.max(1, subModules.length))}h` || '35 min';

    return {
      type: 'action' as const,
      phaseTitle: activeMilestone.title,
      taskTitle: targetSubModule?.title || activeMilestone.title,
      description: targetSubModule?.description || activeMilestone.description,
      estimatedTime: duration,
      milestone: activeMilestone,
      subModule: targetSubModule,
    };
  }, [currentRoadmap, completedNodes, completedConcepts, isRoadmapCompleted, totalCount]);

  // Total completed hours calculation
  const totalCompletedHours = useMemo(() => {
    if (!currentRoadmap || !currentRoadmap.milestones) return 0;
    return currentRoadmap.milestones
      .filter(m => completedNodes.includes(m.id))
      .reduce((acc, curr) => acc + (curr.estimatedHours || 20), 0);
  }, [currentRoadmap, completedNodes]);

  const togglePhaseExpansion = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  const toggleComplete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isNowComplete = !completedNodes.includes(id);
    const next = isNowComplete ? [...completedNodes, id] : completedNodes.filter(n => n !== id);
    setCompletedNodes(next);

    const api = getApi();
    if (api) {
      if (api.saveLearnerProgress) {
        await api.saveLearnerProgress({
          roadmapId: activeRoadmapId,
          completedNodes: next,
          targetHorizon,
          dailyCommitment,
        });
      }
      if (isNowComplete && api.logUserActivity) {
        const nodeObj = (currentRoadmap?.milestones || []).find((m: any) => m.id === id);
        await api.logUserActivity('milestone', `Completed milestone: ${nodeObj?.title || id}`);
        loadActivityData();
      }
    }
  };

  const toggleConceptCheck = (conceptKey: string, conceptName: string) => {
    const next = new Set(completedConcepts);
    if (next.has(conceptKey)) {
      next.delete(conceptKey);
    } else {
      next.add(conceptKey);
      const api = getApi();
      if (api && api.logUserActivity) {
        api.logUserActivity('milestone', `Mastered concept: ${conceptName}`);
        loadActivityData();
      }
    }
    setCompletedConcepts(next);
    try {
      localStorage.setItem('nomadic_completed_concepts', JSON.stringify(Array.from(next)));
    } catch {}
  };

  const handleOpenDrawer = (m: RoadmapMilestone, sub?: SubModule) => {
    setActiveDrawerMilestone(m);
    setActiveDrawerSubModule(sub || m.subModules?.[0] || null);
  };

  const handleCloseDrawer = () => {
    setActiveDrawerMilestone(null);
    setActiveDrawerSubModule(null);
  };

  const handleOpenLink = (url: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const api = getApi();
    if (api && api.openExternalUrl) {
      api.openExternalUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleSyncSkills = async () => {
    if (!currentRoadmap) return;
    const gained = new Set<string>();
    (currentRoadmap.milestones || []).forEach((m: any) => {
      if (completedNodes.includes(m.id)) {
        (m.skills || m.skillsGained || []).forEach((s: string) => gained.add(s));
      }
    });

    const current = new Set((profile.techStack || '').split(',').map(s => s.trim()).filter(Boolean));
    const previousSize = current.size;
    gained.forEach(s => current.add(s));
    const newlyAdded = current.size - previousSize;

    const newStack = Array.from(current).join(', ');
    const newTitle = profile.desiredTitle ? profile.desiredTitle : (currentRoadmap.targetRoles || [])[0] || currentRoadmap.title;

    await getApi().saveMasterProfile({ ...profile, techStack: newStack, desiredTitle: newTitle });
    onUpdateProfile({ techStack: newStack, desiredTitle: newTitle });
    
    setSyncToastMessage(`✓ Progress synced: Added ${newlyAdded} skills · Role readiness updated`);
    setTimeout(() => setSyncToastMessage(null), 3500);
    onLog(`[Profile] Synced ${gained.size} verified skills to candidate profile.`);
  };

  // Generate Custom AI Roadmap
  const handleGenerateCustomRoadmap = async () => {
    if (!newRoleTitle.trim()) return;
    setIsGeneratingRoadmap(true);
    setGenerateError(null);

    const api = getApi();
    try {
      const preferredCustomTitle = newCustomTitle.trim() || `${newRoleTitle.trim()} Acceleration Roadmap`;
      const res = await api.generateCustomRoadmap({
        roleTitle: newRoleTitle.trim(),
        customTitle: preferredCustomTitle,
        currentSkills: newSkillsInput.trim() || profile.techStack,
        targetHorizon,
        dailyCommitment,
        geminiKey: profile.geminiApiKey,
        groqKey: profile.groqApiKey,
      });

      if (res && res.success && res.roadmap) {
        try {
          localStorage.removeItem('nomadic_user_deleted_all_roadmaps');
        } catch {}
        await loadCustomRoadmaps();
        setActiveRoadmapId(res.roadmap.id);
        try {
          localStorage.setItem('nomadic_cached_roadmap', JSON.stringify(res.roadmap));
        } catch {}
        setShowGenerateModal(false);
        setNewRoleTitle('');
        setNewCustomTitle('');
        setNewSkillsInput('');
        onLog(`[Curriculum Engine] Generated track: "${preferredCustomTitle}"`);
      } else {
        throw new Error(res?.error || 'Failed to synthesize roadmap.');
      }
    } catch (err: any) {
      setGenerateError(err?.message || 'Error generating roadmap.');
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const handleSaveRenamedTitle = async () => {
    if (!currentRoadmap || !editingTitleText.trim()) {
      setIsEditingTitle(false);
      return;
    }
    const newName = editingTitleText.trim();
    const updated = { ...currentRoadmap, title: newName };
    const api = getApi();
    try {
      if (api && api.saveCustomRoadmap) {
        await api.saveCustomRoadmap({
          id: updated.id,
          roleTitle: (updated.targetRoles || [])[0] || newName,
          domain: updated.domain || 'Custom Track',
          roadmapJson: JSON.stringify(updated),
          targetHorizon,
          dailyCommitment,
        });
      }
      setCustomRoadmaps(prev => prev.map(r => r.id === updated.id ? updated : r));
      try {
        localStorage.setItem('nomadic_cached_roadmap', JSON.stringify(updated));
      } catch {}
      onLog(`[Curriculum Engine] Renamed roadmap to "${newName}" ✓`);
    } catch (err: any) {
      onLog(`[Curriculum Engine] Rename error: ${err?.message}`);
    } finally {
      setIsEditingTitle(false);
    }
  };

  const handleDeleteCurrentTrack = async () => {
    if (!currentRoadmap) return;
    if (!window.confirm(`Delete roadmap track "${currentRoadmap.title}"?`)) return;
    const api = getApi();
    const targetTitle = currentRoadmap.title;
    try {
      if (api && api.deleteCustomRoadmap) {
        await api.deleteCustomRoadmap(currentRoadmap.id);
      }
      const remaining = customRoadmaps.filter(r => r.id !== currentRoadmap.id);
      setCustomRoadmaps(remaining);
      if (remaining.length > 0) {
        setActiveRoadmapId(remaining[0].id);
        try {
          localStorage.setItem('nomadic_cached_roadmap', JSON.stringify(remaining[0]));
        } catch {}
      } else {
        setActiveRoadmapId('');
        try {
          localStorage.removeItem('nomadic_cached_roadmap');
          localStorage.setItem('nomadic_user_deleted_all_roadmaps', 'true');
        } catch {}
      }
      onLog(`[Curriculum Engine] Removed roadmap track "${targetTitle}" ✓`);
    } catch (err: any) {
      onLog(`[Curriculum Engine] Delete error: ${err?.message}`);
    }
  };

  // 52-week authentic activity heatmap
  const heatmapWeeks = useMemo(() => {
    const activityMap = new Map<string, number>();
    heatmapData.forEach(d => {
      activityMap.set(d.date, d.count);
    });

    const weeks: Array<Array<{ date: string; count: number; intensity: number }>> = [];
    const today = new Date();

    for (let w = 51; w >= 0; w--) {
      const week: Array<{ date: string; count: number; intensity: number }> = [];
      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(today);
        dayDate.setDate(dayDate.getDate() - (w * 7 + (6 - d)));
        const iso = dayDate.toISOString().split('T')[0];
        const count = activityMap.get(iso) || 0;
        let intensity = 0;
        if (count >= 4) intensity = 3;
        else if (count >= 2) intensity = 2;
        else if (count >= 1) intensity = 1;

        week.push({
          date: dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count,
          intensity,
        });
      }
      weeks.push(week);
    }
    return weeks;
  }, [heatmapData]);

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return heatmapData
      .filter(d => d.date.startsWith(prefix))
      .reduce((acc, curr) => acc + curr.count, 0);
  }, [heatmapData]);

  return (
    <div className="min-h-full font-sans select-none max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-8 animate-fade-in">

      {/* ── TOAST CONFIRMATION FEEDBACK ───────────────────────────────────── */}
      {syncToastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border border-slate-700 dark:border-zinc-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{syncToastMessage}</span>
        </div>
      )}

      {/* ── SECTION 1: HEADER & IDENTITY ───────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-zinc-800/80 pb-5">
        <div className="space-y-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingTitleText}
                onChange={(e) => setEditingTitleText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRenamedTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                autoFocus
                placeholder="Custom Roadmap Name"
                className="bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-600 rounded-lg px-3 py-1 text-lg font-bold text-slate-900 dark:text-zinc-100 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveRenamedTitle}
                className="px-3 py-1 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-semibold hover:opacity-90"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditingTitle(false)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-500 text-xs hover:text-slate-800"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-zinc-50">
                {currentRoadmap?.title || (isGeneratingRoadmap ? 'Synthesizing Curriculum...' : 'Career Progression Track')}
              </h1>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 font-medium">
            <span>{currentRoadmap?.domain || 'Career Development'}</span>
            <span>·</span>
            <button
              type="button"
              onClick={() => setShowReadinessBreakdown(!showReadinessBreakdown)}
              className="text-slate-900 dark:text-zinc-200 font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>{score}% role ready</span>
              <Info className="w-3 h-3 text-slate-400" />
            </button>
            {profile.desiredTitle && (
              <>
                <span>·</span>
                <span className="font-mono text-[11px] text-slate-600 dark:text-zinc-400">Target: {profile.desiredTitle}</span>
              </>
            )}
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {/* Track Switcher */}
          {customRoadmaps.length > 1 && (
            <select
              value={activeRoadmapId}
              onChange={(e) => setActiveRoadmapId(e.target.value)}
              className="bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 font-semibold focus:outline-none cursor-pointer"
            >
              {customRoadmaps.map(r => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          )}

          {/* New Track Button */}
          <button
            onClick={() => {
              const isFreeUser = !currentUser?.tier || currentUser?.tier === 'free';
              if (isFreeUser && customRoadmaps.length >= 1) {
                onOpenUpgrade?.('Unlimited Custom Roadmaps (Learner Pro)');
              } else {
                setShowGenerateModal(true);
              }
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>New roadmap</span>
          </button>

          {/* Quiet Utility Menu */}
          {currentRoadmap && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition shadow-2xs"
                title="Roadmap Settings & Actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMenuDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl py-1.5 z-40 animate-fade-in text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenuDropdown(false);
                      setEditingTitleText(currentRoadmap.title || '');
                      setIsEditingTitle(true);
                    }}
                    className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    <span>Rename roadmap</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenuDropdown(false);
                      handleSyncSkills();
                    }}
                    className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Award className="w-3.5 h-3.5 text-slate-400" />
                    <span>Sync progress</span>
                  </button>

                  <div className="h-px bg-slate-100 dark:bg-zinc-800 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenuDropdown(false);
                      handleDeleteCurrentTrack();
                    }}
                    className="w-full text-left px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete roadmap</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── READINESS BREAKDOWN POPOVER ───────────────────────────────────── */}
      {showReadinessBreakdown && currentRoadmap && (
        <div className="p-5 bg-slate-50/90 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-3 animate-fade-in shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 font-mono">
              Role Readiness Breakdown
            </span>
            <button onClick={() => setShowReadinessBreakdown(false)} className="text-slate-400 hover:text-slate-700 text-xs font-bold">
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-400">
            Calculated from verified completion across {totalCount} roadmap milestones and practical execution topics.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {(currentRoadmap.milestones || []).map((m, idx) => {
              const isDone = completedNodes.includes(m.id);
              return (
                <div key={m.id} className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Phase {idx + 1}</span>
                    <span className={isDone ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 font-medium'}>
                      {isDone ? '✓ Mastered' : 'Incomplete'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">{m.title}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LOADING CURRICULUM STATE ──────────────────────────────────────── */}
      {isGeneratingRoadmap && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-slate-950 dark:text-white mx-auto" />
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">Synthesizing personalized curriculum...</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Structuring milestones, sub-modules, and verified learning resources based on your target role and timeline.</p>
          </div>
        </div>
      )}

      {/* ── SECTION 2: ROADMAP HERO & NEXT ACTION ─────────────────────────── */}
      {currentRoadmap && !isGeneratingRoadmap && nextAction && (
        <section className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          
          {/* Readiness Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-600 dark:text-zinc-400 font-sans">
                {score}% role ready <span className="text-slate-400 font-normal">· {completedCount} of {totalCount} phases completed</span>
              </span>
              <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                {targetHorizon} Horizon · {dailyCommitment}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-950 dark:bg-zinc-100 transition-all duration-500 rounded-full"
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          {/* Dominant Next Action Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/40 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {nextAction.type === 'completed' ? 'ROADMAP COMPLETE' : 'NEXT ACTION'}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 font-mono">
                  {nextAction.phaseTitle}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>{nextAction.estimatedTime}</span>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-zinc-50">
                {nextAction.taskTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
                {nextAction.description}
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-zinc-400 font-mono">
                <span>{completedCount} / {totalCount} milestones</span>
                <span>·</span>
                <span>{totalCompletedHours}h completed</span>
                <span>·</span>
                <span>{activityStats.streakCount} day streak</span>
              </div>

              {nextAction.type === 'completed' ? (
                <button
                  type="button"
                  onClick={handleSyncSkills}
                  className="px-6 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-bold transition shadow-sm active:scale-95 flex items-center gap-2"
                >
                  <span>Sync Progress to Profile</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenDrawer(nextAction.milestone, nextAction.subModule || undefined)}
                  className="px-6 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-bold transition shadow-sm active:scale-95 flex items-center gap-2"
                >
                  <span>Continue →</span>
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 3: ROADMAP JOURNEY (VERTICAL TIMELINE PROGRESSION) ─────── */}
      {currentRoadmap && !isGeneratingRoadmap && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-zinc-800/80 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 font-mono">
              Roadmap Journey ({completedCount}/{totalCount} Phases)
            </h2>

            <button
              type="button"
              onClick={handleSyncSkills}
              className="text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-white transition inline-flex items-center gap-1.5"
            >
              <span>Sync progress</span>
              <Award className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200 dark:before:bg-zinc-800">
            {(currentRoadmap.milestones || []).map((milestone, idx) => {
              const isCompleted = completedNodes.includes(milestone.id);
              const isCurrent = !isCompleted && (idx === 0 || completedNodes.includes(currentRoadmap.milestones[idx - 1].id));
              const isUpcoming = !isCompleted && !isCurrent;
              const isExpanded = expandedPhases.has(milestone.id);
              const subModulesList: SubModule[] = milestone.subModules || [];

              return (
                <div key={milestone.id} className="relative group">
                  {/* Timeline Indicator Dot */}
                  <div className={`absolute -left-6 sm:-left-8 top-5 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                      : isCurrent
                      ? 'bg-slate-950 dark:bg-white border-slate-950 dark:border-white text-white dark:text-slate-950 shadow-sm'
                      : 'bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-400'
                  }`}>
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <span className="text-[11px] font-bold font-mono">{idx + 1}</span>
                    )}
                  </div>

                  {/* Phase Content Box */}
                  <div className={`rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-white dark:bg-zinc-900 border-slate-900/30 dark:border-zinc-700 shadow-sm'
                      : isCompleted
                      ? 'bg-slate-50/50 dark:bg-zinc-900/40 border-slate-200/80 dark:border-zinc-800/80'
                      : 'bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800/80'
                  }`}>
                    
                    {/* Phase Header Row */}
                    <div
                      onClick={() => togglePhaseExpansion(milestone.id)}
                      className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : isCurrent
                              ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                              : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}>
                            {isCompleted ? '✓ Complete' : isCurrent ? 'CURRENT' : 'UPCOMING'}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">Phase {idx + 1}</span>
                          <span className="text-xs text-slate-400 font-mono">· {milestone.estimatedHours || 20}h</span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                          {milestone.title}
                        </h3>

                        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed line-clamp-1">
                          {milestone.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                        <button
                          type="button"
                          onClick={(e) => toggleComplete(milestone.id, e)}
                          className={`p-1.5 rounded-lg border text-xs transition ${
                            isCompleted
                              ? 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40'
                              : 'border-slate-200 dark:border-zinc-700 text-slate-400 hover:text-slate-800 dark:hover:text-white'
                          }`}
                          title={isCompleted ? 'Mark Incomplete' : 'Mark Phase Completed'}
                        >
                          <Check className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDrawer(milestone);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-1"
                        >
                          <span>{isCompleted ? 'Review' : 'Explore'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        <div className="p-1 text-slate-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Sub-Modules & Topics List */}
                    {isExpanded && subModulesList.length > 0 && (
                      <div className="border-t border-slate-100 dark:border-zinc-800/80 p-5 sm:p-6 bg-slate-50/40 dark:bg-zinc-900/40 space-y-3">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          Modules ({subModulesList.length})
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {subModulesList.map((sub) => {
                            const concepts = sub.keyConcepts || [];
                            const completedInSub = concepts.filter((_, cIdx) => completedConcepts.has(`${sub.id}-c${cIdx}`)).length;
                            const isSubDone = concepts.length > 0 && completedInSub === concepts.length;

                            return (
                              <div
                                key={sub.id}
                                onClick={() => handleOpenDrawer(milestone, sub)}
                                className="p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700 transition cursor-pointer flex flex-col justify-between space-y-2 shadow-2xs group/mod"
                              >
                                <div>
                                  <div className="flex items-center justify-between text-[11px] font-mono pb-1">
                                    <span className="text-slate-400 truncate">{sub.resources?.[0]?.duration || '30 mins'}</span>
                                    {isSubDone && <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Complete</span>}
                                  </div>
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover/mod:text-powder-600 dark:group-hover/mod:text-powder-400 transition-colors">
                                    {sub.title}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">
                                    {sub.description}
                                  </p>
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                                  <span>{completedInSub}/{concepts.length} concepts mastered</span>
                                  <span className="text-slate-700 dark:text-zinc-300 font-sans font-semibold group-hover/mod:translate-x-0.5 transition-transform flex items-center gap-0.5">
                                    Open module →
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── SECTION 4: HISTORICAL CONTEXT & 52-WEEK ACTIVITY HEATMAP ───────── */}
      {currentRoadmap && !isGeneratingRoadmap && (
        <section className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 font-mono">
                Activity History
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                {thisMonthCount} verified actions recorded this month · {activityStats.streakCount} day streak
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">52-Week Radar</span>
          </div>

          <div className="overflow-x-auto pt-1">
            <div className="flex gap-1 min-w-[340px]">
              {heatmapWeeks.slice(34).map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map((day, dIdx) => {
                    let bgClass = 'bg-slate-100 dark:bg-zinc-800/80';
                    if (day.intensity === 1) bgClass = 'bg-zinc-400 dark:bg-zinc-600';
                    else if (day.intensity === 2) bgClass = 'bg-zinc-700 dark:bg-zinc-300';
                    else if (day.intensity >= 3) bgClass = 'bg-black dark:bg-white';

                    return (
                      <div
                        key={dIdx}
                        title={`${day.date}: ${day.count} actions recorded`}
                        className={`w-2.5 h-2.5 rounded-[2px] ${bgClass} transition-colors hover:scale-125`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── EMPTY STATE (NO ROADMAPS) ──────────────────────────────────────── */}
      {!currentRoadmap && !isGeneratingRoadmap && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-4 shadow-sm max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-slate-600 dark:text-zinc-400">
            <Compass className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">No active roadmap</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              Create a personalized learning curriculum to follow structured milestones toward your target career role.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGenerateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-bold hover:opacity-90 inline-flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create roadmap</span>
          </button>
        </div>
      )}

      {/* ── RIGHT-SIDE SLIDE-OVER DRAWER (MODULE & MILESTONE DETAIL) ──────── */}
      {activeDrawerMilestone && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex justify-end animate-fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 h-full overflow-y-auto shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  {activeDrawerMilestone.title}
                </span>
                <button
                  onClick={handleCloseDrawer}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50">
                  {activeDrawerSubModule?.title || activeDrawerMilestone.title}
                </h2>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{activeDrawerSubModule?.resources?.[0]?.duration || `${activeDrawerMilestone.estimatedHours}h`}</span>
                  <span>·</span>
                  <span>{activeDrawerMilestone.level || 'Intermediate'}</span>
                </div>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* What you'll learn */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 font-mono">
                  Why this matters
                </span>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                  {activeDrawerSubModule?.description || activeDrawerMilestone.description}
                </p>
              </div>

              {/* Key Concepts Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 font-mono">
                    Concepts to Master
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Click to check off
                  </span>
                </div>

                <div className="space-y-2">
                  {(activeDrawerSubModule?.keyConcepts || activeDrawerMilestone.topics || []).map((concept: string, cIdx: number) => {
                    const conceptKey = `${activeDrawerSubModule?.id || activeDrawerMilestone.id}-c${cIdx}`;
                    const isChecked = completedConcepts.has(conceptKey);

                    return (
                      <div
                        key={cIdx}
                        onClick={() => toggleConceptCheck(conceptKey, concept)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 text-xs ${
                          isChecked
                            ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 font-semibold'
                            : 'border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:border-slate-300'
                        }`}
                      >
                        <button type="button" className="mt-0.5 shrink-0">
                          {isChecked ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 dark:text-zinc-600" />
                          )}
                        </button>
                        <span className={isChecked ? 'line-through opacity-85' : ''}>
                          {concept}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Curated Resources */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 font-mono flex items-center gap-1.5">
                    <Youtube className="w-3.5 h-3.5 text-red-500" />
                    <span>Curated Resources</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    Working Links
                  </span>
                </div>

                <div className="space-y-2">
                  {(activeDrawerSubModule?.resources || activeDrawerMilestone.learn || []).map((res: LearnResource, rIdx: number) => {
                    let targetUrl = res.url;
                    if (!targetUrl || targetUrl.includes('placeholder') || targetUrl.includes('example.com')) {
                      targetUrl = res.type === 'video'
                        ? `https://www.youtube.com/results?search_query=${encodeURIComponent(res.title || activeDrawerMilestone.title)}`
                        : `https://google.com/search?q=${encodeURIComponent(res.title || activeDrawerMilestone.title)}`;
                    }

                    return (
                      <div
                        key={rIdx}
                        onClick={(e) => handleOpenLink(targetUrl, e)}
                        className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-600 bg-slate-50/60 dark:bg-zinc-800/40 transition cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100 group-hover:underline truncate">
                            {res.title}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                            {res.type === 'video' ? <Youtube className="w-3 h-3 text-red-500" /> : <FileText className="w-3 h-3 text-blue-500" />}
                            <span>{res.type ? res.type.toUpperCase() : 'VIDEO / GUIDE'}</span>
                            {res.duration && <span>· {res.duration}</span>}
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-slate-900 dark:group-hover:text-white" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-6 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => {
                  toggleComplete(activeDrawerMilestone.id);
                  handleCloseDrawer();
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs ${
                  completedNodes.includes(activeDrawerMilestone.id)
                    ? 'bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200'
                    : 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 hover:opacity-90'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{completedNodes.includes(activeDrawerMilestone.id) ? 'Completed ✓' : 'Mark Phase Completed'}</span>
              </button>

              <button
                type="button"
                onClick={handleCloseDrawer}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL: GENERATE CUSTOM ROADMAP ───────────────────────────────── */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-slate-950 dark:text-white" />
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">Create New Roadmap Track</h3>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Enter any profession (Product, Engineering, Design, Marketing, Finance). The curriculum engine will synthesize a structured milestone progression with concepts checklist and verified video/doc resources.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Target Role / Specialty</label>
                <input
                  type="text"
                  value={newRoleTitle}
                  onChange={(e) => setNewRoleTitle(e.target.value)}
                  placeholder="e.g. Senior Product Manager, Full Stack Engineer, Growth Lead"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Custom Roadmap Name (Optional)</label>
                <input
                  type="text"
                  value={newCustomTitle}
                  onChange={(e) => setNewCustomTitle(e.target.value)}
                  placeholder="e.g. Full Stack Spring Boot 2026, Fast-Track AI Engineering"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Current Competencies (Optional)</label>
                <input
                  type="text"
                  value={newSkillsInput}
                  onChange={(e) => setNewSkillsInput(e.target.value)}
                  placeholder="e.g. Figma, SQL, User Research, Excel, Python"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Target Horizon & Daily Commitment Calibration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Target Timeline</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TIMELINE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTargetHorizon(opt.id)}
                        className={`text-center p-2 rounded-xl border text-xs transition ${
                          targetHorizon === opt.id
                            ? 'border-slate-950 dark:border-white bg-slate-100 dark:bg-zinc-800 font-bold text-slate-950 dark:text-white'
                            : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                        }`}
                      >
                        <div className="text-[11px] font-semibold">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Daily Commitment</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {COMMITMENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDailyCommitment(opt.id)}
                        className={`text-center p-2 rounded-xl border text-xs transition ${
                          dailyCommitment === opt.id
                            ? 'border-slate-950 dark:border-white bg-slate-100 dark:bg-zinc-800 font-bold text-slate-950 dark:text-white'
                            : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                        }`}
                      >
                        <div className="text-[11px] font-semibold">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {generateError && (
              <p className="text-xs text-rose-600 font-semibold">{generateError}</p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleGenerateCustomRoadmap}
                disabled={!newRoleTitle.trim() || isGeneratingRoadmap}
                className="px-5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
              >
                {isGeneratingRoadmap ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Track</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
