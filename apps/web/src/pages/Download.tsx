import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowRight, ArrowLeft, Check, Download as DownloadIcon,
  Shield, Laptop, Terminal, Sparkles, CheckCircle2,
  Clock, AlertCircle, HardDrive, Cpu, RefreshCw
} from 'lucide-react';
import { animate, stagger } from 'animejs';

export default function Download() {
  const [downloadStarted, setDownloadStarted] = useState<boolean>(false);
  const [waitlistEmail, setWaitlistEmail] = useState<string>('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const windowsCardRef = useRef<HTMLDivElement>(null);
  const macCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Anime.js Entrance Animation
    try {
      animate('.animate-in', {
        translateY: [24, 0],
        opacity: [0, 1],
        delay: stagger(100, { start: 100 }),
        duration: 800,
        ease: 'outQuart',
      });
    } catch (e) {
      // Fallback
    }
  }, []);

  const handleDownloadClick = () => {
    setDownloadStarted(true);

    // Anime.js pulse feedback
    if (windowsCardRef.current) {
      try {
        animate(windowsCardRef.current, {
          scale: [1, 0.98, 1],
          duration: 300,
          ease: 'inOutQuad',
        });
      } catch (e) {
        // Fallback
      }
    }

    // Direct high-speed CDN release installer download
    const downloadUrl = 'https://github.com/snipy09/JobMaxxer/releases/download/v1.0.1/Nomadic.Setup.1.0.1.exe';
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'Nomadic-Setup-1.0.1.exe';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail || !waitlistEmail.includes('@')) return;
    setWaitlistSubmitted(true);
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-white text-ink-950 font-sans flex flex-col antialiased selection:bg-ink-950 selection:text-white">
      {/* Top Announcement */}
      <div className="border-b border-ink-100 bg-ink-50 px-4 py-2 text-center text-[11px] sm:text-xs text-ink-600 font-mono tracking-tight flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-ink-950 shrink-0" />
        <span>Official Download Portal · Nomadic v1.0.1 Windows x64 Native Installer</span>
      </div>

      {/* Main Navigation */}
      <header className="border-b border-ink-100 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="#/" className="flex items-center gap-2.5 group">
            <img
              src="./logo-icon.png"
              alt="Nomadic Logo Icon"
              className="h-7 w-7 rounded-md object-contain shadow-fine transition-transform group-hover:scale-105"
            />
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-ink-950">
              Nomadic
            </span>
          </a>

          <a
            href="#/"
            className="text-xs font-semibold text-ink-600 hover:text-ink-950 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-200 hover:bg-ink-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-12 sm:pt-16 pb-20 space-y-16">
        {/* Page Hero */}
        <div className="text-center max-w-2xl mx-auto space-y-4 animate-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-ink-50 border border-ink-200 rounded-full text-[11px] sm:text-xs font-mono text-ink-600 shadow-fine">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Version 1.0.0 Stable Release · Clean Installer</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink-950 leading-tight">
            Download Nomadic
          </h1>

          <p className="text-xs sm:text-sm text-ink-600 leading-relaxed max-w-xl mx-auto">
            Install the native desktop application to master interactive career roadmaps, stream direct ATS job feeds, and execute stealth 1-click batch applications on your machine.
          </p>

          {downloadStarted && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs flex items-center justify-center gap-2 max-w-md mx-auto animate-fade-up">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Your download has started! Check your browser's download tray.</span>
            </div>
          )}
        </div>

        {/* Operating Systems Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {/* Windows Active Card */}
          <div
            ref={windowsCardRef}
            className="animate-in bg-white border-2 border-ink-950 rounded-3xl p-6 sm:p-8 shadow-float flex flex-col justify-between space-y-6 relative overflow-hidden"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-ink-950 text-white flex items-center justify-center shadow-fine">
                  <Laptop className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-ink-950 text-white shadow-fine">
                  Available Now
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-ink-950">Windows Native</h3>
                <p className="text-xs text-ink-500 font-mono mt-0.5">Windows 10 / 11 (64-bit Architecture)</p>
              </div>

              <ul className="space-y-2.5 text-xs text-ink-700 border-t border-ink-100 pt-4">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-ink-950 shrink-0" />
                  <span>Standard installer (.exe) — no admin privileges required</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-ink-950 shrink-0" />
                  <span>Embedded SQLite &amp; Playwright Chromium engine</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-ink-950 shrink-0" />
                  <span>Single-laptop hardware lock &amp; cloud sync ready</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-ink-950 shrink-0" />
                  <span>Integrated background ATS scraping &amp; auto-updates</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 pt-4 border-t border-ink-100">
              <a
                href="https://github.com/snipy09/JobMaxxer/releases/download/v1.0.1/Nomadic.Setup.1.0.1.exe"
                onClick={() => setDownloadStarted(true)}
                className="w-full py-3.5 bg-ink-950 hover:bg-ink-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lifted active:scale-95 text-center"
              >
                <DownloadIcon className="w-4 h-4" />
                <span>Download for Windows (Setup.exe — 92.8 MB)</span>
              </a>

              <div className="flex items-center justify-between text-[10px] text-ink-400 font-mono px-1">
                <span>File: Nomadic.Setup.1.0.1.exe</span>
                <span>SHA-256 Verified · 92.8 MB</span>
              </div>
            </div>
          </div>

          {/* macOS Coming Soon Card */}
          <div
            ref={macCardRef}
            className="animate-in bg-ink-50 border border-ink-200 rounded-3xl p-6 sm:p-8 shadow-fine flex flex-col justify-between space-y-6 relative"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-white border border-ink-200 text-ink-600 flex items-center justify-center shadow-fine">
                  <Terminal className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white text-ink-500 border border-ink-200 shadow-fine flex items-center gap-1">
                  <Clock className="w-3 h-3 text-ink-400" />
                  Coming Soon
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-ink-950">macOS (Apple Silicon &amp; Intel)</h3>
                <p className="text-xs text-ink-500 font-mono mt-0.5">macOS 12+ (Ventura, Sonoma, Sequoia)</p>
              </div>

              <p className="text-xs text-ink-600 leading-relaxed border-t border-ink-200/60 pt-4">
                We are currently packaging the native macOS DMG build with notarized Apple Developer signing and Chromium sandbox support.
              </p>

              <ul className="space-y-2.5 text-xs text-ink-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-300" />
                  <span>Universal Binary (Apple Silicon M1/M2/M3/M4 &amp; Intel)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-300" />
                  <span>Native macOS dark mode &amp; Keychain security</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-ink-200/60">
              {waitlistSubmitted ? (
                <div className="bg-white border border-ink-200 rounded-xl p-3 text-center text-xs text-ink-900 font-semibold shadow-fine">
                  You're on the macOS waitlist! We will notify you at release.
                </div>
              ) : (
                <form onSubmit={handleWaitlistSubmit} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Enter email for Mac release..."
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      required
                      className="flex-1 bg-white border border-ink-200 rounded-xl px-3 py-2.5 text-xs text-ink-950 placeholder:text-ink-400 focus:outline-none focus:border-ink-950 shadow-fine"
                    />
                    <button
                      type="submit"
                      className="bg-white hover:bg-ink-100 border border-ink-300 text-ink-950 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-fine shrink-0"
                    >
                      Notify Me
                    </button>
                  </div>
                  <p className="text-[10px] text-ink-400 font-mono text-center">No spam. Only 1 email when Mac DMG launches.</p>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* 3-Step Setup Instructions */}
        <div className="animate-in bg-ink-50 border border-ink-200 rounded-3xl p-6 sm:p-10 shadow-fine space-y-8 max-w-4xl mx-auto">
          <div className="text-center max-w-md mx-auto space-y-1">
            <span className="text-xs font-mono uppercase tracking-widest text-ink-400 font-semibold">Quick Setup</span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-950">How to Install &amp; Launch</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <div className="bg-white border border-ink-200 p-5 rounded-2xl space-y-2.5 shadow-fine">
              <span className="text-xs font-mono font-bold text-ink-400">STEP 01</span>
              <h4 className="font-bold text-sm text-ink-950">Download Installer</h4>
              <p className="text-ink-600 leading-relaxed">
                Click the download button above to download the <code className="bg-ink-100 px-1 py-0.5 rounded text-[11px]">Nomadic-Setup-1.0.0.exe</code> file to your computer.
              </p>
            </div>

            <div className="bg-white border border-ink-200 p-5 rounded-2xl space-y-2.5 shadow-fine">
              <span className="text-xs font-mono font-bold text-ink-400">STEP 02</span>
              <h4 className="font-bold text-sm text-ink-950">Run Installation</h4>
              <p className="text-ink-600 leading-relaxed">
                Double-click the setup file to install. The app runs smoothly without prompting for administrator permissions.
              </p>
            </div>

            <div className="bg-white border border-ink-200 p-5 rounded-2xl space-y-2.5 shadow-fine">
              <span className="text-xs font-mono font-bold text-ink-400">STEP 03</span>
              <h4 className="font-bold text-sm text-ink-950">Launch &amp; Apply</h4>
              <p className="text-ink-600 leading-relaxed">
                Open Nomadic, upload your resume, select your career roadmaps, and start 1-click batch applications.
              </p>
            </div>
          </div>
        </div>

        {/* System Requirements Table */}
        <div className="animate-in max-w-4xl mx-auto space-y-4">
          <h3 className="text-sm font-mono uppercase tracking-wider text-ink-400 font-bold text-center">System Requirements</h3>
          <div className="bg-white border border-ink-200 rounded-2xl overflow-hidden shadow-fine text-xs font-mono">
            <div className="grid grid-cols-2 p-3.5 border-b border-ink-100 bg-ink-50 font-bold text-ink-950">
              <span>Component</span>
              <span>Requirement</span>
            </div>
            <div className="grid grid-cols-2 p-3.5 border-b border-ink-100 text-ink-600">
              <span className="text-ink-950 font-semibold">Operating System</span>
              <span>Windows 10 / 11 (64-bit)</span>
            </div>
            <div className="grid grid-cols-2 p-3.5 border-b border-ink-100 text-ink-600">
              <span className="text-ink-950 font-semibold">Processor / Architecture</span>
              <span>Intel / AMD x86-64 / ARM64</span>
            </div>
            <div className="grid grid-cols-2 p-3.5 border-b border-ink-100 text-ink-600">
              <span className="text-ink-950 font-semibold">Memory (RAM)</span>
              <span>4 GB minimum (8 GB recommended)</span>
            </div>
            <div className="grid grid-cols-2 p-3.5 border-b border-ink-100 text-ink-600">
              <span className="text-ink-950 font-semibold">Free Disk Space</span>
              <span>250 MB free disk space</span>
            </div>
            <div className="grid grid-cols-2 p-3.5 text-ink-600">
              <span className="text-ink-950 font-semibold">Embedded Engine</span>
              <span>SQLite (sql.js) + Chromium Browser Core included</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-100 py-10 sm:py-12 px-4 sm:px-6 bg-white text-xs text-ink-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <img
              src="./logo-icon.png"
              alt="Nomadic Logo Icon"
              className="h-6 w-6 rounded object-contain shadow-fine"
            />
            <div>
              <div className="text-sm font-extrabold tracking-tight text-ink-950">Nomadic</div>
              <p className="text-[11px] text-ink-400 mt-0.5 font-mono">Desktop Automation Software for All Job Seekers / 2026</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-5 sm:gap-6 font-semibold">
            <a href="#/terms" className="hover:text-ink-950 transition-colors">Terms of Service</a>
            <a href="#/privacy" className="hover:text-ink-950 transition-colors">Privacy Policy</a>
            <a href="mailto:support@nomadic.app" className="hover:text-ink-950 transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
