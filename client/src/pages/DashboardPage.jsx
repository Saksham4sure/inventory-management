import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useBusiness } from '../hooks/useBusiness';
import { useConfirm } from '../hooks/useConfirm';
import { transactionService } from '../services/transactionService';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDate, formatPaymentMethod } from '../utils/formatters';
import { ROUTES } from '../constants/routes';
import {
  Boxes,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  ScanLine,
  Plus,
  ArrowRight,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Package,
  Trash2,
  Building2,
  CreditCard,
  ShieldCheck,
  FileCheck2,
  Clock,
  XCircle,
} from 'lucide-react';

export const DashboardPage = () => {
  const { user } = useAuth();
  const { business } = useBusiness();
  const { confirm, alert } = useConfirm();
  const hasBusiness = Boolean(user?.businessId || business?._id);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    if (!hasBusiness) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await transactionService.getDashboardSummary();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, [hasBusiness]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleDeleteTransaction = async (id, refNum) => {
    const isConfirmed = await confirm({
      title: 'Delete Audit Record',
      message: `Are you sure you want to delete audit record #${refNum}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!isConfirmed) return;

    try {
      await transactionService.deleteTransaction(id);
      setData((prev) => ({
        ...prev,
        recentTransactions: prev?.recentTransactions?.filter((t) => t._id !== id) || [],
      }));
    } catch (err) {
      await alert({
        title: 'Action Failed',
        message: err.message || 'Failed to delete audit record',
      });
    }
  };

  const currency = business?.currency || 'USD';
  const metrics = data?.metrics || {
    totalProducts: 0,
    lowStockCount: 0,
    todaySalesAmount: 0,
    todaySalesCount: 0,
    totalPurchasesAmount: 0,
    totalPurchasesCount: 0,
  };

  // Dynamic time-of-day greeting
  const greetingData = useMemo(() => {
    const hour = new Date().getHours();
    let timeGreeting;
    if (hour >= 5 && hour < 12) timeGreeting = 'Good morning';
    else if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
    else if (hour >= 17 && hour < 22) timeGreeting = 'Good evening';
    else timeGreeting = 'Good night';

    const dateFormatted = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

    return { timeGreeting, dateFormatted };
  }, []);

  const firstName = user?.name ? user.name.split(' ')[0] : 'Store Owner';

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero Welcome Header */}
      <div className="relative overflow-hidden rounded-[26px] sm:rounded-[30px] border border-black/[0.06] dark:border-white/[0.08] bg-white/75 dark:bg-[#181b22]/75 backdrop-blur-2xl p-5 sm:p-7 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.03)] dark:shadow-[0_12px_36px_-4px_rgba(0,0,0,0.4)] ring-1 ring-white/80 dark:ring-white/[0.05]">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            {/* Metadata chip bar */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 backdrop-blur-md">
                <Calendar className="h-3 w-3 text-zinc-400 dark:text-zinc-400" />
                {greetingData.dateFormatted}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                {business?.name || 'StockPulse Workspace'}
              </span>

              {/* KYC Status Pill */}
              {user?.kyc?.status === 'VERIFIED' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3 w-3" />
                  Verified Identity
                </span>
              )}
              {user?.kyc?.status === 'PENDING' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
                  <Clock className="h-3 w-3" />
                  KYC Under Review
                </span>
              )}
              {user?.kyc?.status === 'REJECTED' && (
                <Link to={ROUTES.PROFILE} className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors">
                  <XCircle className="h-3 w-3" />
                  KYC Rejected (Action Needed)
                </Link>
              )}
            </div>

            {/* Hello and User Name */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Hello, {firstName}
              </h1>
              {/* Description */}
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Welcome to your inventory command center. Here is your real-time stock pulse, low-stock threshold alerts, and instant QR camera audit movements.
              </p>
            </div>

            {/* Quick status summary capsules */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-black/[0.02] dark:bg-white/[0.04] rounded-full px-3 py-1 border border-black/[0.04] dark:border-white/[0.06]">
                <Package className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                <span><strong className="text-zinc-800 dark:text-zinc-200 font-semibold">{metrics.totalProducts}</strong> active items</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-black/[0.02] dark:bg-white/[0.04] rounded-full px-3 py-1 border border-black/[0.04] dark:border-white/[0.06]">
                {metrics.lowStockCount > 0 ? (
                  <>
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    <span className="text-amber-700 dark:text-amber-400 font-medium">
                      {metrics.lowStockCount} items require restock
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                    <span>All stock levels optimal</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchDashboardData}
              disabled={loading || !hasBusiness}
              className="rounded-2xl"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Link to={ROUTES.SCAN}>
              <Button variant="primary" size="sm" className="rounded-2xl">
                <ScanLine className="h-4 w-4 mr-1.5" />
                <span>Scan QR</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KYC Alert Banners if Pending or Rejected */}
      {user?.kyc?.status === 'REJECTED' && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-800 dark:text-rose-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-xs">Identity Document Verification Rejected</p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                Reason: {user?.kyc?.rejectionReason || 'Document details could not be validated.'} Please update your document number or upload clearer photos.
              </p>
            </div>
          </div>
          <Link to={ROUTES.PROFILE} className="shrink-0">
            <Button variant="danger" size="sm" className="rounded-xl whitespace-nowrap text-xs">
              Re-upload Documents <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {user?.kyc?.status === 'PENDING' && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-center gap-3 text-amber-800 dark:text-amber-200">
          <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4 animate-spin" />
          </div>
          <div className="text-xs">
            <p className="font-bold">Identity Verification Under Review</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Your {user?.kyc?.documentType === 'DRIVING_LICENSE' ? 'driving license' : 'citizenship'} documents have been submitted to the Platform Compliance team for validation. You can continue operating while review is in progress.
            </p>
          </div>
        </div>
      )}

      {/* Onboarding Banner if Business Setup was Skipped */}
      {!hasBusiness && (
        <Card className="border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                No Business Profile Configured Yet
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                You can create a business profile anytime, or subscribe directly to a platform plan for your account.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Link to={ROUTES.SUBSCRIPTION}>
              <Button variant="secondary" size="sm" className="rounded-xl whitespace-nowrap">
                <CreditCard className="h-3.5 w-3.5 mr-1" />
                Subscribe to Plan
              </Button>
            </Link>
            {user?.kyc?.status !== 'VERIFIED' ? (
              <Link to={ROUTES.PROFILE}>
                <Button variant="primary" size="sm" className="rounded-xl whitespace-nowrap">
                  Verify KYC Document <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            ) : (
              <Link to={ROUTES.BUSINESS_PROFILE}>
                <Button variant="primary" size="sm" className="rounded-xl whitespace-nowrap">
                  Set Up Business <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </Card>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-700 dark:text-rose-300 backdrop-blur-md flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Metrics Widgets Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {/* Total Catalog Card */}
        <Card hoverEffect className="flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Total Catalog
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 transition-transform duration-200 group-hover:scale-110">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {metrics.totalProducts}
            </div>
            <Link
              to={ROUTES.PRODUCTS}
              className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline inline-flex items-center gap-1 mt-1.5"
            >
              Browse catalog <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        {/* Low Stock Alerts Card */}
        <Card hoverEffect className="flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Low Stock Alerts
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 transition-transform duration-200 group-hover:scale-110">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${metrics.lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
              {metrics.lowStockCount}
            </div>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5 block">
              {metrics.lowStockCount > 0 ? 'Requires restock attention' : 'All items optimal'}
            </span>
          </div>
        </Card>

        {/* Today's Sales Card */}
        <Card hoverEffect className="flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Today's Sales
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-transform duration-200 group-hover:scale-110">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
              {formatCurrency(metrics.todaySalesAmount, currency)}
            </div>
            <Link
              to={ROUTES.SALES}
              className="mt-3 inline-flex items-center text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              View ledger <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </div>
        </Card>

        {/* Total Purchases Card */}
        <Card hoverEffect className="flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Total Purchases
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-500/10 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300 transition-transform duration-200 group-hover:scale-110">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
              {formatCurrency(metrics.totalPurchasesAmount, currency)}
            </div>
            <Link
              to={ROUTES.PURCHASES}
              className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:underline inline-flex items-center gap-1 mt-1.5"
            >
              View procurement <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Action Strip & Low Stock Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Quick QR Stock Hub */}
        <Card className="lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500" />
              <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
                Quick QR Operations
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Scan product barcodes or QR labels using your camera to execute lightning-fast sales checkouts or supplier restocks without typing.
            </p>
          </div>

          <div className="mt-6 space-y-2.5">
            <Link to={ROUTES.SCAN} className="block">
              <Button variant="primary" className="w-full rounded-xl">
                <ScanLine className="h-4 w-4 mr-1.5" /> Open Live QR Scanner
              </Button>
            </Link>
            <Link to={ROUTES.PRODUCTS} className="block">
              <Button variant="secondary" className="w-full rounded-xl">
                <Plus className="h-4 w-4 mr-1.5" /> Add Product & Print Label
              </Button>
            </Link>
          </div>
        </Card>

        {/* Low Stock Alerts Table */}
        <Card className="lg:col-span-8 p-0 overflow-hidden">
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-black/[0.05] dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight">
                Low Stock Threshold Warnings
              </h3>
            </div>
            <Link
              to={`${ROUTES.PRODUCTS}?lowStock=true`}
              className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {data?.lowStockAlerts && data.lowStockAlerts.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-black/[0.04] dark:border-white/[0.06] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">SKU</th>
                    <th className="px-5 py-3">Stock</th>
                    <th className="px-5 py-3">Threshold</th>
                    <th className="px-5 py-3 text-right">Quick Restock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.04]">
                  {data.lowStockAlerts.map((prod) => (
                    <tr
                      key={prod._id}
                      className="hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors duration-150"
                    >
                      <td className="px-5 py-3.5 font-medium text-zinc-800 dark:text-zinc-200">
                        {prod.name}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-zinc-400 dark:text-zinc-500 text-[11px]">
                        {prod.sku}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-rose-600 dark:text-rose-400 font-mono">
                        {prod.currentStock} {prod.unit}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                        {prod.minStockLevel} {prod.unit}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link to={ROUTES.SCAN}>
                          <Badge variant="primary" className="cursor-pointer hover:opacity-80">
                            + Restock
                          </Badge>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-10 text-center text-zinc-400 dark:text-zinc-500">
                <p className="text-xs">
                  {hasBusiness
                    ? 'All inventory items are currently above minimum stock thresholds.'
                    : 'Configure your business profile to start tracking inventory thresholds.'}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Transactions List with Delete Action */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-black/[0.05] dark:border-white/[0.08]">
          <div>
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight">
              Recent Inventory Activity
            </h3>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              Latest sales and purchase audit records recorded in the system
            </p>
          </div>
          <Link
            to={ROUTES.TRANSACTIONS}
            className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline inline-flex items-center gap-1"
          >
            Full history <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {data?.recentTransactions && data.recentTransactions.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-black/[0.04] dark:border-white/[0.06] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3">Total Amount</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.04]">
                {data.recentTransactions.map((txn) => {
                  const isSale = txn.type === 'SALE';
                  return (
                    <tr
                      key={txn._id}
                      className="hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors duration-150"
                    >
                      <td className="px-5 py-3.5 font-mono font-medium text-zinc-800 dark:text-zinc-200">
                        {txn.referenceNumber}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={isSale ? 'primary' : 'default'} dot>
                          {isSale ? 'Sale' : 'Purchase'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                        {txn.items?.length} {txn.items?.length === 1 ? 'line item' : 'line items'}
                      </td>
                      <td className="px-5 py-3.5 font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(txn.totalAmount, currency)}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 text-[11px]">
                        {formatPaymentMethod(txn.paymentMethod)}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400 dark:text-zinc-500 text-[11px]">
                        {formatDate(txn.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(txn._id, txn.referenceNumber)}
                          title="Delete audit record"
                          aria-label={`Delete record ${txn.referenceNumber}`}
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:bg-rose-500/15 transition-colors active:scale-90"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-zinc-400 dark:text-zinc-500">
              <p className="text-xs">
                {hasBusiness ? 'No transactions recorded yet.' : 'No audit records yet. Set up your business profile to get started.'}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
export default DashboardPage;
