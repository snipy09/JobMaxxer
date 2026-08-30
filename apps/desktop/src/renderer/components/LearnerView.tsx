import React, { useState } from 'react';
import { ROADMAPS, calculateReadinessScore } from '../data/roadmaps';
import { MasterProfile, getApi } from '../types';
import { BookOpen, CheckCircle2, Circle, Sparkles, Award } from 'lucide-react';

export const LearnerView: React.FC<{
  profile: MasterProfile;
  onUpdateProfile: (updated: Partial<MasterProfile>) => void;
  onNavigateToSeeker: () => void;
  onLog: (msg: string) => void;
}> = ({ profile, onUpdateProfile, onNavigateToSeeker, onLog }) => {
  const [activeRoadmap, setActiveRoadmap] = useState<string>('frontend');
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);

  const roadmap = ROADMAPS.find(r => r.id === activeRoadmap) || ROADMAPS[0];
  const score = calculateReadinessScore(activeRoadmap, completedNodes);

  const toggleNode = (nodeId: string) => {
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
    onLog(`[Learner] Skills transferred to Seeker profile: ${Array.from(skillsGained).join(', ')}`);
    onNavigateToSeeker();
  };

  return (
    <div className="space-y-6 font-sans select-none max-w-5xl mx-auto pb-12 animate-fade-in">
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Career Roadmaps</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Master the skills. When you're ready, switch to Seeker Mode to auto-apply.</p>
          </div>
        </div>
        <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 overflow-x-auto">
          {ROADMAPS.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveRoadmap(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeRoadmap === r.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {r.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {roadmap.milestones.map((m, idx) => {
            const isCompleted = completedNodes.includes(m.id);
            return (
              <div key={m.id} className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                isCompleted ? 'bg-emerald-50/30 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300'
              }`} onClick={() => toggleNode(m.id)}>
                <div className="flex gap-4">
                  <div className="mt-0.5 shrink-0">
                    {isCompleted ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Circle className="w-6 h-6 text-slate-300" />}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step {idx + 1}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">{m.category}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{m.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{m.description}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {m.skillsGained.map((s: string) => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-brand-600" /> Readiness Score
            </h3>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-4xl font-black text-slate-900">{score}%</span>
              <span className="text-xs text-slate-500 mb-1 font-medium">Job Ready</span>
            </div>
            
            <div className="h-3 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-brand-500 transition-all duration-1000 ease-out rounded-full"
                style={{ width: `${score}%` }}
              />
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={handleTransferSkills}
                disabled={score < 30}
                className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  score >= 30 ? 'brand-gradient text-white shadow-brand hover:opacity-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Transfer Skills & Start Applying
              </button>
              {score < 30 && (
                <p className="text-[10px] text-slate-400 text-center">Complete at least 30% of milestones to unlock the Job Seeker tools.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};