import React from 'react';
import { ShieldCheck, FileText, CheckCircle2, X } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  hasAccepted?: boolean;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  hasAccepted = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none font-sans">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                Terms of Service &amp; Conditions · Nomadic
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-normal">
                Version 1.0.0 · Comprehensive Career Operating System
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Terms Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
          
          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center text-[10px] font-mono">1</span>
              Software License &amp; Authorized Desktop Usage
            </h3>
            <p className="text-slate-600 dark:text-zinc-400 pl-7">
              Nomadic grants you a personal, non-exclusive, non-transferable license to operate the Nomadic desktop software in accordance with your registered plan tier (Free Plan, Learner Pro, Seeker Pro, or Seeker Max). Single-laptop hardware locks are enforced to maintain account security.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center text-[10px] font-mono">2</span>
              Autonomous Job Applications &amp; Accuracy
            </h3>
            <p className="text-slate-600 dark:text-zinc-400 pl-7">
              Nomadic executes automated form filling, resume uploads, and open-ended employer questions directly in your local external browser. You retain full ownership and responsibility for the accuracy of all candidate information, work authorization statements, and submissions delivered on your behalf.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center text-[10px] font-mono">3</span>
              Curriculum, Resource Vault &amp; Question Bank
            </h3>
            <p className="text-slate-600 dark:text-zinc-400 pl-7">
              The 428+ company question collection, AI-synthesized roadmaps, textbook summaries, and architecture reference sheets are provided for career development and interview preparation. Content is structured to assist candidates in self-paced technical mastery.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center text-[10px] font-mono">4</span>
              Ethical Recruiter Outreach Compliance
            </h3>
            <p className="text-slate-600 dark:text-zinc-400 pl-7">
              When utilizing 1-click Gmail outreach and recruiter contact pipelines, you agree to comply with standard electronic communications ethics. Mass unsolicited spamming or aggressive outreach is discouraged in favor of targeted, professional communication.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center text-[10px] font-mono">5</span>
              Local-First Data Privacy Guarantee
            </h3>
            <p className="text-slate-600 dark:text-zinc-400 pl-7">
              Your sensitive data—including resume files, personal contact information, and local application logs—remains permanently stored in your local SQLite database on your machine. Nomadic does not sell or distribute your private resume documents to third-party data brokers.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Local-First &amp; Privacy Protected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 text-xs font-bold transition-colors"
            >
              Close
            </button>

            {onAccept && (
              <button
                type="button"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>I Accept Terms</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
