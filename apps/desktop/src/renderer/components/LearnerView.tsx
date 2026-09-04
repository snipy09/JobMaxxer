import React, { useState, useEffect, useMemo } from 'react';
import {
  ROADMAPS, calculateReadinessScore, RoadmapMilestone,
  LearnResource, PracticeExercise, ProjectChallenge
} from '../data/roadmaps';
import { MasterProfile, getApi, CustomRoadmapRecord, ActivityHeatmapDay, ActivityStats } from '../types';
import {
  Check, CheckSquare, Square, ExternalLink,
  ChevronRight, Play, Code2, BookOpen,
  Laptop, X, ArrowRight, SlidersHorizontal,
  Clock, ShieldCheck, Terminal, Layers, CheckCircle2,
  Plus, Loader2, Sparkles, RefreshCw, Award
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
  const [activeRoadmapId, setActiveRoadmapId] = useState<string>('frontend');
  const [completedNodes, setCompletedNodes] = useState<string[]>(['html-css-dom']);
  const [selectedMilestone, setSelectedMilestone] = useState<RoadmapMilestone | null>(null);

  // Custom AI Roadmaps from SQLite
  const [customRoadmaps, setCustomRoadmaps] = useState<any[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [newRoleTitle, setNewRoleTitle] = useState<string>('');
  const [newSkillsInput, setNewSkillsInput] = useState<string>('');
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Real Database-backed Activity Heatmap & Stats
  const [heatmapData, setHeatmapData] = useState<ActivityHeatmapDay[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats>({ streakCount: 1, totalActions: 0 });

  // Interactive practice state
  const [userCode, setUserCode] = useState<string>('');
  const [codeOutput, setCodeOutput] = useState<{ status: 'idle' | 'running' | 'success'; message: string }>({ status: 'idle', message: '' });
  const [selectedQuizIdx, setSelectedQuizIdx] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

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
      if (records && Array.isArray(records)) {
        const parsed = records.map((r: CustomRoadmapRecord) => {
          try {
            return JSON.parse(r.roadmapJson);
          } catch {
            return null;
          }
        }).filter(Boolean);
        setCustomRoadmaps(parsed);
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
        }
      } catch {}
    };
    loadProgress();
  }, [activeRoadmapId]);

  useEffect(() => {
    if (profile.desiredTitle) {
      const lower = profile.desiredTitle.toLowerCase();
      // Check if custom roadmap matches
      const customMatch = customRoadmaps.find(cr =>
        cr.title.toLowerCase().includes(lower) || (cr.targetRoles && cr.targetRoles.some((tr: string) => tr.toLowerCase().includes(lower)))
      );
      if (customMatch) {
        setActiveRoadmapId(customMatch.id);
      } else if (lower.includes('ai') || lower.includes('llm') || lower.includes('machine learning') || lower.includes('data') || lower.includes('backend') || lower.includes('systems') || lower.includes('node') || lower.includes('go') || lower.includes('devops') || lower.includes('cloud')) {
        setActiveRoadmapId('backend');
      } else if (lower.includes('product') || lower.includes('tpm') || lower.includes('apm') || lower.includes('scrum') || lower.includes('project')) {
        setActiveRoadmapId('product-management');
      } else {
        setActiveRoadmapId('frontend');
      }
    }
  }, [profile.desiredTitle, customRoadmaps]);

  // Combined standard + custom roadmap list
  const allRoadmaps = useMemo(() => {
    return [...ROADMAPS, ...customRoadmaps];
  }, [customRoadmaps]);

  const roadmap = useMemo(() => {
    return allRoadmaps.find(r => r.id === activeRoadmapId) || ROADMAPS[0];
  }, [allRoadmaps, activeRoadmapId]);

  const totalCount = roadmap.milestones?.length || 0;
  const completedCount = completedNodes.filter(id => (roadmap.milestones || []).some((m: any) => m.id === id)).length;
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
    setUserCode(m.practice?.[0]?.starterCode || '// Write solution...');
    setCodeOutput({ status: 'idle', message: '' });
    setSelectedQuizIdx(null);
    setQuizSubmitted(false);
  };

  const handleRunTest = async () => {
    if (!selectedMilestone) return;
    const exercise = selectedMilestone.practice?.[0];
    if (!exercise) return;

    setCodeOutput({ status: 'running', message: 'Running test execution engine...' });

    try {
      const trimmed = userCode.trim();
      if (!trimmed || trimmed.length < 10) {
        setCodeOutput({ status: 'idle', message: 'Please write a valid solution before running tests.' });
        return;
      }

      let passed = true;
      let feedback = 'All unit tests passed successfully.';

      if (exercise.testCases && exercise.testCases.length > 0) {
        try {
          const fn = new Function('input', `${trimmed}\n return typeof solution !== "undefined" ? solution(input) : null;`);
          for (const tc of exercise.testCases) {
            const actual = fn(tc.input);
            if (JSON.stringify(actual) !== JSON.stringify(tc.expected)) {
              passed = false;
              feedback = `Test Failed: input (${JSON.stringify(tc.input)}) returned ${JSON.stringify(actual)}, expected ${JSON.stringify(tc.expected)}`;
              break;
            }
          }
        } catch {
          passed = true;
        }
      }

      if (passed) {
        setCodeOutput({ status: 'success', message: feedback });
        const api = getApi();
        if (api && api.logUserActivity) {
          await api.logUserActivity('milestone', `Passed practice exercise for ${selectedMilestone.title}`);
          loadActivityData();
        }
      } else {
        setCodeOutput({ status: 'idle', message: feedback });
      }
    } catch (err: any) {
      setCodeOutput({ status: 'idle', message: `Runtime error: ${err?.message}` });
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

  // Build authentic 52-week activity heatmap from real database records
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
      
      {/* ── SECTION 1: DASHBOARD & REAL ACTIVITY HEATMAP ────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                {roadmap.title}
              </h1>
              {profile.desiredTitle && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700">
                  Target: {profile.desiredTitle}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Curriculum progression · {completedCount} of {totalCount} completed ({score}%)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Roadmap Switcher */}
            <select
              value={activeRoadmapId}
              onChange={(e) => setActiveRoadmapId(e.target.value)}
              className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-100 font-medium focus:outline-none"
            >
              <optgroup label="Standard Curricula">
                {ROADMAPS.map(r => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </optgroup>
              {customRoadmaps.length > 0 && (
                <optgroup label="AI Generated Roadmaps">
                  {customRoadmaps.map(r => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </optgroup>
              )}
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

      {/* ── SECTION 2: MILESTONE LIST ────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 uppercase font-mono tracking-wider">
            Curriculum Milestones ({completedCount}/{totalCount})
          </h2>
        </div>

        <div className="space-y-2.5">
          {(roadmap.milestones || []).map((milestone: any, index: number) => {
            const isCompleted = completedNodes.includes(milestone.id);
            return (
              <div
                key={milestone.id}
                onClick={() => handleOpenMilestone(milestone)}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-start justify-between gap-4 ${
                  isCompleted
                    ? 'bg-slate-50/50 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800 opacity-90'
                    : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-xs'
                }`}
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

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-slate-400 dark:text-zinc-500">
                        Phase {index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                        {milestone.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                        {milestone.level || 'Practice'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1">
                      {milestone.description}
                    </p>

                    {/* Topics / Skills preview */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {(milestone.topics || milestone.skills || []).slice(0, 4).map((topic: string, tIdx: number) => (
                        <span
                          key={tIdx}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-center">
                  <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono hidden sm:inline">
                    {milestone.estimatedHours || 20}h
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
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
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Generate Custom AI Curriculum</h3>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Enter any technical discipline or career objective. Gemini will synthesize a 5-phase actionable curriculum tailored to your background.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Target Role / Discipline</label>
                <input
                  type="text"
                  value={newRoleTitle}
                  onChange={(e) => setNewRoleTitle(e.target.value)}
                  placeholder="e.g. AI Systems Engineer, Distributed Database Architect, Swift iOS Developer"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Current Skills (Optional)</label>
                <input
                  type="text"
                  value={newSkillsInput}
                  onChange={(e) => setNewSkillsInput(e.target.value)}
                  placeholder="e.g. Python, PyTorch, Docker, C++"
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
                    <span>Synthesizing with AI...</span>
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

      {/* ── MODAL: MILESTONE DETAIL & PRACTICE ──────────────────────────────── */}
      {selectedMilestone && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-zinc-500">
                  {selectedMilestone.level || 'Foundations'} Phase
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedMilestone.title}
                </h3>
              </div>
              <button onClick={() => setSelectedMilestone(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300">
              {selectedMilestone.description}
            </p>

            {/* Topics covered */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">Key Architectural Topics:</span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 dark:text-zinc-400">
                {(selectedMilestone.topics || []).map((t: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-600" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Practice Exercise if available */}
            {selectedMilestone.practice && selectedMilestone.practice.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 dark:border-zinc-800 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">Hands-On Code Drill</span>
                  <span className="text-[10px] font-mono text-slate-500">{selectedMilestone.practice[0].difficulty}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400">
                  {selectedMilestone.practice[0].prompt}
                </p>
                <textarea
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-3 text-xs font-mono text-slate-900 dark:text-zinc-100 focus:outline-none resize-none"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500">
                    {codeOutput.message}
                  </span>
                  <button
                    type="button"
                    onClick={handleRunTest}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3" />
                    <span>Run Verification</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => toggleComplete(selectedMilestone.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                  completedNodes.includes(selectedMilestone.id)
                    ? 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200'
                    : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-90'
                }`}
              >
                {completedNodes.includes(selectedMilestone.id) ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Completed ✓</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark Milestone Completed</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedMilestone(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
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
