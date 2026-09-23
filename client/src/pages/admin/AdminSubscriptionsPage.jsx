import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services/adminService';
import { Select } from '../../components/ui/Select';
import {
  CreditCard,
  Clock,
  Check,
  Edit,
  Trash2,
  Plus,
  Save,
  CheckCircle2,
  Star,
  Zap,
  Sliders,
  X,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export const AdminSubscriptionsPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Subscription Requests Queue state
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestFilter, setRequestFilter] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
  const [reqActionModal, setReqActionModal] = useState(null); // { request, action: 'APPROVE' | 'REJECT' }
  const [adminRemarks, setAdminRemarks] = useState('');
  const [reqActionLoading, setReqActionLoading] = useState(false);
  const [reqSuccessMsg, setReqSuccessMsg] = useState('');

  // Trial form state
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [trialPlanId, setTrialPlanId] = useState('STARTER');
  const [durationDays, setDurationDays] = useState(14);
  const [trialSaving, setTrialSaving] = useState(false);
  const [trialSuccess, setTrialSuccess] = useState('');

  // Plan Edit / Create Modal
  const [activeModal, setActiveModal] = useState(null); // 'create' | 'edit' | null
  const [editingPlan, setEditingPlan] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const [planForm, setPlanForm] = useState({
    planId: '',
    name: '',
    description: '',
    tierOrder: 1,
    monthlyPriceUSD: 0,
    yearlyPriceUSD: 0,
    maxProducts: 250,
    maxMembers: 3,
    features: [],
    badgeText: '',
    isDefaultTrial: false,
    isActive: true,
  });

  const [featureInput, setFeatureInput] = useState('');

  const fetchRequests = useCallback(async (status = requestFilter) => {
    try {
      setRequestsLoading(true);
      const res = await adminService.getSubscriptionRequests({
        status: status === 'ALL' ? undefined : status,
      });
      setRequests(res.requests || []);
    } catch (err) {
      console.error('Failed to fetch subscription requests', err);
    } finally {
      setRequestsLoading(false);
    }
  }, [requestFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [plansData, settingsData] = await Promise.all([
        adminService.getPlans(),
        adminService.getSettings(),
      ]);

      setPlans(plansData || []);
      const s = settingsData.settings;
      if (s?.trialConfig) {
        setTrialEnabled(s.trialConfig.enabled ?? true);
        setTrialPlanId(s.trialConfig.trialPlanId || 'STARTER');
        setDurationDays(s.trialConfig.durationDays || 14);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch subscription configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchRequests(requestFilter);
  }, [fetchRequests, requestFilter]);

  const handleProcessRequest = async () => {
    if (!reqActionModal) return;
    try {
      setReqActionLoading(true);
      if (reqActionModal.action === 'APPROVE') {
        await adminService.approveSubscriptionRequest(reqActionModal.request._id, {
          adminNotes: adminRemarks,
        });
        setReqSuccessMsg(`Plan request for "${reqActionModal.request.businessName}" approved! Subscription active.`);
      } else {
        await adminService.rejectSubscriptionRequest(reqActionModal.request._id, {
          adminNotes: adminRemarks,
        });
        setReqSuccessMsg(`Plan request for "${reqActionModal.request.businessName}" declined.`);
      }
      setReqActionModal(null);
      setAdminRemarks('');
      fetchRequests(requestFilter);
      fetchData();
      setTimeout(() => setReqSuccessMsg(''), 4500);
    } catch (err) {
      alert(err.message || 'Failed to process application action');
    } finally {
      setReqActionLoading(false);
    }
  };

  // Save Trial Configuration
  const handleSaveTrialConfig = async (e) => {
    e.preventDefault();
    try {
      setTrialSaving(true);
      setTrialSuccess('');

      await adminService.updateSettings({
        trialConfig: {
          enabled: trialEnabled,
          trialPlanId: trialPlanId,
          durationDays: Number(durationDays),
        },
      });

      setTrialSuccess('Dynamic trial rules successfully applied to platform!');
      fetchData();
      setTimeout(() => setTrialSuccess(''), 3500);
    } catch (err) {
      alert(err.message || 'Failed to update trial config');
    } finally {
      setTrialSaving(false);
    }
  };

  // Open Edit Plan Modal
  const openEditModal = (p) => {
    setEditingPlan(p);
    setPlanForm({
      planId: p.planId,
      name: p.name,
      description: p.description || '',
      tierOrder: p.tierOrder || 1,
      monthlyPriceUSD: p.monthlyPriceUSD || 0,
      yearlyPriceUSD: p.yearlyPriceUSD || 0,
      maxProducts: p.maxProducts,
      maxMembers: p.maxMembers,
      features: p.features || [],
      badgeText: p.badgeText || '',
      isDefaultTrial: p.isDefaultTrial || false,
      isActive: p.isActive !== false,
    });
    setFeatureInput('');
    setModalError('');
    setActiveModal('edit');
  };

  // Open Create Plan Modal
  const openCreateModal = () => {
    setEditingPlan(null);
    setPlanForm({
      planId: `TIER_${plans.length + 1}`,
      name: `Custom Tier ${plans.length + 1}`,
      description: 'Custom subscription tier',
      tierOrder: plans.length + 1,
      monthlyPriceUSD: 79,
      yearlyPriceUSD: 790,
      maxProducts: 5000,
      maxMembers: 25,
      features: ['Basic Inventory', 'QR Generation', 'Scanner', 'Reports'],
      badgeText: '',
      isDefaultTrial: false,
      isActive: true,
    });
    setFeatureInput('');
    setModalError('');
    setActiveModal('create');
  };

  // Add a feature tag
  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setPlanForm({
        ...planForm,
        features: [...planForm.features, featureInput.trim()],
      });
      setFeatureInput('');
    }
  };

  // Remove a feature tag
  const handleRemoveFeature = (index) => {
    const updated = planForm.features.filter((_, i) => i !== index);
    setPlanForm({ ...planForm, features: updated });
  };

  // Save Plan (Create or Update)
  const handleSavePlan = async (e) => {
    e.preventDefault();
    try {
      setModalLoading(true);
      setModalError('');

      if (activeModal === 'create') {
        await adminService.createPlan(planForm);
      } else {
        await adminService.updatePlan(editingPlan._id, planForm);
      }

      setActiveModal(null);
      fetchData();
    } catch (err) {
      setModalError(err.message || 'Failed to save tier');
    } finally {
      setModalLoading(false);
    }
  };

  // Make Tier Default Trial
  const handleMakeTrial = async (p) => {
    try {
      await adminService.setDefaultTrialPlan(p._id);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to set trial tier');
    }
  };

  // Delete Plan
  const handleDeletePlan = async (p) => {
    if (!window.confirm(`Are you sure you want to delete ${p.name} (${p.planId})?`)) return;
    try {
      await adminService.deletePlan(p._id);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete plan');
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-transparent" />
          <p className="text-xs text-zinc-400">Loading subscription architecture...</p>
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
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  const selectedTrialPlan = plans.find((p) => p.planId === trialPlanId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-zinc-600" />
            Dynamic Subscription Tiers & Trial Governance
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Configure the 3 core subscription tiers, limits, features, pricing, and the automated trial pipeline.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Custom Tier
        </button>
      </div>

      {/* SECTION: Tenant Subscription Applications & Approval Queue */}
      <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-zinc-600/10 text-zinc-800 dark:text-zinc-400 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Subscription Applications & Approval Queue
                </h2>
                {requests.filter((r) => r.status === 'PENDING').length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {requests.filter((r) => r.status === 'PENDING').length} PENDING
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Incoming plan upgrade, downgrade, or extension applications submitted by business owners.
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 self-start sm:self-auto">
            {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setRequestFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  requestFilter === f
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {f === 'ALL' ? 'All Requests' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {reqSuccessMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 shadow-2xs">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{reqSuccessMsg}</span>
          </div>
        )}

        {/* Requests List */}
        {requestsLoading ? (
          <div className="py-12 text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-transparent mx-auto mb-2" />
            <p className="text-xs text-zinc-400">Loading applications...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-10 text-center text-xs text-zinc-400">
            No {requestFilter !== 'ALL' ? requestFilter.toLowerCase() : ''} subscription requests found.
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const isPending = r.status === 'PENDING';
              return (
                <div
                  key={r._id}
                  className={`rounded-2xl border p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    isPending
                      ? 'border-zinc-300 dark:border-zinc-900/60 bg-zinc-600/[0.02] dark:bg-zinc-900/90'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                        {r.businessName || r.businessId?.name}
                      </h3>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          r.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : r.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {r.status}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {new Date(r.createdAt).toLocaleDateString()} at{' '}
                        {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300 flex-wrap">
                      <span>Owner: <strong className="text-zinc-800 dark:text-zinc-200">{r.requestedBy?.name || 'Owner'}</strong> ({r.requestedBy?.email})</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                        <span>Current: <code className="text-zinc-500 font-mono text-[11px]">{r.currentPlan}</code></span>
                        <ArrowRight className="h-3 w-3 text-zinc-600" />
                        <span className="text-zinc-800 dark:text-zinc-400 font-bold">
                          {r.action === 'EXTEND'
                            ? `Extend Trial (+${r.extendDays} Days)`
                            : `Switch to ${r.requestedPlanName || r.requestedPlan}`}
                        </span>
                      </span>
                    </div>

                    {r.note && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800 italic">
                        Owner Note: "{r.note}"
                      </p>
                    )}

                    {r.adminNotes && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850 p-2 rounded-xl italic">
                        Admin Note: "{r.adminNotes}"
                      </p>
                    )}
                  </div>

                  {/* Actions for Pending */}
                  {isPending && (
                    <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-200 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setReqActionModal({ request: r, action: 'APPROVE' })}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve Plan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReqActionModal({ request: r, action: 'REJECT' })}
                        className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 1: Dynamic Trial System Configuration */}
      <div className="rounded-3xl border border-zinc-300 dark:border-zinc-900/60 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-2xl bg-zinc-800 text-white flex items-center justify-center shadow-lg shadow-sm">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Automated Trial System
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-white shadow-2xs">
                Dynamic Rule
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Controls what new businesses receive immediately upon account registration.
            </p>
          </div>
        </div>

        {trialSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {trialSuccess}
          </div>
        )}

        <form onSubmit={handleSaveTrialConfig} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Trial Enabled Toggle */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-4">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Trial System Status
              </label>
              <p className="text-[11px] text-zinc-400 mb-3">
                Enable free evaluation period for newly registered businesses.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTrialEnabled(!trialEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    trialEnabled ? 'bg-zinc-800' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      trialEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  {trialEnabled ? 'Trial Active' : 'Trial Disabled (Direct Paid)'}
                </span>
              </div>
            </div>

            {/* Trial Tier Selection */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-4">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Assigned Trial Plan (Dynamic Tier)
              </label>
              <p className="text-[11px] text-zinc-400 mb-2">
                Which subscription tier is provisioned for trial tenants.
              </p>
              <Select
                value={trialPlanId}
                onChange={(e) => setTrialPlanId(e.target.value)}
                options={plans.map((p) => ({
                  value: p.planId,
                  label: `Tier ${p.tierOrder}: ${p.name} (${p.planId})`,
                }))}
              />
            </div>

            {/* Trial Duration */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-4">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Trial Duration (Days)
              </label>
              <p className="text-[11px] text-zinc-400 mb-2">
                Number of days access is granted before expiration.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="365"
                  required
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="w-24 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono font-bold"
                />
                <span className="text-xs text-zinc-500 font-medium">days (e.g. 14, 30)</span>
              </div>
            </div>
          </div>

          {/* Live Rule Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
              <Zap className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                Active Policy:{' '}
                <strong className="text-zinc-800 dark:text-zinc-400">
                  {selectedTrialPlan ? `${selectedTrialPlan.name} (Tier ${selectedTrialPlan.tierOrder})` : trialPlanId}
                </strong>{' '}
                for <strong className="text-zinc-800 dark:text-zinc-400">{durationDays} calendar days</strong> upon tenant creation.
              </span>
            </div>

            <button
              type="submit"
              disabled={trialSaving}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-600 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {trialSaving ? 'Applying...' : 'Apply Trial Configuration'}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Dynamic 3 Tiers Cards Display */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-zinc-600" />
              Configured Subscription Tiers
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Each tier can be modified on-the-fly. Changes are immediately reflected in billing and tenant quotas.
            </p>
          </div>
          <span className="text-xs text-zinc-400 font-mono">{plans.length} Tiers Configured</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isTrial = p.isDefaultTrial || p.planId === trialPlanId;

            return (
              <div
                key={p._id}
                className={`rounded-3xl border flex flex-col justify-between p-6 shadow-xs transition-all relative ${
                  isTrial
                    ? 'border-zinc-600 bg-white dark:bg-zinc-900/90 shadow-md shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70'
                }`}
              >
                {/* Top Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                    Tier {p.tierOrder} • {p.planId}
                  </span>
                  {isTrial ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-white">
                      <Star className="h-2.5 w-2.5 fill-white" /> Default Trial
                    </span>
                  ) : p.badgeText ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      {p.badgeText}
                    </span>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{p.name}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 min-h-[32px] leading-relaxed">
                    {p.description || 'Flexible inventory tier'}
                  </p>

                  {/* Pricing */}
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-zinc-900 dark:text-white">
                      Rs. {(p.monthlyPriceNPR || p.monthlyPriceUSD || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">/ month</span>
                  </div>

                  {/* Limits */}
                  <div className="mt-4 space-y-2 py-3 border-y border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">Max Inventory Items:</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                        {p.maxProducts === -1 ? 'Unlimited' : `${p.maxProducts.toLocaleString()} SKUs`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">Max Team Members:</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                        {p.maxMembers === -1 ? 'Unlimited' : `${p.maxMembers} seats`}
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="mt-4">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2 font-mono">
                      Features Included:
                    </span>
                    <ul className="space-y-1.5">
                      {p.features && p.features.length > 0 ? (
                        p.features.map((feat, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300"
                          >
                            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-xs text-zinc-400 italic">No specific features listed</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openEditModal(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit Tier
                  </button>

                  {!isTrial ? (
                    <button
                      onClick={() => handleMakeTrial(p)}
                      title="Set as Default Trial Tier"
                      className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-950/60 text-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Make Trial
                    </button>
                  ) : null}

                  {plans.length > 3 && (
                    <button
                      onClick={() => handleDeletePlan(p)}
                      title="Delete Plan"
                      className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: Edit or Create Subscription Tier */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 relative my-8">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-9 w-9 rounded-xl bg-zinc-600/10 text-zinc-800 dark:text-zinc-400 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  {activeModal === 'create' ? 'Create New Subscription Tier' : `Edit Tier: ${planForm.name}`}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  ID: <code className="font-mono text-xs">{planForm.planId}</code>
                </p>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {modalError}
              </div>
            )}

            <form onSubmit={handleSavePlan} className="space-y-3">
              {activeModal === 'create' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Plan ID (Uppercase, e.g. TIER_4, ULTRA)
                  </label>
                  <input
                    type="text"
                    required
                    value={planForm.planId}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, planId: e.target.value.toUpperCase() })
                    }
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Tier Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Tier Order (1, 2, 3...)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={planForm.tierOrder}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, tierOrder: Number(e.target.value) })
                    }
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Monthly Price (Rs. NPR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={planForm.monthlyPriceUSD}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        monthlyPriceUSD: Number(e.target.value),
                        monthlyPriceNPR: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Badge Tag (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Most Popular"
                    value={planForm.badgeText}
                    onChange={(e) => setPlanForm({ ...planForm, badgeText: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Max Products (-1 for unlimited)
                  </label>
                  <input
                    type="number"
                    required
                    value={planForm.maxProducts}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, maxProducts: Number(e.target.value) })
                    }
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Max Members (-1 for unlimited)
                  </label>
                  <input
                    type="number"
                    required
                    value={planForm.maxMembers}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, maxMembers: Number(e.target.value) })
                    }
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Feature Tags Editor */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Features Included
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add feature description..."
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    className="flex-1 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-xs text-zinc-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  {planForm.features.map((feat, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[11px] bg-white dark:bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
                    >
                      {feat}
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(i)}
                        className="text-zinc-400 hover:text-rose-500 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="modalTrialDefault"
                    checked={planForm.isDefaultTrial}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, isDefaultTrial: e.target.checked })
                    }
                    className="rounded border-zinc-300 text-zinc-800 focus:ring-zinc-600"
                  />
                  <label
                    htmlFor="modalTrialDefault"
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Set as Default Trial Tier
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-600 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : 'Save Tier Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPROVE / REJECT APPLICATION MODAL */}
      {reqActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => {
                setReqActionModal(null);
                setAdminRemarks('');
              }}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  reqActionModal.action === 'APPROVE'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-rose-500/10 text-rose-600'
                }`}
              >
                {reqActionModal.action === 'APPROVE' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <X className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  {reqActionModal.action === 'APPROVE'
                    ? `Approve Application: ${reqActionModal.request.businessName}`
                    : `Decline Application: ${reqActionModal.request.businessName}`}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {reqActionModal.request.action === 'EXTEND'
                    ? `Trial Extension (+${reqActionModal.request.extendDays} Days)`
                    : `Switching to ${reqActionModal.request.requestedPlanName || reqActionModal.request.requestedPlan}`}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
              {reqActionModal.action === 'APPROVE'
                ? `Approving this application will immediately update the business subscription to ${
                    reqActionModal.request.requestedPlanName || reqActionModal.request.requestedPlan
                  } and notify ${reqActionModal.request.requestedBy?.name || 'the business owner'}.`
                : `Declining will notify ${reqActionModal.request.requestedBy?.name || 'the business owner'} that their plan request was not approved.`}
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Admin Note / Remarks (Optional)
              </label>
              <textarea
                rows="2"
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder={
                  reqActionModal.action === 'APPROVE'
                    ? 'e.g. Approved. Quotas increased.'
                    : 'e.g. Please verify payment or contact platform support.'
                }
                className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 resize-none focus:outline-hidden focus:ring-1 focus:ring-zinc-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setReqActionModal(null);
                  setAdminRemarks('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessRequest}
                disabled={reqActionLoading}
                className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                  reqActionModal.action === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                <span>
                  {reqActionLoading
                    ? 'Processing...'
                    : reqActionModal.action === 'APPROVE'
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

export default AdminSubscriptionsPage;
