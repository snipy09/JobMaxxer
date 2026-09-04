import React, { useState } from 'react';
import {
  BookOpen, ExternalLink, FileText, Code2, ChevronRight,
  X, Sparkles
} from 'lucide-react';
import {
  VAULT_TEXTBOOKS, VAULT_CHEATSHEETS,
  VaultTextbook, VaultCheatsheet
} from '../data/resourceVault';
import { AppUser, getApi } from '../types';

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
  const [selectedTextbook, setSelectedTextbook] = useState<VaultTextbook | null>(null);

  const isFree = !currentUser?.tier || currentUser?.tier === 'free';

  const handleOpenLeetCodeAll = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const url = 'https://leetcode.com/problemset/all/';
    const api = getApi();
    if (api && api.openExternalUrl) {
      api.openExternalUrl(url);
    } else {
      window.open(url, '_blank');
    }
    onLog?.('[Resource Vault] Opened All LeetCode Questions in browser.');
  };

  return (
    <div className="space-y-6 font-sans select-none max-w-5xl mx-auto pb-20">
      
      {/* ── TOP HEADER & MAIN VAULT TABS ───────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-900 dark:text-white" />
              <span>Technical Resource Vault</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              LeetCode practice portal, engineering textbooks, and system design architecture sheets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Active
            </span>
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
            Question Bank
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

      {/* ── QUESTION BANK SECTION: ONLY ONE BUTTON (ZERO LIST/CLUTTER) ───────── */}
      {activeVaultSection === 'questions' && (
        <div className="min-h-[50vh] flex items-center justify-center font-sans select-none p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-8 sm:p-12 text-center max-w-lg w-full space-y-5 shadow-xs animate-in fade-in duration-200">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono font-bold text-slate-800 dark:text-zinc-200">
              <Code2 className="w-3.5 h-3.5 text-slate-700 dark:text-zinc-300" />
              <span>Practice Portal</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              LeetCode Question Vault
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed max-w-md mx-auto">
              Access the complete collection of data structure algorithms, technical coding challenges, and company interview questions.
            </p>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={handleOpenLeetCodeAll}
                className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold hover:opacity-90 transition flex items-center gap-2 shadow-xs"
              >
                <span>All LeetCode Questions</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

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

      {/* ── MODAL: TEXTBOOK DETAIL ─────────────────────────────────────────── */}
      {selectedTextbook && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in fade-in duration-200 font-sans">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
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
