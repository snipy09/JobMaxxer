import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowRight, ArrowLeft, Check, Sparkles, User,
  Briefcase, Target, Clock, ShieldCheck, Search,
  Compass, BookOpen, MessageSquare, Zap, Star,
  Terminal, Layers, CheckCircle2, ChevronRight,
  GraduationCap, Award, Rocket, Code2, MapPin, Phone, Mail
} from 'lucide-react';
import { MasterProfile, getApi } from '../types';
import {
  JobRole,
  suggestRolesFromUserInput,
  generateTailoredRoadmapForRole,
  TailoredRoadmapSummary
} from '../data/jobRolesDataset';

interface OnboardingWizardProps {
  initialProfile: MasterProfile;
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
  onComplete,
  onSwitchToLogin,
}) => {
  const [step, setStep] = useState<number>(1);
  const totalSteps = 5;

  // ── SCREEN 1: Candidate Basics ────────────────────────────────────────────
  const [firstName, setFirstName] = useState<string>(initialProfile.firstName || '');
  const [lastName, setLastName] = useState<string>(initialProfile.lastName || '');
  const [email, setEmail] = useState<string>(initialProfile.email || '');
  const [phone, setPhone] = useState<string>(initialProfile.phone || '');
  const [careerAspiration, setCareerAspiration] = useState<string>(
    initialProfile.desiredTitle
      ? `Looking for ${initialProfile.desiredTitle} roles`
      : 'Building AI agents and modern web applications with scalable backend systems'
  );

  // ── SCREEN 2: Experience & Background ─────────────────────────────────────
  const [selectedExp, setSelectedExp] = useState<string>('fresher');
  const [selectedEdu, setSelectedEdu] = useState<string>('cs_degree');

  // ── SCREEN 3: Technical Skills ────────────────────────────────────────────
  const [skillsText, setSkillsText] = useState<string>(
    initialProfile.techStack || 'React, TypeScript, Node.js, Python, PostgreSQL'
  );
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

  // ── SCREEN 4: Goals & Bandwidth ───────────────────────────────────────────
  const [selectedHorizon, setSelectedHorizon] = useState<string>('2m');
  const [selectedHours, setSelectedHours] = useState<string>('2h');
  const [selectedGoal, setSelectedGoal] = useState<string>('switch');

  // ── SCREEN 5: AI Role Suggestions & Live Roadmap ──────────────────────────
  // Synthesize user inputs across all screens into a semantic search query for the 10,000 dataset
  const combinedUserQuery = useMemo(() => {
    const skillsArr = Array.from(selectedSkills).join(', ');
    return `${careerAspiration} ${skillsText} ${skillsArr}`.trim();
  }, [careerAspiration, skillsText, selectedSkills]);

  const aiRoleSuggestions = useMemo(() => {
    return suggestRolesFromUserInput(combinedUserQuery, 3);
  }, [combinedUserQuery]);

  const [selectedRole, setSelectedRole] = useState<JobRole>(() => {
    return aiRoleSuggestions[0] || {
      id: 1,
      title: initialProfile.desiredTitle || 'Full Stack Engineer',
      domain: 'Full Stack Development',
      seniority: 'Mid-Level',
      industry: 'Enterprise SaaS',
      coreSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
      salaryIndia: '₹14 LPA – ₹30 LPA',
      salaryGlobal: '$95k – $165k',
      roadmapId: 'fullstack',
      keyTopics: ['Architecture', 'APIs', 'Database Modeling'],
      interviewQuestions: ['How do you architect an end-to-end type-safe API?'],
      matchScore: 98,
    };
  });

  // Whenever AI suggestions update, pick the top match if user hasn't manually locked one
  useEffect(() => {
    if (aiRoleSuggestions.length > 0) {
      setSelectedRole(aiRoleSuggestions[0]);
    }
  }, [aiRoleSuggestions]);

  // Generate dynamic 5-phase roadmap for selected role
  const roadmapPlan: TailoredRoadmapSummary = useMemo(() => {
    return generateTailoredRoadmapForRole(selectedRole);
  }, [selectedRole]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleFinishOnboarding = async () => {
    setIsSubmitting(true);
    const finalProfile: MasterProfile = {
      ...initialProfile,
      firstName: firstName || 'Alex',
      lastName: lastName || 'Vance',
      email: email || 'candidate@hirestack.app',
      phone: phone || '',
      desiredTitle: selectedRole.title,
      techStack: Array.from(selectedSkills).join(', '),
      onboardingCompleted: true,
    };

    const api = getApi();
    if (api) {
      await api.saveMasterProfile(finalProfile as any);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      onComplete(finalProfile);
    }, 400);
  };

  const stepsLabels = ['Basics', 'Background', 'Skills', 'Goals', 'Curriculum'];

  return (
    <div className="min-h-screen bg-[#FBFBFD] dark:bg-[#0A0A0C] text-slate-900 dark:text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans select-none">
      
      <div className="w-full max-w-2xl space-y-6">
        
        {/* ── APPLE-STYLE MINIMALIST PROGRESS INDICATOR ──────────────────────── */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center font-black text-xs shadow-xs">
              HS
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">Hirestack Setup</span>
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
                  Welcome to Hirestack. Let's begin.
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Your identity is stored locally on your device and used to pre-fill applications.
                </p>
              </div>

              <div className="space-y-4">
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
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex.vance@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none text-xs text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-zinc-600 transition-colors"
                  />
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

                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    What are you aiming for in your career right now?
                  </label>
                  <textarea
                    value={careerAspiration}
                    onChange={(e) => setCareerAspiration(e.target.value)}
                    rows={2}
                    placeholder="E.g. Transitioning into AI Engineering, building agents with LangChain & full stack Next.js web applications..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none text-xs text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-zinc-600 transition-colors resize-none leading-relaxed"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
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

              {/* Interactive MCQ Chips */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Quick Select Core Technologies ({selectedSkills.size} selected)
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

              {/* Top AI Job Title Suggestions from 10,000 Dataset */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  AI-Detected Job Titles (Click to select target)
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
                    <span>Launching Dashboard...</span>
                  ) : (
                    <>
                      <span>Launch My Personalized Hirestack Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
