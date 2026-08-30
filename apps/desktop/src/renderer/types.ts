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
  groqApiKey: string;
  claudeApiKey?: string;
  hunterApiKey?: string;
  sendgridApiKey?: string;
  smtpPassword: string;
  resumeText: string;
  desiredTitle?: string;
  techStack?: string;
  autoApplyDelay?: number;
  saveScreenshots?: boolean;
  emailTone?: 'professional' | 'casual' | 'confident';
  emailSignature?: string;
  syncFrequency?: string;
  customAnswers: Record<string, string>;
  onboardingCompleted?: boolean;
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
  tags?: string[];
  description?: string;
  employmentType?: 'job' | 'internship';
  workplaceType?: 'remote' | 'hybrid' | 'onsite';
  experienceLevel?: 'entry' | 'mid' | 'senior';
  createdAt?: string;
}

export interface Application {
  id: number;
  company: string;
  title: string;
  apply_url: string;
  status: string;
  mode: string;
  applied_at: string;
}

export interface OutreachContact {
  email: string;
  name?: string;
  company?: string;
  role?: string;
  verificationStatus?: 'valid' | 'invalid' | 'pending' | 'risky' | 'catch-all';
  sentStatus?: 'unsent' | 'sent' | 'failed';
  sentAt?: string;
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
  | 'learner-roadmaps'
  | 'learner-resources'
  | 'learner-interview-prep'
  | 'home'
  | 'feed'
  | 'outreach'
  | 'logs'
  | 'settings'
  | 'admin-overview'
  | 'admin-users'
  | 'admin-billing';

export type ThemeMode = 'light';

export interface ResumeRecord {
  id?: number;
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
  licenseKey: string;
  status: 'active' | 'suspended';
  appsCount: number;
  createdAt: string;
  expiresAt?: string;
  lastLogin?: string;
  sessionToken?: string;
  deviceFingerprint?: string;
  deviceName?: string;
}

export interface BillingRecord {
  id: number | string;
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
  launchSemiAuto: (jobUrls: string[]) => Promise<{ success: boolean; error?: string }>;
  launchAutonomous: (jobUrls: string[]) => Promise<{ success: boolean; applied?: number; error?: string }>;
  verifyEmail: (email: string) => Promise<{ isValid: boolean; stageFailed?: number; reason?: string }>;
  getHrContacts: (targetRole?: string) => Promise<{ success: boolean; contacts: OutreachContact[]; error?: string }>;
  sendOutreach: (contacts: Array<{ email: string; name?: string; company?: string }>) =>
    Promise<{ success: boolean; sent?: number; error?: string }>;
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
  getSavedJobs: () => Promise<Job[]>;
  saveJob: (job: Job) => Promise<{ success: boolean; error?: string }>;
  removeSavedJob: (applyUrl: string) => Promise<{ success: boolean; error?: string }>;
  openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>;

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
  adminGetBilling: () => Promise<BillingRecord[]>;
  adminCreateBillingRecord: (record: {
    userEmail: string;
    amount: string;
    plan: string;
    paymentMethod: string;
  }) => Promise<{ success: boolean; error?: string }>;
  adminGetMetrics: () => Promise<AdminMetrics>;
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
