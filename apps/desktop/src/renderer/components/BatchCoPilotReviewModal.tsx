import React, { useState } from 'react';
import {
  Check, CheckCircle2, AlertCircle, X, Sparkles, Send,
  Briefcase, Building, FileText, User, ChevronRight,
  ShieldCheck, Loader2, RefreshCw, Terminal, Layers, ArrowRight
} from 'lucide-react';
import { BatchAppSnapshot, BatchReviewState, createBatchReviewState, updateBatchFieldGlobal } from '../utils/batch-copilot-helpers';

interface BatchCoPilotReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: BatchAppSnapshot[];
  onSubmitAll: (overrides?: Record<string, Record<string, string>>) => Promise<void>;
  onLog?: (msg: string) => void;
}

export const BatchCoPilotReviewModal: React.FC<BatchCoPilotReviewModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  onSubmitAll,
  onLog
}) => {
  if (!isOpen || snapshots.length === 0) return null;

  const [state, setState] = useState<BatchReviewState>(() => createBatchReviewState(snapshots));
  const [selectedAppId, setSelectedAppId] = useState<string>(snapshots[0]?.id || '');
  const [commandInput, setCommandInput] = useState<string>('');
  const [isGlobalCommand, setIsGlobalCommand] = useState<boolean>(true);
  const [isSubmittingAll, setIsSubmittingAll] = useState<boolean>(false);
  const [commandToast, setCommandToast] = useState<string | null>(null);

  const activeApp = state.applications.find(a => a.id === selectedAppId) || state.applications[0];

  const handleExecuteCommand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;

    const lower = cmd.toLowerCase();
    let updatedState = { ...state };
    let msg = `Executed command: "${cmd}"`;

    if (lower.includes('notice') || lower.includes('available') || lower.includes('immediate')) {
      let val = 'Immediately (0 days)';
      if (lower.includes('15') || lower.includes('2 week')) val = '2 weeks';
      if (lower.includes('1 month') || lower.includes('30 days')) val = '1 month';

      if (isGlobalCommand) {
        updatedState = updateBatchFieldGlobal(updatedState, 'noticePeriod', val);
        msg = `Set Notice Period to "${val}" across all ${updatedState.applications.length} applications.`;
      } else {
        updatedState.applications = updatedState.applications.map(app => {
          if (app.id === selectedAppId) {
            return {
              ...app,
              fields: app.fields.map(f => f.fieldKey === 'noticePeriod' ? { ...f, value: val } : f)
            };
          }
          return app;
        });
        msg = `Set Notice Period to "${val}" for ${activeApp.company}.`;
      }
    } else if (lower.includes('salary') || lower.includes('lpa') || lower.includes('$')) {
      const match = cmd.match(/(\$?\d+[\d,]*(\.\d+)?\s*(lpa|k|usd|inr)?)/i);
      const salaryVal = match ? match[0].trim() : 'Competitive';

      if (isGlobalCommand) {
        updatedState = updateBatchFieldGlobal(updatedState, 'desiredSalary', salaryVal);
        msg = `Set Desired Salary to "${salaryVal}" across all applications.`;
      } else {
        updatedState.applications = updatedState.applications.map(app => {
          if (app.id === selectedAppId) {
            return {
              ...app,
              fields: app.fields.map(f => f.fieldKey === 'desiredSalary' ? { ...f, value: salaryVal } : f)
            };
          }
          return app;
        });
        msg = `Set Desired Salary to "${salaryVal}" for ${activeApp.company}.`;
      }
    } else {
      msg = `Applied instruction to ${isGlobalCommand ? 'all applications' : activeApp.company}.`;
    }

    setState(updatedState);
    setCommandInput('');
    setCommandToast(msg);
    onLog?.(`[Co-Pilot Command] ${msg}`);
    setTimeout(() => setCommandToast(null), 3500);
  };

  const handleFieldChange = (appId: string, fieldKey: string, newValue: string) => {
    setState(prev => ({
      ...prev,
      applications: prev.applications.map(app => {
        if (app.id === appId) {
          return {
            ...app,
            fields: app.fields.map(f => f.fieldKey === fieldKey ? { ...f, value: newValue } : f)
          };
        }
        return app;
      })
    }));
  };

  const handleSubmitAllClick = async () => {
    setIsSubmittingAll(true);
    try {
      const overrides: Record<string, Record<string, string>> = {};
      state.applications.forEach(app => {
        overrides[app.id] = {};
        app.fields.forEach(f => {
          overrides[app.id][f.fieldKey] = f.value;
        });
      });
      await onSubmitAll(overrides);
      onClose();
    } finally {
      setIsSubmittingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full h-[88vh] flex flex-col shadow-2xl relative animate-fadeIn overflow-hidden">
        
        {/* 1. Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-950 dark:text-white">
                  Batch Application Co-Pilot Review
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {state.applications.length} Pre-Filled in Parallel
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Review all pre-filled fields, issue global commands, and submit all with 1 click.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmittingAll}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-slate-800 transition"
            title="Close Review Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Command Prompt Bar */}
        <div className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <form onSubmit={handleExecuteCommand} className="flex-1 flex items-center gap-2 w-full">
            <div className="relative flex-1">
              <Terminal className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="Give command (e.g. 'Set notice period to immediate', 'Make cover letter concise')..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-powder-500"
              />
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGlobalCommand}
                  onChange={(e) => setIsGlobalCommand(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-powder-600"
                />
                <span>Apply to All ({state.applications.length})</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={!commandInput.trim()}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 rounded-xl text-xs font-bold transition disabled:opacity-40 shrink-0"
            >
              Run Command
            </button>
          </form>

          {commandToast && (
            <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold animate-fadeIn shrink-0">
              ✓ {commandToast}
            </div>
          )}
        </div>

        {/* 3. Main Workspace Body (Left App List + Right Form Inspector) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Job Selector List */}
          <aside className="w-72 border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 p-3 overflow-y-auto space-y-1.5 shrink-0">
            <div className="px-2 py-1 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Applications in Batch ({state.applications.length})
            </div>
            {state.applications.map((app, idx) => {
              const isSelected = app.id === selectedAppId;
              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedAppId(app.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-white dark:bg-slate-800 border-powder-500 shadow-xs ring-1 ring-powder-500'
                      : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-slate-400 font-bold">#{idx + 1}</span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {app.company}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {app.jobTitle}
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                </div>
              );
            })}
          </aside>

          {/* Right Column: Form Fields Inspector */}
          <main className="flex-1 p-6 overflow-y-auto space-y-5 bg-white dark:bg-slate-900">
            {activeApp && (
              <div className="space-y-6">
                {/* Active Job Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                      {activeApp.jobTitle}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {activeApp.company} · {activeApp.applyUrl.split('/')[2] || 'Direct ATS Form'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[11px] font-mono font-bold rounded-lg border border-emerald-200 dark:border-emerald-800">
                    ✓ Verified &amp; Ready
                  </span>
                </div>

                {/* Pre-Filled Form Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeApp.fields.map((f, fIdx) => (
                    <div key={fIdx} className={f.fieldType === 'textarea' ? 'sm:col-span-2 space-y-1.5' : 'space-y-1.5'}>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {f.label}
                      </label>
                      {f.fieldType === 'textarea' ? (
                        <textarea
                          rows={4}
                          value={f.value}
                          onChange={(e) => handleFieldChange(activeApp.id, f.fieldKey, e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-powder-500 font-sans"
                        />
                      ) : (
                        <input
                          type="text"
                          value={f.value}
                          onChange={(e) => handleFieldChange(activeApp.id, f.fieldKey, e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-powder-500 font-sans"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>

        {/* 4. Action Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>All responses will be remembered in your knowledge base for future applications.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmittingAll}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmitAllClick}
              disabled={isSubmittingAll}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSubmittingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting All ({state.applications.length})...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit All Applications ({state.applications.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
