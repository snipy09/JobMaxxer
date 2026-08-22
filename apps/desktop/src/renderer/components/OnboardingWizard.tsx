import React, { useState, useEffect, useRef } from 'react';
import {
  Layers, Check, Terminal, Key, User,
  CheckCircle2, AlertCircle, Loader2, ArrowRight, ArrowLeft,
  ShieldCheck, Database, Wifi, Cpu, ExternalLink, Eye, EyeOff,
  Sparkles, Lock, AlertTriangle, Cloud
} from 'lucide-react';
import { MasterProfile, DependencyStatus, ThemeMode, getApi } from '../types';
import { TermsModal } from './TermsModal';

interface OnboardingWizardProps {
  theme?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
  initialProfile: MasterProfile;
  onComplete: (profile: MasterProfile) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialProfile,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [profile, setProfile] = useState<MasterProfile>(initialProfile);

  // Terms & Conditions state
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);

  // Step 2 state: Dependencies
  const [depStatus, setDepStatus] = useState<DependencyStatus>({
    sqliteReady: false,
    playwrightInstalled: false,
    internetOk: false,
    allReady: false,
  });
  const [checkingDeps, setCheckingDeps] = useState<boolean>(false);
  const [installingDeps, setInstallingDeps] = useState<boolean>(false);
  const [installerLogs, setInstallerLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Step 3 state: Groq AI
  const [groqKey, setGroqKey] = useState<string>(initialProfile.groqApiKey || '');
  const [showGroqKey, setShowGroqKey] = useState<boolean>(false);
  const [testingGroq, setTestingGroq] = useState<boolean>(false);
  const [groqTestResult, setGroqTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Step 4 state: Profile form
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Listen to IPC logs during installer
  useEffect(() => {
    const api = getApi();
    if (!api) return;
    const unsub = api.onLog((msg: string) => {
      setInstallerLogs(prev => [...prev.slice(-100), msg]);
    });
    return unsub;
  }, []);

  // Auto-scroll installer terminal
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [installerLogs]);

  // Run dependency check when entering step 2
  useEffect(() => {
    if (currentStep === 2) {
      runCheckDeps();
    }
  }, [currentStep]);

  const runCheckDeps = async () => {
    const api = getApi();
    if (!api) return;
    setCheckingDeps(true);
    try {
      const res = await api.checkDependencies();
      setDepStatus(res);
    } catch {
      setDepStatus({
        sqliteReady: false,
        playwrightInstalled: false,
        internetOk: false,
        allReady: false,
      });
    } finally {
      setCheckingDeps(false);
    }
  };

  const runInstallDeps = async () => {
    const api = getApi();
    if (!api) return;
    setInstallingDeps(true);
    setInstallerLogs(prev => [...prev, '[Installer] Starting Playwright Chromium binary install...']);
    try {
      const res = await api.installDependencies();
      if (res.success) {
        setInstallerLogs(prev => [...prev, '[Installer] Playwright Chromium installation complete!']);
        await runCheckDeps();
      } else {
        setInstallerLogs(prev => [...prev, `[Installer] Error: ${res.error || 'Failed to install'}`]);
      }
    } catch (err: any) {
      setInstallerLogs(prev => [...prev, `[Installer] Fatal: ${err?.message || String(err)}`]);
    } finally {
      setInstallingDeps(false);
    }
  };

  const handleTestGroqKey = async () => {
    const api = getApi();
    if (!groqKey.trim()) {
      setGroqTestResult({ success: false, message: 'Please enter a Groq API key before testing.' });
      return;
    }
    setTestingGroq(true);
    setGroqTestResult(null);
    try {
      if (api) {
        const res = await api.testGroqKey(groqKey.trim());
        if (res.success) {
          setGroqTestResult({ success: true, message: 'Groq API Key verified successfully! Ultra-fast AI models are active.' });
          setProfile(p => ({ ...p, groqApiKey: groqKey.trim() }));
        } else {
          setGroqTestResult({ success: false, message: res.error || 'Groq verification failed. Please check your API key.' });
        }
      } else {
        setGroqTestResult({ success: true, message: 'API Key format accepted (Browser preview).' });
        setProfile(p => ({ ...p, groqApiKey: groqKey.trim() }));
      }
    } catch (err: any) {
      setGroqTestResult({ success: false, message: err?.message || 'Error communicating with Groq API.' });
    } finally {
      setTestingGroq(false);
    }
  };

  const handleFinalLaunch = async () => {
    const api = getApi();
    setSavingProfile(true);
    const updatedProfile: MasterProfile = {
      ...profile,
      groqApiKey: groqKey.trim() || profile.groqApiKey,
      onboardingCompleted: true,
    };

    try {
      if (api) {
        await api.saveMasterProfile({
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          email: updatedProfile.email,
          phone: updatedProfile.phone,
          linkedin: updatedProfile.linkedin,
          github: updatedProfile.github,
          sponsorship: updatedProfile.sponsorship,
          desiredSalary: updatedProfile.desiredSalary,
          noticePeriod: updatedProfile.noticePeriod,
          groqApiKey: updatedProfile.groqApiKey,
          smtpPassword: updatedProfile.smtpPassword,
          resumeText: updatedProfile.resumeText,
          desiredTitle: updatedProfile.desiredTitle,
          techStack: updatedProfile.techStack,
          customAnswersJson: JSON.stringify(updatedProfile.customAnswers || {}),
          onboarding_completed: 1,
        });
      }
      localStorage.setItem('job_automator_onboarding_completed', 'true');
      onComplete(updatedProfile);
    } catch (err) {
      console.error('Failed to save profile on launch:', err);
      localStorage.setItem('job_automator_onboarding_completed', 'true');
      onComplete(updatedProfile);
    } finally {
      setSavingProfile(false);
    }
  };

  // Hard gate check for step 2
  const isStep2Blocked = currentStep === 2 && !depStatus.playwrightInstalled;

  const steps = [
    { num: 1, label: 'Overview', icon: Layers },
    { num: 2, label: 'Dependencies', icon: Cpu },
    { num: 3, label: 'AI Engine', icon: Key },
    { num: 4, label: 'Target Profile', icon: User },
    { num: 5, label: 'Ready', icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-900 selection:bg-slate-800 selection:text-white">
      {/* Modal Container */}
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col text-slate-900 transition-all">
        
        {/* Header with App Branding & Progress */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight">Job Automator Pro</h1>
                <p className="text-xs text-slate-500 font-normal">Candidate Setup &amp; Automation Engine Configuration</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-slate-200/70 text-slate-700">
              Step {currentStep} of {steps.length}
            </span>
          </div>

          {/* Stepper Dots & Labels */}
          <div className="grid grid-cols-5 gap-2 pt-2">
            {steps.map(s => {
              const isCompleted = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              const Icon = s.icon;
              return (
                <div key={s.num} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-slate-900 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-slate-900 text-white ring-4 ring-slate-200 shadow-sm'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[11px] font-semibold hidden sm:inline ${
                    isCurrent ? 'text-slate-900' : 'text-slate-400'
                  }`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto max-h-[62vh]">
          
          {/* STEP 1: Overview & Precision Match Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Welcome to Job Automator Pro
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Automate high-volume job discovery, 1-click form pre-filling with Playwright, and verified recruiter outreach.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Cloud className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-bold text-xs text-slate-900">Cloud Opportunity Stream</h3>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Ingests tailored opportunities delivered by GitHub Actions &amp; cloud producer.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Cpu className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-bold text-xs text-slate-900">Browser Auto-Apply</h3>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Playwright stealth engine pre-fills applications and handles complex forms.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-bold text-xs text-slate-900">4-Stage Verification</h3>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Validates recruiter inboxes before dispatching cold email sequences.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-slate-700 flex-shrink-0" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  Next, we will verify that required local database and browser automation binaries are downloaded onto your machine.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Dependencies & Playwright Installer with STRICT GATE */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  System Dependencies &amp; Browser Engine
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Playwright Chromium and SQLite are mandatory to run local browser automations and offline candidate caching.
                </p>
              </div>

              {/* Status List */}
              <div className="space-y-3">
                {/* SQLite */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-slate-600" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Local SQLite Engine</div>
                      <div className="text-[11px] text-slate-500">Embedded offline SQL database</div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                    depStatus.sqliteReady
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {depStatus.sqliteReady ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {depStatus.sqliteReady ? 'Ready' : 'Unavailable'}
                  </span>
                </div>

                {/* Internet */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Wifi className="w-5 h-5 text-slate-600" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Network &amp; Public IP</div>
                      <div className="text-[11px] text-slate-500">Outbound HTTPS connectivity</div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                    depStatus.internetOk
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {depStatus.internetOk ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {depStatus.internetOk ? 'Connected' : 'Offline'}
                  </span>
                </div>

                {/* Playwright Chromium */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Cpu className="w-5 h-5 text-slate-600" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Playwright Chromium Browser</div>
                      <div className="text-[11px] text-slate-500">Headless &amp; Headed automation binary (Required)</div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                    depStatus.playwrightInstalled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {depStatus.playwrightInstalled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {depStatus.playwrightInstalled ? 'Installed & Ready' : 'Download Required'}
                  </span>
                </div>
              </div>

              {/* Install trigger */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  onClick={runInstallDeps}
                  disabled={installingDeps}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {installingDeps ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Downloading Playwright Chromium...
                    </>
                  ) : (
                    <>
                      <Terminal className="w-4 h-4" />
                      {depStatus.playwrightInstalled ? 'Reinstall / Verify Playwright' : 'Download Playwright Chromium (1-Click)'}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={runCheckDeps}
                  disabled={checkingDeps || installingDeps}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {checkingDeps ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Re-check Status'}
                </button>
              </div>

              {/* Lock Warning if not installed */}
              {!depStatus.playwrightInstalled && (
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>Download required to proceed:</strong> You must click &ldquo;Download Playwright Chromium&rdquo; and let it complete before continuing.
                  </span>
                </div>
              )}

              {/* Live Terminal Logs */}
              {(installingDeps || installerLogs.length > 0) && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Terminal className="w-3.5 h-3.5" /> Download Console Stream
                    </span>
                    <span className="font-mono text-[10px]">npx playwright install chromium</span>
                  </div>
                  <div className="bg-slate-900 text-slate-200 font-mono text-xs p-3.5 rounded-xl h-32 overflow-y-auto leading-relaxed shadow-inner">
                    {installerLogs.map((log, i) => (
                      <div key={i} className="whitespace-pre-wrap">{log}</div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Free Groq AI Setup Guide */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Free Groq AI Engine Integration
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Groq provides 100% free Llama-3 AI inference to dynamically answer job application questions.
                </p>
              </div>

              {/* Step-by-step acquisition card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  How to get your free API Key:
                </h3>
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>
                    Go to{' '}
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-900 font-bold underline inline-flex items-center gap-0.5"
                    >
                      console.groq.com/keys <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  </li>
                  <li>Sign in with your Google or GitHub account.</li>
                  <li>Click <span className="font-bold text-slate-900">Create API Key</span>.</li>
                  <li>Copy your key starting with <code className="font-mono font-bold bg-slate-200 px-1 py-0.5 rounded">gsk_...</code> and paste it below.</li>
                </ol>
              </div>

              {/* Key Input & Test Button */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Groq API Key
                </label>
                <div className="relative">
                  <input
                    type={showGroqKey ? 'text' : 'password'}
                    placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={groqKey}
                    onChange={e => setGroqKey(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-500 pr-10"
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
                    disabled={testingGroq || !groqKey.trim()}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {testingGroq ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    {testingGroq ? 'Validating Key...' : 'Validate & Test Key'}
                  </button>
                  <span className="text-xs text-slate-400">
                    {groqKey.startsWith('gsk_') ? 'Format matches gsk_ pattern' : 'Optional (can be configured in Settings)'}
                  </span>
                </div>

                {/* Validation Feedback Banner */}
                {groqTestResult && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                    groqTestResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    {groqTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    )}
                    <span>{groqTestResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Master Profile Setup */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Target Candidate Profile
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Specify your desired titles and tech stack so the scraper engine only shows jobs you are interested in.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">First Name</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={e => setProfile({ ...profile, firstName: e.target.value })}
                    placeholder="e.g. Jane"
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Last Name</label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={e => setProfile({ ...profile, lastName: e.target.value })}
                    placeholder="e.g. Doe"
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={e => setProfile({ ...profile, email: e.target.value })}
                    placeholder="jane.doe@example.com"
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Phone Number</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">
                    Desired Job Titles (comma-separated, e.g. Senior Full Stack Engineer, Tech Lead)
                  </label>
                  <input
                    type="text"
                    value={profile.desiredTitle || ''}
                    onChange={e => setProfile({ ...profile, desiredTitle: e.target.value })}
                    placeholder="Senior Full Stack Engineer, Staff Software Engineer, Tech Lead"
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">
                    Tech Stack &amp; Skills (e.g. TypeScript, React, Node.js, Python, PostgreSQL)
                  </label>
                  <input
                    type="text"
                    value={profile.techStack || ''}
                    onChange={e => setProfile({ ...profile, techStack: e.target.value })}
                    placeholder="TypeScript, React, Node.js, Python, PostgreSQL, AWS, Docker"
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Minimum Desired Salary</label>
                  <input
                    type="text"
                    value={profile.desiredSalary}
                    onChange={e => setProfile({ ...profile, desiredSalary: e.target.value })}
                    placeholder="$140,000 / yr"
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Visa Sponsorship Needed?</label>
                  <select
                    value={profile.sponsorship || 'No'}
                    onChange={e => setProfile({ ...profile, sponsorship: e.target.value })}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="No">No - Authorized to work without sponsorship</option>
                    <option value="Yes">Yes - Will require visa sponsorship</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Resume / Summary Text</label>
                  <textarea
                    rows={4}
                    value={profile.resumeText}
                    onChange={e => setProfile({ ...profile, resumeText: e.target.value })}
                    placeholder="Paste your plain-text resume or experience highlights here..."
                    className="bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none leading-relaxed font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Launch Suite */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Ready to Launch Job Automator Pro
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  All system checks, browser binaries, and candidate parameters are established.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    Playwright Chromium Browser Installed &amp; Ready
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    SQLite Local Persistence Active
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    Target Roles Configured: {profile.desiredTitle || 'Full Stack Engineer'}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    AI Auto-Filler: {groqKey ? 'Groq Llama-3 Active' : 'Offline Q&A Rules'}
                  </div>
                </div>

                {/* Terms and Conditions Acceptance */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  <input
                    type="checkbox"
                    id="wizard-terms-toggle"
                    checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer accent-slate-900"
                  />
                  <label htmlFor="wizard-terms-toggle" className="text-xs text-slate-600 cursor-pointer">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowTermsModal(true);
                      }}
                      className="font-bold text-slate-900 underline hover:text-blue-600"
                    >
                      Terms &amp; Conditions
                    </button>{' '}
                    and Privacy Policy
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
              disabled={installingDeps || savingProfile}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200/70 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(s => Math.min(5, s + 1))}
              disabled={installingDeps || isStep2Blocked}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalLaunch}
              disabled={savingProfile || !agreedToTerms}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-md disabled:opacity-50"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Launching...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Launch Automation Suite
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Terms & Conditions Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setAgreedToTerms(true)}
        hasAccepted={agreedToTerms}
      />
    </div>
  );
};
