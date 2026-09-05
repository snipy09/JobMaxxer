import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, RefreshCw, Briefcase, Zap,
  CheckCircle2, X, Building, MapPin, DollarSign,
  CheckSquare, Square, Bookmark, Globe, Clock,
  Sparkles, ExternalLink, ChevronDown, ChevronUp,
  AlertCircle, Filter, ArrowRight, Check, Loader2, Copy,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { Job, MasterProfile, getApi } from '../types';
import { computeJobRelevance } from '../data/relevanceMatcher';
import { CompleteProfileModal } from './CompleteProfileModal';

interface FeedViewProps {
  profile: MasterProfile;
  onUpdateProfile?: (p: MasterProfile) => void;
  onLog: (msg: string) => void;
  onNavigateToOutreach?: (company: string, jobTitle: string) => void;
  currentUser?: any;
  onOpenUpgrade?: (feature?: string) => void;
}

const DEMO_TEST_JOB: Job = {
  title: 'Senior Product / Software Specialist (1-Click Test Job)',
  company: 'Nomadic Labs',
  location: 'Remote · Global',
  source: 'Verified Demo ATS',
  applyUrl: 'https://httpbin.org/post',
  score: 98,
  employmentType: 'job',
  workplaceType: 'remote',
  experienceLevel: 'mid',
  salary: '₹22 LPA · $140k',
  description: 'A verified live test opportunity to immediately test 1-click autonomous auto-apply, stealth form pre-filling, and resume attachment.',
  createdAt: new Date().toISOString(),
};

// Canonical Job Deduplication Helper
function deduplicateJobList(jobList: Job[]): Job[] {
  const seenKeys = new Set<string>();
  const unique: Job[] = [];

  for (const j of jobList) {
    if (!j) continue;
    const cleanUrl = (j.applyUrl || '').split('?')[0].toLowerCase().trim();
    const cleanCompany = (j.company || '').toLowerCase().trim();
    const cleanTitle = (j.title || '').toLowerCase().trim();
    const key = j.jobHash || `${cleanCompany}|${cleanTitle}|${cleanUrl}`;

    if (!seenKeys.has(key) && (!cleanUrl || !seenKeys.has(cleanUrl))) {
      seenKeys.add(key);
      if (cleanUrl && cleanUrl.length > 5) seenKeys.add(cleanUrl);
      unique.push(j);
    }
  }
  return unique;
}

export const FeedView: React.FC<FeedViewProps> = ({
  profile,
  onUpdateProfile,
  onLog,
  onNavigateToOutreach,
  currentUser,
  onOpenUpgrade,
}) => {
  // 1. Synchronously initialize jobs from LocalStorage so page transitions NEVER wipe the feed
  const [jobs, setJobs] = useState<Job[]>(() => {
    try {
      const cached = localStorage.getItem('nomadic_saved_jobs_feed');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [DEMO_TEST_JOB];
  });

  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Clean Filter Tabs: all, jobs, internships, internshala, latest, high_match, remote, saved
  const [filterTab, setFilterTab] = useState<'all' | 'jobs' | 'internships' | 'internshala' | 'latest' | 'high_match' | 'remote' | 'saved'>('all');

  // Action execution modal state
  const [executingAutoApply, setExecutingAutoApply] = useState<boolean>(false);
  const [autoApplyLogs, setAutoApplyLogs] = useState<string[]>([]);
  const [autoApplyProgress, setAutoApplyProgress] = useState<number>(0);
  const [activeJobTarget, setActiveJobTarget] = useState<{ company: string; title: string } | null>(null);
  const [viewingJob, setViewingJob] = useState<Job | null>(null);

  // Profile completion gatekeeper modal state
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [pendingApplyAction, setPendingApplyAction] = useState<{ urls: string[] } | null>(null);

  // Copy feedback
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isFetchingJobs, setIsFetchingJobs] = useState<boolean>(false);
  const [feedNotification, setFeedNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Helper to persist jobs in localStorage
  const saveJobsToLocalStorage = (jobList: Job[]) => {
    try {
      localStorage.setItem('nomadic_saved_jobs_feed', JSON.stringify(jobList));
    } catch {}
  };

  // 2. Fetch Latest Jobs (Manual Refresh & Cloud Sync)
  const handleFetchLatestJobs = async () => {
    const api = getApi();
    if (!api) return;
    setIsFetchingJobs(true);
    setFeedNotification(null);
    onLog('[Job Board] Refreshing live opportunities from cloud and ATS endpoints...');

    try {
      if (api.runScrapers) {
        try {
          await api.runScrapers();
        } catch {}
      }
      const res = await api.getCloudFeed('candidate');
      if (res && res.success && res.jobs && res.jobs.length > 0) {
        const combined = deduplicateJobList([DEMO_TEST_JOB, ...res.jobs.filter((j: Job) => j.applyUrl !== DEMO_TEST_JOB.applyUrl)]);
        setJobs(combined);
        saveJobsToLocalStorage(combined);
        setFeedNotification({
          type: 'success',
          message: `Refreshed ${combined.length} verified opportunities from live feeds.`
        });
        onLog(`[Job Board] Feed updated with ${combined.length} unique positions.`);
      } else {
        await fetchCloudJobs();
        setFeedNotification({
          type: 'success',
          message: 'Job board refreshed with current verified opportunities.'
        });
      }
    } catch {
      await fetchCloudJobs();
      setFeedNotification({
        type: 'info',
        message: 'Refreshed local job cache.'
      });
    } finally {
      setIsFetchingJobs(false);
      setTimeout(() => setFeedNotification(null), 4000);
    }
  };

  const fetchCloudJobs = async () => {
    const api = getApi();
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.getCloudFeed('candidate');
      if (res.success && res.jobs && res.jobs.length > 0) {
        const combined = deduplicateJobList([DEMO_TEST_JOB, ...res.jobs.filter((j: Job) => j.applyUrl !== DEMO_TEST_JOB.applyUrl)]);
        setJobs(combined);
        saveJobsToLocalStorage(combined);
        onLog(`[Feed] Stream synced ${combined.length} unique opportunities.`);
      }
      const saved = await api.getSavedJobs();
      setSavedJobs(saved || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  // 3. Refresh and save from cloud every time app is started in a new session
  useEffect(() => {
    const sessionKey = 'nomadic_jobs_session_synced';
    const hasSyncedThisSession = sessionStorage.getItem(sessionKey) === 'true';
    
    // If not yet synced this session, trigger cloud sync in background
    if (!hasSyncedThisSession) {
      fetchCloudJobs().then(() => {
        sessionStorage.setItem(sessionKey, 'true');
      });
    } else {
      // Just load saved jobs from SQLite
      const api = getApi();
      if (api && api.getSavedJobs) {
        api.getSavedJobs().then(saved => setSavedJobs(saved || [])).catch(() => {});
      }
    }
  }, []);

  const activeJobPool = filterTab === 'saved' ? savedJobs : jobs;

  // Dynamic Personalized Relevance Scoring against Candidate Profile
  const scoredJobPool = useMemo(() => {
    return activeJobPool.map(job => {
      const rel = computeJobRelevance(job, profile);
      return {
        ...job,
        score: rel.score,
        matchedSkills: rel.matchedSkills,
        isStrongMatch: rel.isStrongMatch,
      };
    });
  }, [activeJobPool, profile.desiredTitle, profile.techStack]);

  // Filter & Sort Pipeline based on active Filter Tab
  const filteredJobs = useMemo(() => {
    let pool = scoredJobPool;

    return pool.filter(job => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        (job.title || '').toLowerCase().includes(q) ||
        (job.company || '').toLowerCase().includes(q) ||
        (job.location || '').toLowerCase().includes(q) ||
        (job.source || '').toLowerCase().includes(q) ||
        (job.matchedSkills || []).some(s => s.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Tab Filtering
      if (filterTab === 'jobs') {
        const titleLower = (job.title || '').toLowerCase();
        const empType = (job.employmentType || '').toLowerCase();
        return empType === 'job' || empType === 'full-time' || (!titleLower.includes('intern') && !titleLower.includes('internship'));
      }
      if (filterTab === 'internships') {
        const titleLower = (job.title || '').toLowerCase();
        const empType = (job.employmentType || '').toLowerCase();
        const srcLower = (job.source || '').toLowerCase();
        return empType === 'internship' || titleLower.includes('intern') || titleLower.includes('internship') || srcLower.includes('internshala');
      }
      if (filterTab === 'internshala') {
        return (job.source || '').toLowerCase().includes('internshala');
      }
      if (filterTab === 'high_match') {
        return (job.score ?? 0) >= 80;
      }
      if (filterTab === 'remote') {
        return job.workplaceType === 'remote' || (job.location || '').toLowerCase().includes('remote');
      }
      return true;
    }).sort((a, b) => {
      // Default: Latest to Oldest
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.score ?? 0) - (a.score ?? 0);
    });
  }, [scoredJobPool, filterTab, searchQuery]);

  const isFreeUser = !currentUser?.tier || currentUser?.tier === 'free';
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(18);

  // Reset page to 1 when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery, pageSize]);

  const totalFilteredCount = filteredJobs.length;
  const totalPages = isFreeUser && filterTab !== 'saved' ? 1 : Math.max(1, Math.ceil(totalFilteredCount / pageSize));

  const displayedJobs = useMemo(() => {
    if (isFreeUser && filterTab !== 'saved') {
      return filteredJobs.slice(0, 10);
    }
    const start = (currentPage - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, isFreeUser, filterTab, currentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, newPage));
    setCurrentPage(clamped);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const paginationRange = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const delta = 1;
    const range: (number | string)[] = [];
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    range.push(1);
    if (left > 2) range.push('...');
    for (let i = left; i <= right; i++) {
      range.push(i);
    }
    if (right < totalPages - 1) range.push('...');
    range.push(totalPages);
    return range;
  }, [currentPage, totalPages]);

  const toggleSelect = (url: string) => {
    const next = new Set(selectedUrls);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    setSelectedUrls(next);
  };

  const toggleSelectAll = () => {
    if (selectedUrls.size === filteredJobs.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(filteredJobs.map(j => j.applyUrl)));
    }
  };

  const handleToggleSaveJob = async (job: Job) => {
    const api = getApi();
    if (!api) return;
    const isSaved = savedJobs.some(sj => sj.applyUrl === job.applyUrl);
    if (isSaved) {
      await api.removeSavedJob(job.applyUrl);
      setSavedJobs(prev => prev.filter(sj => sj.applyUrl !== job.applyUrl));
      onLog(`[Saved] Removed ${job.title} at ${job.company}`);
    } else {
      await api.saveJob(job);
      setSavedJobs(prev => [...prev, job]);
      onLog(`[Saved] Saved ${job.title} at ${job.company}`);
    }
  };

  const handleCopyLink = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Pre-Apply Gatekeeper Check
  const checkProfileAndRun = async (urls: string[], singleTarget?: { company: string; title: string }) => {
    setActiveJobTarget(singleTarget || null);
    const isFreeOrLearner = !currentUser?.tier || currentUser?.tier === 'free' || currentUser?.tier === 'learner_pro';
    if (isFreeOrLearner) {
      onOpenUpgrade?.('100% Autonomous Auto-Apply Engine (Seeker Pro / Max)');
      return;
    }

    const api = getApi();
    const hasFirstName = Boolean(profile.firstName && profile.firstName.trim().length > 0);
    const hasPhone = Boolean(profile.phone && profile.phone.trim().length > 0);
    
    let hasResume = Boolean(profile.resumeFilePath && profile.resumeFilePath.trim().length > 0);
    if (!hasResume && api && api.getResumes) {
      try {
        const resumes = await api.getResumes();
        if (resumes && resumes.length > 0) {
          hasResume = true;
        }
      } catch {}
    }

    if (!hasFirstName || !hasPhone || !hasResume) {
      setPendingApplyAction({ urls });
      setShowProfileModal(true);
      return;
    }

    handleTriggerAutonomousApply(urls, singleTarget);
  };

  const handleProfileModalCompleted = () => {
    if (pendingApplyAction) {
      const { urls } = pendingApplyAction;
      setPendingApplyAction(null);
      handleTriggerAutonomousApply(urls, activeJobTarget || undefined);
    }
  };

  const [isCancelingApply, setIsCancelingApply] = useState<boolean>(false);

  const handleCancelAutoApply = async () => {
    const api = getApi();
    setIsCancelingApply(true);
    setAutoApplyLogs(prev => [...prev, '[Action] Canceling auto-apply execution...']);
    if (api && api.cancelAutonomousApply) {
      try {
        await api.cancelAutonomousApply();
      } catch {}
    }
    setTimeout(() => {
      setExecutingAutoApply(false);
      setIsCancelingApply(false);
      setActiveJobTarget(null);
    }, 600);
  };

  // 100% Autonomous Background Auto-Apply Engine
  const handleTriggerAutonomousApply = async (targetUrls: string[], singleTarget?: { company: string; title: string }) => {
    if (!targetUrls || targetUrls.length === 0) return;
    setIsCancelingApply(false);
    setExecutingAutoApply(true);
    const targetLabel = singleTarget ? `${singleTarget.title} at ${singleTarget.company}` : `${targetUrls.length} positions`;
    setAutoApplyLogs([
      `[Init] Target: ${targetLabel}...`,
      `[Info] Processing with automatic form fill and resume submission...`
    ]);
    setAutoApplyProgress(5);

    const api = getApi();
    if (!api || !api.launchAutonomous) {
      setAutoApplyLogs(prev => [...prev, '[Error] Local desktop engine not detected.']);
      setTimeout(() => setExecutingAutoApply(false), 3000);
      return;
    }

    const unsub = api.onAutoApplyProgress ? api.onAutoApplyProgress((data: any) => {
      if (data.log) {
        setAutoApplyLogs(prev => [...prev.slice(-100), data.log]);
      }
      if (typeof data.progress === 'number') {
        setAutoApplyProgress(Math.min(100, Math.max(5, data.progress)));
      }
    }) : () => {};

    try {
      const res = await api.launchAutonomous(targetUrls);
      setAutoApplyProgress(100);
      if (res && res.success) {
        setAutoApplyLogs(prev => [
          ...prev,
          `[Complete] ✓ Finished: ${res.applied || 0} applied successfully, ${res.skipped || 0} skipped.`
        ]);
        onLog(`[Autonomous] Completed ${targetUrls.length} applications (${res.applied || 0} submitted).`);
      } else {
        setAutoApplyLogs(prev => [...prev, `[Notice] ${res.error || 'Autonomous apply finished.'}`]);
      }
    } catch (err: any) {
      setAutoApplyLogs(prev => [...prev, `[Error] ${err?.message || String(err)}`]);
    } finally {
      unsub();
      setTimeout(() => {
        setExecutingAutoApply(false);
      }, 3000);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none max-w-6xl mx-auto pb-28 relative">
      
      {/* ── TOP HEADER & ACTION CONTROLS ───────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        
        {/* Title Bar with Refresh and Autonomous Apply Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800/80 pb-4">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              Job Board
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleFetchLatestJobs}
              disabled={loading || isFetchingJobs || executingAutoApply}
              className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
              title="Refresh job board with latest postings"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingJobs || loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => checkProfileAndRun(selectedUrls.size > 0 ? Array.from(selectedUrls) : filteredJobs.slice(0, 50).map(j => j.applyUrl))}
              disabled={executingAutoApply}
              className="w-full sm:w-auto px-4 py-2 bg-black hover:opacity-90 text-white dark:bg-white dark:text-black rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400 fill-current" />
              <span>Autonomous Apply</span>
            </button>
          </div>
        </div>

        {/* Confirmation Banner */}
        {feedNotification && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{feedNotification.message}</span>
            </div>
            <button onClick={() => setFeedNotification(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs px-1">✕</button>
          </div>
        )}

        {/* Search Bar & Clean Filter Tabs: All, Internshala, Latest, High Match, Remote, Saved */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, company, skills, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-slate-400 transition-colors"
            />
          </div>

          {/* Clean Segmented Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'jobs', label: 'Full-Time Jobs' },
              { id: 'internships', label: 'Internships' },
              { id: 'internshala', label: 'Internshala' },
              { id: 'latest', label: 'Latest' },
              { id: 'high_match', label: 'High Match' },
              { id: 'remote', label: 'Remote' },
              { id: 'saved', label: `Saved (${savedJobs.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  filterTab === tab.id
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 border border-slate-200/60 dark:border-zinc-700/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Bar (Select All / Batch Count) */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-mono font-bold">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-zinc-100"
          >
            {selectedUrls.size === filteredJobs.length && filteredJobs.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-slate-900 dark:text-zinc-100" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span>Select All ({filteredJobs.length} Positions)</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          Showing {filteredJobs.length} opportunities
        </div>
      </div>

      {/* ── JOB CARDS GRID ──────────────────────────────────────────────────── */}
      {displayedJobs.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
            {displayedJobs.map((job) => {
              const isSelected = selectedUrls.has(job.applyUrl);
              const isSaved = savedJobs.some(sj => sj.applyUrl === job.applyUrl);
              const score = job.score ?? 85;

              return (
                <div
                  key={job.applyUrl}
                  className={`p-5 rounded-2xl border transition-all duration-300 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-md ${
                    isSelected
                      ? 'border-slate-900 dark:border-zinc-100 ring-1 ring-slate-900 dark:ring-zinc-100'
                      : 'border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {/* Card Header: Monogram Avatar + Company + Source + Match Badge */}
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 flex items-center justify-center font-bold text-xs shrink-0">
                          {job.company ? job.company.slice(0, 2).toUpperCase() : 'CO'}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate max-w-[120px]">
                            {job.company}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400">
                            {job.source}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          score >= 90
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}>
                          {score}% Match
                        </span>
                        <button
                          onClick={() => toggleSelect(job.applyUrl)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-slate-900 dark:text-zinc-100" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Title & Metadata */}
                    <div className="space-y-1">
                      <h3
                        onClick={() => setViewingJob(job)}
                        className="text-sm font-bold text-slate-900 dark:text-zinc-100 hover:underline cursor-pointer line-clamp-1 leading-snug"
                      >
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{job.location || 'Remote'}</span>
                        </span>
                        {job.salary && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-slate-700 dark:text-zinc-300">{job.salary}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Matched Skill Tags */}
                    {job.matchedSkills && job.matchedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {job.matchedSkills.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 font-semibold"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Description snippet */}
                    <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                      {job.description || 'Full position details available via direct ATS endpoint.'}
                    </p>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleSaveJob(job)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isSaved
                            ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent'
                            : 'border-slate-200 dark:border-zinc-700 text-slate-400 hover:text-slate-700'
                        }`}
                        title={isSaved ? 'Remove from Saved' : 'Save Job'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-amber-400' : ''}`} />
                      </button>

                      <button
                        onClick={(e) => handleCopyLink(job.applyUrl, e)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-400 hover:text-slate-700 transition-colors"
                        title="Copy Job Link"
                      >
                        {copiedUrl === job.applyUrl ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => onNavigateToOutreach?.(job.company, job.title)}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-zinc-200 rounded-lg text-[11px] font-semibold transition-colors"
                      >
                        Find HR
                      </button>
                    </div>

                    <button
                      onClick={() => checkProfileAndRun([job.applyUrl], { company: job.company, title: job.title })}
                      className="px-3.5 py-1.5 bg-black hover:opacity-90 text-white dark:bg-white dark:text-black rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                      title={`Auto-apply specifically for ${job.title} at ${job.company}`}
                    >
                      <Zap className="w-3 h-3 text-emerald-400 fill-current" />
                      <span>Apply</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls (For Unlocked Tiers) */}
          {!isFreeUser && totalPages > 1 && (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 font-mono">
                <span>
                  Showing {Math.min(totalFilteredCount, (currentPage - 1) * pageSize + 1)}–{Math.min(totalFilteredCount, currentPage * pageSize)} of {totalFilteredCount} positions
                </span>
                <span className="hidden sm:inline">·</span>
                <div className="hidden sm:flex items-center gap-1.5">
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-zinc-200 outline-none"
                  >
                    <option value={18}>18</option>
                    <option value={36}>36</option>
                    <option value={54}>54</option>
                  </select>
                </div>
              </div>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-30 transition"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-30 transition"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {paginationRange.map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`dots-${idx}`} className="px-2 py-1 text-xs text-slate-400 font-mono">
                        ...
                      </span>
                    );
                  }
                  const pageNum = Number(p);
                  const isCurrent = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => handlePageChange(pageNum)}
                      className={`min-w-8 h-8 px-2 rounded-xl text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                          : 'border border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-30 transition"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-30 transition"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Free User Locked Jobs Banner */}
          {isFreeUser && filteredJobs.length > 10 && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white dark:from-zinc-900 dark:to-zinc-950 border border-slate-800 dark:border-zinc-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  <span>+{filteredJobs.length - 10} More Verified Positions</span>
                </div>
                <h3 className="text-sm font-bold text-white">Unlock Complete 1,000+ Real-Time ATS Feed</h3>
                <p className="text-xs text-slate-400">Upgrade to Learner Pro or Seeker Pro to access all opportunities, filter tabs, and direct pipelines.</p>
              </div>

              <button
                type="button"
                onClick={() => onOpenUpgrade?.('Full 1,000+ Job Feed Access')}
                className="px-5 py-2.5 rounded-xl bg-white text-slate-950 hover:bg-slate-100 text-xs font-bold transition shadow-md whitespace-nowrap active:scale-95"
              >
                Unlock Complete Feed
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-3 shadow-xs max-w-md mx-auto animate-fade-up">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 mx-auto flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">No matching positions</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Click Refresh to sync live opportunities from Greenhouse, Lever, Ashby, and Internshala.
            </p>
          </div>
          <button
            onClick={handleFetchLatestJobs}
            disabled={isFetchingJobs}
            className="px-4 py-2 bg-black hover:opacity-90 text-white dark:bg-white dark:text-black rounded-xl text-xs font-semibold transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingJobs ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      )}

      {/* ── FLOATING ACTION DOCK (BATCH SELECTION) ─────────────────────────── */}
      {selectedUrls.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 animate-fade-up border border-slate-700 dark:border-zinc-300">
          <div className="text-xs font-semibold">
            <span>{selectedUrls.size} positions selected</span>
          </div>

          <div className="h-4 w-px bg-slate-700 dark:bg-zinc-300" />

          <button
            onClick={() => checkProfileAndRun(Array.from(selectedUrls))}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Autonomous Apply</span>
          </button>

          <button
            onClick={() => setSelectedUrls(new Set())}
            className="p-1 rounded-lg text-slate-400 hover:text-white dark:hover:text-zinc-900 transition-colors"
            title="Clear Selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── JOB DETAIL INSPECTION MODAL ────────────────────────────────────── */}
      {viewingJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-in fade-in duration-200 font-sans">
            
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                  {viewingJob.source} · {viewingJob.workplaceType || 'Remote'}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                  {viewingJob.title}
                </h3>
                <div className="text-xs text-slate-500 font-medium">{viewingJob.company} · {viewingJob.location}</div>
              </div>
              <button onClick={() => setViewingJob(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-900 dark:text-zinc-100">Job Description:</span>
              <p className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 leading-relaxed font-sans whitespace-pre-wrap max-h-60 overflow-y-auto">
                {viewingJob.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-zinc-800">
              <a
                href={viewingJob.applyUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-200 transition-colors"
              >
                <span>Open Original Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => {
                  const url = viewingJob.applyUrl;
                  setViewingJob(null);
                  checkProfileAndRun([url]);
                }}
                className="px-5 py-2 bg-black hover:opacity-90 text-white dark:bg-white dark:text-black rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                <span>Autonomous Apply</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Autonomous Apply Simulator Modal */}
      {executingAutoApply && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shadow-xs">
                  <Zap className="w-4 h-4 text-emerald-400 fill-current" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Auto-Apply In Progress</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Automated Form Filling &amp; Submission</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleCancelAutoApply}
                disabled={isCancelingApply}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                title="Cancel Auto-Apply"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-slate-500">Progress</span>
                <span className="text-emerald-500">{autoApplyProgress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${autoApplyProgress}%` }}
                />
              </div>
            </div>

            {/* Log Stream */}
            <div className="p-3.5 rounded-xl bg-slate-950 text-slate-200 text-xs font-mono h-48 overflow-y-auto space-y-1 border border-slate-800">
              {autoApplyLogs.map((l, idx) => (
                <div key={idx} className="leading-relaxed opacity-90">{l}</div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-[10px] font-mono text-slate-400">
                {isCancelingApply ? 'Stopping auto-apply...' : 'Running in browser window'}
              </span>
              <button
                type="button"
                onClick={handleCancelAutoApply}
                disabled={isCancelingApply}
                className="px-6 py-2 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 text-xs font-bold transition shadow-xs flex items-center gap-2 active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
                <span>{isCancelingApply ? 'Stopping Auto-Apply...' : 'Cancel Auto-Apply'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Pill Cancel Indicator */}
      {executingAutoApply && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-fade-up">
          <button
            type="button"
            onClick={handleCancelAutoApply}
            disabled={isCancelingApply}
            className="px-5 py-2.5 rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-950 border border-slate-700 dark:border-slate-300 text-xs font-bold shadow-2xl flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Auto-Apply ({autoApplyProgress}%)</span>
            <div className="h-3 w-px bg-slate-700 dark:bg-slate-300 mx-1" />
            <span className="text-rose-400 dark:text-rose-600 flex items-center gap-1 font-bold">
              <X className="w-3.5 h-3.5" />
              Cancel
            </span>
          </button>
        </div>
      )}

      {/* Profile Completion Gatekeeper Modal */}
      <CompleteProfileModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setPendingApplyAction(null);
        }}
        profile={profile}
        onSaveProfile={async (updated) => {
          const api = getApi();
          if (api && api.saveMasterProfile) {
            await api.saveMasterProfile(updated as any);
          }
          if (onUpdateProfile) {
            onUpdateProfile(updated);
          }
        }}
        onProfileCompleted={handleProfileModalCompleted}
      />
    </div>
  );
};
