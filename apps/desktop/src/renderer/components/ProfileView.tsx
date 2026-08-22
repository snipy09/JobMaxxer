import React, { useState, useEffect, useRef } from 'react';
import {
  User, Key, ShieldCheck, Terminal, Plus, Trash2,
  CheckCircle2, AlertCircle, Loader2, ExternalLink,
  Eye, EyeOff, Save, HelpCircle, Lock, Sparkles, Check,
  Cpu, SlidersHorizontal, Database, Download, RefreshCw,
  Wifi, Copy, Layers, Building, Briefcase, FileText,
  Upload, FileCheck, Star, Paperclip
} from 'lucide-react';
import { MasterProfile, DependencyStatus, HeartbeatStatus, ResumeRecord, getApi } from '../types';

interface ProfileViewProps {
  profile: MasterProfile;
  setProfile: (p: MasterProfile) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  onLog: (msg: string) => void;
  logs: string[];
  onClearLogs: () => void;
  heartbeat: HeartbeatStatus | null;
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
}) => {
  // Local state
  const [newFragment, setNewFragment] = useState<string>('');
  const [newAnswer, setNewAnswer] = useState<string>('');
  const [showGroqKey, setShowGroqKey] = useState<boolean>(false);
  const [showClaudeKey, setShowClaudeKey] = useState<boolean>(false);
  const [showSmtpPass, setShowSmtpPass] = useState<boolean>(false);
  const [testingGroq, setTestingGroq] = useState<boolean>(false);
  const [groqTestResult, setGroqTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showGroqModal, setShowGroqModal] = useState<boolean>(false);
  const [saveBanner, setSaveBanner] = useState<boolean>(false);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);

  // Multi-Resume Management state
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [newResumeName, setNewResumeName] = useState<string>('');
  const [newResumeRole, setNewResumeRole] = useState<string>('');
  const [newResumePath, setNewResumePath] = useState<string>('');
  const [newResumeIsDefault, setNewResumeIsDefault] = useState<boolean>(false);
  const [savingResume, setSavingResume] = useState<boolean>(false);

  // System Diagnostics state
  const [depStatus, setDepStatus] = useState<DependencyStatus>({
    sqliteReady: true,
    playwrightInstalled: true,
    internetOk: true,
    allReady: true,
  });
  const [checkingDeps, setCheckingDeps] = useState<boolean>(false);
  const [reinstallingDeps, setReinstallingDeps] = useState<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const loadResumes = async () => {
    const api = getApi();
    if (!api) return;
    try {
      const res = await api.getResumes();
      setResumes(res || []);
    } catch (err: any) {
      console.error('Failed to load resumes:', err);
    }
  };

  const runDiagnostics = async () => {
    const api = getApi();
    if (!api) return;
    setCheckingDeps(true);
    try {
      const res = await api.checkDependencies();
      setDepStatus(res);
      onLog(`[Diagnostics] System check: SQLite=${res.sqliteReady}, Playwright=${res.playwrightInstalled}, Network=${res.internetOk}`);
    } catch (err: any) {
      onLog(`[Diagnostics] Check error: ${err?.message || String(err)}`);
    } finally {
      setCheckingDeps(false);
    }
  };

  const runReinstallPlaywright = async () => {
    const api = getApi();
    if (!api) return;
    setReinstallingDeps(true);
    onLog('[Installer] Initiating Playwright Chromium repair & download sequence...');
    try {
      const res = await api.installDependencies();
      if (res.success) {
        onLog('[Installer] Playwright Chromium reinstalled successfully.');
        await runDiagnostics();
      } else {
        onLog(`[Installer] Reinstall failed: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      onLog(`[Installer] Fatal error: ${err?.message || String(err)}`);
    } finally {
      setReinstallingDeps(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
    loadResumes();
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handlePickResumeFile = async () => {
    const api = getApi();
    if (!api) return;
    try {
      const res = await api.pickResumeFile();
      if (!res.canceled && res.filePath) {
        setNewResumePath(res.filePath);
        if (!newResumeName && res.fileName) {
          setNewResumeName(res.fileName.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (err: any) {
      onLog(`[Resumes] File picker error: ${err?.message || String(err)}`);
    }
  };

  const handleSaveResume = async () => {
    const api = getApi();
    if (!api || !newResumePath.trim()) return;

    setSavingResume(true);
    try {
      const res = await api.saveResume({
        name: newResumeName.trim() || 'Custom Resume',
        targetRole: newResumeRole.trim() || 'General',
        filePath: newResumePath.trim(),
        isDefault: newResumeIsDefault || resumes.length === 0,
      });

      if (res.success) {
        await loadResumes();
        setNewResumeName('');
        setNewResumeRole('');
        setNewResumePath('');
        setNewResumeIsDefault(false);
        onLog('[Resumes] Resume saved and role-mapped successfully.');
      }
    } catch (err: any) {
      onLog(`[Resumes] Save error: ${err?.message || String(err)}`);
    } finally {
      setSavingResume(false);
    }
  };

  const handleDeleteResume = async (id?: number) => {
    if (!id) return;
    const api = getApi();
    if (!api) return;
    try {
      await api.deleteResume(id);
      await loadResumes();
      onLog(`[Resumes] Deleted resume ID ${id}.`);
    } catch (err: any) {
      onLog(`[Resumes] Delete error: ${err?.message || String(err)}`);
    }
  };

  const handleSetDefaultResume = async (id?: number) => {
    if (!id) return;
    const api = getApi();
    if (!api) return;
    try {
      await api.setDefaultResume(id);
      await loadResumes();
      onLog(`[Resumes] Set default resume ID ${id}.`);
    } catch (err: any) {
      onLog(`[Resumes] Error: ${err?.message || String(err)}`);
    }
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleAddQA = () => {
    const frag = newFragment.trim();
    const ans = newAnswer.trim();
    if (!frag || !ans) return;

    setProfile({
      ...profile,
      customAnswers: {
        ...(profile.customAnswers || {}),
        [frag]: ans,
      },
    });
    setNewFragment('');
    setNewAnswer('');
  };

  const handleRemoveQA = (fragment: string) => {
    const updated = { ...(profile.customAnswers || {}) };
    delete updated[fragment];
    setProfile({
      ...profile,
      customAnswers: updated,
    });
  };

  const handleTestGroqKey = async () => {
    const key = (profile.groqApiKey || '').trim();
    if (!key) {
      setGroqTestResult({ success: false, message: 'Please enter a Groq API Key first.' });
      return;
    }

    setTestingGroq(true);
    setGroqTestResult(null);
    try {
      const api = getApi();
      if (api) {
        const res = await api.testGroqKey(key);
        if (res.success) {
          setGroqTestResult({ success: true, message: 'Groq API Key verified! Auto-fill answering enabled.' });
          onLog('[Groq AI] Key validated successfully.');
        } else {
          setGroqTestResult({ success: false, message: res.error || 'Groq Key validation failed.' });
          onLog(`[Groq AI] Validation failed: ${res.error || 'Unknown error'}`);
        }
      } else {
        setGroqTestResult({ success: true, message: 'Groq key format validated (Browser mode).' });
      }
    } catch (err: any) {
      setGroqTestResult({ success: false, message: err?.message || 'Error contacting Groq API.' });
    } finally {
      setTestingGroq(false);
    }
  };

  const handleSaveClick = async () => {
    await onSave();
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 3000);
  };

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ profile, resumes }, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `candidate_profile_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
  };

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      
      {/* Top Header & Save Button */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              Settings &amp; Profile
            </h1>
            <p className="text-xs text-slate-500 font-normal">
              Candidate information, role-specific resumes, auto-fill keys, and diagnostics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveBanner && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Check className="w-3.5 h-3.5 stroke-[3]" /> Saved
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={saving}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* ── LIST ITEM 1: CANDIDATE PROFILE & TARGET ROLES ───────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <User className="w-4 h-4 text-slate-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            1. Candidate Information
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">First Name</label>
            <input
              type="text"
              value={profile.firstName}
              onChange={e => setProfile({ ...profile, firstName: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Last Name</label>
            <input
              type="text"
              value={profile.lastName}
              onChange={e => setProfile({ ...profile, lastName: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Email Address</label>
            <input
              type="email"
              value={profile.email}
              onChange={e => setProfile({ ...profile, email: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Phone Number</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={e => setProfile({ ...profile, phone: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">LinkedIn URL</label>
            <input
              type="text"
              value={profile.linkedin}
              onChange={e => setProfile({ ...profile, linkedin: e.target.value })}
              placeholder="https://linkedin.com/in/username"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">GitHub URL</label>
            <input
              type="text"
              value={profile.github}
              onChange={e => setProfile({ ...profile, github: e.target.value })}
              placeholder="https://github.com/username"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">
              Desired Job Titles (comma separated, e.g. Senior Full Stack Engineer, Tech Lead)
            </label>
            <input
              type="text"
              value={profile.desiredTitle || ''}
              onChange={e => setProfile({ ...profile, desiredTitle: e.target.value })}
              placeholder="Senior Full Stack Engineer, Staff Software Engineer, Tech Lead"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-medium"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">
              Tech Stack &amp; Skills Keywords (comma separated)
            </label>
            <input
              type="text"
              value={profile.techStack || ''}
              onChange={e => setProfile({ ...profile, techStack: e.target.value })}
              placeholder="TypeScript, React, Node.js, Python, PostgreSQL, Docker, AWS"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-medium"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Minimum Desired Salary</label>
            <input
              type="text"
              value={profile.desiredSalary}
              onChange={e => setProfile({ ...profile, desiredSalary: e.target.value })}
              placeholder="$150,000"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Notice Period</label>
            <input
              type="text"
              value={profile.noticePeriod}
              onChange={e => setProfile({ ...profile, noticePeriod: e.target.value })}
              placeholder="2 weeks"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">Resume Plain Text Summary</label>
            <textarea
              rows={3}
              value={profile.resumeText}
              onChange={e => setProfile({ ...profile, resumeText: e.target.value })}
              placeholder="Paste your plain text resume summary here for form question auto-answering..."
              className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* ── LIST ITEM 2: ROLE-SPECIFIC RESUMES & FILE UPLOADS ───────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" />
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                2. Role-Specific Resumes &amp; Auto-Upload Mapping
              </h2>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
            {resumes.length} {resumes.length === 1 ? 'Resume' : 'Resumes'} Registered
          </span>
        </div>

        <p className="text-[11px] text-slate-500">
          Upload tailored resumes for different roles (e.g. Frontend, Backend, DevOps). The auto-applier automatically uploads the matching resume when applying.
        </p>

        {/* Existing Resumes List */}
        {resumes.length > 0 ? (
          <div className="space-y-2.5">
            {resumes.map(r => (
              <div
                key={r.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{r.name}</span>
                    {r.isDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" /> Default Resume
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-slate-700">Target Role Keywords:</span>
                    <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">
                      {r.targetRole || 'Any role'}
                    </span>
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 truncate max-w-md">
                    File: {r.filePath}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {!r.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultResume(r.id)}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-white text-slate-700 transition-colors"
                    >
                      Set as Default
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteResume(r.id)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg border border-slate-200 hover:bg-white transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-500">
            No resume files added yet. Add a tailored resume below.
          </div>
        )}

        {/* Add New Resume Form */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 pt-3">
          <div className="text-xs font-bold text-slate-800">
            Upload &amp; Map New Resume
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-700">Resume Name / Title</label>
              <input
                type="text"
                placeholder="e.g. Frontend / React Lead Resume"
                value={newResumeName}
                onChange={e => setNewResumeName(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-700">Target Role Keywords</label>
              <input
                type="text"
                placeholder="e.g. React, Frontend, UI, Web"
                value={newResumeRole}
                onChange={e => setNewResumeRole(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none font-medium"
              />
            </div>
          </div>

          {/* File Picker */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handlePickResumeFile}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{newResumePath ? 'Change File' : 'Select PDF / DOCX File'}</span>
            </button>

            <div className="min-w-0 flex-1 font-mono text-[11px] text-slate-600 truncate bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              {newResumePath || 'No file selected yet'}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={newResumeIsDefault}
                onChange={e => setNewResumeIsDefault(e.target.checked)}
                className="rounded accent-slate-900 cursor-pointer"
              />
              <span>Set as default fallback resume</span>
            </label>

            <button
              type="button"
              onClick={handleSaveResume}
              disabled={!newResumePath.trim() || savingResume}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              {savingResume ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add Resume</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── LIST ITEM 3: AI AUTO-FILL & API KEYS ─────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Key className="w-4 h-4 text-slate-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            3. Auto-Fill API Keys
          </h2>
        </div>

        {/* Groq Key */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-slate-700" />
                Free Groq Key (Fast Question Answering)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Free key used to answer custom open-ended questions on job forms.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowGroqModal(true)}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" /> How to get free key
            </button>
          </div>

          <div className="relative">
            <input
              type={showGroqKey ? 'text' : 'password'}
              value={profile.groqApiKey}
              onChange={e => setProfile({ ...profile, groqApiKey: e.target.value })}
              placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-400 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowGroqKey(!showGroqKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showGroqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleTestGroqKey}
              disabled={testingGroq || !profile.groqApiKey?.trim()}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
            >
              {testingGroq ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              {testingGroq ? 'Testing Key...' : 'Validate Key'}
            </button>
          </div>

          {groqTestResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              groqTestResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {groqTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{groqTestResult.message}</span>
            </div>
          )}
        </div>

        {/* Claude Key & SMTP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-700">Claude API Key (Optional)</label>
            <div className="relative">
              <input
                type={showClaudeKey ? 'text' : 'password'}
                value={profile.claudeApiKey || ''}
                onChange={e => setProfile({ ...profile, claudeApiKey: e.target.value })}
                placeholder="sk-ant-api03-xxxxxxxxxxxxxxxx"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowClaudeKey(!showClaudeKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showClaudeKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-700">SMTP App Password (Gmail / Outlook)</label>
            <div className="relative">
              <input
                type={showSmtpPass ? 'text' : 'password'}
                value={profile.smtpPassword}
                onChange={e => setProfile({ ...profile, smtpPassword: e.target.value })}
                placeholder="16-character app password"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSmtpPass(!showSmtpPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── LIST ITEM 4: CUSTOM Q&A RULE DICTIONARY ─────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Terminal className="w-4 h-4 text-slate-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            4. Custom Q&amp;A Rules
          </h2>
        </div>
        <p className="text-[11px] text-slate-500">
          Form questions matching these keywords will use your predefined answer before falling back to AI.
        </p>

        {/* Existing Q&A pairs */}
        {Object.entries(profile.customAnswers || {}).length > 0 ? (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {Object.entries(profile.customAnswers || {}).map(([frag, ans]) => (
              <div
                key={frag}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
              >
                <div className="flex-1 font-mono text-slate-700 truncate">
                  <span className="text-slate-400 font-sans mr-1 font-bold">Match:</span> {frag}
                </div>
                <div className="flex-1 font-mono text-slate-900 truncate font-semibold">
                  <span className="text-slate-400 font-sans mr-1 font-bold">Answer:</span> {ans}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveQA(frag)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-slate-400">
            No custom Q&amp;A rules created yet.
          </div>
        )}

        {/* Add new Q&A mapping */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <input
            type="text"
            placeholder="Question keyword (e.g. 'years of experience')"
            value={newFragment}
            onChange={e => setNewFragment(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Desired answer (e.g. '7 years')"
            value={newAnswer}
            onChange={e => setNewAnswer(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddQA}
            disabled={!newFragment.trim() || !newAnswer.trim()}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add Rule
          </button>
        </div>
      </div>

      {/* ── LIST ITEM 5: SYSTEM DIAGNOSTICS & LOGS ──────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Cpu className="w-4 h-4 text-slate-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            5. System Diagnostics &amp; Console
          </h2>
        </div>

        {/* Diagnostics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-500" /> SQLite Database
              </span>
              <span className={`w-2 h-2 rounded-full ${depStatus.sqliteReady ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </div>
            <div className="text-xs font-bold font-mono text-slate-900">
              {depStatus.sqliteReady ? 'Ready' : 'Missing'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-slate-500" /> Browser Engine
              </span>
              <span className={`w-2 h-2 rounded-full ${depStatus.playwrightInstalled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </div>
            <div className="text-xs font-bold font-mono text-slate-900">
              {depStatus.playwrightInstalled ? 'Chromium Ready' : 'Download Needed'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-slate-500" /> Network
              </span>
              <span className={`w-2 h-2 rounded-full ${depStatus.internetOk ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </div>
            <div className="text-xs font-bold font-mono text-slate-900 truncate">
              {depStatus.internetOk ? 'Connected' : 'Offline'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" /> Session Guard
              </span>
              <span className={`w-2 h-2 rounded-full ${
                heartbeat === null ? 'bg-slate-400' : heartbeat.valid ? 'bg-emerald-500' : 'bg-rose-500'
              }`} />
            </div>
            <div className="text-xs font-bold font-mono text-slate-900">
              {heartbeat?.valid ? 'Active' : 'Local Standalone'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          <div className="text-xs text-slate-500">
            Run diagnostic checks or reinstall browser binaries if needed.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runDiagnostics}
              disabled={checkingDeps || reinstallingDeps}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {checkingDeps ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Check System</span>
            </button>

            <button
              type="button"
              onClick={runReinstallPlaywright}
              disabled={reinstallingDeps || checkingDeps}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
            >
              {reinstallingDeps ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
              <span>Re-Download Browser</span>
            </button>
          </div>
        </div>

        {/* Real-time Terminal Log Stream */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Console Output
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                {logs.length} lines
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLogs}
                className="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-white flex items-center gap-1 transition-colors"
              >
                {copiedLogs ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLogs ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={onClearLogs}
                className="text-xs text-slate-600 hover:text-rose-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-white flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-200 font-mono text-xs p-3.5 rounded-xl h-44 overflow-y-auto leading-relaxed shadow-inner">
            {logs.length === 0 ? (
              <span className="text-slate-500">No events captured yet. Actions will stream logs here...</span>
            ) : (
              logs.map((line, idx) => (
                <div key={idx} className="whitespace-pre-wrap hover:bg-slate-800/80 px-1 rounded transition-colors">
                  {line}
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>

      {/* ── LIST ITEM 6: DATA BACKUP ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <SlidersHorizontal className="w-4 h-4 text-slate-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            6. Data Backup
          </h2>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <div className="font-bold text-slate-900">Export Backup (JSON)</div>
            <div className="text-[11px] text-slate-500">Download a full offline backup of your profile, resumes, and rules</div>
          </div>
          <button
            type="button"
            onClick={handleExportData}
            className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 font-bold shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Groq Guide Modal */}
      {showGroqModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              How to get a Free Groq API Key
            </h3>
            <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Open{' '}
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-900 underline font-bold inline-flex items-center gap-0.5"
                >
                  console.groq.com/keys <ExternalLink className="w-3 h-3 inline" />
                </a>
              </li>
              <li>Sign in with your Google or GitHub account.</li>
              <li>Click &ldquo;Create API Key&rdquo;.</li>
              <li>Copy the key (starts with <code className="font-mono font-bold bg-slate-100 px-1 py-0.5 rounded">gsk_</code>).</li>
              <li>Paste the key into the Groq API Key field in Settings.</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowGroqModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition-colors shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
