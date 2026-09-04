import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Search, Check, ExternalLink,
  FileText, Code2, Play, ChevronRight,
  X, Bookmark, Terminal, Star, Download, Youtube,
  Sparkles, Layers, Shield, CheckCircle2, Lock
} from 'lucide-react';
import {
  VAULT_QUESTIONS, VAULT_TEXTBOOKS, VAULT_CHEATSHEETS,
  VaultQuestion, VaultTextbook, VaultCheatsheet
} from '../data/resourceVault';
import {
  LEETCODE_PREMIUM_QUESTIONS,
  LeetCodePremiumQuestion
} from '../data/leetcodePremiumDataset';
import { AppUser, CuratedResource, getApi } from '../types';

interface ResourceVaultViewProps {
  currentUser?: AppUser | null;
  onOpenUpgrade?: (feature?: string) => void;
  onLog?: (msg: string) => void;
}

export const ResourceVaultView: React.FC<ResourceVaultViewProps> = ({
  currentUser,
  onOpenUpgrade,
  onLog
}) => {
  const [activeVaultSection, setActiveVaultSection] = useState<'questions' | 'textbooks' | 'cheatsheets'>('questions');
  
  // Question Bank Category Tabs
  const [selectedQuestionCategory, setSelectedQuestionCategory] = useState<string>('leetcode_premium');

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  // Interactive Drawers
  const [selectedLeetCodeQuestion, setSelectedLeetCodeQuestion] = useState<LeetCodePremiumQuestion | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<VaultQuestion | null>(null);
  const [selectedTextbook, setSelectedTextbook] = useState<VaultTextbook | null>(null);
  const [showSolutionCode, setShowSolutionCode] = useState<boolean>(false);
  const [userAttemptCode, setUserAttemptCode] = useState<string>('');

  const [unlockedForSession, setUnlockedForSession] = useState<boolean>(false);
  const isUserSubscribed = currentUser?.tier === 'learner_pro' || currentUser?.tier === 'seeker_max' || currentUser?.tier === 'pro' || unlockedForSession;

  // Filtered LeetCode Premium Questions
  const filteredLeetCode = useMemo(() => {
    return LEETCODE_PREMIUM_QUESTIONS.filter(q => {
      const matchSearch =
        searchQuery === '' ||
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(q.number).includes(searchQuery) ||
        q.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.companies.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchDiff = selectedDifficulty === 'all' || q.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();
      const matchComp = selectedCompany === 'all' || q.companies.includes(selectedCompany);

      return matchSearch && matchDiff && matchComp;
    });
  }, [searchQuery, selectedDifficulty, selectedCompany]);

  // Filtered Standard Question Bank List
  const filteredQuestions = useMemo(() => {
    return VAULT_QUESTIONS.filter(q => {
      const matchSearch =
        searchQuery === '' ||
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.companyTags.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCat =
        selectedQuestionCategory === 'all_general' ? true :
        selectedQuestionCategory === 'system_design' ? q.category === 'system_design' :
        selectedQuestionCategory === 'behavioral' ? q.category === 'behavioral' :
        selectedQuestionCategory === 'product_case' ? (q.category === 'product' || q.category === 'case_study') :
        q.category === selectedQuestionCategory;

      const matchDiff = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
      const matchComp = selectedCompany === 'all' || q.companyTags.includes(selectedCompany);

      return matchSearch && matchCat && matchDiff && matchComp;
    });
  }, [searchQuery, selectedQuestionCategory, selectedDifficulty, selectedCompany]);

  const handleOpenLink = (url: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const api = getApi();
    if (api && api.openExternalUrl) {
      api.openExternalUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleOpenLeetCodeDrawer = (q: LeetCodePremiumQuestion) => {
    setSelectedLeetCodeQuestion(q);
    setUserAttemptCode(q.starterCode || '// Write solution...');
    setShowSolutionCode(false);
  };

  const handleOpenQuestion = (q: VaultQuestion) => {
    setSelectedQuestion(q);
    setUserAttemptCode(q.starterCode || '// Write solution...');
    setShowSolutionCode(false);
  };

  return (
    <div className="space-y-6 font-sans select-none max-w-5xl mx-auto pb-20">
      
      {/* ── TOP HEADER & MAIN VAULT TABS ───────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-900 dark:text-white" />
              <span>Career &amp; Technical Resource Vault</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              High-frequency company question banks, LeetCode Premium breakdowns, textbooks, and engineering cheat sheets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Verified Resource Library Active
            </span>
          </div>
        </div>

        {/* Primary Vault Sections */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/70 p-1 rounded-xl overflow-x-auto border border-slate-200/60 dark:border-zinc-700/60">
          <button
            onClick={() => setActiveVaultSection('questions')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeVaultSection === 'questions'
                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            Question Banks ({LEETCODE_PREMIUM_QUESTIONS.length + VAULT_QUESTIONS.length}+)
          </button>

          <button
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

      {/* ── QUESTION BANK SECTION (WITH CATEGORIES) ─────────────────────────── */}
      {activeVaultSection === 'questions' && (
        <div className="space-y-4">
          
          {/* Category Chips Bar: First Category is "All LeetCode Premium Questions" */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedQuestionCategory('leetcode_premium')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                selectedQuestionCategory === 'leetcode_premium'
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                  : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>All LeetCode Premium Questions ({LEETCODE_PREMIUM_QUESTIONS.length})</span>
            </button>

            <button
              onClick={() => setSelectedQuestionCategory('system_design')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition shrink-0 ${
                selectedQuestionCategory === 'system_design'
                  ? 'bg-black text-white dark:bg-white dark:text-black font-bold shadow-xs'
                  : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300'
              }`}
            >
              System Design &amp; Architecture
            </button>

            <button
              onClick={() => setSelectedQuestionCategory('behavioral')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition shrink-0 ${
                selectedQuestionCategory === 'behavioral'
                  ? 'bg-black text-white dark:bg-white dark:text-black font-bold shadow-xs'
                  : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300'
              }`}
            >
              Behavioral &amp; STAR Leadership
            </button>

            <button
              onClick={() => setSelectedQuestionCategory('product_case')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition shrink-0 ${
                selectedQuestionCategory === 'product_case'
                  ? 'bg-black text-white dark:bg-white dark:text-black font-bold shadow-xs'
                  : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300'
              }`}
            >
              Domain &amp; Case Studies
            </button>

            <button
              onClick={() => setSelectedQuestionCategory('all_general')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition shrink-0 ${
                selectedQuestionCategory === 'all_general'
                  ? 'bg-black text-white dark:bg-white dark:text-black font-bold shadow-xs'
                  : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300'
              }`}
            >
              All Other Questions
            </button>
          </div>

          {/* Search & Sub-Filters Toolbar */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions, problem #, or keywords..."
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none"
              >
                <option value="all">All Companies</option>
                <option value="Google">Google</option>
                <option value="Meta">Meta</option>
                <option value="Amazon">Amazon</option>
                <option value="Apple">Apple</option>
                <option value="Microsoft">Microsoft</option>
                <option value="Stripe">Stripe</option>
                <option value="Bloomberg">Bloomberg</option>
              </select>
            </div>
          </div>

          {/* ── VIEW 1: ALL LEETCODE PREMIUM QUESTIONS (PRIMARY CATEGORY) ───────── */}
          {selectedQuestionCategory === 'leetcode_premium' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                <span>Showing {filteredLeetCode.length} LeetCode Premium High-Frequency Problems</span>
                <span>Direct LeetCode &amp; Video Search Integration</span>
              </div>

              {filteredLeetCode.map((q) => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 rounded-2xl p-5 shadow-xs transition space-y-3.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                          #{q.number}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                          {q.title}
                        </h3>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                          'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {q.difficulty}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Acceptance: {q.acceptanceRate} · Freq Score: {q.frequencyScore}%
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed pt-0.5">
                        {q.prompt}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start">
                      <button
                        type="button"
                        onClick={(e) => handleOpenLink(q.leetcodeUrl, e)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-semibold text-slate-800 dark:text-zinc-200 transition flex items-center gap-1.5"
                        title="Open direct problem page on LeetCode"
                      >
                        <span>LeetCode</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleOpenLink(q.videoSolutionUrl, e)}
                        className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 transition flex items-center gap-1.5"
                        title="Watch full video explanation on YouTube"
                      >
                        <Youtube className="w-3.5 h-3.5 text-red-600" />
                        <span>Solution Video</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenLeetCodeDrawer(q)}
                        className="px-3 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 transition flex items-center gap-1"
                      >
                        <span>Code &amp; Solution</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Company Tags & Key Concepts */}
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-zinc-800/80 text-xs flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-400">Companies:</span>
                      {q.companies.map((c, cIdx) => (
                        <span key={cIdx} className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                          {c}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-400">Concepts:</span>
                      {q.keyConcepts.map((k, kIdx) => (
                        <span key={kIdx} className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── VIEW 2: STANDARD / DOMAIN QUESTION BANKS ───────────────────────── */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                <span>Showing {filteredQuestions.length} Interview Problems</span>
              </div>

              {filteredQuestions.map((q) => (
                <div
                  key={q.id}
                  onClick={() => handleOpenQuestion(q)}
                  className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 rounded-2xl p-5 shadow-xs transition space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                          {q.title}
                        </h3>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          q.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          q.difficulty === 'medium' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                          'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {q.difficulty.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          {q.category}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                        {q.prompt}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-zinc-800/80">
                    <span className="text-[10px] font-mono text-slate-400">Asked At:</span>
                    {q.companyTags.map((c, idx) => (
                      <span key={idx} className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ── TEXTBOOKS SECTION ──────────────────────────────────────────────── */}
      {activeVaultSection === 'textbooks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VAULT_TEXTBOOKS.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTextbook(t)}
              className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 rounded-2xl p-5 shadow-xs transition space-y-3 cursor-pointer"
            >
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
                <BookOpen className="w-5 h-5 text-slate-400 shrink-0 mt-1" />
              </div>

              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                {t.description}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs font-mono text-slate-500">
                <span>{t.pages} Pages</span>
                <span className="text-slate-900 dark:text-white font-semibold flex items-center gap-1">
                  <span>Read Handbook</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CHEATSHEETS SECTION ────────────────────────────────────────────── */}
      {activeVaultSection === 'cheatsheets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VAULT_CHEATSHEETS.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3"
            >
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
                  {c.keyTopics.map((k, idx) => (
                    <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL / DRAWER: LEETCODE PREMIUM QUESTION DETAIL ───────────────── */}
      {selectedLeetCodeQuestion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-y-auto p-6 sm:p-7 space-y-6 shadow-2xl animate-in fade-in duration-200">
            
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                    LeetCode #{selectedLeetCodeQuestion.number}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    selectedLeetCodeQuestion.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                    selectedLeetCodeQuestion.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                    'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}>
                    {selectedLeetCodeQuestion.difficulty}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Acceptance: {selectedLeetCodeQuestion.acceptanceRate}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
                  {selectedLeetCodeQuestion.title}
                </h3>
              </div>
              <button onClick={() => setSelectedLeetCodeQuestion(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Problem Statement */}
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 leading-relaxed font-sans">
                {selectedLeetCodeQuestion.prompt}
              </div>

              {/* Examples */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Examples:</span>
                {selectedLeetCodeQuestion.examples.map((ex, exIdx) => (
                  <pre key={exIdx} className="p-3 rounded-lg bg-slate-100 dark:bg-black border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-800 dark:text-zinc-200 overflow-x-auto">
                    {ex}
                  </pre>
                ))}
              </div>
            </div>

            {/* Code Workspace & Solution Toggle */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 font-mono">
                  TypeScript Solution &amp; Implementation
                </span>

                <button
                  type="button"
                  onClick={() => setShowSolutionCode(!showSolutionCode)}
                  className="text-xs text-slate-600 dark:text-zinc-400 hover:text-black dark:hover:text-white font-semibold underline"
                >
                  {showSolutionCode ? 'Hide Verified Solution' : 'Reveal Verified Solution'}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 dark:bg-black dark:text-zinc-200 text-xs font-mono overflow-x-auto max-h-72 border border-slate-800">
                {showSolutionCode && selectedLeetCodeQuestion.solutionCode
                  ? selectedLeetCodeQuestion.solutionCode
                  : selectedLeetCodeQuestion.starterCode}
              </pre>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleOpenLink(selectedLeetCodeQuestion.leetcodeUrl, e)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-semibold text-slate-800 dark:text-zinc-200 hover:bg-slate-100 flex items-center gap-1.5"
                >
                  <span>Open on LeetCode</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => handleOpenLink(selectedLeetCodeQuestion.videoSolutionUrl, e)}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition flex items-center gap-1.5"
                >
                  <Youtube className="w-4 h-4" />
                  <span>Watch Video Solution</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLeetCodeQuestion(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL: STANDARD QUESTION DETAIL ────────────────────────────────── */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                  {selectedQuestion.category.toUpperCase()} · {selectedQuestion.difficulty.toUpperCase()}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                  {selectedQuestion.title}
                </h3>
              </div>
              <button onClick={() => setSelectedQuestion(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-900 dark:text-zinc-100">Question Prompt:</span>
              <p className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 leading-relaxed">
                {selectedQuestion.prompt}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">Solution &amp; Explanation:</span>
              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {selectedQuestion.solutionExplanation || 'Detailed architectural solution notes...'}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedQuestion(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
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
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                  {selectedTextbook.category} · {selectedTextbook.pages} Pages
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                  {selectedTextbook.title}
                </h3>
                <div className="text-xs text-slate-500 font-mono">by {selectedTextbook.author}</div>
              </div>
              <button onClick={() => setSelectedTextbook(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              {selectedTextbook.description}
            </p>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">Key Chapters:</span>
              <div className="space-y-1.5">
                {selectedTextbook.chapters.map((ch, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 text-xs flex items-center justify-between">
                    <span className="text-slate-800 dark:text-zinc-200 font-medium">{ch.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">p. {ch.pageRange}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedTextbook(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
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
