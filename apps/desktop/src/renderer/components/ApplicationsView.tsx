import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, RefreshCw, Search, Download, ExternalLink,
  CheckCircle2, Clock, XCircle, AlertCircle, Filter,
  Building, Zap, Layers
} from 'lucide-react';
import { Application, getApi } from '../types';

export const ApplicationsView: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');

  const loadApplications = async () => {
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
    loadApplications();
  }, []);

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.apply_url.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      const matchesMode = modeFilter === 'all' || app.mode === modeFilter;

      return matchesSearch && matchesStatus && matchesMode;
    });
  }, [applications, searchQuery, statusFilter, modeFilter]);

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
      a.applied_at,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `job_applications_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats calculation
  const totalCount = applications.length;
  const semiAutoCount = applications.filter(a => a.mode === 'semi-auto').length;
  const autonomousCount = applications.filter(a => a.mode === 'autonomous').length;
  const successCount = applications.filter(a => a.status === 'applied' || a.status === 'interviewing').length;
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 100;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-800 border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> applied
          </span>
        );
      case 'interviewing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border bg-blue-50 text-blue-800 border-blue-200">
            <Clock className="w-3 h-3" /> interviewing
          </span>
        );
      case 'captcha_blocked':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border bg-amber-50 text-amber-800 border-amber-200">
            <AlertCircle className="w-3 h-3" /> captcha skipped
          </span>
        );
      case 'failed':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border bg-rose-50 text-rose-800 border-rose-200">
            <XCircle className="w-3 h-3" /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-md border bg-slate-100 text-slate-700 border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="text-xs font-medium text-slate-500">Total Applications</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {totalCount}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Semi-Auto Mode
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {semiAutoCount}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> Autonomous Mode
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {autonomousCount}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="text-xs font-medium text-slate-500">Application Success Rate</div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {successRate}%
          </div>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by company or job title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Filters & Export */}
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="applied">Applied</option>
              <option value="interviewing">Interviewing</option>
              <option value="rejected">Rejected</option>
              <option value="captcha_blocked">Captcha Blocked</option>
            </select>

            {/* Mode Filter */}
            <select
              value={modeFilter}
              onChange={e => setModeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none font-medium"
            >
              <option value="all">All Modes</option>
              <option value="semi-auto">Semi-Auto</option>
              <option value="autonomous">Autonomous</option>
            </select>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredApps.length === 0}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadApplications}
              disabled={loading}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 p-2 rounded-xl transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Applications Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {filteredApps.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[10px]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Job Title &amp; Company</th>
                  <th className="px-4 py-3 font-semibold">Mode</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date Applied</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApps.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 text-xs truncate max-w-[240px]">
                        {app.title}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400" /> {app.company}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-mono text-[11px] text-slate-700 font-semibold">
                        {app.mode}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      {getStatusBadge(app.status)}
                    </td>

                    <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                      {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'Recent'}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {app.apply_url && (
                        <a
                          href={app.apply_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 text-[11px] font-bold underline"
                        >
                          View <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 p-6">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-slate-700">No Applications Logged Yet</h3>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
              Applications submitted through the Semi-Auto or Autonomous engines will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
