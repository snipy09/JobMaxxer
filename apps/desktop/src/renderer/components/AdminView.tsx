import React, { useState, useEffect } from 'react';
import {
  Users, CreditCard, Shield, Plus, Trash2, CheckCircle2,
  AlertCircle, Loader2, RefreshCw, Key, DollarSign, Activity,
  TrendingUp, Search, UserPlus, UserCheck, UserX, Copy, Check,
  SlidersHorizontal, Download, FileText, ArrowUpRight
} from 'lucide-react';
import { AppUser, BillingRecord, AdminMetrics, getApi } from '../types';

interface AdminViewProps {
  onLog: (msg: string) => void;
  currentUser: AppUser | null;
}

export const AdminView: React.FC<AdminViewProps> = ({ onLog, currentUser }) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'users' | 'billing'>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    totalApps: 0,
    totalRevenue: '$0.00',
    mrr: '$0/mo',
    proUsers: 0,
    enterpriseUsers: 0,
    lifetimeUsers: 0,
  });

  const [users, setUsers] = useState<AppUser[]>([]);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [searchUser, setSearchUser] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New User Form Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newEmail, setNewEmail] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('pass123');
  const [newTier, setNewTier] = useState<'pro' | 'enterprise' | 'lifetime'>('pro');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [creatingUser, setCreatingUser] = useState<boolean>(false);
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);

  const fetchAdminData = async () => {
    const api = getApi();
    if (!api) return;
    setLoading(true);
    try {
      const [fetchedMetrics, fetchedUsers, fetchedBilling] = await Promise.all([
        api.adminGetMetrics(),
        api.adminGetUsers(),
        api.adminGetBilling(),
      ]);
      setMetrics(fetchedMetrics);
      setUsers(fetchedUsers);
      setBillingRecords(fetchedBilling);
    } catch (err: any) {
      onLog(`[Admin] Failed to load admin metrics: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleStatus = async (user: AppUser) => {
    const api = getApi();
    if (!api) return;
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await api.adminUpdateUserStatus(user.id, newStatus);
      await fetchAdminData();
      onLog(`[Admin] License for ${user.email} updated to ${newStatus}.`);
    } catch (err: any) {
      onLog(`[Admin] Error updating status: ${err?.message || String(err)}`);
    }
  };

  const handleDeleteUser = async (id: number, email: string) => {
    if (!window.confirm(`Are you sure you want to delete user ${email}?`)) return;
    const api = getApi();
    if (!api) return;
    try {
      await api.adminDeleteUser(id);
      await fetchAdminData();
      onLog(`[Admin] Deleted user ${email}.`);
    } catch (err: any) {
      onLog(`[Admin] Error deleting user: ${err?.message || String(err)}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const api = getApi();
    if (!api || !newEmail.trim() || !newFullName.trim()) return;

    setCreatingUser(true);
    setCreateFeedback(null);
    try {
      const res = await api.adminCreateUser({
        email: newEmail.trim(),
        fullName: newFullName.trim(),
        password: newPassword.trim(),
        tier: newTier,
        role: newRole,
      });

      if (res.success) {
        await fetchAdminData();
        setShowCreateModal(false);
        setNewEmail('');
        setNewFullName('');
        setNewPassword('pass123');
        onLog(`[Admin] Created user ${newEmail.trim()} and issued license.`);
      } else {
        setCreateFeedback(res.error || 'Failed to create user.');
      }
    } catch (err: any) {
      setCreateFeedback(err?.message || 'Error occurred while creating user.');
    } finally {
      setCreatingUser(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchUser.trim()) return true;
    const q = searchUser.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q) ||
      u.licenseKey.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Master Admin Dashboard
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                Owner Access
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal">
              Manage buyers, issue custom license credentials, view fleet applications, and track billing revenue.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAdminData}
            disabled={loading}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create User / Issue License</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center rounded-xl border border-slate-200 p-0.5 bg-slate-100">
        <button
          type="button"
          onClick={() => setActiveAdminTab('overview')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all ${
            activeAdminTab === 'overview'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Fleet Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('users')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all ${
            activeAdminTab === 'users'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Licenses ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('billing')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all ${
            activeAdminTab === 'billing'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Billing &amp; Revenue</span>
        </button>
      </div>

      {/* ── TAB 1: FLEET OVERVIEW & METRICS ─────────────────────────────────── */}
      {activeAdminTab === 'overview' && (
        <div className="space-y-6">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Active Buyers</span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
                {metrics.activeUsers} <span className="text-xs font-normal text-slate-400 font-sans">/ {metrics.totalUsers} total</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Licensed software users</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Fleet Applications</span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
                {metrics.totalApps.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Submitted across all buyers</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Monthly Recurring Revenue</span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
                {metrics.mrr}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Active subscriptions</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Cumulative Sales</span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
                {metrics.totalRevenue}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">All processed transactions</p>
            </div>
          </div>

          {/* Plan Breakdown & Fleet Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 lg:col-span-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Subscription Plan Distribution
              </h3>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Pro Tier ($49/mo)</div>
                    <div className="text-[11px] text-slate-500">Standard auto-apply &amp; feed</div>
                  </div>
                  <span className="text-base font-bold font-mono text-slate-900">{metrics.proUsers}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Enterprise Tier ($99/mo)</div>
                    <div className="text-[11px] text-slate-500">Unlimited 500+ scrapers &amp; outreach</div>
                  </div>
                  <span className="text-base font-bold font-mono text-slate-900">{metrics.enterpriseUsers}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Lifetime Founders ($299)</div>
                    <div className="text-[11px] text-slate-500">One-time full access</div>
                  </div>
                  <span className="text-base font-bold font-mono text-slate-900">{metrics.lifetimeUsers}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Recent Active User Activity
                </h3>
                <span className="text-xs font-semibold text-slate-500">Live Client Fleet</span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {users.slice(0, 5).map(u => (
                  <div
                    key={u.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <div>
                        <div className="font-bold text-slate-900">{u.fullName} <span className="text-slate-400 font-normal">({u.email})</span></div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          License: {u.licenseKey} • {u.appsCount} applications submitted
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        u.tier === 'enterprise'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : u.tier === 'lifetime'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {u.tier}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {u.lastLogin ? `Last active: ${u.lastLogin}` : 'Pending first login'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: USER MANAGEMENT & LICENSING ───────────────────────────────── */}
      {activeAdminTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Authorized Client Users &amp; Licenses
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Issue unique credentials, manage active subscriptions, and revoke access.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search users or licenses..."
                value={searchUser}
                onChange={e => setSearchUser(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="pb-2.5">User</th>
                  <th className="pb-2.5">License Key / Credentials</th>
                  <th className="pb-2.5">Plan</th>
                  <th className="pb-2.5">Apps</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3">
                      <div className="font-bold text-slate-900">{u.fullName}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                    </td>

                    <td className="py-3">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-800">
                        <span>{u.licenseKey}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(u.licenseKey)}
                          className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                          title="Copy License Key"
                        >
                          {copiedKey === u.licenseKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-400">Role: {u.role}</div>
                    </td>

                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        u.tier === 'enterprise'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : u.tier === 'lifetime'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {u.tier}
                      </span>
                    </td>

                    <td className="py-3 font-mono font-bold text-slate-800">
                      {u.appsCount}
                    </td>

                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 w-max ${
                        u.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {u.status === 'active' ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          className={`text-xs font-semibold px-2 py-1 rounded-lg border transition-colors ${
                            u.status === 'active'
                              ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>

                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg border border-slate-200 hover:bg-white transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: BILLING & REVENUE ─────────────────────────────────────────── */}
      {activeAdminTab === 'billing' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Revenue &amp; Invoices
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Stripe transactions, manual licenses, and automated renewals.
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold font-mono text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                Total Revenue: {metrics.totalRevenue}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="pb-2.5">Transaction ID</th>
                  <th className="pb-2.5">Buyer Email</th>
                  <th className="pb-2.5">Plan / Description</th>
                  <th className="pb-2.5">Amount</th>
                  <th className="pb-2.5">Method</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billingRecords.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 font-mono text-[11px] text-slate-500">
                      TXN-{String(b.id).padStart(5, '0')}
                    </td>
                    <td className="py-3 font-bold text-slate-900">
                      {b.userEmail}
                    </td>
                    <td className="py-3 text-slate-700">
                      {b.plan}
                    </td>
                    <td className="py-3 font-mono font-bold text-slate-900">
                      {b.amount}
                    </td>
                    <td className="py-3 text-slate-500 text-[11px]">
                      {b.paymentMethod}
                    </td>
                    <td className="py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Paid
                      </span>
                    </td>
                    <td className="py-3 text-right text-slate-400 text-[11px]">
                      {b.createdAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CREATE USER / ISSUE LICENSE MODAL ───────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-slate-900" />
                <h3 className="text-sm font-bold text-slate-900">
                  Create Buyer Account &amp; Issue License
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Buyer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Buyer Email Address (Login)</label>
                <input
                  type="email"
                  required
                  placeholder="john.doe@gmail.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Initial Password</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Subscription Tier</label>
                  <select
                    value={newTier}
                    onChange={e => setNewTier(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                  >
                    <option value="pro">Pro ($49/mo)</option>
                    <option value="enterprise">Enterprise ($99/mo)</option>
                    <option value="lifetime">Lifetime ($299)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Account Role</label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                  >
                    <option value="user">Client User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              {createFeedback && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{createFeedback}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {creatingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Generate &amp; Issue</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
