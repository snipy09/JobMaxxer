import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
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

  // Admin & Authentication APIs
  authLogin: (credentials: Record<string, unknown>) => ipcRenderer.invoke('auth-login', credentials),
  adminGetUsers: () => ipcRenderer.invoke('admin-get-users'),
  adminCreateUser: (user: Record<string, unknown>) => ipcRenderer.invoke('admin-create-user', user),
  adminUpdateUserStatus: (id: number, status: string) => ipcRenderer.invoke('admin-update-user-status', { id, status }),
  adminDeleteUser: (id: number) => ipcRenderer.invoke('admin-delete-user', id),
  adminGetBilling: () => ipcRenderer.invoke('admin-get-billing'),
  adminCreateBillingRecord: (record: Record<string, unknown>) => ipcRenderer.invoke('admin-create-billing-record', record),
  adminGetMetrics: () => ipcRenderer.invoke('admin-get-metrics'),
});
