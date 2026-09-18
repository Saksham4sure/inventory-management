import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { ROUTES } from '../../constants/routes';
import {
  Building2,
  Users,
  Boxes,
  ArrowLeftRight,
  CreditCard,
  Clock,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  CheckCircle2,
  Sliders,
  Check,
  X,
  ArrowRight,
} from 'lucide-react';

export const AdminOverviewPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Action modal for approving / declining subscription applications
  const [actionModal, setActionModal] = useState(null); // { request, action: 'APPROVE' | 'REJECT' }
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getOverview();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch platform telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleConfirmAction = async () => {
    if (!actionModal) return;

    try {
      setActionLoading(true);
      if (actionModal.action === 'APPROVE') {
        await adminService.approveSubscriptionRequest(actionModal.request._id, {
          adminNotes: adminNoteInput,
        });
        setActionSuccess(`Plan application for "${actionModal.request.businessName}" approved! Subscription active.`);
      } else {
        await adminService.rejectSubscriptionRequest(actionModal.request._id, {
          adminNotes: adminNoteInput,
        });
        setActionSuccess(`Plan application for "${actionModal.request.businessName}" declined.`);
      }

      setActionModal(null);
      setAdminNoteInput('');
      await fetchOverview();
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      alert(err.message || 'Failed to process application action');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-xs text-zinc-500 font-mono">Aggregating platform metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-500" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
        <button
          onClick={fetchOverview}
          className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl"
        >
          Retry Telemetry Query
        </button>
      </div>
    );
  }

  const {
    metrics,
    planDistribution,
    settings,
    plans,
    recentBusinesses,
    recentUsers,
    pendingRequestsCount = 0,
    pendingSubscriptionRequests = [],
    expiringTrials = [],
  } = data;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            Platform Master Console
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Live Telemetry
            </span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Global operational overview, multi-tenant businesses, and dynamic subscription tier health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOverview}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <Link
            to={ROUTES.ADMIN_SUBSCRIPTIONS}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition-all cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5" />
            Manage 3 Tiers & Trial
          </Link>
        </div>
      </div>

      {/* Action success alert */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {/* SECTION: Important Platform Headlines & Plan Approvals */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
            <h2 className="text-xs font-bold tracking-wider text-zinc-800 dark:text-zinc-200 uppercase font-mono">
              Platform Important Headlines & Alerts
            </h2>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">
            {pendingRequestsCount > 0 ? `${pendingRequestsCount} Pending Approval` : 'System Normal'}
          </span>
        </div>

        {/* HEADLINE 1: Subscription Plan Applied Alert Card */}
        {pendingRequestsCount > 0 ? (
          <div className="rounded-3xl border border-indigo-200 dark:border-indigo-900/80 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-indigo-100 dark:border-indigo-900/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                      Subscription Plan Applied
                    </span>
                    <span className="rounded-full bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5">
                      {pendingRequestsCount} PENDING
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Tenant business owners have applied for subscription changes or extensions. Super admins can review and approve below.
                  </p>
                </div>
              </div>

              <Link
                to={ROUTES.ADMIN_SUBSCRIPTIONS}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Manage Subscriptions</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* List of Pending Plan Applications */}
            <div className="space-y-3">
              {pendingSubscriptionRequests.map((req) => (
                <div
                  key={req._id}
                  className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/90 backdrop-blur-md p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-indigo-300 dark:hover:border-indigo-750"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                        {req.businessName || req.businessId?.name}
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {req.businessId?.category || 'General Retail'}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {new Date(req.createdAt).toLocaleDateString()} at{' '}
                        {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300 flex-wrap">
                      <span>Owner: <strong className="text-zinc-800 dark:text-zinc-200">{req.requestedBy?.name || 'Owner'}</strong> ({req.requestedBy?.email})</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                        <span>Current: <code className="text-zinc-500 font-mono text-[11px]">{req.currentPlan}</code></span>
                        <ArrowRight className="h-3 w-3 text-indigo-500" />
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                          {req.action === 'EXTEND'
                            ? `Extend Trial (+${req.extendDays} Days)`
                            : `Requesting ${req.requestedPlanName || req.requestedPlan}`}
                        </span>
                      </span>
                    </div>

                    {req.note && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850 italic">
                        "{req.note}"
                      </p>
                    )}
                  </div>

                  {/* Approve / Reject Controls */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setActionModal({ request: req, action: 'APPROVE' })}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve Plan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionModal({ request: req, action: 'REJECT' })}
                      className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Normal State Headline */
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white">
                  All Subscription Applications Processed
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  No pending plan requests from business owners at this time.
                </p>
              </div>
            </div>
            <Link
              to={ROUTES.ADMIN_SUBSCRIPTIONS}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Subscription Tiers & Trial →
            </Link>
          </div>
        )}

        {/* HEADLINE 2: Expiring Trials Notification */}
        {expiringTrials && expiringTrials.length > 0 && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {expiringTrials.length} Free Trial Evaluation{expiringTrials.length === 1 ? '' : 's'} Expiring in 72 Hours
                </p>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                  Businesses nearing trial expiration: {expiringTrials.map((b) => b.name).join(', ')}.
                </p>
              </div>
            </div>
            <Link
              to="/admin/businesses?status=TRIAL"
              className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline shrink-0"
            >
              Review Businesses →
            </Link>
          </div>
        )}
      </div>

      {/* Trial System Active Banner */}
      <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Dynamic Trial System
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                {settings?.trialConfig?.enabled ? 'Active for new businesses' : 'Currently Disabled'}
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              New registrations receive{' '}
              <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                {settings?.trialConfig?.trialPlanId || 'STARTER'} (Tier {settings?.trialConfig?.trialTierOrder || 1})
              </span>{' '}
              for{' '}
              <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                {settings?.trialConfig?.durationDays || 14} days
              </span>
              . Fully adjustable anytime.
            </p>
          </div>
        </div>

        <Link
          to={ROUTES.ADMIN_SUBSCRIPTIONS}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:underline shrink-0"
        >
          Configure Trial Parameters <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Businesses</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {metrics.totalBusinesses}
            </span>
            <span className="text-xs text-zinc-500">registered</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80 pt-2.5">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-3 w-3" /> {metrics.activePaid} Paid
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
              <Clock className="h-3 w-3" /> {metrics.activeTrials} in Trial
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Active Trials</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {metrics.activeTrials}
            </span>
            <span className="text-xs text-zinc-500">businesses</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80 pt-2.5">
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              {metrics.expiredTrials} trials expired
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Users</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {metrics.totalUsers}
            </span>
            <span className="text-xs text-zinc-500">accounts</span>
          </div>
          <div className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80 pt-2.5">
            <span>Platform-wide multi-tenant accounts</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Inventory Items</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {metrics.totalProducts}
            </span>
            <span className="text-xs text-zinc-500">SKUs tracked</span>
          </div>
          <div className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80 pt-2.5 flex items-center justify-between">
            <span>{metrics.totalTransactions} transactions</span>
            <ArrowLeftRight className="h-3 w-3 text-zinc-400" />
          </div>
        </div>
      </div>

      {/* Subscription Tier Distribution Section */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-indigo-500" />
              Dynamic Subscription Tiers Breakdown
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Businesses distribution across the 3 configurable subscription tiers.
            </p>
          </div>
          <Link
            to={ROUTES.ADMIN_SUBSCRIPTIONS}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Edit Tiers →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map((p) => {
            const count = planDistribution[p.planId] || 0;
            const pct = metrics.totalBusinesses > 0 ? Math.round((count / metrics.totalBusinesses) * 100) : 0;
            return (
              <div
                key={p.planId}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-zinc-950/40"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Tier {p.tierOrder}: {p.name}
                    </span>
                  </div>
                  {p.isDefaultTrial && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      Trial Tier
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-xl font-bold text-zinc-900 dark:text-white">
                    {count} <span className="text-xs font-normal text-zinc-500">businesses</span>
                  </span>
                  <span className="text-xs font-mono font-semibold text-zinc-600 dark:text-zinc-400">
                    ${p.monthlyPriceUSD}/mo
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">{pct}% of platform base</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Section: Recent Businesses & Recent Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Businesses */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              Recent Businesses
            </h2>
            <Link
              to={ROUTES.ADMIN_BUSINESSES}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View All ({metrics.totalBusinesses}) →
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentBusinesses.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">No businesses registered yet</p>
            ) : (
              recentBusinesses.map((b) => (
                <div
                  key={b._id}
                  className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{b.name}</h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Owner: {b.owner?.name || b.email || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                      {b.subscription?.plan || 'TRIAL'}
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Recent Platform Users
            </h2>
            <Link
              to={ROUTES.ADMIN_USERS}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View All ({metrics.totalUsers}) →
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentUsers.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">No users registered yet</p>
            ) : (
              recentUsers.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{u.name}</h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.role === 'SUPER_ADMIN'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {u.role}
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* APPROVE / REJECT MODAL */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => {
                setActionModal(null);
                setAdminNoteInput('');
              }}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  actionModal.action === 'APPROVE'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-rose-500/10 text-rose-600'
                }`}
              >
                {actionModal.action === 'APPROVE' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <X className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  {actionModal.action === 'APPROVE'
                    ? `Approve Plan: ${actionModal.request.businessName}`
                    : `Decline Request: ${actionModal.request.businessName}`}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {actionModal.request.action === 'EXTEND'
                    ? `Trial Extension (+${actionModal.request.extendDays} Days)`
                    : `Switching to ${actionModal.request.requestedPlanName || actionModal.request.requestedPlan}`}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
              {actionModal.action === 'APPROVE'
                ? `Approving this application will immediately update the business's subscription to ${
                    actionModal.request.requestedPlanName || actionModal.request.requestedPlan
                  } and dispatch a notification to ${actionModal.request.requestedBy?.name || 'the business owner'}.`
                : `Declining will notify ${actionModal.request.requestedBy?.name || 'the business owner'} that their plan request was not approved.`}
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Admin Note / Remarks (Optional)
              </label>
              <textarea
                rows="2"
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
                placeholder={
                  actionModal.action === 'APPROVE'
                    ? 'e.g. Approved. Welcome to the new tier!'
                    : 'e.g. Please verify payment or contact platform support.'
                }
                className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 resize-none focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setActionModal(null);
                  setAdminNoteInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={actionLoading}
                className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                  actionModal.action === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                <span>
                  {actionLoading
                    ? 'Processing...'
                    : actionModal.action === 'APPROVE'
                    ? 'Confirm & Activate Plan'
                    : 'Decline Request'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOverviewPage;
