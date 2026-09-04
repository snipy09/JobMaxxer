import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, ExternalLink, Filter, Building, Download,
  CheckCircle2, Clock, XCircle, ArrowRight, LayoutGrid, List,
  RefreshCw, Trash2, Plus, X, Briefcase, Globe, AlertCircle, Loader2
} from 'lucide-react';
import { Application, getApi } from '../types';

const COLUMNS = [
  { id: 'applied', label: 'Applied', color: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300' },
  { id: 'interviewing', label: 'Interviewing', color: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200' },
  { id: 'offered', label: 'Offered', color: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200' },
  { id: 'rejected', label: 'Archived', color: 'bg-slate-100 text-slate-500 dark:bg-zinc-800' },
];

export const ApplicationsView: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [loading, setLoading] = useState<boolean>(false);

  // Manual Add Application Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCompany, setNewCompany] = useState<string>('');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newUrl, setNewUrl] = useState<string>('');
  const [newStatus, setNewStatus] = useState<string>('applied');
  const [isSavingApp, setIsSavingApp] = useState<boolean>(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchApps = async () => {
    const api = getApi();
    if (!api) return;
    setLoading(true);
    try {
      const data = await api.getApplications();
      setApplications(data || []);
    } catch {
      setApplications([]);
    } finally {
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
        if (api.logUserActivity) {
          api.logUserActivity('application', `Updated application #${appId} status to ${newStatus}`);
        }
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

  const handleCreateManualApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim() || !newTitle.trim()) {
      setAddError('Company and Job Title are required.');
      return;
    }

    setIsSavingApp(true);
    setAddError(null);

    const api = getApi();
    try {
      const targetUrl = newUrl.trim() || `https://${newCompany.toLowerCase().replace(/[^a-z0-9]/g, '')}.com/careers`;
      if (api && api.saveApplication) {
        await api.saveApplication({
          company: newCompany.trim(),
          title: newTitle.trim(),
          apply_url: targetUrl,
          status: newStatus,
          mode: 'manual',
        });
      }
      await fetchApps();
      setShowAddModal(false);
      setNewCompany('');
      setNewTitle('');
      setNewUrl('');
      setNewStatus('applied');
    } catch (err: any) {
      setAddError(err?.message || 'Error saving application.');
    } finally {
      setIsSavingApp(false);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none max-w-6xl mx-auto pb-20">
      
      {/* ── TOP HEADER ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              Applications Tracker
            </h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
              {applications.length} Total Logged
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Verified audit trail of autonomous submissions, semi-auto reviews, and manual logs.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search company or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-slate-400"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-md text-xs font-medium transition ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-medium transition ${
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
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-semibold hover:opacity-90 transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Position</span>
          </button>
        </div>
      </div>

      {/* ── BOARD OR LIST VIEW ──────────────────────────────────────────────── */}
      {filteredApps.length > 0 ? (
        viewMode === 'board' ? (
          /* ── KANBAN BOARD VIEW ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {COLUMNS.map((col) => {
              const colApps = filteredApps.filter(a => {
                const s = (a.status || 'applied').toLowerCase();
                if (col.id === 'applied') return s === 'applied' || s === 'unsent' || s === 'pending';
                if (col.id === 'interviewing') return s === 'interviewing' || s === 'reviewed';
                if (col.id === 'offered') return s === 'offered' || s === 'accepted';
                if (col.id === 'rejected') return s === 'rejected' || s === 'archived' || s === 'failed';
                return s === col.id;
              });

              return (
                <div
                  key={col.id}
                  className="bg-slate-50/70 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase font-mono">
                        {col.label}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold">
                        {colApps.length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5 min-h-[160px]">
                    {colApps.map((app) => (
                      <div
                        key={app.id}
                        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs space-y-2.5 hover:border-slate-300 dark:hover:border-zinc-700 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                              {app.title}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                              <Building className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{app.company}</span>
                            </div>
                          </div>

                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 shrink-0">
                            {app.mode || 'auto'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                          <span>
                            {app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'}
                          </span>

                          <div className="flex items-center gap-1">
                            {app.apply_url && (
                              <a
                                href={app.apply_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 hover:text-slate-900 dark:hover:text-zinc-100"
                                title="Open Link"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteApp(app.id)}
                              className="p-1 hover:text-red-600 dark:hover:text-red-400"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Status Switcher */}
                        <div className="pt-1">
                          <select
                            value={app.status || 'applied'}
                            onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded text-[10px] py-1 px-1.5 text-slate-700 dark:text-zinc-300 outline-none"
                          >
                            <option value="applied">Status: Applied</option>
                            <option value="interviewing">Status: Interviewing</option>
                            <option value="offered">Status: Offered</option>
                            <option value="rejected">Status: Archived</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── TABLE LIST VIEW ── */
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 text-[10px] font-mono uppercase text-slate-400">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Position & Company</th>
                    <th className="py-3 px-4 font-semibold">Mode</th>
                    <th className="py-3 px-4 font-semibold">Date Logged</th>
                    <th className="py-3 px-4 font-semibold">Stage</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-zinc-100">{app.title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400">{app.company}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 uppercase">
                          {app.mode || 'autonomous'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={app.status || 'applied'}
                          onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                          className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded text-xs py-1 px-2 text-slate-700 dark:text-zinc-300 outline-none"
                        >
                          <option value="applied">Applied</option>
                          <option value="interviewing">Interviewing</option>
                          <option value="offered">Offered</option>
                          <option value="rejected">Archived</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {app.apply_url && (
                            <a
                              href={app.apply_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-zinc-100"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteApp(app.id)}
                            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
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
          </div>
        )
      ) : (
        /* ── ZERO-STATE ── */
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-3 max-w-md mx-auto shadow-xs">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 mx-auto flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">No applications tracked yet</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Apply to opportunities on the Job Board or add positions you applied to manually.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-semibold hover:opacity-90 transition shadow-xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Application</span>
          </button>
        </div>
      )}

      {/* ── MODAL: ADD MANUAL APPLICATION ──────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateManualApp}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Log Job Application</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="e.g. Stripe, Linear, Vercel"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Position Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Application / Job URL (Optional)</label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://jobs.lever.co/company/..."
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Current Stage</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="applied">Applied</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offered">Offered</option>
                  <option value="rejected">Archived</option>
                </select>
              </div>

              {addError && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
                  {addError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingApp}
                className="px-4 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Save Application</span>}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
