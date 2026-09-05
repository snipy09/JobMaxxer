import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, RefreshCw, Briefcase, Zap,
  CheckCircle2, X, Building, MapPin, DollarSign,
  CheckSquare, Square, Bookmark, Globe, Clock,
  Sparkles, ExternalLink, ChevronDown, ChevronUp,
  AlertCircle, Filter, ArrowRight, Check, Loader2, Copy,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  SlidersHorizontal, UserCheck, Shield, Mail, FileText, ArrowUpRight
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

  // Primary Segmented Filter Tabs: all, jobs, internships, internshala, remote, saved, high_match
  const [filterTab, setFilterTab] = useState<'all' | 'jobs' | 'internships' | 'internshala' | 'remote' | 'saved' | 'high_match'>('all');
  
  // Sort State: latest | best_match | company
  const [sortBy, setSortBy] = useState<'latest' | 'best_match' | 'company'>('latest');

  // Advanced Filters Drawer
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');

  // Job Detail Slide-Over Drawer
  const [viewingJob, setViewingJob] = useState<Job | null>(null);

  // Action execution modal state
  const [executingAutoApply, setExecutingAutoApply] = useState<boolean>(false);
  const [autoApplyLogs, setAutoApplyLogs] = useState<string[]>([]);
  const [autoApplyProgress, setAutoApplyProgress] = useState<number>(0);
  const [pillColorState, setPillColorState] = useState<'grey' | 'green' | 'red'>('grey');
  const [pillMessage, setPillMessage] = useState<string>('Initializing auto-apply...');
  const [activeJobTarget, setActiveJobTarget] = useState<{ company: string; title: string } | null>(null);

  // Profile completion gatekeeper modal state
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [pendingApplyAction, setPendingApplyAction] = useState<{ urls: string[] } | null>(null);

  // Copy feedback & toast notifications
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isFetchingJobs, setIsFetchingJobs] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToastNotification({ type, message });
    setTimeout(() => setToastNotification(null), 3500);
  };

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
        showToast(`Refreshed ${combined.length} verified opportunities.`);
        onLog(`[Job Board] Feed updated with ${combined.length} unique positions.`);
      } else {
        await fetchCloudJobs();
        showToast('Job board refreshed with current verified opportunities.');
      }
    } catch {
      await fetchCloudJobs();
      showToast('Refreshed local job cache.', 'info');
    } finally {
      setIsFetchingJobs(false);
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

  // 3. Refresh and load saved jobs on launch
  useEffect(() => {
    const sessionKey = 'nomadic_jobs_session_synced';
    const hasSyncedThisSession = sessionStorage.getItem(sessionKey) === 'true';
    
    if (!hasSyncedThisSession) {
      fetchCloudJobs().then(() => {
        sessionStorage.setItem(sessionKey, 'true');
      });
    } else {
      const api = getApi();
      if (api && api.getSavedJobs) {
        api.getSavedJobs().then(saved => setSavedJobs(saved || [])).catch(() => {});
      }
    }
  }, []);

  // Keyboard shortcut listener (Escape to close drawer, ⌘K for search focus)
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewingJob) setViewingJob(null);
        if (showFilterDrawer) setShowFilterDrawer(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingJob, showFilterDrawer]);

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

  // Unique filter options for advanced drawer
  const availableSources = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach(j => {
      if (j.source) set.add(j.source);
    });
    return Array.from(set);
  }, [jobs]);

  // Filter & Sort Pipeline
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
        if (empType === 'internship' || titleLower.includes('intern') || titleLower.includes('internship')) return false;
      }
      if (filterTab === 'internships') {
        const titleLower = (job.title || '').toLowerCase();
        const empType = (job.employmentType || '').toLowerCase();
        const srcLower = (job.source || '').toLowerCase();
        if (!(empType === 'internship' || titleLower.includes('intern') || titleLower.includes('internship') || srcLower.includes('internshala'))) return false;
      }
      if (filterTab === 'internshala') {
        if (!(job.source || '').toLowerCase().includes('internshala')) return false;
      }
      if (filterTab === 'high_match') {
        if ((job.score ?? 0) < 80) return false;
      }
      if (filterTab === 'remote') {
        if (!(job.workplaceType === 'remote' || (job.location || '').toLowerCase().includes('remote'))) return false;
      }

      // Advanced Drawer Filters
      if (selectedSourceFilter !== 'all') {
        if (job.source !== selectedSourceFilter) return false;
      }
      if (selectedLocationFilter !== 'all') {
        if (selectedLocationFilter === 'remote' && !(job.workplaceType === 'remote' || (job.location || '').toLowerCase().includes('remote'))) return false;
        if (selectedLocationFilter === 'india' && !((job.location || '').toLowerCase().includes('india') || (job.location || '').toLowerCase().includes('bengaluru') || (job.location || '').toLowerCase().includes('bangalore') || (job.location || '').toLowerCase().includes('mumbai') || (job.location || '').toLowerCase().includes('delhi') || (job.location || '').toLowerCase().includes('hyderabad') || (job.location || '').toLowerCase().includes('pune'))) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'best_match') {
        return (b.score ?? 0) - (a.score ?? 0);
      }
      if (sortBy === 'company') {
        return (a.company || '').localeCompare(b.company || '');
      }
      // Default: Latest to Oldest
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.score ?? 0) - (a.score ?? 0);
    });
  }, [scoredJobPool, filterTab, searchQuery, sortBy, selectedSourceFilter, selectedLocationFilter]);

  // Active advanced filters count
  const activeAdvancedFilterCount = (selectedLocationFilter !== 'all' ? 1 : 0) + (selectedSourceFilter !== 'all' ? 1 : 0);

  const isFreeUser = !currentUser?.tier || currentUser?.tier === 'free';
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(18);

  // Reset page to 1 when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery, pageSize, sortBy, selectedLocationFilter, selectedSourceFilter]);

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

  const handleToggleSaveJob = async (job: Job, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const api = getApi();
    if (!api) return;
    const isSaved = savedJobs.some(sj => sj.applyUrl === job.applyUrl);
    if (isSaved) {
      await api.removeSavedJob(job.applyUrl);
      setSavedJobs(prev => prev.filter(sj => sj.applyUrl !== job.applyUrl));
      showToast(`Removed ${job.company} from saved opportunities.`, 'info');
      onLog(`[Saved] Removed ${job.title} at ${job.company}`);
    } else {
      await api.saveJob(job);
      setSavedJobs(prev => [...prev, job]);
      showToast(`Saved ${job.company} to Opportunities.`);
      onLog(`[Saved] Saved ${job.title} at ${job.company}`);
    }
  };

  const handleCopyLink = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    showToast('Job application URL copied to clipboard.');
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
    setPillColorState('grey');
    setPillMessage('Initializing auto-apply engine...');
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
      if (data.statusEvent) {
        setPillColorState(data.statusEvent.colorState || 'grey');
        setPillMessage(data.statusEvent.message || 'Processing...');
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
    <div className="space-y-5 font-sans select-none max-w-6xl mx-auto pb-28 relative">
      
      {/* ── 1. TOAST NOTIFICATION ────────────────────────────────────────── */}
      {toastNotification && (
        <div className="fixed top-16 right-8 z-50 bg-slate-950 text-white dark:bg-white dark:text-slate-950 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2.5 animate-fadeIn border border-slate-800 dark:border-slate-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastNotification.message}</span>
        </div>
      )}

      {/* ── 2. TOP HEADER & TIGHT SEARCH HIERARCHY ───────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        
        {/* Title Bar & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
                Job Board
              </h1>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {totalFilteredCount} opportunities
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Discover verified roles and apply directly from Nomadic.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleFetchLatestJobs}
              disabled={loading || isFetchingJobs || executingAutoApply}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
              title="Refresh job board with latest ATS postings"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingJobs || loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => checkProfileAndRun(selectedUrls.size > 0 ? Array.from(selectedUrls) : filteredJobs.slice(0, 50).map(j => j.applyUrl))}
              disabled={executingAutoApply}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50 active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 fill-current" />
              <span>Autonomous Apply</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Quick Filters */}
        <div className="space-y-3">
          
          {/* Search Input */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search jobs, companies, skills, or locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:border-slate-400 dark:focus:border-slate-500 transition-colors font-medium"
            />
          </div>

          {/* Filter Chips & Sorting Control */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-1">
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'jobs', label: 'Full-time' },
                { id: 'internships', label: 'Internships' },
                { id: 'internshala', label: 'Internshala' },
                { id: 'remote', label: 'Remote' },
                { id: 'high_match', label: 'High Match' },
                { id: 'saved', label: `Saved (${savedJobs.length})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    filterTab === tab.id
                      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-2xs font-bold'
                      : 'bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              {/* Advanced Filter Drawer Trigger */}
              <button
                type="button"
                onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap ${
                  activeAdvancedFilterCount > 0
                    ? 'bg-powder-50 text-powder-900 border-powder-300 dark:bg-powder-950/50 dark:text-powder-300 dark:border-powder-800'
                    : 'bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/60 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters {activeAdvancedFilterCount > 0 && `· ${activeAdvancedFilterCount}`}</span>
              </button>
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              <span className="text-[11px] font-mono text-slate-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-hidden cursor-pointer"
              >
                <option value="latest">Latest</option>
                <option value="best_match">Best Match</option>
                <option value="company">Company (A-Z)</option>
              </select>
            </div>

          </div>

        </div>

      </div>

      {/* ── 3. ADVANCED FILTERS PANEL ─────────────────────────────────────── */}
      {showFilterDrawer && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            
            {/* Location Dimension */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Location:</span>
              <select
                value={selectedLocationFilter}
                onChange={(e) => setSelectedLocationFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-hidden"
              >
                <option value="all">All Locations</option>
                <option value="remote">Remote Only</option>
                <option value="india">India (Tech Hubs)</option>
              </select>
            </div>

            {/* Source Dimension */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Source:</span>
              <select
                value={selectedSourceFilter}
                onChange={(e) => setSelectedSourceFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-hidden max-w-[180px]"
              >
                <option value="all">All Sources</option>
                {availableSources.map(src => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>

          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedLocationFilter('all');
              setSelectedSourceFilter('all');
            }}
            className="text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* ── 4. BATCH ACTIONS & SELECTION BAR ──────────────────────────────── */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-mono font-bold">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {selectedUrls.size === filteredJobs.length && filteredJobs.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-slate-950 dark:text-white" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span>
              {selectedUrls.size > 0 ? `${selectedUrls.size} Selected` : `Select All (${filteredJobs.length})`}
            </span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          {totalFilteredCount} matching opportunities
        </div>
      </div>

      {/* ── 5. JOB CARDS GRID ─────────────────────────────────────────────── */}
      {displayedJobs.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 items-stretch">
            {displayedJobs.map((job) => {
              const isSelected = selectedUrls.has(job.applyUrl);
              const isSaved = savedJobs.some(sj => sj.applyUrl === job.applyUrl);
              const score = job.score ?? 85;

              return (
                <div
                  key={job.applyUrl}
                  onClick={() => setViewingJob(job)}
                  className={`p-5 rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm ${
                    isSelected
                      ? 'border-slate-950 dark:border-white ring-1 ring-slate-950 dark:ring-white'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Card Body */}
                  <div className="space-y-3">
                    
                    {/* Header: Avatar, Company, Source, Match Badge, Select */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center font-bold text-xs font-mono shrink-0 border border-slate-200/80 dark:border-slate-700/80">
                          {job.company ? job.company.slice(0, 2).toUpperCase() : 'CO'}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-950 dark:text-white truncate max-w-[130px]">
                            {job.company}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            via {job.source || 'ATS'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          score >= 90
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {score}% Match
                        </span>

                        <button
                          type="button"
                          onClick={() => toggleSelect(job.applyUrl)}
                          className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-slate-950 dark:text-white" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Role Title (Up to 2 lines) */}
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-950 dark:text-white leading-snug line-clamp-2">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{job.location || 'Remote'}</span>
                        </span>
                        {job.salary && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{job.salary}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Matched Skills */}
                    {job.matchedSkills && job.matchedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {job.matchedSkills.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 font-semibold"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.matchedSkills.length > 3 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded text-slate-400">
                            +{job.matchedSkills.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Short Description Snippet */}
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {job.description || 'Verified opening available via direct ATS endpoint.'}
                    </p>

                  </div>

                  {/* Card Action Footer */}
                  <div
                    className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      {/* Save Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleSaveJob(job, e)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isSaved
                            ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 border-transparent'
                            : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                        title={isSaved ? 'Saved to Opportunities' : 'Save Opportunity'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-amber-400' : ''}`} />
                      </button>

                      {/* Copy Link Button */}
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(job.applyUrl, e)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        title="Copy Application Link"
                      >
                        {copiedUrl === job.applyUrl ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Find Contacts Button */}
                      <button
                        type="button"
                        onClick={() => onNavigateToOutreach?.(job.company, job.title)}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                        title={`Find recruiter and HR contacts at ${job.company}`}
                      >
                        Find contacts
                      </button>
                    </div>

                    {/* Apply Primary CTA */}
                    <button
                      type="button"
                      onClick={() => checkProfileAndRun([job.applyUrl], { company: job.company, title: job.title })}
                      className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-2xs active:scale-95"
                      title={`Autonomous apply for ${job.title}`}
                    >
                      <Zap className="w-3 h-3 text-emerald-400 dark:text-emerald-600 fill-current" />
                      <span>Apply</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {!isFreeUser && totalPages > 1 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                <span>
                  Showing {Math.min(totalFilteredCount, (currentPage - 1) * pageSize + 1)}–{Math.min(totalFilteredCount, currentPage * pageSize)} of {totalFilteredCount} positions
                </span>
                <span className="hidden sm:inline">·</span>
                <div className="hidden sm:flex items-center gap-1.5">
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 outline-hidden font-bold"
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
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition"
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
                          : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Free User Locked Jobs Banner */}
          {isFreeUser && filteredJobs.length > 10 && (
            <div className="p-6 rounded-2xl bg-slate-950 text-white dark:bg-slate-900 border border-slate-800 dark:border-slate-700 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3 shadow-xs max-w-md mx-auto animate-fadeIn">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-950 dark:text-white">No matching opportunities</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try adjusting your keyword query or clear active filter tabs.
            </p>
          </div>
          <button
            type="button"
            onClick={handleFetchLatestJobs}
            disabled={isFetchingJobs}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingJobs ? 'animate-spin' : ''}`} />
            <span>Refresh Feed</span>
          </button>
        </div>
      )}

      {/* ── 6. FLOATING BATCH SELECTION DOCK ──────────────────────────────── */}
      {selectedUrls.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-950 text-white dark:bg-white dark:text-slate-950 rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 animate-fadeIn border border-slate-800 dark:border-slate-200">
          <div className="text-xs font-bold font-mono">
            <span>{selectedUrls.size} positions selected</span>
          </div>

          <div className="h-4 w-px bg-slate-700 dark:bg-slate-300" />

          <button
            type="button"
            onClick={() => checkProfileAndRun(Array.from(selectedUrls))}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Autonomous Apply</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedUrls(new Set())}
            className="p-1 rounded-lg text-slate-400 hover:text-white dark:hover:text-slate-950 transition-colors"
            title="Clear Selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 7. JOB DETAIL RIGHT-SIDE SLIDE-OVER DRAWER ────────────────────── */}
      {viewingJob && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs animate-fadeIn">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-hidden animate-slideLeft">
            
            {/* Drawer Top Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    via {viewingJob.source || 'Direct ATS'}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {viewingJob.score ?? 85}% Match
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white leading-snug pt-1">
                  {viewingJob.title}
                </h2>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {viewingJob.company} · {viewingJob.location || 'Remote'} {viewingJob.salary && `· ${viewingJob.salary}`}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingJob(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Match Explanation */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Why this matches your profile
                  </h4>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {viewingJob.score ?? 85}% Match
                  </span>
                </div>
                {viewingJob.matchedSkills && viewingJob.matchedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {viewingJob.matchedSkills.map((s, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg font-semibold"
                      >
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>{s}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Strong alignment with target role and experience criteria.
                  </p>
                )}
              </div>

              {/* Full Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Job Description &amp; Requirements
                </h4>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto font-sans">
                  {viewingJob.description || 'Full position details and requirements available via direct employer ATS endpoint.'}
                </div>
              </div>

              {/* Application Context */}
              <div className="space-y-2 text-xs">
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Application Setup
                </h4>
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Default Resume
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    ATTACHED
                  </span>
                </div>
              </div>

            </div>

            {/* Drawer Action Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewingJob(null);
                    onNavigateToOutreach?.(viewingJob.company, viewingJob.title);
                  }}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  Find contacts
                </button>

                <a
                  href={viewingJob.applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  title="Open in Browser"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <button
                type="button"
                onClick={() => {
                  const url = viewingJob.applyUrl;
                  const company = viewingJob.company;
                  const title = viewingJob.title;
                  setViewingJob(null);
                  checkProfileAndRun([url], { company, title });
                }}
                className="px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 fill-current" />
                <span>Apply Now</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 8. AUTONOMOUS APPLY SIMULATOR MODAL ───────────────────────────── */}
      {executingAutoApply && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl text-white flex items-center justify-center shadow-xs transition-colors duration-300 ${
                  pillColorState === 'green' ? 'bg-emerald-500' : pillColorState === 'red' ? 'bg-rose-500' : 'bg-slate-950 dark:bg-white dark:text-slate-950'
                }`}>
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">Auto-Apply In Progress</h3>
                  <p className="text-[11px] text-slate-500 font-mono line-clamp-1">{pillMessage}</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleCancelAutoApply}
                disabled={isCancelingApply}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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
                {isCancelingApply ? 'Stopping auto-apply...' : 'Running in background Playwright runner'}
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

      {/* ── 9. FLOATING 3-COLOR STATUS PILL INDICATOR ─────────────────────── */}
      {executingAutoApply && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-fadeIn">
          <div
            className={`px-5 py-2.5 rounded-full border text-xs font-bold shadow-2xl flex items-center gap-3 transition-all duration-300 ${
              pillColorState === 'green'
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-900/20'
                : pillColorState === 'red'
                ? 'bg-rose-600 border-rose-400 text-white shadow-rose-900/20'
                : 'bg-slate-950 border-slate-700 text-slate-200 dark:bg-white dark:border-slate-300 dark:text-slate-950'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              pillColorState === 'green' ? 'bg-white' : pillColorState === 'red' ? 'bg-amber-300 animate-ping' : 'bg-emerald-400 animate-pulse'
            }`} />
            
            <div className="flex flex-col">
              <span className="truncate max-w-[300px]">{pillMessage}</span>
              {pillColorState === 'grey' && autoApplyProgress < 100 && (
                <span className="text-[9px] font-mono opacity-60 mt-0.5">Progress: {autoApplyProgress}%</span>
              )}
            </div>

            <div className="h-4 w-px bg-white/20 mx-1" />
            
            <button
              type="button"
              onClick={handleCancelAutoApply}
              disabled={isCancelingApply}
              className="flex items-center gap-1 font-bold opacity-80 hover:opacity-100 transition-opacity whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              <span>{isCancelingApply ? 'Stopping...' : 'Cancel'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 10. PROFILE COMPLETION GATEKEEPER MODAL ───────────────────────── */}
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
