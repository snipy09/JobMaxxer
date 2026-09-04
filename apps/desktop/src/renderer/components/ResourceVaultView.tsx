import React, { useState, useMemo } from 'react';
import {
  BookOpen, ExternalLink, FileText, Code2, ChevronRight,
  X, Sparkles, Search, Building, ArrowUpRight, Flame,
  Youtube, Globe, CheckCircle2, ShieldCheck, Play
} from 'lucide-react';
import {
  VAULT_TEXTBOOKS, VAULT_CHEATSHEETS,
  VaultTextbook, VaultCheatsheet
} from '../data/resourceVault';
import leetcodeCompaniesDataRaw from '../data/leetcodeCompaniesDataset.json';
import { AppUser, getApi } from '../types';

interface ResourceVaultViewProps {
  currentUser?: AppUser | null;
  onOpenUpgrade?: (feature?: string) => void;
  onLog?: (msg: string) => void;
}

interface CompanyProblem {
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | string;
  link: string;
  frequency?: string;
  topics?: string[];
}

interface CompanyEntry {
  company: string;
  questionCount: number;
  problems: CompanyProblem[];
}

const leetcodeCompaniesData = leetcodeCompaniesDataRaw as Record<string, CompanyEntry>;

const POPULAR_COMPANIES = [
  'Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Uber', 'Netflix',
  'Adobe', 'Atlassian', 'Stripe', 'Airbnb', 'Bloomberg', 'Goldman Sachs',
  'Salesforce', 'ByteDance', 'Oracle'
];

export const ResourceVaultView: React.FC<ResourceVaultViewProps> = ({
  currentUser,
  onOpenUpgrade,
  onLog
}) => {
  const [activeVaultSection, setActiveVaultSection] = useState<'questions' | 'textbooks' | 'cheatsheets'>('questions');
  const [selectedTextbook, setSelectedTextbook] = useState<VaultTextbook | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<CompanyProblem | null>(null);
  
  // Company-Wise Questions State
  const [selectedCompany, setSelectedCompany] = useState<string>('Google');
  const [companySearch, setCompanySearch] = useState<string>('');
  const [problemSearch, setProblemSearch] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');

  const isFree = !currentUser?.tier || currentUser?.tier === 'free';

  const handleOpenExternal = (url: string, logMsg?: string) => {
    const api = getApi();
    if (api && api.openExternalUrl) {
      api.openExternalUrl(url);
    } else {
      window.open(url, '_blank');
    }
    if (logMsg) onLog?.(logMsg);
  };

  const allCompanyNames = useMemo(() => {
    return Object.keys(leetcodeCompaniesData).sort();
  }, []);

  const filteredCompanyNames = useMemo(() => {
    if (!companySearch.trim()) return allCompanyNames;
    const q = companySearch.toLowerCase().trim();
    return allCompanyNames.filter(c => c.toLowerCase().includes(q));
  }, [allCompanyNames, companySearch]);

  const activeCompanyData = useMemo(() => {
    return leetcodeCompaniesData[selectedCompany] || leetcodeCompaniesData['Google'] || null;
  }, [selectedCompany]);

  const displayedProblems = useMemo(() => {
    if (!activeCompanyData) return [];
    let list = activeCompanyData.problems || [];
    
    if (difficultyFilter !== 'ALL') {
      list = list.filter(p => p.difficulty.toUpperCase() === difficultyFilter);
    }

    if (problemSearch.trim()) {
      const q = problemSearch.toLowerCase().trim();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) || 
        (p.topics || []).some(t => t.toLowerCase().includes(q))
      );
    }

    return list;
  }, [activeCompanyData, difficultyFilter, problemSearch]);

  const getProblemSlug = (link: string, title: string) => {
    try {
      const parts = link.split('/problems/')[1]?.split('/')[0];
      if (parts) return parts;
    } catch {}
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  return (
    <div className="space-y-6 font-sans max-w-6xl mx-auto pb-20">
      
      {/* ── TOP HEADER & MAIN VAULT TABS ───────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-900 dark:text-white" />
              <span>Technical Resource Vault</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              428+ Company-wise LeetCode problems, engineering textbooks, and system design architecture sheets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenExternal('https://leetcode.com/problemset/all/', '[Resource Vault] Opened All LeetCode Questions in browser.')}
              className="px-4 py-2 bg-black hover:opacity-90 text-white dark:bg-white dark:text-black rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <span>All LeetCode Questions</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Primary Vault Sections */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/70 p-1 rounded-xl overflow-x-auto border border-slate-200/60 dark:border-zinc-700/60">
          <button
            type="button"
            onClick={() => setActiveVaultSection('questions')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeVaultSection === 'questions'
                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            Company Question Bank (428+ Companies)
          </button>

          <button
            type="button"
            onClick={() => setActiveVaultSection('textbooks')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeVaultSection === 'textbooks'
                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            Curated Textbooks ({VAULT_TEXTBOOKS.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveVaultSection('cheatsheets')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeVaultSection === 'cheatsheets'
                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            Architecture Reference Sheets ({VAULT_CHEATSHEETS.length})
          </button>
        </div>
      </div>

      {/* ── QUESTION BANK: 428+ COMPANY WISE EXPLORER ───────────────────────── */}
      {activeVaultSection === 'questions' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          
          {/* Upcoming Full Native Questions & Premium Vault Notice */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-powder-50/40 to-slate-50 dark:from-zinc-900 dark:via-powder-950/20 dark:to-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-powder-100 dark:bg-powder-950 text-powder-700 dark:text-powder-300 flex items-center justify-center shrink-0 border border-powder-200 dark:border-powder-800 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                    Full In-App Problem Runner &amp; Paid Questions In Development
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-powder-100 text-powder-800 dark:bg-powder-950 dark:text-powder-300 font-bold border border-powder-200 dark:border-powder-800">
                    Coming Soon
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed max-w-2xl">
                  We are building an embedded in-app code execution workspace with all paid LeetCode Premium questions and verified editorials. Till then, practice with these curated, 100% free company-wise question sets below.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenLeetCodeAll}
              className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-xs font-bold transition shadow-xs whitespace-nowrap active:scale-95 flex items-center gap-1.5 self-end sm:self-center"
            >
              <span>Explore All Questions</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
          
          {/* Quick Popular Company Pills */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">Top Tech Companies</span>
                <span className="text-[10px] font-mono text-slate-400">({allCompanyNames.length} total)</span>
              </div>

              {/* Company Search Dropdown / Input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  placeholder="Find company (e.g. Netflix, Stripe)..."
                  className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Company Pills */}
            <div className="flex items-center gap-1.5 flex-wrap max-h-28 overflow-y-auto pt-1">
              {(companySearch ? filteredCompanyNames.slice(0, 30) : POPULAR_COMPANIES).map((comp) => {
                const isSelected = selectedCompany === comp;
                const count = leetcodeCompaniesData[comp]?.questionCount || 0;

                return (
                  <button
                    key={comp}
                    type="button"
                    onClick={() => {
                      setSelectedCompany(comp);
                      setProblemSearch('');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                        : 'bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200/80 dark:border-zinc-700'
                    }`}
                  >
                    <span>{comp}</span>
                    <span className={`text-[10px] font-mono px-1 rounded ${
                      isSelected
                        ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black'
                        : 'bg-slate-200/70 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Company Problems Header & Filter Bar */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs text-slate-900 dark:text-white">
                {selectedCompany.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  {selectedCompany} Problem Set
                </h3>
                <div className="text-[11px] text-slate-500 font-mono">
                  Showing {displayedProblems.length} questions
                </div>
              </div>
            </div>

            {/* Problem Filter Controls */}
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={problemSearch}
                  onChange={(e) => setProblemSearch(e.target.value)}
                  placeholder="Filter problems or topics..."
                  className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl pl-7 pr-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Difficulty Pills */}
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-zinc-800 rounded-xl text-[11px] font-bold">
                {(['ALL', 'EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficultyFilter(diff)}
                    className={`px-2 py-1 rounded-lg transition ${
                      difficultyFilter === diff
                        ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Problem List Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayedProblems.map((prob, idx) => {
              const diff = prob.difficulty.toUpperCase();
              const diffBadgeClass =
                diff === 'EASY'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : diff === 'MEDIUM'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedProblem(prob)}
                  className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 rounded-2xl p-4 shadow-xs hover:shadow-sm transition flex flex-col justify-between gap-3 cursor-pointer group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {prob.title}
                      </h4>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${diffBadgeClass}`}>
                        {diff}
                      </span>
                    </div>

                    {prob.topics && prob.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {prob.topics.map((t, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700/60"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-[11px]">
                    <span className="text-slate-400 font-mono text-[10px] flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-500" />
                      <span>Freq: {prob.frequency ? parseFloat(prob.frequency).toFixed(1) : '90+'}</span>
                    </span>

                    <span className="text-slate-900 dark:text-white font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-xs">
                      <span>Solve &amp; Free Solution</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TEXTBOOKS SECTION ──────────────────────────────────────────────── */}
      {activeVaultSection === 'textbooks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VAULT_TEXTBOOKS.map((t, idx) => {
            const isLocked = isFree && idx >= 2;
            return (
              <div
                key={t.id}
                onClick={() => {
                  if (isLocked) {
                    onOpenUpgrade?.('Complete Engineering Textbooks (Learner Pro)');
                  } else {
                    setSelectedTextbook(t);
                  }
                }}
                className={`bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-xs transition space-y-3 cursor-pointer relative ${
                  isLocked
                    ? 'border-slate-200 dark:border-zinc-800 opacity-80 hover:border-emerald-400'
                    : 'border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                {isLocked && (
                  <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-mono font-bold text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                    🔒 Learner Pro
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                      {t.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-2">
                      {t.title}
                    </h3>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">by {t.author}</div>
                  </div>
                  {!isLocked && <BookOpen className="w-5 h-5 text-slate-400 shrink-0 mt-1" />}
                </div>

                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {t.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs font-mono text-slate-500">
                  <span>{t.pages} Pages</span>
                  <span className="text-slate-900 dark:text-white font-semibold flex items-center gap-1">
                    <span>{isLocked ? 'Unlock Textbook' : 'Read Handbook'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CHEATSHEETS SECTION ────────────────────────────────────────────── */}
      {activeVaultSection === 'cheatsheets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VAULT_CHEATSHEETS.map((c, idx) => {
            const isLocked = isFree && idx >= 2;
            return (
              <div
                key={c.id}
                onClick={() => {
                  if (isLocked) {
                    onOpenUpgrade?.('Architecture Reference Sheets (Learner Pro)');
                  }
                }}
                className={`bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-xs space-y-3 relative ${
                  isLocked ? 'cursor-pointer border-slate-200 dark:border-zinc-800 opacity-80 hover:border-emerald-400' : 'border-slate-200/80 dark:border-zinc-800'
                }`}
              >
                {isLocked && (
                  <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-mono font-bold text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                    🔒 Learner Pro
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                      {c.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-2">
                      {c.title}
                    </h3>
                  </div>
                  <FileText className="w-5 h-5 text-slate-400 shrink-0 mt-1" />
                </div>

                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {c.summary}
                </p>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Key Architectural Sections:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {c.keyTopics.map((k, kIdx) => (
                      <span key={kIdx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: PROBLEM ACCESS & FREE SOLUTION MIRROR (BYPASS PREMIUM) ──── */}
      {selectedProblem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in fade-in duration-200 font-sans">
            
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[10px] font-mono font-bold mb-1 text-slate-800 dark:text-zinc-200">
                  <span>{selectedCompany} Problem Portal</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {selectedProblem.title}
                </h3>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  Difficulty: <strong className={selectedProblem.difficulty.toUpperCase() === 'HARD' ? 'text-rose-500' : selectedProblem.difficulty.toUpperCase() === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500'}>{selectedProblem.difficulty}</strong> · Frequency: {selectedProblem.frequency || '95.0'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProblem(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                If this question is locked under <strong>LeetCode Premium</strong> on leetcode.com, you can view the complete problem description, test cases, and clean solutions for free via our mirrors:
              </p>

              <div className="space-y-2 pt-1">
                {/* 1. Official LeetCode */}
                <button
                  type="button"
                  onClick={() => handleOpenExternal(selectedProblem.link, `[Resource Vault] Opened Official LeetCode link: ${selectedProblem.title}`)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-between transition group shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Code2 className="w-4 h-4 text-amber-500" />
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-zinc-100">Solve on LeetCode (Official)</div>
                      <div className="text-[10px] text-slate-400">Direct portal link to problem on leetcode.com</div>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />
                </button>

                {/* 2. Free WalkCCC / LeetCode.ca Solution Mirror (No Paywall) */}
                <button
                  type="button"
                  onClick={() => {
                    const slug = getProblemSlug(selectedProblem.link, selectedProblem.title);
                    handleOpenExternal(`https://walkccc.me/LeetCode/problems/${slug}/`, `[Resource Vault] Opened Free Solution Mirror for: ${selectedProblem.title}`);
                  }}
                  className="w-full p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/70 text-emerald-950 dark:text-emerald-200 flex items-center justify-between transition group shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div className="text-left">
                      <div className="font-bold">Free Solution &amp; Editorial (No Paywall)</div>
                      <div className="text-[10px] opacity-80">Full problem statement, Java/Python/C++ code, and complexity analysis</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* 3. YouTube Video Explanation */}
                <button
                  type="button"
                  onClick={() => handleOpenExternal(`https://www.youtube.com/results?search_query=leetcode+${encodeURIComponent(selectedProblem.title)}`, `[Resource Vault] Opened YouTube Solution for: ${selectedProblem.title}`)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-between transition group shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Youtube className="w-4 h-4 text-rose-500" />
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-zinc-100">Video Walkthrough (YouTube)</div>
                      <div className="text-[10px] text-slate-400">Step-by-step intuition, whiteboard diagrams, and code</div>
                    </div>
                  </div>
                  <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500" />
                </button>

                {/* 4. Google Discussions */}
                <button
                  type="button"
                  onClick={() => handleOpenExternal(`https://www.google.com/search?q=leetcode+${encodeURIComponent(selectedProblem.title)}+solution`, `[Resource Vault] Opened Google Discussions for: ${selectedProblem.title}`)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-between transition group shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-zinc-100">Discussions &amp; Alternative Approaches</div>
                      <div className="text-[10px] text-slate-400">Community forums, edge cases, and optimal algorithms</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">Nomadic Free Access Vault</span>
              <button
                type="button"
                onClick={() => setSelectedProblem(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: TEXTBOOK DETAIL ─────────────────────────────────────────── */}
      {selectedTextbook && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in fade-in duration-200 font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                  {selectedTextbook.category}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                  {selectedTextbook.title}
                </h3>
                <div className="text-xs text-slate-500 font-mono">by {selectedTextbook.author} · {selectedTextbook.pages} Pages</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTextbook(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="font-bold text-slate-900 dark:text-zinc-100">Overview:</span>
                <p className="text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  {selectedTextbook.description}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-900 dark:text-zinc-100">Core Chapters &amp; Topics:</span>
                <ul className="mt-2 space-y-1.5 text-slate-700 dark:text-zinc-300 font-mono">
                  {selectedTextbook.chapters.map((ch, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span>{ch}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-zinc-800">
              <span className="text-[11px] font-mono text-slate-400">Curated Reference Handbook</span>
              <button
                type="button"
                onClick={() => setSelectedTextbook(null)}
                className="px-4 py-2 bg-black hover:opacity-90 text-white dark:bg-white dark:text-black rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Close Handbook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
