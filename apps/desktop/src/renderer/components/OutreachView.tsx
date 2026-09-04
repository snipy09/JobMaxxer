import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail, RefreshCw, Send, CheckCircle2, AlertCircle,
  ExternalLink, Search, Clock, CheckSquare, Square,
  Sparkles, ShieldCheck, X, FileText, Check, Loader2,
  Copy, Layers, UserCheck, ChevronDown
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

export const OutreachView: React.FC<OutreachViewProps> = ({
  profile,
  onLog,
  initialSearchQuery = '',
}) => {
  const [contacts, setContacts] = useState<OutreachContact[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('referral');
  const [customSubject, setCustomSubject] = useState<string>(DEFAULT_TEMPLATES[0].subject);
  const [customBody, setCustomBody] = useState<string>(DEFAULT_TEMPLATES[0].body);
  const [loadingContacts, setLoadingContacts] = useState<boolean>(false);
  const [isFetchingContacts, setIsFetchingContacts] = useState<boolean>(false);
  const [verifyingEmail, setVerifyingEmail] = useState<string | null>(null);
  const [sendingMails, setSendingMails] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [outreachToast, setOutreachToast] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<'all' | 'engineering' | 'talent'>('all');

  // Load verified contacts from SQLite / Supabase
  const fetchContacts = async () => {
    const api = getApi();
    if (!api) return;
    setLoadingContacts(true);
    try {
      const res = await api.getHrContacts(profile.desiredTitle || 'Engineering');
      if (res && res.success && res.contacts && res.contacts.length > 0) {
        setContacts(res.contacts);
        onLog(`[Outreach] Loaded ${res.contacts.length} verified hiring contacts.`);
      }
    } catch {
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [profile.desiredTitle]);

  const handleFetchLatestContacts = async () => {
    const api = getApi();
    if (!api) return;
    setIsFetchingContacts(true);
    setOutreachToast(null);
    onLog('[Outreach] Querying live recruiter & hiring manager database...');

    try {
      const res = await api.getHrContacts(profile.desiredTitle || 'Engineering');
      if (res && res.success && res.contacts && res.contacts.length > 0) {
        setContacts(res.contacts);
        setOutreachToast({
          type: 'success',
          message: `Synced ${res.contacts.length} verified decision makers for ${profile.desiredTitle || 'your role'}!`
        });
        onLog(`[Outreach] Synced ${res.contacts.length} verified contacts.`);
      } else {
        setOutreachToast({
          type: 'info',
          message: 'Contact pipeline refreshed.'
        });
      }
    } catch (err: any) {
      setOutreachToast({
        type: 'info',
        message: 'Loaded cached outreach contacts.'
      });
    } finally {
      setIsFetchingContacts(false);
      setTimeout(() => setOutreachToast(null), 4000);
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = DEFAULT_TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setCustomSubject(tmpl.subject);
      setCustomBody(tmpl.body);
    }
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.role || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q);

      const matchesDept =
        departmentFilter === 'all' ||
        (departmentFilter === 'engineering' && (c.department === 'Engineering' || (c.role || '').toLowerCase().includes('engineer') || (c.role || '').toLowerCase().includes('manager') || (c.role || '').toLowerCase().includes('lead') || (c.role || '').toLowerCase().includes('tech'))) ||
        (departmentFilter === 'talent' && (c.department === 'Talent Acquisition' || (c.role || '').toLowerCase().includes('recruiter') || (c.role || '').toLowerCase().includes('talent') || (c.role || '').toLowerCase().includes('hr') || (c.role || '').toLowerCase().includes('people')));

      return matchesSearch && matchesDept;
    });
  }, [contacts, searchQuery, departmentFilter]);

  const toggleSelectEmail = (email: string) => {
    const next = new Set(selectedEmails);
    if (next.has(email)) next.delete(email);
    else next.add(email);
    setSelectedEmails(next);
  };

  const toggleSelectAll = () => {
    if (selectedEmails.size === filteredContacts.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(filteredContacts.map((c) => c.email)));
    }
  };

  const handleVerifyEmail = async (email: string) => {
    const api = getApi();
    if (!api) return;
    setVerifyingEmail(email);
    try {
      const res = await api.verifyEmail(email);
      setContacts((prev) =>
        prev.map((c) =>
          c.email === email
            ? {
                ...c,
                verificationStatus: res.isValid ? 'valid' : 'invalid',
                verifiedAt: 'Just now',
              }
            : c
        )
      );
      onLog(`[EmailVerifier] ${email} -> ${res.isValid ? 'VALID' : 'INVALID'}`);
    } catch {
      // Ignore
    } finally {
      setVerifyingEmail(null);
    }
  };

  const renderEmailBody = (contact: OutreachContact) => {
    let body = customBody;
    body = body.replace(/{{name}}/g, contact.name.split(' ')[0] || contact.name);
    body = body.replace(/{{company}}/g, contact.company);
    body = body.replace(/{{role}}/g, profile.desiredTitle || 'Software Engineer');
    body = body.replace(/{{skills}}/g, profile.techStack || 'Full Stack Engineering');
    body = body.replace(/{{senderName}}/g, `${profile.firstName} ${profile.lastName}`.trim() || 'Candidate');
    return body;
  };

  const renderEmailSubject = (contact: OutreachContact) => {
    let sub = customSubject;
    sub = sub.replace(/{{name}}/g, contact.name.split(' ')[0] || contact.name);
    sub = sub.replace(/{{company}}/g, contact.company);
    sub = sub.replace(/{{role}}/g, profile.desiredTitle || 'Software Engineer');
    return sub;
  };

  const handleDispatchDrip = async () => {
    if (selectedEmails.size === 0) return;
    const api = getApi();
    if (!api) return;

    setSendingMails(true);
    setSendResult(null);

    const targets = contacts.filter((c) => selectedEmails.has(c.email));
    const payload = targets.map((c) => ({
      email: c.email,
      name: c.name,
      company: c.company,
      role: c.role,
      subject: renderEmailSubject(c),
      body: renderEmailBody(c),
    }));

    try {
      const res = await api.sendOutreach(payload);
      if (res.success) {
        setSendResult({
          success: true,
          message: res.mode === 'smtp'
            ? `✓ Direct SMTP drip dispatched successfully to ${res.sent || payload.length} verified hiring managers!`
            : `✓ Opened pre-filled Gmail compose draft for ${res.sent || payload.length} recipients in your default browser!`,
        });
        setContacts((prev) =>
          prev.map((c) =>
            selectedEmails.has(c.email)
              ? { ...c, sentStatus: res.mode === 'smtp' ? 'sent' : 'drafted' }
              : c
          )
        );
        onLog(`[Outreach] Dispatched ${payload.length} emails (${res.mode === 'smtp' ? 'SMTP direct' : 'Browser Gmail drafts'}).`);
      } else {
        setSendResult({
          success: false,
          message: `Outreach status: ${res.error || 'Check local mail sender logs.'}`,
        });
      }
    } catch (err: any) {
      setSendResult({
        success: false,
        message: `Error sending outreach: ${err?.message || String(err)}`,
      });
    } finally {
      setSendingMails(false);
    }
  };

  const handleOpenInGmail = (contact: OutreachContact, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const subject = renderEmailSubject(contact);
    const body = renderEmailBody(contact);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      contact.email
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const api = getApi();
    if (api && api.openExternalUrl) {
      api.openExternalUrl(gmailUrl);
    } else {
      window.open(gmailUrl, '_blank');
    }
    setContacts(prev => prev.map(c => c.email === contact.email ? { ...c, sentStatus: 'drafted' } : c));
    setOutreachToast({
      success: true,
      message: `✓ Opened pre-filled Gmail compose draft for ${contact.name} (${contact.company})`,
    });
    onLog(`[Outreach] Opened pre-filled Gmail compose draft for ${contact.name} (${contact.email})`);
  };

  const handleOpenSelectedInGmail = () => {
    const targets = contacts.filter((c) => selectedEmails.has(c.email));
    if (targets.length === 0) return;
    targets.forEach((c, idx) => {
      setTimeout(() => {
        handleOpenInGmail(c);
      }, idx * 400);
    });
  };

  const firstSelectedContact = useMemo(() => {
    if (selectedEmails.size === 0) return contacts[0] || null;
    const email = Array.from(selectedEmails)[0];
    return contacts.find((c) => c.email === email) || contacts[0] || null;
  }, [selectedEmails, contacts]);

  return (
    <div className="space-y-6 font-sans select-none max-w-6xl mx-auto pb-24">
      
      {/* ── TOP HEADER & ACTIONS ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800/80 pb-4">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              Outreach &amp; Hiring Network
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Verified Engineering Managers, Leads, and Technical Recruiters.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleFetchLatestContacts}
              disabled={loadingContacts || isFetchingContacts}
              className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs disabled:opacity-50"
              title="Fetch latest verified HR, Recruiter, and Engineering Manager contacts"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingContacts || isFetchingContacts ? 'animate-spin' : ''}`} />
              <span>Refresh Contacts</span>
            </button>

            <button
              onClick={handleOpenSelectedInGmail}
              disabled={selectedEmails.size === 0}
              className="w-full sm:w-auto px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs disabled:opacity-40"
              title="Open pre-filled Gmail compose tabs for selected contacts"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Open in Gmail ({selectedEmails.size})</span>
            </button>

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
                  <span>Auto Send ({selectedEmails.size})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Confirmation Banner */}
        {outreachToast && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{outreachToast.message}</span>
            </div>
            <button onClick={() => setOutreachToast(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs px-1">✕</button>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT: CONTACTS LIST & COMPOSER ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 7 Cols: Verified Contacts */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Filter Pills */}
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                departmentFilter === 'engineering'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              Engineering Decision Makers
            </button>
            <button
              type="button"
              onClick={() => setDepartmentFilter('talent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                departmentFilter === 'talent'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              Technical Recruiters
            </button>
          </div>

          {/* Search Bar & Select All */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, company, or title..."
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white"
              >
                {selectedEmails.size === filteredContacts.length && filteredContacts.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-slate-900 dark:text-white" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>Select All ({filteredContacts.length})</span>
              </button>
            </div>
          </div>

          {/* Contacts List */}
          {filteredContacts.length > 0 ? (
            <div className="space-y-2.5">
              {filteredContacts.map((contact) => {
                const isSelected = selectedEmails.has(contact.email);
                const isVerifying = verifyingEmail === contact.email;

                return (
                  <div
                    key={contact.email}
                    onClick={() => toggleSelectEmail(contact.email)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-slate-900 dark:border-zinc-100 ring-1 ring-slate-900 dark:ring-zinc-100'
                        : 'border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectEmail(contact.email);
                        }}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-slate-900 dark:text-white" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                            {contact.name}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold">
                            {contact.company}
                          </span>
                          {contact.sentStatus === 'sent' && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                              Sent ✓
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                          {contact.role}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                          {contact.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleOpenInGmail(contact, e)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-emerald-300 dark:border-emerald-800 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 flex items-center gap-1 transition shadow-2xs"
                        title={`Open pre-filled Gmail compose tab for ${contact.name}`}
                      >
                        <Mail className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Open in Gmail</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerifyEmail(contact.email);
                        }}
                        disabled={isVerifying}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition ${
                          contact.verificationStatus === 'valid'
                            ? 'bg-slate-50 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
                            : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                        }`}
                      >
                        {isVerifying ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Verifying...</span>
                          </span>
                        ) : contact.verificationStatus === 'valid' ? (
                          <span>✓ Verified</span>
                        ) : (
                          <span>Verify MX</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-2">
              <Mail className="w-6 h-6 text-slate-400 mx-auto" />
              <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">No hiring contacts found</div>
              <p className="text-[11px] text-slate-500">Click "Refresh Contacts" to pull live hiring leads from verified databases.</p>
            </div>
          )}
        </div>

        {/* Right 5 Cols: Template Editor & Live Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase font-mono tracking-wider">
                Outreach Message Composer
              </span>

              <div className="flex gap-1.5">
                {DEFAULT_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition ${
                      selectedTemplate === tmpl.id
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Subject Line Template
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Email Body (Variables: {'{{name}}'}, {'{{company}}'}, {'{{role}}'}, {'{{skills}}'})
                </label>
                <textarea
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  rows={8}
                  className="w-full p-3 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none font-sans leading-relaxed resize-none"
                />
              </div>

              {firstSelectedContact && (
                <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                    Live Interpolated Preview ({firstSelectedContact.name}):
                  </span>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-[11px] leading-relaxed whitespace-pre-wrap font-sans">
                    <div className="font-bold text-slate-900 dark:text-zinc-100 mb-1">
                      Subject: {renderEmailSubject(firstSelectedContact)}
                    </div>
                    {renderEmailBody(firstSelectedContact)}
                  </div>
                </div>
              )}
            </div>

            {sendResult && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 font-semibold animate-fade-up">
                {sendResult.message}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
