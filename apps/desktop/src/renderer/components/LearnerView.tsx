import React, { useState, useEffect, useMemo } from 'react';
import {
  RoadmapMilestone, LearnResource, SubModule, Roadmap
} from '../data/roadmaps';
import { MasterProfile, getApi, CustomRoadmapRecord, ActivityHeatmapDay, ActivityStats } from '../types';
import {
  Check, CheckSquare, Square, ExternalLink,
  ChevronRight, BookOpen,
  Laptop, X, ArrowRight, SlidersHorizontal,
  Clock, ShieldCheck, Layers, CheckCircle2,
  Plus, Loader2, Sparkles, RefreshCw, Award,
  Youtube, FileText, Compass, ChevronDown, Trash2, Calendar
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
  const [selectedMilestone, setSelectedMilestone] = useState<RoadmapMilestone | null>(null);

  // Custom AI Roadmaps modal state
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [newRoleTitle, setNewRoleTitle] = useState<string>('');
  const [newSkillsInput, setNewSkillsInput] = useState<string>('');
  const [targetHorizon, setTargetHorizon] = useState<string>('3 Months');
  const [dailyCommitment, setDailyCommitment] = useState<string>('2 Hours/Day');
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Database-backed Activity Heatmap & Stats
  const [heatmapData, setHeatmapData] = useState<ActivityHeatmapDay[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats>({ streakCount: 1, totalActions: 0 });

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

  const handleOpenMilestone = (m: RoadmapMilestone) => {
    setSelectedMilestone(m);
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
    gained.forEach(s => current.add(s));

    const newStack = Array.from(current).join(', ');
    const newTitle = profile.desiredTitle ? profile.desiredTitle : (currentRoadmap.targetRoles || [])[0] || currentRoadmap.title;

    await getApi().saveMasterProfile({ ...profile, techStack: newStack, desiredTitle: newTitle });
    onUpdateProfile({ techStack: newStack, desiredTitle: newTitle });
    onLog(`[Profile] Synced ${gained.size} verified skills to candidate profile.`);
    onNavigateToSeeker();
  };

  // Generate Custom AI Roadmap
  const handleGenerateCustomRoadmap = async () => {
    if (!newRoleTitle.trim()) return;
    setIsGeneratingRoadmap(true);
    setGenerateError(null);

    const api = getApi();
    try {
      const res = await api.generateCustomRoadmap({
        roleTitle: newRoleTitle.trim(),
        currentSkills: newSkillsInput.trim() || profile.techStack,
        targetHorizon,
        dailyCommitment,
        geminiKey: profile.geminiApiKey,
        groqKey: profile.groqApiKey,
      });

      if (res && res.success && res.roadmap) {
        await loadCustomRoadmaps();
        setActiveRoadmapId(res.roadmap.id);
        try {
          localStorage.setItem('nomadic_cached_roadmap', JSON.stringify(res.roadmap));
        } catch {}
        setShowGenerateModal(false);
        setNewRoleTitle('');
        setNewSkillsInput('');
        onLog(`[Curriculum Engine] Generated dynamic curriculum for "${newRoleTitle.trim()}"`);
      } else {
        throw new Error(res?.error || 'Failed to synthesize roadmap.');
      }
    } catch (err: any) {
      setGenerateError(err?.message || 'Error generating roadmap.');
    } finally {
      setIsGeneratingRoadmap(false);
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
    <div className="space-y-6 font-sans select-none max-w-5xl mx-auto pb-20">
      
      {/* ── SECTION 1: HEADER & AUTHENTIC ACTIVITY HEATMAP ────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                {currentRoadmap?.title || (isGeneratingRoadmap ? 'Synthesizing Curriculum...' : 'Career Progression Track')}
              </h1>
              {profile.desiredTitle && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-powder-50/80 text-powder-800 dark:bg-powder-950/40 dark:text-powder-300 border border-powder-200/80 dark:border-powder-800/60 font-semibold">
                  Target: {profile.desiredTitle}
                </span>
              )}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-50 text-slate-600 dark:bg-zinc-800/60 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                {targetHorizon} Horizon · {dailyCommitment}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              {currentRoadmap?.domain || 'Personalized Track'} · {completedCount} of {totalCount} completed ({score}%)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Dynamic AI Roadmap Switcher */}
            {customRoadmaps.length > 1 && (
              <select
                value={activeRoadmapId}
                onChange={(e) => setActiveRoadmapId(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-100 font-medium focus:outline-none"
              >
                {customRoadmaps.map(r => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            )}

            <button
              onClick={() => {
                const isFreeUser = !currentUser?.tier || currentUser?.tier === 'free';
                if (isFreeUser && customRoadmaps.length >= 1) {
                  onOpenUpgrade?.('Unlimited Custom Roadmaps (Learner Pro)');
                } else {
                  setShowGenerateModal(true);
                }
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Track</span>
            </button>

            <button
              onClick={handleSyncSkills}
              disabled={completedCount === 0 || !currentRoadmap}
              className="px-3.5 py-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-semibold hover:opacity-90 transition flex items-center gap-1.5 disabled:opacity-40"
            >
              <span>Sync Skills</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Heatmap & Progress Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          
          {/* Progress Bar & Stats */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">Readiness Score</span>
                <span className="font-bold text-slate-900 dark:text-zinc-100">{score}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black dark:bg-white transition-all duration-500 rounded-full"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-mono pt-1">
              <span>Active Streak: {activityStats.streakCount} days</span>
              <span>Total Actions: {activityStats.totalActions}</span>
            </div>
          </div>

          {/* 52-Week Authentic Activity Heatmap */}
          <div className="lg:col-span-2 space-y-1.5 overflow-x-auto">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Activity Heatmap</span>
              <span>{thisMonthCount} verified actions this month</span>
            </div>

            <div className="flex gap-1 min-w-[320px] pt-1">
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
        </div>

        {/* ── 3-STEP INTUITIVE OS WORKFLOW EXPLAINER ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 space-y-1">
            <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center text-[10px] font-mono">1</span>
              <span>Learn &amp; Check Off</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              Check off core concepts on the left and open live YouTube search links on the right to master each milestone.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 space-y-1">
            <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center text-[10px] font-mono">2</span>
              <span>Sync Skills &amp; Vault</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              Click <strong>Sync Skills</strong> to transfer learned competencies into your profile, and solve 428+ company question sets.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 space-y-1">
            <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center text-[10px] font-mono">3</span>
              <span>Seeker Autopilot</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              Switch to <strong>Seeker Track</strong> in top bar to auto-apply to 1,000+ ATS jobs &amp; email hiring managers with 0% bounce.
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: MILESTONES & TOPICS LIST ──────────────────────────────── */}
      {isGeneratingRoadmap && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-10 text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-black dark:text-white mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Synthesizing personalized curriculum...</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Structuring your milestones, sub-modules, and verified learning resources based on your target timeline.</p>
        </div>
      )}

      {currentRoadmap && !isGeneratingRoadmap && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 uppercase font-mono tracking-wider">
              Curriculum Milestones ({completedCount}/{totalCount})
            </h2>
          </div>

          <div className="space-y-3">
            {(currentRoadmap.milestones || []).map((milestone: any, index: number) => {
              const isCompleted = completedNodes.includes(milestone.id);
              const subModulesList: SubModule[] = milestone.subModules || [];

              return (
                <div
                  key={milestone.id || index}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isCompleted
                      ? 'bg-slate-50/50 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800'
                      : 'bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-xs'
                  }`}
                >
                  {/* Milestone Top Bar */}
                  <div
                    onClick={() => handleOpenMilestone(milestone)}
                    className="p-5 flex items-start justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => toggleComplete(milestone.id, e)}
                        className="mt-0.5 text-slate-400 hover:text-black dark:hover:text-white transition"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-black dark:text-white" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300 dark:text-zinc-700" />
                        )}
                      </button>

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-semibold text-slate-400 dark:text-zinc-500">
                            Phase {index + 1}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                            {milestone.title}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                            {milestone.level || 'Core'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                          {milestone.description}
                        </p>

                        {/* Sub-modules & topics quick summary */}
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          {Array.isArray(subModulesList) && subModulesList.length > 0 && (
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                              {subModulesList.length} Sub-Modules
                            </span>
                          )}
                          {ensureArray(milestone.skills || milestone.skillsGained).map((skill: string, sIdx: number) => (
                            <span
                              key={sIdx}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-center">
                      <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono hidden sm:inline">
                        {milestone.estimatedHours || 20}h
                      </span>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-1"
                      >
                        <span>Explore</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODAL: GENERATE CUSTOM ROADMAP ───────────────────────────────── */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-slate-900 dark:text-white" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create New Track</h3>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Enter any profession (Product, Design, Marketing, Finance, Engineering, Operations). The curriculum engine will synthesize a structured progression with concepts checklist and verified video/doc search resources.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Target Profession / Role</label>
                <input
                  type="text"
                  value={newRoleTitle}
                  onChange={(e) => setNewRoleTitle(e.target.value)}
                  placeholder="e.g. Senior Product Manager, UI/UX Designer, Growth Marketing Lead, Financial Analyst"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Current Competencies (Optional)</label>
                <input
                  type="text"
                  value={newSkillsInput}
                  onChange={(e) => setNewSkillsInput(e.target.value)}
                  placeholder="e.g. Figma, SQL, User Research, Excel, SEO, Python"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Timeline Horizon & Daily Commitment Calibration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Target Horizon */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Target Timeline</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TIMELINE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTargetHorizon(opt.id)}
                        className={`text-center p-2 rounded-lg border text-xs transition ${
                          targetHorizon === opt.id
                            ? 'border-black dark:border-white bg-slate-100 dark:bg-zinc-800 font-bold text-slate-950 dark:text-white shadow-2xs'
                            : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 text-slate-600 dark:text-zinc-400'
                        }`}
                      >
                        <div className="text-[11px] font-semibold">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Daily Commitment */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Daily Time</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {COMMITMENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDailyCommitment(opt.id)}
                        className={`text-center p-2 rounded-lg border text-xs transition ${
                          dailyCommitment === opt.id
                            ? 'border-black dark:border-white bg-slate-100 dark:bg-zinc-800 font-bold text-slate-950 dark:text-white shadow-2xs'
                            : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 text-slate-600 dark:text-zinc-400'
                        }`}
                      >
                        <div className="text-[11px] font-semibold">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {generateError && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
                  {generateError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isGeneratingRoadmap || !newRoleTitle.trim()}
                onClick={handleGenerateCustomRoadmap}
                className="px-4 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 transition flex items-center gap-1.5 disabled:opacity-40"
              >
                {isGeneratingRoadmap ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Curriculum...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Track</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PHASE SUB-MODULES & 2-COLUMN CHECKLIST + RESOURCES ────────── */}
      {selectedMilestone && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[88vh] overflow-y-auto p-6 sm:p-7 space-y-6 shadow-2xl animate-in fade-in duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                    {selectedMilestone.level || 'Core'} Phase
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Estimated Duration: {selectedMilestone.estimatedHours || 20} hours
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {selectedMilestone.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {selectedMilestone.description}
                </p>
              </div>
              <button onClick={() => setSelectedMilestone(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Modules Breakdown: 2-Column (Checklist on Left, Resources on Right) */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase font-mono tracking-wider">
                Phase Sub-Modules ({selectedMilestone.subModules?.length || 1})
              </h4>

              {selectedMilestone.subModules && selectedMilestone.subModules.length > 0 ? (
                <div className="space-y-4">
                  {selectedMilestone.subModules.map((sub: SubModule, sIdx: number) => {
                    const subId = sub.id || `sub-${sIdx}`;
                    const concepts = ensureArray(sub.keyConcepts || sub.topics || selectedMilestone.topics || ['Foundational theory', 'Workflow standards', 'Execution methodology']);
                    const rawResources = Array.isArray(sub.resources) ? sub.resources : [];
                    
                    // Construct live working search URLs for video & doc resources
                    const roleTitle = profile.desiredTitle || 'Professional';
                    const videoQuery = `${roleTitle} ${sub.title} tutorial masterclass`;
                    const docQuery = `${roleTitle} ${sub.title} documentation guide`;

                    const defaultResources: LearnResource[] = [
                      {
                        title: `${sub.title} Masterclass (Video Search)`,
                        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(videoQuery)}`,
                        type: 'video',
                        duration: '35 mins'
                      },
                      {
                        title: `${sub.title} Documentation & Standards`,
                        url: `https://google.com/search?q=${encodeURIComponent(docQuery)}`,
                        type: 'doc'
                      }
                    ];

                    const displayResources = rawResources.length > 0 ? rawResources : defaultResources;

                    return (
                      <div
                        key={subId}
                        className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40 space-y-4"
                      >
                        {/* Sub-Module Title Header */}
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-mono flex items-center justify-center font-bold">
                            {sIdx + 1}
                          </span>
                          <div>
                            <h5 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                              {sub.title}
                            </h5>
                            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                              {sub.description}
                            </p>
                          </div>
                        </div>

                        {/* 2-COLUMN GRID: Concepts Checklist on Left, Resources on Right */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          
                          {/* LEFT COLUMN: Concepts to Learn (Checklist) */}
                          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 space-y-2.5">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-zinc-800">
                              <span className="text-[11px] font-mono uppercase font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                                <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                                <span>Concepts to Learn ({concepts.length})</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Click to check
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {concepts.map((concept: string, cIdx: number) => {
                                const conceptKey = `${selectedMilestone.id}-${subId}-${cIdx}`;
                                const isChecked = completedConcepts.has(conceptKey);

                                return (
                                  <div
                                    key={cIdx}
                                    onClick={() => toggleConceptCheck(conceptKey, concept)}
                                    className={`p-2 rounded-lg border transition cursor-pointer flex items-start gap-2.5 text-xs ${
                                      isChecked
                                        ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 font-medium'
                                        : 'border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 text-slate-700 dark:text-zinc-300 hover:border-slate-200 dark:hover:border-zinc-700'
                                    }`}
                                  >
                                    <button type="button" className="mt-0.5 shrink-0">
                                      {isChecked ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                      ) : (
                                        <Square className="w-4 h-4 text-slate-300 dark:text-zinc-600" />
                                      )}
                                    </button>
                                    <span className={isChecked ? 'line-through opacity-80' : ''}>
                                      {concept}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* RIGHT COLUMN: Curated Learning Resources */}
                          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 space-y-2.5">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-zinc-800">
                              <span className="text-[11px] font-mono uppercase font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                                <Youtube className="w-3.5 h-3.5 text-red-500" />
                                <span>Curated Learning Resources</span>
                              </span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                Working Search Links
                              </span>
                            </div>

                            <div className="space-y-2">
                              {displayResources.map((res: LearnResource, rIdx: number) => {
                                // Generate a direct query link if url is missing or placeholder
                                let targetUrl = res.url;
                                if (!targetUrl || targetUrl.includes('placeholder') || targetUrl.includes('example.com')) {
                                  targetUrl = res.type === 'video'
                                    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(res.title || sub.title)}`
                                    : `https://google.com/search?q=${encodeURIComponent(res.title || sub.title)}`;
                                }

                                return (
                                  <div
                                    key={rIdx}
                                    onClick={(e) => handleOpenLink(targetUrl, e)}
                                    className="p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-600 bg-slate-50/50 dark:bg-zinc-800/40 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer flex items-start justify-between gap-2 group"
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
                                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5 group-hover:text-black dark:group-hover:text-white" />
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Fallback Key Topics */
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40 space-y-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">Key Concepts Covered:</span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 dark:text-zinc-400">
                      {ensureArray(selectedMilestone.topics || selectedMilestone.skills).map((t: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-600" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => toggleComplete(selectedMilestone.id)}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-xs ${
                  completedNodes.includes(selectedMilestone.id)
                    ? 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200'
                    : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-90'
                }`}
              >
                {completedNodes.includes(selectedMilestone.id) ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Phase Completed ✓</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Mark Phase Completed</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedMilestone(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
