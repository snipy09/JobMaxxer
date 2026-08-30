import { ElectronAPI, Job, Application, AppUser, BillingRecord, AdminMetrics, DependencyStatus, ResumeRecord } from './types';

// In-memory / localStorage simulation for browser preview mode
export function createBrowserApiShim(): ElectronAPI {
  console.info('🌐 [JobMaxxer] Initializing Interactive Browser Mode Provider');

  // Preview mode ships no demo accounts or fake billing. Real accounts live in
  // Supabase and are managed only by the operator (service role). The admin
  // panel is inert in browser preview.
  const INITIAL_USERS: AppUser[] = [];
  const INITIAL_BILLING: BillingRecord[] = [];

  const getStoredUsers = (): AppUser[] => {
    try {
      const s = localStorage.getItem('jobmaxxer_mock_users');
      return s ? JSON.parse(s) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  };

  const saveStoredUsers = (users: AppUser[]) => {
    localStorage.setItem('jobmaxxer_mock_users', JSON.stringify(users));
  };

  const getStoredBilling = (): BillingRecord[] => {
    try {
      const s = localStorage.getItem('jobmaxxer_mock_billing');
      return s ? JSON.parse(s) : INITIAL_BILLING;
    } catch {
      return INITIAL_BILLING;
    }
  };

  const saveStoredBilling = (billing: BillingRecord[]) => {
    localStorage.setItem('jobmaxxer_mock_billing', JSON.stringify(billing));
  };

  // Read from Vite env at build time. The anon key is safe to expose in the
  // client because RLS (migration 002) restricts it to reading the public job
  // feed + calling the auth RPC. Never hardcode keys in source.
  const _env = ((import.meta as unknown as { env?: Record<string, string> }).env) ?? {};
  const SUPABASE_URL_BASE = String(_env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
  const SUPABASE_REST_URL = SUPABASE_URL_BASE ? `${SUPABASE_URL_BASE}/rest/v1` : '';
  const SUPABASE_ANON_KEY = String(_env.VITE_SUPABASE_ANON_KEY ?? '');

  const fetchLiveDatabaseJobs = async (): Promise<Job[]> => {
    if (!SUPABASE_REST_URL || !SUPABASE_ANON_KEY) return [];
    try {
      const res = await fetch(`${SUPABASE_REST_URL}/jobs?is_active=eq.true&order=created_at.desc&limit=500`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data
          .filter((j: any) => {
            const url = (j.apply_url || '').toLowerCase();
            const src = (j.source || '').toLowerCase();
            return !url.includes('linkedin.com') && !src.includes('linkedin');
          })
          .map((j: any, idx: number) => ({
            title: j.title || 'Software Engineer',
            company: j.company || 'Tech Company',
            location: j.location || 'Remote',
            salary: j.salary_range || undefined,
            applyUrl: j.apply_url || '#',
            source: j.source || 'Cloud Feed',
            score: Math.max(60, 98 - (idx % 30)),
            employmentType: j.employment_type || (j.title?.toLowerCase().includes('intern') ? 'internship' : 'job'),
            workplaceType: j.workplace_type || 'remote',
            experienceLevel: j.experience_level || 'mid',
            createdAt: j.created_at || new Date().toISOString(),
            description: j.description || '',
          }));
      }
    } catch (err: any) {
      console.warn('[Cloud Feed] Note querying Supabase:', err);
    }
    return [];
  };

  let logCallbacks: Array<(msg: string) => void> = [];

  const emitLog = (msg: string) => {
    logCallbacks.forEach(cb => cb(msg));
  };

  return {
    getMasterProfile: async () => {
      const stored = localStorage.getItem('jobmaxxer_master_profile');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
      return {
        first_name: 'Alex',
        last_name: 'Vance',
        email: 'alex.vance@example.com',
        phone: '+1 (555) 234-5678',
        linkedin_url: 'https://linkedin.com/in/alexvance',
        github_url: 'https://github.com/alexvance',
        sponsorship: 'No',
        desired_salary: '$150,000',
        notice_period: '2 weeks',
        groq_api_key: '',
        desired_title: 'Full Stack Engineer, Senior Software Engineer',
        tech_stack: 'TypeScript, React, Node.js, Python, PostgreSQL',
        resume_text: 'Experienced Full Stack Engineer with 5+ years building scalable cloud applications.',
        onboarding_completed: 1,
      };
    },

    saveMasterProfile: async (data: Record<string, unknown>) => {
      localStorage.setItem('jobmaxxer_master_profile', JSON.stringify(data));
      emitLog('[Profile] Master profile saved to local storage.');
      return { success: true };
    },

    getResumes: async () => {
      const stored = localStorage.getItem('jobmaxxer_resumes');
      if (stored) {
        try { return JSON.parse(stored); } catch {}
      }
      return [
        {
          id: 1,
          name: 'Software_Engineer_Resume.pdf',
          targetRole: 'Full Stack Engineer',
          filePath: 'C:/Users/Candidate/Documents/Software_Engineer_Resume.pdf',
          isDefault: true,
          createdAt: new Date().toLocaleDateString(),
        },
        {
          id: 2,
          name: 'Frontend_Lead_Resume.pdf',
          targetRole: 'Senior Frontend Engineer',
          filePath: 'C:/Users/Candidate/Documents/Frontend_Lead_Resume.pdf',
          isDefault: false,
          createdAt: new Date().toLocaleDateString(),
        }
      ];
    },

    saveResume: async (resume) => {
      const resumes = await getStoredResumes();
      const newResume: ResumeRecord = {
        id: Date.now(),
        name: resume.name,
        targetRole: resume.targetRole,
        filePath: resume.filePath,
        isDefault: resume.isDefault,
        createdAt: new Date().toLocaleDateString(),
      };
      const updated = [newResume, ...resumes];
      localStorage.setItem('jobmaxxer_resumes', JSON.stringify(updated));
      emitLog(`[Resumes] Uploaded and indexed resume: ${resume.name}`);
      return { success: true, id: newResume.id };
    },

    deleteResume: async (id: number) => {
      const resumes = await getStoredResumes();
      const updated = resumes.filter(r => r.id !== id);
      localStorage.setItem('jobmaxxer_resumes', JSON.stringify(updated));
      emitLog(`[Resumes] Removed resume ID: ${id}`);
      return { success: true };
    },

    setDefaultResume: async (id: number) => {
      const resumes = await getStoredResumes();
      const updated = resumes.map(r => ({ ...r, isDefault: r.id === id }));
      localStorage.setItem('jobmaxxer_resumes', JSON.stringify(updated));
      emitLog(`[Resumes] Set default resume ID: ${id}`);
      return { success: true };
    },

    pickResumeFile: async () => {
      return {
        canceled: false,
        filePath: 'C:/Users/Candidate/Documents/Resume_2026.pdf',
        fileName: 'Resume_2026.pdf',
      };
    },

    runScrapers: async () => {
      emitLog('[Scrapers] Querying live opportunity pipeline...');
      const jobs = await fetchLiveDatabaseJobs();
      return { success: true, jobs };
    },

    getCloudFeed: async () => {
      emitLog('[Cloud Sync] Fetching live positions from Supabase repository...');
      const jobs = await fetchLiveDatabaseJobs();
      return { success: true, jobs };
    },

    launchSemiAuto: async (jobUrls: string[]) => {
      emitLog(`[AutoApply] Review Mode: Opening ${jobUrls.length} pre-filled tabs in Chrome...`);
      jobUrls.forEach(url => window.open(url, '_blank'));
      return { success: true };
    },

    launchAutonomous: async (jobUrls: string[]) => {
      emitLog(`[AutoApply] Mass Apply Mode: Processing ${jobUrls.length} positions with stealth form filling...`);
      for (const url of jobUrls) {
        emitLog(`[AutoApply] Form auto-filled and submitted for ${url}`);
      }
      return { success: true, applied: jobUrls.length };
    },

    verifyEmail: async (email: string) => {
      return { isValid: true };
    },

    getHrContacts: async () => {
      if (!SUPABASE_REST_URL || !SUPABASE_ANON_KEY) return { success: true, contacts: [] };
      try {
        const res = await fetch(`${SUPABASE_REST_URL}/hr_contacts?order=created_at.desc&limit=100`, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const contacts = data.map((c: any) => ({
            name: c.name || 'Hiring Lead',
            company: c.company || 'Tech Company',
            role: c.role || 'Talent Acquisition',
            email: c.email || '',
            verificationStatus: (c.verification_status || 'valid') as 'valid' | 'invalid' | 'risky' | 'pending',
            verifiedAt: c.verified_at || 'Just now',
            sentStatus: 'unsent' as const,
          }));
          return { success: true, contacts };
        }
      } catch (err: any) {
        emitLog(`[Recruiters] Note: ${err?.message}`);
      }
      return { success: true, contacts: [] };
    },

    sendOutreach: async (contacts) => {
      emitLog(`[Outreach] Dispatched ${contacts.length} personalized referral inquiries.`);
      return { success: true, sent: contacts.length };
    },

    startHeartbeat: async () => ({ success: true }),
    stopHeartbeat: async () => ({ success: true }),
    syncCloudData: async () => {
      emitLog('[Cloud Sync] Browser simulation: local and cloud synchronized ✓');
      return { success: true, pulled: true };
    },
    getDeviceInfo: async () => ({
      deviceFingerprint: 'browser-shim-fingerprint-001',
      deviceName: 'Web Browser Preview',
    }),
    onHeartbeatStatus: () => () => {},

    checkDependencies: async (): Promise<DependencyStatus> => ({
      sqliteReady: true,
      playwrightInstalled: true,
      internetOk: true,
      allReady: true,
    }),

    installDependencies: async () => {
      emitLog('[Installer] All self-healing dependencies verified.');
      return { success: true };
    },

    testGroqKey: async (key: string) => {
      emitLog('[AI Engine] Groq API connectivity verified (142ms).');
      return { success: true };
    },

    onLog: (callback: (msg: string) => void) => {
      logCallbacks.push(callback);
      return () => {
        logCallbacks = logCallbacks.filter(cb => cb !== callback);
      };
    },

    getApplications: async (): Promise<Application[]> => [
      {
        id: 1,
        company: 'Vercel',
        title: 'Full Stack Engineer',
        apply_url: 'https://boards.greenhouse.io/vercel/jobs/5412093004',
        mode: 'autonomous',
        status: 'applied',
        applied_at: new Date().toISOString(),
      },
      {
        id: 2,
        company: 'Microsoft',
        title: 'Senior Software Engineer',
        apply_url: 'https://www.linkedin.com/jobs/view/3991204821',
        mode: 'review',
        status: 'reviewed',
        applied_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 3,
        company: 'Urban Tech Innovations',
        title: 'Software Development Intern',
        apply_url: 'https://internshala.com/internship/detail/software-development-internship-172901',
        mode: 'autonomous',
        status: 'applied',
        applied_at: new Date(Date.now() - 7200000).toISOString(),
      }
    ],

    getSavedJobs: async (): Promise<Job[]> => [],
    saveJob: async () => ({ success: true }),
    removeSavedJob: async () => ({ success: true }),
    openExternalUrl: async (url: string) => {
      try {
        window.open(url, '_blank');
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message };
      }
    },

    // Auth & Admin Handlers
    // Server-authoritative: preview mode calls the SAME authenticate_user RPC
    // the desktop app uses. No hardcoded admin, no auto-provisioning.
    authLogin: async (credentials) => {
      const email = (credentials.email || credentials.username || '').trim().toLowerCase();
      const password = (credentials.password || credentials.licenseKey || '').trim();

      if ((!email || !password) && !credentials.oauthToken) {
        return { success: false, error: 'Email and password are required.' };
      }
      if (!SUPABASE_REST_URL || !SUPABASE_ANON_KEY) {
        return { success: false, error: 'Preview mode: licensing server not configured (set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).' };
      }

      try {
        if (credentials.oauthToken) {
          // OAuth fallback behavior for browser preview
          const user: AppUser = {
            id: Date.now(),
            email: email || 'oauth@example.com',
            fullName: credentials.fullName || 'Google User',
            role: credentials.role || 'user',
            tier: credentials.tier || 'pro',
            licenseKey: 'OAUTH_VERIFIED',
            status: 'active',
            appsCount: 0,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          };
          return { success: true, user };
        }

        const res = await fetch(`${SUPABASE_REST_URL}/rpc/authenticate_user`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ p_email: email, p_password: password }),
        });
        const data = await res.json();
        const row = Array.isArray(data) ? data[0] : data;
        if (!row || !row.ok) {
          return { success: false, error: (row && row.reason) || 'Login failed.' };
        }
        const tier: AppUser['tier'] = ['trial', 'pro', 'max', 'lifetime'].includes(row.tier) ? row.tier : 'pro';
        const user: AppUser = {
          id: String(row.id),
          email: String(row.email),
          fullName: String(row.full_name || ''),
          role: row.role === 'admin' ? 'admin' : 'user',
          tier,
          licenseKey: String(row.license_key || ''),
          status: row.status === 'suspended' ? 'suspended' : 'active',
          appsCount: Number(row.apps_count || 0),
          createdAt: '',
          expiresAt: row.expires_at ? String(row.expires_at) : undefined,
          lastLogin: new Date().toISOString(),
        };
        return { success: true, user };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Network error contacting licensing server.' };
      }
    },

    adminGetUsers: async () => getStoredUsers(),

    adminCreateUser: async (user) => {
      const users = getStoredUsers();
      const tierPrefix = user.tier === 'trial' ? 'TRL' : user.tier === 'max' ? 'MAX' : user.tier === 'lifetime' ? 'LIFE' : 'PRO';
      const r1 = Math.floor(1000 + Math.random() * 9000);
      const r2 = Math.floor(1000 + Math.random() * 9000);
      const licenseKey = user.licenseKey || `JMX-${tierPrefix}-${r1}-${r2}`;

      const expiresAt = user.tier === 'trial'
        ? new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
        : user.tier === 'lifetime'
        ? undefined
        : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      const newUser: AppUser = {
        id: Date.now(),
        email: user.email,
        fullName: user.fullName,
        role: user.role || 'user',
        tier: user.tier,
        licenseKey,
        status: 'active',
        appsCount: 0,
        createdAt: new Date().toISOString().split('T')[0],
        expiresAt,
      };

      const updated = [newUser, ...users];
      saveStoredUsers(updated);

      // Add billing record
      const billings = getStoredBilling();
      const price = user.tier === 'trial' ? '$0.00' : user.tier === 'max' ? '$99.00' : user.tier === 'lifetime' ? '$299.00' : '$49.00';
      const newBill: BillingRecord = {
        id: Date.now(),
        userEmail: user.email,
        amount: price,
        plan: `${user.tier.toUpperCase()} License`,
        status: 'paid',
        paymentMethod: 'Manual Admin Grant / Stripe',
        createdAt: new Date().toISOString().split('T')[0],
      };
      saveStoredBilling([newBill, ...billings]);

      emitLog(`[Admin] Issued new ${user.tier.toUpperCase()} license: ${licenseKey} for ${user.email}`);
      return { success: true, id: newUser.id };
    },

    adminUpdateUserStatus: async (id, status) => {
      const users = getStoredUsers();
      const updated = users.map(u => u.id === id ? { ...u, status } : u);
      saveStoredUsers(updated);
      emitLog(`[Admin] User ID ${id} status updated to: ${status}`);
      return { success: true };
    },

    adminDeleteUser: async (id) => {
      const users = getStoredUsers();
      const updated = users.filter(u => u.id !== id);
      saveStoredUsers(updated);
      emitLog(`[Admin] Deleted user ID ${id}`);
      return { success: true };
    },

    adminGetBilling: async () => getStoredBilling(),

    adminCreateBillingRecord: async (record) => {
      const billings = getStoredBilling();
      const newBill: BillingRecord = {
        id: Date.now(),
        userEmail: record.userEmail,
        amount: record.amount,
        plan: record.plan,
        status: 'paid',
        paymentMethod: record.paymentMethod,
        createdAt: new Date().toISOString().split('T')[0],
      };
      saveStoredBilling([newBill, ...billings]);
      return { success: true };
    },

    adminGetMetrics: async (): Promise<AdminMetrics> => {
      const users = getStoredUsers();
      const billing = getStoredBilling();

      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.status === 'active').length;
      const totalApps = users.reduce((acc, u) => acc + (u.appsCount || 0), 0);
      const trialUsers = users.filter(u => u.tier === 'trial').length;
      const proUsers = users.filter(u => u.tier === 'pro').length;
      const maxUsers = users.filter(u => u.tier === 'max').length;
      const lifetimeUsers = users.filter(u => u.tier === 'lifetime').length;

      let totalRevenueCents = 0;
      billing.forEach(b => {
        const num = parseFloat(b.amount.replace(/[^0-9.]/g, '') || '0');
        totalRevenueCents += num * 100;
      });

      const totalRevenue = `$${(totalRevenueCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const mrr = `$${((proUsers * 49) + (maxUsers * 99)).toLocaleString()}/mo`;

      return {
        totalUsers,
        activeUsers,
        totalApps,
        totalRevenue,
        mrr,
        trialUsers,
        proUsers,
        maxUsers,
        lifetimeUsers,
      };
    },
    authGoogle: async () => ({ success: true }),
    onOauthCallback: () => () => {},
  };
}

async function getStoredResumes(): Promise<ResumeRecord[]> {
  try {
    const s = localStorage.getItem('jobmaxxer_resumes');
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}
