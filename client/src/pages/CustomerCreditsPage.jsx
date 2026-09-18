import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { useSnackbar } from '../hooks/useSnackbar';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../utils/formatters';
import { formatDateOnly, formatTimeOnly } from '../utils/dateGrouping';
import { CreditCard, RefreshCw, AlertCircle, Building2, Calendar, CheckCircle2 } from 'lucide-react';

export const CustomerCreditsPage = () => {
  const [data, setData] = useState({
    parties: [],
    creditTransactions: [],
    totalLeftToPay: 0,
  });
  const [loading, setLoading] = useState(true);
  const { showError } = useSnackbar();

  const fetchCredits = async () => {
    try {
      setLoading(true);
      const res = await authService.getCustomerCredits();
      setData(res || { parties: [], creditTransactions: [], totalLeftToPay: 0 });
    } catch (err) {
      showError(err.message || 'Failed to load credit dues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Credits & Left-to-Pay Dues
            </h1>
            <Badge variant="warning">Customer Ledger</Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Monitor your outstanding balances and credit history across all stores
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchCredits}
          disabled={loading}
          title="Refresh credit dues"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Card className="p-4 sm:p-5 relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Total Left-To-Pay (Across All Stores)
          </p>
          <h2 className="text-2xl sm:text-3xl font-black font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {formatCurrency(data.totalLeftToPay, 'NPR')}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Net pending credit balance across {data.parties.length} registered store accounts
          </p>
        </Card>

        <Card className="p-4 sm:p-5 relative overflow-hidden">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Active Store Credit Accounts
          </p>
          <h2 className="text-2xl sm:text-3xl font-black font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {data.parties.length}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Stores where your credit profile is active
          </p>
        </Card>
      </div>

      {/* Breakdown By Store */}
      <div>
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2.5">
          Storewise Credit Balances
        </h3>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 dark:border-white border-t-transparent"></div>
          </div>
        ) : data.parties.length === 0 ? (
          <Card className="p-8 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              No Pending Credits
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              You currently do not owe any money to any store.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {data.parties.map((p) => {
              const cur = p.businessId?.currency || 'USD';
              const isOwing = p.currentBalance > 0;
              return (
                <Card key={p._id} className="p-4 space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {p.businessId?.name || 'Local Store'}
                        </h4>
                        <p className="text-[11px] text-zinc-400">
                          {p.businessId?.phone || p.businessId?.email || 'Registered Merchant'}
                        </p>
                      </div>
                    </div>

                    <Badge variant={isOwing ? 'warning' : 'success'}>
                      {isOwing ? 'Balance Due' : 'Clear'}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Amount Left to Pay:</span>
                    <span
                      className={`text-base font-bold font-mono ${
                        isOwing
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatCurrency(p.currentBalance, cur)}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Credit Transactions History */}
      {data.creditTransactions?.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2.5">
            Recent Credit Purchases
          </h3>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.creditTransactions.map((txn) => {
              const cur = txn.businessId?.currency || 'USD';
              return (
                <div key={txn._id} className="p-3.5 bg-white dark:bg-zinc-900 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">
                      {txn.businessId?.name || 'Store'} • Invoice #{txn.referenceNumber}
                    </p>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      {formatDateOnly(txn.createdAt)} at {formatTimeOnly(txn.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(txn.totalAmount, cur)}
                    </p>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                      {txn.creditDetails?.creditType === 'PARTIAL' ? 'Partial Credit' : 'Full Credit'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCreditsPage;
