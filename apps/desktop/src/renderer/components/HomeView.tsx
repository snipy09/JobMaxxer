import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase, Send, CheckCircle2, ArrowRight,
  Building, MapPin, DollarSign, Layers, Zap, Clock,
  ChevronRight, Search, Check, Bookmark, RefreshCw,
  Loader2, ExternalLink, Sparkles, CheckSquare, ShieldCheck, Laptop
} from 'lucide-react';
import { Job, Application, MasterProfile, TabType, getApi } from '../types';
import { CompleteProfileModal } from './CompleteProfileModal';

interface HomeViewProps {
  profile: MasterProfile;
  onUpdateProfile?: (p: MasterProfile) => void;
  onNavigate: (tab: TabType) => void;
  onLog: (msg: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  profile,
  onUpdateProfile,
  onNavigate,
  onLog,
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [applyingUrl, setApplyingUrl] = useState<string | null>(null);
  const [reviewingUrl, setReviewingUrl] = useState<string | null>(null);
  const [batchActionRunning, setBatchActionRunning] = useState<'apply' | 'review' | null>(null);
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'matched' | 'internship' | 'remote'>('matched');

  // Profile gatekeeper modal
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [pendingApplyAction, setPendingApplyAction] = useState<{ mode: 'autonomous' | 'semi-auto'; urls: string[] } | null>(null);

  const loadHomeData = async (showRefreshSpinner = false) => {
    const api = getApi();
    if (!api) {
      setLoading(false);
      return;
    }

    if (showRefreshSpinner) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Load dynamic applications from local SQLite
      const apps = await api.getApplications();
      setApplications(apps || []);

      // 2. Load live cloud & scraped feed
      const res = await api.getCloudFeed('candidate');
      if (res.success && res.jobs) {
        setJobs(res.jobs);
      }
    } catch (err: any) {
      console.error('Failed to load home data:', err);
      onLog(`[Home] Data sync error: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, [profile.desiredTitle, profile.techStack]);

  const matchedJobs = useMemo(() => {
    const desiredTitles = (profile.desiredTitle || '')
      .toLowerCase()
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const techKeywords = (profile.techStack || '')
      .toLowerCase()
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    return jobs.map(j => {
      let score = j.score ?? 50;
      const titleLower = (j.title || '').toLowerCase();
      const descLower = (j.description || '').toLowerCase();

      if (desiredTitles.length > 0) {
        const hasTitleMatch = desiredTitles.some(dt => titleLower.includes(dt) || dt.includes(titleLower));
        if (hasTitleMatch) score += 30;
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
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [jobs, profile.desiredTitle, profile.techStack]);

  const displayedJobs = useMemo(() => {
    let pool = matchedJobs;
    if (filterMode === 'matched') {
      const desiredTitles = (profile.desiredTitle || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
      const techKeywords = (profile.techStack || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
      if (desiredTitles.length > 0 || techKeywords.length > 0) {
        pool = matchedJobs.filter(j => (j.score || 0) >= 60);
        if (pool.length === 0) pool = matchedJobs;
      }
    } else if (filterMode === 'internship') {
      pool = matchedJobs.filter(j =>
        (j.employmentType === 'internship') ||
        (j.title || '').toLowerCase().includes('intern') ||
        (j.description || '').toLowerCase().includes('intern')
      );
    } else if (filterMode === 'remote') {
      pool = matchedJobs.filter(j =>
        (j.workplaceType === 'remote') ||
        (j.location || '').toLowerCase().includes('remote') ||
        (j.location || '').toLowerCase().includes('anywhere')
      );
    }
    return pool;
  }, [matchedJobs, filterMode, profile.desiredTitle, profile.techStack]);

  const recentTopJobs = displayedJobs.slice(0, 8);
  
  // Real-time Dynamic SQLite Metrics
  const totalApplied = applications.filter(a => a.mode !== 'outreach').length;
  const totalReferralsSent = applications.filter(a => a.mode === 'outreach').length;
  const totalAvailableCount = jobs.length;
  const hasGroqKey = Boolean(profile.groqApiKey && profile.groqApiKey.trim().length > 0);

  // Profile gatekeeper check before applying
  const checkProfileAndRun = async (urls: string[], mode: 'autonomous' | 'semi-auto') => {
    if (!urls || urls.length === 0) return;
    const api = getApi();
    let hasResume = Boolean(profile.resumeFilePath);
    if (!hasResume && api && api.getResumes) {
      try {
        const r = await api.getResumes();
        if (r && r.length > 0) hasResume = true;
      } catch {}
    }

    const isComplete = Boolean(
      profile.firstName &&
      profile.firstName.trim().length > 0 &&
      profile.phone &&
      profile.phone.trim().length > 0 &&
      hasResume
    );

    if (!isComplete) {
      setPendingApplyAction({ mode, urls });
      setShowProfileModal(true);
      return;
    }

    if (mode === 'autonomous') {
      if (urls.length === 1) handleQuickApply(urls[0]);
      else handleBatchTopApply();
    } else {
      if (urls.length === 1) handleQuickReview(urls[0]);
    }
  };

  const handleProfileModalCompleted = () => {
    if (pendingApplyAction) {
      const { mode, urls } = pendingApplyAction;
      setPendingApplyAction(null);
      if (mode === 'autonomous') {
        if (urls.length === 1) handleQuickApply(urls[0]);
        else handleBatchTopApply();
      } else {
        if (urls.length === 1) handleQuickReview(urls[0]);
      }
    }
  };

  const handleQuickApply = async (url: string) => {
    const api = getApi();
    if (!api) return;
    setApplyingUrl(url);
    setActionToast(null);
    onLog(`[Auto-Apply] Spawning Google Chrome instance for: ${url}`);
    
    try {
      const res = await api.launchAutonomous([url]);
      if (res.success) {
        setActionToast({
          type: 'success',
          message: `Application submitted successfully in Chrome session.`,
        });
        await loadHomeData(false);
      } else {
        setActionToast({
          type: 'error',
          message: res.error || 'Submission finished with notice.',
        });
      }
    } catch (err: any) {
      setActionToast({
        type: 'error',
        message: err?.message || 'Failed to complete auto-apply routine.',
      });
    } finally {
      setApplyingUrl(null);
    }
  };

  const handleQuickReview = async (url: string) => {
    const api = getApi();
    if (!api) return;
    setReviewingUrl(url);
    setActionToast(null);
    onLog(`[Review Mode] Opening pre-filled Chrome tab for: ${url}`);

    try {
      const res = await api.launchSemiAuto([url]);
      if (res.success) {
        setActionToast({
          type: 'success',
          message: `Opened pre-filled Chrome tab with matching resume.`,
        });
        await loadHomeData(false);
      } else {
        setActionToast({
          type: 'error',
          message: res.error || 'Failed to open review window.',
        });
      }
    } catch (err: any) {
      setActionToast({
        type: 'error',
        message: err?.message || 'Error launching review mode.',
      });
    } finally {
      setReviewingUrl(null);
    }
  };

  const handleBatchTopApply = async () => {
    const targetUrls = recentTopJobs.slice(0, 5).map(j => j.applyUrl);
    if (targetUrls.length === 0) return;
    const api = getApi();
    if (!api) return;

    setBatchActionRunning('apply');
    setActionToast(null);
    onLog(`[Auto-Apply] Starting batch application for top ${targetUrls.length} positions in Chrome...`);

    try {
      const res = await api.launchAutonomous(targetUrls);
      if (res.success) {
        setActionToast({
          type: 'success',
          message: `Batch complete: Processed ${res.applied ?? targetUrls.length} applications.`,
        });
        await loadHomeData(false);
      }
    } catch (err: any) {
      setActionToast({
        type: 'error',
        message: err?.message || 'Batch apply error.',
      });
    } finally {
      setBatchActionRunning(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Welcome Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Welcome, {profile.firstName || 'Candidate'}
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Desktop Feed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Targeting: <span className="font-semibold text-slate-700">{profile.desiredTitle || 'All Software Engineering Positions'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadHomeData(true)}
            disabled={loading || refreshing}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Refresh SQLite metrics and live feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Sync Feed'}</span>
          </button>

          <button
            type="button"
            onClick={() => checkProfileAndRun(recentTopJobs.slice(0, 5).map(j => j.applyUrl), 'autonomous')}
            disabled={batchActionRunning !== null || recentTopJobs.length === 0}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs"
          >
            {batchActionRunning === 'apply' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Applying in Chrome...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Auto Apply Top 5</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Action Toast / Feedback */}
      {actionToast && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
            actionToast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Zap className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{actionToast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionToast(null)}
            className="text-xs text-slate-400 hover:text-slate-700 font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Jobs Applied */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Jobs Applied</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {totalApplied}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Recorded in local SQLite</p>
        </div>

        {/* Referrals Sent */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Referrals Sent</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 border border-slate-200">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {totalReferralsSent}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Verified hiring managers</p>
        </div>

        {/* Available Jobs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Available Jobs</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 border border-blue-100">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {totalAvailableCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Greenhouse, Lever, Ashby, Internshala</p>
        </div>

        {/* Auto-Fill Engine Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Auto-Fill Engine</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-100">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-2 flex items-center gap-2">
            <span>Active</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {hasGroqKey ? 'AI Enhanced (Neural Model + Heuristics)' : 'Active (Profile & ATS Heuristics)'}
          </p>
        </div>
      </div>

      {/* Targeted Positions Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        
        {/* Section Header & Sub-filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Targeted Opportunities</span>
              <span className="text-xs font-normal text-slate-500 font-mono">
                ({displayedJobs.length} positions)
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Spawns visible Google Chrome with anti-bot stealth &amp; automated resume upload.
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterMode('matched')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filterMode === 'matched'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Top Matches
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filterMode === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Roles
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('internship')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filterMode === 'internship'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Internships
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('remote')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filterMode === 'remote'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Remote
            </button>
            <button
              type="button"
              onClick={() => onNavigate('feed')}
              className="text-xs font-bold text-slate-900 hover:text-slate-700 flex items-center gap-0.5 ml-2 transition-colors"
            >
              <span>Explore Stream</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Job List */}
        {recentTopJobs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentTopJobs.map((job, idx) => {
              const isApplying = applyingUrl === job.applyUrl;
              const isReviewing = reviewingUrl === job.applyUrl;

              return (
                <div
                  key={job.applyUrl || idx}
                  className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/80 p-2.5 rounded-xl transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-slate-900 truncate">
                        {job.title}
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {job.score}% Match
                      </span>
                      {job.source && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {job.source}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-slate-800">
                        <Building className="w-3 h-3 text-slate-400" /> {job.company}
                      </span>
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" /> {job.location}
                        </span>
                      )}
                      {job.salary && (
                        <span className="flex items-center gap-1 text-slate-800 font-semibold">
                          <DollarSign className="w-3 h-3 text-slate-400" /> {job.salary}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => checkProfileAndRun([job.applyUrl], 'semi-auto')}
                      disabled={isReviewing || isApplying}
                      className="border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      title="Opens Chrome, auto-attaches matching resume, and pre-fills form for 1-click candidate review"
                    >
                      {isReviewing ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Opening Chrome...</span>
                        </>
                      ) : (
                        <span>Review Mode</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => checkProfileAndRun([job.applyUrl], 'autonomous')}
                      disabled={isApplying || isReviewing}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                      title="Spawns maximized Chrome, fills all fields with anti-bot stealth, attaches resume, and submits"
                    >
                      {isApplying ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Applying in Chrome...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 text-amber-300" />
                          <span>Auto Apply</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-xs text-slate-500 space-y-2">
            <Briefcase className="w-6 h-6 mx-auto text-slate-300" />
            <p className="font-medium">
              {loading ? 'Syncing live opportunities from cloud...' : 'No positions currently matching this filter.'}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('feed')}
              className="text-xs text-slate-950 hover:underline font-bold"
            >
              Open Full Job Board →
            </button>
          </div>
        )}
      </div>

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
