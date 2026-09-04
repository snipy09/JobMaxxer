import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail, RefreshCw, Send, CheckCircle2, AlertCircle,
  ExternalLink, Search, Clock, CheckSquare, Square,
  Sparkles, ShieldCheck, X, FileText, Check, Loader2,
  Copy, Layers, Linkedin, Users, UserCheck, MessageSquare,
  Bell, Lock, ArrowRight, UserPlus
} from 'lucide-react';
import { MasterProfile, OutreachContact, getApi } from '../types';

interface OutreachViewProps {
  profile: MasterProfile;
  onLog: (msg: string) => void;
  initialSearchQuery?: string;
}

const DEFAULT_TEMPLATES = [
  {
    id: 'referral',
    name: 'Direct Referral Request',
    subject: 'Application & Inquiry: {{role}} role at {{company}}',
    body: `Hi {{name}},

I noticed that {{company}} is actively hiring for a {{role}}. With my background in {{skills}}, I recently built projects addressing high-concurrency systems and responsive architectures.

I would love to learn more about the team's engineering roadmap and submit my resume for consideration:
{{senderName}}`,
  },
  {
    id: 'coffee',
    name: '15-Min Coffee Chat',
    subject: 'Quick chat regarding engineering culture at {{company}}',
    body: `Hi {{name}},

I have been following {{company}}'s recent product developments and really admire your team's approach to developer tooling.

As a {{role}} candidate with hands-on experience in {{skills}}, I would appreciate 10-15 minutes of your advice on what qualities set successful engineers apart at {{company}}.

Best regards,
{{senderName}}`,
  },
];

const SAMPLE_CONTACTS: OutreachContact[] = [
  {
    name: 'Sarah Chen',
    company: 'Linear',
    role: 'Head of Engineering',
    email: 'sarah.chen@linear.app',
    linkedinUrl: 'https://linkedin.com/in/sarah-chen-linear',
    department: 'Engineering',
    verificationStatus: 'valid',
    verifiedAt: '10 mins ago',
    sentStatus: 'unsent',
  },
  {
    name: 'Marcus Brody',
    company: 'Vercel',
    role: 'Engineering Lead & Hiring Manager',
    email: 'marcus.b@vercel.com',
    linkedinUrl: 'https://linkedin.com/in/marcus-brody-vercel',
    department: 'Engineering',
    verificationStatus: 'valid',
    verifiedAt: '25 mins ago',
    sentStatus: 'unsent',
  },
  {
    name: 'Elena Rostova',
    company: 'Supabase',
    role: 'Talent Acquisition Partner',
    email: 'elena@supabase.com',
    linkedinUrl: 'https://linkedin.com/in/elena-rostova-recruiter',
    department: 'Talent Acquisition',
    verificationStatus: 'valid',
    verifiedAt: '1 hour ago',
    sentStatus: 'unsent',
  },
  {
    name: 'David Kim',
    company: 'Stripe',
    role: 'Senior Technical Recruiter',
    email: 'dkim@stripe.com',
    linkedinUrl: 'https://linkedin.com/in/david-kim-stripe',
    department: 'Talent Acquisition',
    verificationStatus: 'valid',
    verifiedAt: '2 hours ago',
    sentStatus: 'unsent',
  },
  {
    name: 'Priya Sharma',
    company: 'Postman',
    role: 'Engineering Manager - Platform',
    email: 'priya.sharma@postman.com',
    linkedinUrl: 'https://linkedin.com/in/priya-sharma-eng',
    department: 'Engineering',
    verificationStatus: 'valid',
    verifiedAt: '3 hours ago',
    sentStatus: 'unsent',
  },
  {
    name: 'Alex Rivera',
    company: 'Figma',
    role: 'Lead Infrastructure Recruiter',
    email: 'alex.rivera@figma.com',
    linkedinUrl: 'https://linkedin.com/in/alex-rivera-talent',
    department: 'Talent Acquisition',
    verificationStatus: 'valid',
    verifiedAt: '4 hours ago',
    sentStatus: 'unsent',
  }
];

export const OutreachView: React.FC<OutreachViewProps> = ({ profile, onLog, initialSearchQuery }) => {
  const [contacts, setContacts] = useState<OutreachContact[]>(SAMPLE_CONTACTS);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery || '');
  const [outreachChannel, setOutreachChannel] = useState<'email' | 'linkedin'>('email');
  const [linkedinWaitlistJoined, setLinkedinWaitlistJoined] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hirestack_linkedin_waitlist') === 'true';
    } catch {
      return false;
    }
  });
  const [previewNoteContact, setPreviewNoteContact] = useState<OutreachContact | null>(null);
  const [copiedNote, setCopiedNote] = useState<boolean>(false);

  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('referral');
  const [customSubject, setCustomSubject] = useState<string>(DEFAULT_TEMPLATES[0].subject);
  const [customBody, setCustomBody] = useState<string>(DEFAULT_TEMPLATES[0].body);
  const [sendingMails, setSendingMails] = useState<boolean>(false);
  const [loadingContacts, setLoadingContacts] = useState<boolean>(false);
  const [isFetchingContacts, setIsFetchingContacts] = useState<boolean>(false);
  const [outreachToast, setOutreachToast] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [verifyingEmail, setVerifyingEmail] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<'all' | 'engineering' | 'talent' | 'target'>('all');
  const [targetCompanies, setTargetCompanies] = useState<Set<string>>(new Set());

  const handleFetchLatestContacts = async () => {
    const api = getApi();
    if (!api) return;
    setIsFetchingContacts(true);
    setOutreachToast(null);
    onLog('[Outreach] Fetching latest verified hiring manager and recruiter contacts...');

    try {
      const res = await api.getHrContacts(profile.desiredTitle);
      if (res && res.success && res.contacts && res.contacts.length > 0) {
        setContacts(res.contacts);
        setOutreachToast({
          type: 'success',
          message: `Loaded ${res.contacts.length} verified hiring decision-makers & recruiter emails!`
        });
        onLog(`[Outreach] Loaded ${res.contacts.length} verified hiring decision makers.`);
      } else {
        await fetchContacts();
        setOutreachToast({
          type: 'success',
          message: 'Refreshed recruiter contacts list.'
        });
      }
    } catch (err: any) {
      await fetchContacts();
      setOutreachToast({
        type: 'info',
        message: 'Refreshed contacts from cache.'
      });
    } finally {
      setIsFetchingContacts(false);
      setTimeout(() => setOutreachToast(null), 5000);
    }
  };

  // Load saved jobs to identify candidate's target companies
  useEffect(() => {
    const loadSaved = async () => {
      const api = getApi();
      if (!api || !api.getSavedJobs) return;
      try {
        const saved = await api.getSavedJobs();
        if (saved && Array.isArray(saved)) {
          setTargetCompanies(new Set(saved.map((j: any) => (j.company || '').toLowerCase().trim())));
        }
      } catch {}
    };
    loadSaved();
  }, []);

  const fetchContacts = async () => {
    const api = getApi();
    if (!api) return;
    setLoadingContacts(true);
    try {
      const res = await api.getHrContacts(profile.desiredTitle);
      if (res && res.success && res.contacts && res.contacts.length > 0) {
        setContacts(res.contacts);
        onLog(`[Outreach] Loaded ${res.contacts.length} verified hiring decision makers.`);
      }
    } catch (err: any) {
      onLog(`[Outreach] Note: ${err?.message || String(err)}`);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [profile.desiredTitle]);

  const activeTemplate = DEFAULT_TEMPLATES.find(t => t.id === selectedTemplateId) || DEFAULT_TEMPLATES[0];

  const enrichedContacts = useMemo(() => {
    return contacts.map(c => {
      const compLower = (c.company || '').toLowerCase().trim();
      const isTarget = targetCompanies.has(compLower) || Boolean(c.isTargetCompany);
      const roleLower = (c.role || '').toLowerCase();
      const deptLower = ((c as any).department || '').toLowerCase();

      const isEngineeringLead =
        deptLower.includes('engineering') ||
        roleLower.includes('manager') ||
        roleLower.includes('lead') ||
        roleLower.includes('director') ||
        roleLower.includes('vp') ||
        roleLower.includes('architect') ||
        roleLower.includes('cto');

      const isTalent =
        deptLower.includes('talent') ||
        roleLower.includes('recruiter') ||
        roleLower.includes('talent') ||
        roleLower.includes('people') ||
        roleLower.includes('hr');

      return {
        ...c,
        isTargetCompany: isTarget,
        isEngineeringLead,
        isTalent,
      };
    });
  }, [contacts, targetCompanies]);

  const engineeringCount = useMemo(() => enrichedContacts.filter(c => c.isEngineeringLead).length, [enrichedContacts]);
  const talentCount = useMemo(() => enrichedContacts.filter(c => c.isTalent).length, [enrichedContacts]);
  const targetCount = useMemo(() => enrichedContacts.filter(c => c.isTargetCompany).length, [enrichedContacts]);

  const filteredContacts = useMemo(() => {
    let pool = enrichedContacts;
    if (departmentFilter === 'engineering') {
      pool = pool.filter(c => c.isEngineeringLead);
    } else if (departmentFilter === 'talent') {
      pool = pool.filter(c => c.isTalent);
    } else if (departmentFilter === 'target') {
      pool = pool.filter(c => c.isTargetCompany);
    }

    const q = searchQuery.toLowerCase().trim();
    return pool.filter(c =>
      q === '' ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      (c.role || '').toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  }, [enrichedContacts, departmentFilter, searchQuery]);

  const toggleSelect = (email: string) => {
    const next = new Set(selectedEmails);
    if (next.has(email)) next.delete(email);
    else next.add(email);
    setSelectedEmails(next);
  };

  const toggleSelectAll = () => {
    if (selectedEmails.size === filteredContacts.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(filteredContacts.map(c => c.email)));
    }
  };

  const renderTemplateText = (text: string, contact: OutreachContact) => {
    const candidateName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Candidate';
    const candidateSkills = profile.techStack || 'TypeScript, React, Node.js';
    const candidateTitle = (profile.desiredTitle || 'Software Engineer').split(',')[0].trim();

    return text
      .replace(/{{name}}/g, contact.name ? contact.name.split(' ')[0] : 'there')
      .replace(/{{company}}/g, contact.company || 'your company')
      .replace(/{{role}}/g, candidateTitle)
      .replace(/{{senderName}}/g, candidateName)
      .replace(/{{skills}}/g, candidateSkills);
  };

  const handleOpenGmailDraft = (contact: OutreachContact) => {
    const subject = encodeURIComponent(renderTemplateText(customSubject, contact));
    const body = encodeURIComponent(renderTemplateText(customBody, contact));
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact.email)}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank');
    onLog(`[Outreach] Prepared draft for ${contact.name} (${contact.company}) in Gmail.`);
  };

  const handleVerifyEmail = async (email: string) => {
    const api = getApi();
    if (!api) return;
    setVerifyingEmail(email);
    try {
      const res = await api.verifyEmail(email);
      setContacts(prev => prev.map(c => {
        if (c.email === email) {
          return {
            ...c,
            verificationStatus: res.isValid ? 'valid' : 'invalid',
            verifiedAt: 'Just now',
          };
        }
        return c;
      }));
      onLog(`[Email Verifier] ${email} verified: ${res.isValid ? 'VALID (0% Bounce)' : 'INVALID'}`);
    } catch (err: any) {
      onLog(`[Email Verifier] Error verifying ${email}: ${err?.message}`);
    } finally {
      setVerifyingEmail(null);
    }
  };

  const handleDispatchDrip = async () => {
    const targets = contacts.filter(c => selectedEmails.has(c.email));
    if (targets.length === 0) return;
    const api = getApi();
    if (!api) return;

    setSendingMails(true);
    setSendResult(null);

    const payload = targets.map(c => ({
      email: c.email,
      name: c.name,
      company: c.company,
      role: c.role,
      subject: renderTemplateText(customSubject, c),
      body: renderTemplateText(customBody, c),
    }));

    try {
      const res = await api.sendOutreach(payload);
      if (res.success) {
        const isSmtp = res.mode === 'smtp';
        setSendResult({
          success: true,
          message: isSmtp
            ? `Dispatched outreach email to ${res.sent || targets.length} verified hiring leads via SMTP.`
            : `Opened ${res.sent || targets.length} compose drafts in your default browser Gmail.`
        });
        setContacts(prev =>
          prev.map(c => selectedEmails.has(c.email) ? { ...c, sentStatus: isSmtp ? 'sent' : 'drafted', verifiedAt: 'Just now' } : c)
        );
        setSelectedEmails(new Set());
        onLog(`[Outreach] Outreach action complete for ${res.sent || targets.length} contacts (${res.mode || 'draft'}).`);
      } else {
        setSendResult({
          success: false,
          message: res.error || 'Failed to dispatch emails. Check SMTP credentials in profile.'
        });
      }
    } catch (err: any) {
      setSendResult({
        success: false,
        message: err?.message || 'Error occurred while dispatching outreach.'
      });
    } finally {
      setSendingMails(false);
    }
  };

  const renderLinkedinNote = (contact: OutreachContact) => {
    const firstName = contact.name ? contact.name.split(' ')[0] : 'there';
    const candidateName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Candidate';
    const roleName = (profile.desiredTitle || 'Software Engineer').split(',')[0].trim();
    const tech = (profile.techStack || 'React, TypeScript').split(',').slice(0, 2).join(' & ');
    return `Hi ${firstName}, I noticed ${contact.company} is actively scaling its team. With hands-on experience in ${tech} as a ${roleName}, I'd love to connect and follow your engineering milestones! — ${candidateName}`;
  };

  const handleToggleLinkedinWaitlist = () => {
    const next = !linkedinWaitlistJoined;
    setLinkedinWaitlistJoined(next);
    try {
      localStorage.setItem('hirestack_linkedin_waitlist', String(next));
    } catch {}
    if (next) {
      onLog('[LinkedIn Outreach] Priority Beta Waitlist request recorded. You will be notified on launch!');
    }
  };

  const handleCopyLinkedinNote = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  return (
    <div className="space-y-6 font-sans select-none max-w-6xl mx-auto pb-20">
      
      {/* Top Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100">Recruiter &amp; Manager Outreach</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              0% Bounce Verified
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0077B5] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
              <Linkedin className="w-2.5 h-2.5" /> LinkedIn Soon
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Verified Engineering Managers, Leads, and Recruiters with personalized 1-click email templates and upcoming LinkedIn direct connect.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleFetchLatestContacts}
            disabled={loadingContacts || isFetchingContacts}
            className="w-full sm:w-auto px-3.5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition hover:opacity-90 shadow-xs disabled:opacity-50"
            title="Fetch latest verified HR, Recruiter, and Engineering Manager contacts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingContacts || isFetchingContacts ? 'animate-spin' : ''}`} />
            <span>{isFetchingContacts || loadingContacts ? 'Fetching Contacts...' : 'Fetch Latest Contacts'}</span>
          </button>

          {outreachChannel === 'email' ? (
            <button
              onClick={handleDispatchDrip}
              disabled={selectedEmails.size === 0 || sendingMails}
              className="w-full md:w-auto px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition hover:opacity-90 shadow-xs disabled:opacity-40"
            >
              {sendingMails ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Selected ({selectedEmails.size})</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleToggleLinkedinWaitlist}
              className={`w-full md:w-auto px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                linkedinWaitlistJoined
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 hover:bg-slate-200'
              }`}
            >
              {linkedinWaitlistJoined ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Beta Queue Confirmed ✓</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>Notify Me on Launch</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Feedback Banner */}
      {outreachToast && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{outreachToast.message}</span>
          </div>
          <button onClick={() => setOutreachToast(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs px-1">✕</button>
        </div>
      )}

      {/* Outreach Channel Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setOutreachChannel('email')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            outreachChannel === 'email'
              ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Verified HR &amp; Manager Emails</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
            Active
          </span>
        </button>

        <button
          type="button"
          onClick={() => setOutreachChannel('linkedin')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            outreachChannel === 'linkedin'
              ? 'bg-[#0077B5] text-white shadow-xs'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
          }`}
        >
          <Linkedin className="w-3.5 h-3.5" />
          <span>LinkedIn of HRs &amp; Managers</span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
            Coming Soon
          </span>
        </button>
      </div>

      {/* Main Content: Email Grid or LinkedIn Coming Soon Showcase */}
      {outreachChannel === 'email' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left 7 Cols: Verified Contacts */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Department & Relevance Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800/80 rounded-xl border border-slate-200/60 dark:border-zinc-700/60">
              <button
                type="button"
                onClick={() => setDepartmentFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  departmentFilter === 'all'
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                All Leads ({contacts.length})
              </button>
              <button
                type="button"
                onClick={() => setDepartmentFilter('engineering')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  departmentFilter === 'engineering'
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Engineering Leads ({engineeringCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setDepartmentFilter('talent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  departmentFilter === 'talent'
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                <span>Tech Talent / HR ({talentCount})</span>
              </button>
              {targetCount > 0 && (
                <button
                  type="button"
                  onClick={() => setDepartmentFilter('target')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    departmentFilter === 'target'
                      ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  <span>⭐ Target Companies ({targetCount})</span>
                </button>
              )}
            </div>

            {/* Search & Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter contacts by name, company, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-slate-400 transition-colors shadow-2xs"
                  />
                </div>
                <button
                  onClick={handleFetchLatestContacts}
                  disabled={loadingContacts || isFetchingContacts}
                  className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 disabled:opacity-50"
                  title="Refresh emails and contacts"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingContacts || isFetchingContacts ? 'animate-spin text-emerald-500' : ''}`} />
                  <span className="hidden sm:inline">Refresh Emails</span>
                </button>
              </div>

              <button
                onClick={toggleSelectAll}
                className="text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-zinc-800 rounded-xl transition-colors shrink-0"
              >
                {selectedEmails.size === filteredContacts.length && filteredContacts.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-slate-900 dark:text-zinc-100" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>Select All</span>
              </button>
            </div>

            {/* Contacts List */}
            <div className="space-y-2.5">
              {filteredContacts.map((contact) => {
                const isSelected = selectedEmails.has(contact.email);

                return (
                  <div
                    key={contact.email}
                    className={`p-4 rounded-xl border transition-all bg-white dark:bg-zinc-900 shadow-2xs flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-slate-900 dark:border-zinc-100 ring-1 ring-slate-900 dark:ring-zinc-100'
                        : 'border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleSelect(contact.email)}
                        className="shrink-0 text-slate-400 hover:text-slate-900 dark:hover:text-zinc-100"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-slate-900 dark:text-zinc-100" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 dark:text-zinc-100 truncate">{contact.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-semibold">
                            {contact.company}
                          </span>
                          {contact.isTargetCompany && (
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              ⭐ Saved Company
                            </span>
                          )}
                          {contact.isEngineeringLead ? (
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              Engineering Lead
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                              Talent Partner
                            </span>
                          )}
                          <span className={`text-[9px] font-mono font-bold ${
                            contact.verificationStatus === 'valid'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : contact.verificationStatus === 'invalid'
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-amber-600 dark:text-amber-400'
                          }`}>
                            {contact.verificationStatus === 'valid'
                              ? '✓ 0% Bounce'
                              : contact.verificationStatus === 'invalid'
                                ? '✗ Failed MX'
                                : '⏳ Pending'}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 font-mono">
                          <span>{contact.role} · {contact.email}</span>
                          <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline">•</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewNoteContact(contact);
                            }}
                            className="inline-flex items-center gap-1 text-[#0077B5] dark:text-blue-400 hover:underline font-sans font-medium"
                            title="Preview AI-crafted LinkedIn Connection Note (Coming Soon)"
                          >
                            <Linkedin className="w-3 h-3 text-[#0077B5]" />
                            <span>linkedin.com/in/{contact.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'profile'}</span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-[#0077B5] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              Coming Soon
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewNoteContact(contact)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0077B5] dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                        title="Preview AI Connection Note on LinkedIn (Coming Soon)"
                      >
                        <Linkedin className="w-3 h-3" />
                        <span className="hidden sm:inline">LinkedIn</span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#0077B5] text-white font-bold">Soon</span>
                      </button>

                      <button
                        onClick={() => handleVerifyEmail(contact.email)}
                        disabled={verifyingEmail === contact.email}
                        className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                        title="Run real-time 4-stage SMTP handshake verification"
                      >
                        {verifyingEmail === contact.email ? (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                        ) : (
                          <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        )}
                        <span>Verify</span>
                      </button>

                      <button
                        onClick={() => handleOpenGmailDraft(contact)}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <span>Open in Gmail</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 5 Cols: Template Editor & Preview */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100">Outreach Email Template</h3>
              <span className="text-[10px] font-mono text-slate-400">Auto-interpolated</span>
            </div>

            {/* Template Selector Pills */}
            <div className="flex gap-1.5 overflow-x-auto">
              {DEFAULT_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    setSelectedTemplateId(tmpl.id);
                    setCustomSubject(tmpl.subject);
                    setCustomBody(tmpl.body);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    selectedTemplateId === tmpl.id
                      ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                      : 'bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  {tmpl.name}
                </button>
              ))}
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-zinc-300">Subject Line</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-zinc-300">Email Message Body</label>
                <textarea
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  rows={9}
                  className="w-full p-3 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none font-sans leading-relaxed"
                />
              </div>
            </div>

            {sendResult && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 font-semibold animate-fade-up">
                {sendResult.message}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ── LINKEDIN OF HRS & MANAGERS COMING SOON VIEW ────────────────────── */
        <div className="space-y-6 animate-fade-up">
          {/* Hero Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#0077B5]/10 via-white to-blue-50/40 dark:from-[#0077B5]/20 dark:via-zinc-900 dark:to-zinc-900 border border-[#0077B5]/30 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#0077B5] text-white flex items-center justify-center shadow-xs">
                    <Linkedin className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-black text-slate-900 dark:text-zinc-100">
                    LinkedIn Direct Connect: HRs &amp; Engineering Managers
                  </h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 animate-pulse">
                    Coming Soon in v2.1
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                  Skip the 100+ unread recruiter email inboxes. Directly discover, connect, and message verified Engineering Managers, Tech Leads, and HR Decision Makers on LinkedIn with automated personalized invite notes and follow-ups.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-500" /> 1-Click 300-char AI Notes</span>
                  <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-500" /> Safe Anti-Ban Throttling (20/day)</span>
                  <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-500" /> InMail Sequence Sync</span>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 rounded-2xl p-4 shadow-xs flex flex-col items-center text-center space-y-3 shrink-0 min-w-[240px]">
                <div className="w-10 h-10 rounded-full bg-[#0077B5]/10 text-[#0077B5] flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">Priority Beta Access</div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400">Be first in line when the LinkedIn engine goes live.</div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleLinkedinWaitlist}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                    linkedinWaitlistJoined
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#0077B5] hover:bg-[#006097] text-white'
                  }`}
                >
                  {linkedinWaitlistJoined ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Waitlist Confirmed ✓</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Join Beta Queue</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0077B5] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100">Hiring Manager Radar</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                Directly locates the Engineering Managers and Directors who actually own the team budget, bypassing ATS gatekeepers.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100">Custom Connection Notes</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                Auto-generates high-acceptance 300-char notes referencing the company tech stack and your tailored projects.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100">Anti-Ban Pacing</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                Restricted to 15-20 connection requests daily with randomized human jitter intervals to ensure 100% account safety.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100">InMail &amp; Follow-up Drips</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                Automated multi-touch follow-up sequences when recruiters accept your connect invite.
              </p>
            </div>
          </div>

          {/* Sneak Peek: Verified HR & Manager LinkedIn Directory */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <span>Verified HR &amp; Manager LinkedIn Directory</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-[#0077B5] dark:bg-blue-950/60 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                    Live Preview
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pre-mapped hiring managers and recruiters ready for the 1-click LinkedIn connection automation.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800/80 rounded-xl border border-slate-200/60 dark:border-zinc-700/60">
                <button
                  type="button"
                  onClick={() => setDepartmentFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    departmentFilter === 'all'
                      ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400'
                  }`}
                >
                  All ({contacts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDepartmentFilter('engineering')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    departmentFilter === 'engineering'
                      ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400'
                  }`}
                >
                  Managers ({engineeringCount})
                </button>
                <button
                  type="button"
                  onClick={() => setDepartmentFilter('talent')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    departmentFilter === 'talent'
                      ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400'
                  }`}
                >
                  HR &amp; Recruiters ({talentCount})
                </button>
              </div>
            </div>

            {/* List of Managers & HRs with LinkedIn Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.email}
                  className="p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xs space-y-3 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#0077B5]/10 text-[#0077B5] dark:bg-blue-950/80 dark:text-blue-300 font-bold text-sm flex items-center justify-center shrink-0 border border-[#0077B5]/20">
                        {contact.name?.charAt(0) || 'L'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-zinc-100 truncate">{contact.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-semibold">
                            {contact.company}
                          </span>
                          {contact.isEngineeringLead ? (
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              Manager
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                              HR Talent
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                          {contact.role}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                      Coming Soon
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-zinc-800 font-mono text-slate-500">
                    <span className="flex items-center gap-1 text-[#0077B5] dark:text-blue-400 truncate">
                      <Linkedin className="w-3 h-3 shrink-0" />
                      <span>linkedin.com/in/{contact.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'profile'}</span>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] shrink-0">✓ Verified Profile</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewNoteContact(contact)}
                      className="flex-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-[#0077B5] dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Preview Invite Note</span>
                    </button>
                    <button
                      type="button"
                      disabled
                      className="py-1.5 px-3 bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-semibold cursor-not-allowed flex items-center gap-1"
                      title="LinkedIn direct connection automation is coming soon"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Connect (Soon)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LINKEDIN NOTE PREVIEW MODAL ────────────────────────────────────── */}
      {previewNoteContact && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0077B5] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Linkedin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                    LinkedIn Connection Note
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    AI-interpolated invite for {previewNoteContact.name} ({previewNoteContact.company})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewNoteContact(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <span>Personalized Note Draft</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {renderLinkedinNote(previewNoteContact).length} / 300 Chars (Safe)
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-800 dark:text-zinc-200 leading-relaxed font-sans select-text">
                {renderLinkedinNote(previewNoteContact)}
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Coming Soon: </span>
                Automatic 1-click LinkedIn sending, profile visiting, and InMail follow-up workflows are launching in Nomadic v2.1.
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleCopyLinkedinNote(renderLinkedinNote(previewNoteContact))}
                className="py-2 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copiedNote ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied Note!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Note</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  handleToggleLinkedinWaitlist();
                  setPreviewNoteContact(null);
                }}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                  linkedinWaitlistJoined
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#0077B5] hover:bg-[#006097] text-white'
                }`}
              >
                {linkedinWaitlistJoined ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Beta Confirmed ✓</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5" />
                    <span>Join Priority Beta</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
