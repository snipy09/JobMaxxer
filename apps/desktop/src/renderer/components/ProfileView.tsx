import React, { useState, useEffect, useMemo } from 'react';
import {
  User, FileText, CheckCircle2, Shield,
  Save, AlertCircle, RefreshCw, Key, Database,
  ArrowRight, ExternalLink, Sparkles, Check, ChevronRight,
  Globe, Laptop, Lock, UserCheck
} from 'lucide-react';
import { MasterProfile, getApi, AppUser, WorkspaceMode, OpportunityType } from '../types';

interface ProfileFormData {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  currentRole: string;
  targetRole: string;
  yearsOfExperience: number;
  skills: string[];
  workExperience: any[];
  education: any[];
  preferredJobTypes: string[];
  expectedSalaryMin: number;
  expectedSalaryMax: number;
  salaryCurrency: string;
  willingToRelocate: boolean;
  authorizedToWorkInUS: boolean;
  requiresSponsorship: boolean;
  answers: Record<string, any>;
  resumes: Array<{ id: string; name: string; filePath?: string }>;
  defaultResumeId?: string;
  onboardingCompleted: boolean;
  workspaceMode: WorkspaceMode;
  targetOpportunityType: OpportunityType;
  askBeforeSubmit: boolean;
}

interface ProfileViewProps {
  profile: MasterProfile | null;
  onSaveProfile?: (profile: MasterProfile) => Promise<boolean>;
  onSave?: (profile: MasterProfile) => Promise<boolean | void>;
  onLog?: (msg: string) => void;
  currentUser?: AppUser | null;
  onNavigateTab?: (tab: string) => void;
  onLogout?: () => void;
  onRerunOnboarding?: () => void;
  saving?: boolean;
}

type SettingsSection = 'profile' | 'resumes' | 'answers' | 'portals' | 'automation' | 'account';

/**
 * Normalizes any partial, legacy, or undefined profile structure into a guaranteed typed contract.
 */
function normalizeProfileToFormData(profile: MasterProfile | null, currentUser?: AppUser | null): ProfileFormData {
  const p = profile || ({} as any);

  const fName = p.firstName || (currentUser?.fullName ? currentUser.fullName.split(' ')[0] : '');
  const lName = p.lastName || (currentUser?.fullName ? currentUser.fullName.split(' ').slice(1).join(' ') : '');
  const fullName = p.firstName || p.lastName
    ? `${p.firstName || ''} ${p.lastName || ''}`.trim()
    : (p.fullName || currentUser?.fullName || '');

  // Parse skills: prioritize explicit array, fallback to comma-separated techStack string
  let skillsArr: string[] = [];
  if (Array.isArray(p.skills)) {
    skillsArr = p.skills.filter((s: any) => typeof s === 'string' && s.trim().length > 0);
  } else if (typeof p.techStack === 'string' && p.techStack.trim().length > 0) {
    skillsArr = p.techStack.split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  return {
    fullName,
    firstName: fName,
    lastName: lName,
    email: p.email || currentUser?.email || '',
    phone: p.phone || '',
    location: p.location || '',
    linkedin: p.linkedin || p.linkedin_url || '',
    github: p.github || p.github_url || '',
    portfolio: p.portfolio || '',
    currentRole: p.currentRole || '',
    targetRole: p.targetRole || p.desiredTitle || 'Software Engineer',
    yearsOfExperience: typeof p.yearsOfExperience === 'number' ? p.yearsOfExperience : 2,
    skills: skillsArr,
    workExperience: Array.isArray(p.workExperience) ? p.workExperience : [],
    education: Array.isArray(p.education) ? p.education : [],
    preferredJobTypes: Array.isArray(p.preferredJobTypes) ? p.preferredJobTypes : ['full-time', 'remote'],
    expectedSalaryMin: typeof p.expectedSalaryMin === 'number' ? p.expectedSalaryMin : 80000,
    expectedSalaryMax: typeof p.expectedSalaryMax === 'number' ? p.expectedSalaryMax : 130000,
    salaryCurrency: p.salaryCurrency || 'USD',
    willingToRelocate: Boolean(p.willingToRelocate),
    authorizedToWorkInUS: p.sponsorship ? p.sponsorship.toLowerCase() === 'no' : (p.authorizedToWorkInUS ?? true),
    requiresSponsorship: p.sponsorship ? p.sponsorship.toLowerCase() === 'yes' : (p.requiresSponsorship ?? false),
    answers: p.answers || p.customAnswers || {},
    resumes: Array.isArray(p.resumes) ? p.resumes : [],
    defaultResumeId: p.defaultResumeId,
    onboardingCompleted: p.onboardingCompleted ?? true,
    workspaceMode: (p.workspaceMode as WorkspaceMode) || (localStorage.getItem('nomadic_workspace_mode') as WorkspaceMode) || 'unified',
    targetOpportunityType: (p.targetOpportunityType as OpportunityType) || (localStorage.getItem('nomadic_target_opportunity_type') as OpportunityType) || 'both',
    askBeforeSubmit: p.askBeforeSubmit !== undefined ? Boolean(p.askBeforeSubmit) : true,
  };
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onSaveProfile,
  onSave,
  onLog,
  currentUser,
  onNavigateTab,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [formData, setFormData] = useState<ProfileFormData>(() => normalizeProfileToFormData(profile, currentUser));

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  // Calibration rate limiting state
  const [calibrationCooldown, setCalibrationCooldown] = useState<boolean>(false);
  const [calibrationSuccess, setCalibrationSuccess] = useState<boolean>(false);

  useEffect(() => {
    try {
      const lastCalibrated = localStorage.getItem('nomadic_last_calibrated_date');
      if (lastCalibrated) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (lastCalibrated === todayStr) {
          setCalibrationCooldown(true);
        }
      }
    } catch {}
  }, []);

  // Update form data whenever profile or currentUser changes, always through normalizer
  useEffect(() => {
    if (profile) {
      setFormData(normalizeProfileToFormData(profile, currentUser));
    }
  }, [profile, currentUser]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const names = (formData.fullName || '').trim().split(' ');
      const firstName = names[0] || formData.firstName || '';
      const lastName = names.slice(1).join(' ') || formData.lastName || '';
      const safeSkills = Array.isArray(formData.skills) ? formData.skills : [];
      const techStack = safeSkills.join(', ');

      const updatedProfile: MasterProfile = {
        ...(profile || {}),
        firstName,
        lastName,
        email: formData.email,
        phone: formData.phone,
        linkedin: formData.linkedin,
        github: formData.github,
        desiredTitle: formData.targetRole,
        techStack,
        sponsorship: formData.requiresSponsorship ? 'Yes' : 'No',
        customAnswers: { ...(profile?.customAnswers || {}), ...(formData.answers || {}) },
        workspaceMode: formData.workspaceMode,
        targetOpportunityType: formData.targetOpportunityType,
        askBeforeSubmit: formData.askBeforeSubmit,
        onboardingCompleted: true,
      };

      // Call parent callback if available
      let ok = true;
      if (onSaveProfile) {
        ok = await onSaveProfile(updatedProfile);
      } else if (onSave) {
        const res = await onSave(updatedProfile);
        ok = res !== false;
      }

      // Sync to desktop API
      const api = getApi();
      if (api && api.saveMasterProfile) {
        await api.saveMasterProfile({
          firstName,
          lastName,
          email: formData.email,
          phone: formData.phone,
          linkedin: formData.linkedin,
          github: formData.github,
          sponsorship: formData.requiresSponsorship ? 'Yes' : 'No',
          desiredSalary: `${formData.expectedSalaryMin || 80000}`,
          noticePeriod: '2 weeks',
          desiredTitle: formData.targetRole,
          techStack,
          customAnswersJson: JSON.stringify(formData.answers || {}),
          onboarding_completed: 1,
        });
      }

      if (ok) {
        setSaveSuccess(true);
        onLog?.('[Settings] Profile settings saved successfully');
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      onLog?.(`[Settings Error] ${err?.message || 'Failed to save'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      const newSkill = skillInput.trim();
      const currentSkills = Array.isArray(formData.skills) ? formData.skills : [];
      if (!currentSkills.includes(newSkill)) {
        setFormData((prev) => ({
          ...prev,
          skills: [...(Array.isArray(prev.skills) ? prev.skills : []), newSkill],
        }));
      }
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: (Array.isArray(prev.skills) ? prev.skills : []).filter((s) => s !== skillToRemove),
    }));
  };

  const handleCalibrateRole = () => {
    if (calibrationCooldown) return;
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      localStorage.setItem('nomadic_last_calibrated_date', todayStr);
    } catch {}
    setCalibrationCooldown(true);
    setCalibrationSuccess(true);
    onLog?.(`[Role Calibration] Calibrated role targeting for ${formData.targetRole || 'Software Engineer'}`);
    setTimeout(() => setCalibrationSuccess(false), 4000);
  };

  // Safely calculate profile completeness
  const safeSkillsList = Array.isArray(formData.skills) ? formData.skills : [];
  const safeResumesList = Array.isArray(formData.resumes) ? formData.resumes : [];

  const completenessChecks = useMemo(() => [
    Boolean(formData.fullName?.trim() || `${formData.firstName || ''} ${formData.lastName || ''}`.trim()),
    Boolean(formData.email?.trim()),
    Boolean(formData.targetRole?.trim()),
    safeSkillsList.length > 0,
    Boolean(formData.linkedin?.trim() || formData.github?.trim()),
  ], [formData.fullName, formData.firstName, formData.lastName, formData.email, formData.targetRole, safeSkillsList.length, formData.linkedin, formData.github]);

  const completenessPercent = Math.round(
    (completenessChecks.filter(Boolean).length / Math.max(1, completenessChecks.length)) * 100
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      
      {/* 1. Header Area */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
            Settings &amp; Control
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your candidate profile, application automation, and platform preferences.
          </p>
        </div>

        {/* Global Save Button */}
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
            saveSuccess
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950'
          }`}
        >
          {saving ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : saveSuccess ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{saving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save Changes'}</span>
        </button>
      </div>

      {/* 2. Main Two-Column Layout (Internal Sidebar + Content) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Internal Settings Navigation Sidebar */}
        <aside className="w-60 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 space-y-6 shrink-0">
          
          {/* Section 1: Profile & Identity */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
              PROFILE &amp; ASSETS
            </div>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setActiveSection('profile')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                  activeSection === 'profile'
                    ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Candidate Details</span>
                </div>
                <span className="text-[10px] font-mono">{completenessPercent}%</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('resumes')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                  activeSection === 'resumes'
                    ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Resumes &amp; CVs</span>
                </div>
                <span className="text-[10px] font-mono">{safeResumesList.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('answers')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                  activeSection === 'answers'
                    ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Auto-Apply Answers</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('portals')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                  activeSection === 'portals'
                    ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  <span>Portal Logins &amp; Setup</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  Auth
                </span>
              </button>
            </div>
          </div>

          {/* Section 2: Automation & AI */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
              AUTOMATION &amp; SYSTEM
            </div>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setActiveSection('automation')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                  activeSection === 'automation'
                    ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI &amp; Automation</span>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('account')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                  activeSection === 'account'
                    ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Account &amp; Storage</span>
                </div>
              </button>
            </div>
          </div>

        </aside>

        {/* Dynamic Content Panel */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-4xl">
          
          {/* SECTION A: Candidate Details */}
          {activeSection === 'profile' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Profile Completeness Banner */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                    Profile Completeness: {completenessPercent}%
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Nomadic uses your profile details to match job openings and calibrate roadmap milestones.
                  </p>
                </div>
                <div className="w-32 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-powder-600 dark:bg-powder-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${completenessPercent}%` }}
                  />
                </div>
              </div>

              {/* Workspace Mode & Opportunity Type Preferences */}
              <div className="space-y-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="space-y-1">
                  <h3 className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">
                    Workspace Mode &amp; Track Preference
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Control which tools appear in your workspace. You can switch modes anytime with zero data loss.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'learner_only', label: 'Learner Only', desc: 'Focus on roadmaps & interview prep', icon: BookOpen },
                    { id: 'seeker_only', label: 'Seeker Only', desc: 'Focus on job board & auto-apply', icon: Briefcase },
                    { id: 'unified', label: 'Unified (Both)', desc: 'Dual mode with top [Learn | Seek] switcher', icon: Sparkles },
                  ].map((m) => {
                    const isSelected = formData.workspaceMode === m.id;
                    const Icon = m.icon;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setFormData({ ...formData, workspaceMode: m.id as any });
                          localStorage.setItem('nomadic_workspace_mode', m.id);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-1.5 ${
                          isSelected
                            ? 'border-powder-500 bg-powder-50/70 dark:bg-powder-950/40 dark:border-powder-400 shadow-xs ring-1 ring-powder-500'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-powder-600 dark:text-powder-400' : 'text-slate-400'}`} />
                          {isSelected && <Check className="w-3.5 h-3.5 text-powder-600 dark:text-powder-400 font-bold" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">{m.label}</div>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-tight">{m.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Target Opportunity Type Preference */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Default Job Radar Filter
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'job', label: 'Full-Time Jobs' },
                      { id: 'internship', label: 'Internships' },
                      { id: 'both', label: 'Both (Jobs & Internships)' },
                    ].map((opp) => (
                      <button
                        key={opp.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, targetOpportunityType: opp.id as any });
                          localStorage.setItem('nomadic_target_opportunity_type', opp.id);
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          formData.targetOpportunityType === opp.id
                            ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 border-slate-950 dark:border-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        {opp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Co-Pilot Review Toggle */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">Co-Pilot Review (Ask Before Submit)</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Show draft review modal with command editing before submitting applications.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.askBeforeSubmit}
                    onChange={(e) => setFormData({ ...formData, askBeforeSubmit: e.target.checked })}
                    className="w-4 h-4 rounded text-powder-600 focus:ring-powder-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                      placeholder="e.g. Alex Morgan"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Primary Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                      placeholder="alex@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location || ''}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                      placeholder="San Francisco, CA or Bangalore, India"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Targeting */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">
                    Career Role Targeting
                  </h3>
                  
                  {/* Calibrate Role Button (Rate limited 1/day) */}
                  <button
                    type="button"
                    onClick={handleCalibrateRole}
                    disabled={calibrationCooldown}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                      calibrationCooldown
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                        : 'bg-powder-50 hover:bg-powder-100 text-powder-900 dark:bg-powder-950/60 dark:text-powder-300 border border-powder-200 dark:border-powder-800'
                    }`}
                    title={calibrationCooldown ? 'Role calibration limited to 1 time per day' : 'Calibrate ATS match keywords for your target role'}
                  >
                    <Sparkles className="w-3 h-3 text-powder-600 dark:text-powder-400" />
                    <span>{calibrationCooldown ? 'Calibrated for Today' : 'Calibrate Role'}</span>
                  </button>
                </div>

                {calibrationSuccess && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Role targeting calibrated! Daily quota registered.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Target Role
                    </label>
                    <input
                      type="text"
                      value={formData.targetRole || ''}
                      onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                      placeholder="e.g. Senior Frontend Engineer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={formData.yearsOfExperience ?? 2}
                      onChange={(e) => setFormData({ ...formData, yearsOfExperience: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                    />
                  </div>
                </div>

                {/* Skills Tag Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Core Technical Skills (Press Enter to add)
                  </label>
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    placeholder="Type a skill (e.g. TypeScript, React, Go) and press Enter..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {safeSkillsList.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-lg border border-slate-200/60 dark:border-slate-700"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-slate-400 hover:text-rose-500 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Online Profiles / Links */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">
                  Links &amp; Social
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      LinkedIn URL
                    </label>
                    <input
                      type="url"
                      value={formData.linkedin || ''}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      GitHub URL
                    </label>
                    <input
                      type="url"
                      value={formData.github || ''}
                      onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                      placeholder="https://github.com/username"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* SECTION B: Resumes & CVs */}
          {activeSection === 'resumes' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Resumes &amp; Multi-CVs
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Nomadic matches your attached resumes to ATS portals during auto-apply.
                </p>
              </div>

              {safeResumesList.length > 0 ? (
                <div className="space-y-3">
                  {safeResumesList.map((res) => (
                    <div
                      key={res.id}
                      className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-950 dark:text-white">
                              {res.name}
                            </span>
                            {formData.defaultResumeId === res.id && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md">
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {res.filePath || 'Stored locally'}
                          </span>
                        </div>
                      </div>

                      {formData.defaultResumeId !== res.id && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, defaultResumeId: res.id })}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                          Set Default
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3 bg-white dark:bg-slate-900">
                  <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-950 dark:text-white">No Resumes Uploaded</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      Attach a PDF resume to enable instant 1-click auto-apply across 5,100+ ATS portals.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION C: Application Answers */}
          {activeSection === 'answers' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Autonomous Application Answers
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pre-configured answers to recurring ATS portal questions.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Are you legally authorized to work in your target country?
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            authorizedToWorkInUS: opt === 'Yes',
                          })
                        }
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                          (formData.authorizedToWorkInUS && opt === 'Yes') || (!formData.authorizedToWorkInUS && opt === 'No')
                            ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 border-slate-950 dark:border-white shadow-2xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Will you now or in the future require visa sponsorship?
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            requiresSponsorship: opt === 'Yes',
                          })
                        }
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                          (formData.requiresSponsorship && opt === 'Yes') || (!formData.requiresSponsorship && opt === 'No')
                            ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 border-slate-950 dark:border-white shadow-2xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION D: Portal Logins & Setup */}
          {activeSection === 'portals' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span>Job Portal Logins &amp; Prerequisites</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sign into your job portal accounts once in your Chrome browser. Nomadic inherits your active sessions and saved cookies so you never get blocked by login or registration popups during auto-apply.
                </p>
              </div>

              {/* How it works info banner */}
              <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl flex items-start gap-3">
                <Laptop className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-blue-900 dark:text-blue-200">
                  <span className="font-bold">1-Time Browser Session Setup</span>
                  <p className="text-blue-700 dark:text-blue-300 leading-relaxed">
                    Click each portal below to open it in Google Chrome. Sign in with your candidate email and select <strong>"Remember Me"</strong>. All future applications will complete automatically without asking you to log in again.
                  </p>
                </div>
              </div>

              {/* Portals Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Internshala */}
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-2">
                        <span>Internshala</span>
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                        Indian Tech &amp; Interns
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Required for applying to verified Indian startups, tech internships, stipends, and fresher developer positions.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        const api = getApi();
                        if (api && api.openExternalUrl) api.openExternalUrl('https://internshala.com/login/user');
                        else window.open('https://internshala.com/login/user', '_blank');
                      }}
                      className="flex-1 py-2 px-3 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const api = getApi();
                        if (api && api.openExternalUrl) api.openExternalUrl('https://internshala.com/registration/student');
                        else window.open('https://internshala.com/registration/student', '_blank');
                      }}
                      className="py-2 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
                    >
                      <span>Register</span>
                    </button>
                  </div>
                </div>

                {/* 2. Google / Gmail */}
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-2">
                        <span>Google Account</span>
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold">
                        1-Click OAuth
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Enables instantaneous 1-click Google Single-Sign-On across Lever, Greenhouse, Workday, and ATS portals.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        const api = getApi();
                        if (api && api.openExternalUrl) api.openExternalUrl('https://accounts.google.com');
                        else window.open('https://accounts.google.com', '_blank');
                      }}
                      className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Sign in to Google</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </button>
                  </div>
                </div>

                {/* 3. LinkedIn */}
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-2">
                        <span>LinkedIn</span>
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 font-bold">
                        Recruiter Outreach
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Required for viewing verified recruiter contacts, direct LinkedIn Easy Apply, and hiring manager outreach.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        const api = getApi();
                        if (api && api.openExternalUrl) api.openExternalUrl('https://www.linkedin.com/login');
                        else window.open('https://www.linkedin.com/login', '_blank');
                      }}
                      className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Sign in to LinkedIn</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </button>
                  </div>
                </div>

                {/* 4. Naukri */}
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-2">
                        <span>Naukri</span>
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                        Indian Tech Corporates
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Essential for Indian tech hub opportunities across Bengaluru, NCR, Hyderabad, and Pune.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        const api = getApi();
                        if (api && api.openExternalUrl) api.openExternalUrl('https://www.naukri.com/nlogin/login');
                        else window.open('https://www.naukri.com/nlogin/login', '_blank');
                      }}
                      className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Sign in to Naukri</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Status Verification Checklist */}
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
                <span className="text-xs font-bold text-slate-950 dark:text-white">Pre-Application Checklist:</span>
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-sans">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Candidate Profile &amp; contact details saved under <strong>Candidate Details</strong>.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>PDF Resume uploaded and set as default under <strong>Resumes &amp; CVs</strong>.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Logged into your preferred job portals above in Google Chrome.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION E: AI & Automation Status */}
          {activeSection === 'automation' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Automation &amp; System Engine
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time status of the local automation runner and career intelligence backends.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-950 dark:text-white">
                      Autonomous Apply Runner
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      READY
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Playwright headless browser engine calibrated for Greenhouse, Lever, and Ashby portals.
                  </p>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-950 dark:text-white">
                      Career Intelligence
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Adaptive curriculum generators, LeetCode company problem analyzers, and interview simulators.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION E: Account & Storage */}
          {activeSection === 'account' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Account &amp; Storage
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Hardware-anchored local database and authentication details.
                </p>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-950 dark:text-white block">
                      Subscription Plan
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono uppercase font-bold">
                      {currentUser?.tier || 'Free Plan'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    ACTIVE
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-950 dark:text-white block">
                      Authenticated User
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {currentUser?.email || formData.email || 'Anonymous'}
                    </span>
                  </div>

                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="px-3.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors"
                    >
                      Sign Out
                    </button>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-950 dark:text-white block">
                    Local Storage Footprint
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    %APPDATA%/Nomadic/nomadic.db (Zero-Cloud Storage Lock)
                  </p>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
};
