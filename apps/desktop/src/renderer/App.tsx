import React, { useState, useEffect, useCallback } from 'react';
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
        localStorage.setItem('hirestack_user', JSON.stringify(ADMIN_DEV_USER));
        return ADMIN_DEV_USER;
      }
      const stored = localStorage.getItem('hirestack_user') || localStorage.getItem('jobmaxxer_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Navigation tab state
  const [activeTrack, setActiveTrack] = useState<PersonaTrack>('learner');
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string>('');
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
  const [wantsLogin, setWantsLogin] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      if (hasAdminQuery) {
        return 'admin-overview';
      }
      const stored = localStorage.getItem('hirestack_user') || localStorage.getItem('jobmaxxer_user');
      if (stored) {
        const user: AppUser = JSON.parse(stored);
        return user.role === 'admin' ? 'admin-overview' : 'learner-roadmaps';
      }
    } catch {}
    return 'learner-roadmaps';
  });

  const [outreachTargetCompany, setOutreachTargetCompany] = useState<string>('');

  // Master profile state
  const [profile, setProfile] = useState<MasterProfile>({
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
    onboardingCompleted: true,
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

  const loadProfileFromDb = async () => {
    const api = getApi();
    if (!api) {
      setOnboardingLoaded(true);
      return;
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
        if (!isCompleted) {
          setShowOnboarding(true);
        }
      } else {
        setShowOnboarding(true);
      }
    } catch (err: any) {
      addLog(`[Profile] Local profile init: ${err?.message || String(err)}`);
    } finally {
      setOnboardingLoaded(true);
    }
  };

  useEffect(() => {
    loadProfileFromDb();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLoginSuccess = async (user: AppUser) => {
    setCurrentUser(user);
    localStorage.setItem('hirestack_user', JSON.stringify(user));
    await loadProfileFromDb();
    if (user.role === 'admin') {
      setActiveTab('admin-overview');
    } else {
      setActiveTrack('learner');
      setActiveTab('learner-roadmaps');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('hirestack_user');
    localStorage.removeItem('jobmaxxer_user');
    setActiveTab('learner-roadmaps');
    addLog('[Auth] Signed out.');
  };

  const handleSaveProfile = async () => {
    const api = getApi();
    if (!api) return;
    setSavingProfile(true);
    try {
      await api.saveMasterProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        linkedin: profile.linkedin,
        github: profile.github,
        sponsorship: profile.sponsorship,
        desiredSalary: profile.desiredSalary,
        noticePeriod: profile.noticePeriod,
        groqApiKey: profile.groqApiKey,
        smtpPassword: profile.smtpPassword,
        resumeText: profile.resumeText,
        desiredTitle: profile.desiredTitle,
        techStack: profile.techStack,
        customAnswersJson: JSON.stringify(profile.customAnswers || {}),
        onboarding_completed: 1,
      });
      addLog('[Profile] Master candidate profile saved.');
    } catch (err: any) {
      addLog(`[Profile] Failed to save profile: ${err?.message || String(err)}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleOpenUpgrade = (featureName?: string) => {
    setUpgradeFeature(featureName || 'Seeker Automation');
    setShowUpgradeModal(true);
  };

  // Direct Onboarding route support via ?onboarding=true or #onboarding
  const isDirectOnboarding = typeof window !== 'undefined' && (
    new URLSearchParams(window.location.search).get('onboarding') === 'true' ||
    window.location.hash.includes('onboarding') ||
    showOnboarding
  );

  if (isDirectOnboarding && !wantsLogin) {
    return (
      <OnboardingWizard
        initialProfile={profile}
        onSwitchToLogin={() => setWantsLogin(true)}
        onComplete={(completedProfile) => {
          setProfile(completedProfile);
          setShowOnboarding(false);
          setActiveTab('learner-roadmaps');
          setActiveTrack('learner');
          if (!currentUser) {
            const newUser: AppUser = {
              id: 'usr_onboarded_' + Date.now(),
              email: completedProfile.email || 'alex.vance@hirestack.app',
              fullName: `${completedProfile.firstName || 'Alex'} ${completedProfile.lastName || 'Vance'}`.trim(),
              tier: 'learner_pro',
              role: 'user',
              licenseKey: 'HSTK-ONBOARD-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
              status: 'active',
              expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
            };
            setCurrentUser(newUser);
            try {
              localStorage.setItem('hirestack_user', JSON.stringify(newUser));
              localStorage.setItem('hirestack_onboarding_done', 'true');
            } catch {}
          }
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }}
      />
    );
  }

  // 1. If not logged in, show simple clean login page
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(u) => {
          setWantsLogin(false);
          handleLoginSuccess(u);
        }}
        onLog={addLog}
        onSwitchToOnboarding={() => {
          setWantsLogin(false);
          setShowOnboarding(true);
        }}
      />
    );
  }

  // 2. Wait until initial check finishes
  if (!onboardingLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        Initializing Hirestack...
      </div>
    );
  }

  // 3. Show Onboarding Wizard if user has not completed onboarding
  if (showOnboarding || !profile.onboardingCompleted) {
    return (
      <OnboardingWizard
        initialProfile={profile}
        onComplete={(completedProfile) => {
          setProfile(completedProfile);
          setShowOnboarding(false);
          setActiveTab('learner-roadmaps');
          setActiveTrack('learner');
        }}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden select-none font-sans">
      
      {/* Top Application Header */}
      <TopBar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        onNavigate={setActiveTab}
        activeTrack={activeTrack}
        setTrack={setActiveTrack}
        onOpenUpgrade={() => handleOpenUpgrade()}
      />

      {/* Main Workspace Layout (Sidebar + View) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Navigation Sidebar */}
        <Sidebar
          activeTrack={activeTrack}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          heartbeat={heartbeat}
          logsCount={logs.length}
          currentUser={currentUser}
          onOpenUpgrade={() => handleOpenUpgrade()}
        />

        {/* Dynamic Sub-view Container */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8 bg-slate-50 dark:bg-slate-950 transition-colors">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'learner-roadmaps' && (
              <LearnerView
                profile={profile}
                onUpdateProfile={(u) => setProfile({ ...profile, ...u })}
                onNavigateToSeeker={() => {
                  setActiveTrack('seeker');
                  setActiveTab('feed');
                }}
                onLog={addLog}
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
              />
            )}

            {activeTab === 'outreach' && (
              <OutreachView
                profile={profile}
                onLog={addLog}
                initialSearchQuery={outreachTargetCompany}
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
                setProfile={setProfile}
                onSave={handleSaveProfile}
                saving={savingProfile}
                onLog={addLog}
                logs={logs}
                onClearLogs={() => setLogs([])}
                heartbeat={heartbeat}
                currentUser={currentUser}
                onLogout={handleLogout}
                onRerunOnboarding={() => setShowOnboarding(true)}
              />
            )}

            {activeTab.startsWith('admin') && (
              <AdminView
                onLog={addLog}
                currentUser={currentUser}
              />
            )}
          </div>
        </main>

        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentUser={currentUser}
          triggerFeature={upgradeFeature}
          onUpgradeSuccess={() => addLog('[Upgrade] Subscription verified.')}
        />

        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          onSelectTab={setActiveTab}
          activeTrack={activeTrack}
          onToggleTrack={setActiveTrack}
        />
      </div>
    </div>
  );
}
