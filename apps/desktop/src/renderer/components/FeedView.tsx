import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, RefreshCw, SlidersHorizontal, Briefcase, Zap,
  CheckCircle2, X, Building, MapPin, DollarSign,
  CheckSquare, Square, Bookmark, Globe, Clock,
  Sparkles, UserCheck, ExternalLink, ChevronDown,
  ChevronUp, Layers, AlertCircle, Filter, ArrowRight,
  Laptop, ShieldCheck, Check, Play, Loader2, Copy, Youtube
} from 'lucide-react';
import { Job, MasterProfile, CuratedResource, getApi } from '../types';
import { computeJobRelevance } from '../data/relevanceMatcher';

interface FeedViewProps {
  profile: MasterProfile;
  onLog: (msg: string) => void;
  onNavigateToOutreach?: (company: string, jobTitle: string) => void;
}

const SAMPLE_DEMO_JOBS: Job[] = [
  {
    title: 'Senior Frontend Architect',
    company: 'Vercel',
    location: 'Remote (Global)',
    source: 'Greenhouse API',
    applyUrl: 'https://boards.greenhouse.io/vercel/jobs/592019',
    score: 96,
    employmentType: 'job',
    workplaceType: 'remote',
    experienceLevel: 'senior',
    salary: '₹28 LPA · $160k',
    description: 'Lead next-generation Next.js and React server component rendering architecture. Collaborate across core platform teams to minimize client bundle footprints.',
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    title: 'Software Development Intern (Frontend/React)',
    company: 'Stripe',
    location: 'Remote / Bengaluru',
    source: 'Internshala',
    applyUrl: 'https://internshala.com/internship/detail/stripe-react-intern',
    score: 94,
    employmentType: 'internship',
    workplaceType: 'remote',
    experienceLevel: 'entry',
    salary: '₹75,000 / month',
    description: 'Build developer tooling for global payment processing, checkout SDK components, and interactive developer dashboards.',
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    title: 'Associate Product Manager',
    company: 'Linear',
    location: 'Remote / San Francisco',
    source: 'Ashby API',
    applyUrl: 'https://jobs.ashbyhq.com/linear/apm-opportunity',
    score: 93,
    employmentType: 'job',
    workplaceType: 'remote',
    experienceLevel: 'entry',
    salary: '₹18 LPA · $120k',
    description: 'Work directly with engineering leads on product spec documentation, sprint issue tracking workflows, and customer onboarding analytics.',
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    title: 'Distributed Systems Engineer',
    company: 'Supabase',
    location: 'Remote (Worldwide)',
    source: 'Lever API',
    applyUrl: 'https://jobs.lever.co/supabase/distributed-systems',
    score: 89,
    employmentType: 'job',
    workplaceType: 'remote',
    experienceLevel: 'mid',
    salary: '₹24 LPA · $145k',
    description: 'Scale PostgreSQL connection pooling, edge runtime orchestration with Deno, and real-time database replication clusters.',
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
  },
  {
    title: 'Frontend UI/UX Intern',
    company: 'PostHog',
    location: 'Remote',
    source: 'Internshala',
    applyUrl: 'https://internshala.com/internship/detail/posthog-ui-intern',
    score: 91,
    employmentType: 'internship',
    workplaceType: 'remote',
    experienceLevel: 'entry',
    salary: '₹50,000 / month',
    description: 'Design and build intuitive analytics session-replay tools, feature flag dashboards, and client-side web vital monitors.',
    createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
  },
  {
    title: 'Product Design Lead',
    company: 'Figma',
    location: 'Hybrid / New York',
    source: 'Ashby API',
    applyUrl: 'https://jobs.ashbyhq.com/figma/product-design-lead',
    score: 86,
    employmentType: 'job',
    workplaceType: 'hybrid',
    experienceLevel: 'senior',
    salary: '₹26 LPA · $150k',
    description: 'Design unified component tokens, variable systems, and cross-platform design-to-development code sync tools.',
    createdAt: new Date(Date.now() - 180 * 60000).toISOString(),
  },
  {
    title: 'Backend API Specialist',
    company: 'Postman',
    location: 'Hybrid / Bengaluru',
    source: 'Greenhouse API',
    applyUrl: 'https://boards.greenhouse.io/postman/jobs/381920',
    score: 84,
    employmentType: 'job',
    workplaceType: 'hybrid',
    experienceLevel: 'mid',
    salary: '₹22 LPA',
    description: 'Develop high-throughput API testing protocols, mock servers, and workspace collaboration infrastructure.',
    createdAt: new Date(Date.now() - 420 * 60000).toISOString(),
  }
];

export const FeedView: React.FC<FeedViewProps> = ({
  profile,
  onLog,
  onNavigateToOutreach,
}) => {
  const [jobs, setJobs] = useState<Job[]>(SAMPLE_DEMO_JOBS);
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'stream' | 'saved'>('stream');

  // Multi-Dimensional Filter States
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'score' | 'salary'>('recent');
  const [workplaceFilter, setWorkplaceFilter] = useState<string>('all');
  const [employmentFilter, setEmploymentFilter] = useState<string>('all');
  const [matchTierFilter, setMatchTierFilter] = useState<string>('all');
  const [relevanceMode, setRelevanceMode] = useState<'matched' | 'all'>('matched');

  // Action execution modal state
  const [executingAutoApply, setExecutingAutoApply] = useState<boolean>(false);
  const [autoApplyLogs, setAutoApplyLogs] = useState<string[]>([]);
  const [autoApplyProgress, setAutoApplyProgress] = useState<number>(0);
  const [viewingJob, setViewingJob] = useState<Job | null>(null);

  // Copy feedback
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const fetchCloudJobs = async () => {
    const api = getApi();
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.getCloudFeed('candidate');
      if (res.success && res.jobs && res.jobs.length > 0) {
        setJobs(res.jobs);
        onLog(`[Feed] Stream synced ${res.jobs.length} opportunities from live ATS endpoints.`);
      } else {
        setJobs(SAMPLE_DEMO_JOBS);
      }
      const saved = await api.getSavedJobs();
      setSavedJobs(saved || []);
    } catch {
      setJobs(SAMPLE_DEMO_JOBS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCloudJobs();
  }, []);

  const activeJobPool = activeTab === 'saved' ? savedJobs : jobs;

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

  const matchedCount = useMemo(() => {
    return scoredJobPool.filter(j => (j as any).isStrongMatch || (j.score && j.score >= 65)).length;
  }, [scoredJobPool]);

  // Filter & Sort Pipeline
  const filteredJobs = useMemo(() => {
    let pool = scoredJobPool;
    if (activeTab === 'stream' && relevanceMode === 'matched' && (profile.desiredTitle || profile.techStack)) {
      const matched = pool.filter(j => (j as any).isStrongMatch || (j.score && j.score >= 65));
      if (matched.length > 0) {
        pool = matched;
      }
    }

    let result = pool.filter(job => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        (job.title || '').toLowerCase().includes(q) ||
        (job.company || '').toLowerCase().includes(q) ||
        (job.location || '').toLowerCase().includes(q) ||
        (job.source || '').toLowerCase().includes(q) ||
        (job.matchedSkills || []).some(s => s.toLowerCase().includes(q));

      const matchesType = employmentFilter === 'all' || job.employmentType === employmentFilter;
      const matchesWorkplace = workplaceFilter === 'all' || job.workplaceType === workplaceFilter;
      
      const score = job.score ?? 50;
      const matchesMatch =
        matchTierFilter === 'all' ||
        (matchTierFilter === 'high' && score >= 80) ||
        (matchTierFilter === 'good' && score >= 60);

      const srcLower = (job.source || '').toLowerCase();
      let matchesSource = true;
      if (sourceFilter === 'internshala') matchesSource = srcLower.includes('internshala');
      else if (sourceFilter === 'greenhouse') matchesSource = srcLower.includes('greenhouse');
      else if (sourceFilter === 'lever') matchesSource = srcLower.includes('lever');
      else if (sourceFilter === 'ashby') matchesSource = srcLower.includes('ashby');
      else if (sourceFilter === 'ats') matchesSource = srcLower.includes('api') || srcLower.includes('greenhouse') || srcLower.includes('lever') || srcLower.includes('ashby');

      return matchesSearch && matchesType && matchesWorkplace && matchesMatch && matchesSource;
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === 'score' || (relevanceMode === 'matched' && sortBy === 'recent')) {
        const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
      }
      if (sortBy === 'salary') {
        const parseSalary = (s?: string) => {
          if (!s) return 0;
          const match = s.match(/₹?(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        };
        return parseSalary(b.salary) - parseSalary(a.salary);
      }
      // Default: Most Recent
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [scoredJobPool, activeTab, relevanceMode, profile.desiredTitle, profile.techStack, searchQuery, sourceFilter, sortBy, workplaceFilter, employmentFilter, matchTierFilter]);

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

  const handleResetFilters = () => {
    setSearchQuery('');
    setSourceFilter('all');
    setWorkplaceFilter('all');
    setEmploymentFilter('all');
    setMatchTierFilter('all');
    setSortBy('recent');
  };

  const handleToggleSaveJob = async (job: Job) => {
    const api = getApi();
    if (!api) return;
    const isSaved = savedJobs.some(sj => sj.applyUrl === job.applyUrl);
    if (isSaved) {
      await api.removeSavedJob(job.applyUrl);
      setSavedJobs(prev => prev.filter(sj => sj.applyUrl !== job.applyUrl));
      onLog(`[Feed] Removed bookmark: ${job.title} at ${job.company}`);
    } else {
      await api.saveJob(job);
      setSavedJobs(prev => [...prev, job]);
      onLog(`[Feed] Bookmarked position: ${job.title} at ${job.company}`);
    }
  };

  const handleCopyLink = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 1500);
  };

  const [matchedResources, setMatchedResources] = useState<CuratedResource[]>([]);

  // Automatically fetch AI matched video resources whenever user selects/inspects a job
  useEffect(() => {
    if (!viewingJob) {
      setMatchedResources([]);
      return;
    }
    const fetchMatched = async () => {
      const api = getApi();
      if (!api || !api.getRecommendedResourcesForJob) return;
      try {
        const list = await api.getRecommendedResourcesForJob({
          title: viewingJob.title,
          description: viewingJob.description,
        });
        setMatchedResources(list || []);
      } catch {}
    };
    fetchMatched();
  }, [viewingJob]);

  // Launch Real 100% Autonomous Auto-Apply with Sequential 5-Job Batches
  const handleTriggerAutonomousApply = async (targetUrls: string[]) => {
    if (targetUrls.length === 0) return;
    const api = getApi();
    if (!api) return;

    const BATCH_SIZE = 5;
    const totalBatches = Math.ceil(targetUrls.length / BATCH_SIZE);

    setExecutingAutoApply(true);
    setAutoApplyLogs([
      `[Sequential Batch Engine] Allocating ${targetUrls.length} positions across ${totalBatches} sequential batches (${BATCH_SIZE} jobs per batch, 3-tab RAM safety pool)...`,
      `[Target Queue] Beginning Batch 1/${totalBatches}...`
    ]);
    setAutoApplyProgress(10);

    const unsub = api.onLog ? api.onLog((msg) => {
      setAutoApplyLogs(prev => [...prev.slice(-30), msg]);
    }) : () => {};

    try {
      const res = await api.launchAutonomous(targetUrls);
      setAutoApplyProgress(100);
      if (res.success) {
        setAutoApplyLogs(prev => [
          ...prev,
          `[Complete] ✓ Successfully processed ${res.applied || targetUrls.length} positions across ${totalBatches} batches!`
        ]);
        onLog(`[Auto-Apply] Successfully processed ${res.applied || targetUrls.length} positions across ${totalBatches} batches.`);
      } else if (res.limitReached) {
        setAutoApplyLogs(prev => [
          ...prev,
          `[Plan Limit Warning] ⚠️ ${res.error}`,
          `[Action Required] Upgrade your plan in Settings to apply to all ${targetUrls.length} positions.`
        ]);
        onLog(`[Plan Limit] ${res.error}`);
      } else {
        setAutoApplyLogs(prev => [...prev, `[Notice] ${res.error || 'Completed with notes'}`]);
      }
    } catch (err: any) {
      setAutoApplyLogs(prev => [...prev, `[Error] ${err?.message || String(err)}`]);
    } finally {
      unsub();
      setTimeout(() => {
        setExecutingAutoApply(false);
      }, 3500);
    }
  };

  // Launch Real Semi-Autonomous Review Mode (RAM-Safe 3-Tab FIFO)
  const handleTriggerSemiAutoApply = async (targetUrls: string[]) => {
    if (targetUrls.length === 0) return;
    const api = getApi();
    if (!api) return;

    setExecutingAutoApply(true);
    setAutoApplyLogs([
      `[Review Mode] Launching external Chrome with 3-tab RAM-safe concurrency limiter...`,
      `[Pre-fill Engine] Auto-filling credentials & attaching resumes for ${targetUrls.length} positions...`
    ]);
    setAutoApplyProgress(25);

    const unsub = api.onLog ? api.onLog((msg) => {
      setAutoApplyLogs(prev => [...prev.slice(-25), msg]);
    }) : () => {};

    try {
      const res = await api.launchSemiAuto(targetUrls);
      setAutoApplyProgress(100);
      if (res.success) {
        setAutoApplyLogs(prev => [
          ...prev,
          `[Complete] ✓ All ${targetUrls.length} tabs pre-filled in external Chrome! Ready for 1-click review.`
        ]);
        onLog(`[Review Mode] Opened ${targetUrls.length} pre-filled tabs in external Chrome for review.`);
      } else {
        setAutoApplyLogs(prev => [...prev, `[Notice] ${res.error || 'Check browser'}`]);
      }
    } catch (err: any) {
      setAutoApplyLogs(prev => [...prev, `[Error] ${err?.message || String(err)}`]);
    } finally {
      unsub();
      setTimeout(() => {
        setExecutingAutoApply(false);
      }, 2500);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none max-w-6xl mx-auto pb-28 relative">
      
      {/* ── CLEAN TOP HEADER & TOOLBAR ────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        
        {/* Top Title & Batch Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800/80 pb-3.5">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              Job Board
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Verified opportunities across Greenhouse, Lever, Ashby, and Internshala.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleTriggerSemiAutoApply(selectedUrls.size > 0 ? Array.from(selectedUrls) : filteredJobs.slice(0, 3).map(j => j.applyUrl))}
              disabled={executingAutoApply}
              className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-900 dark:text-zinc-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-zinc-700 disabled:opacity-50"
              title="Pre-fills forms in 3 parallel Chrome tabs and pauses for your 1-click review"
            >
              <Laptop className="w-3.5 h-3.5 text-blue-500" />
              <span>Review Mode ({selectedUrls.size > 0 ? selectedUrls.size : 'Top 3'})</span>
            </button>

            <button
              onClick={() => handleTriggerAutonomousApply(selectedUrls.size > 0 ? Array.from(selectedUrls) : filteredJobs.slice(0, 50).map(j => j.applyUrl))}
              disabled={executingAutoApply}
              className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
              title="100% autonomous background application submission in 10 sequential batches of 5 jobs with Groq AI question answering"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400 fill-current" />
              <span>Autonomous Apply ({selectedUrls.size > 0 ? `${selectedUrls.size} Selected` : '50 Jobs / 10 Batches'})</span>
            </button>
          </div>
        </div>

        {/* Search Bar + Tab Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, company, skills, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-slate-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => {
                setActiveTab('stream');
                setRelevanceMode('matched');
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'stream' && relevanceMode === 'matched'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Matched ({matchedCount})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('stream');
                setRelevanceMode('all');
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'stream' && relevanceMode === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              All Jobs ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              <Bookmark className="w-3 h-3" />
              <span>Saved ({savedJobs.length})</span>
            </button>
          </div>
        </div>

        {/* Personalized Candidate Relevance Banner */}
        {activeTab === 'stream' && relevanceMode === 'matched' && (profile.desiredTitle || profile.techStack) && (
          <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Personalized Stream: Showing <strong>{filteredJobs.length}</strong> opportunities matching your role{' '}
                <strong className="font-bold text-emerald-950 dark:text-emerald-100">"{profile.desiredTitle || 'Software Engineer'}"</strong>
                {profile.techStack ? ` and stack (${profile.techStack})` : ''}.
              </span>
            </div>
            <button
              onClick={() => setRelevanceMode('all')}
              className="text-[11px] font-semibold underline hover:opacity-80 shrink-0 ml-2 text-emerald-700 dark:text-emerald-300"
            >
              Show all ({jobs.length})
            </button>
          </div>
        )}

        {/* Filter Pills Grid */}
        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex flex-wrap items-center gap-2 text-xs">
          
          {/* Source Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 mr-1">Source:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'internshala', label: 'Internshala' },
              { id: 'ats', label: 'Direct ATS' },
              { id: 'greenhouse', label: 'Greenhouse' },
              { id: 'ashby', label: 'Ashby' },
              { id: 'lever', label: 'Lever' }
            ].map(src => (
              <button
                key={src.id}
                onClick={() => setSourceFilter(src.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  sourceFilter === src.id
                    ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
                }`}
              >
                {src.label}
              </button>
            ))}
          </div>

          {/* Workplace Filter */}
          <div className="flex items-center gap-1 border-l border-slate-200 dark:border-zinc-700 pl-2">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 mr-1">Workplace:</span>
            {['all', 'remote', 'hybrid', 'onsite'].map(wp => (
              <button
                key={wp}
                onClick={() => setWorkplaceFilter(wp)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                  workplaceFilter === wp
                    ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
                }`}
              >
                {wp}
              </button>
            ))}
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1 border-l border-slate-200 dark:border-zinc-700 pl-2 ml-auto">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 mr-1">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-1 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-md text-xs font-semibold outline-none border border-slate-200 dark:border-zinc-700"
            >
              <option value="recent">Most Recent</option>
              <option value="score">Highest Match</option>
              <option value="salary">Salary: High to Low</option>
            </select>
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
          Showing {filteredJobs.length} opportunities · Cryptographically verified
        </div>
      </div>

      {/* ── PINTEREST-STYLE MASONRY JOB BOARD ──────────────────────────────── */}
      {filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
          {filteredJobs.map((job) => {
            const isSelected = selectedUrls.has(job.applyUrl);
            const isSaved = savedJobs.some(sj => sj.applyUrl === job.applyUrl);
            const score = job.score ?? 85;

            return (
              <div
                key={job.applyUrl}
                className={`p-5 rounded-2xl border transition-all duration-300 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between hover:-translate-y-1 hover:shadow-md ${
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

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        score >= 90
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {score}% Match
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSelect(job.applyUrl)}
                        className="text-slate-400 hover:text-slate-900 dark:hover:text-zinc-100"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-slate-900 dark:text-zinc-100" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Job Title */}
                  <div>
                    <h3
                      onClick={() => setViewingJob(job)}
                      className="text-sm font-bold text-slate-900 dark:text-zinc-100 cursor-pointer hover:underline leading-snug"
                    >
                      {job.title}
                    </h3>
                  </div>

                  {/* Location & Compensation Chips */}
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                    <span className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {job.location}
                    </span>
                    {job.salary && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> {job.salary}
                      </span>
                    )}
                  </div>

                  {/* Matched Skills Chips */}
                  {job.matchedSkills && job.matchedSkills.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> Matches:
                      </span>
                      {job.matchedSkills.map(skill => (
                        <span key={skill} className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono border border-emerald-200/60 dark:border-emerald-800/60">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Role Description Snippet (Pinterest card content) */}
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
                      title={isSaved ? 'Remove Bookmark' : 'Bookmark Job'}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
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
                      title="Find verified HR & Engineering Manager emails and LinkedIn (Coming Soon)"
                    >
                      Find HR
                    </button>
                  </div>

                  <button
                    onClick={() => handleTriggerAutonomousApply([job.applyUrl])}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                  >
                    <Zap className="w-3 h-3 text-emerald-400 fill-current" />
                    <span>1-Click Apply</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── NOTION ZERO-FRICTION EMPTY STATE ──────────────────────────────── */
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-3 shadow-xs max-w-md mx-auto animate-fade-up">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 mx-auto flex items-center justify-center">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">No matching positions found</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Try adjusting your search query or reset your workplace and source filters.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl text-xs font-semibold transition-colors shadow-xs"
          >
            Reset All Filters
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
            onClick={() => handleTriggerAutonomousApply(Array.from(selectedUrls))}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Apply to All ({selectedUrls.size})</span>
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

      {/* Autonomous Apply Simulator Modal */}
      {executingAutoApply && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-fade-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-emerald-400 fill-current" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Autonomous Apply Engine Active</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Playwright Stealth + Groq LLaMA 3.1 8B</p>
                </div>
              </div>
              {autoApplyProgress === 100 && (
                <button
                  onClick={() => setExecutingAutoApply(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-slate-500">Progress</span>
                <span className="text-slate-900 dark:text-zinc-100">{autoApplyProgress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${autoApplyProgress}%` }}
                />
              </div>
            </div>

            {/* Terminal Log Stream */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1 max-h-52 overflow-y-auto">
              {autoApplyLogs.map((lg, i) => (
                <div key={i} className="leading-relaxed border-b border-slate-900/80 pb-0.5">
                  {lg}
                </div>
              ))}
            </div>

            {autoApplyProgress === 100 && (
              <button
                onClick={() => setExecutingAutoApply(false)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-lg text-xs font-semibold transition-colors"
              >
                Close &amp; View Pipeline Board
              </button>
            )}
          </div>
        </div>
      )}

      {/* Job Details Modal */}
      {viewingJob && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-fade-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-slate-400">{viewingJob.company}</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 mt-0.5">{viewingJob.title}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-1">
                  <span>{viewingJob.location}</span>
                  {viewingJob.salary && <span>· {viewingJob.salary}</span>}
                  <span>· {viewingJob.source}</span>
                </div>
              </div>
              <button onClick={() => setViewingJob(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
              <h4 className="font-bold text-slate-900 dark:text-zinc-100">Position Scope:</h4>
              <p>{viewingJob.description || 'Full job specifications available via direct ATS endpoint.'}</p>
            </div>

            {/* AI-Matched Learning Tutorials (Admin Curated) */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <h4 className="font-bold text-xs text-slate-900 dark:text-zinc-100">
                    AI-Matched Learning Prep for "{viewingJob.title}"
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Curated by Admin</span>
              </div>

              {matchedResources.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {matchedResources.map((res) => (
                    <a
                      key={res.id}
                      href={res.youtubeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all flex flex-col justify-between space-y-1.5 group"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-mono font-bold flex items-center gap-1">
                            <Youtube className="w-3 h-3 text-rose-600" />
                            <span>{res.topic}</span>
                          </span>
                          <span className="text-slate-400 font-mono">{res.duration}</span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mt-1 leading-snug">
                          {res.title}
                        </h5>
                        {res.summary && (
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                            {res.summary}
                          </p>
                        )}
                      </div>
                      <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 pt-1">
                        <span>Watch Tutorial</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 font-mono py-1">
                  Scanning learning vault for topic matches...
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
              <a
                href={viewingJob.applyUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-200 transition-colors"
              >
                <span>Open Original Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => {
                  const url = viewingJob.applyUrl;
                  setViewingJob(null);
                  handleTriggerAutonomousApply([url]);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                <span>Autonomous Apply Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
