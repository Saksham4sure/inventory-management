import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSnackbar } from '../hooks/useSnackbar';
import { useBusiness } from '../hooks/useBusiness';
import { expenseService } from '../services/expenseService';
import { businessService } from '../services/businessService';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ExpenseFormModal } from '../components/expenses/ExpenseFormModal';
import { formatCurrency } from '../utils/formatters';
import { formatDateOnly } from '../utils/dateGrouping';
import { ROUTES } from '../constants/routes';
import {
  Receipt,
  Plus,
  RefreshCw,
  Search,
  Lock,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Calendar,
  Trash2,
  Edit3,
  CheckCircle2,
} from 'lucide-react';

const CATEGORY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'Utilities & Power', label: 'Utilities & Power' },
  { value: 'Rent & Premises', label: 'Rent & Premises' },
  { value: 'Raw Materials & Supplies', label: 'Raw Materials & Supplies' },
  { value: 'Salaries & Wages', label: 'Salaries & Wages' },
  { value: 'Marketing & Advertising', label: 'Marketing & Advertising' },
  { value: 'Equipment & Maintenance', label: 'Equipment & Maintenance' },
  { value: 'Logistics & Delivery', label: 'Logistics & Delivery' },
  { value: 'Software & Technology', label: 'Software & Technology' },
  { value: 'Taxes & Compliance', label: 'Taxes & Compliance' },
  { value: 'Office Expenses', label: 'Office Expenses' },
  { value: 'Other', label: 'Other' },
];

const PAYMENT_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Payment Methods' },
  { value: 'CASH', label: 'Cash' },
  { value: 'ESEWA', label: 'eSewa' },
  { value: 'KHALTI', label: 'Khalti' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' },
];

export const BusinessExpensesPage = () => {
  const { business } = useBusiness();
  const { showSuccess, showError } = useSnackbar();

  // Subscription state
  const [subLoading, setSubLoading] = useState(true);
  const [hasSubscribed, setHasSubscribed] = useState(false);

  // Expenses data state
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({
    totalAmount: 0,
    thisMonthAmount: 0,
    count: 0,
  });
  const [breakdown, setBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const currency = business?.currency || 'NPR';

  // Check business subscription
  const checkSubscription = useCallback(async () => {
    try {
      setSubLoading(true);
      const res = await businessService.getSubscription();
      setHasSubscribed(Boolean(res?.hasSubscribed));
      return Boolean(res?.hasSubscribed);
    } catch {
      setHasSubscribed(false);
      return false;
    } finally {
      setSubLoading(false);
    }
  }, []);

  // Fetch expenses list & summary
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const cleanCategory = typeof category === 'object' && category !== null
        ? (category.target?.value ?? category.value ?? 'ALL')
        : category;
      const cleanPayment = typeof paymentMethod === 'object' && paymentMethod !== null
        ? (paymentMethod.target?.value ?? paymentMethod.value ?? 'ALL')
        : paymentMethod;

      const params = {
        type: 'BUSINESS',
        category: cleanCategory,
        paymentMethod: cleanPayment,
        search,
        startDate,
        endDate,
      };

      const [res, summaryRes] = await Promise.all([
        expenseService.getExpenses(params),
        expenseService.getExpenseSummary({ type: 'BUSINESS' }).catch(() => null),
      ]);

      setExpenses(res?.expenses || []);
      if (res?.summary) {
        setSummary(res.summary);
      }
      if (summaryRes?.categoryBreakdown) {
        setBreakdown(summaryRes.categoryBreakdown);
      }
    } catch (err) {
      // If 403 Forbidden due to subscription, update subscription state
      if (err.message && err.message.toLowerCase().includes('subscription')) {
        setHasSubscribed(false);
      } else {
        showError(err.message || 'Failed to load business expenses');
      }
    } finally {
      setLoading(false);
    }
  }, [category, paymentMethod, search, startDate, endDate, showError]);

  useEffect(() => {
    checkSubscription().then((active) => {
      if (active) {
        fetchExpenses();
      } else {
        setLoading(false);
      }
    });
  }, [checkSubscription, fetchExpenses]);

  // Handle delete
  const handleDeleteConfirm = async () => {
    if (!expenseToDelete) return;
    try {
      setDeleting(true);
      await expenseService.deleteExpense(expenseToDelete._id);
      showSuccess('Expense entry removed successfully');
      setExpenseToDelete(null);
      fetchExpenses();
    } catch (err) {
      showError(err.message || 'Failed to delete expense record');
    } finally {
      setDeleting(false);
    }
  };

  // Top Category
  const topCategory = useMemo(() => {
    if (!breakdown || breakdown.length === 0) return null;
    return breakdown[0];
  }, [breakdown]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shadow-xs">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Business Expenses
                </h1>
                {hasSubscribed ? (
                  <Badge variant="success">Active Plan</Badge>
                ) : (
                  <Badge variant="warning">Subscription Required</Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Track operating expenditures, utility bills, inventory supplies, and business overheads
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              checkSubscription();
              if (hasSubscribed) fetchExpenses();
            }}
            disabled={loading || subLoading}
            title="Refresh records"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${loading || subLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (!hasSubscribed) {
                showError('An active subscription is required to record business expenses.');
                return;
              }
              setExpenseToEdit(null);
              setIsModalOpen(true);
            }}
            disabled={subLoading}
            className="shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Record Expense
          </Button>
        </div>
      </div>

      {/* Subscription Paywall Screen if not subscribed */}
      {!subLoading && !hasSubscribed && (
        <Card className="p-8 sm:p-12 text-center relative overflow-hidden border-2 border-indigo-500/20 bg-gradient-to-b from-indigo-500/[0.03] to-transparent dark:from-indigo-500/[0.06]">
          <div className="max-w-md mx-auto space-y-5">
            <div className="h-16 w-16 rounded-3xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="h-8 w-8" />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                Premium Business Feature
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
                Subscribe to Track Business Expenses
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                Gain clear visibility into your operating costs, rent, utilities, vendor invoices, and overheads.
                Business Expense Tracking is included with all active subscription plans.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left text-xs text-zinc-700 dark:text-zinc-300 p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Operating cost audit</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Category breakdowns</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Cashflow outflow charts</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Digital receipt archiving</span>
              </div>
            </div>

            <div className="pt-2">
              <Link to={ROUTES.SUBSCRIPTION}>
                <Button
                  variant="primary"
                  className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold shadow-md shadow-indigo-600/20"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  View Subscription Plans & Unlock
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content when Subscribed */}
      {hasSubscribed && (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-4 sm:p-5 space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Total Expenses
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                {formatCurrency(summary.totalAmount, currency)}
              </p>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-rose-500" />
                <span>All recorded outflows</span>
              </span>
            </Card>

            <Card className="p-4 sm:p-5 space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                This Month
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                {formatCurrency(summary.thisMonthAmount, currency)}
              </p>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-indigo-500" />
                <span>Current billing cycle</span>
              </span>
            </Card>

            <Card className="p-4 sm:p-5 space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Top Category
              </span>
              <p className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {topCategory ? topCategory.category : 'N/A'}
              </p>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                {topCategory ? formatCurrency(topCategory.total, currency) : 'No data'}
              </span>
            </Card>

            <Card className="p-4 sm:p-5 space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Total Records
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                {summary.count}
              </p>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Entries logged
              </span>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="p-3.5 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search title, reference, notes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-600"
                />
              </div>

              {/* Category Filter */}
              <Select
                value={category}
                onChange={(e) => setCategory(e?.target?.value ?? e)}
                options={CATEGORY_FILTER_OPTIONS}
              />

              {/* Payment Method Filter */}
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e?.target?.value ?? e)}
                options={PAYMENT_FILTER_OPTIONS}
              />

              {/* Date Filters */}
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  title="Start Date"
                  className="w-full px-2 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-600"
                />
                <span className="text-zinc-400 text-xs font-bold">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  title="End Date"
                  className="w-full px-2 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-600"
                />
              </div>
            </div>
          </Card>

          {/* Expenses List */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 dark:border-white border-t-transparent"></div>
            </div>
          ) : expenses.length === 0 ? (
            <Card className="p-12 text-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                <Receipt className="h-6 w-6" />
              </div>
              <div className="max-w-sm mx-auto">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  No Business Expenses Found
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Log operational costs, supplier invoices, rent, maintenance, and utility bills to stay on top of your financial health.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setExpenseToEdit(null);
                  setIsModalOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Record First Business Expense
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {expenses.map((item) => (
                  <Card
                    key={item._id}
                    className="p-4 space-y-3 hover:border-black/20 dark:hover:border-white/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            {item.category}
                          </span>
                          {item.referenceNumber && (
                            <span className="text-[10px] text-zinc-400 font-mono">
                              #{item.referenceNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-black font-mono text-zinc-900 dark:text-zinc-100 block">
                          {formatCurrency(item.amount, item.currency || currency)}
                        </span>
                        <Badge variant="primary" className="text-[10px] mt-0.5">
                          {item.paymentMethod}
                        </Badge>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/60 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800/80 line-clamp-2">
                        {item.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-black/[0.04] dark:border-white/[0.06] text-xs">
                      <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDateOnly(item.date)}</span>
                        {item.recordedBy?.name && (
                          <span className="text-zinc-400">
                            • by {item.recordedBy.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setExpenseToEdit(item);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Edit expense"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpenseToDelete(item)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete expense"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Expense Modal */}
      <ExpenseFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setExpenseToEdit(null);
        }}
        onSuccess={fetchExpenses}
        expenseToEdit={expenseToEdit}
        defaultType="BUSINESS"
        currency={currency}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(expenseToDelete)}
        title="Delete Expense Record?"
        message={`Are you sure you want to delete "${expenseToDelete?.title}" (${formatCurrency(
          expenseToDelete?.amount || 0,
          currency
        )})? This action will remove it from your operating cost calculations.`}
        confirmText="Delete Record"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setExpenseToDelete(null)}
      />
    </div>
  );
};

export default BusinessExpensesPage;
