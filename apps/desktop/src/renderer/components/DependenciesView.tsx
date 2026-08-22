import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu, Database, Wifi, ShieldCheck, Terminal, RefreshCw,
  Loader2, CheckCircle2, AlertCircle, Copy, Trash2, Check,
  HardDrive, Lock
} from 'lucide-react';
import { DependencyStatus, HeartbeatStatus, getApi } from '../types';

interface DependenciesViewProps {
  logs: string[];
  onClearLogs: () => void;
  heartbeat: HeartbeatStatus | null;
  onLog: (msg: string) => void;
}

export const DependenciesView: React.FC<DependenciesViewProps> = ({
  logs,
  onClearLogs,
  heartbeat,
  onLog,
}) => {
  const [depStatus, setDepStatus] = useState<DependencyStatus>({
    sqliteReady: true,
    playwrightInstalled: true,
    internetOk: true,
    allReady: true,
  });
  const [checking, setChecking] = useState<boolean>(false);
  const [reinstalling, setReinstalling] = useState<boolean>(false);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const runDiagnostics = async () => {
    const api = getApi();
    if (!api) return;
    setChecking(true);
    try {
      const res = await api.checkDependencies();
      setDepStatus(res);
      onLog(`[Diagnostics] System check complete: SQLite=${res.sqliteReady}, Playwright=${res.playwrightInstalled}, Network=${res.internetOk}`);
    } catch (err: any) {
      onLog(`[Diagnostics] Check error: ${err?.message || String(err)}`);
    } finally {
      setChecking(false);
    }
  };

  const runReinstall = async () => {
    const api = getApi();
    if (!api) return;
    setReinstalling(true);
    onLog('[Installer] Initiating Playwright Chromium repair & download sequence...');
    try {
      const res = await api.installDependencies();
      if (res.success) {
        onLog('[Installer] Playwright Chromium reinstalled successfully.');
        await runDiagnostics();
      } else {
        onLog(`[Installer] Reinstall failed: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      onLog(`[Installer] Fatal error: ${err?.message || String(err)}`);
    } finally {
      setReinstalling(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Diagnostics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* SQLite Status */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-slate-500" /> SQLite Database
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${depStatus.sqliteReady ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          </div>
          <div className="text-sm font-bold font-mono text-slate-900">
            {depStatus.sqliteReady ? 'Operational' : 'Error / Missing'}
          </div>
          <p className="text-[11px] text-slate-500">
            Local embedded sql.js database
          </p>
        </div>

        {/* Playwright Chromium */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-slate-500" /> Playwright Browser
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${depStatus.playwrightInstalled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </div>
          <div className="text-sm font-bold font-mono text-slate-900">
            {depStatus.playwrightInstalled ? 'Chromium Ready' : 'Download Needed'}
          </div>
          <p className="text-[11px] text-slate-500">
            Headless &amp; Headed form automation
          </p>
        </div>

        {/* Public IP & Internet */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-slate-500" /> Network Connectivity
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${depStatus.internetOk ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          </div>
          <div className="text-sm font-bold font-mono text-slate-900 truncate">
            {heartbeat?.ip ? heartbeat.ip : depStatus.internetOk ? 'Connected' : 'Offline'}
          </div>
          <p className="text-[11px] text-slate-500">
            Outbound HTTPS connectivity
          </p>
        </div>

        {/* Session Security Guard */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-500" /> Single-IP Guard
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${
              heartbeat === null ? 'bg-slate-400' : heartbeat.valid ? 'bg-emerald-500' : 'bg-rose-500'
            }`} />
          </div>
          <div className="text-sm font-bold font-mono text-slate-900">
            {heartbeat === null ? 'Standalone' : heartbeat.valid ? 'Active (Guarded)' : 'Inactive'}
          </div>
          <p className="text-[11px] text-slate-500">
            Protects session concurrency
          </p>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            System Diagnostics &amp; Repair Suite
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify local binary integrity or re-download Playwright Chromium browser dependencies.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={runDiagnostics}
            disabled={checking || reinstalling}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {checking ? 'Checking...' : 'Run Diagnostics'}
          </button>

          <button
            type="button"
            onClick={runReinstall}
            disabled={reinstalling || checking}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
          >
            {reinstalling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
            {reinstalling ? 'Installing...' : 'Re-Download Playwright'}
          </button>
        </div>
      </div>

      {/* Real-time Terminal Log Console */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Live IPC System Output Stream
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              {logs.length} lines
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLogs}
              className="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1 transition-colors"
            >
              {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLogs ? 'Copied' : 'Copy Logs'}</span>
            </button>

            <button
              type="button"
              onClick={onClearLogs}
              className="text-xs text-slate-600 hover:text-rose-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Terminal Log Screen */}
        <div className="bg-slate-900 text-slate-200 font-mono text-xs p-4 rounded-xl h-72 overflow-y-auto leading-relaxed shadow-inner">
          {logs.length === 0 ? (
            <span className="text-slate-500">No logs captured yet. Triggering actions will stream events here...</span>
          ) : (
            logs.map((line, idx) => (
              <div key={idx} className="whitespace-pre-wrap hover:bg-slate-800/80 px-1 rounded transition-colors">
                {line}
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};
