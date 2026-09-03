import React, { useState, useEffect } from 'react';
import {
  Users, CreditCard, Shield, Plus, Trash2, CheckCircle2,
  AlertCircle, Loader2, RefreshCw, Key, DollarSign, Activity,
  TrendingUp, Search, UserPlus, UserCheck, UserX, Copy, Check,
  SlidersHorizontal, Download, FileText, ArrowUpRight, Clock,
  Sparkles, RotateCcw, Youtube, ExternalLink, PlayCircle
} from 'lucide-react';
import { AppUser, BillingRecord, AdminMetrics, CuratedResource, getApi } from '../types';

interface AdminViewProps {
  onLog: (msg: string) => void;
  currentUser: AppUser | null;
}

export const AdminView: React.FC<AdminViewProps> = ({ onLog, currentUser }) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'users' | 'billing' | 'resources'>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    totalApps: 0,
    totalRevenue: '$0.00',
    mrr: '$0/mo',
    trialUsers: 0,
    proUsers: 0,
    maxUsers: 0,
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
  const [newTier, setNewTier] = useState<'trial' | 'pro' | 'max' | 'lifetime'>('trial');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [creatingUser, setCreatingUser] = useState<boolean>(false);
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);

  // Curated Learning Video Resources State
  const [learningResources, setLearningResources] = useState<CuratedResource[]>([]);
  const [showResourceModal, setShowResourceModal] = useState<boolean>(false);
  const [resTitle, setResTitle] = useState<string>('');
  const [resUrl, setResUrl] = useState<string>('');
  const [resTopic, setResTopic] = useState<string>('');
  const [resRole, setResRole] = useState<string>('');
  const [resSummary, setResSummary] = useState<string>('');
  const [resDuration, setResDuration] = useState<string>('25 mins');
  const [savingResource, setSavingResource] = useState<boolean>(false);

  // Plan Assignment State
  const [assigningPlanUser, setAssigningPlanUser] = useState<AppUser | null>(null);
  const [selectedPlanTier, setSelectedPlanTier] = useState<string>('pro');
  const [savingPlan, setSavingPlan] = useState<boolean>(false);

  const fetchAdminData = async () => {
    const api = getApi();
    if (!api) return;
    setLoading(true);
    try {
      const [fetchedMetrics, fetchedUsers, fetchedBilling, fetchedResources] = await Promise.all([
        api.adminGetMetrics(),
        api.adminGetUsers(),
        api.adminGetBilling(),
        api.adminGetLearningResources ? api.adminGetLearningResources() : Promise.resolve([]),
      ]);
      setMetrics(fetchedMetrics);
      setUsers(fetchedUsers);
      setBillingRecords(fetchedBilling);
      setLearningResources(fetchedResources || []);
    } catch (err: any) {
      onLog(`[Admin] Failed to load admin metrics: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPlan = async (user: AppUser, planTier: string) => {
    const api = getApi();
    if (!api || !api.adminAssignPlan) return;
    setSavingPlan(true);
    try {
      await api.adminAssignPlan({
        userId: user.id,
        email: user.email,
        planTier,
      });
      onLog(`[Admin] Assigned plan "${planTier}" to ${user.email} ✓`);
      await fetchAdminData();
      setAssigningPlanUser(null);
    } catch (err: any) {
      onLog(`[Admin] Plan assignment error: ${err?.message}`);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle || !resUrl || !resTopic || !resRole) return;
    const api = getApi();
    if (!api || !api.adminAddLearningResource) return;
    setSavingResource(true);
    try {
      await api.adminAddLearningResource({
        title: resTitle,
        youtubeUrl: resUrl,
        topic: resTopic,
        targetRole: resRole,
        summary: resSummary,
        duration: resDuration,
      });
      onLog(`[Admin Curator] Added YouTube tutorial: "${resTitle}" (${resTopic})`);
      setResTitle('');
      setResUrl('');
      setResTopic('');
      setResRole('');
      setResSummary('');
      setShowResourceModal(false);
      await fetchAdminData();
    } catch (err: any) {
      onLog(`[Admin] Error adding video: ${err?.message}`);
    } finally {
      setSavingResource(false);
    }
  };

  const handleDeleteResource = async (id: number | string, title: string) => {
    if (!window.confirm(`Delete curated tutorial "${title}"?`)) return;
    const api = getApi();
    if (!api || !api.adminDeleteLearningResource) return;
    try {
      await api.adminDeleteLearningResource(id);
      onLog(`[Admin Curator] Removed resource: "${title}"`);
      await fetchAdminData();
    } catch (err: any) {
      onLog(`[Admin] Delete resource error: ${err?.message}`);
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

  const handleDeleteUser = async (id: number | string, email: string) => {
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
        setNewTier('trial');
        onLog(`[Admin] Created ${newTier.toUpperCase()} user ${newEmail.trim()} and issued license.`);
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

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'trial':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'max':
      case 'turbo':
        return 'bg-slate-900 text-white border-slate-900';
      case 'lifetime':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pro':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl pb-12 select-none">
      
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
                {currentUser?.fullName || 'Owner'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal">
              Manage buyers, issue custom credentials across 4 plans, track fleet applications, and monitor billing.
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

        <button
          type="button"
          onClick={() => setActiveAdminTab('resources')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all ${
            activeAdminTab === 'resources'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Youtube className="w-3.5 h-3.5 text-rose-600" />
          <span>Video Tutorials ({learningResources.length})</span>
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

          {/* 4 Plan Breakdown & Fleet Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 lg:col-span-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  4 Subscription Plans
                </h3>
                <span className="text-[10px] font-bold text-slate-400">Tiers</span>
              </div>

              <div className="space-y-2.5 pt-1">
                {/* 1. Trial Plan */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs">
                  <div>
                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>7-Day Trial</span>
                    </div>
                    <div className="text-[11px] text-amber-700">7 days validity + renewal chance</div>
                  </div>
                  <span className="text-sm font-bold font-mono text-amber-900">{metrics.trialUsers}</span>
                </div>

                {/* 2. Pro Plan */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 text-xs">
                  <div>
                    <div className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-blue-600" />
                      <span>Pro Plan ($49/mo)</span>
                    </div>
                    <div className="text-[11px] text-blue-700">Standard auto-apply &amp; feed</div>
                  </div>
                  <span className="text-sm font-bold font-mono text-blue-900">{metrics.proUsers}</span>
                </div>

                {/* 3. Max Plan */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 text-white border border-slate-900 text-xs">
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-slate-400" />
                      <span>Seeker Turbo (₹599/mo)</span>
                    </div>
                    <div className="text-[11px] text-slate-300">Unlimited autonomous apply &amp; outreach</div>
                  </div>
                  <span className="text-sm font-bold font-mono text-white">{metrics.maxUsers}</span>
                </div>

                {/* 4. Lifetime Plan */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs">
                  <div>
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Lifetime License ($299)</span>
                    </div>
                    <div className="text-[11px] text-emerald-700">Permanent unlimited access</div>
                  </div>
                  <span className="text-sm font-bold font-mono text-emerald-900">{metrics.lifetimeUsers}</span>
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
                          License: {u.licenseKey} • {u.appsCount} applications
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getTierBadge(u.tier)}`}>
                        {u.tier}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {u.expiresAt ? `Expires: ${u.expiresAt.split(' ')[0]}` : 'Permanent'}
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
                Issue unique credentials across 4 plans (Trial, Pro, Max, Lifetime), manage renewals, and revoke access.
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
                  <th className="pb-2.5">Validity / Expiry</th>
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
                      <select
                        value={u.tier}
                        onChange={(e) => handleAssignPlan(u, e.target.value as any)}
                        disabled={savingPlan}
                        className={`text-[10px] font-bold px-2 py-1 rounded border uppercase cursor-pointer outline-none ${getTierBadge(u.tier)}`}
                        title="Click to change plan tier"
                      >
                        <option value="trial">Trial</option>
                        <option value="pro">Pro</option>
                        <option value="max">Max</option>
                        <option value="lifetime">Lifetime</option>
                      </select>
                    </td>

                    <td className="py-3 font-mono text-[11px] text-slate-600">
                      {u.expiresAt ? (
                        <div>
                          <span>{u.expiresAt.split(' ')[0]}</span>
                          {u.tier === 'trial' && (
                            <span className="block text-[10px] text-amber-700 font-sans">7-Day Trial</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-sans font-semibold">Permanent</span>
                      )}
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
                          onClick={() => {
                            setAssigningPlanUser(u);
                            setSelectedPlanTier(u.tier);
                          }}
                          className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                          title="Assign custom plan & duration"
                        >
                          Assign Plan
                        </button>

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
                            title="Delete User"
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
                Stripe transactions, trial grants, and license sales.
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

      {/* ── TAB 4: CURATED VIDEO TUTORIALS & TOPIC CURATOR ───────────────────── */}
      {activeAdminTab === 'resources' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Youtube className="w-4 h-4 text-rose-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Curated YouTube Learning Resources &amp; AI Auto-Matcher
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Add YouTube tutorial links and topics. When candidates select or inspect any matching job title, our AI automatically recommends these prep videos.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowResourceModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Curated Video</span>
            </button>
          </div>

          {/* Resources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {learningResources.map((res) => (
              <div
                key={res.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all shadow-2xs flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <Youtube className="w-3 h-3 text-rose-600" />
                      <span>{res.topic}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {res.duration || '20 mins'}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 leading-snug">
                    {res.title}
                  </h3>

                  <div className="text-[10px] text-slate-600 font-medium">
                    <span className="text-slate-400">Target Roles: </span>
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{res.targetRole}</span>
                  </div>

                  {res.summary && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {res.summary}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <a
                    href={res.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <span>Watch Tutorial</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDeleteResource(res.id, res.title)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                    title="Delete Resource"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {learningResources.length === 0 && (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
              <Youtube className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No curated videos added yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click "Add Curated Video" to link your first YouTube tutorial.</p>
            </div>
          )}
        </div>
      )}

      {/* ── ADD CURATED RESOURCE MODAL ─────────────────────────────────────── */}
      {showResourceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Youtube className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Add Curated YouTube Learning Resource
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResourceModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="space-y-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Video Tutorial Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Next.js 14 Server Components & App Router Masterclass"
                  value={resTitle}
                  onChange={e => setResTitle(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">YouTube Video URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={resUrl}
                  onChange={e => setResUrl(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Topic / Tech Focus</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. React & Next.js"
                    value={resTopic}
                    onChange={e => setResTopic(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 30 mins"
                    value={resDuration}
                    onChange={e => setResDuration(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Target Role(s)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frontend Engineer, Full Stack Developer"
                  value={resRole}
                  onChange={e => setResRole(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Summary / Key Takeaways</label>
                <textarea
                  rows={2}
                  placeholder="Brief synopsis of what candidate will learn..."
                  value={resSummary}
                  onChange={e => setResSummary(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResourceModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingResource}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingResource ? 'Saving...' : 'Add Curated Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ASSIGN PLAN MODAL ───────────────────────────────────────────────── */}
      {assigningPlanUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-900" />
                <h3 className="text-sm font-bold text-slate-900">
                  Assign Plan to User
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssigningPlanUser(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{assigningPlanUser.fullName}</div>
                <div className="text-slate-500 font-mono text-[11px]">{assigningPlanUser.email}</div>
                <div className="text-[10px] text-slate-400">Current: <span className="uppercase font-bold text-slate-700">{assigningPlanUser.tier}</span></div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Select New Plan Tier</label>
                <select
                  value={selectedPlanTier}
                  onChange={(e) => setSelectedPlanTier(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none"
                >
                  <option value="trial">Trial (7 Days, 10 apps/day)</option>
                  <option value="pro">Pro Plan (₹149/mo, 100 apps/day)</option>
                  <option value="max">Max Plan (₹299/mo, 200 apps/day)</option>
                  <option value="lifetime">Lifetime License (₹999, Permanent)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningPlanUser(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingPlan}
                  onClick={() => handleAssignPlan(assigningPlanUser, selectedPlanTier)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingPlan ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </div>
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
                  <label className="font-bold text-slate-700">Subscription Plan</label>
                  <select
                    value={newTier}
                    onChange={e => setNewTier(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none font-medium"
                  >
                    <option value="trial">Trial (7 Days Validity + Renewal)</option>
                    <option value="pro">Pro Plan ($49/mo)</option>
                    <option value="max">Max Plan ($99/mo)</option>
                    <option value="lifetime">Lifetime License ($299)</option>
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
