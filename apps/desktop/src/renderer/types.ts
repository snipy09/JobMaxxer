export interface MasterProfile {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  sponsorship: string;
  desiredSalary: string;
  noticePeriod: string;
  groqApiKey?: string;
  geminiApiKey?: string;
  claudeApiKey?: string;
  hunterApiKey?: string;
  sendgridApiKey?: string;
  smtpPassword?: string;
  resumeText: string;
  resumeFilePath?: string;
  desiredTitle?: string;
  techStack?: string;
  autoApplyDelay?: number;
  saveScreenshots?: boolean;
  emailTone?: 'professional' | 'casual' | 'confident';
  emailSignature?: string;
  syncFrequency?: string;
  customAnswers: Record<string, string>;
  onboardingCompleted?: boolean;
  workplaceType?: 'remote' | 'hybrid' | 'onsite';
  experienceLevel?: 'entry' | 'mid' | 'senior';
}

export interface Job {
  id?: number | string;
  title: string;
  company: string;
  applyUrl: string;
  location?: string;
  salary?: string;
  source?: string;
  score?: number;
  matchedSkills?: string[];
  tags?: string[];
  description?: string;
  employmentType?: 'job' | 'internship';
  workplaceType?: 'remote' | 'hybrid' | 'onsite';
  experienceLevel?: 'entry' | 'mid' | 'senior';
  createdAt?: string;
}

export interface Application {
  id?: number;
  company: string;
  title: string;
  apply_url: string;
  status: string;
  mode: string;
  applied_at: string;
  created_at?: string;
}

export interface OutreachContact {
  email: string;
  name?: string;
  company?: string;
  role?: string;
  department?: 'Engineering' | 'Talent Acquisition' | 'Product' | 'Executive' | string;
  verificationStatus?: 'valid' | 'invalid' | 'pending' | 'risky' | 'catch-all';
  sentStatus?: 'unsent' | 'sent' | 'failed' | 'drafted';
  sentAt?: string;
  verifiedAt?: string;
  isTargetCompany?: boolean;
  matchScore?: number;
  linkedinUrl?: string;
}

export interface CuratedResource {
  id: number;
  title: string;
  youtubeUrl: string;
  topic: string;
  targetRole: string;
  summary: string;
  duration: string;
  createdAt?: string;
}

export interface DependencyStatus {
  sqliteReady: boolean;
  playwrightInstalled: boolean;
  internetOk: boolean;
  allReady: boolean;
}

export interface HeartbeatStatus {
  valid: boolean;
  reason?: string;
  ip?: string;
}

export type PersonaTrack = 'learner' | 'seeker';

export type TabType =
  | 'home'
  | 'feed'
  | 'applications'
  | 'outreach'
  | 'profile'
  | 'opportunities'
  | 'learner-roadmaps'
  | 'learner-resources'
  | 'learner-interview-prep'
  | 'learner-vault'
  | 'learner-drills'
  | 'admin-overview'
  | 'admin-users'
  | 'admin-billing'
  | 'admin-metrics'
  | 'admin-curator'
  | 'logs'
  | 'settings'
  | 'account';

export type ThemeMode = 'dark' | 'light' | 'system';

export interface ResumeRecord {
  id: number;
  name: string;
  targetRole: string;
  filePath: string;
  isDefault: boolean;
  createdAt?: string;
}

export interface AppUser {
  id: number | string;
  email: string;
  fullName: string;
  role: 'admin' | 'user';
  tier: 'trial' | 'pro' | 'max' | 'lifetime';
  licenseKey?: string;
  status: 'active' | 'suspended';
  appsCount: number;
  createdAt: string;
  expiresAt?: string;
}

export interface BillingRecord {
  id: number;
  userEmail: string;
  amount: string;
  plan: string;
  status: 'paid' | 'pending' | 'refunded';
  paymentMethod: string;
  createdAt: string;
}

export interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalApps: number;
  totalRevenue: string;
  mrr: string;
  trialUsers: number;
  proUsers: number;
  maxUsers: number;
  lifetimeUsers: number;
}

export interface CustomRoadmapRecord {
  id: string;
  roleTitle: string;
  domain: string;
  targetHorizon: string;
  dailyCommitment: string;
  roadmapJson: string;
  updatedAt: string;
}

export interface ActivityHeatmapDay {
  date: string;
  count: number;
}

export interface ActivityStats {
  streakCount: number;
  totalActions: number;
}

export interface AppUpdateInfo {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName?: string;
  releaseNotes?: string;
  downloadUrl?: string;
}

export interface ElectronAPI {
  getMasterProfile: () => Promise<Record<string, unknown> | null>;
  saveMasterProfile: (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  getResumes: () => Promise<ResumeRecord[]>;
  saveResume: (resume: { name: string; targetRole: string; filePath: string; isDefault: boolean }) =>
    Promise<{ success: boolean; id?: number; error?: string }>;
  deleteResume: (id: number) => Promise<{ success: boolean; error?: string }>;
  setDefaultResume: (id: number) => Promise<{ success: boolean; error?: string }>;
  pickResumeFile: () => Promise<{ canceled: boolean; filePath?: string; fileName?: string }>;
  runScrapers: () => Promise<{ success: boolean; jobs: Job[]; error?: string }>;
  getCloudFeed: (userId: string) => Promise<{ success: boolean; jobs: Job[]; error?: string }>;
  launchSemiAuto: (jobUrls: string[]) => Promise<{ success: boolean; error?: string; incompleteProfile?: boolean }>;
  launchAutonomous: (jobUrls: string[]) => Promise<{
    success: boolean;
    applied?: number;
    skipped?: number;
    totalBatches?: number;
    limitReached?: boolean;
    incompleteProfile?: boolean;
    currentUsage?: number;
    maxAllowed?: number;
    error?: string;
  }>;
  verifyEmail: (email: string) => Promise<{ isValid: boolean; stageFailed?: number; reason?: string }>;
  getHrContacts: (targetRole?: string) => Promise<{ success: boolean; contacts: OutreachContact[]; error?: string }>;
  sendOutreach: (contacts: Array<{ email: string; name?: string; company?: string; role?: string; subject?: string; body?: string }>) =>
    Promise<{ success: boolean; sent?: number; mode?: string; error?: string }>;
  startHeartbeat: (userId: string, sessionToken: string, deviceFingerprint: string) =>
    Promise<{ success: boolean }>;
  stopHeartbeat: () => Promise<{ success: boolean }>;
  syncCloudData: () => Promise<{ success: boolean; pulled?: boolean; error?: string }>;
  getDeviceInfo: () => Promise<{ deviceFingerprint: string; deviceName: string }>;
  onHeartbeatStatus: (callback: (status: HeartbeatStatus) => void) => () => void;
  checkDependencies: () => Promise<DependencyStatus>;
  installDependencies: () => Promise<{ success: boolean; error?: string }>;
  testGroqKey: (key: string) => Promise<{ success: boolean; error?: string }>;
  onLog: (callback: (msg: string) => void) => () => void;
  getApplications: () => Promise<Application[]>;
  saveApplication: (app: { company: string; title: string; apply_url: string; status?: string; mode?: string }) =>
    Promise<{ success: boolean; id?: number; error?: string }>;
  updateApplicationStatus: (id: number | string, status: string) => Promise<{ success: boolean; error?: string }>;
  deleteApplication: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  getSavedJobs: () => Promise<Job[]>;
  saveJob: (job: Job) => Promise<{ success: boolean; error?: string }>;
  removeSavedJob: (applyUrl: string) => Promise<{ success: boolean; error?: string }>;
  openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>;

  // AI Generation Handlers
  generateAiOnboardingProfile: (params: {
    targetRole: string;
    experienceLevel?: string;
    bioOrResumeText?: string;
    customSkills?: string[];
    geminiKey?: string;
    groqKey?: string;
  }) => Promise<{
    success: boolean;
    profile?: Partial<MasterProfile>;
    roadmap?: any;
    error?: string;
  }>;
  generateCustomRoadmap: (params: {
    roleTitle: string;
    currentSkills?: string;
    targetHorizon?: string;
    dailyCommitment?: string;
    geminiKey?: string;
    groqKey?: string;
  }) => Promise<{
    success: boolean;
    roadmap?: any;
    error?: string;
  }>;
  getCustomRoadmaps: () => Promise<CustomRoadmapRecord[]>;
  saveCustomRoadmap: (roadmap: {
    id: string;
    roleTitle: string;
    domain: string;
    roadmapJson: string;
    targetHorizon?: string;
    dailyCommitment?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteCustomRoadmap: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Activity Heatmap & Logging
  getActivityHeatmap: (days?: number) => Promise<ActivityHeatmapDay[]>;
  logUserActivity: (activityType: string, details?: string) => Promise<{ success: boolean }>;
  getActivityStats: () => Promise<ActivityStats>;

  // Learner Progress & Roadmap State
  getLearnerProgress: (roadmapId: string) => Promise<{
    roadmapId: string;
    completedNodes: string[];
    targetHorizon?: string;
    dailyCommitment?: string;
    streakCount?: number;
    lastActiveDate?: string;
  } | null>;
  saveLearnerProgress: (progress: {
    roadmapId: string;
    completedNodes: string[];
    targetHorizon?: string;
    dailyCommitment?: string;
    streakCount?: number;
  }) => Promise<{ success: boolean }>;

  // Interview Evaluation
  evaluateInterviewAnswer: (params: {
    questionId: string;
    questionTitle: string;
    answerText: string;
    category?: string;
  }) => Promise<{
    score: number;
    review: string;
    strengths?: string[];
    improvements?: string[];
  }>;

  // Admin & Auth Handlers
  authLogin: (credentials: {
    username?: string;
    email?: string;
    password?: string;
    licenseKey?: string;
    forceTakeover?: boolean;
    oauthToken?: boolean;
    tier?: 'trial' | 'pro' | 'max' | 'lifetime';
    role?: 'admin' | 'user';
    fullName?: string;
  }) => Promise<{
    success: boolean;
    conflict?: boolean;
    activeDevice?: string;
    user?: AppUser;
    error?: string;
  }>;
  authSignup?: (credentials: {
    email: string;
    password?: string;
    fullName?: string;
  }) => Promise<{
    success: boolean;
    user?: AppUser;
    error?: string;
  }>;
  authGoogle: () => Promise<{ success: boolean; error?: string }>;
  onOauthCallback: (callback: (url: string) => void) => () => void;
  adminGetUsers: () => Promise<AppUser[]>;
  adminCreateUser: (user: {
    email: string;
    password?: string;
    fullName: string;
    tier: 'trial' | 'pro' | 'max' | 'lifetime';
    licenseKey?: string;
    role?: 'admin' | 'user';
  }) => Promise<{ success: boolean; id?: number | string; error?: string }>;
  adminUpdateUserStatus: (id: number | string, status: 'active' | 'suspended') => Promise<{ success: boolean; error?: string }>;
  adminDeleteUser: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  adminAssignPlan: (data: {
    userId: string | number;
    email?: string;
    planTier: string;
    expiresAt?: string;
  }) => Promise<{ success: boolean; error?: string }>;

  // Admin Curated Video & Learning Resource Management
  adminGetLearningResources: () => Promise<CuratedResource[]>;
  adminAddLearningResource: (resource: {
    title: string;
    youtubeUrl: string;
    topic: string;
    targetRole: string;
    summary?: string;
    duration?: string;
  }) => Promise<{ success: boolean; id?: number; error?: string }>;
  adminDeleteLearningResource: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  getRecommendedResourcesForJob: (params: {
    title: string;
    description?: string;
    techStack?: string;
  }) => Promise<CuratedResource[]>;

  adminGetBilling: () => Promise<BillingRecord[]>;
  adminCreateBillingRecord: (record: {
    userEmail: string;
    amount: string;
    plan: string;
    paymentMethod: string;
  }) => Promise<{ success: boolean; error?: string }>;
  adminGetMetrics: () => Promise<AdminMetrics>;

  // In-App Updates
  checkForUpdates?: () => Promise<AppUpdateInfo>;
  downloadUpdate?: (downloadUrl?: string) => Promise<{ success: boolean; filePath?: string; openedBrowser?: boolean; error?: string }>;
  installUpdate?: (installerPath?: string) => Promise<{ success: boolean; error?: string }>;
  onUpdateDownloadProgress?: (cb: (pct: number) => void) => () => void;
}

declare global {
  interface Window {
    api?: ElectronAPI;
    electronAPI?: ElectronAPI;
  }
}

import { createBrowserApiShim } from './browserApiShim';

let browserShimInstance: ElectronAPI | null = null;

export function getApi(): ElectronAPI {
  if (typeof window !== 'undefined') {
    if (window.api) return window.api;
    if (window.electronAPI) return window.electronAPI;
  }
  if (!browserShimInstance) {
    browserShimInstance = createBrowserApiShim();
  }
  return browserShimInstance;
}
