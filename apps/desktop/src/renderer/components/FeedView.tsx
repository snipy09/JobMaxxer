import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, RefreshCw, SlidersHorizontal, Briefcase, Zap,
  CheckCircle2, X, Building, MapPin, DollarSign,
  CheckSquare, Square, Bookmark, Globe, Clock,
  Sparkles, UserCheck, ExternalLink, ChevronDown,
  ChevronUp, Layers, AlertCircle, Filter, ArrowRight
} from 'lucide-react';
import { Job, MasterProfile, getApi } from '../types';

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
    createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
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
    title: 'Software Development Intern',
    company: 'Stripe',
    location: 'Remote / Bengaluru',
    source: 'Greenhouse API',
    applyUrl: 'https://boards.greenhouse.io/stripe/jobs/482011',
    score: 92,
    employmentType: 'internship',
    workplaceType: 'remote',
    experienceLevel: 'entry',
    salary: '₹75,000 / month',
    description: 'Build developer tooling for global payment processing, payment intent SDK integrations, and automated test runners.',
    createdAt: new Date(Date.now() - 300 * 60000).toISOString(),
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

  // Filter States
  const [filters, setFilters] = useState({
    matchTier: 'all', // 'all' | 'high' (80%+) | 'good' (60%+)
    type: 'all', // 'all' | 'job' | 'internship'
    workplace: 'all', // 'all' | 'remote' | 'hybrid' | 'onsite'
    experience: 'all', // 'all' | 'entry' | 'mid' | 'senior'
    source: 'all', // 'all' | 'greenhouse' | 'lever' | 'ashby'
  });

  const [runningAction, setRunningAction] = useState<'review' | 'auto' | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [viewingJob, setViewingJob] = useState<Job | null>(null);

  const fetchCloudJobs = async () => {
    const api = getApi();
    if (!api) return;
    setLoading(true);
    setActionFeedback(null);
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

  const filteredJobs = useMemo(() => {
    return activeJobPool.filter(job => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        (job.title || '').toLowerCase().includes(q) ||
        (job.company || '').toLowerCase().includes(q) ||
        (job.location || '').toLowerCase().includes(q) ||
        (job.source || '').toLowerCase().includes(q);

      const matchesType = filters.type === 'all' || job.employmentType === filters.type;
      const matchesWorkplace = filters.workplace === 'all' || job.workplaceType === filters.workplace;
      const matchesExperience = filters.experience === 'all' || job.experienceLevel === filters.experience;
      
      const score = job.score ?? 50;
      const matchesMatch =
        filters.matchTier === 'all' ||
        (filters.matchTier === 'high' && score >= 80) ||
        (filters.matchTier === 'good' && score >= 60);

      const srcLower = (job.source || '').toLowerCase();
      const matchesSource =
        filters.source === 'all' ||
        srcLower.includes(filters.source);

      return matchesSearch && matchesType && matchesWorkplace && matchesExperience && matchesMatch && matchesSource;
    });
  }, [activeJobPool, searchQuery, filters]);

  const activeFilterEntries = Object.entries(filters).filter(([_, val]) => val !== 'all');
  const activeFilterCount = activeFilterEntries.length;

  const clearFilters = () => {
    setFilters({
      matchTier: 'all',
      type: 'all',
      workplace: 'all',
      experience: 'all',
      source: 'all',
    });
    setSearchQuery('');
  };

  const handleToggleSaveJob = async (job: Job) => {
    const api = getApi();
    const isAlreadySaved = savedJobs.some(j => j.applyUrl === job.applyUrl);
    if (isAlreadySaved) {
      setSavedJobs(prev => prev.filter(j => j.applyUrl !== job.applyUrl));
      if (api) await api.removeSavedJob(job.applyUrl);
      onLog(`[Feed] Removed ${job.title} from saved jobs.`);
    } else {
      const updated = [...savedJobs, job];
      setSavedJobs(updated);
      if (api) await api.saveJob(job);
      onLog(`[Feed] Bookmarked ${job.title} at ${job.company}.`);
    }
  };

  const toggleSelectUrl = (url: string) => {
    setSelectedUrls(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUrls.size === filteredJobs.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(filteredJobs.map(j => j.applyUrl)));
    }
  };

  const handleLaunchSemiAuto = async (targetUrls?: string[]) => {
    const urls = targetUrls || Array.from(selectedUrls);
    if (urls.length === 0) return;
    const api = getApi();
    setRunningAction('review');
    setActionFeedback(null);
    onLog(`[AutoApply] Launching Semi-Auto 20-Tab Review for ${urls.length} jobs...`);
    try {
      if (api) {
        await api.launchSemiAuto(urls);
      }
      setActionFeedback({
        type: 'success',
        message: `Launched ${urls.length} application tabs for client-side review.`,
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Error launching browser tabs.',
      });
    } finally {
      setRunningAction(null);
    }
  };

  const handleLaunchAutonomous = async (targetUrls?: string[]) => {
    const urls = targetUrls || Array.from(selectedUrls);
    if (urls.length === 0) return;
    const api = getApi();
    setRunningAction('auto');
    setActionFeedback(null);
    onLog(`[AutoApply] Launching Autonomous Submitter for ${urls.length} positions...`);
    try {
      if (api) {
        await api.launchAutonomous(urls);
      }
      setActionFeedback({
        type: 'success',
        message: `Autonomous submission engine completed ${urls.length} jobs.`,
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Error executing automated submissions.',
      });
    } finally {
      setRunningAction(null);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none max-w-7xl mx-auto pb-12">
      
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center shadow-sm">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-950 dark:text-white">Opportunity Stream</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Direct company ATS feeds cryptographically deduplicated from Greenhouse, Lever, and Ashby.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Stream vs Saved Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setActiveTab('stream')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'stream'
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Live Feed ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'saved'
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Bookmarks ({savedJobs.length})
            </button>
          </div>

          <button
            type="button"
            onClick={fetchCloudJobs}
            disabled={loading}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 p-2.5 rounded-xl transition-colors"
            title="Refresh Live ATS Feeds"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between animate-fade-up ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            )}
            <span className="font-semibold">{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Layout (Sidebar + Feed Cards) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Filter Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-950 dark:text-white" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-950 dark:text-white font-mono">Filters</h2>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-[10px] font-mono font-bold text-slate-500 hover:text-slate-950 dark:hover:text-white underline"
              >
                Reset All ({activeFilterCount})
              </button>
            )}
          </div>

          {/* Match Score Filter */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">ATS Match Score</label>
            <div className="space-y-1 text-xs">
              {[
                { id: 'all', label: 'All Match Scores' },
                { id: 'high', label: 'High Match (80%+)' },
                { id: 'good', label: 'Good Match (60%+)' },
              ].map(opt => (
                <label key={opt.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-slate-950 dark:hover:text-white">
                  <input
                    type="radio"
                    name="matchTier"
                    checked={filters.matchTier === opt.id}
                    onChange={() => setFilters(f => ({ ...f, matchTier: opt.id }))}
                    className="w-3 h-3 text-slate-950 accent-slate-950 dark:accent-white"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Workplace Type */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Workplace</label>
            <div className="space-y-1 text-xs">
              {[
                { id: 'all', label: 'All Locations' },
                { id: 'remote', label: 'Remote Only' },
                { id: 'hybrid', label: 'Hybrid' },
                { id: 'onsite', label: 'Onsite / Office' },
              ].map(opt => (
                <label key={opt.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-slate-950 dark:hover:text-white">
                  <input
                    type="radio"
                    name="workplace"
                    checked={filters.workplace === opt.id}
                    onChange={() => setFilters(f => ({ ...f, workplace: opt.id }))}
                    className="w-3 h-3 text-slate-950 accent-slate-950 dark:accent-white"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Job Type */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Position Type</label>
            <div className="space-y-1 text-xs">
              {[
                { id: 'all', label: 'All Types' },
                { id: 'job', label: 'Full-time Jobs' },
                { id: 'internship', label: 'Internships & Trainees' },
              ].map(opt => (
                <label key={opt.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-slate-950 dark:hover:text-white">
                  <input
                    type="radio"
                    name="type"
                    checked={filters.type === opt.id}
                    onChange={() => setFilters(f => ({ ...f, type: opt.id }))}
                    className="w-3 h-3 text-slate-950 accent-slate-950 dark:accent-white"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Experience Level */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Experience Level</label>
            <div className="space-y-1 text-xs">
              {[
                { id: 'all', label: 'All Levels' },
                { id: 'entry', label: 'Entry / Fresher' },
                { id: 'mid', label: 'Mid-Level' },
                { id: 'senior', label: 'Senior / Lead' },
              ].map(opt => (
                <label key={opt.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-slate-950 dark:hover:text-white">
                  <input
                    type="radio"
                    name="experience"
                    checked={filters.experience === opt.id}
                    onChange={() => setFilters(f => ({ ...f, experience: opt.id }))}
                    className="w-3 h-3 text-slate-950 accent-slate-950 dark:accent-white"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ATS Source */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">ATS API Ingest</label>
            <div className="space-y-1 text-xs">
              {[
                { id: 'all', label: 'All Sources' },
                { id: 'greenhouse', label: 'Greenhouse' },
                { id: 'lever', label: 'Lever' },
                { id: 'ashby', label: 'Ashby' },
              ].map(opt => (
                <label key={opt.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-slate-950 dark:hover:text-white">
                  <input
                    type="radio"
                    name="source"
                    checked={filters.source === opt.id}
                    onChange={() => setFilters(f => ({ ...f, source: opt.id }))}
                    className="w-3 h-3 text-slate-950 accent-slate-950 dark:accent-white"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Feed Stream */}
        <div className="flex-1 w-full space-y-4">
          
          {/* Search Bar & Multi-Select Action Strip */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search roles, companies, or tech keywords..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {filteredJobs.length > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    {selectedUrls.size === filteredJobs.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                    <span>Select All ({selectedUrls.size})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLaunchSemiAuto()}
                    disabled={selectedUrls.size === 0 || runningAction !== null}
                    className="bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-40 shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Auto-Apply ({selectedUrls.size})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Active Filter Chips Banner */}
            {activeFilterCount > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mr-1">Active:</span>
                {activeFilterEntries.map(([k, val]) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-800 dark:text-slate-200"
                  >
                    <span>{k}: <strong>{val}</strong></span>
                    <button
                      type="button"
                      onClick={() => setFilters(f => ({ ...f, [k]: 'all' }))}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-950 dark:hover:text-white underline ml-1"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Jobs List / Actionable Empty State */}
          {filteredJobs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-10 sm:p-14 text-center space-y-5 shadow-sm">
              <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white">No active positions match your criteria</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {activeFilterCount > 0
                    ? `Your ${activeFilterCount} active filters narrowed the stream to 0 results.`
                    : 'There are currently no listings in this pool.'}
                </p>
              </div>

              {/* Actionable Quick Fixes */}
              {activeFilterCount > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    Suggested Quick Fixes:
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    {filters.matchTier !== 'all' && (
                      <button
                        onClick={() => setFilters(f => ({ ...f, matchTier: 'all' }))}
                        className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 font-semibold text-slate-800 dark:text-slate-200"
                      >
                        Expand to all match scores
                      </button>
                    )}
                    {filters.workplace !== 'all' && (
                      <button
                        onClick={() => setFilters(f => ({ ...f, workplace: 'all' }))}
                        className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 font-semibold text-slate-800 dark:text-slate-200"
                      >
                        Show Hybrid &amp; Onsite roles
                      </button>
                    )}
                    {filters.experience !== 'all' && (
                      <button
                        onClick={() => setFilters(f => ({ ...f, experience: 'all' }))}
                        className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 font-semibold text-slate-800 dark:text-slate-200"
                      >
                        Include all experience tiers
                      </button>
                    )}
                  </div>

                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="px-5 py-2.5 bg-slate-950 text-white dark:bg-white dark:text-slate-950 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
                    >
                      Clear All Filters ({jobs.length} total available)
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map(job => {
                const isSaved = savedJobs.some(j => j.applyUrl === job.applyUrl);
                const isSelected = selectedUrls.has(job.applyUrl);
                const score = job.score ?? 50;

                return (
                  <div
                    key={job.applyUrl}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700 ${
                      isSelected
                        ? 'border-slate-950 dark:border-white ring-1 ring-slate-950 dark:ring-white'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      {/* Left: Checkbox + Job Details */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleSelectUrl(job.applyUrl)}
                          className="mt-1 text-slate-400 hover:text-slate-950 dark:hover:text-white shrink-0"
                        >
                          {isSelected ? <CheckSquare className="w-4 h-4 text-slate-950 dark:text-white" /> : <Square className="w-4 h-4" />}
                        </button>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs font-mono uppercase tracking-wider text-slate-950 dark:text-white">
                              {job.company}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {job.source}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              score >= 80 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {score}% Match
                            </span>
                          </div>

                          <h3
                            onClick={() => setViewingJob(job)}
                            className="text-sm font-bold text-slate-950 dark:text-white hover:underline cursor-pointer truncate"
                          >
                            {job.title}
                          </h3>

                          <div className="flex items-center gap-3 text-xs text-slate-500 font-mono flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" /> {job.location || 'Remote'}
                            </span>
                            <span>·</span>
                            <span className="capitalize">{job.workplaceType || 'Remote'}</span>
                            {job.salary && (
                              <>
                                <span>·</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{job.salary}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSaveJob(job)}
                          className={`p-2 rounded-xl border transition-colors ${
                            isSaved
                              ? 'bg-slate-950 text-white border-slate-950 dark:bg-white dark:text-slate-950'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400'
                          }`}
                          title={isSaved ? 'Remove Bookmark' : 'Bookmark Position'}
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>

                        {onNavigateToOutreach && (
                          <button
                            type="button"
                            onClick={() => onNavigateToOutreach(job.company, job.title)}
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
                            title="Find Hiring Manager for this company"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                            <span className="hidden xl:inline">Find Recruiter</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleLaunchSemiAuto([job.applyUrl])}
                          className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>1-Click Apply</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Viewing Job Detail Modal Drawer */}
      {viewingJob && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-fade-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">{viewingJob.company}</span>
                <h2 className="text-lg font-extrabold text-slate-950 dark:text-white mt-0.5">{viewingJob.title}</h2>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mt-1">
                  <span>{viewingJob.location}</span>
                  <span>·</span>
                  <span>{viewingJob.source}</span>
                  <span>·</span>
                  <span className="text-emerald-700 font-bold">{viewingJob.score}% Match</span>
                </div>
              </div>
              <button
                onClick={() => setViewingJob(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">Position Overview</h4>
              <p>{viewingJob.description || 'Full job posting details accessible directly via verified company career portal.'}</p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <a
                href={viewingJob.applyUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-slate-600 hover:text-slate-950 dark:hover:text-white flex items-center gap-1.5 underline"
              >
                <span>Open Original Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleToggleSaveJob(viewingJob);
                  }}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {savedJobs.some(j => j.applyUrl === viewingJob.applyUrl) ? 'Bookmarked ✓' : 'Bookmark'}
                </button>

                <button
                  onClick={() => {
                    const url = viewingJob.applyUrl;
                    setViewingJob(null);
                    handleLaunchSemiAuto([url]);
                  }}
                  className="px-4 py-2 bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Launch Application</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
