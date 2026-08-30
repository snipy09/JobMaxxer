import React, { useState, useEffect, useCallback } from 'react';
import {
  TabType, ThemeMode, MasterProfile, HeartbeatStatus, AppUser, getApi
} from './types';
import { OnboardingWizard } from './components/OnboardingWizard';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
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
      const stored = localStorage.getItem('jobmaxxer_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Navigation tab state - default to 'home' or 'admin-overview'
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const stored = localStorage.getItem('jobmaxxer_user');
      if (stored) {
        const user: AppUser = JSON.parse(stored);
        return user.role === 'admin' ? 'admin-overview' : 'home';
      }
    } catch {}
    return 'home';
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
    onboardingCompleted: false,
  });

  const [onboardingLoaded, setOnboardingLoaded] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [heartbeat, setHeartbeat] = useState<HeartbeatStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Add system log
  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-400), `[${time}] ${msg}`]);
  }, []);

  // Listen to IPC logs and heartbeat
  useEffect(() => {
    const api = getApi();
    if (!api) return;

    const unsubLog = api.onLog(addLog);
    const unsubHeartbeat = api.onHeartbeatStatus(status => {
      setHeartbeat(status);
    });

    return () => {
      unsubLog?.();
      unsubHeartbeat?.();
    };
  }, [addLog]);

  const loadProfileFromDb = async () => {
    const api = getApi();
    const localOnboardingFlag = localStorage.getItem('job_automator_onboarding_completed') === 'true';

    if (!api) {
      setShowOnboarding(!localOnboardingFlag);
      setOnboardingLoaded(true);
      return;
    }

    try {
      const data = await api.getMasterProfile();
      if (data) {
        const isCompleted =
          Boolean(data.onboarding_completed) ||
          Boolean(data.onboardingCompleted) ||
          localOnboardingFlag;

        setProfile({
          firstName: String(data.first_name || data.firstName || ''),
          lastName: String(data.last_name || data.lastName || ''),
          email: String(data.email || ''),
          phone: String(data.phone || ''),
          linkedin: String(data.linkedin || data.linkedin_url || ''),
          github: String(data.github || data.github_url || ''),
          sponsorship: String(data.sponsorship || 'No'),
          desiredSalary: String(data.desired_salary || data.desiredSalary || ''),
          noticePeriod: String(data.notice_period || data.noticePeriod || '2 weeks'),
          groqApiKey: String(data.groq_api_key || data.groqApiKey || ''),
          smtpPassword: String(data.smtp_password || data.smtpPassword || ''),
          resumeText: String(data.resume_text || data.resumeText || ''),
          desiredTitle: String(data.desired_title || data.desiredTitle || ''),
          techStack: String(data.tech_stack || data.techStack || ''),
          customAnswers: (() => {
            try {
              return JSON.parse(String(data.custom_answers_json || data.customAnswersJson || '{}'));
            } catch {
              return {};
            }
          })(),
          onboardingCompleted: isCompleted,
        });

        setShowOnboarding(!isCompleted);
      } else {
        setShowOnboarding(!localOnboardingFlag);
      }
    } catch (err) {
      console.error('Failed to load startup profile:', err);
      setShowOnboarding(!localOnboardingFlag);
    } finally {
      setOnboardingLoaded(true);
    }
  };

  // Load master profile & check onboarding state on startup
  useEffect(() => {
    loadProfileFromDb();
  }, []);

  const handleLoginSuccess = async (user: AppUser) => {
    setCurrentUser(user);
    localStorage.setItem('jobmaxxer_user', JSON.stringify(user));
    await loadProfileFromDb();
    if (user.role === 'admin') {
      setActiveTab('admin-overview');
    } else {
      setActiveTab('home');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('jobmaxxer_user');
    setActiveTab('home');
    addLog('[Auth] Signed out.');
  };

  // Save profile helper
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
      addLog('[Profile] Master profile saved to local SQLite.');
    } catch (err: any) {
      addLog(`[Profile] Failed to save profile: ${err?.message || String(err)}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleOnboardingComplete = (completedProfile: MasterProfile) => {
    setProfile(completedProfile);
    setShowOnboarding(false);
    localStorage.setItem('job_automator_onboarding_completed', 'true');
    addLog('[Onboarding] System setup completed. Application ready.');
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-mono text-xs">
        Initializing JobMaxxer...
      </div>
    );
  }

  // 3. Render onboarding wizard if needed (only for client users)
  if (showOnboarding && currentUser.role !== 'admin') {
    return (
      <OnboardingWizard
        initialProfile={profile}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden select-none">
      
      {/* Top Application Header */}
      <TopBar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        onNavigate={setActiveTab}
      />

      {/* Main Workspace Layout (Sidebar + Sub-view) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          heartbeat={heartbeat}
          logsCount={logs.length}
          currentUser={currentUser}
        />

        {/* Dynamic Sub-view Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 transition-colors">
          <div className="max-w-6xl mx-auto">
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

            {activeTab === 'logs' && (
              <ApplicationsView />
            )}

            {activeTab === 'settings' && (
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
      </div>
    </div>
  );
}
