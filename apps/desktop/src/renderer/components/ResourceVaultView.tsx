import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Search, Check, ExternalLink,
  FileText, Code2, Play, ChevronRight,
  X, Bookmark, Terminal, Star, Download, Youtube
} from 'lucide-react';
import {
  VAULT_QUESTIONS, VAULT_TEXTBOOKS, VAULT_CHEATSHEETS,
  VaultQuestion, VaultTextbook, VaultCheatsheet
} from '../data/resourceVault';
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
  const [activeVaultSection, setActiveVaultSection] = useState<'questions' | 'textbooks' | 'cheatsheets' | 'tutorials'>('questions');
  const [curatedVideos, setCuratedVideos] = useState<CuratedResource[]>([]);
  
  // Question Bank Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  // Interactive Drawers
  const [selectedQuestion, setSelectedQuestion] = useState<VaultQuestion | null>(null);
  const [selectedTextbook, setSelectedTextbook] = useState<VaultTextbook | null>(null);
  const [showSolutionCode, setShowSolutionCode] = useState<boolean>(false);
  const [userAttemptCode, setUserAttemptCode] = useState<string>('');

  const [unlockedForSession, setUnlockedForSession] = useState<boolean>(false);
  const isUserSubscribed = currentUser?.tier === 'learner_pro' || currentUser?.tier === 'seeker_max' || currentUser?.tier === 'pro' || unlockedForSession;

  useEffect(() => {
    const api = getApi();
    if (api && api.adminGetLearningResources) {
      api.adminGetLearningResources().then(res => {
        if (res && res.length) setCuratedVideos(res);
      }).catch(() => {});
    }
  }, []);

  // Filtered Question List
  const filteredQuestions = useMemo(() => {
    return VAULT_QUESTIONS.filter(q => {
      const matchSearch =
        searchQuery === '' ||
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.companyTags.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCat = selectedCategory === 'all' || q.category === selectedCategory;
      const matchDiff = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
      const matchComp = selectedCompany === 'all' || q.companyTags.includes(selectedCompany);

      return matchSearch && matchCat && matchDiff && matchComp;
    });
  }, [searchQuery, selectedCategory, selectedDifficulty, selectedCompany]);

  const handleOpenQuestion = (q: VaultQuestion) => {
    setSelectedQuestion(q);
    setUserAttemptCode(q.starterCode || '// Write solution...');
    setShowSolutionCode(false);
  };

  const handleUnlockAll = () => {
    setUnlockedForSession(true);
    onLog?.('[Vault] Unlocked full question library.');
  };

  return (
    <div className="space-y-6 font-sans select-none max-w-5xl mx-auto pb-20">
      
      {/* ── CLEAN TOP HEADER & SEGMENTED CONTROLS ───────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              Technical Resources
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              1,500+ interview questions, technical textbooks, and architecture reference sheets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isUserSubscribed ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenUpgrade?.('Resource Library')}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl text-xs font-semibold transition-colors shadow-xs"
                >
                  Unlock Paid Library (₹79/mo)
                </button>
                <button
                  onClick={handleUnlockAll}
                  className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300 font-mono underline"
                >
                  [Demo Unlock]
                </button>
              </div>
            ) : (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Full Library Active
              </span>
            )}
          </div>
        </div>

        {/* Clean Segmented Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/70 p-1 rounded-xl overflow-x-auto border border-slate-200/60 dark:border-zinc-700/60">
          <button
            onClick={() => setActiveVaultSection('questions')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeVaultSection === 'questions'
                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            Question Bank ({VAULT_QUESTIONS.length})
          </button>

          <button
            onClick={() => setActiveVaultSection('textbooks')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeVaultSection === 'textbooks'
                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            Textbooks ({VAULT_TEXTBOOKS.length})
          </button>

          <button
            onClick={() => setActiveVaultSection('cheatsheets')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeVaultSection === 'cheatsheets'
                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            Cheatsheets ({VAULT_CHEATSHEETS.length})
          </button>

          <button
            onClick={() => setActiveVaultSection('tutorials')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeVaultSection === 'tutorials'
                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            <Youtube className="w-3.5 h-3.5 text-rose-600" />
            <span>Curated Tutorials ({curatedVideos.length})</span>
          </button>
        </div>
      </div>

      {/* ── SECTION 1: QUESTION BANK ─────────────────────────────────────────── */}
      {activeVaultSection === 'questions' && (
        <div className="space-y-4">
          
          {/* Filters Row */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search questions by topic, algorithm, company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-slate-400 transition-colors"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                {['all', 'Frontend', 'Backend', 'DSA', 'System Design'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>Showing {filteredQuestions.length} questions</span>
              <div className="flex items-center gap-2">
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="p-1 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded border border-slate-200 dark:border-zinc-700 outline-none"
                >
                  <option value="all">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>
          </div>

          {/* Question List */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl divide-y divide-slate-100 dark:divide-zinc-800/80 shadow-xs overflow-hidden">
            {filteredQuestions.map((q) => {
              const isLocked = q.isPaid && !isUserSubscribed;

              return (
                <div
                  key={q.id}
                  onClick={() => handleOpenQuestion(q)}
                  className="p-4 hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded ${
                        q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                        'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {q.difficulty}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                        {q.category}
                      </span>
                      {q.companyTags.slice(0, 2).map((comp) => (
                        <span key={comp} className="text-[10px] font-mono text-slate-400">
                          {comp}
                        </span>
                      ))}
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:underline truncate">
                      {q.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isLocked ? (
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500">
                        Pro
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900 dark:group-hover:text-zinc-100">
                        Solve
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SECTION 2: TEXTBOOKS ─────────────────────────────────────────────── */}
      {activeVaultSection === 'textbooks' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {VAULT_TEXTBOOKS.map((book) => (
            <div
              key={book.id}
              onClick={() => setSelectedTextbook(book)}
              className="p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>{book.category}</span>
                  <span className="text-amber-500 font-bold">★ {book.rating}</span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:underline leading-snug">
                  {book.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  by {book.author}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-zinc-100">
                <span>View Summary</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SECTION 3: CHEATSHEETS ───────────────────────────────────────────── */}
      {activeVaultSection === 'cheatsheets' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {VAULT_CHEATSHEETS.map((cs) => (
            <div
              key={cs.id}
              className="p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">{cs.category}</span>
                <span className="text-[10px] font-mono text-slate-400">{cs.downloadsCount}+ downloads</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100">{cs.title}</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">{cs.description}</p>
              
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">{cs.highlights?.length || 5} key rules</span>
                <a
                  href={cs.viewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 dark:text-zinc-100 hover:underline"
                >
                  <span>Open Sheet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SECTION 4: CURATED VIDEO TUTORIALS (ADMIN CURATED) ────────────────── */}
      {activeVaultSection === 'tutorials' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Youtube className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100">
                  Curated YouTube Video Tutorials
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Hand-picked, high-signal architecture, systems, and full-stack video masterclasses verified by staff instructors.
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {curatedVideos.length} Tutorials Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {curatedVideos.map((vid) => (
              <div
                key={vid.id}
                className="p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700 transition-all shadow-xs flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center gap-1">
                      <Youtube className="w-3 h-3 text-rose-600" />
                      <span>{vid.topic}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {vid.duration || '20 mins'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {vid.title}
                  </h4>

                  <div className="text-[10px] text-slate-600 dark:text-zinc-400">
                    <span className="text-slate-400">Target Role: </span>
                    <span className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-zinc-300 font-medium">{vid.targetRole}</span>
                  </div>

                  {vid.summary && (
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {vid.summary}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">Full Masterclass</span>
                  <a
                    href={vid.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    <span>Watch on YouTube</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {curatedVideos.length === 0 && (
            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-slate-50/50 dark:bg-zinc-800/30">
              <Youtube className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">No tutorials loaded yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Admin can add tutorials anytime from the Master Admin Dashboard.</p>
            </div>
          )}
        </div>
      )}

      {/* Question Drawer Modal */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-up">
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                    {selectedQuestion.category} · {selectedQuestion.difficulty}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-1">
                  {selectedQuestion.title}
                </h3>
              </div>
              <button onClick={() => setSelectedQuestion(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">Problem Prompt:</h4>
                <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed font-sans">
                  {selectedQuestion.prompt}
                </p>
              </div>

              {/* Code Playground */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">Solution Playground:</span>
                  <button
                    onClick={() => setShowSolutionCode(!showSolutionCode)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-zinc-200 underline"
                  >
                    {showSolutionCode ? 'Hide Solution' : 'Reveal Solution & Analysis'}
                  </button>
                </div>

                <div className="rounded-xl overflow-hidden border border-slate-300 dark:border-zinc-700 bg-slate-950 text-zinc-100 font-mono text-xs p-4">
                  <textarea
                    value={userAttemptCode}
                    onChange={(e) => setUserAttemptCode(e.target.value)}
                    rows={6}
                    className="w-full bg-transparent outline-none resize-none font-mono"
                  />
                </div>
              </div>

              {/* Solution Code Revealed */}
              {showSolutionCode && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 space-y-3 animate-fade-up">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">Optimal Reference Solution:</h4>
                  <pre className="p-3 bg-slate-950 text-emerald-400 rounded-lg text-xs font-mono overflow-x-auto">
                    {selectedQuestion.solutionCode}
                  </pre>
                  <div className="flex items-center gap-4 text-xs font-mono text-slate-600 dark:text-zinc-400 pt-1">
                    <span>Time: {selectedQuestion.timeComplexity}</span>
                    <span>Space: {selectedQuestion.spaceComplexity}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Textbook Details Modal */}
      {selectedTextbook && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-fade-up">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">{selectedTextbook.category}</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">{selectedTextbook.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">by {selectedTextbook.author}</p>
              </div>
              <button onClick={() => setSelectedTextbook(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700 dark:text-zinc-300 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <h4 className="font-bold text-slate-900 dark:text-zinc-100">Key Takeaways:</h4>
              <ul className="space-y-1">
                {selectedTextbook.keyTakeaways.map((takeaway, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1 shrink-0" />
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
              <a
                href={selectedTextbook.readUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span>Read Digital Edition</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
