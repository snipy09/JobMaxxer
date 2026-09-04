import React, { useState } from 'react';
import {
  Compass, Sparkles, Award, Globe, DollarSign,
  Calendar, CheckCircle2, ArrowRight, Bell, Share2,
  Bookmark, Filter, Search, Tag, Users, Flame, Send
} from 'lucide-react';
import { MasterProfile } from '../types';

interface OpportunityBoardViewProps {
  profile?: MasterProfile;
  onLog?: (msg: string) => void;
}

interface OpportunityTeaser {
  id: string;
  title: string;
  organization: string;
  type: 'research' | 'hackathon' | 'grant' | 'residency';
  typeLabel: string;
  stipendOrPrize: string;
  location: string;
  deadline: string;
  tags: string[];
  description: string;
  status: 'upcoming' | 'early_access';
}

const UPCOMING_OPPORTUNITIES: OpportunityTeaser[] = [
  {
    id: 'opp-1',
    title: 'Autonomous Systems & Agentic AI Research Fellowship',
    organization: 'Open Intelligence Lab',
    type: 'research',
    typeLabel: 'Paid Research',
    stipendOrPrize: '$8,000 / month',
    location: 'Remote · Global',
    deadline: 'Rolling Admission',
    tags: ['AI Agents', 'Reasoning Models', 'Research'],
    description: '3-month fully remote paid research residency investigating multi-step tool-use and autonomous code generation architectures.',
    status: 'early_access',
  },
  {
    id: 'opp-2',
    title: 'Global Next-Gen Systems & LLM Hackathon 2026',
    organization: 'Foundational AI Collective',
    type: 'hackathon',
    typeLabel: 'Global Hackathon',
    stipendOrPrize: '$100,000 Prize Pool',
    location: 'Virtual / Online',
    deadline: 'Registration Opening Soon',
    tags: ['Hackathon', 'Open Source', 'Cash Bounties'],
    description: '48-hour global sprint building decentralized applications, agent toolsets, and high-performance local AI infrastructure.',
    status: 'upcoming',
  },
  {
    id: 'opp-3',
    title: 'Open Source Core Infrastructure Developer Grant',
    organization: 'Systems & Developer Ecosystem',
    type: 'grant',
    typeLabel: 'Open-Source Grant',
    stipendOrPrize: '$15,000 Equity-Free Grant',
    location: 'Worldwide',
    deadline: 'Quarterly Cohort',
    tags: ['Compilers', 'Databases', 'Rust / TypeScript'],
    description: 'Direct grant funding for solo engineers and independent researchers building high-impact developer tooling and open infrastructure.',
    status: 'early_access',
  },
  {
    id: 'opp-4',
    title: 'Early Stage Founder & Builder Residency Cohort',
    organization: 'Nomadic Ventures',
    type: 'residency',
    typeLabel: 'Venture Residency',
    stipendOrPrize: '$25,000 + Cloud Credits',
    location: 'Hybrid / Remote',
    deadline: 'Q4 Cohort',
    tags: ['Pre-Seed', 'Residency', 'Product Build'],
    description: 'Intensive 8-week builder fellowship providing living stipends, engineering mentorship, and direct pre-seed investor demo day access.',
    status: 'upcoming',
  },
  {
    id: 'opp-5',
    title: 'Computational Economics & Market Design Fellowship',
    organization: 'Decentralized Research Foundation',
    type: 'research',
    typeLabel: 'Paid Research',
    stipendOrPrize: '$6,500 / month',
    location: 'Remote',
    deadline: 'Opening Soon',
    tags: ['Economics', 'Data Science', 'Mechanism Design'],
    description: 'Research stipend exploring automated auction mechanisms, token economics, and algorithmic pricing models.',
    status: 'early_access',
  },
  {
    id: 'opp-6',
    title: 'High-Performance UI/UX & Web Performance Challenge',
    organization: 'Modern Web Consortium',
    type: 'hackathon',
    typeLabel: 'Global Hackathon',
    stipendOrPrize: '$40,000 in Awards',
    location: 'Virtual',
    deadline: 'Fall 2026',
    tags: ['UI/UX', 'Performance', 'Design Systems'],
    description: 'Design and engineering hackathon focused on 60FPS DOM-free interfaces, fluid micro-interactions, and instant local-first apps.',
    status: 'upcoming',
  }
];

export const OpportunityBoardView: React.FC<OpportunityBoardViewProps> = ({
  profile,
  onLog
}) => {
  const [filterType, setFilterType] = useState<'all' | 'research' | 'hackathon' | 'grant' | 'residency'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isWaitlisted, setIsWaitlisted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nomadic_opp_board_waitlist') === 'true';
    } catch {
      return false;
    }
  });
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitTitle, setSubmitTitle] = useState<string>('');
  const [submitOrg, setSubmitOrg] = useState<string>('');
  const [submitUrl, setSubmitUrl] = useState<string>('');

  const handleJoinWaitlist = () => {
    setIsWaitlisted(true);
    try {
      localStorage.setItem('nomadic_opp_board_waitlist', 'true');
    } catch {}
    onLog?.('[Opportunity Board] Joined early access notification list.');
  };

  const handleSubmitOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitTitle.trim() || !submitOrg.trim()) return;
    setSubmitSuccess(true);
    onLog?.(`[Opportunity Board] Submitted opportunity: "${submitTitle}" (${submitOrg})`);
    setTimeout(() => {
      setShowSubmitModal(false);
      setSubmitSuccess(false);
      setSubmitTitle('');
      setSubmitOrg('');
      setSubmitUrl('');
    }, 2000);
  };

  const filteredList = UPCOMING_OPPORTUNITIES.filter(opp => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      q === '' ||
      opp.title.toLowerCase().includes(q) ||
      opp.organization.toLowerCase().includes(q) ||
      opp.tags.some(t => t.toLowerCase().includes(q));

    const matchType = filterType === 'all' || opp.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6 font-sans select-none max-w-6xl mx-auto pb-24">
      
      {/* ── TOP HERO & WAITLIST CALLOUT ────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 relative overflow-hidden">
        
        {/* Subtle background glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-slate-100 dark:bg-zinc-800/50 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono font-bold text-slate-800 dark:text-zinc-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Coming Soon · High-Impact Programs</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Opportunity Board
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
              Curated paid research fellowships, open-source grant programs, global hackathons, and builder residencies for ambitious engineers, designers, and researchers.
            </p>
          </div>

          {/* Waitlist Callout Box */}
          <div className="w-full md:w-auto p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-3 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-zinc-100">
              <Bell className="w-4 h-4 text-emerald-500" />
              <span>Early Access Notifications</span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-zinc-400 max-w-xs leading-normal">
              Get notified immediately when verified paid fellowships and hackathon applications go live.
            </p>

            <div className="flex items-center gap-2 pt-1">
              {isWaitlisted ? (
                <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Early Access Confirmed ✓</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleJoinWaitlist}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-semibold hover:opacity-90 transition flex items-center gap-1.5 shadow-xs"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Notify Me at Launch</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 transition"
              >
                Submit Program
              </button>
            </div>
          </div>
        </div>

        {/* ── FILTER TABS & SEARCH BAR ───────────────────────────────────────── */}
        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
            {[
              { id: 'all', label: 'All Opportunities' },
              { id: 'research', label: 'Paid Research' },
              { id: 'hackathon', label: 'Global Hackathons' },
              { id: 'grant', label: 'Grants & Bounties' },
              { id: 'residency', label: 'Builder Residencies' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  filterType === tab.id
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 border border-slate-200/60 dark:border-zinc-700/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fellowships, hackathons, tags..."
              className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>

      </div>

      {/* ── OPPORTUNITIES GRID ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
        {filteredList.map((opp) => (
          <div
            key={opp.id}
            className="p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4"
          >
            {/* Header: Tag + Stipend/Prize */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                  {opp.typeLabel}
                </span>

                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                  {opp.stipendOrPrize}
                </span>
              </div>

              {/* Title & Organization */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 line-clamp-2 leading-snug">
                  {opp.title}
                </h3>
                <div className="text-xs text-slate-500 font-medium mt-1">
                  by {opp.organization} · {opp.location}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
                {opp.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 pt-1">
                {opp.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer Status & Action */}
            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
              <div className="text-[10px] font-mono text-slate-400">
                {opp.deadline}
              </div>

              <button
                type="button"
                onClick={handleJoinWaitlist}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold transition flex items-center gap-1 shadow-xs"
              >
                <span>Notify Me</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── MODAL: SUBMIT PROGRAM ───────────────────────────────────────────── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in duration-200 font-sans">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-slate-900 dark:text-white" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Submit an Opportunity</h3>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Are you hosting a paid fellowship, grant program, or global hackathon? Submit your listing for community verification.
            </p>

            {submitSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Thank you! Your program was submitted for review.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitOpportunity} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    Program / Fellowship Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={submitTitle}
                    onChange={(e) => setSubmitTitle(e.target.value)}
                    placeholder="e.g. AI Security Research Fellowship 2026"
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    Host Organization / Foundation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={submitOrg}
                    onChange={(e) => setSubmitOrg(e.target.value)}
                    placeholder="e.g. Open Research Lab, Foundations Collective"
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    Application / Landing URL
                  </label>
                  <input
                    type="url"
                    value={submitUrl}
                    onChange={(e) => setSubmitUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 transition shadow-xs"
                  >
                    Submit Program
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
