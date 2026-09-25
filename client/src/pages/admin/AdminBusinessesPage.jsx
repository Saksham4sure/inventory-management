import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Select } from '../../components/ui/Select';
import { DatePicker } from '../../components/ui/DatePicker';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { validateNepaliPhone } from '../../utils/phoneValidator';
import {
  Building2,
  Search,
  SlidersHorizontal,
  Edit2,
  CreditCard,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  PlusCircle,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const AdminBusinessesPage = () => {
  const [businesses, setBusinesses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');

  // Modals state
  const [subscriptionModal, setSubscriptionModal] = useState(null); // business object or null
  const [editModal, setEditModal] = useState(null); // business object or null
  const [deleteModal, setDeleteModal] = useState(null); // business object or null
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // Form states for subscription modal
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [extendDays, setExtendDays] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Form states for edit business modal
  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    currency: 'USD',
    phone: '',
    email: '',
    address: '',
    taxNumber: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [bizRes, plansRes] = await Promise.all([
        adminService.getBusinesses({
          search,
          status: statusFilter,
          plan: planFilter,
        }),
        adminService.getPlans(),
      ]);
      setBusinesses(bizRes.businesses || []);
      setPlans(plansRes || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch businesses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, planFilter]);

  // Open Subscription Modal
  const openSubscriptionModal = (b) => {
    setSubscriptionModal(b);
    setSelectedPlan(b.subscription?.plan || 'STARTER');
    setSelectedStatus(b.subscription?.status || 'TRIAL');
    setExtendDays('');
    setCustomEndDate(
      b.subscription?.endDate
        ? new Date(b.subscription.endDate).toISOString().split('T')[0]
        : ''
    );
    setActionSuccess('');
  };

  const handleUpdateSubscription = async (e) => {
    e.preventDefault();
    if (!subscriptionModal) return;

    try {
      setActionLoading(true);
      await adminService.updateBusinessSubscription(subscriptionModal._id, {
        plan: selectedPlan,
        status: selectedStatus,
        extendDays: extendDays ? Number(extendDays) : undefined,
        customEndDate: customEndDate || undefined,
      });

      setActionSuccess('Subscription details updated successfully!');
      setTimeout(() => {
        setSubscriptionModal(null);
        fetchData();
      }, 750);
    } catch (err) {
      alert(err.message || 'Failed to update subscription');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Business Modal
  const openEditModal = (b) => {
    setEditModal(b);
    setEditForm({
      name: b.name || '',
      category: b.category || '',
      currency: b.currency || 'USD',
      phone: b.phone || '',
      email: b.email || '',
      address: b.address || '',
      taxNumber: b.taxNumber || '',
    });
    setActionSuccess('');
  };

  const handleEditBusiness = async (e) => {
    e.preventDefault();
    if (!editModal) return;

    if (editForm.phone && editForm.phone.trim()) {
      const pCheck = validateNepaliPhone(editForm.phone, false);
      if (!pCheck.isValid) {
        alert(pCheck.error || 'Please enter a valid Nepali contact number.');
        return;
      }
    }

    try {
      setActionLoading(true);
      await adminService.updateBusiness(editModal._id, editForm);
      setActionSuccess('Business profile updated successfully!');
      setTimeout(() => {
        setEditModal(null);
        fetchData();
      }, 750);
    } catch (err) {
      alert(err.message || 'Failed to update business');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Business
  const handleDeleteBusiness = async () => {
    if (!deleteModal) return;

    try {
      setActionLoading(true);
      await adminService.deleteBusiness(deleteModal._id);
      setDeleteModal(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete business');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-zinc-600" />
            Businesses & Multi-Tenancy
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Global management of registered organizations, subscriptions, trial limits, and multi-tenant quotas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-mono">
            {businesses.length} {businesses.length === 1 ? 'business' : 'businesses'} listed
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by business name, category, or owner email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2 pl-10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-600"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-40 sm:w-44">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'TRIAL', label: 'In Trial' },
                { value: 'ACTIVE', label: 'Active Paid' },
                { value: 'PAST_DUE', label: 'Past Due' },
                { value: 'CANCELED', label: 'Canceled' },
              ]}
              compact
            />
          </div>

          <div className="w-44 sm:w-48">
            <Select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Plans' },
                ...plans.map((p) => ({
                  value: p.planId,
                  label: `${p.name} (${p.planId})`,
                })),
              ]}
              compact
            />
          </div>
        </div>
      </div>

      {/* Businesses Table */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex h-64 w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-transparent" />
              <p className="text-xs text-zinc-400">Loading businesses directory...</p>
            </div>
          </div>
        ) : businesses.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No businesses found</p>
            <p className="text-xs text-zinc-400 mt-0.5">Try refining your search query or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Owner Account</th>
                  <th className="px-4 py-3">Subscription Tier</th>
                  <th className="px-4 py-3">Trial & Status</th>
                  <th className="px-4 py-3">Usage</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {businesses.map((b) => {
                  const planId = b.subscription?.plan || 'STARTER';
                  const status = b.subscription?.status || 'TRIAL';
                  const isTrial = status === 'TRIAL';

                  return (
                    <tr
                      key={b._id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-zinc-600/10 text-zinc-800 dark:text-zinc-400 font-bold flex items-center justify-center shrink-0">
                            {b.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-900 dark:text-white block">
                              {b.name}
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                              {b.category || 'Retail'} • <code className="text-[10px] font-mono">{b.currency}</code>
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {b.owner ? (
                          <div>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100 block">
                              {b.owner.name}
                            </span>
                            <span className="text-[11px] text-zinc-400 font-mono">
                              {b.owner.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">No owner linked</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                          <CreditCard className="h-3 w-3 text-zinc-600" />
                          {planId}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {isTrial ? (
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                b.isExpired
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                  : 'bg-zinc-600/10 text-zinc-800 dark:text-zinc-400 border border-zinc-600/20'
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                              {b.isExpired ? 'Trial Expired' : `Trial (${b.daysRemaining}d left)`}
                            </span>
                            <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                              Ends: {b.subscription?.endDate ? new Date(b.subscription.endDate).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {status}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                          <span>{b.productCount || 0} products</span>
                          <span className="mx-1">•</span>
                          <span>{b.memberCount || 1} users</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-zinc-500 text-[11px]">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openSubscriptionModal(b)}
                            title="Manage Subscription & Trial"
                            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-950/60 text-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 transition-colors cursor-pointer"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(b)}
                            title="Edit Business Profile"
                            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteModal(b)}
                            title="Delete Business"
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Manage Subscription & Trial Extension */}
      {subscriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-hidden">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl relative my-auto max-h-[90vh] flex flex-col overflow-hidden">
            <button
              onClick={() => setSubscriptionModal(null)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white z-10 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex-1 overflow-y-auto p-6 modal-scroll overscroll-contain">

            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-9 w-9 rounded-xl bg-zinc-600/10 text-zinc-800 dark:text-zinc-400 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Manage Subscription & Trial
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {subscriptionModal.name}
                </p>
              </div>
            </div>

            {actionSuccess && (
              <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {actionSuccess}
              </div>
            )}

            <form onSubmit={handleUpdateSubscription} className="space-y-4">
              <div>
                <Select
                  label="Subscription Tier (Dynamic Tiers)"
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  options={plans.map((p) => ({
                    value: p.planId,
                    label: `Tier ${p.tierOrder}: ${p.name} (Rs. ${(p.monthlyPriceNPR || p.monthlyPriceUSD || 0).toLocaleString('en-IN')}/mo)${p.isDefaultTrial ? ' ★ Default Trial' : ''}`,
                  }))}
                />
              </div>

              <div>
                <Select
                  label="Status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  options={[
                    { value: 'TRIAL', label: 'TRIAL (Evaluation Mode)' },
                    { value: 'ACTIVE', label: 'ACTIVE (Paid Subscription)' },
                    { value: 'PAST_DUE', label: 'PAST_DUE (Payment Required)' },
                    { value: 'CANCELED', label: 'CANCELED (Terminated)' },
                  ]}
                />
              </div>

              {/* Trial quick extension */}
              <div className="p-3.5 rounded-xl bg-zinc-100/60 dark:bg-zinc-950/40 border border-zinc-300 dark:border-zinc-900/60 space-y-2.5">
                <div className="text-xs font-semibold text-zinc-950 dark:text-zinc-400 flex items-center justify-between">
                  <span>Extend Trial Period</span>
                  <span className="text-[10px] text-zinc-600 font-normal">
                    Currently: {subscriptionModal.daysRemaining} days left
                  </span>
                </div>
                <div className="flex gap-2">
                  {[7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExtendDays(days)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        extendDays === days
                          ? 'bg-zinc-800 text-white border-zinc-800 shadow-xs'
                          : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100'
                      }`}
                    >
                      +{days} Days
                    </button>
                  ))}
                </div>
                <div className="pt-1">
                  <DatePicker
                    label="Or custom end date"
                    placeholder="Select expiration date"
                    value={customEndDate}
                    onChange={(e) => {
                      setCustomEndDate(e.target.value);
                      setExtendDays('');
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubscriptionModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-600 text-white text-xs font-medium shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Update Subscription'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Business Profile */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-hidden">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl relative my-auto max-h-[90vh] flex flex-col overflow-hidden">
            <button
              onClick={() => setEditModal(null)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white z-10 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex-1 overflow-y-auto p-6 modal-scroll overscroll-contain">

            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Edit Business Details
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Tenant ID: <code className="font-mono text-[10px]">{editModal._id}</code>
                </p>
              </div>
            </div>

            <form onSubmit={handleEditBusiness} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={editForm.currency}
                    onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white"
                />
              </div>

              <PhoneInput
                label="Business Phone Number"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                helperText="Nepal business contact number (+977)"
              />

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-medium shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Business Confirmation */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-hidden">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-2xl p-6 text-center overflow-hidden">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Delete Business Tenant?</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Are you sure you want to delete <span className="font-semibold text-zinc-800 dark:text-zinc-200">{deleteModal.name}</span>?
              All associated products and transactions will be purged.
            </p>

            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBusiness}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBusinessesPage;
