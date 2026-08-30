import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail, Send, CheckCircle2, XCircle, AlertCircle,
  Loader2, Check, Search, Eye, ShieldCheck,
  Building, User, Briefcase, CheckSquare, Square, X, RefreshCw,
  Edit3, Sparkles, SlidersHorizontal, FileText, ChevronDown, ChevronUp, RotateCcw
} from 'lucide-react';
import { OutreachContact, MasterProfile, getApi } from '../types';

interface TemplateOption {
  id: string;
  name: string;
  subject: string;
  body: string;
}

const DEFAULT_TEMPLATES: TemplateOption[] = [
  {
    id: 'direct_referral',
    name: 'Direct Referral Request',
    subject: 'Inquiry regarding {{role}} role at {{company}}',
    body: `Hi {{name}},\n\nHope you're having a great week! I came across your profile at {{company}} and wanted to reach out regarding the open {{role}} role.\n\nWith my background in {{skills}}, I believe I'd be a strong fit for the team. I'd be very grateful for a referral or any advice on navigating the application process.\n\nWould you be open to a brief chat?\n\nBest regards,\n{{senderName}}`,
  },
  {
    id: 'coffee_chat',
    name: 'Alumni / Peer Coffee Chat',
    subject: 'Fellow engineer reaching out / quick chat about {{company}}',
    body: `Hey {{name}},\n\nI've been admiring the engineering culture at {{company}} and noticed we share similar interests in {{skills}}. I'm currently exploring {{role}} opportunities and would love to hear about your experience there.\n\nAre you free for a quick 5-minute virtual coffee chat sometime this week?\n\nBest,\n{{senderName}}`,
  },
  {
    id: 'direct_pitch',
    name: 'Direct Pitch with Portfolio',
    subject: '{{senderName}} - {{role}} application for {{company}}',
    body: `Hi {{name}},\n\nI noticed {{company}} is actively hiring for the {{role}} position. Having built high-performance systems using {{skills}}, I wanted to reach out directly.\n\nYou can view my recent work and portfolio on my GitHub/website. I'd love to connect and learn more about your team's technical roadmap.\n\nWould you be open to a quick intro?\n\nCheers,\n{{senderName}}`,
  },
];

interface OutreachViewProps {
  profile: MasterProfile;
  onLog: (msg: string) => void;
}

export const OutreachView: React.FC<OutreachViewProps> = ({ profile, onLog }) => {
  const [contacts, setContacts] = useState<OutreachContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState<boolean>(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewContact, setPreviewContact] = useState<OutreachContact | null>(null);
  const [sendingMails, setSendingMails] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; count: number; message: string } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('Just now');

  // Template selector & editor state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('direct_referral');
  const [customSubject, setCustomSubject] = useState<string>(DEFAULT_TEMPLATES[0].subject);
  const [customBody, setCustomBody] = useState<string>(DEFAULT_TEMPLATES[0].body);
  const [showTemplateEditor, setShowTemplateEditor] = useState<boolean>(false);

  // Sync role contacts dynamically from Supabase database
  const syncRoleContacts = async () => {
    setLoadingContacts(true);
    const desiredTitle = (profile.desiredTitle || 'Software Engineer').split(',')[0].trim();
    const api = getApi();

    try {
      if (api && typeof api.getHrContacts === 'function') {
        const res = await api.getHrContacts(desiredTitle);
        if (res.success && res.contacts && res.contacts.length > 0) {
          setContacts(res.contacts);
          setLoadingContacts(false);
          setLastSyncedAt(new Date().toLocaleTimeString());
          onLog(`[Referral Stream] Synced ${res.contacts.length} verified hiring managers from Supabase.`);
          return;
        }
      }
    } catch (err: any) {
      console.error('Error fetching HR contacts:', err);
    }

    setLoadingContacts(false);
    setLastSyncedAt(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    syncRoleContacts();
  }, [profile.desiredTitle]);

  // Handle template selection
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = DEFAULT_TEMPLATES.find(t => t.id === templateId);
    if (tmpl) {
      setCustomSubject(tmpl.subject);
      setCustomBody(tmpl.body);
    }
  };

  const handleResetTemplate = () => {
    const tmpl = DEFAULT_TEMPLATES.find(t => t.id === selectedTemplateId) || DEFAULT_TEMPLATES[0];
    setCustomSubject(tmpl.subject);
    setCustomBody(tmpl.body);
  };

  // Interpolate helper
  const renderTemplateText = (text: string, contact: OutreachContact) => {
    const candidateName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Candidate';
    const candidateSkills = profile.techStack || 'TypeScript, React, Node.js, Python';
    const candidateTitle = (profile.desiredTitle || 'Software Engineer').split(',')[0].trim();

    return text
      .replace(/{{name}}/g, contact.name || 'there')
      .replace(/{{company}}/g, contact.company || 'your company')
      .replace(/{{role}}/g, contact.role || candidateTitle)
      .replace(/{{senderName}}/g, candidateName)
      .replace(/{{skills}}/g, candidateSkills);
  };

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return contacts.filter(c => (
      (c.name || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      (c.role || '').toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    ));
  }, [contacts, searchQuery]);

  const toggleSelectEmail = (email: string) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedEmails.size === filteredContacts.length && filteredContacts.length > 0) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(filteredContacts.map(c => c.email)));
    }
  };

  // Auto-Mail Selected Contacts for Referral via live Chrome session using edited template
  const handleAutoMailReferrals = async () => {
    const api = getApi();
    const targets = contacts.filter(c => selectedEmails.has(c.email));
    if (targets.length === 0) return;

    setSendingMails(true);
    setSendResult(null);
    onLog(`[Referral Bot] Auto-mailing ${targets.length} contacts via Chrome session...`);

    try {
      if (api) {
        const payload = targets.map(c => ({
          email: c.email,
          name: c.name,
          company: c.company,
          role: c.role,
          subject: renderTemplateText(customSubject, c),
          body: renderTemplateText(customBody, c),
        }));

        const res = await api.sendOutreach(payload);
        if (res.success) {
          const count = res.sent ?? targets.length;
          setSendResult({
            success: true,
            count,
            message: `Chrome session active: Pre-filled and dispatched ${count} referral inquiries successfully.`,
          });

          // Mark as sent
          setContacts(prev =>
            prev.map(c =>
              selectedEmails.has(c.email)
                ? { ...c, sentStatus: 'sent', sentAt: new Date().toLocaleTimeString(), verificationStatus: 'valid' }
                : c
            )
          );
          setSelectedEmails(new Set());
          onLog(`[Referral Bot] Dispatched referral inquiries for ${count} contacts.`);
        } else {
          setSendResult({
            success: false,
            count: 0,
            message: res.error || 'Failed to dispatch referral emails.',
          });
        }
      } else {
        // Fallback simulation in browser preview mode
        setTimeout(() => {
          setSendResult({
            success: true,
            count: targets.length,
            message: `Chrome session simulation: Pre-filled ${targets.length} referral requests.`,
          });
          setContacts(prev =>
            prev.map(c =>
              selectedEmails.has(c.email)
                ? { ...c, sentStatus: 'sent', sentAt: new Date().toLocaleTimeString(), verificationStatus: 'valid' }
                : c
            )
          );
          setSelectedEmails(new Set());
          setSendingMails(false);
        }, 1200);
        return;
      }
    } catch (err: any) {
      setSendResult({
        success: false,
        count: 0,
        message: err?.message || 'Error occurred while sending referral emails.',
      });
    } finally {
      setSendingMails(false);
    }
  };

  const candidateTitle = (profile.desiredTitle || 'Software Engineer').split(',')[0].trim();

  return (
    <div className="space-y-5">
      
      {/* Top Header & Cloud Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Curated Referral &amp; Recruiter Outreach
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Targeted: {candidateTitle}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically curated contacts matching your target roles. Last synced: <span className="font-mono text-slate-700">{lastSyncedAt}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Template Editor Toggle */}
            <button
              type="button"
              onClick={() => setShowTemplateEditor(!showTemplateEditor)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{showTemplateEditor ? 'Hide Template' : 'Edit Email Template'}</span>
              {showTemplateEditor ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Sync Button */}
            <button
              type="button"
              onClick={syncRoleContacts}
              disabled={loadingContacts}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingContacts ? 'animate-spin' : ''}`} />
              <span>Sync Role Contacts</span>
            </button>
          </div>
        </div>

        {/* Template Selector & Editor Drawer */}
        {showTemplateEditor && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 pt-3 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700">Choose Template:</span>
                {DEFAULT_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTemplate(t.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedTemplateId === t.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleResetTemplate}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 self-end sm:self-center"
              >
                <RotateCcw className="w-3 h-3" /> Reset to Default
              </button>
            </div>

            {/* Template Inputs */}
            <div className="space-y-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Subject Line Template <span className="text-slate-400 font-normal">(Variables: &#123;&#123;name&#125;&#125;, &#123;&#123;company&#125;&#125;, &#123;&#123;role&#125;&#125;, &#123;&#123;senderName&#125;&#125;)</span>
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Body Message Template <span className="text-slate-400 font-normal">(Variables: &#123;&#123;name&#125;&#125;, &#123;&#123;company&#125;&#125;, &#123;&#123;role&#125;&#125;, &#123;&#123;skills&#125;&#125;, &#123;&#123;senderName&#125;&#125;)</span>
                </label>
                <textarea
                  rows={4}
                  value={customBody}
                  onChange={e => setCustomBody(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-400 leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {/* Search Toolbar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search contacts by name, company, role, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Action Banner / Feedback */}
      {sendResult && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
          sendResult.success
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {sendResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{sendResult.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setSendResult(null)}
            className="text-slate-400 hover:text-slate-700 ml-3"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Multi-Select Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            {selectedEmails.size === filteredContacts.length && filteredContacts.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-slate-900" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            Select All ({filteredContacts.length} Contacts)
          </button>

          {selectedEmails.size > 0 && (
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
              {selectedEmails.size} selected
            </span>
          )}
        </div>

        {/* PRIMARY ACTION: AUTO-MAIL SELECTED FOR REFERRAL */}
        <button
          type="button"
          onClick={handleAutoMailReferrals}
          disabled={selectedEmails.size === 0 || sendingMails}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
        >
          {sendingMails ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Opening Chrome Session ({selectedEmails.size})...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Auto-Mail Selected for Referral ({selectedEmails.size})
            </>
          )}
        </button>
      </div>

      {/* Contacts Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {filteredContacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[10px]">
                <tr>
                  <th className="px-4 py-3 w-10">Select</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContacts.map(contact => {
                  const isSelected = selectedEmails.has(contact.email);
                  const isSent = contact.sentStatus === 'sent';

                  return (
                    <tr
                      key={contact.email}
                      onClick={() => toggleSelectEmail(contact.email)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-slate-50/90 font-medium' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectEmail(contact.email)}
                          className="rounded accent-slate-900 cursor-pointer"
                        />
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                            {(contact.name || 'C').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-900">{contact.name || 'Hiring Lead'}</span>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="px-4 py-3.5 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold">{contact.company || 'Tech Corp'}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          <span>{contact.role || 'Engineering Lead'}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5 font-mono text-slate-900 font-semibold text-[11px]">
                        {contact.email}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sent ({contact.sentAt || 'Today'})
                          </span>
                        ) : contact.verificationStatus === 'valid' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Valid
                          </span>
                        ) : contact.verificationStatus === 'invalid' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" /> Invalid
                          </span>
                        ) : contact.verificationStatus === 'risky' || contact.verificationStatus === 'catch-all' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" /> Risky
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            Ready to Mail
                          </span>
                        )}
                      </td>

                      {/* Action: Preview */}
                      <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setPreviewContact(contact)}
                          title="Preview referral email message"
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" /> Preview
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 p-6">
            <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-slate-700">No Contacts Found</h3>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
              Click &ldquo;Sync Role Contacts&rdquo; to fetch the latest hiring leads for your role.
            </p>
          </div>
        )}
      </div>

      {/* Referral Email Preview Modal */}
      {previewContact && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Referral Inquiry Preview</h3>
                <p className="text-xs text-slate-500">Recipient: {previewContact.name} ({previewContact.email})</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewContact(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-mono">
              <div className="text-slate-500 font-bold">
                Subject: <span className="text-slate-900">{renderTemplateText(customSubject, previewContact)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 text-slate-700 whitespace-pre-line leading-relaxed">
                {renderTemplateText(customBody, previewContact)}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedEmails(new Set([previewContact.email]));
                  setPreviewContact(null);
                  handleAutoMailReferrals();
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Auto-Mail This Contact
              </button>
              <button
                type="button"
                onClick={() => setPreviewContact(null)}
                className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
