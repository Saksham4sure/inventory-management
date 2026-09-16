import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../hooks/useBusiness';
import { transactionService } from '../services/transactionService';
import { productService } from '../services/productService';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  TrendingUp,
  RotateCcw,
  Search,
  Plus,
  RefreshCw,
  FileText,
  AlertCircle,
  QrCode,
  DollarSign,
  Calendar,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

export const SalesPage = () => {
  const { business } = useBusiness();
  const currency = business?.currency || 'USD';

  // Sub-tab: 'all_sales' | 'returns' | 'summary'
  const [activeTab, setActiveTab] = useState('all_sales');

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTxn, setSelectedTxn] = useState(null);

  // Return modal state
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [returnProduct, setReturnProduct] = useState('');
  const [returnQty, setReturnQty] = useState(1);
  const [refundAmount, setRefundAmount] = useState('');
  const [returnReason, setReturnReason] = useState('Defective item');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { categoryGroup: 'sales' };
      if (search) params.search = search;
      if (activeTab === 'returns') params.type = 'SALE_RETURN';
      if (activeTab === 'all_sales') params.type = 'SALE';

      const data = await transactionService.getTransactions(params);
      setTransactions(data.transactions || []);
    } catch (err) {
      setError(err.message || 'Failed to load sales history');
    } finally {
      setLoading(false);
    }
  }, [search, activeTab]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleDeleteTransaction = async (e, id, refNum) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete sales audit record #${refNum}?`)) return;
    try {
      await transactionService.deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t._id !== id));
      if (selectedTxn?._id === id) {
        setSelectedTxn(null);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete transaction record');
    }
  };

  // Load products for returns modal
  useEffect(() => {
    productService.getProducts({ limit: 150 }).then((res) => {
      setAllProducts(res.products || []);
      if (res.products?.length > 0) {
        setReturnProduct(res.products[0]._id);
        setRefundAmount(res.products[0].sellingPrice);
      }
    });
  }, []);

  const handleReturnProductChange = (prodId) => {
    setReturnProduct(prodId);
    const p = allProducts.find((item) => item._id === prodId);
    if (p) {
      setRefundAmount(p.sellingPrice);
    }
  };

  const handleRecordReturn = async (e) => {
    e.preventDefault();
    if (!returnProduct) return;
    try {
      setSubmittingReturn(true);
      setError('');

      await transactionService.createTransaction({
        type: 'SALE_RETURN',
        items: [
          {
            productId: returnProduct,
            quantity: Number(returnQty),
            unitPrice: Number(refundAmount),
          },
        ],
        paymentMethod: 'CASH',
        notes: `Customer return: ${returnReason}`,
        scannedViaQR: false,
      });

      setIsReturnModalOpen(false);
      fetchSales();
    } catch (err) {
      setError(err.message || 'Failed to process return');
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Metrics summary
  const summary = transactions.reduce(
    (acc, t) => {
      if (t.type === 'SALE') {
        acc.grossSales += t.totalAmount;
        acc.salesCount += 1;
      } else if (t.type === 'SALE_RETURN') {
        acc.totalReturns += t.totalAmount;
        acc.returnsCount += 1;
      }
      return acc;
    },
    { grossSales: 0, salesCount: 0, totalReturns: 0, returnsCount: 0 }
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Sales Management Hub
            </h1>
            <Badge variant="accent" dot>
              Active
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Customer sales orders, invoices, and product returns
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchSales} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsReturnModalOpen(true)}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Log Customer Return
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50/80 border border-rose-200/80 p-3 text-xs text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('all_sales')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'all_sales'
                ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
            }`}
          >
            All Sales
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('returns')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'returns'
                ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
            }`}
          >
            Sales Returns
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'summary'
                ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
            }`}
          >
            Summary
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative w-44 sm:w-64">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search sales..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-8 pr-3 py-1 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none"
          />
        </div>
      </div>

      {/* TAB 1 & 2: Sales & Returns List View */}
      {activeTab !== 'summary' && (
        <div className="space-y-3">
          {/* Rich Phone Cards */}
          <div className="block lg:hidden space-y-2">
            {transactions.length > 0 ? (
              transactions.map((txn) => {
                const isReturn = txn.type === 'SALE_RETURN';
                return (
                  <div
                    key={txn._id}
                    onClick={() => setSelectedTxn(txn)}
                    className="p-3 rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 cursor-pointer active:scale-[0.99] transition-all shadow-2xs"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
                          {txn.referenceNumber}
                        </span>
                        {txn.scannedViaQR && (
                          <span className="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400">
                            <QrCode className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <Badge variant={isReturn ? 'warning' : 'accent'} size="sm">
                        {isReturn ? 'Return (Refund)' : 'Sale'}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        {txn.items?.[0]?.productName}
                        {txn.items?.length > 1 && ` +${txn.items.length - 1} more`}
                      </div>
                      <div
                        className={`font-mono font-bold text-xs sm:text-sm ${
                          isReturn
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isReturn ? '-' : '+'}
                        {formatCurrency(txn.totalAmount, currency)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                      <span>{txn.paymentMethod}</span>
                      <span>{formatDate(txn.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-zinc-400 text-xs">
                No records found for this view
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <Card className="hidden lg:block p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50/80 dark:bg-zinc-850/80 border-b border-zinc-200/80 dark:border-zinc-800 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-6 py-3">Reference</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Line Items</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {transactions.map((txn) => {
                    const isReturn = txn.type === 'SALE_RETURN';
                    return (
                      <tr
                        key={txn._id}
                        onClick={() => setSelectedTxn(txn)}
                        className="hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer"
                      >
                        <td className="px-6 py-3.5 font-mono font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                          {txn.referenceNumber}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant={isReturn ? 'warning' : 'accent'} size="sm">
                            {isReturn ? 'Return' : 'Sale'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-zinc-600 dark:text-zinc-400">
                          {txn.items?.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                        </td>
                        <td
                          className={`px-4 py-3.5 font-bold font-mono text-xs ${
                            isReturn
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isReturn ? '-' : '+'}
                          {formatCurrency(txn.totalAmount, currency)}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-zinc-500">{txn.paymentMethod}</td>
                        <td className="px-4 py-3.5 text-xs text-zinc-400">
                          {formatDate(txn.createdAt)}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTxn(txn);
                              }}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] dark:hover:text-zinc-200 transition-colors active:scale-90"
                              title="View Details"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteTransaction(e, txn._id, txn.referenceNumber)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:bg-rose-500/15 transition-colors active:scale-90"
                              title="Delete Audit Record"
                              aria-label={`Delete record ${txn.referenceNumber}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: Sales Summary & Analytics */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Card compact>
            <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
              Gross Sales Revenue
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(summary.grossSales, currency)}
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              {summary.salesCount} sale transactions
            </span>
          </Card>

          <Card compact>
            <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
              Customer Returns / Refunds
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
              {formatCurrency(summary.totalReturns, currency)}
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              {summary.returnsCount} return entries
            </span>
          </Card>

          <Card compact>
            <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
              Net Realized Sales
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100 mt-1">
              {formatCurrency(summary.grossSales - summary.totalReturns, currency)}
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              Gross sales minus returns
            </span>
          </Card>
        </div>
      )}

      {/* Log Return Modal */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Record Customer Product Return"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRecordReturn} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-medium tracking-wide uppercase text-zinc-400 mb-1">
              Product Returned
            </label>
            <select
              value={returnProduct}
              onChange={(e) => handleReturnProductChange(e.target.value)}
              className="w-full rounded-lg border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100"
            >
              {allProducts.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity Returned"
              type="number"
              min="1"
              required
              value={returnQty}
              onChange={(e) => setReturnQty(e.target.value)}
            />
            <Input
              label={`Refund Amount (${currency})`}
              type="number"
              step="0.01"
              required
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium tracking-wide uppercase text-zinc-400 mb-1">
              Return Reason
            </label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full rounded-lg border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
            >
              <option value="Defective / Damaged">Defective / Damaged</option>
              <option value="Wrong Item Shipped">Wrong Item Shipped</option>
              <option value="Customer Exchange">Customer Exchange</option>
              <option value="Dissatisfied with Quality">Dissatisfied with Quality</option>
            </select>
          </div>

          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-850 p-2.5 text-[11px] text-zinc-500">
            Note: Recording a customer return will automatically replenish inventory stock by +
            {returnQty}.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setIsReturnModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submittingReturn}>
              Process Return & Restock
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transaction Details Receipt Modal */}
      <Modal
        isOpen={Boolean(selectedTxn)}
        onClose={() => setSelectedTxn(null)}
        title="Sales Receipt"
        maxWidth="max-w-md"
      >
        {selectedTxn && (
          <div className="space-y-3.5">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400">Reference</span>
                <p className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {selectedTxn.referenceNumber}
                </p>
              </div>
              <Badge variant={selectedTxn.type === 'SALE_RETURN' ? 'warning' : 'accent'}>
                {selectedTxn.type === 'SALE_RETURN' ? 'Customer Return' : 'Customer Sale'}
              </Badge>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border rounded-lg p-2.5 bg-zinc-50/50 dark:bg-zinc-850/50 max-h-44 overflow-y-auto">
              {selectedTxn.items?.map((it, i) => (
                <div key={i} className="flex justify-between py-1.5 text-xs">
                  <div>
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200">{it.productName}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      {it.quantity} x {formatCurrency(it.unitPrice, currency)}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(it.subtotal, currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between text-sm font-bold border-t border-zinc-100 dark:border-zinc-800 pt-2">
              <span>Total:</span>
              <span className="font-mono text-base text-zinc-900 dark:text-zinc-100">
                {formatCurrency(selectedTxn.totalAmount, currency)}
              </span>
            </div>

            {selectedTxn.notes && (
              <p className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-850 p-2 rounded">
                {selectedTxn.notes}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                onClick={(e) => handleDeleteTransaction(e, selectedTxn._id, selectedTxn.referenceNumber)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Record
              </Button>
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setSelectedTxn(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default SalesPage;
