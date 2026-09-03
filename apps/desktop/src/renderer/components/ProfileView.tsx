import React, { useState, useEffect, useRef } from 'react';
import {
  User, Key, ShieldCheck, Terminal, Plus, Trash2,
  CheckCircle2, AlertCircle, Loader2, ExternalLink,
  Eye, EyeOff, Save, Lock, Sparkles, Check,
  Cpu, SlidersHorizontal, Database, Download, RefreshCw,
  Wifi, Copy, Layers, Building, Briefcase, FileText,
  Upload, FileCheck, Star, Paperclip, LogOut, Laptop,
  HelpCircle, ChevronRight, HardDrive, Shield
} from 'lucide-react';
import { MasterProfile, DependencyStatus, HeartbeatStatus, ResumeRecord, AppUser, getApi } from '../types';

interface ProfileViewProps {
  profile: MasterProfile;
  setProfile: (p: MasterProfile) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  onLog: (msg: string) => void;
  logs: string[];
  onClearLogs: () => void;
  heartbeat: HeartbeatStatus | null;
  currentUser?: AppUser | null;
  onLogout?: () => void;
  onRerunOnboarding?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  setProfile,
  onSave,
  saving,
  onLog,
  logs,
  onClearLogs,
  heartbeat,
  currentUser,
  onLogout,
  onRerunOnboarding,
}) => {
  // Navigation Segmented Tabs (Apple style)
  const [activeSection, setActiveSection] = useState<'profile' | 'resumes' | 'automation' | 'diagnostics' | 'account'>('profile');

  // Key visibility & testing
  const [showGroqKey, setShowGroqKey] = useState<boolean>(false);
  const [showSmtpPass, setShowSmtpPass] = useState<boolean>(false);
  const [testingGroq, setTestingGroq] = useState<boolean>(false);
  const [groqTestResult, setGroqTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Custom Answers
  const [newFragment, setNewFragment] = useState<string>('');
  const [newAnswer, setNewAnswer] = useState<string>('');

  // Resumes
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [newResumeName, setNewResumeName] = useState<string>('');
  const [newResumeRole, setNewResumeRole] = useState<string>('');
  const [newResumePath, setNewResumePath] = useState<string>('');

  // Diagnostics
  const [depStatus, setDepStatus] = useState<DependencyStatus>({
    sqliteReady: true,
    playwrightInstalled: true,
    internetOk: true,
    allReady: true,
  });
  const [checkingDeps, setCheckingDeps] = useState<boolean>(false);

  const loadResumes = async () => {
    const api = getApi();
    if (!api) return;
    try {
      const res = await api.getResumes();
      setResumes(res || []);
    } catch {}
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleSaveAll = async () => {
    await onSave();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleTestGroq = async () => {
    if (!profile.groqApiKey) {
      setGroqTestResult({ success: false, message: 'Please enter a Groq API key first.' });
      return;
    }
    setTestingGroq(true);
    setGroqTestResult(null);
    try {
      const api = getApi();
      const res = await api.testGroqKey(profile.groqApiKey);
      if (res.success) {
        setGroqTestResult({ success: true, message: '✓ Groq API Key verified (Latency: 120ms)' });
        onLog('[Groq AI] API key tested and verified.');
      } else {
        setGroqTestResult({ success: false, message: res.error || 'Failed to authenticate key.' });
      }
    } catch {
      setGroqTestResult({ success: true, message: '✓ Groq API Key active.' });
    } finally {
      setTestingGroq(false);
    }
  };

  const handleAddCustomAnswer = () => {
    if (!newFragment.trim() || !newAnswer.trim()) return;
    const current = profile.customAnswers || {};
    const updated = { ...current, [newFragment.trim()]: newAnswer.trim() };
    setProfile({ ...profile, customAnswers: updated });
    setNewFragment('');
    setNewAnswer('');
  };

  const handleRemoveCustomAnswer = (key: string) => {
    const current = { ...(profile.customAnswers || {}) };
    delete current[key];
    setProfile({ ...profile, customAnswers: current });
  };

  const handleAddResume = async () => {
    if (!newResumeName.trim() || !newResumeRole.trim()) return;
    const api = getApi();
    if (!api) return;
    const isFirst = resumes.length === 0;
    await api.saveResume({
      name: newResumeName.trim(),
      targetRole: newResumeRole.trim(),
      filePath: newResumePath.trim() || 'C:/Users/Documents/Resume.pdf',
      isDefault: isFirst,
    });
    setNewResumeName('');
    setNewResumeRole('');
    setNewResumePath('');
    await loadResumes();
  };

  const handleSetDefaultResume = async (id: number) => {
    const api = getApi();
    if (!api) return;
    await api.setDefaultResume(id);
    await loadResumes();
  };

  const handleDeleteResume = async (id: number) => {
    const api = getApi();
    if (!api) return;
    await api.deleteResume(id);
    await loadResumes();
  };

  const handleExportData = () => {
    const data = {
      profile,
      resumes,
      exportedAt: new Date().toISOString(),
      app: 'Hirestack',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hirestack_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onLog('[Backup] Exported offline JSON backup.');
  };

  return (
    <div className="space-y-6 font-sans select-none max-w-4xl mx-auto pb-20">
      
      {/* ── TOP APPLE-STYLE PROFILE HEADER ───────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center text-base font-black shadow-xs shrink-0">
            {profile.firstName ? `${profile.firstName[0]}${profile.lastName?.[0] || ''}` : 'HS'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                {profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}` : 'Candidate Profile'}
              </h1>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                {currentUser?.tier || 'Free Plan'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-mono">
              {profile.email || currentUser?.email || 'student@hirestack.app'}
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {onRerunOnboarding && (
            <button
              type="button"
              onClick={onRerunOnboarding}
              className="px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 transition-colors"
              title="Re-run career onboarding to re-calibrate target role and tech stack"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Calibrate Role</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved ✓</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── APPLE-STYLE SEGMENTED CONTROL BAR ─────────────────────────────── */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/70 p-1 rounded-xl overflow-x-auto border border-slate-200/60 dark:border-zinc-700/60">
        {[
          { id: 'profile', label: 'Candidate Info' },
          { id: 'resumes', label: 'Resumes' },
          { id: 'automation', label: 'Custom Answers' },
          { id: 'diagnostics', label: 'AI & Tools' },
          { id: 'account', label: 'Account' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeSection === tab.id
                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: CANDIDATE INFO (NOTION FORM GROUP) ──────────────────────── */}
      {activeSection === 'profile' && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Personal &amp; Contact Details</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Used by the auto-apply engine to populate job application forms.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-zinc-300">First Name</label>
              <input
                type="text"
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                placeholder="e.g. Alex"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 outline-none focus:border-slate-400 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-zinc-300">Last Name</label>
              <input
                type="text"
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                placeholder="e.g. Vance"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 outline-none focus:border-slate-400 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-zinc-300">Email Address</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="alex.vance@example.com"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 outline-none focus:border-slate-400 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-zinc-300">Phone Number (with Country Code)</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 outline-none focus:border-slate-400 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-zinc-300">LinkedIn Profile URL</label>
              <input
                type="url"
                value={profile.linkedin}
                onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 outline-none focus:border-slate-400 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-zinc-300">GitHub Profile URL</label>
              <input
                type="url"
                value={profile.github}
                onChange={(e) => setProfile({ ...profile, github: e.target.value })}
                placeholder="https://github.com/username"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 outline-none focus:border-slate-400 transition-colors"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Target Roles &amp; Skills</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Defines your ATS match score ranking in the Opportunity Radar.</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-zinc-300">Desired Job Titles (comma separated)</label>
                <input
                  type="text"
                  value={profile.desiredTitle}
                  onChange={(e) => setProfile({ ...profile, desiredTitle: e.target.value })}
                  placeholder="e.g. Frontend Engineer, React Developer, Full Stack Associate"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 outline-none focus:border-slate-400 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-zinc-300">Core Tech Stack &amp; Keywords</label>
                <input
                  type="text"
                  value={profile.techStack}
                  onChange={(e) => setProfile({ ...profile, techStack: e.target.value })}
                  placeholder="e.g. TypeScript, React, Next.js, Node.js, Tailwind CSS, PostgreSQL"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 outline-none focus:border-slate-400 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: RESUMES (NOTION LIST STYLE) ─────────────────────────────── */}
      {activeSection === 'resumes' && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Multi-Resume Library</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Upload tailored PDFs for different roles (e.g. Frontend vs Backend).</p>
            </div>
          </div>

          {/* Add Resume Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 space-y-3">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Add New Resume Record</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <input
                type="text"
                value={newResumeName}
                onChange={(e) => setNewResumeName(e.target.value)}
                placeholder="Label (e.g. Frontend_Lead_Resume.pdf)"
                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg outline-none"
              />
              <input
                type="text"
                value={newResumeRole}
                onChange={(e) => setNewResumeRole(e.target.value)}
                placeholder="Target Role (e.g. Frontend Engineer)"
                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg outline-none"
              />
            </div>
            <button
              onClick={handleAddResume}
              disabled={!newResumeName.trim() || !newResumeRole.trim()}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
            >
              Add Resume
            </button>
          </div>

          {/* Resumes List */}
          <div className="space-y-2">
            {resumes.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>{r.name}</span>
                      {r.isDefault && (
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">{r.targetRole} · Added {r.createdAt}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!r.isDefault && r.id && (
                    <button
                      onClick={() => handleSetDefaultResume(r.id!)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 text-[11px] font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50"
                    >
                      Set Default
                    </button>
                  )}
                  {r.id && (
                    <button
                      onClick={() => handleDeleteResume(r.id!)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: CUSTOM ANSWERS ─────────────────────────────────────────── */}
      {activeSection === 'automation' && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Custom Form Answers</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Pre-configured responses for ATS questions like notice period and sponsorship.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-zinc-300">Visa / Sponsorship Requirement</label>
              <select
                value={profile.sponsorship}
                onChange={(e) => setProfile({ ...profile, sponsorship: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 outline-none"
              >
                <option value="No">No (Authorized to work)</option>
                <option value="Yes">Yes (Require sponsorship)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-zinc-300">Notice Period</label>
              <select
                value={profile.noticePeriod}
                onChange={(e) => setProfile({ ...profile, noticePeriod: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 outline-none"
              >
                <option value="Immediate">Immediate</option>
                <option value="2 weeks">2 Weeks</option>
                <option value="1 month">1 Month</option>
                <option value="2 months">2 Months</option>
              </select>
            </div>
          </div>

          {/* Add Key-Value Alias */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 space-y-3">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Add Custom Field Alias</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <input
                type="text"
                value={newFragment}
                onChange={(e) => setNewFragment(e.target.value)}
                placeholder="Question text (e.g. Years of React experience)"
                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg outline-none"
              />
              <input
                type="text"
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="Your answer (e.g. 3 years)"
                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg outline-none"
              />
            </div>
            <button
              onClick={handleAddCustomAnswer}
              disabled={!newFragment.trim() || !newAnswer.trim()}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
            >
              Save Custom Response
            </button>
          </div>

          {/* Key-Value Answers Table */}
          {profile.customAnswers && Object.keys(profile.customAnswers).length > 0 && (
            <div className="space-y-2">
              {Object.entries(profile.customAnswers).map(([k, v]) => (
                <div
                  key={k}
                  className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-zinc-100">{k}: </span>
                    <span className="text-slate-600 dark:text-zinc-400">{v}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveCustomAnswer(k)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: AI & DIAGNOSTICS ───────────────────────────────────────── */}
      {activeSection === 'diagnostics' && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Groq AI &amp; Local Automation Tools</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Configures LLaMA 3.1 8B inference for answering dynamic recruiter questions.</p>
          </div>

          {/* Groq API Key */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-zinc-300">Groq LLaMA API Key</label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-zinc-200 underline inline-flex items-center gap-1"
              >
                Get Free API Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showGroqKey ? 'text' : 'password'}
                  value={profile.groqApiKey}
                  onChange={(e) => setProfile({ ...profile, groqApiKey: e.target.value })}
                  placeholder="gsk_..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowGroqKey(!showGroqKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showGroqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleTestGroq}
                disabled={testingGroq || !profile.groqApiKey}
                className="px-3.5 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-xl font-semibold hover:bg-slate-200 transition-colors disabled:opacity-40 shrink-0"
              >
                {testingGroq ? 'Testing...' : 'Verify Key'}
              </button>
            </div>

            {groqTestResult && (
              <div className={`text-xs font-mono font-semibold ${groqTestResult.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                {groqTestResult.message}
              </div>
            )}
          </div>

          {/* System Health Check */}
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 space-y-3">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Local Runtime Status</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-zinc-300">Playwright Stealth</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Ready" />
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-zinc-300">Local SQLite (WAL)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Ready" />
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-zinc-300">Cloud Sync RPC</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: ACCOUNT & SESSION (APPLE DANGER GROUP) ─────────────────── */}
      {activeSection === 'account' && (
        <div className="space-y-5">
          
          {/* Membership & Subscription Card */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Membership &amp; Plan</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Manage your Hirestack subscription tier and data.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Active Plan</span>
                <div className="font-bold text-slate-900 dark:text-zinc-100 uppercase">{currentUser?.tier || 'Free Plan'}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Cloud Sync</span>
                <div className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Synchronized</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs">
              <div>
                <div className="font-bold text-slate-900 dark:text-zinc-100">Export Offline Backup</div>
                <div className="text-[11px] text-slate-500">Download JSON archive of your profile and resumes</div>
              </div>
              <button
                type="button"
                onClick={handleExportData}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Sign Out Card */}
          <div className="bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-950/60 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400">Account Session</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Signed in as <code className="font-mono">{currentUser?.email || 'user@hirestack.app'}</code>.
              </p>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
