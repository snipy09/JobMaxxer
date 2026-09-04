import React, { useState, useEffect } from 'react';
import {
  Sparkles, Download, CheckCircle2, AlertCircle,
  Loader2, ExternalLink, X, Shield, ArrowRight
} from 'lucide-react';
import { AppUpdateInfo, getApi } from '../types';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: AppUpdateInfo;
  onLog?: (msg: string) => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  onLog
}) => {
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const api = getApi();
    if (api && api.onUpdateDownloadProgress) {
      const unsub = api.onUpdateDownloadProgress((pct: number) => {
        setDownloadProgress(pct);
      });
      return () => unsub();
    }
  }, []);

  if (!isOpen) return null;

  const handleStartUpdate = async () => {
    const api = getApi();
    if (!api || !api.downloadUpdate) {
      // Browser fallback: open release url
      window.open(updateInfo.downloadUrl || 'https://github.com/snipy09/JobMaxxer/releases/latest', '_blank');
      return;
    }

    setIsDownloading(true);
    setErrorMessage(null);
    setDownloadProgress(10);
    onLog?.(`[Updater] Downloading update v${updateInfo.latestVersion}...`);

    try {
      const res = await api.downloadUpdate(updateInfo.downloadUrl);
      if (res && res.success) {
        if (res.openedBrowser) {
          setIsDownloading(false);
          onClose();
          return;
        }

        if (res.filePath) {
          setDownloadedFilePath(res.filePath);
          setIsDownloading(false);
          setDownloadProgress(100);
          onLog?.(`[Updater] Update downloaded to ${res.filePath}. Launching installer...`);

          if (api.installUpdate) {
            await api.installUpdate(res.filePath);
          }
        }
      } else {
        throw new Error(res?.error || 'Failed to download update binary.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error downloading update.');
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in fade-in duration-200 font-sans">
        
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-powder-50 text-powder-800 dark:bg-powder-950/60 dark:text-powder-300 border border-powder-300 dark:border-powder-800 text-[11px] font-mono font-bold mb-1">
              <Sparkles className="w-3 h-3 text-powder-600" />
              <span>Update Available</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Nomadic v{updateInfo.latestVersion}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
              Current: v{updateInfo.currentVersion} → Latest: v{updateInfo.latestVersion}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Release Notes */}
        <div className="space-y-3 text-xs">
          <div className="space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-zinc-100 uppercase font-mono text-[10px] text-slate-400">
              Release Notes &amp; Highlights:
            </span>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 leading-relaxed font-sans max-h-36 overflow-y-auto whitespace-pre-wrap">
              {updateInfo.releaseNotes || 'Includes latest performance upgrades, database optimizations, and career intelligence toolsets.'}
            </div>
          </div>

          {/* Zero Data Loss Guarantee Pill */}
          <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-start gap-2.5 text-emerald-900 dark:text-emerald-300">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Zero Data Loss:</strong> Your candidate profile, saved roadmaps, and local application histories are safely stored and will be 100% preserved.
            </div>
          </div>

          {/* Progress Bar during download */}
          {isDownloading && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-700 dark:text-zinc-300">
                <span>Downloading update...</span>
                <span>{downloadProgress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-powder-500 transition-all duration-300 rounded-full"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
          >
            Remind Me Later
          </button>

          <button
            type="button"
            disabled={isDownloading}
            onClick={handleStartUpdate}
            className="px-5 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold hover:opacity-90 transition flex items-center gap-2 shadow-xs disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Downloading Update...</span>
              </>
            ) : downloadedFilePath ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Install &amp; Restart</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download &amp; Update Now</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
