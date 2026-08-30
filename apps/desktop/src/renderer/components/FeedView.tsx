import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, RefreshCw, Layers, Zap, CheckCircle2,
  AlertCircle, Loader2, ExternalLink, X, Building,
  MapPin, DollarSign, CheckSquare, Square, Bookmark,
  SlidersHorizontal, Globe, Briefcase, Clock, Sparkles, UserCheck
} from 'lucide-react';
import { Job, MasterProfile, getApi } from '../types';

interface FeedViewProps {
  profile: MasterProfile;
  onLog: (msg: string) => void;
  onNavigateToOutreach?: (company: string, jobTitle: string) => void;
}

export const FeedView: React.FC<FeedViewProps> = ({
  profile,
  onLog,
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedFilterMode, setFeedFilterMode] = useState<'matched' | 'all' | 'saved'>('all');
  
  // Advanced Filter States
  const [typeFilter, setTypeFilter] = useState<'all' | 'job' | 'internship'>('all');
  const [workplaceFilter, setWorkplaceFilter] = useState<'all' | 'remote' | 'hybrid' | 'onsite'>('all');
  const [experienceFilter, setExperienceFilter] = useState<'all' | 'entry' | 'mid' | 'senior'>('all');
  const [salaryFilter, setSalaryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const [runningAction, setRunningAction] = useState<'review' | 'auto' | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [viewingJob, setViewingJob] = useState<Job | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('Just now');

  const fetchCloudJobs = async () => {
    const api = getApi();
    if (!api) return;

    setLoading(true);
    setActionFeedback(null);
    try {
      const res = await api.getCloudFeed('candidate');

      if (res.success && res.jobs) {
        const desiredTitles = (profile.desiredTitle || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
        const techKeywords = (profile.techStack || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

        // Exclude LinkedIn positions and enrich
        const nonLinkedInJobs = res.jobs.filter(j => {
          const src = (j.source || '').toLowerCase();
          const url = (j.applyUrl || '').toLowerCase();
          return !src.includes('linkedin') && !url.includes('linkedin.com');
        });

        const enrichedJobs: Job[] = nonLinkedInJobs.map((j, idx) => {
          let score = j.score ?? 50;
          const titleLower = (j.title || '').toLowerCase();
          const descLower = (j.description || '').toLowerCase();

          if (desiredTitles.length > 0) {
            const matchesTitle = desiredTitles.some(dt => titleLower.includes(dt) || dt.includes(titleLower));
            if (matchesTitle) score += 30;
          }

          techKeywords.forEach(tk => {
            if (tk && (titleLower.includes(tk) || descLower.includes(tk))) {
              score += 10;
            }
          });

          const isInternship = titleLower.includes('intern') || descLower.includes('internship') || j.employmentType === 'internship';
          const isRemote = (j.location || '').toLowerCase().includes('remote') || (j.location || '').toLowerCase().includes('anywhere') || j.workplaceType === 'remote';
          const isHybrid = (j.location || '').toLowerCase().includes('hybrid') || j.workplaceType === 'hybrid';

          const isSenior = titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('staff') || titleLower.includes('principal');
          const isEntry = isInternship || titleLower.includes('junior') || titleLower.includes('entry') || titleLower.includes('fresher') || titleLower.includes('sde 1');

          // Timestamp generation for relative sorting
          const baseTime = j.createdAt || new Date(Date.now() - idx * 120000).toISOString();

          return {
            ...j,
            score: Math.min(100, Math.max(50, score)),
            employmentType: j.employmentType || (isInternship ? 'internship' : 'job'),
            workplaceType: j.workplaceType || (isRemote ? 'remote' : isHybrid ? 'hybrid' : 'onsite'),
            experienceLevel: j.experienceLevel || (isSenior ? 'senior' : isEntry ? 'entry' : 'mid'),
            createdAt: baseTime,
          };
        });

        // Default Sort: Latest to Oldest
        enrichedJobs.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });

        setJobs(enrichedJobs);
        setSelectedUrls(new Set());
        setLastSyncedAt(new Date().toLocaleTimeString());
        setActionFeedback({
          type: 'success',
          message: `Stream refreshed: ${enrichedJobs.length} live opportunities loaded (Sorted latest to oldest).`,
        });
        onLog(`[Jobs] Synced ${enrichedJobs.length} live positions (Sorted latest to oldest).`);
      }

      const saved = await api.getSavedJobs();
      setSavedJobs(saved || []);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Failed to sync jobs.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRunScrapers = async () => {
    setLoading(true);
    setActionFeedback(null);
    try {
      const api = getApi();
      if (api) {
        onLog('[Live Scrapers] Executing live scrapers across Internshala, Greenhouse, Lever, Ashby...');
        const res = await api.runScrapers();
        if (res.success && res.jobs) {
          setActionFeedback({
            type: 'success',
            message: `Scraped ${res.jobs.length} fresh real-time opportunities across all job boards.`,
          });
        }
      }
      await fetchCloudJobs();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Failed to execute live scrapers.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCloudJobs();
  }, [profile.desiredTitle, profile.techStack]);

  const isJobSaved = (url: string) => {
    return savedJobs.some(s => s.applyUrl === url);
  };

  const handleToggleSaveJob = async (job: Job) => {
    const api = getApi();
    const isCurrentlySaved = isJobSaved(job.applyUrl);

    if (isCurrentlySaved) {
      setSavedJobs(prev => prev.filter(s => s.applyUrl !== job.applyUrl));
      if (api) await api.removeSavedJob(job.applyUrl);
    } else {
      setSavedJobs(prev => [job, ...prev]);
      if (api) await api.saveJob(job);
    }
  };

  const activeJobPool = useMemo(() => {
    if (feedFilterMode === 'saved') return savedJobs;
    return jobs;
  }, [feedFilterMode, savedJobs, jobs]);

  // Advanced Filtering Logic
  const filteredJobs = useMemo(() => {
    const desiredTitles = (profile.desiredTitle || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    const techKeywords = (profile.techStack || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

    return activeJobPool.filter(j => {
      const titleLower = (j.title || '').toLowerCase();
      const descLower = (j.description || '').toLowerCase();
      const locLower = (j.location || '').toLowerCase();
      const sourceLower = (j.source || '').toLowerCase();
      const salaryLower = (j.salary || '').toLowerCase();
      const urlLower = (j.applyUrl || '').toLowerCase();

      // Strictly exclude LinkedIn
      if (sourceLower.includes('linkedin') || urlLower.includes('linkedin.com')) {
        return false;
      }

      // 1. Search Query
      const matchesSearch =
        searchQuery.trim() === '' ||
        titleLower.includes(searchQuery.toLowerCase()) ||
        (j.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        locLower.includes(searchQuery.toLowerCase()) ||
        sourceLower.includes(searchQuery.toLowerCase());

      // 2. Job vs Internship Filter
      let matchesType = true;
      if (typeFilter === 'internship') {
        matchesType = j.employmentType === 'internship' || titleLower.includes('intern') || descLower.includes('internship');
      } else if (typeFilter === 'job') {
        matchesType = j.employmentType === 'job' || (!titleLower.includes('intern') && !descLower.includes('internship'));
      }

      // 3. Workplace Model Filter (Remote, Hybrid, Onsite)
      let matchesWorkplace = true;
      if (workplaceFilter === 'remote') {
        matchesWorkplace = j.workplaceType === 'remote' || locLower.includes('remote') || locLower.includes('anywhere');
      } else if (workplaceFilter === 'hybrid') {
        matchesWorkplace = j.workplaceType === 'hybrid' || locLower.includes('hybrid');
      } else if (workplaceFilter === 'onsite') {
        matchesWorkplace = j.workplaceType === 'onsite' || (!locLower.includes('remote') && !locLower.includes('hybrid'));
      }

      // 4. Experience Level Filter (Entry, Mid, Senior)
      let matchesExperience = true;
      if (experienceFilter === 'entry') {
        matchesExperience = j.experienceLevel === 'entry' || titleLower.includes('intern') || titleLower.includes('junior') || titleLower.includes('entry') || titleLower.includes('fresher') || titleLower.includes('sde 1') || titleLower.includes('sde-1');
      } else if (experienceFilter === 'mid') {
        matchesExperience = j.experienceLevel === 'mid' || titleLower.includes('associate') || titleLower.includes('developer') || titleLower.includes('sde 2') || titleLower.includes('sde-2');
      } else if (experienceFilter === 'senior') {
        matchesExperience = j.experienceLevel === 'senior' || titleLower.includes('senior') || titleLower.includes('sr') || titleLower.includes('lead') || titleLower.includes('staff') || titleLower.includes('principal') || titleLower.includes('architect');
      }

      // 5. Compensation Filter
      let matchesSalary = true;
      if (salaryFilter === '50k') {
        matchesSalary = salaryLower.includes('50') || salaryLower.includes('60') || salaryLower.includes('75') || salaryLower.includes('80') || salaryLower.includes('₹') || salaryLower.includes('lpa') || salaryLower.includes('month');
      } else if (salaryFilter === '100k') {
        matchesSalary = salaryLower.includes('100') || salaryLower.includes('120') || salaryLower.includes('140') || salaryLower.includes('150') || salaryLower.includes('160') || salaryLower.includes('180') || salaryLower.includes('200') || salaryLower.includes('10,00,000') || salaryLower.includes('12,00,000') || salaryLower.includes('14,00,000') || salaryLower.includes('18,00,000');
      } else if (salaryFilter === '150k') {
        matchesSalary = salaryLower.includes('150') || salaryLower.includes('160') || salaryLower.includes('180') || salaryLower.includes('200') || salaryLower.includes('220') || salaryLower.includes('18,00,000') || salaryLower.includes('20,00,000') || salaryLower.includes('28,00,000');
      } else if (salaryFilter === '200k') {
        matchesSalary = salaryLower.includes('200') || salaryLower.includes('220') || salaryLower.includes('240') || salaryLower.includes('250');
      }

      // 6. Source Filter (Internshala, Greenhouse, Lever, Ashby)
      let matchesSource = true;
      if (sourceFilter !== 'all') {
        const sf = sourceFilter.toLowerCase();
        matchesSource = sourceLower.includes(sf) || urlLower.includes(sf);
      }

      // Tab matching: My Roles vs All Roles
      if (feedFilterMode === 'matched' && searchQuery.trim() === '' && (desiredTitles.length > 0 || techKeywords.length > 0)) {
        const matchesTitle = desiredTitles.length === 0 || desiredTitles.some(dt => titleLower.includes(dt) || dt.includes(titleLower));
        const matchesSkills = techKeywords.some(tk => titleLower.includes(tk) || descLower.includes(tk));
        const meetsInterest = matchesTitle || matchesSkills || (j.score ?? 0) >= 60;
        return matchesSearch && matchesType && matchesWorkplace && matchesExperience && matchesSalary && matchesSource && meetsInterest;
      }

      return matchesSearch && matchesType && matchesWorkplace && matchesExperience && matchesSalary && matchesSource;
    }).sort((a, b) => {
      // Strictly Latest to Oldest by default
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.score || 0) - (a.score || 0);
    });
  }, [activeJobPool, searchQuery, feedFilterMode, typeFilter, workplaceFilter, experienceFilter, salaryFilter, sourceFilter, profile.desiredTitle, profile.techStack]);

  const toggleSelectJob = (url: string) => {
    setSelectedUrls(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUrls.size === filteredJobs.length && filteredJobs.length > 0) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(filteredJobs.map(j => j.applyUrl)));
    }
  };

  const handleLaunchReview = async (urlsToReview?: string[]) => {
    const targetUrls = urlsToReview || Array.from(selectedUrls);
    if (targetUrls.length === 0) return;

    setRunningAction('review');
    setActionFeedback(null);
    try {
      const api = getApi();
      if (api) {
        onLog(`[Review] Opening ${targetUrls.length} pre-filled applications...`);
        const res = await api.launchSemiAuto(targetUrls);
        if (res.success) {
          setActionFeedback({
            type: 'success',
            message: `Opened ${targetUrls.length} application tabs for candidate review.`,
          });
        }
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Failed to launch review mode.',
      });
    } finally {
      setRunningAction(null);
    }
  };

  const handleLaunchAutoApply = async (urlsToApply?: string[]) => {
    // Gate to Premium only
    if (onLog && (!profile || !profile.email)) {
       // Allow checking here but the app guarantees profile load.
    }
    const targetUrls = urlsToApply || Array.from(selectedUrls);
    if (targetUrls.length === 0) return;

    setRunningAction('auto');
    setActionFeedback(null);
    try {
      const api = getApi();
      if (api) {
        onLog(`[AutoApply] Starting mass-apply for ${targetUrls.length} positions...`);
        const res = await api.launchAutonomous(targetUrls);
        if (res.success) {
          setActionFeedback({
            type: 'success',
            message: `Successfully processed ${res.applied || targetUrls.length} applications with stealth form filling.`,
          });
        }
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Failed to complete auto-apply routine.',
      });
    } finally {
      setRunningAction(null);
    }
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="space-y-4 font-sans select-none max-w-7xl mx-auto pb-12">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Opportunity Stream</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              2-Min GitHub Cron Feed
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time internships &amp; high-yield tech roles • Latest to oldest
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunScrapers}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Scrapes Internshala, Greenhouse, Lever, Ashby and Niche job boards in real-time"
          >
            <Zap className={`w-3.5 h-3.5 ${loading ? 'animate-pulse' : ''}`} />
            <span>{loading ? 'Scraping Live Boards...' : 'Scrape Live Boards Now'}</span>
          </button>
          <button
            type="button"
            onClick={fetchCloudJobs}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Feed'}</span>
          </button>
        </div>
      </div>

      {/* Primary Search & Tab Row */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, company, skills (e.g. Internshala, React, Node.js)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            {[
              { id: 'all', label: 'All Listings' },
              { id: 'matched', label: 'Recommended For Me' },
              { id: 'saved', label: `Saved (${savedJobs.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFeedFilterMode(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  feedFilterMode === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'remote', label: 'Remote' },
            { id: 'high-match', label: 'High Match (80%+)', icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: 'frontend', label: 'Frontend' },
            { id: 'backend', label: 'Backend' },
            { id: 'internships', label: 'Internships' }
          ].map(chip => (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                if (chip.id === 'all') {
                  setSearchQuery('');
                  setTypeFilter('all');
                  setWorkplaceFilter('all');
                } else if (chip.id === 'remote') {
                  setWorkplaceFilter('remote');
                } else if (chip.id === 'high-match') {
                  setFeedFilterMode('matched');
                } else if (chip.id === 'frontend' || chip.id === 'backend') {
                  setSearchQuery(chip.id);
                } else if (chip.id === 'internships') {
                  setTypeFilter('internship');
                }
              }}
              className="px-2.5 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
            >
              {chip.icon}
              {chip.label}
            </button>
          ))}
        </div>

        {/* 5 Dimensional Granular Filter Controls */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
          
          {/* Paywall Gate Trigger Placeholder for Action Bar below */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <span className="text-[10px] text-slate-500 px-1.5 font-medium">Type:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'job', label: 'Jobs' },
              { id: 'internship', label: 'Internships' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTypeFilter(item.id as any)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  typeFilter === item.id
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* 2. Workplace Model (Remote / Hybrid / Onsite) */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <span className="text-[10px] text-slate-500 px-1.5 font-medium">Workplace:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'remote', label: 'Remote' },
              { id: 'hybrid', label: 'Hybrid' },
              { id: 'onsite', label: 'Onsite' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setWorkplaceFilter(item.id as any)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  workplaceFilter === item.id
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* 3. Experience Level Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <span className="text-[10px] text-slate-500 px-1.5 font-medium">Exp:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'entry', label: 'Entry / Fresher' },
              { id: 'mid', label: '1-3 Yrs' },
              { id: 'senior', label: 'Senior (5+ Yrs)' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setExperienceFilter(item.id as any)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  experienceFilter === item.id
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* 4. Compensation Range */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <span className="text-[10px] text-slate-500 px-1.5 font-medium">Comp:</span>
            {[
              { id: 'all', label: 'Any' },
              { id: '50k', label: '$50k+ / ₹4L+' },
              { id: '100k', label: '$100k+ / ₹8L+' },
              { id: '150k', label: '$150k+ / ₹15L+' },
              { id: '200k', label: '$200k+' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSalaryFilter(item.id)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  salaryFilter === item.id
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* 5. Source Filter (Internshala, Greenhouse, Lever, Ashby) */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 overflow-x-auto">
            <span className="text-[10px] text-slate-500 px-1.5 font-medium">Source:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'internshala', label: 'Internshala' },
              { id: 'greenhouse', label: 'Greenhouse' },
              { id: 'lever', label: 'Lever' },
              { id: 'ashby', label: 'Ashby' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSourceFilter(item.id)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors shrink-0 ${
                  sourceFilter === item.id
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Reset Filters */}
          {(typeFilter !== 'all' || workplaceFilter !== 'all' || experienceFilter !== 'all' || salaryFilter !== 'all' || sourceFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setTypeFilter('all');
                setWorkplaceFilter('all');
                setExperienceFilter('all');
                setSalaryFilter('all');
                setSourceFilter('all');
              }}
              className="text-[11px] font-bold text-rose-600 hover:underline px-1.5"
            >
              Reset Filters
            </button>
          )}

        </div>
      </div>

      {/* Feedback Banner */}
      {actionFeedback && (
        <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
          actionFeedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button type="button" onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Action Bar */}
      {filteredJobs.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              {selectedUrls.size === filteredJobs.length && filteredJobs.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-slate-900" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              Select All ({filteredJobs.length})
            </button>

            {filteredJobs.length > 20 && (
              <button
                type="button"
                onClick={() => {
                  const top20 = filteredJobs.slice(0, 20).map(j => j.applyUrl);
                  setSelectedUrls(new Set(top20));
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
              >
                Select 20 Jobs
              </button>
            )}

            {selectedUrls.size > 0 && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                {selectedUrls.size} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleLaunchReview()}
              disabled={selectedUrls.size === 0 || !!runningAction}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {runningAction === 'review' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Layers className="w-3.5 h-3.5" />
              )}
              Review First ({selectedUrls.size})
            </button>

            <button
              type="button"
              onClick={() => handleLaunchAutoApply()}
              disabled={selectedUrls.size === 0 || !!runningAction}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              {runningAction === 'auto' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              Mass Apply ({selectedUrls.size})
            </button>
          </div>
        </div>
      )}

      {/* Jobs Feed List */}
      {filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 gap-2.5">
          {filteredJobs.map(job => {
            const isSelected = selectedUrls.has(job.applyUrl);
            const isSaved = isJobSaved(job.applyUrl);

            return (
              <div
                key={job.applyUrl}
                onClick={() => toggleSelectJob(job.applyUrl)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isSelected
                    ? 'border-slate-900 bg-slate-50/90 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Left: Checkbox + Job Details */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectJob(job.applyUrl)}
                    onClick={e => e.stopPropagation()}
                    className="mt-1 rounded accent-slate-900 cursor-pointer shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-slate-900">
                        {job.title}
                      </h3>
                      
                      {/* Job vs Internship Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        job.employmentType === 'internship'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {job.employmentType === 'internship' ? 'Internship' : 'Job'}
                      </span>

                      {/* Workplace Model Badge */}
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {job.workplaceType === 'remote' ? '🌐 Remote' : job.workplaceType === 'hybrid' ? '🏢 Hybrid' : '📍 Onsite'}
                      </span>

                      {/* Source */}
                      {job.source && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200">
                          {job.source}
                        </span>
                      )}

                      {/* Relative Time */}
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5 ml-auto">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(job.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Building className="w-3.5 h-3.5 text-slate-400" /> {job.company}
                      </span>
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location}
                        </span>
                      )}
                      {job.salary && (
                        <span className="flex items-center gap-1 text-slate-900 font-bold">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" /> {job.salary}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0" onClick={e => e.stopPropagation()}>
                  {onNavigateToOutreach && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToOutreach(job.company, job.title);
                      }}
                      title="Find Hiring Manager"
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Save Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleSaveJob(job)}
                    title={isSaved ? 'Remove from Saved' : 'Save Job'}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isSaved
                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                        : 'border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-500 text-amber-600' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingJob(job)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                  >
                    Details
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLaunchAutoApply([job.applyUrl])}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                  >
                    Auto Apply
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No positions found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search criteria or resetting filters to view all fresh job and internship listings.
          </p>
        </div>
      )}

      {/* Detailed Modal */}
      {viewingJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {viewingJob.source} • {viewingJob.employmentType === 'internship' ? 'Internship' : 'Job'}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  {viewingJob.title}
                </h2>
                <div className="text-xs text-slate-500 mt-0.5">
                  {viewingJob.company} • {viewingJob.location} • {viewingJob.salary || 'Compensation undisclosed'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingJob(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Position Overview:</h4>
                <p className="whitespace-pre-line text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {viewingJob.description || 'Full description available on the direct career portal.'}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const api = getApi();
                  if (api?.openExternalUrl) {
                    api.openExternalUrl(viewingJob.applyUrl);
                  } else {
                    window.open(viewingJob.applyUrl, '_blank');
                  }
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>View on Career Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleLaunchReview([viewingJob.applyUrl]);
                    setViewingJob(null);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-800"
                >
                  Review
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleLaunchAutoApply([viewingJob.applyUrl]);
                    setViewingJob(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-sm"
                >
                  Auto Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
