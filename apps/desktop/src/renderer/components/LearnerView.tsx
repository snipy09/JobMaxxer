import React, { useState, useEffect, useMemo } from 'react';
import {
  ROADMAPS, calculateReadinessScore, RoadmapMilestone,
  LearnResource, SubModule
} from '../data/roadmaps';
import { MasterProfile, getApi, CustomRoadmapRecord, ActivityHeatmapDay, ActivityStats } from '../types';
import {
  Check, CheckSquare, Square, ExternalLink,
  ChevronRight, Play, BookOpen,
  Laptop, X, ArrowRight, SlidersHorizontal,
  Clock, ShieldCheck, Layers, CheckCircle2,
  Plus, Loader2, Sparkles, RefreshCw, Award,
  Youtube, FileText, Compass, ChevronDown
} from 'lucide-react';

interface LearnerViewProps {
  profile: MasterProfile;
  onUpdateProfile: (updated: Partial<MasterProfile>) => void;
  onNavigateToSeeker: () => void;
  onLog: (msg: string) => void;
}

export const LearnerView: React.FC<LearnerViewProps> = ({
  profile,
  onUpdateProfile,
  onNavigateToSeeker,
  onLog
}) => {
  const [customRoadmaps, setCustomRoadmaps] = useState<any[]>([]);
  const [activeRoadmapId, setActiveRoadmapId] = useState<string>('product-management');
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<RoadmapMilestone | null>(null);

  // Custom AI Roadmaps modal state
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [newRoleTitle, setNewRoleTitle] = useState<string>('');
  const [newSkillsInput, setNewSkillsInput] = useState<string>('');
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Database-backed Activity Heatmap & Stats
  const [heatmapData, setHeatmapData] = useState<ActivityHeatmapDay[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats>({ streakCount: 1, totalActions: 0 });

  // Goal Calibration
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [targetHorizon, setTargetHorizon] = useState<string>('2 Months');
  const [dailyCommitment, setDailyCommitment] = useState<string>('2 Hours/Day');

  // Load custom roadmaps from SQLite
  const loadCustomRoadmaps = async () => {
    const api = getApi();
    if (!api || !api.getCustomRoadmaps) return;
    try {
      const records = await api.getCustomRoadmaps();
      if (records && Array.isArray(records) && records.length > 0) {
        const parsed = records.map((r: CustomRoadmapRecord) => {
          try {
            return JSON.parse(r.roadmapJson);
          } catch {
            return null;
          }
        }).filter(Boolean);
        setCustomRoadmaps(parsed);

        // If candidate has a custom roadmap, set it as active immediately
        if (parsed.length > 0) {
          setActiveRoadmapId(parsed[0].id);
        }
      }
    } catch {}
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
  }, []);

  // Combined standard + custom roadmap list
  const allRoadmaps = useMemo(() => {
    return [...customRoadmaps, ...ROADMAPS];
  }, [customRoadmaps]);

  useEffect(() => {
    if (profile.desiredTitle && customRoadmaps.length === 0) {
      const lower = profile.desiredTitle.toLowerCase();
      if (lower.includes('product') || lower.includes('manager') || lower.includes('tpm') || lower.includes('apm') || lower.includes('scrum')) {
        setActiveRoadmapId('product-management');
      } else if (lower.includes('design') || lower.includes('ui') || lower.includes('ux') || lower.includes('figma')) {
        setActiveRoadmapId('ui-ux-design');
      } else {
        setActiveRoadmapId('frontend');
      }
    }
  }, [profile.desiredTitle, customRoadmaps]);

  // Load saved progress from SQLite on mount / roadmap change
  useEffect(() => {
    const loadProgress = async () => {
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

  const roadmap = useMemo(() => {
    return allRoadmaps.find(r => r.id === activeRoadmapId) || allRoadmaps[0] || ROADMAPS[0];
  }, [allRoadmaps, activeRoadmapId]);

  const totalCount = roadmap?.milestones?.length || 0;
  const completedCount = completedNodes.filter(id => (roadmap?.milestones || []).some((m: any) => m.id === id)).length;
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
        const nodeObj = (roadmap.milestones || []).find((m: any) => m.id === id);
        await api.logUserActivity('milestone', `Completed milestone: ${nodeObj?.title || id}`);
        loadActivityData();
      }
    }
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
    const gained = new Set<string>();
    (roadmap.milestones || []).forEach((m: any) => {
      if (completedNodes.includes(m.id)) {
        (m.skills || m.skillsGained || []).forEach((s: string) => gained.add(s));
      }
    });

    const current = new Set((profile.techStack || '').split(',').map(s => s.trim()).filter(Boolean));
    gained.forEach(s => current.add(s));

    const newStack = Array.from(current).join(', ');
    const newTitle = profile.desiredTitle ? profile.desiredTitle : (roadmap.targetRoles || [])[0] || roadmap.title;

    await getApi().saveMasterProfile({ ...profile, techStack: newStack, desiredTitle: newTitle });
    onUpdateProfile({ techStack: newStack, desiredTitle: newTitle });
    onLog(`[Profile] Synced ${gained.size} verified skills to candidate profile.`);
    onNavigateToSeeker();
  };

  // Generate Custom AI Roadmap via Gemini
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
        setShowGenerateModal(false);
        setNewRoleTitle('');
        setNewSkillsInput('');
        onLog(`[AI Roadmap] Generated custom roadmap for "${newRoleTitle.trim()}"`);
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
                {roadmap?.title || 'Career Progression Track'}
              </h1>
              {profile.desiredTitle && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700">
                  Target: {profile.desiredTitle}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              {roadmap?.domain || 'Universal Career Track'} · {completedCount} of {totalCount} completed ({score}%)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Roadmap Switcher Dropdown */}
            <select
              value={activeRoadmapId}
              onChange={(e) => setActiveRoadmapId(e.target.value)}
              className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-100 font-medium focus:outline-none"
            >
              {customRoadmaps.length > 0 && (
                <optgroup label="AI Generated Tracks">
                  {customRoadmaps.map(r => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Standard Curricula">
                {ROADMAPS.map(r => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </optgroup>
            </select>

            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New AI Track</span>
            </button>

            <button
              onClick={handleSyncSkills}
              disabled={completedCount === 0}
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
      </div>

      {/* ── SECTION 2: MILESTONES & TOPICS LIST ──────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 uppercase font-mono tracking-wider">
            Curriculum Milestones ({completedCount}/{totalCount})
          </h2>
        </div>

        <div className="space-y-3">
          {(roadmap?.milestones || []).map((milestone: any, index: number) => {
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
                          {milestone.level || 'Practice'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                        {milestone.description}
                      </p>

                      {/* Sub-modules & topics quick summary */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {subModulesList.length > 0 && (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                            {subModulesList.length} Sub-Modules
                          </span>
                        )}
                        {(milestone.skills || milestone.skillsGained || []).map((skill: string, sIdx: number) => (
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

      {/* ── MODAL: GENERATE CUSTOM AI ROADMAP ───────────────────────────────── */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-slate-900 dark:text-white" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Generate Custom AI Track</h3>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Enter any profession (Product, Design, Marketing, Finance, Engineering, Operations). Gemini will synthesize a structured curriculum with topics and curated resources.
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

      {/* ── MODAL: PHASE SUB-MODULES & CURATED RESOURCES ─────────────────────── */}
      {selectedMilestone && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-y-auto p-6 sm:p-7 space-y-6 shadow-2xl animate-in fade-in duration-200">
            
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

            {/* Sub-Modules Breakdown */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase font-mono tracking-wider">
                Curriculum Sub-Modules & Topics
              </h4>

              {selectedMilestone.subModules && selectedMilestone.subModules.length > 0 ? (
                <div className="space-y-3.5">
                  {selectedMilestone.subModules.map((sub: SubModule, sIdx: number) => (
                    <div
                      key={sub.id || sIdx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-[10px] font-mono flex items-center justify-center font-bold">
                              {sIdx + 1}
                            </span>
                            <h5 className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                              {sub.title}
                            </h5>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
                            {sub.description}
                          </p>
                        </div>
                      </div>

                      {/* Key Concepts Chips */}
                      {sub.keyConcepts && sub.keyConcepts.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-zinc-500 font-semibold">
                            Core Concepts:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {sub.keyConcepts.map((concept, cIdx) => (
                              <span
                                key={cIdx}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200"
                              >
                                {concept}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sub-module resources */}
                      {sub.resources && sub.resources.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-zinc-500 font-semibold">
                            Curated Learning Resources:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {sub.resources.map((res: LearnResource, rIdx: number) => (
                              <div
                                key={rIdx}
                                onClick={(e) => handleOpenLink(res.url, e)}
                                className="p-2.5 rounded-lg border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer flex items-start justify-between gap-2 group"
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100 group-hover:underline truncate">
                                    {res.title}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                                    {res.type === 'video' ? <Youtube className="w-3 h-3 text-red-500" /> : <FileText className="w-3 h-3 text-blue-500" />}
                                    <span>{res.type ? res.type.toUpperCase() : 'DOC'}</span>
                                    {res.duration && <span>· {res.duration}</span>}
                                  </div>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5 group-hover:text-black dark:group-hover:text-white" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* Fallback Topics & Learn resources if subModules array is empty */
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40 space-y-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">Key Concepts Covered:</span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 dark:text-zinc-400">
                      {(selectedMilestone.topics || selectedMilestone.skills || []).map((t: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-600" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedMilestone.learn && selectedMilestone.learn.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">Recommended Resources:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedMilestone.learn.map((res: LearnResource, idx: number) => (
                          <div
                            key={idx}
                            onClick={(e) => handleOpenLink(res.url, e)}
                            className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100">{res.title}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{res.provider || 'Guide'} {res.duration && `· ${res.duration}`}</div>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
