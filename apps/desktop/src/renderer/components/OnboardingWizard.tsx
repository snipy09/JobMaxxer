import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowRight, ArrowLeft, Check, Sparkles, User,
  Briefcase, Target, Clock, ShieldCheck, Search,
  Compass, BookOpen, MessageSquare, Zap, Star,
  Terminal, Layers, CheckCircle2, ChevronRight,
  GraduationCap, Award, Rocket, Code2, MapPin, Phone, Mail, Loader2
} from 'lucide-react';
import {
  JobRole,
  suggestRolesFromUserInput,
  searchRoleTitles,
  generateTailoredRoadmapForRole,
  TailoredRoadmapSummary
} from '../data/jobRolesDataset';
import { MasterProfile, AppUser, getApi } from '../types';

interface OnboardingWizardProps {
  initialProfile: MasterProfile;
  currentUser?: AppUser | null;
  onComplete: (profile: MasterProfile) => void;
  onSwitchToLogin?: () => void;
}

// ── MCQ OPTIONS ─────────────────────────────────────────────────────────────
const EXPERIENCE_LEVELS = [
  { id: 'fresher', label: 'Student / Recent Graduate', sub: '0 – 1 years experience · Looking for internships or entry-level roles' },
  { id: 'junior', label: 'Junior Developer', sub: '1 – 2 years experience · Solid core foundations, looking to level up' },
  { id: 'mid', label: 'Mid-Level Engineer', sub: '2 – 5 years experience · Production experience, building scalable systems' },
  { id: 'senior', label: 'Senior / Staff Specialist', sub: '5+ years experience · System architecture, technical leadership' },
  { id: 'switcher', label: 'Career Switcher', sub: 'Transitioning from another field into software and modern tech' },
];

const EDUCATION_OPTIONS = [
  { id: 'cs_degree', label: 'B.Tech / B.E. in Computer Science', sub: 'Engineering degree in CS, IT, or related technical disciplines' },
  { id: 'masters', label: "Master's / MCA / MS", sub: 'Advanced graduate degree in Computer Science or Data Science' },
  { id: 'other_degree', label: 'Non-CS University Degree', sub: 'Degree in mechanical, commerce, sciences, or arts' },
  { id: 'bootcamp', label: 'Bootcamp / Self-Taught', sub: 'Practical project-based learning and self-directed study' },
];

const POPULAR_SKILLS = [
  'React', 'TypeScript', 'Node.js', 'Next.js', 'PostgreSQL',
  'Python', 'Tailwind CSS', 'Docker', 'REST APIs', 'Git',
  'Kubernetes', 'AWS', 'PyTorch', 'LangChain', 'Redis',
  'FastAPI', 'GraphQL', 'Kafka', 'MongoDB', 'Go (Golang)'
];

const TIMELINE_HORIZONS = [
  { id: '1m', label: '1 Month', badge: 'Intensive', desc: 'Bootcamp speed · 4–6 hours daily sprint for immediate placement' },
  { id: '2m', label: '2 – 3 Months', badge: 'Recommended', desc: 'Balanced fast track · Master core architecture and complete drills' },
  { id: '6m', label: '6 Months', badge: 'Deep Mastery', desc: 'Thorough foundations · Comprehensive portfolio and system design depth' },
];

const DAILY_COMMITMENTS = [
  { id: '1h', label: '1 Hour / Day', desc: 'Consistent daily micro-learning while working or studying' },
  { id: '2h', label: '2 – 3 Hours / Day', desc: 'Optimal pace for rapid skill acquisition and weekly project builds' },
  { id: '4h', label: '4+ Hours / Day', desc: 'Full-time immersion for rapid career transition' },
];

const PRIMARY_GOALS = [
  { id: 'internship', label: 'Land an Internship / Fresher Role', icon: GraduationCap },
  { id: 'switch', label: 'Switch to High-Paying Tech Job', icon: Rocket },
  { id: 'senior', label: 'Level Up for Senior / Staff Placement', icon: Award },
  { id: 'ai', label: 'Master AI Engineering & Modern Systems', icon: Sparkles },
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialProfile,
  currentUser,
  onComplete,
  onSwitchToLogin,
}) => {
  const [step, setStep] = useState<number>(1);
  const totalSteps = 5;

  // ── Authenticated User Info ────────────────────────────────────────────────
  const userEmail = currentUser?.email || initialProfile.email || 'user@nomadic.app';
  const initialFirst = initialProfile.firstName || (currentUser?.fullName ? currentUser.fullName.split(' ')[0] : '');
  const initialLast = initialProfile.lastName || (currentUser?.fullName ? currentUser.fullName.split(' ').slice(1).join(' ') : '');

  // ── SCREEN 1: Candidate Basics ────────────────────────────────────────────
  const [firstName, setFirstName] = useState<string>(initialFirst);
  const [lastName, setLastName] = useState<string>(initialLast);
  const [phone, setPhone] = useState<string>(initialProfile.phone || '');
  const [targetRoleTitle, setTargetRoleTitle] = useState<string>(
    initialProfile.desiredTitle || 'Full Stack Engineer'
  );

  // Real-time suggestions from 10,000 dataset as user types target role
  const targetTitleSuggestions = useMemo(() => {
    return searchRoleTitles(targetRoleTitle || 'developer', 6);
  }, [targetRoleTitle]);

  // ── SCREEN 2: Experience & Background ─────────────────────────────────────
  const [selectedExp, setSelectedExp] = useState<string>('fresher');
  const [selectedEdu, setSelectedEdu] = useState<string>('cs_degree');

  // ── SCREEN 3: Technical Skills ────────────────────────────────────────────
  const [skillsText, setSkillsText] = useState<string>(
    initialProfile.techStack || 'React, TypeScript, Node.js, Python, PostgreSQL'
  );
  const [customSkillInput, setCustomSkillInput] = useState<string>('');
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(() => {
    const s = new Set<string>(['React', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL']);
    if (initialProfile.techStack) {
      initialProfile.techStack.split(',').map(x => x.trim()).filter(Boolean).forEach(x => s.add(x));
    }
    return s;
  });

  const toggleSkillChip = (skill: string) => {
    const next = new Set(selectedSkills);
    if (next.has(skill)) next.delete(skill);
    else next.add(skill);
    setSelectedSkills(next);
  };

  const handleAddCustomSkill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customSkillInput.trim();
    if (!trimmed) return;
    const next = new Set(selectedSkills);
    next.add(trimmed);
    setSelectedSkills(next);
    setCustomSkillInput('');
  };

  // ── SCREEN 4: Goals & Bandwidth ───────────────────────────────────────────
  const [selectedHorizon, setSelectedHorizon] = useState<string>('2m');
  const [selectedHours, setSelectedHours] = useState<string>('2h');
  const [selectedGoal, setSelectedGoal] = useState<string>('switch');

  // ── SCREEN 5: Dynamic AI Role Suggestions & Live Roadmap ──────────────────
  const [roleSearchFilter, setRoleSearchFilter] = useState<string>('');

  const combinedUserQuery = useMemo(() => {
    const skillsArr = Array.from(selectedSkills).join(', ');
    return `${roleSearchFilter || targetRoleTitle} ${skillsText} ${skillsArr}`.trim();
  }, [roleSearchFilter, targetRoleTitle, skillsText, selectedSkills]);

  const aiRoleSuggestions = useMemo(() => {
    const suggestions = suggestRolesFromUserInput(combinedUserQuery, 4);
    if (targetRoleTitle && !roleSearchFilter) {
      const exists = suggestions.some(r => r.title.toLowerCase().includes(targetRoleTitle.toLowerCase()));
      if (!exists && suggestions.length > 0) {
        const customRole: JobRole = {
          ...suggestions[0],
          id: 99999,
          title: targetRoleTitle,
          matchScore: 99,
        };
        return [customRole, ...suggestions.slice(0, 3)];
      }
    }
    return suggestions;
  }, [combinedUserQuery, targetRoleTitle, roleSearchFilter]);

  const [selectedRole, setSelectedRole] = useState<JobRole>(() => {
    return aiRoleSuggestions[0] || {
      id: 1,
      title: initialProfile.desiredTitle || targetRoleTitle || 'Full Stack Engineer',
      domain: 'Full Stack Development',
      seniority: 'Mid-Level',
      industry: 'Enterprise SaaS',
      coreSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
      salaryIndia: '₹14 LPA – ₹30 LPA',
      salaryGlobal: '$95k – $165k',
      roadmapId: 'fullstack',
      keyTopics: ['Architecture', 'APIs', 'Database Modeling'],
      interviewQuestions: ['How do you architect an end-to-end type-safe API?'],
      matchScore: 99,
    };
  });

  useEffect(() => {
    if (aiRoleSuggestions.length > 0) {
      setSelectedRole(aiRoleSuggestions[0]);
    }
  }, [aiRoleSuggestions]);

  // Generate dynamic 5-phase roadmap for selected role
  const roadmapPlan: TailoredRoadmapSummary = useMemo(() => {
    return generateTailoredRoadmapForRole(selectedRole);
  }, [selectedRole]);

  // Dynamic domain recommended skills for Step 3 based on target role
  const dynamicDomainSkills = useMemo(() => {
    return selectedRole.coreSkills.length > 0 ? selectedRole.coreSkills : POPULAR_SKILLS;
  }, [selectedRole]);

  // ── Processing & Synthesis Progress ────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [synthesisProgress, setSynthesisProgress] = useState<number>(0);
  const [synthesisStep, setSynthesisStep] = useState<number>(1);

  const handleFinishOnboarding = async () => {
    setIsSubmitting(true);
    setSynthesisProgress(15);
    setSynthesisStep(1);

    setTimeout(() => {
      setSynthesisProgress(45);
      setSynthesisStep(2);
    }, 350);

    setTimeout(() => {
      setSynthesisProgress(75);
      setSynthesisStep(3);
    }, 750);

    setTimeout(() => {
      setSynthesisProgress(100);
      setSynthesisStep(4);
    }, 1150);

    setTimeout(async () => {
      try {
        const finalProfile: MasterProfile = {
          ...initialProfile,
          firstName: firstName.trim() || 'Nomadic',
          lastName: lastName.trim(),
          email: userEmail,
          phone: phone.trim(),
          desiredTitle: selectedRole?.title || initialProfile.desiredTitle || 'Software Engineer',
          techStack: Array.from(selectedSkills).join(', '),
          onboardingCompleted: true,
        };

        const api = getApi();
        if (api && api.saveMasterProfile) {
          try {
            await api.saveMasterProfile(finalProfile as any);
          } catch (saveErr) {
            console.warn('[Onboarding] Error saving profile to local database:', saveErr);
          }
        }

        setIsSubmitting(false);
        onComplete(finalProfile);
      } catch (err) {
        console.error('[Onboarding] Error finishing onboarding:', err);
        setIsSubmitting(false);
        onComplete({
          ...initialProfile,
          onboardingCompleted: true,
        });
      }
    }, 1550);
  };

  const stepsLabels = ['Basics', 'Background', 'Skills', 'Goals', 'Curriculum'];

  return (
    <div className="min-h-screen bg-[#FBFBFD] dark:bg-[#0A0A0C] text-slate-900 dark:text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans select-none">
      
      <div className="w-full max-w-2xl space-y-6">
        
        {/* ── APPLE-STYLE MINIMALIST PROGRESS INDICATOR ──────────────────────── */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center font-black text-xs shadow-xs">
              NM
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">Nomadic Setup</span>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                {stepsLabels[step - 1]} · Step {step} of {totalSteps}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === s
                      ? 'w-7 bg-slate-900 dark:bg-white'
                      : step > s
                      ? 'w-3.5 bg-emerald-500'
                      : 'w-3.5 bg-slate-200 dark:bg-zinc-800'
                  }`}
                />
              ))}
            </div>
            {onSwitchToLogin && (
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-[11px] text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white font-medium transition-colors ml-1"
              >
                Sign In →
              </button>
            )}
          </div>
        </div>

        {/* ── CARD CONTAINER (APPLE CLEAN MINIMALISM) ─────────────────────────── */}
        <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">

          {/* ═══════════════════════════════════════════════════════════════════
              SCREEN 1: CANDIDATE BASICS (TEXT INPUTS)
          ═══════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-up">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">Step 1</span>
                <h2 className="text-2xl font-bold text-slate-950 dark:text-white tracking-tight">
                  Welcome to Nomadic. Let's begin.
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Your identity is stored locally on your device and used to pre-fill applications.
                </p>
              </div>

              <div className="space-y-4">
                {/* Verified Account Card - Don't ask for Gmail */}
                <div className="p-3 bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-slate-900 dark:text-white shadow-2xs">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{userEmail}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Verified Account
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">Linked authentication identity</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Alex"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none text-xs text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-zinc-600 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Vance"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none text-xs text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-zinc-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none text-xs text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-zinc-600 transition-colors"
                  />
                </div>

                {/* Dynamic Target Role / Career Goal Search & Suggestions */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Target Job Role / Career Goal
                    </label>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      10,000+ dynamic roles index
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={targetRoleTitle}
                      onChange={(e) => setTargetRoleTitle(e.target.value)}
                      placeholder="E.g. Full Stack Engineer, AI Engineer, Frontend Developer..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none text-xs text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-zinc-600 transition-colors pl-9"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Dynamic Suggestions from 10k dataset */}
                  <div className="space-y-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-400 font-mono">Dynamic suggestions from dataset:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {targetTitleSuggestions.map((title) => {
                        const isMatch = targetRoleTitle.toLowerCase().trim() === title.toLowerCase().trim();
                        return (
                          <button
                            key={title}
                            type="button"
                            onClick={() => setTargetRoleTitle(title)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                              isMatch
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-semibold'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (firstName.trim()) {
                    setStep(2);
                  }
                }}
                disabled={!firstName.trim()}
                className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SCREEN 2: EDUCATION & EXPERIENCE (MCQ CARDS)
          ═══════════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-up">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">Step 2</span>
                <h2 className="text-2xl font-bold text-slate-950 dark:text-white tracking-tight">
                  Experience &amp; Background
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Select your current career stage so we calibrate your difficulty curve and roadmap depth.
                </p>
              </div>

              {/* Experience Level MCQ */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Current Experience Level
                </label>
                <div className="space-y-2">
                  {EXPERIENCE_LEVELS.map((opt) => {
                    const isSelected = selectedExp === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setSelectedExp(opt.id)}
                        className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-slate-950 dark:border-white bg-slate-50 dark:bg-zinc-800/60 shadow-xs'
                            : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-950 dark:text-white">{opt.label}</h4>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400">{opt.sub}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-slate-950 dark:border-white bg-slate-950 dark:bg-white text-white dark:text-slate-950'
                            : 'border-slate-300 dark:border-zinc-700'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Education Background MCQ */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Educational Background
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EDUCATION_OPTIONS.map((opt) => {
                    const isSelected = selectedEdu === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setSelectedEdu(opt.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'border-slate-950 dark:border-white bg-slate-50 dark:bg-zinc-800/60 shadow-xs'
                            : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div>
                          <h5 className="text-xs font-bold text-slate-950 dark:text-white">{opt.label}</h5>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">{opt.sub}</p>
                        </div>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'border-slate-950 dark:border-white bg-slate-950 dark:bg-white text-white dark:text-slate-950'
                            : 'border-slate-300 dark:border-zinc-700'
                        }`}>
                          {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>Continue to Skills</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SCREEN 3: TECHNICAL STACK & TOOLS (TEXT + MCQ CHIPS)
          ═══════════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-up">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">Step 3</span>
                <h2 className="text-2xl font-bold text-slate-950 dark:text-white tracking-tight">
                  Technical Stack &amp; Tools
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Select the technologies you know or want to specialize in.
                </p>
              </div>

              {/* Text Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Technical background &amp; frameworks
                </label>
                <input
                  type="text"
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  placeholder="E.g. React, Next.js, Node.js, Python, PostgreSQL, Docker, AWS..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none text-xs text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-zinc-600 transition-colors"
                />
              </div>

              {/* Dynamic Domain Skills */}
              {dynamicDomainSkills.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Recommended for {selectedRole.title}
                    </label>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      Dynamically calibrated
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dynamicDomainSkills.map((skill) => {
                      const isSelected = selectedSkills.has(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkillChip(skill)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'border-emerald-600 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 shadow-2xs'
                              : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-300 hover:border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />}
                          <span>{skill}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add Custom Skill Dynamically */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Add Any Custom Skill or Framework
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSkill();
                      }
                    }}
                    placeholder="Type custom skill (e.g. Rust, PyTorch, GraphQL) and press Enter"
                    className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none text-xs text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-zinc-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSkill}
                    disabled={!customSkillInput.trim()}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 transition-colors disabled:opacity-50"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* General Core Technologies */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Popular Core Technologies ({selectedSkills.size} selected)
                </label>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SKILLS.map((skill) => {
                    const isSelected = selectedSkills.has(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkillChip(skill)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'border-slate-950 dark:border-white bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                            : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-300 hover:border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{skill}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>Continue to Goals</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SCREEN 4: GOALS & COMMITMENT (MCQ GRIDS)
          ═══════════════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-up">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">Step 4</span>
                <h2 className="text-2xl font-bold text-slate-950 dark:text-white tracking-tight">
                  Timeline &amp; Primary Objective
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Calibrate your target horizon and daily study bandwidth.
                </p>
              </div>

              {/* Primary Objective MCQ */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Primary Career Objective
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRIMARY_GOALS.map((g) => {
                    const isSelected = selectedGoal === g.id;
                    const IconComponent = g.icon;
                    return (
                      <div
                        key={g.id}
                        onClick={() => setSelectedGoal(g.id)}
                        className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-slate-950 dark:border-white bg-slate-50 dark:bg-zinc-800/60 shadow-xs'
                            : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-slate-300'
                        }`}
                      >
                        <div className={`p-2 rounded-xl ${isSelected ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{g.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Timeline Horizon MCQ */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Target Timeline Horizon
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {TIMELINE_HORIZONS.map((h) => {
                    const isSelected = selectedHorizon === h.id;
                    return (
                      <div
                        key={h.id}
                        onClick={() => setSelectedHorizon(h.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all space-y-1 ${
                          isSelected
                            ? 'border-slate-950 dark:border-white bg-slate-50 dark:bg-zinc-800/60 shadow-xs'
                            : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-950 dark:text-white">{h.label}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold">{h.badge}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight">{h.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Daily Bandwidth MCQ */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Daily Study Bandwidth
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {DAILY_COMMITMENTS.map((c) => {
                    const isSelected = selectedHours === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedHours(c.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all space-y-1 ${
                          isSelected
                            ? 'border-slate-950 dark:border-white bg-slate-50 dark:bg-zinc-800/60 shadow-xs'
                            : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-950 dark:text-white">{c.label}</span>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight">{c.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="flex-1 py-3 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>Synthesize Career Role &amp; Roadmap</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SCREEN 5: AI JOB TITLE SUGGESTIONS & LIVE ROADMAP LOADER
          ═══════════════════════════════════════════════════════════════════ */}
          {step === 5 && (
            <div className="space-y-6 animate-fade-up">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span>10,000+ Job Roles AI Index</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-950 dark:text-white tracking-tight">
                  Suggested Job Roles &amp; Live Curriculum
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Based on your skills and goals, select your target role below to load your personalized roadmap.
                </p>
              </div>

              {/* Dynamic Live Role Search & Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Live Search or Select Target Role
                  </label>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    Dynamic Matching
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={roleSearchFilter}
                    onChange={(e) => setRoleSearchFilter(e.target.value)}
                    placeholder="Type to test any other title (e.g. AI Systems Architect, SRE, Rust Engineer)..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none text-xs text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-zinc-600 transition-colors pl-9"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Top AI Job Title Suggestions from 10,000 Dataset */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  AI-Synthesized Target Roles (Click to select)
                </label>

                <div className="space-y-2">
                  {aiRoleSuggestions.map((role) => {
                    const isSelected = selectedRole.title === role.title;
                    return (
                      <div
                        key={role.id}
                        onClick={() => setSelectedRole(role)}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-slate-950 dark:border-white bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-md ring-1 ring-slate-950'
                            : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-900 dark:text-white'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-950'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}>
                              ✨ {role.matchScore}% Match
                            </span>
                            <span className="text-[10px] font-mono opacity-70">
                              {role.domain} · {role.industry}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold tracking-tight">
                            {role.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] font-mono opacity-80 pt-0.5">
                            <span>🇮🇳 {role.salaryIndia}</span>
                            <span>·</span>
                            <span>🌐 {role.salaryGlobal}</span>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-white bg-white text-slate-950 dark:border-slate-950 dark:bg-slate-950 dark:text-white'
                            : 'border-slate-300 dark:border-zinc-700'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── ACTUALLY LOADED TAILORED ROADMAP PREVIEW ─────────────────── */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-500" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Loaded Roadmap: {selectedRole.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                        5-Stage milestone progression calibrated for {selectedHorizon === '1m' ? '1 Month' : selectedHorizon === '2m' ? '2-3 Months' : '6 Months'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Live Loaded ✓
                  </span>
                </div>

                {/* 5 Milestone Cards */}
                <div className="space-y-2">
                  {roadmapPlan.milestones.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300">
                            Phase {idx + 1}
                          </span>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white">{m.title}</h5>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                          {m.description}
                        </p>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {m.skills.map((sk, j) => (
                            <span key={j} className="text-[9px] font-mono px-1.5 py-0.2 bg-slate-50 dark:bg-zinc-900 rounded border border-slate-200/60 dark:border-zinc-700 text-slate-600 dark:text-zinc-400">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 mt-0.5">{m.hours}h</span>
                    </div>
                  ))}
                </div>

                {/* Interview Drills Preview */}
                <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-zinc-200">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                    <span>Loaded Technical Drills:</span>
                  </div>
                  {roadmapPlan.interviewQuestions.map((q, idx) => (
                    <p key={idx} className="text-[11px] text-slate-600 dark:text-zinc-300 italic pl-5">
                      • "{q}"
                    </p>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleFinishOnboarding}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Workspace ({synthesisProgress}%)...</span>
                    </div>
                  ) : (
                    <>
                      <span>Launch My Personalized Nomadic Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          FULL ANIMATED SYNTHESIS & LAUNCH PROCESSING OVERLAY
      ═══════════════════════════════════════════════════════════════════════ */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="w-full max-w-md bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 animate-scale-in">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                Synthesizing Your Career Workspace
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Tailoring learning milestones &amp; radar engines for {selectedRole.title}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono font-semibold text-slate-500 dark:text-zinc-400">
                <span>Synthesis Status</span>
                <span>{synthesisProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                  style={{ width: `${synthesisProgress}%` }}
                />
              </div>
            </div>

            {/* Step Checklist */}
            <div className="space-y-2.5 pt-1 text-xs">
              <div className="flex items-center gap-2.5">
                {synthesisStep > 1 ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                ) : (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                )}
                <span className={synthesisStep >= 1 ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-400'}>
                  Compiling 5-stage personalized roadmap for {selectedRole.title}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {synthesisStep > 2 ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                ) : synthesisStep === 2 ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                ) : (
                  <span className="w-5 h-5 rounded-full border border-slate-200 dark:border-zinc-800 shrink-0" />
                )}
                <span className={synthesisStep >= 2 ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-400'}>
                  Calibrating technical interview drills &amp; evaluation models
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {synthesisStep > 3 ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                ) : synthesisStep === 3 ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                ) : (
                  <span className="w-5 h-5 rounded-full border border-slate-200 dark:border-zinc-800 shrink-0" />
                )}
                <span className={synthesisStep >= 3 ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-400'}>
                  Initializing encrypted local SQLite workspace &amp; profiles
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {synthesisStep >= 4 ? (
                  <Loader2 className="w-5 h-5 text-emerald-500 animate-spin shrink-0" />
                ) : (
                  <span className="w-5 h-5 rounded-full border border-slate-200 dark:border-zinc-800 shrink-0" />
                )}
                <span className={synthesisStep >= 4 ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                  Launching your Nomadic dashboard...
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
