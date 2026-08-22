import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, RefreshCw, Layers, Zap, CheckCircle2,
  AlertCircle, Loader2, ExternalLink, X, Building,
  MapPin, DollarSign, CheckSquare, Square, Bookmark,
  SlidersHorizontal, Globe, Briefcase
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
  const [feedFilterMode, setFeedFilterMode] = useState<'matched' | 'all' | 'saved'>('matched');
  
  // Direct Filter States
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [salaryFilter, setSalaryFilter] = useState<string>('all');

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

        const enrichedJobs = res.jobs.map(j => {
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

          return {
            ...j,
            score: Math.min(100, Math.max(50, score)),
          };
        });

        const sorted = enrichedJobs.sort((a, b) => (b.score || 0) - (a.score || 0));
        setJobs(sorted);
        setSelectedUrls(new Set());
        setLastSyncedAt(new Date().toLocaleTimeString());
        onLog(`[Jobs] Synced ${sorted.length} positions.`);
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

  // Direct Filtering logic
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

      // Search query
      const matchesSearch =
        searchQuery.trim() === '' ||
        titleLower.includes(searchQuery.toLowerCase()) ||
        (j.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        locLower.includes(searchQuery.toLowerCase()) ||
        sourceLower.includes(searchQuery.toLowerCase());

      // Direct Location Filter
      let matchesLocation = true;
      if (locationFilter === 'remote') {
        matchesLocation = locLower.includes('remote') || locLower.includes('anywhere');
      } else if (locationFilter === 'us') {
        matchesLocation = locLower.includes('united states') || locLower.includes('us') || locLower.includes('usa');
      } else if (locationFilter === 'europe') {
        matchesLocation = locLower.includes('uk') || locLower.includes('europe') || locLower.includes('germany') || locLower.includes('london');
      }

      // Direct Source Filter (LinkedIn, Internshala, Greenhouse, Lever, Ashby)
      let matchesSource = true;
      if (sourceFilter !== 'all') {
        const sf = sourceFilter.toLowerCase();
        matchesSource = sourceLower.includes(sf) || urlLower.includes(sf);
      }

      // Direct Salary Filter
      let matchesSalary = true;
      if (salaryFilter === '100k') {
        matchesSalary = salaryLower.includes('100') || salaryLower.includes('120') || salaryLower.includes('140') || salaryLower.includes('150') || salaryLower.includes('180') || salaryLower.includes('200');
      } else if (salaryFilter === '150k') {
        matchesSalary = salaryLower.includes('150') || salaryLower.includes('160') || salaryLower.includes('180') || salaryLower.includes('200') || salaryLower.includes('220');
      } else if (salaryFilter === '200k') {
        matchesSalary = salaryLower.includes('200') || salaryLower.includes('220') || salaryLower.includes('250');
      }

      // Tab matching: My Roles vs All Roles
      if (feedFilterMode === 'matched' && searchQuery.trim() === '' && (desiredTitles.length > 0 || techKeywords.length > 0)) {
        const matchesTitle = desiredTitles.length === 0 || desiredTitles.some(dt => titleLower.includes(dt) || dt.includes(titleLower));
        const matchesSkills = techKeywords.some(tk => titleLower.includes(tk) || descLower.includes(tk));
        const meetsInterest = matchesTitle || matchesSkills || (j.score ?? 0) >= 60;
        return matchesSearch && matchesLocation && matchesSource && matchesSalary && meetsInterest;
      }

      return matchesSearch && matchesLocation && matchesSource && matchesSalary;
    });
  }, [activeJobPool, searchQuery, feedFilterMode, locationFilter, sourceFilter, salaryFilter, profile.desiredTitle, profile.techStack]);

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

  const handleLaunchReview = async (urlsToApply?: string[]) => {
    const api = getApi();
    if (!api) return;
    const targetUrls = urlsToApply || Array.from(selectedUrls);
    if (!targetUrls.length) return;

    setRunningAction('review');
    setActionFeedback(null);
    try {
      const res = await api.launchSemiAuto(targetUrls);
      if (res.success) {
        setActionFeedback({
          type: 'success',
          message: `Opened ${targetUrls.length} pre-filled tabs for review.`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: res.error || 'Failed to open tabs.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Error opening tabs.',
      });
    } finally {
      setRunningAction(null);
    }
  };

  const handleLaunchAutoApply = async (urlsToApply?: string[]) => {
    const api = getApi();
    if (!api) return;
    const targetUrls = urlsToApply || Array.from(selectedUrls);
    if (!targetUrls.length) return;

    setRunningAction('auto');
    setActionFeedback(null);
    try {
      const res = await api.launchAutonomous(targetUrls);
      if (res.success) {
        setActionFeedback({
          type: 'success',
          message: `Completed: Applied to ${res.applied || 0}/${targetUrls.length} jobs (batches of 20).`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: res.error || 'Failed to apply.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Error occurred while applying.',
      });
    } finally {
      setRunningAction(null);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        
        {/* Search Input + Sync Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search jobs by title, company, skills, or location..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>

          <button
            type="button"
            onClick={fetchCloudJobs}
            disabled={loading}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shrink-0 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Sync Jobs</span>
          </button>
        </div>

        {/* View Switcher: My Roles | All Roles | Saved Jobs */}
        <div className="flex items-center rounded-xl border border-slate-200 p-0.5 bg-slate-50">
          <button
            type="button"
            onClick={() => setFeedFilterMode('matched')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold text-center transition-all ${
              feedFilterMode === 'matched'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            My Target Roles ({jobs.filter(j => (j.score ?? 0) >= 60).length})
          </button>
          <button
            type="button"
            onClick={() => setFeedFilterMode('all')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold text-center transition-all ${
              feedFilterMode === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All Roles ({jobs.length})
          </button>
          <button
            type="button"
            onClick={() => setFeedFilterMode('saved')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1 transition-all ${
              feedFilterMode === 'saved'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Bookmark className="w-3 h-3 text-amber-500" />
            <span>Saved Jobs ({savedJobs.length})</span>
          </button>
        </div>

        {/* Direct Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Filters:
          </span>

          {/* Location Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <span className="text-[10px] text-slate-500 px-1.5 font-medium">Location:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'remote', label: 'Remote' },
              { id: 'us', label: 'US' },
              { id: 'europe', label: 'Europe' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLocationFilter(item.id)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  locationFilter === item.id
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 overflow-x-auto">
            <span className="text-[10px] text-slate-500 px-1.5 font-medium">Source:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'linkedin', label: 'LinkedIn' },
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

          {/* Salary Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <span className="text-[10px] text-slate-500 px-1.5 font-medium">Salary:</span>
            {[
              { id: 'all', label: 'Any' },
              { id: '100k', label: '$100k+' },
              { id: '150k', label: '$150k+' },
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

          {(locationFilter !== 'all' || sourceFilter !== 'all' || salaryFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setLocationFilter('all');
                setSourceFilter('all');
                setSalaryFilter('all');
              }}
              className="text-[11px] text-slate-400 hover:text-rose-600 underline ml-1"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Action Banner / Feedback */}
      {actionFeedback && (
        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
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
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-700 ml-3"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Multi-Select Action Bar */}
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

      {/* Jobs List */}
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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-slate-900 truncate">
                        {job.title}
                      </h3>
                      {job.source && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-600">
                          {job.source}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Building className="w-3.5 h-3.5 text-slate-400" /> {job.company}
                      </span>
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location}
                        </span>
                      )}
                      {job.salary && (
                        <span className="flex items-center gap-1 text-slate-800 font-bold">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" /> {job.salary}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0" onClick={e => e.stopPropagation()}>
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
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl p-6">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
            <Bookmark className="w-5 h-5 text-slate-400" />
          </div>
          <h3 className="text-xs font-bold text-slate-900">
            {feedFilterMode === 'saved' ? 'No Saved Jobs' : 'No Jobs Match Selected Filters'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {feedFilterMode === 'saved'
              ? 'Click the bookmark icon on any job card to save it here.'
              : 'Try clearing filters to see all available jobs.'}
          </p>
        </div>
      )}

      {/* Job Details Modal */}
      {viewingJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">{viewingJob.title}</h2>
                <p className="text-xs text-slate-500">{viewingJob.company}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingJob(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Source</span>
                  <span className="font-mono text-slate-700">{viewingJob.source || 'Direct'}</span>
                </div>
                {viewingJob.salary && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Salary</span>
                    <span className="font-bold text-slate-900">{viewingJob.salary}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Application Link</span>
                  <a
                    href={viewingJob.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-900 font-semibold underline truncate max-w-[280px] inline-flex items-center gap-1"
                  >
                    Open Link <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </div>
              </div>

              {viewingJob.description && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Job Description</h4>
                  <p className="leading-relaxed text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-line text-xs font-mono">
                    {viewingJob.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleToggleSaveJob(viewingJob);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center gap-1.5"
              >
                <Bookmark className={`w-3.5 h-3.5 ${isJobSaved(viewingJob.applyUrl) ? 'fill-amber-500 text-amber-600' : ''}`} />
                <span>{isJobSaved(viewingJob.applyUrl) ? 'Saved' : 'Save Job'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleLaunchReview([viewingJob.applyUrl]);
                  setViewingJob(null);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" /> Review First
              </button>
              <button
                type="button"
                onClick={() => {
                  handleLaunchAutoApply([viewingJob.applyUrl]);
                  setViewingJob(null);
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" /> Auto-Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
