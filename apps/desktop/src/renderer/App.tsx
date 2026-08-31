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

export default function App() {
  // Current user state (persisted in localStorage)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
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

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const stored = localStorage.getItem('hirestack_user') || localStorage.getItem('jobmaxxer_user');
      if (stored) {
        const user: AppUser = JSON.parse(stored);
        return user.role === 'admin' ? 'admin-overview' : 'learner-roadmaps';
      }
    } catch {}
    return 'learner-roadmaps';
  });

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
      const res = await api.getMasterProfile();
      if (res.success && res.data) {
        const data = res.data;
        let customAnswersObj = {};
        try {
          if (data.customAnswersJson) customAnswersObj = JSON.parse(data.customAnswersJson);
        } catch {}

        const mapped: MasterProfile = {
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          linkedin: data.linkedin || '',
          github: data.github || '',
          sponsorship: data.sponsorship || 'No',
          desiredSalary: data.desiredSalary || '',
          noticePeriod: data.noticePeriod || '2 weeks',
          groqApiKey: data.groqApiKey || '',
          smtpPassword: data.smtpPassword || '',
          resumeText: data.resumeText || '',
          desiredTitle: data.desiredTitle || '',
          techStack: data.techStack || '',
          customAnswers: customAnswersObj,
          onboardingCompleted: true,
        };
        setProfile(mapped);
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

  // 1. If not logged in, show simple clean login page
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        onLog={addLog}
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
            {activeTab.startsWith('learner') && (
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
                onNavigateToOutreach={(company, jobTitle) => {
                  setActiveTab('outreach');
                }}
              />
            )}

            {activeTab === 'outreach' && (
              <OutreachView profile={profile} onLog={addLog} />
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
      </div>
    </div>
  );
}
