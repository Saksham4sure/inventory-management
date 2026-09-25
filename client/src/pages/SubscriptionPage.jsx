import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { businessService } from '../services/businessService';
import { useBusiness } from '../hooks/useBusiness';
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { ROUTES } from '../constants/routes';
import {
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Check,
  Calendar,
  ArrowRight,
  Boxes,
  Users,
  RefreshCw,
  Star,
  Lock,
  Send,
  CalendarPlus,
  Building2,
} from 'lucide-react';

const DURATION_PRESETS = [
  { days: 7, label: '+7 Days', badge: '1 Week' },
  { days: 14, label: '+14 Days', badge: '2 Weeks' },
  { days: 30, label: '+30 Days', badge: '1 Month (Popular)', popular: true },
  { days: 60, label: '+60 Days', badge: '2 Months' },
  { days: 90, label: '+90 Days', badge: '3 Months' },
  { days: 'custom', label: 'Custom', badge: 'Specific days' },
];

export const SubscriptionPage = () => {
  const { business, refreshBusiness } = useBusiness();
  const { user } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  // Plan action modal state: { plan, action: 'CHANGE' | 'EXTEND' | 'ACTIVATE' }
  const [selectedPlanModal, setSelectedPlanModal] = useState(null);
  const [selectedExtendOption, setSelectedExtendOption] = useState(30);
  const [customDays, setCustomDays] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [noticeModal, setNoticeModal] = useState(null); // { title, message, type: 'business_required' | 'owner_required' | 'error' }
  const [confirmCancelModal, setConfirmCancelModal] = useState(false);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await businessService.getSubscription();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch subscription information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const hasBusiness = Boolean(data?.hasBusiness || business?._id || user?.businessId);
  const isOwner = user?.role === 'OWNER' || Boolean(data?.isOwner);

  const activeDays = useMemo(() => {
    if (selectedExtendOption === 'custom') {
      const parsed = parseInt(customDays, 10);
      return isNaN(parsed) || parsed <= 0 ? 30 : parsed;
    }
    return Number(selectedExtendOption) || 30;
  }, [selectedExtendOption, customDays]);

  const projectedNewEndDate = useMemo(() => {
    if (!data?.subscription?.endDate) return 'N/A';
    const endMs = new Date(data.subscription.endDate).getTime();
    const projected = new Date(endMs + activeDays * 24 * 60 * 60 * 1000);
    return projected.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [data, activeDays]);

  const handleOpenExtendAction = (plan) => {
    if (!hasBusiness) {
      setNoticeModal({
        title: 'Business Configuration Required',
        message:
          'A configured business profile is required to extend or manage subscription plans. Please complete your identity verification (KYC) and configure your business profile first.',
        type: 'business_required',
      });
      return;
    }
    if (!isOwner) {
      setNoticeModal({
        title: 'Owner Authorization Required',
        message: 'Only the registered business owner can apply to change or extend subscription plans.',
        type: 'owner_required',
      });
      return;
    }
    setRequestNote('');
    setSelectedExtendOption(30);
    setCustomDays('');
    setSelectedPlanModal({ plan, action: 'EXTEND' });
  };

  const handleSelectPlanAction = (plan, action = 'CHANGE') => {
    if (!hasBusiness) {
      setNoticeModal({
        title: 'Business Configuration Required',
        message:
          'A configured business profile is required to apply for or switch subscription plans. Please complete your identity verification (KYC) and configure your business profile first.',
        type: 'business_required',
      });
      return;
    }
    if (!isOwner) {
      setNoticeModal({
        title: 'Owner Authorization Required',
        message: 'Only the registered business owner can apply to change or extend subscription plans.',
        type: 'owner_required',
      });
      return;
    }
    setRequestNote('');
    setSelectedExtendOption(30);
    setCustomDays('');
    setSelectedPlanModal({ plan, action });
  };

  const handleConfirmSubscriptionChange = async () => {
    if (!selectedPlanModal) return;

    try {
      setSubmitting(true);
      const daysToSend = selectedPlanModal.action === 'EXTEND' ? activeDays : 14;

      await businessService.changeSubscription({
        planId: selectedPlanModal.plan.planId,
        action: selectedPlanModal.action,
        extendDays: daysToSend,
        note: requestNote,
      });

      showSuccess(
        selectedPlanModal.action === 'EXTEND'
          ? `Subscription extension request (+${daysToSend} days) submitted! Platform Administration will review your application.`
          : `Application to switch to ${selectedPlanModal.plan.name} submitted! Platform Administration will review your request.`
      );

      setSelectedPlanModal(null);
      setRequestNote('');
      await fetchSubscriptionData();
      if (refreshBusiness) refreshBusiness();
    } catch (err) {
      showError(err.message || 'Failed to submit subscription application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancelAction = async () => {
    try {
      setCancelling(true);
      await businessService.cancelSubscriptionRequest();
      showSuccess('Your pending subscription application was cancelled.');
      await fetchSubscriptionData();
    } catch (err) {
      showError(err.message || 'Failed to cancel subscription request');
    } finally {
      setCancelling(false);
      setConfirmCancelModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2.5">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            Checking subscription status & dynamic tiers...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-500" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
        <button
          onClick={fetchSubscriptionData}
          className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const { hasSubscribed, subscription, availablePlans = [] } = data || {};
  const isTrial = subscription?.isTrial;
  const isExpired = subscription?.isExpired;
  const daysRemaining = subscription?.daysRemaining ?? 0;
  const planDetails = subscription?.planDetails;

  // Find the plan object matching current subscription
  const currentPlanObj =
    availablePlans.find((p) => p.planId === subscription?.plan) || {
      planId: subscription?.plan || 'PRO',
      name: planDetails?.name || subscription?.plan || 'Pro Tier',
      tierOrder: planDetails?.tierOrder || 1,
      monthlyPriceUSD: planDetails?.monthlyPriceUSD || 0,
    };

  // Calculate elapsed percentage of duration
  let elapsedPercentage = 0;
  if (subscription?.startDate && subscription?.endDate) {
    const start = new Date(subscription.startDate).getTime();
    const end = new Date(subscription.endDate).getTime();
    const now = new Date().getTime();
    const totalDuration = end - start;
    if (totalDuration > 0) {
      const elapsed = now - start;
      elapsedPercentage = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
              <CreditCard className="h-6 w-6 text-indigo-500" />
              Subscription & Plan Management
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Review your active plan, extend duration without interruptions, and explore scalable tiers.
          </p>
        </div>

        <button
          onClick={fetchSubscriptionData}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer shadow-2xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* OWNER-ONLY RESTRICTION BANNER FOR TEAM MEMBERS & MANAGERS */}
      {!isOwner && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-3.5 shadow-xs">
          <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-xs">Subscription Management Restricted</p>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              Only the registered business owner can request or extend subscription plans.
              As a <span className="font-semibold uppercase">{user?.role || 'team member'}</span>, you have view-only access to plan specifications, quotas, and expiration dates.
            </p>
          </div>
        </div>
      )}

      {/* PENDING APPLICATION BANNER */}
      {data?.pendingRequest && (
        <div className="rounded-3xl border border-indigo-200 dark:border-indigo-900/80 bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/25">
                <Clock className="h-5 w-5 animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                    Application Pending Approval
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                    {data.pendingRequest.action === 'EXTEND'
                      ? `Duration Extension (+${data.pendingRequest.extendDays || 14} Days)`
                      : `Switch to ${data.pendingRequest.requestedPlanName || data.pendingRequest.requestedPlan}`}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Submitted on {new Date(data.pendingRequest.createdAt).toLocaleDateString()} at{' '}
                  {new Date(data.pendingRequest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                  The platform administration has been notified and will review your application.
                </p>
                {data.pendingRequest.note && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 italic">
                    "Your Note: {data.pendingRequest.note}"
                  </p>
                )}
              </div>
            </div>

            {isOwner && (
              <button
                type="button"
                onClick={() => setConfirmCancelModal(true)}
                disabled={cancelling}
                className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-zinc-900 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Application'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* NO BUSINESS CONFIGURED RESTRICTION BANNER */}
      {!hasBusiness && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-xs">Business Profile Required</p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                You must configure your business profile before applying for or managing subscription plans.
                Government identity verification (KYC) must be approved by Platform Compliance first.
              </p>
            </div>
          </div>
          <Link
            to={`${ROUTES.PROFILE}?tab=business`}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-xs shrink-0"
          >
            <span>Configure Business</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* SECTION 1: ACTIVE SUBSCRIPTION CARD */}
      {hasSubscribed && subscription && (
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm overflow-hidden">
          {/* Top Banner */}
          <div className="p-6 sm:p-8 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border-b border-zinc-200/80 dark:border-zinc-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {isTrial ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-600 text-white shadow-xs">
                      <Clock className="h-3.5 w-3.5" />
                      Free Trial Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-600 text-white shadow-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Active Subscription
                    </span>
                  )}
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-mono">
                    Tier {planDetails?.tierOrder || 1} • {subscription.plan}
                  </span>
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  {planDetails?.name || subscription.plan}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl">
                  {planDetails?.description ||
                    'Multi-tenant inventory management with QR barcode tracking, party credits, and team collaboration.'}
                </p>
              </div>

              {/* Price Capsule */}
              <div className="flex flex-col md:items-end bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-800">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Standard Billing</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl font-extrabold text-zinc-900 dark:text-white">
                    Rs. {(planDetails?.monthlyPriceNPR || planDetails?.monthlyPriceUSD || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">/ month</span>
                </div>
              </div>
            </div>
          </div>

          {/* Durations & Metrics Grid */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Metric 1: Days Remaining Gauge */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 p-4 sm:p-5">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                  Duration Remaining
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
                    {daysRemaining}
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-300 font-semibold">
                    {daysRemaining === 1 ? 'day remaining' : 'days remaining'}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${100 - elapsedPercentage}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {elapsedPercentage}% of cycle elapsed
                </span>
              </div>

              {/* Metric 2: Start Date */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 p-4 sm:p-5">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                  Start Date
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">
                    {subscription.startDate
                      ? new Date(subscription.startDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-2">Provisioned upon business registration</p>
              </div>

              {/* Metric 3: Expiration Date */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 p-4 sm:p-5">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                  {isTrial ? 'Trial Expiration' : 'Next Renewal Date'}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">
                    {subscription.endDate
                      ? new Date(subscription.endDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-2">
                  {isTrial ? 'Can be extended or upgraded below' : 'Auto-renewed on cycle'}
                </p>
              </div>
            </div>

            {/* Quotas & Resource Utilization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300">
                    <Boxes className="h-4 w-4 text-indigo-500" />
                    Product SKU Capacity
                  </span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white">
                    {subscription.usage?.productsCount || 0} /{' '}
                    {planDetails?.maxProducts === -1 ? 'Unlimited' : planDetails?.maxProducts || 250} SKUs
                  </span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full"
                    style={{
                      width: `${
                        planDetails?.maxProducts === -1
                          ? 10
                          : Math.min(
                              100,
                              ((subscription.usage?.productsCount || 0) /
                                (planDetails?.maxProducts || 250)) *
                                100
                            )
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300">
                    <Users className="h-4 w-4 text-purple-500" />
                    Team Member Seats
                  </span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white">
                    {subscription.usage?.membersCount || 1} /{' '}
                    {planDetails?.maxMembers === -1 ? 'Unlimited' : planDetails?.maxMembers || 3} seats
                  </span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-purple-600 h-1.5 rounded-full"
                    style={{
                      width: `${
                        planDetails?.maxMembers === -1
                          ? 10
                          : Math.min(
                              100,
                              ((subscription.usage?.membersCount || 1) /
                                (planDetails?.maxMembers || 3)) *
                                100
                            )
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Features Included in current tier */}
            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-3 font-mono">
                Included in Your Current Tier:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {planDetails?.features?.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* DIRECT ACTION BUTTONS (NO CLUNKY DROPDOWN ACCORDION) */}
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Need more days, higher SKU limits, or extra team seats?
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Direct Action 1: Extend Duration */}
                <button
                  type="button"
                  disabled={!isOwner || Boolean(data?.pendingRequest)}
                  onClick={() => handleOpenExtendAction(currentPlanObj)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span>Extend Duration</span>
                </button>

                {/* Direct Action 2: Switch / Upgrade Tier */}
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('subscription-tiers');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Explore & Switch Plans</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CASE B: EXPIRED OR NOT SUBSCRIBED */}
      {(!hasSubscribed || isExpired) && (
        <div className="rounded-3xl border border-amber-300 dark:border-amber-900/60 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                {isExpired ? 'Your Subscription or Free Trial Has Expired' : 'No Active Subscription Plan'}
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Choose one of our 3 flexible subscription tiers below to unlock continuous inventory tracking,
                high-speed camera barcode scanning, customer ledgers, and team multi-user access.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: AVAILABLE 3-TIER PLANS (ALWAYS VISIBLE & CLEAN) */}
      <div id="subscription-tiers" className="space-y-4 pt-4 scroll-mt-6">
        <div className="text-center max-w-2xl mx-auto mb-6">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
            Platform Subscription Plans
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-2">
            Available 3-Tier Subscription Plans
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Dynamically governed by platform administration. Apply to upgrade, downgrade, or extend anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {availablePlans.map((plan) => {
            const isCurrent = subscription?.plan === plan.planId && hasSubscribed;

            return (
              <div
                key={plan._id}
                className={`rounded-3xl border flex flex-col justify-between p-6 shadow-sm transition-all relative ${
                  isCurrent
                    ? 'border-indigo-600 dark:border-indigo-500 bg-white dark:bg-zinc-900/90 ring-2 ring-indigo-500/20'
                    : plan.badgeText
                    ? 'border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-zinc-900/80'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70'
                }`}
              >
                {/* Top Header Tag */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                    Tier {plan.tierOrder}
                  </span>
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-600 text-white shadow-xs">
                      <CheckCircle2 className="h-3 w-3" />
                      Current Plan
                    </span>
                  ) : plan.badgeText ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      {plan.badgeText}
                    </span>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{plan.name}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 min-h-[32px] leading-relaxed">
                    {plan.description || 'Flexible inventory tracking for all business scales.'}
                  </p>

                  {/* Pricing */}
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-zinc-900 dark:text-white">
                      Rs. {(plan.monthlyPriceNPR || plan.monthlyPriceUSD || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">/ month</span>
                  </div>

                  {/* Limits */}
                  <div className="mt-4 space-y-2 py-3 border-y border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">Max Inventory Items:</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                        {plan.maxProducts === -1 ? 'Unlimited' : `${plan.maxProducts.toLocaleString()} SKUs`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">Team Seats:</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                        {plan.maxMembers === -1 ? 'Unlimited' : `${plan.maxMembers} seats`}
                      </span>
                    </div>
                  </div>

                  {/* Features list */}
                  <div className="mt-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 font-mono">
                      Key Features Included:
                    </span>
                    <ul className="space-y-2">
                      {plan.features?.map((feat, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300"
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Button Actions */}
                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  {!isOwner ? (
                    <div className="w-full py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-500 dark:text-zinc-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed">
                      <Lock className="h-3.5 w-3.5" />
                      <span>Owner Only Action</span>
                    </div>
                  ) : isCurrent ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={Boolean(data?.pendingRequest)}
                        onClick={() => handleOpenExtendAction(plan)}
                        className="w-full py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer border border-indigo-200 dark:border-indigo-800 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <CalendarPlus className="h-4 w-4" />
                        <span>Apply for Plan Extension</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={Boolean(data?.pendingRequest)}
                      onClick={() => handleSelectPlanAction(plan, 'CHANGE')}
                      className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <span>
                        {data?.hasBusiness
                          ? `Apply to Switch to ${plan.name}`
                          : `Subscribe to ${plan.name}`}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PLAN ACTION / EXTENSION MODAL */}
      {selectedPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-hidden">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 sm:p-7 modal-scroll overscroll-contain">
              <div className="flex items-center gap-3 mb-5">
              <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                {selectedPlanModal.action === 'EXTEND' ? (
                  <CalendarPlus className="h-6 w-6" />
                ) : (
                  <Sparkles className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                  {selectedPlanModal.action === 'EXTEND'
                    ? 'Apply for Plan Duration Extension'
                    : data?.hasBusiness
                    ? `Apply to Switch to ${selectedPlanModal.plan.name}`
                    : `Subscribe to ${selectedPlanModal.plan.name}`}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {selectedPlanModal.action === 'EXTEND'
                    ? `Extending ${selectedPlanModal.plan.name} (Tier ${selectedPlanModal.plan.tierOrder})`
                    : `Tier ${selectedPlanModal.plan.tierOrder} • Rs. ${(selectedPlanModal.plan.monthlyPriceNPR || selectedPlanModal.plan.monthlyPriceUSD || 0).toLocaleString('en-IN')}/month`}
                </p>
              </div>
            </div>

            {/* EXTENSION SPECIFIC: DURATION SELECTOR CARDS (REPLACING THE OLD DROPDOWN THING) */}
            {selectedPlanModal.action === 'EXTEND' && (
              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                    Choose Extension Duration:
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {DURATION_PRESETS.map((preset) => {
                      const isSelected = selectedExtendOption === preset.days;
                      return (
                        <button
                          key={preset.days}
                          type="button"
                          onClick={() => setSelectedExtendOption(preset.days)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono">{preset.label}</span>
                            {isSelected && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                            {preset.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom days input if selected */}
                {selectedExtendOption === 'custom' && (
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Enter custom number of days:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={customDays}
                        onChange={(e) => setCustomDays(e.target.value)}
                        placeholder="e.g. 45"
                        className="w-32 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold text-zinc-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">days to add</span>
                    </div>
                  </div>
                )}

                {/* Live Projected Expiration Date Preview */}
                <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-transparent dark:from-indigo-950/40 dark:via-purple-950/20 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                      Projected New Expiry Date:
                    </span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-300 font-mono">
                      +{activeDays} Days Added
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                      {projectedNewEndDate}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SWITCH PLAN SPECIFIC: QUOTA COMPARISON */}
            {selectedPlanModal.action === 'CHANGE' && (
              <div className="space-y-3 mb-5">
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  You are applying to transition your workspace to{' '}
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {selectedPlanModal.plan.name}
                  </span>
                  . Once approved by Platform Administration, your limits will be updated:
                </p>

                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 text-xs">
                  <div>
                    <span className="text-zinc-500 block mb-0.5">Product SKU Limit</span>
                    <span className="font-bold text-zinc-900 dark:text-white font-mono">
                      {selectedPlanModal.plan.maxProducts === -1
                        ? 'Unlimited'
                        : `${selectedPlanModal.plan.maxProducts.toLocaleString()} SKUs`}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-0.5">Team Seats</span>
                    <span className="font-bold text-zinc-900 dark:text-white font-mono">
                      {selectedPlanModal.plan.maxMembers === -1
                        ? 'Unlimited'
                        : `${selectedPlanModal.plan.maxMembers} Seats`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Application Note for Platform Administration */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Application Note for Platform Administration (Optional)
              </label>
              <textarea
                rows="3"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="e.g. Please approve our extension for onboarding new branch inventory..."
                className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 resize-none focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setSelectedPlanModal(null);
                  setRequestNote('');
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubscriptionChange}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submitting ? 'Submitting Application...' : 'Submit Application to Platform Administration'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* POPUP NOTICE MODAL (Replaces alerts) */}
      {noticeModal && (
        <div
          className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setNoticeModal(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4 animate-ios-alert overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  noticeModal.type === 'business_required'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    : noticeModal.type === 'error'
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                }`}
              >
                {noticeModal.type === 'business_required' ? (
                  <Building2 className="h-6 w-6" />
                ) : noticeModal.type === 'error' ? (
                  <AlertCircle className="h-6 w-6" />
                ) : (
                  <Lock className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  {noticeModal.title}
                </h3>
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                  {noticeModal.type === 'business_required' ? 'Prerequisite Required' : 'Notice'}
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {noticeModal.message}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setNoticeModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Close
              </button>
              {noticeModal.type === 'business_required' && (
                <Link
                  to={`${ROUTES.PROFILE}?tab=business`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold shadow-xs transition-colors"
                >
                  <span>Configure Business</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR CANCELLATION */}
      {confirmCancelModal && (
        <div
          className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirmCancelModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4 animate-ios-alert overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Cancel Pending Application?
                </h3>
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                  Confirmation
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Are you sure you want to cancel your pending subscription application? This will withdraw your request from Platform Administration review.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setConfirmCancelModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Keep Application
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancelAction}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
