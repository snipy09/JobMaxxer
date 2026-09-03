import { contextBridge, ipcRenderer } from 'electron';

const apiObj = {
  getMasterProfile: () => ipcRenderer.invoke('get-master-profile'),
  saveMasterProfile: (data: Record<string, unknown>) => ipcRenderer.invoke('save-master-profile', data),
  getResumes: () => ipcRenderer.invoke('get-resumes'),
  saveResume: (resume: Record<string, unknown>) => ipcRenderer.invoke('save-resume', resume),
  deleteResume: (id: number) => ipcRenderer.invoke('delete-resume', id),
  setDefaultResume: (id: number) => ipcRenderer.invoke('set-default-resume', id),
  pickResumeFile: () => ipcRenderer.invoke('pick-resume-file'),
  runScrapers: () => ipcRenderer.invoke('run-scrapers'),
  getCloudFeed: (userId: string) => ipcRenderer.invoke('get-cloud-feed', userId),
  launchSemiAuto: (jobUrls: string[]) => ipcRenderer.invoke('launch-semi-auto', jobUrls),
  launchAutonomous: (jobUrls: string[]) => ipcRenderer.invoke('launch-autonomous', jobUrls),
  verifyEmail: (email: string) => ipcRenderer.invoke('verify-email', email),
  getHrContacts: (targetRole?: string) => ipcRenderer.invoke('get-hr-contacts', targetRole),
  sendOutreach: (contacts: Array<{ email: string; name?: string; company?: string }>) =>
    ipcRenderer.invoke('send-outreach', contacts),
  getApplications: () => ipcRenderer.invoke('get-applications'),
  getSavedJobs: () => ipcRenderer.invoke('get-saved-jobs'),
  saveJob: (job: Record<string, unknown>) => ipcRenderer.invoke('save-job', job),
  removeSavedJob: (applyUrl: string) => ipcRenderer.invoke('remove-saved-job', applyUrl),
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  installDependencies: () => ipcRenderer.invoke('install-dependencies'),
  testGroqKey: (key: string) => ipcRenderer.invoke('test-groq-key', key),
  startHeartbeat: (userId: string, sessionToken: string, deviceFingerprint: string) =>
    ipcRenderer.invoke('start-heartbeat', { userId, sessionToken, deviceFingerprint }),
  stopHeartbeat: () => ipcRenderer.invoke('stop-heartbeat'),
  syncCloudData: () => ipcRenderer.invoke('sync-cloud-data'),
  getDeviceInfo: () => ipcRenderer.invoke('get-device-info'),
  onLog: (cb: (m: string) => void) => {
    const handler = (_: unknown, msg: string) => cb(msg);
    ipcRenderer.on('log', handler);
    return () => ipcRenderer.removeListener('log', handler);
  },
  onHeartbeatStatus: (cb: (status: { valid: boolean; reason?: string; ip?: string }) => void) => {
    const handler = (_: unknown, status: { valid: boolean; reason?: string; ip?: string }) => cb(status);
    ipcRenderer.on('heartbeat-status', handler);
    return () => ipcRenderer.removeListener('heartbeat-status', handler);
  },
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),

  // Learner Progress & Roadmap State
  getLearnerProgress: (roadmapId: string) => ipcRenderer.invoke('get-learner-progress', roadmapId),
  saveLearnerProgress: (progress: Record<string, unknown>) => ipcRenderer.invoke('save-learner-progress', progress),

  // Applications Management
  updateApplicationStatus: (id: number | string, status: string) =>
    ipcRenderer.invoke('update-application-status', { id, status }),
  deleteApplication: (id: number | string) => ipcRenderer.invoke('delete-application', id),

  // Interview Evaluation
  evaluateInterviewAnswer: (params: { questionId: string; questionTitle: string; answerText: string; category?: string }) =>
    ipcRenderer.invoke('evaluate-interview-answer', params),

  // Admin & Authentication APIs
  authLogin: (credentials: Record<string, unknown>) => ipcRenderer.invoke('auth-login', credentials),
  authSignup: (credentials: Record<string, unknown>) => ipcRenderer.invoke('auth-signup', credentials),
  adminGetUsers: () => ipcRenderer.invoke('admin-get-users'),
  adminCreateUser: (user: Record<string, unknown>) => ipcRenderer.invoke('admin-create-user', user),
  adminUpdateUserStatus: (id: number, status: string) => ipcRenderer.invoke('admin-update-user-status', { id, status }),
  adminDeleteUser: (id: number) => ipcRenderer.invoke('admin-delete-user', id),
  adminAssignPlan: (data: { userId: string | number; email?: string; planTier: string; expiresAt?: string }) =>
    ipcRenderer.invoke('admin-assign-plan', data),
  adminGetLearningResources: () => ipcRenderer.invoke('admin-get-learning-resources'),
  adminAddLearningResource: (resource: Record<string, unknown>) =>
    ipcRenderer.invoke('admin-add-learning-resource', resource),
  adminDeleteLearningResource: (id: number | string) =>
    ipcRenderer.invoke('admin-delete-learning-resource', id),
  getRecommendedResourcesForJob: (params: { title: string; description?: string; techStack?: string }) =>
    ipcRenderer.invoke('get-recommended-resources-for-job', params),
  adminGetBilling: () => ipcRenderer.invoke('admin-get-billing'),
  adminCreateBillingRecord: (record: Record<string, unknown>) => ipcRenderer.invoke('admin-create-billing-record', record),
  adminGetMetrics: () => ipcRenderer.invoke('admin-get-metrics'),
  authGoogle: () => ipcRenderer.invoke('auth-google'),
  onOauthCallback: (cb: (url: string) => void) => {
    const handler = (_: unknown, url: string) => cb(url);
    ipcRenderer.on('oauth-callback', handler);
    return () => ipcRenderer.removeListener('oauth-callback', handler);
  },
};

contextBridge.exposeInMainWorld('api', apiObj);
contextBridge.exposeInMainWorld('electronAPI', apiObj);
