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
  TrendingDown,
  TrendingUp,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Transaction History
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Complete audit trail of product purchases, customer sales, and QR scan operations
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchTransactions} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reference number (e.g. SAL-1234)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-4 w-4 text-slate-400" />
            <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTypeFilter('ALL')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  typeFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('SALE')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  typeFilter === 'SALE'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sales
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('PURCHASE')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  typeFilter === 'PURCHASE'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
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
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Reference #</th>
                <th className="px-6 py-3.5">Type</th>
                <th className="px-6 py-3.5">Items Summary</th>
                <th className="px-6 py-3.5">Total Amount</th>
                <th className="px-6 py-3.5">Payment</th>
                <th className="px-6 py-3.5">Recorded By</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length > 0 ? (
                transactions.map((txn) => {
                  const isSale = txn.type === 'SALE';
                  return (
                    <tr key={txn._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-slate-900">
                          {txn.referenceNumber}
                        </div>
                        {txn.scannedViaQR && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded mt-0.5">
                            <QrCode className="h-3 w-3" /> Scanned QR
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={isSale ? 'success' : 'primary'}>
                          {isSale ? (
                            <>
                              <TrendingDown className="h-3 w-3 inline mr-1" /> Sale
                            </>
                          ) : (
                            <>
                              <TrendingUp className="h-3 w-3 inline mr-1" /> Purchase
                            </>
                          )}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-700">
                        {txn.items?.map((item, idx) => (
                          <div key={idx} className="truncate max-w-[200px]">
                            {item.quantity}x {item.productName}{' '}
                            <span className="text-slate-400">({item.sku})</span>
                          </div>
                        ))}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-900">
                        {formatCurrency(txn.totalAmount, currency)}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {txn.paymentMethod}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {txn.createdBy?.name || 'Staff'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {formatDate(txn.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedTxn(txn)}
                          className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="View Receipt"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    {loading ? (
                      <p className="text-sm">Loading transactions...</p>
                    ) : (
                      <div className="space-y-1">
                        <ArrowLeftRight className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-base font-semibold text-slate-700">
                          No transactions found
                        </p>
                        <p className="text-xs text-slate-500">
                          Transactions will show up here after recording purchases or sales
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

      {/* Transaction Receipt / Details Modal */}
      <Modal
        isOpen={Boolean(selectedTxn)}
        onClose={() => setSelectedTxn(null)}
        title="Transaction Receipt"
        maxWidth="max-w-md"
      >
        {selectedTxn && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Reference</span>
                <p className="font-mono font-bold text-slate-900">{selectedTxn.referenceNumber}</p>
              </div>
              <Badge variant={selectedTxn.type === 'SALE' ? 'success' : 'primary'}>
                {selectedTxn.type}
              </Badge>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase">Items</span>
              <div className="divide-y divide-slate-100 border rounded-xl p-3 bg-slate-50/50">
                {selectedTxn.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{item.productName}</p>
                      <p className="text-slate-400 font-mono">
                        SKU: {item.sku} • {item.quantity} x {formatCurrency(item.unitPrice, currency)}
                      </p>
                    </div>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(item.subtotal, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <span className="text-sm font-semibold text-slate-600">Total Amount:</span>
              <span className="text-lg font-black text-slate-900">
                {formatCurrency(selectedTxn.totalAmount, currency)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <span className="font-semibold">Payment:</span> {selectedTxn.paymentMethod}
              </div>
              <div>
                <span className="font-semibold">QR Processed:</span>{' '}
                {selectedTxn.scannedViaQR ? 'Yes' : 'No'}
              </div>
              <div>
                <span className="font-semibold">Date:</span> {formatDate(selectedTxn.createdAt)}
              </div>
              <div>
                <span className="font-semibold">User:</span> {selectedTxn.createdBy?.name || 'Staff'}
              </div>
            </div>

            {selectedTxn.notes && (
              <div className="text-xs text-slate-600 bg-amber-50/60 p-2.5 rounded-lg border border-amber-100">
                <span className="font-semibold text-amber-800">Notes: </span>
                {selectedTxn.notes}
              </div>
            )}

            <Button variant="secondary" className="w-full" onClick={() => setSelectedTxn(null)}>
              Close
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default TransactionsPage;
