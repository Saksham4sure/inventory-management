import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { useSnackbar } from '../hooks/useSnackbar';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../utils/formatters';
import { formatDateOnly, formatTimeOnly } from '../utils/dateGrouping';
import { ShoppingCart, RefreshCw, Eye, Building2, Calendar, FileText, CheckCircle2 } from 'lucide-react';

export const CustomerPurchasesPage = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const { showError } = useSnackbar();

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const res = await authService.getCustomerPurchases();
      setPurchases(res?.purchases || []);
    } catch (err) {
      showError(err.message || 'Failed to load purchase history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              My Purchases
            </h1>
            <Badge variant="accent">Customer View</Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Everything you bought across registered stores and businesses
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchPurchases}
          disabled={loading}
          title="Refresh purchases"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Purchases List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 dark:border-white border-t-transparent"></div>
        </div>
      ) : purchases.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No Purchases Found
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            Whenever a store completes a checkout with your User ID or registered Email, your digital invoice and purchase record will appear here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {purchases.map((txn) => {
            const bizCurrency = txn.businessId?.currency || 'USD';
            return (
              <Card
                key={txn._id}
                className="p-4 space-y-3 hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer"
                onClick={() => setSelectedTxn(txn)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {txn.businessId?.name || 'Local Store'}
                      </h4>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        Ref #{txn.referenceNumber}
                      </p>
                    </div>
                  </div>

                  <Badge variant={txn.paymentMethod === 'CREDIT' ? 'warning' : 'success'}>
                    {txn.paymentMethod}
                  </Badge>
                </div>

                {/* Items preview */}
                <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] p-2.5 space-y-1.5 border border-black/[0.04] dark:border-white/[0.05]">
                  {txn.items?.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-zinc-600 dark:text-zinc-300 truncate pr-2">
                        {item.productName} <span className="text-zinc-400">×{item.quantity}</span>
                      </span>
                      <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100 shrink-0">
                        {formatCurrency(item.subtotal, bizCurrency)}
                      </span>
                    </div>
                  ))}
                  {txn.items?.length > 3 && (
                    <p className="text-[10px] text-zinc-400 font-medium">
                      +{txn.items.length - 3} more items...
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDateOnly(txn.createdAt)} at {formatTimeOnly(txn.createdAt)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-400 mr-1">Total:</span>
                    <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(txn.totalAmount, bizCurrency)}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedTxn && (
        <Modal
          isOpen={Boolean(selectedTxn)}
          onClose={() => setSelectedTxn(null)}
          title={`Invoice #${selectedTxn.referenceNumber}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-400">Store / Seller</p>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedTxn.businessId?.name || 'Local Store'}
                </p>
                <p className="text-xs text-zinc-500">{selectedTxn.businessId?.phone || ''}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-zinc-400">Payment</p>
                <Badge variant="primary">{selectedTxn.paymentMethod}</Badge>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                Purchased Items ({selectedTxn.items?.length || 0})
              </p>
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-60 overflow-y-auto modal-scroll overscroll-contain">
                {selectedTxn.items?.map((item, idx) => (
                  <div key={idx} className="py-2 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{item.productName}</p>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        {item.quantity} × {formatCurrency(item.unitPrice, selectedTxn.businessId?.currency || 'USD')}
                      </p>
                    </div>
                    <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(item.subtotal, selectedTxn.businessId?.currency || 'USD')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Grand Total</span>
              <span className="text-lg font-black font-mono text-zinc-900 dark:text-zinc-100">
                {formatCurrency(selectedTxn.totalAmount, selectedTxn.businessId?.currency || 'USD')}
              </span>
            </div>

            {selectedTxn.creditDetails?.isCredit && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                <p className="font-semibold">Credit Transaction ({selectedTxn.creditDetails.creditType})</p>
                <p>Paid: {formatCurrency(selectedTxn.creditDetails.paidAmount || 0, selectedTxn.businessId?.currency || 'USD')}</p>
                <p className="font-bold">Remaining Credit Due: {formatCurrency(selectedTxn.creditDetails.creditAmount || 0, selectedTxn.businessId?.currency || 'USD')}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CustomerPurchasesPage;
