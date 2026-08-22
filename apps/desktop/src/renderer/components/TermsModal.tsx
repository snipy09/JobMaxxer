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
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Terms &amp; Conditions &bull; JobMaxxer
              </h2>
              <p className="text-[11px] text-slate-500 font-normal">
                Last updated: August 2026 &bull; Version 2.4
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Terms Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 leading-relaxed">
          
          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-mono">1</span>
              Software License &amp; Authorized Use
            </h3>
            <p className="text-slate-600 pl-7">
              JobMaxxer grants you a non-exclusive, non-transferable, revocable license to utilize the desktop application on authorized devices in accordance with your active subscription tier (Trial, Pro, Max, or Lifetime). Single-device concurrency is enforced via secure cryptographic licensing.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-mono">2</span>
              Automated Job Application Engine &amp; User Responsibility
            </h3>
            <p className="text-slate-600 pl-7">
              JobMaxxer provides local browser automation and AI-powered field pre-filling (e.g. Groq LLaMA-3) to streamline your job search. You acknowledge and agree that all application submissions, responses to employer questionnaires, work authorization statements, and uploaded resumes remain your sole responsibility.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-mono">3</span>
              7-Day Trial Period, Renewals &amp; Subscriptions
            </h3>
            <p className="text-slate-600 pl-7">
              Users enrolled in a <strong>7-Day Free Trial</strong> receive full access for exactly seven (7) consecutive days from account activation. Upon expiration of the 7-day period, automated services pause until the user renews or upgrades to a paid plan. Paid subscriptions (Pro and Max) operate on a 30-day recurring term.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-mono">4</span>
              Ethical Outreach &amp; Anti-Spam Compliance
            </h3>
            <p className="text-slate-600 pl-7">
              When utilizing recruiter lead scraping and cold outreach tools, you agree to comply with applicable anti-spam and electronic communications regulations (such as CAN-SPAM, GDPR, and CASL). Mass spamming, harassment, or unauthorized scraping of protected third-party systems is strictly prohibited.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-mono">5</span>
              Local Data Privacy &amp; Security Guarantee
            </h3>
            <p className="text-slate-600 pl-7">
              Your sensitive candidate data—including PDF resume files, private Groq API keys, phone numbers, and local application histories—is stored locally in SQLite on your device. JobMaxxer does not sell, broker, or transmit your private credentials to unauthorized third parties.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Secure &amp; Privacy-First Desktop Architecture</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-white text-xs font-bold transition-colors"
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
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>I Agree</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
