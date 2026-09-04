import React, { useState } from 'react';
import {
  ArrowRight, ArrowLeft, Check, User,
  Briefcase, Target, Clock, Search,
  Compass, BookOpen, Layers, CheckCircle2,
  Code2, Phone, Mail, Lock, Shield, Sparkles,
  Zap, FileText, Upload, Key, Loader2, Calendar, Plus, X
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
  { id: 'mid', label: 'Mid-Level Specialist', desc: '2–5 years of direct execution' },
  { id: 'senior', label: 'Senior & Leadership', desc: '5+ years leading projects or teams' },
];

const TIMELINE_OPTIONS = [
  { id: '1 Month', label: '1 Month', sub: 'Fast-Track Sprint' },
  { id: '3 Months', label: '3 Months', sub: 'Standard (Recommended)' },
  { id: '6 Months', label: '6 Months', sub: 'Comprehensive Mastery' },
];

const COMMITMENT_OPTIONS = [
  { id: '1 Hour/Day', label: '1 Hour / Day', sub: 'Consistent Pace' },
  { id: '2 Hours/Day', label: '2 Hours / Day', sub: 'Optimal Growth' },
  { id: '4+ Hours/Day', label: '4+ Hours / Day', sub: 'Full Immersion' },
];

const ROLE_SUGGESTIONS = [
  'Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'Fullstack Engineer',
  'Product Manager', 'UI/UX Designer', 'Growth Marketer', 'Data Analyst',
  'Financial Analyst', 'DevOps & Cloud', 'AI / ML Engineer', 'Operations Lead'
];

const DEFAULT_POPULAR_SKILLS = [
  'Product Strategy', 'UI/UX Design', 'User Research', 'SQL & Data Analysis',
  'TypeScript', 'React', 'Python', 'Growth Marketing & SEO',
  'Financial Modeling', 'Project Management', 'System Architecture', 'Market Research',
  'REST APIs', 'Docker', 'Next.js', 'Figma', 'Node.js', 'PostgreSQL'
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialProfile,
  currentUser,
  onComplete,
  onSwitchToLogin,
}) => {
  // 4 Focused Form Steps + Final Step 5 Review
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Authenticated user initials
  const userEmail = currentUser?.email || initialProfile.email || '';
  const initialFirst = initialProfile.firstName || (currentUser?.fullName ? currentUser.fullName.split(' ')[0] : '');
  const initialLast = initialProfile.lastName || (currentUser?.fullName ? currentUser.fullName.split(' ').slice(1).join(' ') : '');

  // Core State (Clean, zero forced pre-filled placeholders)
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

  // AI Synthesis Results
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

  // ── Trigger Neural Profile & Deep Roadmap Generation ──────────────────────
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
        setStep(5);
      } else {
        throw new Error(res?.error || 'AI synthesis failed.');
      }
    } catch (err: any) {
      console.warn('[Onboarding AI] Fallback triggered:', err?.message);
      // Detailed fallback roadmap
      const fallbackId = `roadmap-${Date.now()}`;
      const fallbackRoadmap = {
        id: fallbackId,
        title: `${targetRoleTitle.trim() || 'Career'} Acceleration Roadmap`,
        domain: 'Professional Mastery',
        targetRoles: [targetRoleTitle.trim() || 'Specialist'],
        targetHorizon,
        dailyCommitment,
        milestones: [
          {
            id: 'phase-1',
            title: 'Phase 1: Foundations & Core Architecture',
            level: 'Foundations',
            estimatedHours: 25,
            description: 'Core concepts, industry standards, and environment setup.',
            subModules: [
              {
                id: 'sub-1-1',
                title: 'Core Fundamentals & Industry Workflows',
                description: 'Deep dive into standard operating procedures and best practices.',
                keyConcepts: ['Foundational Principles', 'Execution Standards', 'Core Data Structures / Frameworks', 'Quality Control'],
                resources: [
                  { title: `${targetRoleTitle || 'Role'} Fundamentals Masterclass`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent((targetRoleTitle || 'career') + ' fundamentals masterclass')}`, type: 'video', duration: '35 mins' },
                  { title: 'Official Documentation & Standards', url: `https://google.com/search?q=${encodeURIComponent((targetRoleTitle || 'career') + ' official documentation best practices')}`, type: 'doc' }
                ]
              }
            ]
          },
          {
            id: 'phase-2',
            title: 'Phase 2: Execution & Real-World Deliverables',
            level: 'Core Execution',
            estimatedHours: 35,
            description: 'Hands-on practical projects, artifact design, and case studies.',
            subModules: [
              {
                id: 'sub-2-1',
                title: 'Production Artifacts & Case Studies',
                description: 'Building end-to-end deliverables for portfolio demonstration.',
                keyConcepts: ['End-to-End Workflow Execution', 'Performance Optimization', 'Metrics Tracking', 'Cross-Functional Strategy'],
                resources: [
                  { title: 'Project Case Study Breakdown', url: `https://www.youtube.com/results?search_query=${encodeURIComponent((targetRoleTitle || 'career') + ' real world case study')}`, type: 'video', duration: '45 mins' }
                ]
              }
            ]
          },
          {
            id: 'phase-3',
            title: 'Phase 3: Advanced Optimization & Scaling',
            level: 'Advanced',
            estimatedHours: 30,
            description: 'System design, scalability, leadership, and edge-case resolution.',
            subModules: [
              {
                id: 'sub-3-1',
                title: 'Enterprise Architecture & Scale',
                description: 'Solving complex scaling challenges and architectural trade-offs.',
                keyConcepts: ['High-Availability Architecture', 'Bottleneck Diagnostics', 'Cost & Latency Optimization', 'Security Protocols'],
                resources: [
                  { title: 'System Architecture & Scaling Guide', url: `https://www.youtube.com/results?search_query=${encodeURIComponent((targetRoleTitle || 'system architecture') + ' design and scaling')}`, type: 'video', duration: '50 mins' }
                ]
              }
            ]
          },
          {
            id: 'phase-4',
            title: 'Phase 4: Interview Mastery & Portfolio Defense',
            level: 'Interview Ready',
            estimatedHours: 20,
            description: 'Behavioral STAR storytelling, mock drills, and technical deep-dives.',
            subModules: [
              {
                id: 'sub-4-1',
                title: 'Interview Strategy & Technical Defense',
                description: 'Bar-raiser interview preparation and portfolio presentation.',
                keyConcepts: ['STAR Storytelling Framework', 'Technical Problem Solving', 'Salary Negotiation', 'Behavioral Drills'],
                resources: [
                  { title: 'Mock Interview & Strategy Drills', url: `https://www.youtube.com/results?search_query=${encodeURIComponent((targetRoleTitle || 'career') + ' mock interview questions and answers')}`, type: 'video', duration: '40 mins' }
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
        desiredTitle: targetRoleTitle.trim() || 'Professional Specialist',
        techStack: Array.from(selectedSkills).join(', ') || 'Core Skills',
        desiredSalary: '₹12 LPA – ₹26 LPA',
        resumeText: bioOrResumeText.trim() || 'Professional ready for high-impact opportunities.',
        resumeFilePath: uploadedResumePath || initialProfile.resumeFilePath,
        experienceLevel: experienceLevel as any,
        geminiApiKey: customAiKey.trim() || undefined,
        onboardingCompleted: true,
      });
      setSynthesizedRoadmap(fallbackRoadmap);
      setStep(5);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinalizeAndLaunch = async () => {
    const api = getApi();
    const finalProfile: MasterProfile = {
      ...initialProfile,
      ...synthesizedProfile,
      firstName: firstName.trim() || synthesizedProfile.firstName || 'Candidate',
      lastName: lastName.trim() || synthesizedProfile.lastName || '',
      email: userEmail || synthesizedProfile.email || 'user@nomadic.app',
      phone: phone.trim() || synthesizedProfile.phone || '',
      desiredTitle: targetRoleTitle.trim() || synthesizedProfile.desiredTitle || 'Professional Specialist',
      techStack: Array.from(selectedSkills).join(', ') || synthesizedProfile.techStack || 'Core Skills',
      experienceLevel: experienceLevel as any,
      resumeFilePath: uploadedResumePath || synthesizedProfile.resumeFilePath || '',
      onboardingCompleted: true,
    };

    if (synthesizedRoadmap && api && api.saveCustomRoadmap) {
      try {
        await api.saveCustomRoadmap(synthesizedRoadmap);
      } catch (err: any) {
        console.warn('[Onboarding Save Roadmap] Error:', err?.message);
      }
    }

    if (api && api.updateMasterProfile) {
      try {
        await api.updateMasterProfile(finalProfile);
      } catch (err: any) {
        console.warn('[Onboarding Save Profile] Error:', err?.message);
      }
    }

    onComplete(finalProfile);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-powder-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6 animate-in fade-in duration-200">
        
        {/* Top Header & Step Stepper */}
        {step < 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs shadow-xs">
                  N
                </div>
                <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                  Nomadic Setup
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                <span>Step {step} of 4</span>
              </div>
            </div>

            {/* Visual Step Progress Bar */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s <= step
                      ? 'bg-powder-500 dark:bg-powder-400'
                      : 'bg-slate-100 dark:bg-zinc-800'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 1: IDENTITY & CONTACT ─────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                Welcome to Nomadic
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Let's set up your profile for personalized learning and autonomous ATS applications.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-powder-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Last Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Morgan"
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-powder-500 transition"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                  Phone Number <span className="text-slate-400 font-normal">(Used for ATS auto-fills)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-powder-500 transition"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {onSwitchToLogin ? (
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 transition"
                >
                  Already have an account? Sign in
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!firstName.trim()}
                className="px-5 py-2.5 bg-black hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-black rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: CAREER GOAL & AMBITION ─────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                What is your target role?
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Nomadic creates tailored roadmaps and scans live ATS feeds matching your career goal.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                  Target Title / Profession <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={targetRoleTitle}
                    onChange={(e) => setTargetRoleTitle(e.target.value)}
                    placeholder="e.g. Software Engineer, Product Manager, UI/UX Designer..."
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-powder-500 transition"
                  />
                </div>

                {/* Role Suggestion Pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-mono text-slate-400">Suggestions:</span>
                  {ROLE_SUGGESTIONS.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setTargetRoleTitle(role)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition ${
                        targetRoleTitle === role
                          ? 'border-powder-500 bg-powder-50 dark:bg-powder-950/60 text-powder-900 dark:text-powder-300 font-bold'
                          : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:border-slate-400'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Experience Level Selector */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                  Experience Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {EXPERIENCE_LEVELS.map((lvl) => {
                    const isSelected = experienceLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setExperienceLevel(lvl.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-black dark:border-white bg-slate-50 dark:bg-zinc-800/80'
                            : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                          {lvl.label}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          {lvl.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!targetRoleTitle.trim()}
                className="px-5 py-2.5 bg-black hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-black rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: TIMELINE, DAILY RHYTHM & RESUME ────────────────────── */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                Target Rhythm &amp; Resume
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Configure your pace and attach your resume for automated ATS applications.
              </p>
            </div>

            <div className="space-y-4">
              {/* Target Horizon */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                  Target Timeline Horizon
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TIMELINE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTargetHorizon(opt.id)}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        targetHorizon === opt.id
                          ? 'border-black dark:border-white bg-slate-50 dark:bg-zinc-800 font-bold text-slate-900 dark:text-zinc-100'
                          : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs">{opt.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Commitment */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                  Daily Time Commitment
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {COMMITMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDailyCommitment(opt.id)}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        dailyCommitment === opt.id
                          ? 'border-black dark:border-white bg-slate-50 dark:bg-zinc-800 font-bold text-slate-900 dark:text-zinc-100'
                          : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs">{opt.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resume File Upload Card */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                  Attach Resume Document <span className="text-slate-400 font-normal">(.pdf or .docx)</span>
                </label>
                <div className="p-4 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between bg-slate-50 dark:bg-zinc-950">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-300">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate max-w-[200px] sm:max-w-xs">
                        {uploadedResumeName || uploadedResumePath.split(/[/\\]/).pop() || 'No resume file attached yet'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {uploadedResumePath ? '✓ Attached for 1-click ATS auto-apply' : 'Optional — you can also add it later in Profile'}
                      </div>
                    </div>
                  </div>

                  <label className="cursor-pointer px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-400 rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 transition shadow-xs flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadedResumePath ? 'Change' : 'Browse'}</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc"
                      className="hidden"
                      onChange={handlePickResumeFile}
                      disabled={isPickingResumeFile}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-5 py-2.5 bg-black hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-black rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: SKILLS & AI SYNTHESIS ──────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                Select your key skills
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Click suggestions below or type custom tools to tailor your curriculum and auto-matches.
              </p>
            </div>

            <div className="space-y-4">
              {/* Custom Skill Input */}
              <form onSubmit={handleAddSkill} className="flex gap-2">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  placeholder="Type custom skill and press Enter..."
                  className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-powder-500 transition"
                />
                <button
                  type="submit"
                  disabled={!newSkillInput.trim()}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-900 dark:text-zinc-100 rounded-xl text-xs font-semibold transition disabled:opacity-40"
                >
                  Add
                </button>
              </form>

              {/* Suggestions Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Suggested Competencies
                  </span>
                  {selectedSkills.size > 0 && (
                    <span className="text-[10px] font-mono text-powder-600 dark:text-powder-400 font-bold">
                      {selectedSkills.size} selected
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pt-0.5">
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
                            : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-700 dark:text-zinc-300 hover:border-slate-400'
                        }`}
                      >
                        {active ? <Check className="w-3 h-3 text-emerald-400 dark:text-emerald-600" /> : <Plus className="w-3 h-3 text-slate-400" />}
                        <span>{skill}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {aiError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-600 dark:text-red-400">
                {aiError}
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateAIProfile}
                disabled={isGenerating}
                className="px-5 py-2.5 bg-black hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-black rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shadow-xs"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing OS...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-powder-400" />
                    <span>Generate Career OS</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: REVIEW SYNTHESIZED PROFILE & LAUNCH ────────────────── */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="space-y-1 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Operating System Synthesized</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                Ready to Launch
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
                Your personalized learning curriculum, 428+ company question bank, and ATS radar are prepared.
              </p>
            </div>

            {/* Profile & Roadmap Summary Card */}
            <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
                <div>
                  <div className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                    {firstName} {lastName}
                  </div>
                  <div className="text-slate-500 text-[11px] font-mono">
                    {targetRoleTitle} · {targetHorizon} Horizon
                  </div>
                </div>
                <div className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg font-mono text-[10px] text-powder-600 dark:text-powder-400 font-bold">
                  {experienceLevel.toUpperCase()}
                </div>
              </div>

              {synthesizedRoadmap && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                    {synthesizedRoadmap.title || '4-Phase Career Mastery Roadmap'}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    {synthesizedRoadmap.milestones?.slice(0, 4).map((m: any, idx: number) => (
                      <div key={idx} className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80">
                        <div className="font-bold text-slate-900 dark:text-zinc-100 truncate">{m.title}</div>
                        <div className="text-slate-400">{m.estimatedHours || 25} hours estimated</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Adjust Skills</span>
              </button>

              <button
                type="button"
                onClick={handleFinalizeAndLaunch}
                className="px-6 py-3 bg-black hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-black rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md active:scale-95"
              >
                <span>Launch My Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
