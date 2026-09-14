import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../hooks/useBusiness';
import { transactionService } from '../services/transactionService';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Search,
  ArrowLeftRight,
  Filter,
  RefreshCw,
  QrCode,
  FileText,
} from 'lucide-react';

export const TransactionsPage = () => {
  const { business } = useBusiness();
  const currency = business?.currency || 'USD';

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedTxn, setSelectedTxn] = useState(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (search) params.search = search;

      const data = await transactionService.getTransactions(params);
      setTransactions(data.transactions || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Audit Trail & Transactions
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Verified ledger of sales, purchases, and QR verified inventory movements
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchTransactions} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50/80 border border-rose-200/80 p-3.5 text-xs text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Filter and Search */}
      <Card compact className="p-3 sm:p-4">
        <div className="flex flex-col md:flex-row items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search reference # (e.g. SAL-146698)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-200/90 bg-white dark:bg-zinc-900 dark:border-zinc-800 pl-9 pr-4 py-1.5 sm:py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <div className="inline-flex rounded-lg border border-zinc-200/80 dark:border-zinc-800 p-0.5 bg-zinc-100/60 dark:bg-zinc-850 text-xs font-medium">
              <button
                type="button"
                onClick={() => setTypeFilter('ALL')}
                className={`px-3 py-1 rounded-md transition-all ${
                  typeFilter === 'ALL'
                    ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('SALE')}
                className={`px-3 py-1 rounded-md transition-all ${
                  typeFilter === 'SALE'
                    ? 'bg-white text-emerald-700 shadow-xs dark:bg-zinc-800 dark:text-emerald-400'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                Sales
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('PURCHASE')}
                className={`px-3 py-1 rounded-md transition-all ${
                  typeFilter === 'PURCHASE'
                    ? 'bg-white text-blue-700 shadow-xs dark:bg-zinc-800 dark:text-blue-400'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                Purchases
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-zinc-50/80 dark:bg-zinc-850/80 border-b border-zinc-200/80 dark:border-zinc-800 text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              <tr>
                <th className="px-4 sm:px-6 py-3">Reference #</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Line Items</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Logged By</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 sm:px-6 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {transactions.length > 0 ? (
                transactions.map((txn) => {
                  const isSale = txn.type === 'SALE';
                  return (
                    <tr
                      key={txn._id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-850/60 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                          {txn.referenceNumber}
                        </div>
                        {txn.scannedViaQR && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded mt-0.5 dark:text-emerald-400">
                            <QrCode className="h-2.5 w-2.5" /> QR Verified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={isSale ? 'accent' : 'default'} dot>
                          {isSale ? 'Sale' : 'Purchase'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-zinc-600 dark:text-zinc-400">
                        {txn.items?.map((item, idx) => (
                          <div key={idx} className="truncate max-w-[180px]">
                            {item.quantity}x {item.productName}{' '}
                            <span className="text-zinc-400 font-mono">({item.sku})</span>
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3.5 font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(txn.totalAmount, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {txn.paymentMethod}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-zinc-400">
                        {txn.createdBy?.name || 'Staff'}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-zinc-400 dark:text-zinc-500">
                        {formatDate(txn.createdAt)}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedTxn(txn)}
                          className="rounded-lg p-1 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                          title="View Details"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-zinc-400 dark:text-zinc-500">
                    {loading ? (
                      <p className="text-xs">Loading records...</p>
                    ) : (
                      <div className="space-y-1">
                        <ArrowLeftRight className="mx-auto h-7 w-7 text-zinc-300 dark:text-zinc-700 mb-2" />
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          No transactions found
                        </p>
                        <p className="text-xs text-zinc-400">
                          Transactions will appear after scanning QR codes or recording operations
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transaction Details Modal */}
      <Modal
        isOpen={Boolean(selectedTxn)}
        onClose={() => setSelectedTxn(null)}
        title="Transaction Receipt"
        maxWidth="max-w-md"
      >
        {selectedTxn && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div>
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                  Reference
                </span>
                <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedTxn.referenceNumber}
                </p>
              </div>
              <Badge variant={selectedTxn.type === 'SALE' ? 'accent' : 'default'} dot>
                {selectedTxn.type}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                Line Items
              </span>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 border border-zinc-200/80 dark:border-zinc-800 rounded-lg p-3 bg-zinc-50/50 dark:bg-zinc-850/50">
                {selectedTxn.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 text-xs">
                    <div>
                      <p className="font-medium text-zinc-800 dark:text-zinc-200">{item.productName}</p>
                      <p className="text-zinc-400 font-mono text-[11px]">
                        SKU: {item.sku} • {item.quantity} x {formatCurrency(item.unitPrice, currency)}
                      </p>
                    </div>
                    <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(item.subtotal, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total:</span>
              <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {formatCurrency(selectedTxn.totalAmount, currency)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-850 p-3 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
              <div>
                <span className="font-medium">Payment:</span> {selectedTxn.paymentMethod}
              </div>
              <div>
                <span className="font-medium">QR Scanned:</span>{' '}
                {selectedTxn.scannedViaQR ? 'Yes' : 'No'}
              </div>
              <div>
                <span className="font-medium">Date:</span> {formatDate(selectedTxn.createdAt)}
              </div>
              <div>
                <span className="font-medium">Author:</span> {selectedTxn.createdBy?.name || 'Staff'}
              </div>
            </div>

            {selectedTxn.notes && (
              <div className="text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-100/70 dark:bg-zinc-800/70 p-2.5 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">Notes: </span>
                {selectedTxn.notes}
              </div>
            )}

            <Button variant="secondary" size="sm" className="w-full" onClick={() => setSelectedTxn(null)}>
              Close
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default TransactionsPage;
