import React, { useState } from 'react';
import { Sparkles, Bell, CheckCircle2 } from 'lucide-react';
import { MasterProfile } from '../types';

interface OpportunityBoardViewProps {
  profile?: MasterProfile;
  onLog?: (msg: string) => void;
}

export const OpportunityBoardView: React.FC<OpportunityBoardViewProps> = ({
  onLog
}) => {
  const [isWaitlisted, setIsWaitlisted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nomadic_opp_board_waitlist') === 'true';
    } catch {
      return false;
    }
  });

  const handleJoinWaitlist = () => {
    setIsWaitlisted(true);
    try {
      localStorage.setItem('nomadic_opp_board_waitlist', 'true');
    } catch {}
    onLog?.('[Opportunity Board] Subscribed to launch notifications.');
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center font-sans select-none p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-8 sm:p-12 text-center max-w-lg w-full space-y-5 shadow-xs animate-in fade-in duration-300">
        
        {/* Monotone Coming Soon Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono font-bold text-slate-800 dark:text-zinc-200">
          <Sparkles className="w-3.5 h-3.5 text-slate-700 dark:text-zinc-300" />
          <span>Coming Soon</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Opportunity Board
        </h1>

        {/* Simple single line */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed max-w-md mx-auto">
          Curated paid research fellowships, global hackathons, open-source grants, and builder residencies will appear here.
        </p>

        {/* Action button */}
        <div className="pt-2 flex justify-center">
          {isWaitlisted ? (
            <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>You will be notified at launch ✓</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleJoinWaitlist}
              className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-semibold hover:opacity-90 transition flex items-center gap-2 shadow-xs"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Notify Me at Launch</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
