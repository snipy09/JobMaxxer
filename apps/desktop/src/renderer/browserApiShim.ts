import { ElectronAPI, Job, Application, AppUser, BillingRecord, AdminMetrics, DependencyStatus, ResumeRecord } from './types';

// In-memory / localStorage simulation for browser preview mode
export function createBrowserApiShim(): ElectronAPI {
  console.info('🌐 [JobMaxxer] Initializing Interactive Browser Mode Provider');

  const INITIAL_USERS: AppUser[] = [
    {
      id: 1,
      email: 'raksha@jobmaxxer.com',
      fullName: 'Raksha (Master Admin)',
      role: 'admin',
      tier: 'lifetime',
      licenseKey: 'RAKSHA-MASTER-ADMIN-2026',
      status: 'active',
      appsCount: 0,
      createdAt: '2026-08-01 10:00:00',
    },
    {
      id: 2,
      email: 'lucas.trial@gmail.com',
      fullName: 'Lucas Meyer',
      role: 'user',
      tier: 'trial',
      licenseKey: 'JMX-TRL-1092-7712',
      status: 'active',
      appsCount: 15,
      createdAt: '2026-08-20 14:30:00',
      expiresAt: '2026-08-27 14:30:00',
      lastLogin: '2026-08-22 18:00:00',
    },
    {
      id: 3,
      email: 'alex.dev@gmail.com',
      fullName: 'Alex Vance',
      role: 'user',
      tier: 'pro',
      licenseKey: 'JMX-PRO-9842-8821',
      status: 'active',
      appsCount: 142,
      createdAt: '2026-08-10 09:15:00',
      expiresAt: '2026-09-10 09:15:00',
      lastLogin: '2026-08-22 16:45:00',
    },
    {
      id: 4,
      email: 'elena.cloud@outlook.com',
      fullName: 'Elena Rostova',
      role: 'user',
      tier: 'max',
      licenseKey: 'JMX-MAX-4412-9901',
      status: 'active',
      appsCount: 318,
      createdAt: '2026-07-28 11:20:00',
      expiresAt: '2026-08-28 11:20:00',
      lastLogin: '2026-08-22 19:15:00',
    },
    {
      id: 5,
      email: 'sarah.react@yahoo.com',
      fullName: 'Sarah Jenkins',
      role: 'user',
      tier: 'lifetime',
      licenseKey: 'JMX-LIFE-5501-3329',
      status: 'active',
      appsCount: 450,
      createdAt: '2026-07-15 08:00:00',
      lastLogin: '2026-08-22 15:30:00',
    }
  ];

  const INITIAL_BILLING: BillingRecord[] = [
    {
      id: 1,
      userEmail: 'elena.cloud@outlook.com',
      amount: '$99.00',
      plan: 'Max Plan ($99/mo)',
      status: 'paid',
      paymentMethod: 'Stripe Card (Visa •••• 4242)',
      createdAt: '2026-07-28',
    },
    {
      id: 2,
      userEmail: 'sarah.react@yahoo.com',
      amount: '$299.00',
      plan: 'Lifetime Founder License',
      status: 'paid',
      paymentMethod: 'Stripe Card (Mastercard •••• 8821)',
      createdAt: '2026-07-15',
    },
    {
      id: 3,
      userEmail: 'alex.dev@gmail.com',
      amount: '$49.00',
      plan: 'Pro Plan ($49/mo)',
      status: 'paid',
      paymentMethod: 'Stripe Card (Visa •••• 1092)',
      createdAt: '2026-08-10',
    },
    {
      id: 4,
      userEmail: 'lucas.trial@gmail.com',
      amount: '$0.00',
      plan: '7-Day Free Trial',
      status: 'paid',
      paymentMethod: 'Direct Trial Grant',
      createdAt: '2026-08-20',
    }
  ];

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

  const SAMPLE_JOBS: Job[] = [
    {
      title: 'Senior Full Stack Engineer',
      company: 'Microsoft',
      location: 'Remote / Hybrid, US',
      salary: '$165,000 - $215,000',
      applyUrl: 'https://www.linkedin.com/jobs/view/3991204821',
      source: 'LinkedIn',
      score: 97,
      description: 'Building next-generation cloud developer tooling and distributed services with TypeScript, React, and Node.js.',
    },
    {
      title: 'Full Stack Software Engineer',
      company: 'Vercel',
      location: 'Remote, Worldwide',
      salary: '$160,000 - $210,000',
      applyUrl: 'https://boards.greenhouse.io/vercel/jobs/5412093004',
      source: 'Greenhouse',
      score: 96,
      description: 'Join the Next.js and Vercel edge runtime team building high-performance web infrastructure.',
    },
    {
      title: 'Software Development Intern / Junior Developer',
      company: 'Urban Tech Innovations',
      location: 'Remote / India',
      salary: '$60,000 - $95,000',
      applyUrl: 'https://internshala.com/internship/detail/software-development-internship-172901',
      source: 'Internshala',
      score: 94,
      description: 'Featured Internshala high-growth startup internship for passionate full stack engineers.',
    },
    {
      title: 'Staff Frontend Engineer',
      company: 'Linear',
      location: 'Remote',
      salary: '$170,000 - $225,000',
      applyUrl: 'https://jobs.lever.co/linear/4819a820-21a4-4f51-bfa0',
      source: 'Lever',
      score: 93,
      description: 'Craft beautiful, high-speed project management tools with React, WebGL, and optimized sync engines.',
    },
    {
      title: 'Cloud Systems Engineer',
      company: 'Amazon Web Services',
      location: 'Remote, US',
      salary: '$185,000 - $245,000',
      applyUrl: 'https://www.linkedin.com/jobs/view/3981029412',
      source: 'LinkedIn',
      score: 92,
      description: 'AWS high-scale distributed backend teams hiring for core cloud virtualization and serverless architectures.',
    },
    {
      title: 'Backend & Infrastructure Engineer',
      company: 'Supabase',
      location: 'Remote',
      salary: '$150,000 - $200,000',
      applyUrl: 'https://boards.greenhouse.io/supabase/jobs/4019283002',
      source: 'Greenhouse',
      score: 91,
      description: 'Build open source Firebase alternatives with PostgreSQL, Elixir, Go, and TypeScript.',
    },
    {
      title: 'Junior Web Developer / Associate',
      company: 'Zeta Technologies',
      location: 'Remote',
      salary: '$75,000 - $110,000',
      applyUrl: 'https://internshala.com/job/detail/junior-fullstack-developer-189201',
      source: 'Internshala',
      score: 89,
      description: 'Direct hire placement for junior developers with strong fundamentals in modern web frameworks.',
    },
    {
      title: 'Senior Software Engineer',
      company: 'Stripe',
      location: 'Remote / Hybrid',
      salary: '$180,000 - $240,000',
      applyUrl: 'https://boards.greenhouse.io/stripe/jobs/6192834002',
      source: 'Greenhouse',
      score: 88,
      description: 'Design and scale the economic infrastructure for the global internet.',
    }
  ];

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
      emitLog('[Scrapers] Executing multi-source scraper engine...');
      return { success: true, jobs: SAMPLE_JOBS };
    },

    getCloudFeed: async () => {
      return { success: true, jobs: SAMPLE_JOBS };
    },

    launchSemiAuto: async (jobUrls: string[]) => {
      emitLog(`[AutoApply] Review Mode: Opening ${jobUrls.length} pre-filled tabs...`);
      jobUrls.forEach(url => window.open(url, '_blank'));
      return { success: true };
    },

    launchAutonomous: async (jobUrls: string[]) => {
      emitLog(`[AutoApply] Mass Apply Mode: Processing ${jobUrls.length} positions in batches of 20...`);
      for (const url of jobUrls) {
        emitLog(`[AutoApply] Stealth form filling completed for ${url}`);
      }
      return { success: true, applied: jobUrls.length };
    },

    verifyEmail: async (email: string) => {
      return { isValid: true };
    },

    sendOutreach: async (contacts) => {
      emitLog(`[Outreach] Dispatched ${contacts.length} personalized referral inquiries.`);
      return { success: true, sent: contacts.length };
    },

    startHeartbeat: async () => ({ success: true }),
    stopHeartbeat: async () => ({ success: true }),
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

    // Auth & Admin Handlers
    authLogin: async (credentials) => {
      const u = (credentials.username || credentials.email || '').trim().toLowerCase();
      const p = (credentials.password || credentials.licenseKey || '').trim();

      if (u === 'raksha' && p === 'raksha@sajal') {
        const adminUser: AppUser = {
          id: 1,
          email: 'raksha@jobmaxxer.com',
          fullName: 'Raksha (Master Admin)',
          role: 'admin',
          tier: 'lifetime',
          licenseKey: 'RAKSHA-MASTER-ADMIN-2026',
          status: 'active',
          appsCount: 0,
          createdAt: new Date().toISOString(),
        };
        return { success: true, user: adminUser };
      }

      const users = getStoredUsers();
      const found = users.find(user => 
        (user.email.toLowerCase() === u || user.licenseKey.toLowerCase() === u || user.fullName.toLowerCase().includes(u))
      );

      if (found) {
        if (found.status === 'suspended') {
          return { success: false, error: 'This account has been suspended.' };
        }
        if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) {
          return { success: false, error: 'Your 7-day trial has expired. Contact administrator to renew.' };
        }
        return { success: true, user: found };
      }

      // Default fallback for client buyers
      const clientUser: AppUser = {
        id: Date.now(),
        email: u.includes('@') ? u : `${u}@gmail.com`,
        fullName: u.split('@')[0].toUpperCase(),
        role: 'user',
        tier: 'pro',
        licenseKey: 'JMX-PRO-9842-8821',
        status: 'active',
        appsCount: 0,
        createdAt: new Date().toISOString(),
      };
      return { success: true, user: clientUser };
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
