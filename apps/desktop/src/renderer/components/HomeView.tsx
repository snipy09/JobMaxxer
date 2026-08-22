import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase, Send, CheckCircle2, ArrowRight,
  Building, MapPin, DollarSign, Layers, Zap, Clock,
  ChevronRight, Search, Check, Bookmark
} from 'lucide-react';
import { Job, Application, MasterProfile, TabType, getApi } from '../types';

interface HomeViewProps {
  profile: MasterProfile;
  onNavigate: (tab: TabType) => void;
  onLog: (msg: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  profile,
  onNavigate,
  onLog,
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadHomeData = async () => {
      const api = getApi();
      if (!api) {
        setLoading(false);
        return;
      }

      try {
        const apps = await api.getApplications();
        setApplications(apps || []);

        const res = await api.getCloudFeed('candidate');
        if (res.success && res.jobs) {
          setJobs(res.jobs);
        }
      } catch (err: any) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  const matchedJobs = useMemo(() => {
    const desiredTitles = (profile.desiredTitle || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    const techKeywords = (profile.techStack || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

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
    .filter(j => {
      if (desiredTitles.length > 0) {
        const titleLower = (j.title || '').toLowerCase();
        const matchesTitle = desiredTitles.some(dt => titleLower.includes(dt) || dt.includes(titleLower));
        const matchesSkills = techKeywords.some(tk => titleLower.includes(tk) || (j.description || '').toLowerCase().includes(tk));
        return matchesTitle || matchesSkills || (j.score || 0) >= 60;
      }
      return true;
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [jobs, profile.desiredTitle, profile.techStack]);

  const recentTopJobs = matchedJobs.slice(0, 6);
  const totalApplied = applications.length;
  const totalEmailsSent = applications.filter(a => a.mode === 'outreach' || a.mode === 'autonomous').length;
  const candidateName = profile.firstName || 'Candidate';

  const handleQuickApply = async (url: string) => {
    const api = getApi();
    if (!api) return;
    onLog(`[Auto-Apply] Launching application for: ${url}`);
    await api.launchAutonomous([url]);
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Jobs Applied</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {totalApplied}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total submitted</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Referrals Sent</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {totalEmailsSent}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Direct outreach</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Available Jobs</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {matchedJobs.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Matching your profile</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Auto-Fill</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {profile.groqApiKey ? 'Active' : 'Offline'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {profile.groqApiKey ? 'Fast Answering' : 'Q&A Rules'}
          </p>
        </div>
      </div>

      {/* Recent Matched Jobs Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Recent Targeted Positions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Filtered for your desired title and skills.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('feed')}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 transition-colors"
          >
            <span>View All ({matchedJobs.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Job List */}
        {recentTopJobs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentTopJobs.map((job, idx) => (
              <div
                key={job.applyUrl || idx}
                className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/70 p-2 rounded-lg transition-colors"
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

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Building className="w-3 h-3 text-slate-400" /> {job.company}
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> {job.location}
                      </span>
                    )}
                    {job.salary && (
                      <span className="flex items-center gap-1 text-slate-800 font-bold">
                        <DollarSign className="w-3 h-3 text-slate-400" /> {job.salary}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQuickApply(job.applyUrl)}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Auto Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-slate-500">
            {loading ? 'Loading jobs...' : 'No jobs found matching your role. Update your target title in Settings.'}
          </div>
        )}
      </div>
    </div>
  );
};
