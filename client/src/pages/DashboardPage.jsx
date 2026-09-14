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
      setError(err.message || 'Failed to fetch dashboard data');
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
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Inventory Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time stock levels, QR activity, and transaction metrics for {business?.name}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={fetchDashboardData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Link to={ROUTES.SCAN}>
            <Button variant="primary" size="sm">
              <ScanLine className="h-4 w-4 mr-1.5" /> Scan QR
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Products
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">
              {metrics.totalProducts}
            </h3>
            <Link
              to={ROUTES.PRODUCTS}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 mt-1"
            >
              View catalog <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Low Stock Alerts
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">
              {metrics.lowStockCount}
            </h3>
            <span className="text-xs text-amber-600 font-medium">Needs replenishment</span>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Today's Sales
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">
              {formatCurrency(metrics.todaySalesAmount, currency)}
            </h3>
            <span className="text-xs text-slate-500">{metrics.todaySalesCount} sales recorded</span>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Purchases
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">
              {formatCurrency(metrics.totalPurchasesAmount, currency)}
            </h3>
            <span className="text-xs text-slate-500">{metrics.totalPurchasesCount} orders</span>
          </div>
        </Card>
      </div>

      {/* Quick Launch and Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick QR Hub */}
        <Card className="lg:col-span-1 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-6 flex flex-col justify-between shadow-indigo-200">
          <div>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-md mb-4">
              <ScanLine className="h-5 w-5 text-indigo-100" />
            </div>
            <h3 className="text-xl font-bold">QR Stock Operations</h3>
            <p className="text-sm text-indigo-100/80 mt-2 leading-relaxed">
              Instantly scan product labels with your camera to process purchases (Stock-In) or sales
              (Stock-Out).
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <Link to={ROUTES.SCAN}>
              <Button
                variant="secondary"
                className="w-full bg-white text-indigo-700 hover:bg-indigo-50 border-0 font-semibold"
              >
                <ScanLine className="mr-2 h-4 w-4" /> Open Live QR Scanner
              </Button>
            </Link>
            <Link to={ROUTES.PRODUCTS}>
              <Button
                variant="ghost"
                className="w-full text-indigo-100 hover:bg-white/10 hover:text-white"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Product & Print QR
              </Button>
            </Link>
          </div>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-slate-900">Low Stock Warnings</h3>
            </div>
            <Link
              to={`${ROUTES.PRODUCTS}?lowStock=true`}
              className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              All warnings <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            {data?.lowStockAlerts && data.lowStockAlerts.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                    <th className="py-2.5">Product</th>
                    <th className="py-2.5">SKU</th>
                    <th className="py-2.5">Current Stock</th>
                    <th className="py-2.5">Threshold</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.lowStockAlerts.map((prod) => (
                    <tr key={prod._id} className="hover:bg-slate-50/70">
                      <td className="py-3 font-medium text-slate-800">{prod.name}</td>
                      <td className="py-3 font-mono text-slate-500">{prod.sku}</td>
                      <td className="py-3 font-bold text-rose-600">
                        {prod.currentStock} {prod.unit}
                      </td>
                      <td className="py-3 text-slate-500">{prod.minStockLevel}</td>
                      <td className="py-3 text-right">
                        <Link to={ROUTES.SCAN}>
                          <Badge variant="primary" className="cursor-pointer hover:bg-indigo-100">
                            + Restock (QR)
                          </Badge>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <p className="text-sm">All products have healthy inventory levels! 🎉</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900">Recent Transactions</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest sales and purchase receipts processed through the system
            </p>
          </div>
          <Link
            to={ROUTES.TRANSACTIONS}
            className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
          >
            Full history <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          {data?.recentTransactions && data.recentTransactions.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                  <th className="py-2.5">Reference #</th>
                  <th className="py-2.5">Type</th>
                  <th className="py-2.5">Items</th>
                  <th className="py-2.5">Total Amount</th>
                  <th className="py-2.5">Method</th>
                  <th className="py-2.5">Processed By</th>
                  <th className="py-2.5 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentTransactions.map((txn) => {
                  const isSale = txn.type === 'SALE';
                  return (
                    <tr key={txn._id} className="hover:bg-slate-50/70">
                      <td className="py-3 font-mono font-medium text-slate-800">
                        {txn.referenceNumber}
                      </td>
                      <td className="py-3">
                        <Badge variant={isSale ? 'success' : 'primary'}>
                          {isSale ? 'Sale (Stock-Out)' : 'Purchase (Stock-In)'}
                        </Badge>
                      </td>
                      <td className="py-3 text-slate-600">
                        {txn.items?.length} {txn.items?.length === 1 ? 'item' : 'items'}
                      </td>
                      <td className="py-3 font-bold text-slate-900">
                        {formatCurrency(txn.totalAmount, currency)}
                      </td>
                      <td className="py-3 font-medium text-slate-600">{txn.paymentMethod}</td>
                      <td className="py-3 text-slate-500">{txn.createdBy?.name || 'Staff'}</td>
                      <td className="py-3 text-right text-slate-400">
                        {formatDate(txn.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm">No transactions recorded yet.</p>
              <p className="text-xs mt-1">
                Scan product QR codes or create a sale to get started!
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
export default DashboardPage;
