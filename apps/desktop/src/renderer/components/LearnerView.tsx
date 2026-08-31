import React, { useState } from 'react';
import { ROADMAPS, calculateReadinessScore } from '../data/roadmaps';
import { MasterProfile, getApi } from '../types';
import {
  BookOpen, CheckCircle2, Circle, ArrowRight,
  ExternalLink, ChevronDown, ChevronUp, Check,
  Sparkles, Award, Layers, HelpCircle, FileText,
  Clock, ShieldCheck, Zap, Lock, Unlock
} from 'lucide-react';

export const LearnerView: React.FC<{
  profile: MasterProfile;
  onUpdateProfile: (updated: Partial<MasterProfile>) => void;
  onNavigateToSeeker: () => void;
  onLog: (msg: string) => void;
}> = ({ profile, onUpdateProfile, onNavigateToSeeker, onLog }) => {
  const [activeRoadmapId, setActiveRoadmapId] = useState<string>('product-management');
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);

  const roadmap = ROADMAPS.find(r => r.id === activeRoadmapId) || ROADMAPS[0];
  const score = calculateReadinessScore(activeRoadmapId, completedNodes);
  const totalMilestones = roadmap.milestones.length;
  const completedCount = completedNodes.filter(id => roadmap.milestones.some(m => m.id === id)).length;

  const totalEstimatedHours = roadmap.milestones.reduce((acc, m) => acc + (m.estimatedHours || 0), 0);

  const toggleNode = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCompletedNodes(prev => prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]);
  };

  const handleTransferSkills = async () => {
    const skillsGained = new Set<string>();
    completedNodes.forEach(nId => {
      const node = roadmap.milestones.find(m => m.id === nId);
      node?.skillsGained.forEach(s => skillsGained.add(s));
    });

    const currentSkills = new Set((profile.techStack || '').split(',').map(s => s.trim()).filter(Boolean));
    skillsGained.forEach(s => currentSkills.add(s));

    const newTechStack = Array.from(currentSkills).join(', ');
    const newDesiredTitle = profile.desiredTitle ? profile.desiredTitle : roadmap.targetRoles.join(', ');
    
    await getApi().saveMasterProfile({ ...profile, techStack: newTechStack, desiredTitle: newDesiredTitle });
    onUpdateProfile({ techStack: newTechStack, desiredTitle: newDesiredTitle });
    onLog(`[Hirestack] Transferred competencies to Seeker candidate profile: ${Array.from(skillsGained).join(', ')}`);
    onNavigateToSeeker();
  };

  // Collect unlocked skills
  const unlockedSkills = useMemo(() => {
    const skills = new Set<string>();
    completedNodes.forEach(nId => {
      const node = roadmap.milestones.find(m => m.id === nId);
      node?.skillsGained.forEach(s => skills.add(s));
    });
    return Array.from(skills);
  }, [completedNodes, roadmap]);

  return (
    <div className="space-y-6 font-sans select-none max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-950 dark:text-white">Career Roadmaps &amp; Readiness Engine</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Structured curriculum across technical &amp; business domains. Completing milestones unlocks skills for your Seeker profile.
            </p>
          </div>
        </div>

        {/* Roadmap Switcher Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          {ROADMAPS.map(r => (
            <button
              key={r.id}
              onClick={() => { setActiveRoadmapId(r.id); setExpandedMilestoneId(null); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeRoadmapId === r.id
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {r.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Milestones Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-extrabold text-slate-950 dark:text-white">{roadmap.title}</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Target Roles: {roadmap.targetRoles.join(' · ')}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold">
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {totalEstimatedHours}h Total Curriculum
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Comp: {roadmap.salaryRangeIndia}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {roadmap.milestones.map((m, idx) => {
              const isCompleted = completedNodes.includes(m.id);
              const isExpanded = expandedMilestoneId === m.id;

              return (
                <div
                  key={m.id}
                  className={`border rounded-2xl p-5 transition-all bg-white dark:bg-slate-900 shadow-sm ${
                    isCompleted
                      ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <button
                      type="button"
                      onClick={(e) => toggleNode(m.id, e)}
                      className="mt-0.5 shrink-0 transition-transform active:scale-90"
                      title={isCompleted ? 'Mark Incomplete' : 'Mark Completed'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-700 hover:text-slate-500" />
                      )}
                    </button>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-slate-400">0{idx + 1}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {m.category}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" /> ~{m.estimatedHours}h
                        </span>
                      </div>

                      <h3 className={`text-sm font-bold ${isCompleted ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-950 dark:text-white'}`}>
                        {m.title}
                      </h3>
                      
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {m.description}
                      </p>

                      {/* Skills Unlocked Badges */}
                      <div className="pt-1">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                          {isCompleted ? <Unlock className="w-3 h-3 text-emerald-500" /> : <Lock className="w-3 h-3 text-slate-400" />}
                          <span>Skills Unlocked upon completion:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {m.skillsGained.map((skill) => (
                            <span
                              key={skill}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                                isCompleted
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Expandable Topics & Mock Interviews */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => setExpandedMilestoneId(isExpanded ? null : m.id)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-950 dark:hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <span>{isExpanded ? 'Hide Details' : 'View Core Topics & Mock Interview QA'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 space-y-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-up">
                            <div>
                              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">Core Curriculum Topics:</span>
                              <ul className="mt-1 space-y-1 text-slate-600 dark:text-slate-300 text-xs">
                                {m.topics.map((tp, i) => (
                                  <li key={i} className="flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-slate-400" />
                                    <span>{tp}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {m.interviewQuestions.length > 0 && (
                              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">Real-World Interview Questions:</span>
                                <ul className="mt-1 space-y-1 text-slate-700 dark:text-slate-200 font-medium">
                                  {m.interviewQuestions.map((q, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <HelpCircle className="w-3.5 h-3.5 text-slate-900 dark:text-white shrink-0 mt-0.5" />
                                      <span>{q}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Readiness Meter Column */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm sticky top-20 space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-400">Readiness Status</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold">
                  {completedCount} of {totalMilestones} Milestones
                </span>
              </div>

              {/* Narrative Progress Header */}
              <div className="mt-3">
                <div className="text-sm font-bold text-slate-950 dark:text-white">
                  {completedCount === totalMilestones
                    ? 'All milestones complete — 100% Ready!'
                    : completedCount === 0
                    ? 'Get started by checking off your first milestone'
                    : `${completedCount} of ${totalMilestones} milestones complete — you're ${score}% ready`}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  {completedCount === 0
                    ? 'Select a milestone on the left to begin tracking'
                    : `${unlockedSkills.length} competencies ready for transfer`}
                </p>
              </div>

              {/* High Contrast Progress Bar */}
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden border border-slate-200 dark:border-slate-700">
                <div
                  className={`h-full transition-all duration-700 rounded-full ${
                    score >= 66 ? 'bg-emerald-500' : score >= 33 ? 'bg-slate-800 dark:bg-slate-200' : 'bg-slate-400'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>

            {/* Unlocked Competencies Preview */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Competency Bank</span>
              {unlockedSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {unlockedSkills.map(sk => (
                    <span key={sk} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                      {sk}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">No skills unlocked yet. Complete milestones to build your profile.</p>
              )}
            </div>

            {/* Transfer CTA */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleTransferSkills}
                disabled={completedCount === 0}
                className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Transfer Skills to Seeker Profile</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-center">
                Pushes all unlocked competencies directly into your candidate profile for smart ATS matching and auto-apply submissions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
