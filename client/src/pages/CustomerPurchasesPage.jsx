import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { expenseService } from '../services/expenseService';
import { useSnackbar } from '../hooks/useSnackbar';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ExpenseFormModal } from '../components/expenses/ExpenseFormModal';
import { formatCurrency } from '../utils/formatters';
import { formatDateOnly, formatTimeOnly } from '../utils/dateGrouping';
import {
  ShoppingCart,
  Receipt,
  Plus,
  RefreshCw,
  Building2,
  Calendar,
  Search,
  Trash2,
  Edit3,
  TrendingDown,
} from 'lucide-react';

const PERSONAL_CATEGORY_FILTERS = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'Groceries & Food', label: 'Groceries & Food' },
  { value: 'Utilities & Bills', label: 'Utilities & Bills' },
  { value: 'Rent & Housing', label: 'Rent & Housing' },
  { value: 'Transport & Fuel', label: 'Transport & Fuel' },
  { value: 'Shopping & Retail', label: 'Shopping & Retail' },
  { value: 'Healthcare & Medical', label: 'Healthcare & Medical' },
  { value: 'Education & Learning', label: 'Education & Learning' },
  { value: 'Entertainment & Leisure', label: 'Entertainment & Leisure' },
  { value: 'Personal Care', label: 'Personal Care' },
  { value: 'Other', label: 'Other' },
];

export const CustomerPurchasesPage = () => {
  const { showSuccess, showError } = useSnackbar();

  // Active view tab: 'PURCHASES' or 'EXPENSES'
  const [activeTab, setActiveTab] = useState('PURCHASES');

  // Store purchases state
  const [purchases, setPurchases] = useState([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState(null);

  // Personal expenses state
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expenseSummary, setExpenseSummary] = useState({
    totalAmount: 0,
    thisMonthAmount: 0,
    count: 0,
  });

  // Expense filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');

  // Expense modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(false);

  // Fetch Store purchases
  const fetchPurchases = useCallback(async () => {
    try {
      setPurchasesLoading(true);
      const res = await authService.getCustomerPurchases();
      setPurchases(res?.purchases || []);
    } catch (err) {
      showError(err.message || 'Failed to load purchase history');
    } finally {
      setPurchasesLoading(false);
    }
  }, [showError]);

  // Fetch Personal Expenses
  const fetchExpenses = useCallback(async () => {
    try {
      setExpensesLoading(true);
      const params = {
        type: 'PERSONAL',
        category,
        search,
      };
      const res = await expenseService.getExpenses(params);
      setExpenses(res?.expenses || []);
      if (res?.summary) {
        setExpenseSummary(res.summary);
      }
    } catch (err) {
      showError(err.message || 'Failed to load personal expenses');
    } finally {
      setExpensesLoading(false);
    }
  }, [category, search, showError]);

  useEffect(() => {
    fetchPurchases();
    fetchExpenses();
  }, [fetchPurchases, fetchExpenses]);

  // Handle delete expense
  const handleDeleteExpenseConfirm = async () => {
    if (!expenseToDelete) return;
    try {
      setDeletingExpense(true);
      await expenseService.deleteExpense(expenseToDelete._id);
      showSuccess('Personal expense removed successfully');
      setExpenseToDelete(null);
      fetchExpenses();
    } catch (err) {
      showError(err.message || 'Failed to delete expense record');
    } finally {
      setDeletingExpense(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              My Purchases & Expenses
            </h1>
            <Badge variant="accent">Customer View</Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            View verified store receipts and track your day-to-day personal expenses
          </p>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (activeTab === 'PURCHASES') fetchPurchases();
              else fetchExpenses();
            }}
            disabled={purchasesLoading || expensesLoading}
            title="Refresh records"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${
                purchasesLoading || expensesLoading ? 'animate-spin' : ''
              }`}
            />{' '}
            Refresh
          </Button>

          {/* Record Expense Button - Opens Modal */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setExpenseToEdit(null);
              setIsExpenseModalOpen(true);
            }}
            className="shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Record Expense
          </Button>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-200/70 dark:bg-zinc-800/80 rounded-2xl w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('PURCHASES')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'PURCHASES'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>Store Purchases</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
            {purchases.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('EXPENSES')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'EXPENSES'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Receipt className="h-3.5 w-3.5" />
          <span>Personal Expenses</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
            {expenses.length}
          </span>
        </button>
      </div>

      {/* TAB 1: STORE PURCHASES */}
      {activeTab === 'PURCHASES' && (
        <>
          {purchasesLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 dark:border-white border-t-transparent"></div>
            </div>
          ) : purchases.length === 0 ? (
            <Card className="p-10 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                No Store Purchases Found
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
                        <span>
                          {formatDateOnly(txn.createdAt)} at {formatTimeOnly(txn.createdAt)}
                        </span>
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
        </>
      )}

      {/* TAB 2: PERSONAL EXPENSES */}
      {activeTab === 'EXPENSES' && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="p-4 space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Total Expenses
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                {formatCurrency(expenseSummary.totalAmount, 'NPR')}
              </p>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-rose-500" />
                <span>All logged expenditures</span>
              </span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                This Month
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                {formatCurrency(expenseSummary.thisMonthAmount, 'NPR')}
              </p>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-indigo-500" />
                <span>Current month spend</span>
              </span>
            </Card>

            <Card className="p-4 space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Logged Entries
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                {expenseSummary.count}
              </p>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Personal records saved
              </span>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search title, notes, reference..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-600"
                />
              </div>

              <Select
                value={category}
                onChange={(val) => setCategory(val)}
                options={PERSONAL_CATEGORY_FILTERS}
              />
            </div>
          </Card>

          {/* Expenses List */}
          {expensesLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 dark:border-white border-t-transparent"></div>
            </div>
          ) : expenses.length === 0 ? (
            <Card className="p-10 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                <Receipt className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                No Personal Expenses Logged
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                Record daily personal expenses like groceries, taxi fares, electric bills, and shopping to manage your personal budget.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setExpenseToEdit(null);
                  setIsExpenseModalOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Record Personal Expense
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {expenses.map((exp) => (
                <Card
                  key={exp._id}
                  className="p-4 space-y-3 hover:border-black/20 dark:hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                        {exp.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          {exp.category}
                        </span>
                        {exp.referenceNumber && (
                          <span className="text-[10px] text-zinc-400 font-mono">
                            #{exp.referenceNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-black font-mono text-zinc-900 dark:text-zinc-100 block">
                        {formatCurrency(exp.amount, exp.currency || 'NPR')}
                      </span>
                      <Badge variant="primary" className="text-[10px] mt-0.5">
                        {exp.paymentMethod}
                      </Badge>
                    </div>
                  </div>

                  {exp.notes && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/60 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800/80 line-clamp-2">
                      {exp.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-black/[0.04] dark:border-white/[0.06] text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDateOnly(exp.date)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setExpenseToEdit(exp);
                          setIsExpenseModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Edit expense"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpenseToDelete(exp)}
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
          )}
        </div>
      )}

      {/* Invoice Detail Modal for Store Purchases */}
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
                <p>
                  Paid:{' '}
                  {formatCurrency(
                    selectedTxn.creditDetails.paidAmount || 0,
                    selectedTxn.businessId?.currency || 'USD'
                  )}
                </p>
                <p className="font-bold">
                  Remaining Credit Due:{' '}
                  {formatCurrency(
                    selectedTxn.creditDetails.creditAmount || 0,
                    selectedTxn.businessId?.currency || 'USD'
                  )}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Expense Modal (For recording / editing personal expenses) */}
      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setExpenseToEdit(null);
        }}
        onSuccess={fetchExpenses}
        expenseToEdit={expenseToEdit}
        defaultType="PERSONAL"
        currency="NPR"
      />

      {/* Confirm Delete Expense Dialog */}
      <ConfirmDialog
        isOpen={Boolean(expenseToDelete)}
        title="Delete Expense Entry?"
        message={`Are you sure you want to delete "${expenseToDelete?.title}" (${formatCurrency(
          expenseToDelete?.amount || 0,
          'NPR'
        )})?`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={deletingExpense}
        onConfirm={handleDeleteExpenseConfirm}
        onCancel={() => setExpenseToDelete(null)}
      />
    </div>
  );
};

export default CustomerPurchasesPage;
