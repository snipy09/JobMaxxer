import React, { useState, useEffect } from 'react';
import {
  User, FileText, CheckCircle2, Shield,
  Save, AlertCircle, RefreshCw, Key, Database,
  ArrowRight, ExternalLink, Sparkles, Check, ChevronRight
} from 'lucide-react';
import { MasterProfile, getApi, AppUser } from '../types';

interface ProfileViewProps {
  profile: MasterProfile | null;
  onSaveProfile: (profile: MasterProfile) => Promise<boolean>;
  onLog?: (msg: string) => void;
  currentUser?: AppUser | null;
  onNavigateTab?: (tab: string) => void;
}

type SettingsSection = 'profile' | 'resumes' | 'answers' | 'automation' | 'account';

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onSaveProfile,
  onLog,
  currentUser,
  onNavigateTab,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [formData, setFormData] = useState<MasterProfile>(() => {
    return profile || {
      fullName: currentUser?.fullName || '',
      email: currentUser?.email || '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      portfolio: '',
      currentRole: '',
      targetRole: 'Software Engineer',
      yearsOfExperience: 2,
      skills: [],
      workExperience: [],
      education: [],
      preferredJobTypes: ['full-time', 'remote'],
      expectedSalaryMin: 80000,
      expectedSalaryMax: 130000,
      salaryCurrency: 'USD',
      willingToRelocate: false,
      authorizedToWorkInUS: true,
      requiresSponsorship: false,
      answers: {},
      resumes: [],
      defaultResumeId: undefined,
      onboardingCompleted: true,
    };
  });

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

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const ok = await onSaveProfile(formData);
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
      if (!formData.skills.includes(newSkill)) {
        setFormData((prev) => ({
          ...prev,
          skills: [...prev.skills, newSkill],
        }));
      }
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
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

  // Calculate completeness
  const completenessChecks = [
    Boolean(formData.fullName?.trim()),
    Boolean(formData.email?.trim()),
    Boolean(formData.targetRole?.trim()),
    formData.skills.length > 0,
    Boolean(formData.linkedin?.trim() || formData.github?.trim()),
  ];
  const completenessPercent = Math.round(
    (completenessChecks.filter(Boolean).length / completenessChecks.length) * 100
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      
      {/* 1. Header Area */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
            Settings & Control
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
        <aside className="w-60 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 space-y-6">
          
          {/* Section 1: Profile & Identity */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
              PROFILE & ASSETS
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
                  <span>Resumes & CVs</span>
                </div>
                <span className="text-[10px] font-mono">{formData.resumes?.length || 0}</span>
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
            </div>
          </div>

          {/* Section 2: Automation & AI */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
              AUTOMATION & SYSTEM
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
                  <span>AI & Automation</span>
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
                  <span>Account & Storage</span>
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
                    {formData.skills.map((skill) => (
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
                  Links & Social
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
                  Resumes & Multi-CVs
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Nomadic matches your attached resumes to ATS portals during auto-apply.
                </p>
              </div>

              {formData.resumes && formData.resumes.length > 0 ? (
                <div className="space-y-3">
                  {formData.resumes.map((res) => (
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

          {/* SECTION D: AI & Automation Status */}
          {activeSection === 'automation' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Automation & System Engine
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
                  Account & Storage
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
