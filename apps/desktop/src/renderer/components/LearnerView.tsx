import React, { useState } from 'react';
import { ROADMAPS, calculateReadinessScore } from '../data/roadmaps';
import { MasterProfile, getApi } from '../types';
import {
  BookOpen, CheckCircle2, Circle, ArrowRight,
  ExternalLink, ChevronDown, ChevronUp, Check,
  Sparkles, Award, Layers, HelpCircle, FileText
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

  return (
    <div className="space-y-6 font-sans select-none max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-950 dark:text-white">Career Roadmaps &amp; Resource Vault</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Check off milestones as you learn. When ready, 1-click transfer competencies into your Seeker candidate profile.
            </p>
          </div>
        </div>

        {/* Roadmap Switcher Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          {ROADMAPS.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveRoadmapId(r.id)}
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
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Comp: {roadmap.salaryRangeIndia}
            </span>
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
                        <span className="text-[10px] font-mono text-slate-400">~{m.estimatedHours}h</span>
                      </div>

                      <h3 className={`text-sm font-bold ${isCompleted ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-950 dark:text-white'}`}>
                        {m.title}
                      </h3>
                      
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {m.description}
                      </p>

                      {/* Skills Gained Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {m.skillsGained.map((skill) => (
                          <span
                            key={skill}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      {/* Expandable Interview Prep & Resources */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => setExpandedMilestoneId(isExpanded ? null : m.id)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-950 dark:hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <span>{isExpanded ? 'Hide Details' : 'View Topics & Interview Questions'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 space-y-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-up">
                            <div>
                              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">Core Topics:</span>
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
                                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">Mock Interview Questions:</span>
                                <ul className="mt-1 space-y-1 text-slate-700 dark:text-slate-200 font-medium">
                                  {m.interviewQuestions.map((q, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <HelpCircle className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
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
                <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-400">Job-Readiness</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  {completedNodes.length} / {roadmap.milestones.length} Milestones
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-black text-slate-950 dark:text-white tracking-tight">{score}%</span>
                <span className="text-xs text-slate-500 font-semibold">Readiness Score</span>
              </div>

              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-slate-950 dark:bg-white transition-all duration-700 rounded-full"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleTransferSkills}
                className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <span>Transfer Skills to Profile</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-center">
                Pushes all acquired milestone skills into your master candidate profile so you can match and auto-apply in Seeker mode.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
