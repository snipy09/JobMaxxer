import React, { useState, useMemo } from 'react';
import {
  ArrowRight, ArrowLeft, Check, User,
  Briefcase, Target, Clock, Search,
  Compass, BookOpen, Layers, CheckCircle2,
  Code2, Phone, Mail, Loader2, Key, Upload, FileText,
  Shield, Cpu, Zap, Sparkles, ExternalLink
} from 'lucide-react';
import { MasterProfile, AppUser, getApi } from '../types';

interface OnboardingWizardProps {
  initialProfile: MasterProfile;
  currentUser?: AppUser | null;
  onComplete: (profile: MasterProfile) => void;
  onSwitchToLogin?: () => void;
}

const EXPERIENCE_LEVELS = [
  { id: 'fresher', label: 'Fresher / Student', desc: '0 – 1 years · Looking for internships or entry-level positions' },
  { id: 'junior', label: 'Junior Associate', desc: '1 – 2 years · Solid fundamentals, looking to level up' },
  { id: 'mid', label: 'Mid-Level Specialist', desc: '2 – 5 years · Experience delivering real-world projects & outcomes' },
  { id: 'senior', label: 'Senior / Lead', desc: '5+ years · Strategy, system leadership, and high-stakes execution' },
  { id: 'switcher', label: 'Career Switcher', desc: 'Transitioning from another discipline into this career path' },
];

const DEFAULT_POPULAR_SKILLS = [
  'Product Strategy', 'UI/UX Design', 'Figma', 'TypeScript',
  'React', 'Growth Marketing', 'SQL', 'Project Management',
  'Financial Modeling', 'Data Analysis', 'SEO / SEM', 'Python',
  'User Research', 'Brand Strategy', 'Workflow Automation', 'Operations'
];

const SUGGESTED_ROLES = [
  'Product Manager',
  'UI/UX & Product Designer',
  'Full Stack Software Engineer',
  'Growth Marketing Manager',
  'Data & Business Analyst',
  'Financial Analyst',
  'Operations Lead',
  'Content & Brand Strategist',
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

  // Step 1 State: Core Inputs
  const [firstName, setFirstName] = useState<string>(initialFirst);
  const [lastName, setLastName] = useState<string>(initialLast);
  const [phone, setPhone] = useState<string>(initialProfile.phone || '');
  const [targetRoleTitle, setTargetRoleTitle] = useState<string>(initialProfile.desiredTitle || 'Product Manager');
  const [experienceLevel, setExperienceLevel] = useState<string>(initialProfile.experienceLevel || 'fresher');
  const [bioOrResumeText, setBioOrResumeText] = useState<string>(initialProfile.resumeText || '');
  const [customGeminiKey, setCustomGeminiKey] = useState<string>(initialProfile.geminiApiKey || '');
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(() => {
    const s = new Set<string>(['Product Strategy', 'UI/UX Design', 'User Research', 'SQL']);
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
        geminiKey: customGeminiKey.trim() || undefined,
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
          experienceLevel: experienceLevel as any,
          geminiApiKey: customGeminiKey.trim() || undefined,
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
                keyConcepts: ['Core theory', 'Workflow standards', 'Daily toolkits'],
                resources: [
                  { title: 'Foundational Overview & Guide', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(targetRoleTitle + ' basics')}`, type: 'video' }
                ]
              }
            ]
          },
          {
            id: 'phase-2',
            title: 'Phase 2: Intermediate Execution & Strategy',
            level: 'Practice',
            estimatedHours: 30,
            description: 'Practical project deliverables, case studies, and artifact creation.',
            subModules: [
              {
                id: 'sub-2-1',
                title: 'Deliverables & Case Execution',
                description: 'Hands-on workflow execution and deliverable management.',
                keyConcepts: ['Execution framework', 'Quality metrics', 'Collaboration'],
                resources: [
                  { title: 'Case Study & Project Guide', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(targetRoleTitle + ' case study')}`, type: 'video' }
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
        experienceLevel: experienceLevel as any,
        geminiApiKey: customGeminiKey.trim() || undefined,
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
      geminiApiKey: customGeminiKey.trim() || undefined,
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
          targetHorizon: '2 Months',
          dailyCommitment: '2 Hours/Day',
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

      {/* Main Container */}
      <div className="max-w-3xl w-full mx-auto my-auto py-8">
        
        {step === 1 ? (
          /* ── STEP 1: CANDIDATE INFO & UNIVERSAL CAREER GOAL ──────────────── */
          <div className="space-y-8 animate-in fade-in duration-200">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                Initialize your career profile
              </h1>
              <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1">
                Enter your target role across any discipline (Product, Design, Marketing, Finance, Engineering, Operations). Gemini AI will analyze your background and structure your learning roadmap.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    disabled
                    value={userEmail || 'user@nomadic.app'}
                    className="w-full bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-500 dark:text-zinc-400 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Target Role with Real-time autocomplete suggestions */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Target Role / Career Goal <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={targetRoleTitle}
                  onChange={(e) => setTargetRoleTitle(e.target.value)}
                  placeholder="e.g. Product Manager, UI/UX Designer, Growth Marketing, Software Engineer, Financial Analyst"
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 transition"
                />
              </div>

              {/* Popular career role suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-slate-400 dark:text-zinc-500">Popular Paths:</span>
                {SUGGESTED_ROLES.map((title) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => setTargetRoleTitle(title)}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition"
                  >
                    {title}
                  </button>
                ))}
              </div>
            </div>

            {/* Seniority Level */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Current Experience Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {EXPERIENCE_LEVELS.slice(0, 3).map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setExperienceLevel(lvl.id)}
                    className={`text-left p-3 rounded-xl border text-xs transition ${
                      experienceLevel === lvl.id
                        ? 'border-black dark:border-white bg-slate-50 dark:bg-zinc-900 font-semibold text-slate-950 dark:text-white'
                        : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    <div className="font-medium text-slate-900 dark:text-zinc-200">{lvl.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5">{lvl.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Skills selection */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Key Skills & Competencies
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_POPULAR_SKILLS.map((skill) => {
                  const active = selectedSkills.has(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                        active
                          ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-medium'
                          : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {skill}
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

            {/* Resume / Background Text */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Summary, Bio or Resume Notes (Optional)
              </label>
              <textarea
                value={bioOrResumeText}
                onChange={(e) => setBioOrResumeText(e.target.value)}
                rows={3}
                placeholder="Paste your resume summary, portfolio details, or experience notes. Gemini will use this to fine-tune your personalized curriculum."
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-3 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 transition resize-none font-mono"
              />
            </div>

            {/* Optional Custom Gemini Key */}
            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-3 bg-slate-50/50 dark:bg-zinc-900/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-500" /> Google Gemini API Key (Optional)
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                  Built-in Free AI Active
                </span>
              </div>
              <input
                type="password"
                value={customGeminiKey}
                onChange={(e) => setCustomGeminiKey(e.target.value)}
                placeholder="Paste your personal Gemini API key or leave blank for built-in engine"
                className="w-full bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-slate-400 transition font-mono"
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
                    <span>Analyzing with Gemini...</span>
                  </>
                ) : (
                  <>
                    <span>Generate AI Track & Roadmap</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ── STEP 2: AI SYNTHESIS REVIEW & CONFIRMATION ──────────────────── */
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                Review Your Learning Track
              </h1>
              <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1">
                Gemini synthesized a comprehensive curriculum for {synthesizedProfile.desiredTitle || targetRoleTitle}. You can launch directly into your personalized workspace.
              </p>
            </div>

            {/* Profile Overview Card */}
            <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-4">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {firstName} {lastName}
                  </div>
                  <div className="text-xs font-mono text-slate-500 dark:text-zinc-400 mt-0.5">
                    {userEmail || 'user@nomadic.app'} · {phone}
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-200">
                  {synthesizedProfile.desiredTitle || targetRoleTitle}
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase text-slate-400 dark:text-zinc-500">
                  Core Competencies & Tools
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(synthesizedProfile.techStack || '').split(',').map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200"
                    >
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Estimated Compensation */}
              {synthesizedProfile.desiredSalary && (
                <div className="text-xs text-slate-600 dark:text-zinc-400 flex items-center gap-2">
                  <span className="text-slate-400 dark:text-zinc-500">Market Range:</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-zinc-100">
                    {synthesizedProfile.desiredSalary}
                  </span>
                </div>
              )}
            </div>

            {/* Generated Dynamic Roadmap Preview */}
            {synthesizedRoadmap && synthesizedRoadmap.milestones && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-black dark:text-white" />
                    <span>Generated Track: {synthesizedRoadmap.title}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                    {synthesizedRoadmap.milestones.length} Phases
                  </span>
                </div>

                <div className="space-y-2">
                  {synthesizedRoadmap.milestones.map((m: any, i: number) => (
                    <div
                      key={m.id || i}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-start gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center text-[10px] font-mono shrink-0 mt-0.5 font-bold">
                        {i + 1}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                            {m.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 shrink-0">
                            {m.level || 'Core'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                          {m.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Edit</span>
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={handleFinalSubmit}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 transition disabled:opacity-50 shadow-xs"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm & Go to Learner Track</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="max-w-3xl w-full mx-auto text-center border-t border-slate-100 dark:border-zinc-900 pt-4">
        <p className="text-[11px] text-slate-400 dark:text-zinc-600">
          Nomadic Offline-First Storage · Career and learning progress stored locally in SQLite
        </p>
      </div>

    </div>
  );
};
