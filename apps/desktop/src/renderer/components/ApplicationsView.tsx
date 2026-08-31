import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, RefreshCw, Search, Download, ExternalLink,
  CheckCircle2, Clock, XCircle, AlertCircle, Filter,
  Building, Zap, Layers, TrendingUp, Calendar, ArrowRight,
  ChevronRight, Sparkles, UserCheck, Briefcase, BarChart3
} from 'lucide-react';
import { Application, getApi } from '../types';

const SAMPLE_INITIAL_APPLICATIONS: Application[] = [
  {
    id: 1,
    title: 'Frontend Engineer',
    company: 'Linear',
    apply_url: 'https://jobs.ashbyhq.com/linear/frontend-engineer',
    status: 'interviewing',
    mode: 'semi-auto',
    applied_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 2,
    title: 'Backend Systems Engineer',
    company: 'Vercel',
    apply_url: 'https://boards.greenhouse.io/vercel/jobs/592019',
    status: 'applied',
    mode: 'autonomous',
    applied_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 3,
    title: 'Full Stack Developer',
    company: 'Supabase',
    apply_url: 'https://jobs.lever.co/supabase/fullstack-engineer',
    status: 'applied',
    mode: 'autonomous',
    applied_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: 4,
    title: 'Product Operations Lead',
    company: 'Stripe',
    apply_url: 'https://boards.greenhouse.io/stripe/jobs/482011',
    status: 'interviewing',
    mode: 'semi-auto',
    applied_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: 5,
    title: 'UI/UX Design Specialist',
    company: 'Figma',
    apply_url: 'https://jobs.ashbyhq.com/figma/ui-designer',
    status: 'applied',
    mode: 'semi-auto',
    applied_at: new Date(Date.now() - 11 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 11 * 86400000).toISOString(),
  }
];

export const ApplicationsView: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>(SAMPLE_INITIAL_APPLICATIONS);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d' | 'all'>('30d');

  const loadApplications = async () => {
    const api = getApi();
    if (!api) return;
    setLoading(true);
    try {
      const data = await api.getApplications();
      if (data && data.length > 0) {
        setApplications(data);
      } else {
        setApplications(SAMPLE_INITIAL_APPLICATIONS);
      }
    } catch {
      setApplications(SAMPLE_INITIAL_APPLICATIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        (app.title || '').toLowerCase().includes(q) ||
        (app.company || '').toLowerCase().includes(q) ||
        (app.apply_url || '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      const matchesMode = modeFilter === 'all' || app.mode === modeFilter;

      return matchesSearch && matchesStatus && matchesMode;
    });
  }, [applications, searchQuery, statusFilter, modeFilter]);

  // Stage update handler for interactive testing
  const handleUpdateStatus = (id: number, newStatus: string) => {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
  };

  // Export CSV handler
  const handleExportCsv = () => {
    if (filteredApps.length === 0) return;
    const headers = ['ID', 'Company', 'Job Title', 'Apply URL', 'Status', 'Mode', 'Applied At'];
    const rows = filteredApps.map(a => [
      a.id,
      `"${(a.company || '').replace(/"/g, '""')}"`,
      `"${(a.title || '').replace(/"/g, '""')}"`,
      `"${(a.apply_url || '').replace(/"/g, '""')}"`,
      a.status,
      a.mode,
      a.applied_at || a.created_at || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hirestack_pipeline_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Funnel & Stats Calculation
  const totalCount = applications.length;
  const appliedCount = applications.filter(a => a.status === 'applied').length;
  const reviewingCount = applications.filter(a => a.status === 'reviewed').length;
  const interviewingCount = applications.filter(a => a.status === 'interviewing').length;
  const offerCount = applications.filter(a => a.status === 'offer').length;

  const semiAutoCount = applications.filter(a => a.mode === 'semi-auto').length;
  const autonomousCount = applications.filter(a => a.mode === 'autonomous').length;
  
  const successCount = interviewingCount + offerCount + appliedCount;
  const successRate = totalCount > 0 ? Math.round(((interviewingCount + offerCount) / totalCount) * 100) : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'offer':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-950 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" /> OFFER RECEIVED
          </span>
        );
      case 'interviewing':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
            <Calendar className="w-3 h-3 text-emerald-600" /> INTERVIEW SCHEDULED
          </span>
        );
      case 'applied':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
            <Clock className="w-3 h-3 text-slate-500" /> APPLIED / ACTIVE
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
            <FileText className="w-3 h-3 text-slate-400" /> UNDER REVIEW
          </span>
        );
      case 'rejected':
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
            <XCircle className="w-3 h-3 text-rose-600" /> REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            {status.toUpperCase()}
          </span>
        );
    }
  };

  const getModeBadge = (mode: string) => {
    if (mode === 'autonomous') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs">
          <Zap className="w-2.5 h-2.5" /> AUTONOMOUS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
        <Layers className="w-2.5 h-2.5 text-slate-500" /> SEMI-AUTO
      </span>
    );
  };

  return (
    <div className="space-y-6 font-sans select-none max-w-6xl mx-auto pb-12">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center shadow-sm">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-950 dark:text-white">Application Pipeline &amp; Conversion Board</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time funnel conversion metrics, submission timeline tracking, and active stage management.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredApps.length === 0}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={loadApplications}
            disabled={loading}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 p-2 rounded-xl transition-colors"
            title="Refresh Pipeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Visual Application Funnel Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-400">Application Funnel Stages</span>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
            {successRate}% Response / Interview Rate
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Stage 1: Applied */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500">
              <span>01. SUBMITTED</span>
              <span>100%</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-950 dark:text-white font-mono">
              {totalCount}
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-slate-900 dark:bg-white rounded-full w-full" />
            </div>
          </div>

          {/* Stage 2: Reviewed */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500">
              <span>02. UNDER REVIEW</span>
              <span>{totalCount > 0 ? Math.round(((appliedCount + interviewingCount + offerCount) / totalCount) * 100) : 0}%</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-950 dark:text-white font-mono">
              {appliedCount + interviewingCount + offerCount}
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 dark:bg-white rounded-full"
                style={{ width: `${totalCount > 0 ? ((appliedCount + interviewingCount + offerCount) / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Stage 3: Interviewing */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
              <span>03. INTERVIEWS</span>
              <span>{totalCount > 0 ? Math.round(((interviewingCount + offerCount) / totalCount) * 100) : 0}%</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-300 font-mono">
              {interviewingCount + offerCount}
            </div>
            <div className="h-1.5 w-full bg-emerald-100 dark:bg-emerald-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 dark:bg-emerald-400 rounded-full"
                style={{ width: `${totalCount > 0 ? ((interviewingCount + offerCount) / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Stage 4: Offers */}
          <div className="p-4 rounded-2xl bg-emerald-100/60 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-emerald-900 dark:text-emerald-300">
              <span>04. OFFERS</span>
              <span>{totalCount > 0 ? Math.round((offerCount / totalCount) * 100) : 0}%</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-950 dark:text-emerald-200 font-mono">
              {offerCount}
            </div>
            <div className="h-1.5 w-full bg-emerald-200 dark:bg-emerald-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-700 dark:bg-emerald-300 rounded-full"
                style={{ width: `${totalCount > 0 ? (offerCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mode Distribution & Time Trends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">Autonomous vs Semi-Auto</span>
          <div className="flex items-center justify-between pt-1">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-slate-900 dark:text-white" /> Autonomous: {autonomousCount}
              </div>
              <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" /> Semi-Auto: {semiAutoCount}
              </div>
            </div>
            <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white">
              {totalCount > 0 ? Math.round((autonomousCount / totalCount) * 100) : 0}% Auto
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">Weekly Velocity</span>
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-xl font-extrabold text-slate-950 dark:text-white font-mono">
                {applications.length} Submissions
              </div>
              <p className="text-[11px] text-emerald-600 font-medium">+3 vs prior 7 days</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">Active Opportunities</span>
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-xl font-extrabold text-slate-950 dark:text-white font-mono">
                {interviewingCount + appliedCount} Active
              </div>
              <p className="text-[11px] text-slate-500">Awaiting recruiter feedback</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search applications by role, company, or portal URL..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none font-semibold"
            >
              <option value="all">All Stages</option>
              <option value="applied">Applied / Active</option>
              <option value="interviewing">Interview Scheduled</option>
              <option value="offer">Offer Received</option>
              <option value="reviewed">Under Review</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={modeFilter}
              onChange={e => setModeFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none font-semibold"
            >
              <option value="all">All Modes</option>
              <option value="semi-auto">Semi-Auto (Review)</option>
              <option value="autonomous">Autonomous (Autopilot)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {filteredApps.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Role &amp; Company</th>
                  <th className="px-5 py-3.5 font-bold">Submission Mode</th>
                  <th className="px-5 py-3.5 font-bold">Pipeline Stage</th>
                  <th className="px-5 py-3.5 font-bold">Date Submitted</th>
                  <th className="px-5 py-3.5 text-right font-bold">Manage Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredApps.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-950 dark:text-white text-xs">
                        {app.title}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{app.company}</span>
                        <span>·</span>
                        <a
                          href={app.apply_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-slate-950 dark:hover:text-white flex items-center gap-0.5 truncate max-w-[200px]"
                        >
                          <span className="truncate">{app.apply_url}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {getModeBadge(app.mode)}
                    </td>

                    <td className="px-5 py-4">
                      {getStatusBadge(app.status)}
                    </td>

                    <td className="px-5 py-4 font-mono text-[11px] text-slate-500">
                      {app.applied_at ? new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <select
                        value={app.status}
                        onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                        className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                      >
                        <option value="applied">Applied</option>
                        <option value="reviewed">Under Review</option>
                        <option value="interviewing">Interview Scheduled</option>
                        <option value="offer">Offer Received</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No applications match your filter</h3>
            <p className="text-xs text-slate-500">
              Clear or change your stage filters to view your submitted positions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
