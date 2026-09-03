import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, ExternalLink, Filter, Building, Download,
  CheckCircle2, Clock, XCircle, ArrowRight, LayoutGrid, List,
  RefreshCw, Trash2
} from 'lucide-react';
import { Application, getApi } from '../types';

const SAMPLE_APPLICATIONS: Application[] = [
  {
    id: 1,
    title: 'Senior Frontend Architect',
    company: 'Vercel',
    apply_url: 'https://boards.greenhouse.io/vercel/jobs/592019',
    status: 'interviewing',
    mode: 'autonomous',
    applied_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    title: 'Software Development Intern (Frontend)',
    company: 'Stripe',
    apply_url: 'https://internshala.com/internship/detail/stripe-react-intern',
    status: 'applied',
    mode: 'semi-auto',
    applied_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 3,
    title: 'Associate Product Manager',
    company: 'Linear',
    apply_url: 'https://jobs.ashbyhq.com/linear/apm-opportunity',
    status: 'interviewing',
    mode: 'semi-auto',
    applied_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 4,
    title: 'Distributed Systems Engineer',
    company: 'Supabase',
    apply_url: 'https://jobs.lever.co/supabase/distributed-systems',
    status: 'applied',
    mode: 'autonomous',
    applied_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 5,
    title: 'Backend API Specialist',
    company: 'Postman',
    apply_url: 'https://boards.greenhouse.io/postman/jobs/381920',
    status: 'applied',
    mode: 'autonomous',
    applied_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  }
];

const COLUMNS = [
  { id: 'applied', label: 'Applied', color: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300' },
  { id: 'interviewing', label: 'Interviewing', color: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200' },
  { id: 'offered', label: 'Offered', color: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200' },
  { id: 'rejected', label: 'Archived', color: 'bg-slate-100 text-slate-500 dark:bg-zinc-800' },
];

export const ApplicationsView: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>(SAMPLE_APPLICATIONS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchApps = async () => {
    const api = getApi();
    if (!api) return;
    setLoading(true);
    try {
      const data = await api.getApplications();
      if (data && data.length > 0) {
        setApplications(data);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const q = searchQuery.toLowerCase().trim();
      return q === '' ||
        (app.title || '').toLowerCase().includes(q) ||
        (app.company || '').toLowerCase().includes(q);
    });
  }, [applications, searchQuery]);

  const handleUpdateStatus = async (appId: any, newStatus: string) => {
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus as any } : a));
    const api = getApi();
    if (api && api.updateApplicationStatus) {
      try {
        await api.updateApplicationStatus(appId, newStatus);
      } catch {}
    }
  };

  const handleDeleteApp = async (appId: any) => {
    setApplications(prev => prev.filter(a => a.id !== appId));
    const api = getApi();
    if (api && api.deleteApplication) {
      try {
        await api.deleteApplication(appId);
      } catch {}
    }
  };

  const handleExportCSV = () => {
    const rows = [
      ['Company', 'Job Title', 'Status', 'Mode', 'Applied Date', 'URL'],
      ...filteredApps.map(a => [a.company, a.title, a.status, a.mode, a.applied_at || '', a.apply_url || ''])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hirestack_applications_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans select-none max-w-6xl mx-auto pb-20">
      
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100">Application Pipeline</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Track submitted applications, interview stages, and offers.
          </p>
        </div>

        {/* View Switcher & Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200/60 dark:border-zinc-700">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
              title="Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
              title="Table List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={fetchApps}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Refresh applications list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter applications by company or title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-slate-400 transition-colors shadow-2xs"
        />
      </div>

      {/* ── NOTION KANBAN BOARD VIEW ───────────────────────────────────────── */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {COLUMNS.map(col => {
            const colApps = filteredApps.filter(a => (a.status || 'applied') === col.id);

            return (
              <div key={col.id} className="bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-zinc-800 text-xs font-bold">
                  <span className="text-slate-800 dark:text-zinc-200">{col.label}</span>
                  <span className="text-[11px] font-mono text-slate-400">{colApps.length}</span>
                </div>

                <div className="space-y-2.5">
                  {colApps.map(app => (
                    <div
                      key={app.id || app.apply_url}
                      className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-2.5 transition-all hover:border-slate-300 dark:hover:border-zinc-700"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase text-slate-400">{app.company}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 capitalize">
                            {app.mode}
                          </span>
                          <button
                            onClick={() => handleDeleteApp(app.id)}
                            className="text-slate-400 hover:text-rose-500 transition-colors p-0.5"
                            title="Remove application record"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 leading-snug">
                        {app.title}
                      </h4>

                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={app.status || 'applied'}
                          onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                          className="text-[10px] font-mono bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-slate-700 dark:text-zinc-300 outline-none cursor-pointer"
                        >
                          <option value="applied">Applied</option>
                          <option value="interviewing">Interviewing</option>
                          <option value="offered">Offered</option>
                          <option value="rejected">Rejected</option>
                        </select>

                        <a
                          href={app.apply_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-slate-900 dark:hover:text-zinc-100 text-slate-400"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>{app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'}</span>
                      </div>
                    </div>
                  ))}

                  {colApps.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400 font-mono">
                      No applications
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── NOTION TABLE LIST VIEW ─────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-200 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Company</th>
                <th className="py-3 px-4 font-semibold">Job Title</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Mode</th>
                <th className="py-3 px-4 font-semibold">Applied</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {filteredApps.map((app) => (
                <tr key={app.id || app.apply_url} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-zinc-100">{app.company}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-zinc-300">{app.title}</td>
                  <td className="py-3 px-4">
                    <select
                      value={app.status || 'applied'}
                      onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                      className="text-[10px] font-mono bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-0.5 text-slate-700 dark:text-zinc-300 outline-none cursor-pointer capitalize"
                    >
                      <option value="applied">Applied</option>
                      <option value="interviewing">Interviewing</option>
                      <option value="offered">Offered</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px] capitalize">{app.mode}</td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <a
                        href={app.apply_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDeleteApp(app.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Delete application"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
