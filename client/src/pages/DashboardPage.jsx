import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from '../hooks/useBusiness';
import { transactionService } from '../services/transactionService';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDate } from '../utils/formatters';
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
  TrendingDown,
} from 'lucide-react';

export const DashboardPage = () => {
  const { business } = useBusiness();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
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
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const currency = business?.currency || 'USD';
  const metrics = data?.metrics || {
    totalProducts: 0,
    lowStockCount: 0,
    todaySalesAmount: 0,
    todaySalesCount: 0,
    totalPurchasesAmount: 0,
    totalPurchasesCount: 0,
  };

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Inventory Overview
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Real-time stock counters and QR audit trail for {business?.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchDashboardData} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Link to={ROUTES.SCAN}>
            <Button variant="primary" size="sm">
              <ScanLine className="h-3.5 w-3.5 mr-1" />
              <span>Scan QR</span>
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50/80 border border-rose-200/80 p-3.5 text-xs text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Compact Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card compact hoverEffect className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Total Catalog
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              <Boxes className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {metrics.totalProducts}
            </div>
            <Link
              to={ROUTES.PRODUCTS}
              className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 mt-1"
            >
              Browse catalog <ArrowRight className="h-2.5 w-2.5" />
            </Link>
          </div>
        </Card>

        <Card compact hoverEffect className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Low Stock Alerts
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {metrics.lowStockCount}
            </div>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 block">
              {metrics.lowStockCount > 0 ? 'Requires restock' : 'All items optimal'}
            </span>
          </div>
        </Card>

        <Card compact hoverEffect className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Today's Sales
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(metrics.todaySalesAmount, currency)}
            </div>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 block">
              {metrics.todaySalesCount} {metrics.todaySalesCount === 1 ? 'sale' : 'sales'} recorded
            </span>
          </div>
        </Card>

        <Card compact hoverEffect className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Total Purchases
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              <ShoppingCart className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
              {formatCurrency(metrics.totalPurchasesAmount, currency)}
            </div>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 block">
              {metrics.totalPurchasesCount} stock-in batches
            </span>
          </div>
        </Card>
      </div>

      {/* Action Strip & Low Stock Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Quick QR Stock Hub */}
        <Card className="lg:col-span-4 flex flex-col justify-between border-zinc-200/80 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                Quick QR Operations
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Scan product labels using your phone camera or barcode gun to execute quick sales or
              vendor restocks without navigation delays.
            </p>
          </div>

          <div className="mt-5 space-y-2">
            <Link to={ROUTES.SCAN} className="block">
              <Button variant="primary" className="w-full">
                <ScanLine className="h-3.5 w-3.5 mr-1" /> Open Live QR Scanner
              </Button>
            </Link>
            <Link to={ROUTES.PRODUCTS} className="block">
              <Button variant="secondary" className="w-full">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Product & Print Label
              </Button>
            </Link>
          </div>
        </Card>

        {/* Low Stock Alerts Table */}
        <Card className="lg:col-span-8 p-0 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                Low Stock Threshold Warnings
              </h3>
            </div>
            <Link
              to={`${ROUTES.PRODUCTS}?lowStock=true`}
              className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight className="h-2.5 w-2.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {data?.lowStockAlerts && data.lowStockAlerts.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800/80 text-zinc-400 font-medium uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-2.5">Product</th>
                    <th className="px-4 py-2.5">SKU</th>
                    <th className="px-4 py-2.5">Stock</th>
                    <th className="px-4 py-2.5">Threshold</th>
                    <th className="px-4 py-2.5 text-right">Quick Restock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {data.lowStockAlerts.map((prod) => (
                    <tr
                      key={prod._id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-850/60 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                        {prod.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-400 dark:text-zinc-500 text-[11px]">
                        {prod.sku}
                      </td>
                      <td className="px-4 py-3 font-bold text-rose-600 dark:text-rose-400 font-mono">
                        {prod.currentStock} {prod.unit}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                        {prod.minStockLevel} {prod.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={ROUTES.SCAN}>
                          <Badge variant="accent" className="cursor-pointer hover:opacity-80">
                            + Restock
                          </Badge>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-zinc-400 dark:text-zinc-500">
                <p className="text-xs">All inventory items are currently above minimum stock thresholds.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Transactions List */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div>
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              Recent Inventory Activity
            </h3>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              Latest sales and purchase movements recorded in the system
            </p>
          </div>
          <Link
            to={ROUTES.TRANSACTIONS}
            className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
          >
            Full history <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {data?.recentTransactions && data.recentTransactions.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800/80 text-zinc-400 font-medium uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-2.5">Reference</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Items</th>
                  <th className="px-4 py-2.5">Total Amount</th>
                  <th className="px-4 py-2.5">Payment</th>
                  <th className="px-4 py-2.5 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {data.recentTransactions.map((txn) => {
                  const isSale = txn.type === 'SALE';
                  return (
                    <tr
                      key={txn._id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-850/60 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-zinc-800 dark:text-zinc-200">
                        {txn.referenceNumber}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={isSale ? 'accent' : 'default'} dot>
                          {isSale ? 'Sale' : 'Purchase'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {txn.items?.length} {txn.items?.length === 1 ? 'line item' : 'line items'}
                      </td>
                      <td className="px-4 py-3 font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(txn.totalAmount, currency)}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-[11px]">
                        {txn.paymentMethod}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-400 dark:text-zinc-500 text-[11px]">
                        {formatDate(txn.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-10 text-center text-zinc-400 dark:text-zinc-500">
              <p className="text-xs">No transactions recorded yet.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
export default DashboardPage;
