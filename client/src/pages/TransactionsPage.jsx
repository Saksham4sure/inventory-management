import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../hooks/useBusiness';
import { useConfirm } from '../hooks/useConfirm';
import { useSnackbar } from '../hooks/useSnackbar';
import { transactionService } from '../services/transactionService';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, formatDate, formatPaymentMethod } from '../utils/formatters';
import ReceiptBill from '../components/common/ReceiptBill';
import {
  Search,
  ArrowLeftRight,
  Filter,
  RefreshCw,
  QrCode,
  FileText,
  Trash2,
} from 'lucide-react';

export const TransactionsPage = () => {
  const { business } = useBusiness();
  const { confirm } = useConfirm();
  const { showSuccess, showError } = useSnackbar();
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
      showError(err.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search, showError]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

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
      showSuccess(`Audit record #${refNum} deleted`);
      setTransactions((prev) => prev.filter((t) => t._id !== id));
      if (selectedTxn?._id === id) {
        setSelectedTxn(null);
      }
    } catch (err) {
      showError(err.message || 'Failed to delete transaction record');
    }
  };

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
              className="w-full rounded-lg border border-zinc-200/90 bg-white dark:bg-zinc-900 dark:border-zinc-800 pl-9 pr-4 py-1.5 sm:py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-zinc-700 dark:focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:focus:ring-zinc-600/30"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <div className="inline-flex rounded-xl border border-black/[0.06] dark:border-white/[0.08] p-1 bg-black/[0.035] dark:bg-white/[0.06] backdrop-blur-md text-xs font-medium">
              <button
                type="button"
                onClick={() => setTypeFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-lg transition-all duration-200 ${
                  typeFilter === 'ALL'
                    ? 'bg-white text-zinc-950 shadow-xs dark:bg-[#1f2128] dark:text-white font-semibold scale-[1.02]'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 active:scale-95'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('SALE')}
                className={`px-3.5 py-1.5 rounded-lg transition-all duration-200 ${
                  typeFilter === 'SALE'
                    ? 'bg-white text-zinc-950 shadow-xs dark:bg-[#1f2128] dark:text-white font-semibold scale-[1.02]'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 active:scale-95'
                }`}
              >
                Sales
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('PURCHASE')}
                className={`px-3.5 py-1.5 rounded-lg transition-all duration-200 ${
                  typeFilter === 'PURCHASE'
                    ? 'bg-white text-zinc-950 shadow-xs dark:bg-[#1f2128] dark:text-white font-semibold scale-[1.02]'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 active:scale-95'
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
                <th className="px-4 sm:px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {transactions.length > 0 ? (
                transactions.map((txn) => {
                  const isSale = txn.type === 'SALE';
                  return (
                    <tr
                      key={txn._id}
                      className="hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors duration-150"
                    >
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                          {txn.referenceNumber}
                        </div>
                        {txn.scannedViaQR && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-700 bg-black/[0.04] border border-black/[0.06] px-1.5 py-0.2 rounded mt-0.5 dark:text-zinc-300 dark:bg-white/[0.06] dark:border-white/[0.08]">
                            <QrCode className="h-2.5 w-2.5" /> QR Verified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={isSale ? 'primary' : 'default'} dot>
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
                        {formatPaymentMethod(txn.paymentMethod)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-zinc-400">
                        {txn.createdBy?.name || 'Staff'}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-zinc-400 dark:text-zinc-500">
                        {formatDate(txn.createdAt)}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedTxn(txn)}
                            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] dark:hover:text-zinc-200 transition-colors active:scale-90"
                            title="View Receipt Details"
                            aria-label={`View details for ${txn.referenceNumber}`}
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(txn._id, txn.referenceNumber)}
                            className="rounded-lg p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:bg-rose-500/15 transition-colors active:scale-90"
                            title="Delete Audit Record"
                            aria-label={`Delete record ${txn.referenceNumber}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
          <div className="space-y-4">
            <ReceiptBill 
              transaction={selectedTxn} 
              business={business} 
              currency={currency} 
            />
            <div className="flex gap-2 pt-1 print-hide border-t border-zinc-100 dark:border-zinc-800 mt-4 pt-4">
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                onClick={() => handleDeleteTransaction(selectedTxn._id, selectedTxn.referenceNumber)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Record
              </Button>
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setSelectedTxn(null)}>
                Close
              </Button>
            </div>
          </div>
        )}</Modal>
    </div>
  );
};
export default TransactionsPage;
