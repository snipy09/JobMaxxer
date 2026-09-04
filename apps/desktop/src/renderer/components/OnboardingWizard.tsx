import React, { useState, useMemo } from 'react';
import {
  ArrowRight, ArrowLeft, Check, User,
  Briefcase, Target, Clock, Search,
  Compass, BookOpen, Layers, CheckCircle2,
  Code2, Phone, Mail, Lock, Shield, Sparkles,
  Zap, FileText, Upload, Key, Loader2, Calendar, Plus
} from 'lucide-react';
import { MasterProfile, getApi } from '../types';

interface OnboardingWizardProps {
  initialProfile: MasterProfile;
  currentUser?: { email?: string; fullName?: string } | null;
  onComplete: (completedProfile: MasterProfile) => void;
  onSwitchToLogin?: () => void;
}

const EXPERIENCE_LEVELS = [
  { id: 'fresher', label: 'Entry / Early Career', desc: '0–2 years or transitioning fields' },
  { id: 'mid', label: 'Mid-Level Specialist', desc: '2–5 years of domain execution' },
  { id: 'senior', label: 'Senior & Leadership', desc: '5+ years leading projects or teams' },
];

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

const DEFAULT_POPULAR_SKILLS = [
  'Product Strategy', 'UI/UX Design', 'User Research', 'SQL & Data Analysis',
  'TypeScript', 'React', 'Python', 'Growth Marketing & SEO',
  'Financial Modeling', 'Project Management', 'System Architecture', 'Market Research'
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialProfile,
  currentUser,
  onComplete,
  onSwitchToLogin,
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  // Authenticated user initials
  const userEmail = currentUser?.email || initialProfile.email || '';
  const initialFirst = initialProfile.firstName || (currentUser?.fullName ? currentUser.fullName.split(' ')[0] : '');
  const initialLast = initialProfile.lastName || (currentUser?.fullName ? currentUser.fullName.split(' ').slice(1).join(' ') : '');

  // Step 1 State: Core Inputs (Clean, zero pre-filled placeholders)
  const [firstName, setFirstName] = useState<string>(initialFirst || '');
  const [lastName, setLastName] = useState<string>(initialLast || '');
  const [phone, setPhone] = useState<string>(initialProfile.phone || '');
  const [targetRoleTitle, setTargetRoleTitle] = useState<string>(initialProfile.desiredTitle || '');
  const [experienceLevel, setExperienceLevel] = useState<string>(initialProfile.experienceLevel || 'fresher');
  const [targetHorizon, setTargetHorizon] = useState<string>('3 Months');
  const [dailyCommitment, setDailyCommitment] = useState<string>('2 Hours/Day');
  const [bioOrResumeText, setBioOrResumeText] = useState<string>(initialProfile.resumeText || '');
  const [uploadedResumePath, setUploadedResumePath] = useState<string>(initialProfile.resumeFilePath || '');
  const [uploadedResumeName, setUploadedResumeName] = useState<string>('');
  const [isPickingResumeFile, setIsPickingResumeFile] = useState<boolean>(false);
  const [customAiKey, setCustomAiKey] = useState<string>(initialProfile.geminiApiKey || '');
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (initialProfile.techStack) {
      initialProfile.techStack.split(',').map(x => x.trim()).filter(Boolean).forEach(x => s.add(x));
    }
    return s;
  });
  const [newSkillInput, setNewSkillInput] = useState<string>('');

  // Step 2 State: AI Synthesis Results
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [synthesizedProfile, setSynthesizedProfile] = useState<Partial<MasterProfile>>({});
  const [synthesizedRoadmap, setSynthesizedRoadmap] = useState<any>(null);

  const toggleSkill = (skill: string) => {
    const next = new Set(selectedSkills);
    if (next.has(skill)) next.delete(skill);
    else next.add(skill);
    setSelectedSkills(next);
  };

  const handleAddSkill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newSkillInput.trim();
    if (!clean) return;
    const next = new Set(selectedSkills);
    next.add(clean);
    setSelectedSkills(next);
    setNewSkillInput('');
  };

  const handlePickResumeFile = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    const api = getApi();
    setIsPickingResumeFile(true);
    try {
      let fileName = 'Resume.pdf';
      let filePath = '';

      if (e && e.target.files && e.target.files.length > 0) {
        const f = e.target.files[0];
        fileName = f.name;
        filePath = (f as any).path || URL.createObjectURL(f);
      } else if (api && api.pickResumeFile) {
        const res = await api.pickResumeFile();
        if (res.canceled || !res.filePath) {
          setIsPickingResumeFile(false);
          return;
        }
        filePath = res.filePath;
        fileName = res.fileName || res.filePath.split(/[/\\]/).pop() || 'Resume.pdf';
      }

      if (filePath) {
        setUploadedResumePath(filePath);
        setUploadedResumeName(fileName);
        if (api && api.saveResume) {
          await api.saveResume({
            name: fileName,
            targetRole: targetRoleTitle || 'General',
            filePath,
            isDefault: true,
          });
        }
      }
    } catch (err: any) {
      console.warn('[Onboarding Resume] Picker error:', err?.message);
    } finally {
      setIsPickingResumeFile(false);
    }
  };

  // ── Step 1 → 2: Trigger Real AI Profile & Roadmap Generation ──────────────
  const handleGenerateAIProfile = async () => {
    setIsGenerating(true);
    setAiError(null);

    const api = getApi();
    try {
      const res = await api.generateAiOnboardingProfile({
        targetRole: targetRoleTitle.trim() || 'Professional Specialist',
        experienceLevel,
        bioOrResumeText: bioOrResumeText.trim(),
        customSkills: Array.from(selectedSkills),
        targetHorizon,
        dailyCommitment,
        geminiKey: customAiKey.trim() || undefined,
        groqKey: initialProfile.groqApiKey || undefined,
      });

      if (res && res.success && res.profile) {
        const roadmapObj = res.roadmap;
        setSynthesizedProfile({
          ...initialProfile,
          firstName: firstName.trim() || res.profile.firstName || 'Candidate',
          lastName: lastName.trim() || res.profile.lastName || '',
          email: userEmail || initialProfile.email || 'user@nomadic.app',
          phone: phone.trim(),
          desiredTitle: res.profile.desiredTitle || targetRoleTitle,
          techStack: res.profile.techStack || Array.from(selectedSkills).join(', '),
          desiredSalary: res.profile.desiredSalary || '₹12 LPA – ₹26 LPA',
          resumeText: bioOrResumeText.trim() || res.profile.resumeText || '',
          resumeFilePath: uploadedResumePath || initialProfile.resumeFilePath,
          experienceLevel: experienceLevel as any,
          geminiApiKey: customAiKey.trim() || undefined,
          onboardingCompleted: true,
        });
        setSynthesizedRoadmap(roadmapObj);
        setStep(2);
      } else {
        throw new Error(res?.error || 'AI synthesis failed.');
      }
    } catch (err: any) {
      console.warn('[Onboarding AI] Fallback triggered:', err?.message);
      // Universal fallback
      const fallbackStack = Array.from(selectedSkills).join(', ');
      const fallbackId = `roadmap-${Date.now()}`;
      const fallbackRoadmap = {
        id: fallbackId,
        title: `${targetRoleTitle.trim() || 'Career'} Acceleration Roadmap`,
        domain: 'Professional Track',
        targetRoles: [targetRoleTitle.trim() || 'Specialist'],
        targetHorizon,
        dailyCommitment,
        milestones: [
          {
            id: 'phase-1',
            title: 'Phase 1: Foundations & Core Principles',
            level: 'Foundations',
            estimatedHours: 20,
            description: 'Core concepts, operating workflows, and essential toolsets.',
            subModules: [
              {
                id: 'sub-1-1',
                title: 'Fundamentals & Industry Standards',
                description: 'Key principles, frameworks, and workflow best practices.',
                keyConcepts: ['Core theory & standards', 'Daily productivity tools', 'Workflow execution'],
                resources: [
                  { title: `${targetRoleTitle} Fundamentals Masterclass`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(targetRoleTitle + ' basics')}`, type: 'video', duration: '35 mins' }
                ]
              }
            ]
          },
          {
            id: 'phase-2',
            title: 'Phase 2: Intermediate Execution & Deliverables',
            level: 'Practice',
            estimatedHours: 30,
            description: 'Practical project deliverables, case studies, and artifact creation.',
            subModules: [
              {
                id: 'sub-2-1',
                title: 'Deliverables & Case Execution',
                description: 'Hands-on workflow execution and deliverable management.',
                keyConcepts: ['Execution framework', 'Quality metrics', 'Cross-functional alignment'],
                resources: [
                  { title: `${targetRoleTitle} Case Study Breakdown`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(targetRoleTitle + ' case study')}`, type: 'video', duration: '40 mins' }
                ]
              }
            ]
          }
        ]
      };

      setSynthesizedProfile({
        ...initialProfile,
        firstName: firstName.trim() || 'Candidate',
        lastName: lastName.trim() || '',
        email: userEmail || initialProfile.email || 'user@nomadic.app',
        phone: phone.trim(),
        desiredTitle: targetRoleTitle.trim() || 'Specialist',
        techStack: fallbackStack || 'Strategy, Analysis, Execution',
        desiredSalary: '₹12 LPA – ₹26 LPA · $90k – $150k',
        resumeText: bioOrResumeText.trim(),
        resumeFilePath: uploadedResumePath || initialProfile.resumeFilePath,
        experienceLevel: experienceLevel as any,
        geminiApiKey: customAiKey.trim() || undefined,
        onboardingCompleted: true,
      });
      setSynthesizedRoadmap(fallbackRoadmap);
      setStep(2);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Step 2: Finalize & Persist Onboarding ──────────────────────────────────
  const handleFinalSubmit = async () => {
    setIsGenerating(true);
    const api = getApi();

    const finalProf: MasterProfile = {
      ...initialProfile,
      ...synthesizedProfile,
      firstName: firstName.trim() || synthesizedProfile.firstName || 'Candidate',
      lastName: lastName.trim() || synthesizedProfile.lastName || '',
      email: userEmail || initialProfile.email || 'user@nomadic.app',
      phone: phone.trim() || synthesizedProfile.phone || '',
      desiredTitle: synthesizedProfile.desiredTitle || targetRoleTitle,
      techStack: synthesizedProfile.techStack || Array.from(selectedSkills).join(', '),
      resumeFilePath: uploadedResumePath || synthesizedProfile.resumeFilePath || initialProfile.resumeFilePath,
      geminiApiKey: customAiKey.trim() || undefined,
      onboardingCompleted: true,
    };

    try {
      await api.saveMasterProfile(finalProf as any);
      if (synthesizedRoadmap && api.saveCustomRoadmap) {
        await api.saveCustomRoadmap({
          id: synthesizedRoadmap.id || `roadmap-${Date.now()}`,
          roleTitle: finalProf.desiredTitle || targetRoleTitle,
          domain: synthesizedRoadmap.domain || 'Professional Track',
          roadmapJson: JSON.stringify(synthesizedRoadmap),
          targetHorizon,
          dailyCommitment,
        });
      }
      if (api.logUserActivity) {
        await api.logUserActivity('milestone', `Completed AI Onboarding for ${finalProf.desiredTitle}`);
      }
    } catch (err: any) {
      console.error('[Onboarding Save Error]:', err);
    } finally {
      setIsGenerating(false);
      onComplete(finalProf);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-zinc-100 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800">
      
      {/* Top Header */}
      <div className="max-w-3xl w-full mx-auto flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black dark:bg-white text-white dark:text-black font-bold flex items-center justify-center text-sm tracking-tight">
            N
          </div>
          <div>
            <span className="font-semibold tracking-tight text-sm text-slate-900 dark:text-white">Nomadic</span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 ml-2 font-mono">Career Setup</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-black dark:bg-white' : 'bg-slate-300 dark:bg-zinc-800'}`} />
          <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-black dark:bg-white' : 'bg-slate-300 dark:bg-zinc-800'}`} />
          <span className="text-xs font-mono text-slate-500 dark:text-zinc-400 ml-2">Step {step} of 2</span>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="max-w-3xl w-full mx-auto my-auto py-8">
        {step === 1 ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                Initialize your career profile
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
                Enter your target role across any discipline (Product, Design, Marketing, Finance, Engineering, Operations). Our AI will analyze your background and structure your learning roadmap.
              </p>
            </div>

            {/* Candidate Name & Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 transition"
                  />
                </div>
              </div>
            </div>

            {/* Target Profession */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Target Role / Career Focus <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={targetRoleTitle}
                  onChange={(e) => setTargetRoleTitle(e.target.value)}
                  placeholder="e.g. Software Engineer, Product Manager, UI/UX Designer, Growth Marketer, Data Analyst, Financial Analyst"
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 transition"
                />
              </div>
              {/* Quick Role Suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] font-mono text-slate-400">Suggestions:</span>
                {['Software Engineer', 'Product Manager', 'UI/UX Designer', 'Growth Marketer', 'Data Analyst', 'Financial Analyst', 'DevOps & Cloud', 'Operations Lead'].map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setTargetRoleTitle(role)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition"
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience Level */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Current Experience Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setExperienceLevel(lvl.id)}
                    className={`text-left p-3 rounded-xl border text-xs transition ${
                      experienceLevel === lvl.id
                        ? 'border-black dark:border-white bg-slate-50 dark:bg-zinc-900 font-semibold text-slate-950 dark:text-white shadow-2xs'
                        : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    <div className="font-medium text-slate-900 dark:text-zinc-200">{lvl.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5">{lvl.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline Horizon & Daily Commitment Calibration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Target Horizon */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Target Timeline Horizon</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TIMELINE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTargetHorizon(opt.id)}
                      className={`text-center p-2.5 rounded-xl border text-xs transition ${
                        targetHorizon === opt.id
                          ? 'border-black dark:border-white bg-slate-50 dark:bg-zinc-900 font-bold text-slate-950 dark:text-white shadow-2xs'
                          : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      <div className="font-semibold text-slate-900 dark:text-zinc-100">{opt.label}</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Commitment */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Daily Time Commitment</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {COMMITMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDailyCommitment(opt.id)}
                      className={`text-center p-2.5 rounded-xl border text-xs transition ${
                        dailyCommitment === opt.id
                          ? 'border-black dark:border-white bg-slate-50 dark:bg-zinc-900 font-bold text-slate-950 dark:text-white shadow-2xs'
                          : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      <div className="font-semibold text-slate-900 dark:text-zinc-100">{opt.label}</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Skills selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                  Key Skills &amp; Competencies <span className="text-slate-400 font-normal">(Click suggestions below to add)</span>
                </label>
                {selectedSkills.size > 0 && (
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {selectedSkills.size} selected
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_POPULAR_SKILLS.map((skill) => {
                  const active = selectedSkills.has(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                        active
                          ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-semibold'
                          : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:border-slate-400 dark:hover:border-zinc-600'
                      }`}
                    >
                      {active ? <Check className="w-3 h-3 text-emerald-400 dark:text-emerald-600" /> : <Plus className="w-3 h-3 text-slate-400" />}
                      <span>{skill}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddSkill(); }}
                  placeholder="Add custom competency (e.g. User Journey Mapping, Excel Modeling, Brand Identity)..."
                  className="flex-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 transition"
                />
                <button
                  type="button"
                  onClick={() => handleAddSkill()}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs font-medium hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300 transition"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Resume Upload File Box */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Upload Resume Document (.pdf, .docx) (Optional)
              </label>
              
              {uploadedResumePath ? (
                <div className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                        {uploadedResumeName || uploadedResumePath.split(/[/\\]/).pop()}
                      </div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono">
                        ✓ Resume document attached successfully
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePickResumeFile}
                    className="text-xs text-slate-600 dark:text-zinc-400 hover:text-black dark:hover:text-white underline font-medium"
                  >
                    Change File
                  </button>
                </div>
              ) : (
                <div
                  onClick={handlePickResumeFile}
                  className="p-3.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-slate-400 dark:hover:border-zinc-500 bg-slate-50/50 dark:bg-zinc-900/30 text-center cursor-pointer transition flex items-center justify-center gap-2"
                >
                  {isPickingResumeFile ? <Loader2 className="w-4 h-4 animate-spin text-slate-500" /> : <Upload className="w-4 h-4 text-slate-400" />}
                  <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                    {isPickingResumeFile ? 'Selecting document...' : 'Click to attach your Resume (.pdf, .docx)'}
                  </span>
                </div>
              )}
            </div>

            {/* Resume / Background Text */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Summary, Bio or Resume Notes (Optional)
              </label>
              <textarea
                value={bioOrResumeText}
                onChange={(e) => setBioOrResumeText(e.target.value)}
                rows={3}
                placeholder="Paste your resume summary, portfolio details, or experience notes. AI will use this to fine-tune your personalized curriculum."
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-3 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 transition resize-none font-mono"
              />
            </div>

            {aiError && (
              <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-xs text-red-600 dark:text-red-400">
                {aiError}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-zinc-800">
              {onSwitchToLogin ? (
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
                >
                  Already have an account? Sign In
                </button>
              ) : <div />}

              <button
                type="button"
                disabled={isGenerating || !firstName.trim() || !phone.trim() || !targetRoleTitle.trim()}
                onClick={handleGenerateAIProfile}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Curriculum...</span>
                  </>
                ) : (
                  <>
                    <span>Generate AI Curriculum</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Confirmation & Overview */
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-medium text-slate-800 dark:text-zinc-200 mb-3">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                <span>Curriculum Synthesized</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                Your Career Roadmap is Ready
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
                Structured dynamic curriculum tailored for {synthesizedProfile.desiredTitle || targetRoleTitle} ({targetHorizon}, {dailyCommitment}).
              </p>
            </div>

            {/* Profile Overview Card */}
            <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {synthesizedProfile.firstName} {synthesizedProfile.lastName}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    {synthesizedProfile.desiredTitle} · {targetHorizon} Horizon ({dailyCommitment})
                  </div>
                </div>
                <div className="text-xs font-mono font-bold text-slate-900 dark:text-zinc-100 bg-white dark:bg-black px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-800">
                  {synthesizedProfile.desiredSalary || '₹12 LPA – ₹26 LPA'}
                </div>
              </div>

              {/* Verified Competencies */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-zinc-500 font-semibold">
                  Competency Focus:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(synthesizedProfile.techStack || '').split(',').map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-mono px-2 py-0.5 rounded bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200"
                    >
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Milestones Preview */}
              {synthesizedRoadmap && synthesizedRoadmap.milestones && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-zinc-500 font-semibold">
                    Curriculum Milestones ({synthesizedRoadmap.milestones.length} Phases):
                  </span>
                  <div className="space-y-2">
                    {synthesizedRoadmap.milestones.map((m: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] font-mono font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">{m.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {m.estimatedHours || 20} hrs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-medium hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300 transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Adjust Parameters</span>
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={handleFinalSubmit}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 transition shadow-xs"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Learner Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="max-w-3xl w-full mx-auto text-center pt-4 border-t border-slate-100 dark:border-zinc-900 text-[11px] text-slate-400 font-mono">
        Nomadic Career Intelligence Platform · Zero Operating Cost
      </div>

    </div>
  );
};
