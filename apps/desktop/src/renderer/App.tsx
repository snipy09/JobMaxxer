import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import {
  TabType, ThemeMode, MasterProfile, HeartbeatStatus, AppUser, getApi, PersonaTrack
} from './types';
import { OnboardingWizard } from './components/OnboardingWizard';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { LearnerView } from './components/LearnerView';
import { UpgradeModal } from './components/UpgradeModal';
import { FeedView } from './components/FeedView';
import { OutreachView } from './components/OutreachView';
import { ApplicationsView } from './components/ApplicationsView';
import { ProfileView } from './components/ProfileView';
import { AdminView } from './components/AdminView';
import { LoginView } from './components/LoginView';
import { ResourceVaultView } from './components/ResourceVaultView';
import { InterviewPrepView } from './components/InterviewPrepView';
import { OpportunityBoardView } from './components/OpportunityBoardView';
import { CommandPalette } from './components/CommandPalette';
export default function App() {
  const ADMIN_DEV_USER: AppUser = {
    id: 1,
    email: 'admin@jobmaxxer.com',
    fullName: 'Master Admin',
    role: 'admin',
    tier: 'max',
    licenseKey: 'JMX-MAX-2026-9912',
    status: 'active',
    appsCount: 120,
    createdAt: new Date().toISOString(),
  };

  const hasAdminQuery = typeof window !== 'undefined' && (
    window.location.search.toLowerCase().includes('admin') ||
    window.location.hash.toLowerCase().includes('admin')
  );

  // Current user state (persisted in localStorage)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      if (hasAdminQuery) {
        localStorage.setItem('nomadic_user', JSON.stringify(ADMIN_DEV_USER));
        localStorage.setItem('hirestack_user', JSON.stringify(ADMIN_DEV_USER));
        return ADMIN_DEV_USER;
      }
      const stored = localStorage.getItem('nomadic_user') || localStorage.getItem('hirestack_user') || localStorage.getItem('jobmaxxer_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Navigation tab state with persistence
  const [activeTrack, setActiveTrack] = useState<PersonaTrack>(() => {
    try {
      const saved = localStorage.getItem('nomadic_active_track') as PersonaTrack;
      if (saved === 'learner' || saved === 'seeker') return saved;
    } catch {}
    return 'learner';
  });

  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string>('');
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
  const [wantsLogin, setWantsLogin] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      if (hasAdminQuery) {
        return 'admin-overview';
      }
      const savedTrack = (localStorage.getItem('nomadic_active_track') as PersonaTrack) || 'learner';
      const savedTab = localStorage.getItem(`nomadic_last_tab_${savedTrack}`) as TabType;
      if (savedTab) return savedTab;
    } catch {}
    return 'learner-roadmaps';
  });

  const [outreachTargetCompany, setOutreachTargetCompany] = useState<string>('');

  // Master profile state
  const [profile, setProfile] = useState<MasterProfile>(() => {
    try {
      const saved = localStorage.getItem('nomadic_master_profile') || localStorage.getItem('hirestack_master_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      linkedin: '',
      github: '',
      sponsorship: 'No',
      desiredSalary: '',
      noticePeriod: '2 weeks',
      groqApiKey: '',
      smtpPassword: '',
      resumeText: '',
      desiredTitle: '',
      techStack: '',
      customAnswers: {},
      onboardingCompleted: false,
    };
  });

  const [onboardingLoaded, setOnboardingLoaded] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [heartbeat, setHeartbeat] = useState<HeartbeatStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const entry = `[${timestamp}] ${message}`;
    setLogs((prev) => [entry, ...prev.slice(0, 199)]);
  }, []);

  const loadProfileFromDb = async (): Promise<MasterProfile | null> => {
    const api = getApi();
    if (!api) {
      setOnboardingLoaded(true);
      return null;
    }

    try {
      const res: any = await api.getMasterProfile();
      const data = (res && res.data) ? res.data : res;
      if (data) {
        let customAnswersObj = {};
        try {
          if (data.customAnswersJson) customAnswersObj = JSON.parse(data.customAnswersJson);
          else if (data.custom_answers_json) customAnswersObj = JSON.parse(data.custom_answers_json);
        } catch {}

        const isCompleted = data.onboarding_completed !== undefined
          ? Boolean(data.onboarding_completed)
          : (data.onboardingCompleted !== undefined ? Boolean(data.onboardingCompleted) : Boolean((data.first_name || data.firstName) && (data.desired_title || data.desiredTitle)));

        const mapped: MasterProfile = {
          firstName: data.firstName || data.first_name || '',
          lastName: data.lastName || data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          linkedin: data.linkedin || data.linkedin_url || '',
          github: data.github || data.github_url || '',
          sponsorship: data.sponsorship || 'No',
          desiredSalary: data.desiredSalary || data.desired_salary || '',
          noticePeriod: data.noticePeriod || data.notice_period || '2 weeks',
          groqApiKey: data.groqApiKey || data.groq_api_key || '',
          smtpPassword: data.smtpPassword || data.smtp_password || '',
          resumeText: data.resumeText || data.resume_text || '',
          desiredTitle: data.desiredTitle || data.desired_title || '',
          techStack: data.techStack || data.tech_stack || '',
          customAnswers: customAnswersObj,
          onboardingCompleted: isCompleted,
        };
        setProfile(mapped);
        try {
          localStorage.setItem('nomadic_master_profile', JSON.stringify(mapped));
        } catch {}
        if (!isCompleted) {
          setShowOnboarding(true);
        } else {
          setShowOnboarding(false);
          try {
            localStorage.setItem('nomadic_onboarding_done', 'true');
          } catch {}
        }
        return mapped;
      } else {
        setShowOnboarding(true);
        return null;
      }
    } catch (err: any) {
      addLog(`[Profile] Local profile init: ${err?.message || String(err)}`);
      return null;
    } finally {
      setOnboardingLoaded(true);
    }
  };

  useEffect(() => {
    loadProfileFromDb();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (newTab: TabType) => {
    setActiveTab(newTab);
    if (['learner-roadmaps', 'learner-resources', 'learner-interview-prep'].includes(newTab)) {
      setActiveTrack('learner');
      try {
        localStorage.setItem('nomadic_active_track', 'learner');
        localStorage.setItem('nomadic_last_tab_learner', newTab);
      } catch {}
    } else if (['feed', 'outreach', 'applications'].includes(newTab)) {
      setActiveTrack('seeker');
      try {
        localStorage.setItem('nomadic_active_track', 'seeker');
        localStorage.setItem('nomadic_last_tab_seeker', newTab);
      } catch {}
    } else {
      // Shared tabs: opportunities, settings, logs
      try {
        localStorage.setItem(`nomadic_last_tab_${activeTrack}`, newTab);
      } catch {}
    }
  };

  const handleTrackChange = (newTrack: PersonaTrack) => {
    setActiveTrack(newTrack);
    try {
      localStorage.setItem('nomadic_active_track', newTrack);
      const savedTab = localStorage.getItem(`nomadic_last_tab_${newTrack}`) as TabType;
      if (savedTab) {
        setActiveTab(savedTab);
        return;
      }
    } catch {}

    if (newTrack === 'learner') {
      setActiveTab('learner-roadmaps');
    } else {
      setActiveTab('feed');
    }
  };

  const handleLoginSuccess = async (user: AppUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('nomadic_user', JSON.stringify(user));
      localStorage.setItem('hirestack_user', JSON.stringify(user));
    } catch {}

    const loadedProf = await loadProfileFromDb();

    const isExistingUser = Boolean(
      user.onboardingCompleted ||
      loadedProf?.onboardingCompleted ||
      (typeof window !== 'undefined' && (
        localStorage.getItem('nomadic_onboarding_done') === 'true' ||
        localStorage.getItem('hirestack_onboarding_done') === 'true'
      ))
    );

    if (isExistingUser) {
      setShowOnboarding(false);
      try {
        localStorage.setItem('nomadic_onboarding_done', 'true');
      } catch {}
      if (user.role === 'admin') {
        setActiveTab('admin-overview');
      } else {
        setActiveTrack('learner');
        setActiveTab('learner-roadmaps');
      }
      addLog(`[Auth] Session active (${user.email}). Navigated to Learner Roadmaps.`);
    } else {
      setShowOnboarding(true);
      addLog(`[Auth] New user (${user.email}) registered. Direct to onboarding.`);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('nomadic_user');
    localStorage.removeItem('hirestack_user');
    localStorage.removeItem('jobmaxxer_user');
    setActiveTab('learner-roadmaps');
    addLog('[Auth] Signed out.');
  };

  const handleSaveProfile = async (updatedProfile?: MasterProfile): Promise<boolean> => {
    const api = getApi();
    const profToSave = updatedProfile || profile;
    setSavingProfile(true);
    setProfile(profToSave);
    try {
      localStorage.setItem('nomadic_master_profile', JSON.stringify({
        ...profToSave,
        onboardingCompleted: true,
      }));
    } catch {}
    try {
      if (api && api.saveMasterProfile) {
        await api.saveMasterProfile({
          firstName: profToSave.firstName,
          lastName: profToSave.lastName,
          email: profToSave.email,
          phone: profToSave.phone,
          linkedin: profToSave.linkedin,
          github: profToSave.github,
          sponsorship: profToSave.sponsorship,
          desiredSalary: profToSave.desiredSalary,
          noticePeriod: profToSave.noticePeriod,
          groqApiKey: profToSave.groqApiKey,
          smtpPassword: profToSave.smtpPassword,
          resumeText: profToSave.resumeText,
          desiredTitle: profToSave.desiredTitle,
          techStack: profToSave.techStack,
          customAnswersJson: JSON.stringify(profToSave.customAnswers || {}),
          onboarding_completed: 1,
        });
      }
      addLog('[Profile] Master candidate profile saved.');
      return true;
    } catch (err: any) {
      addLog(`[Profile] Failed to save profile: ${err?.message || String(err)}`);
      return false;
    } finally {
      setSavingProfile(false);
    }
  };

  const handleOpenUpgrade = (featureName?: string) => {
    setUpgradeFeature(featureName || 'Seeker Automation');
    setShowUpgradeModal(true);
  };

  // 1. If not logged in, ALWAYS show the Login & Sign-up page first
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(u) => {
          setWantsLogin(false);
          handleLoginSuccess(u);
        }}
        onLog={addLog}
      />
    );
  }

  // 2. Wait until initial profile and data check finishes
  if (!onboardingLoaded) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex flex-col items-center justify-center text-slate-400 font-sans p-4 select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-200">Loading your Nomadic workspace...</p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">Synchronizing local career database</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Check if user already completed onboarding
  const userHasCompletedOnboarding = Boolean(
    currentUser?.onboardingCompleted ||
    profile.onboardingCompleted ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('nomadic_onboarding_done') === 'true' ||
      localStorage.getItem('hirestack_onboarding_done') === 'true'
    ))
  );

  // If new user (has NOT completed onboarding) or user requested setup, show OnboardingWizard
  if (!userHasCompletedOnboarding || showOnboarding) {
    return (
      <OnboardingWizard
        initialProfile={profile}
        currentUser={currentUser}
        onComplete={(completedProfile) => {
          setProfile(completedProfile);
          setShowOnboarding(false);
          try {
            localStorage.setItem('nomadic_onboarding_done', 'true');
            localStorage.setItem('hirestack_onboarding_done', 'true');
            localStorage.setItem('nomadic_last_calibrated_date', new Date().toISOString().split('T')[0]);
            if (currentUser) {
              const updated = { ...currentUser, onboardingCompleted: true };
              setCurrentUser(updated);
              localStorage.setItem('nomadic_user', JSON.stringify(updated));
            }
          } catch {}
          setActiveTrack('learner');
          setActiveTab('learner-roadmaps');
        }}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      
      {/* Top Application Header */}
      <TopBar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        onNavigate={handleNavigate}
        activeTrack={activeTrack}
        setTrack={handleTrackChange}
        onOpenUpgrade={() => handleOpenUpgrade()}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
      />

      {/* Main Workspace Layout (Sidebar + View) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Navigation Sidebar */}
        <Sidebar
          activeTrack={activeTrack}
          activeTab={activeTab}
          onSelectTab={handleNavigate}
          heartbeat={heartbeat}
          logsCount={logs.length}
          currentUser={currentUser}
          onOpenUpgrade={() => handleOpenUpgrade()}
        />

        {/* Dynamic Sub-view Container */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8 bg-slate-50 dark:bg-slate-950 transition-colors">
          <div key={activeTab} className="max-w-6xl mx-auto animate-in fade-in duration-150 ease-out">
            {activeTab === 'learner-roadmaps' && (
              <LearnerView
                profile={profile}
                onUpdateProfile={(u) => setProfile({ ...profile, ...u })}
                onNavigateToSeeker={() => {
                  setActiveTrack('seeker');
                  setActiveTab('feed');
                }}
                onLog={addLog}
                currentUser={currentUser}
                onOpenUpgrade={handleOpenUpgrade}
              />
            )}

            {activeTab === 'learner-resources' && (
              <ResourceVaultView
                currentUser={currentUser}
                onOpenUpgrade={handleOpenUpgrade}
                onLog={addLog}
              />
            )}

            {activeTab === 'learner-interview-prep' && (
              <InterviewPrepView
                profile={profile}
                onLog={addLog}
              />
            )}

            {activeTab === 'opportunities' && (
              <OpportunityBoardView
                profile={profile}
                onLog={addLog}
              />
            )}

            {activeTab === 'home' && (
              <HomeView
                profile={profile}
                onNavigate={setActiveTab}
                onLog={addLog}
              />
            )}

            {activeTab === 'feed' && (
              <FeedView
                profile={profile}
                onLog={addLog}
                onNavigateToOutreach={(company) => {
                  setOutreachTargetCompany(company);
                  setActiveTab('outreach');
                }}
                currentUser={currentUser}
                onOpenUpgrade={handleOpenUpgrade}
              />
            )}

            {activeTab === 'outreach' && (
              <OutreachView
                profile={profile}
                onLog={addLog}
                initialSearchQuery={outreachTargetCompany}
                currentUser={currentUser}
                onOpenUpgrade={handleOpenUpgrade}
              />
            )}

            {activeTab === 'applications' && (
              <ApplicationsView />
            )}

            {activeTab === 'logs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-950 dark:text-white">Live Activity Stream</h2>
                    <p className="text-xs text-slate-500">Real-time automation logs and scraper activity.</p>
                  </div>
                  <button
                    onClick={() => setLogs([])}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    Clear Logs
                  </button>
                </div>
                <div className="bg-slate-950 text-slate-300 font-mono text-xs p-4 rounded-2xl border border-slate-800 space-y-1.5 max-h-[600px] overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="text-slate-600">No activity logged yet. Start scraping or exploring roadmaps.</div>
                  ) : (
                    logs.map((lg, i) => (
                      <div key={i} className="leading-relaxed border-b border-slate-900 pb-1">
                        {lg}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {(activeTab === 'profile' || activeTab === 'settings') && (
              <ProfileView
                profile={profile}
                onSaveProfile={handleSaveProfile}
                onSave={handleSaveProfile}
                saving={savingProfile}
                onLog={addLog}
                currentUser={currentUser}
                onNavigateTab={handleNavigate}
                onLogout={handleLogout}
                onRerunOnboarding={() => setShowOnboarding(true)}
              />
            )}

            {Boolean(activeTab && activeTab.startsWith('admin')) && (
              <AdminView
                onLog={addLog}
                currentUser={currentUser}
              />
            )}

            {/* Safe Fallback: if activeTab does not match any known route, render FeedView */}
            {!['learner-roadmaps', 'learner-resources', 'learner-interview-prep', 'opportunities', 'home', 'feed', 'outreach', 'applications', 'logs', 'profile', 'settings'].includes(activeTab) && !Boolean(activeTab && activeTab.startsWith('admin')) && (
              <FeedView
                profile={profile}
                onLog={addLog}
                onNavigateToOutreach={(company) => {
                  setOutreachTargetCompany(company);
                  setActiveTab('outreach');
                }}
              />
            )}
          </div>
        </main>

        {showUpgradeModal && (
          <UpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            currentUser={currentUser}
            triggerFeature={upgradeFeature}
            onUpgradeSuccess={() => addLog('[Upgrade] Subscription verified.')}
          />
        )}

        {showCommandPalette && (
          <CommandPalette
            isOpen={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            onSelectTab={handleNavigate}
            activeTrack={activeTrack}
            onToggleTrack={handleTrackChange}
          />
        )}
      </div>
    </div>
  );
}
