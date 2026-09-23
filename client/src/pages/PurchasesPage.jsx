import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBusiness } from '../hooks/useBusiness';
import { useConfirm } from '../hooks/useConfirm';
import { useSnackbar } from '../hooks/useSnackbar';
import { transactionService } from '../services/transactionService';
import { productService } from '../services/productService';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PhoneInput } from '../components/ui/PhoneInput';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, formatPaymentMethod } from '../utils/formatters';
import { validateNepaliPhone } from '../utils/phoneValidator';
import {
  DATE_FILTERS,
  getDateFilterBounds,
  formatDateOnly,
  formatDateTime,
  formatTimeOnly,
  groupTransactionsByDate,
  calculateSummary,
} from '../utils/dateGrouping';
import {
  RotateCcw,
  Search,
  RefreshCw,
  FileText,
  AlertCircle,
  QrCode,
  Truck,
  DollarSign,
  Calendar,
  Trash2,
  Filter,
  X,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Camera,
  Upload,
  Plus,
  PlusCircle,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';

export const PurchasesPage = () => {
  const { business } = useBusiness();
  const { confirm, alert } = useConfirm();
  const { showSuccess, showError } = useSnackbar();
  const currency = business?.currency || 'USD';

  // Transactions data & loading
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTxn, setSelectedTxn] = useState(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'PURCHASE' | 'PURCHASE_RETURN'

  // Vendor return modal state
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [returnProduct, setReturnProduct] = useState('');
  const [returnQty, setReturnQty] = useState(1);
  const [creditAmount, setCreditAmount] = useState('');
  const [returnReason, setReturnReason] = useState('Damaged batch from supplier');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Manual Bill modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);
  const initialManualBillState = {
    sellerName: '',
    vendorPanVat: '',
    billNumber: '',
    billCategory: 'Inventory / Stock In',
    contactNumber: '',
    totalBillAmount: '',
    paymentMethod: 'CASH',
    notes: '',
  };
  const [manualBillData, setManualBillData] = useState(initialManualBillState);
  const [billPhotos, setBillPhotos] = useState([]); // array of base64 strings

  // Convert file to base64
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        showError('Only image files are supported for bill attachments.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showError('Each photo must be under 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setBillPhotos((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
    // Reset file input
    e.target.value = '';
  };

  const handleRemovePhoto = (index) => {
    setBillPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit manual purchase bill
  const handleCreateManualBill = async (e) => {
    e.preventDefault();

    if (!manualBillData.sellerName.trim()) {
      showError('Seller / Vendor Name is required.');
      return;
    }

    // PAN/VAT: exactly 9 digits
    const panClean = manualBillData.vendorPanVat.trim().replace(/\D/g, '');
    if (manualBillData.vendorPanVat.trim() && panClean.length !== 9) {
      showError('Vendor PAN or VAT number must be exactly 9 digits.');
      return;
    }

    if (!manualBillData.billNumber.trim()) {
      showError('Bill / Invoice Number is required.');
      return;
    }

    // Phone validation
    const phoneCheck = validateNepaliPhone(manualBillData.contactNumber);
    if (!phoneCheck.isValid) {
      showError(phoneCheck.error || 'Please enter a valid Nepali contact number.');
      return;
    }

    // Amount validation
    const parsedAmount = parseFloat(manualBillData.totalBillAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showError('Total bill amount must be greater than 0.');
      return;
    }

    try {
      setSubmittingManual(true);
      const payload = {
        type: 'PURCHASE',
        items: [
          {
            productName: `Bill #${manualBillData.billNumber} (${manualBillData.sellerName})`,
            sku: `BILL-${manualBillData.billNumber.toUpperCase()}`,
            quantity: 1,
            unitPrice: parsedAmount,
          },
        ],
        paymentMethod: manualBillData.paymentMethod,
        partyName: manualBillData.sellerName.trim(),
        partyPhone: phoneCheck.normalized,
        notes: manualBillData.notes.trim() || `Manual Bill Category: ${manualBillData.billCategory}`,
        manualBillDetails: {
          sellerName: manualBillData.sellerName.trim(),
          vendorPanVat: panClean,
          billNumber: manualBillData.billNumber.trim(),
          billCategory: manualBillData.billCategory.trim(),
          contactNumber: phoneCheck.normalized,
          billPhotos: billPhotos,
        },
      };

      await transactionService.createTransaction(payload);
      showSuccess(`Manual bill #${manualBillData.billNumber} added successfully`);
      setIsManualModalOpen(false);
      setManualBillData(initialManualBillState);
      setBillPhotos([]);
      fetchPurchases();
    } catch (err) {
      showError(err.message || 'Failed to save manual purchase bill');
    } finally {
      setSubmittingManual(false);
    }
  };

  // Fetch purchases records with applied filters
  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const bounds = getDateFilterBounds(dateFilter, customStart, customEnd);
      const params = {
        categoryGroup: 'purchases',
        limit: 200,
      };

      if (bounds.startDate) params.startDate = bounds.startDate;
      if (bounds.endDate) params.endDate = bounds.endDate;
      if (typeFilter && typeFilter !== 'ALL') params.type = typeFilter;
      if (search.trim()) params.search = search.trim();

      const data = await transactionService.getTransactions(params);
      setTransactions(data?.transactions || []);
    } catch (err) {
      showError(err.message || 'Failed to load purchases history');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, customStart, customEnd, typeFilter, search, showError]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  // Handle record deletion with iOS custom popup
  const handleDeleteTransaction = async (e, id, refNum) => {
    if (e) e.stopPropagation();
    const isConfirmed = await confirm({
      title: 'Delete Purchase Record',
      message: `Are you sure you want to delete purchase audit record #${refNum}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!isConfirmed) return;

    try {
      await transactionService.deleteTransaction(id);
      showSuccess(`Purchase record #${refNum} deleted`);
      setTransactions((prev) => prev.filter((t) => t._id !== id));
      if (selectedTxn?._id === id) {
        setSelectedTxn(null);
      }
    } catch (err) {
      showError(err.message || 'Failed to delete transaction record');
    }
  };

  // Load products for vendor returns modal
  useEffect(() => {
    productService.getProducts({ limit: 150, excludeQR: true }).then((res) => {
      const prods = res?.products || [];
      setAllProducts(prods);
      if (prods.length > 0) {
        setReturnProduct(prods[0]._id);
        setCreditAmount(prods[0].costPrice);
      }
    });
  }, []);

  const handleProductSelectChange = (prodId) => {
    setReturnProduct(prodId);
    const p = allProducts.find((item) => item._id === prodId);
    if (p) {
      setCreditAmount(p.costPrice);
    }
  };

  const handleRecordVendorReturn = async (e) => {
    e.preventDefault();
    if (!returnProduct) return;

    const prod = allProducts.find((p) => p._id === returnProduct);
    if (prod && prod.currentStock < Number(returnQty)) {
      const msg = `Cannot return ${returnQty} ${prod.unit || 'items'}. Only ${prod.currentStock} ${prod.unit || 'items'} currently in stock.`;
      setError(msg);
      showError(msg);
      await alert({
        title: 'Stock Out of Bound Warning',
        message: msg,
        buttonText: 'Understood',
        variant: 'warning',
      });
      return;
    }

    try {
      setSubmittingReturn(true);
      setError('');

      await transactionService.createTransaction({
        type: 'PURCHASE_RETURN',
        items: [
          {
            productId: returnProduct,
            quantity: Number(returnQty),
            unitPrice: Number(creditAmount),
          },
        ],
        paymentMethod: 'CASH',
        notes: `Vendor return: ${returnReason}`,
        scannedViaQR: false,
      });

      showSuccess('Vendor return recorded successfully');
      setIsReturnModalOpen(false);
      fetchPurchases();
    } catch (err) {
      const errMsg = err.message || 'Failed to process vendor return';
      showError(errMsg);
      const isStockError =
        errMsg.toLowerCase().includes('insufficient stock') ||
        errMsg.toLowerCase().includes('out of bound');
      if (isStockError) {
        await alert({
          title: 'Stock Limit Exceeded',
          message: errMsg,
          buttonText: 'Understood',
          variant: 'warning',
        });
      }
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Group transactions by date & compute summaries
  const dateGroups = useMemo(() => groupTransactionsByDate(transactions), [transactions]);
  const summary = useMemo(() => calculateSummary(transactions), [transactions]);

  const activeDateLabel = DATE_FILTERS.find((f) => f.id === dateFilter)?.label || 'All Time';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Purchases & Procurement
            </h1>
            <Badge variant="default" dot>
              Active
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Stock-in replenishment records, supplier bills, and vendor returns
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchPurchases}
            disabled={loading}
            title="Refresh purchases"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsManualModalOpen(true)}
            className="font-semibold"
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
            Add Manual Bill
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsReturnModalOpen(true)}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Return to Vendor
          </Button>
        </div>
      </div>

      {/* Overview Summary Cards for Active Filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <Card compact className="relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Net Spend</span>
            <DollarSign className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {formatCurrency(summary.netAmount, currency)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block truncate">
            {activeDateLabel}
          </span>
        </Card>

        <Card compact className="relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Gross Purchases</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {formatCurrency(summary.primaryAmount, currency)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
            {summary.primaryCount} stock-in {summary.primaryCount === 1 ? 'order' : 'orders'}
          </span>
        </Card>

        <Card compact className="relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Vendor Credits</span>
            <ArrowDownLeft className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            -{formatCurrency(summary.returnsAmount, currency)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
            {summary.returnsCount} vendor {summary.returnsCount === 1 ? 'return' : 'returns'}
          </span>
        </Card>

        <Card compact className="relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Items Received</span>
            <Truck className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {summary.totalQty} <span className="text-xs font-normal text-zinc-400">units</span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
            Across {summary.count} {summary.count === 1 ? 'record' : 'records'}
          </span>
        </Card>
      </div>

      {/* Filter Controls: Date Filter Pills + Type Filter Pills + Search */}
      <div className="space-y-2.5 p-3 rounded-2xl bg-zinc-100/60 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Date Filter Segmented Bar */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none text-xs font-medium">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08]">
              {DATE_FILTERS.map((df) => (
                <button
                  key={df.id}
                  type="button"
                  onClick={() => setDateFilter(df.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 active:scale-95 ${
                    dateFilter === df.id
                      ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-zinc-100 font-semibold scale-[1.02]'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  {df.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search reference, product, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-200/90 dark:border-zinc-750 bg-white dark:bg-zinc-900 pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-zinc-700 dark:focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:focus:ring-zinc-600/30"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Transaction Type Filter & Custom Date Inputs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-zinc-200/50 dark:border-zinc-700/40">
          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Type:
            </span>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-xs">
              <button
                type="button"
                onClick={() => setTypeFilter('ALL')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all active:scale-95 ${
                  typeFilter === 'ALL'
                    ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-zinc-100 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('PURCHASE')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all active:scale-95 ${
                  typeFilter === 'PURCHASE'
                    ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-zinc-100 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                Purchases Only
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('PURCHASE_RETURN')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all active:scale-95 ${
                  typeFilter === 'PURCHASE_RETURN'
                    ? 'bg-white text-amber-700 shadow-xs dark:bg-zinc-800 dark:text-amber-400 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                Vendor Returns
              </button>
            </div>
          </div>

          {/* Custom Date Range Picker (shown if dateFilter === 'custom') */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-40 sm:w-44">
                <DatePicker
                  placeholder="From date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <span className="text-xs text-zinc-400">to</span>
              <div className="w-40 sm:w-44">
                <DatePicker
                  placeholder="To date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
              {(customStart || customEnd) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomStart('');
                    setCustomEnd('');
                  }}
                  className="text-xs text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transactions List Grouped by Date */}
      <div className="space-y-6">
        {loading && transactions.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-xs">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-zinc-400" />
            Loading purchases records...
          </div>
        ) : dateGroups.length === 0 ? (
          <Card className="py-12 text-center text-zinc-400 text-xs">
            <div className="max-w-xs mx-auto space-y-2">
              <Calendar className="h-8 w-8 mx-auto text-zinc-300 dark:text-zinc-600" />
              <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">
                No purchase transactions found
              </p>
              <p className="text-zinc-500">
                There are no purchase or vendor return records for {activeDateLabel.toLowerCase()} matching your filter criteria.
              </p>
              {(dateFilter !== 'all' || typeFilter !== 'ALL' || search) && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setDateFilter('all');
                    setTypeFilter('ALL');
                    setSearch('');
                    setCustomStart('');
                    setCustomEnd('');
                  }}
                  className="mt-2"
                >
                  Reset all filters
                </Button>
              )}
            </div>
          </Card>
        ) : (
          dateGroups.map((group) => (
            <div key={group.dateKey} className="space-y-2.5">
              {/* Daily Group Sticky Header with Summary */}
              <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-xl bg-zinc-100/90 dark:bg-zinc-850/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {group.label}
                  </span>
                  {group.subLabel && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      • {group.subLabel}
                    </span>
                  )}
                </div>

                {/* Daily Summary Metrics */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/[0.04] dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300 border border-black/[0.06] dark:border-white/[0.08]">
                    {group.summary.count} {group.summary.count === 1 ? 'txn' : 'txns'} · {group.summary.totalQty} units
                  </span>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                      group.summary.netAmount >= 0
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    Net: {formatCurrency(group.summary.netAmount, currency)}
                  </span>

                  {group.summary.returnsCount > 0 && (
                    <span className="hidden sm:inline-flex items-center text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      ({group.summary.returnsCount} vendor return: -{formatCurrency(group.summary.returnsAmount, currency)})
                    </span>
                  )}
                </div>
              </div>

              {/* Mobile Cards for this Date Group */}
              <div className="block lg:hidden space-y-2">
                {group.transactions.map((txn) => {
                  const isReturn = txn.type === 'PURCHASE_RETURN';
                  return (
                    <div
                      key={txn._id}
                      onClick={() => setSelectedTxn(txn)}
                      className={`p-3.5 rounded-2xl border bg-white dark:bg-zinc-900 cursor-pointer active:scale-[0.99] transition-all shadow-2xs ${
                        isReturn
                          ? 'border-amber-200/80 dark:border-amber-900/40'
                          : 'border-zinc-200/80 dark:border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
                            {txn.referenceNumber}
                          </span>
                          {txn.scannedViaQR && (
                            <span
                              className="inline-flex items-center text-[10px] text-zinc-500 dark:text-zinc-400"
                              title="Scanned via QR"
                            >
                              <QrCode className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        <Badge variant={isReturn ? 'warning' : 'default'} size="sm" dot>
                          {isReturn ? 'Vendor Return' : 'Stock-In Purchase'}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-start pt-2.5">
                        <div className="text-xs text-zinc-600 dark:text-zinc-300 max-w-[70%]">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {txn.items?.[0]?.productName}
                          </span>
                          {txn.items?.[0]?.quantity && (
                            <span className="text-zinc-400 text-[11px] ml-1">
                              x{txn.items[0].quantity}
                            </span>
                          )}
                          {txn.items?.length > 1 && (
                            <div className="text-[11px] text-zinc-400">
                              +{txn.items.length - 1} additional item{txn.items.length > 2 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        <div
                          className={`font-mono font-bold text-sm text-right ${
                            isReturn
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {isReturn ? '-' : '+'}
                          {formatCurrency(txn.totalAmount, currency)}
                        </div>
                      </div>

                      {/* Date, Time and Details */}
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2.5 mt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-zinc-400" />
                          <span>{formatTimeOnly(txn.createdAt)}</span>
                          <span>•</span>
                          <span>{formatPaymentMethod(txn.paymentMethod)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTxn(txn);
                            }}
                            className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:underline"
                          >
                            Receipt
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTransaction(e, txn._id, txn.referenceNumber)}
                            className="text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                            title="Delete record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table for this Date Group */}
              <Card className="hidden lg:block p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50/80 dark:bg-zinc-850/80 border-b border-zinc-200/80 dark:border-zinc-800 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                      <tr>
                        <th className="px-5 py-3">Reference</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Line Items</th>
                        <th className="px-4 py-3">Net Spend</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3">Date & Time</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {group.transactions.map((txn) => {
                        const isReturn = txn.type === 'PURCHASE_RETURN';
                        return (
                          <tr
                            key={txn._id}
                            onClick={() => setSelectedTxn(txn)}
                            className="hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer"
                          >
                            <td className="px-5 py-3.5 font-mono font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                              <div className="flex items-center gap-1.5">
                                <span>{txn.referenceNumber}</span>
                                {txn.scannedViaQR && (
                                  <span title="Scanned via QR">
                                    <QrCode className="h-3 w-3 text-zinc-400" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <Badge variant={isReturn ? 'warning' : 'default'} size="sm" dot>
                                {isReturn ? 'Vendor Return' : 'Purchase'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3.5 text-xs text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                              {txn.items?.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                            </td>
                            <td
                              className={`px-4 py-3.5 font-bold font-mono text-xs ${
                                isReturn
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-zinc-900 dark:text-zinc-100'
                              }`}
                            >
                              {isReturn ? '-' : '+'}
                              {formatCurrency(txn.totalAmount, currency)}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-zinc-500">
                              {formatPaymentMethod(txn.paymentMethod)}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                                {formatDateOnly(txn.createdAt)}
                              </div>
                              <div className="text-[11px] text-zinc-400 font-mono">
                                {formatTimeOnly(txn.createdAt)}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="inline-flex items-center gap-1 justify-end">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTxn(txn);
                                  }}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] dark:hover:text-zinc-200 transition-colors active:scale-90"
                                  title="View Receipt"
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
          ))
        )}
      </div>

      {/* Log Vendor Return Modal */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Return Stock to Supplier / Vendor"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRecordVendorReturn} className="space-y-3.5">
          <div>
            <Select
              label="Select Product to Return"
              value={returnProduct}
              onChange={(e) => handleProductSelectChange(e.target.value)}
              options={allProducts.map((p) => ({
                value: p._id,
                label: `${p.name} (${p.sku})`,
                subtext: `Available: ${p.currentStock} ${p.unit}`,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity to Return"
              type="number"
              min="1"
              required
              value={returnQty}
              onChange={(e) => setReturnQty(e.target.value)}
            />
            <Input
              label={`Supplier Credit (${currency})`}
              type="number"
              step="0.01"
              required
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
            />
          </div>

          <div>
            <Select
              label="Reason for Return"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              options={[
                'Damaged batch from supplier',
                'Incorrect specification',
                'Excess / overstock return',
                'Near expiration',
              ]}
            />
          </div>

          <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-3 text-[11px] text-zinc-500 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-750">
            Note: Returning items to vendor will immediately deduct {returnQty} from your inventory stock and record {formatCurrency(creditAmount || 0, currency)} in supplier credits.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setIsReturnModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submittingReturn}>
              Confirm Vendor Return
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transaction Details Receipt Modal */}
      <Modal
        isOpen={Boolean(selectedTxn)}
        onClose={() => setSelectedTxn(null)}
        title="Purchase Order Receipt"
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
              <Badge
                variant={selectedTxn.type === 'PURCHASE_RETURN' ? 'warning' : 'default'}
                size="sm"
                dot
              >
                {selectedTxn.type === 'PURCHASE_RETURN' ? 'Vendor Return' : 'Stock-In Purchase'}
              </Badge>
            </div>

            <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
              <span>Timestamp:</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300 font-medium">
                {formatDateTime(selectedTxn.createdAt)}
              </span>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border rounded-xl p-2.5 bg-zinc-50/50 dark:bg-zinc-850/50 max-h-48 overflow-y-auto">
              {selectedTxn.items?.map((it, i) => (
                <div key={i} className="flex justify-between py-1.5 text-xs">
                  <div>
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {it.productName}
                    </p>
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
              <span>Total Amount:</span>
              <span
                className={`font-mono text-base ${
                  selectedTxn.type === 'PURCHASE_RETURN'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-zinc-900 dark:text-zinc-100'
                }`}
              >
                {selectedTxn.type === 'PURCHASE_RETURN' ? '-' : '+'}
                {formatCurrency(selectedTxn.totalAmount, currency)}
              </span>
            </div>

            {/* Manual Bill Details if present */}
            {selectedTxn.manualBillDetails && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200/60 dark:border-zinc-700 pb-1.5">
                  <span>Vendor Bill Details</span>
                  <Badge variant="neutral" size="sm">
                    {selectedTxn.manualBillDetails.billCategory || 'Bill'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div>
                    <span className="text-zinc-400">Vendor:</span>{' '}
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {selectedTxn.manualBillDetails.sellerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400">PAN / VAT:</span>{' '}
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {selectedTxn.manualBillDetails.vendorPanVat || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Bill No:</span>{' '}
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {selectedTxn.manualBillDetails.billNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Contact:</span>{' '}
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                      {selectedTxn.manualBillDetails.contactNumber || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Attached Bill Photos */}
                {selectedTxn.manualBillDetails.billPhotos?.length > 0 && (
                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700">
                    <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1.5">
                      Attached Bill Photos ({selectedTxn.manualBillDetails.billPhotos.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedTxn.manualBillDetails.billPhotos.map((photo, pIdx) => (
                        <a
                          key={pIdx}
                          href={photo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-14 h-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={photo}
                            alt={`Bill photo ${pIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedTxn.notes && (
              <p className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-850 p-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800">
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
      {/* MODAL: Manually Add Purchase Bill */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Manually Record Purchase Bill"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateManualBill} className="space-y-3.5">
          <Input
            label="Seller / Vendor Name"
            placeholder="e.g. Acme Distributors Pvt. Ltd."
            required
            value={manualBillData.sellerName}
            onChange={(e) =>
              setManualBillData({ ...manualBillData, sellerName: e.target.value })
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Vendor PAN or VAT Number"
              placeholder="e.g. 601234567 (9 digits)"
              maxLength={9}
              value={manualBillData.vendorPanVat}
              onChange={(e) =>
                setManualBillData({
                  ...manualBillData,
                  vendorPanVat: e.target.value.replace(/\D/g, '').slice(0, 9),
                })
              }
              helperText={
                manualBillData.vendorPanVat
                  ? `${manualBillData.vendorPanVat.length}/9 digits entered`
                  : 'Optional (9 digits)'
              }
            />

            <Input
              label="Bill / Invoice Number"
              placeholder="e.g. INV-2081-042"
              required
              value={manualBillData.billNumber}
              onChange={(e) =>
                setManualBillData({ ...manualBillData, billNumber: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Bill Category"
              placeholder="e.g. Inventory, Electronics, Stationery"
              value={manualBillData.billCategory}
              onChange={(e) =>
                setManualBillData({ ...manualBillData, billCategory: e.target.value })
              }
            />

            <PhoneInput
              label="Vendor Contact Number"
              required
              value={manualBillData.contactNumber}
              onChange={(e) =>
                setManualBillData({ ...manualBillData, contactNumber: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={`Total Bill Amount (${currency})`}
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              required
              value={manualBillData.totalBillAmount}
              onChange={(e) =>
                setManualBillData({ ...manualBillData, totalBillAmount: e.target.value })
              }
            />

            <Select
              label="Payment Method"
              value={manualBillData.paymentMethod}
              onChange={(e) =>
                setManualBillData({ ...manualBillData, paymentMethod: e.target.value })
              }
              options={[
                { value: 'CASH', label: 'Cash' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                { value: 'ONLINE', label: 'Online Payment' },
                { value: 'CREDIT', label: 'Credit' },
              ]}
            />
          </div>

          {/* Bill Photos Upload: Gallery and Camera */}
          <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Upload Bill Photos (Multiple Supported)
            </label>

            <div className="flex flex-wrap items-center gap-2">
              {/* Option 1: Gallery Upload */}
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors shadow-2xs">
                <Upload className="h-4 w-4 text-blue-500" />
                <span>Upload from Gallery</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Option 2: Camera Capture */}
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors shadow-2xs">
                <Camera className="h-4 w-4 text-emerald-500" />
                <span>Take Photo with Camera</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Photos Preview Thumbnails */}
            {billPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {billPhotos.map((photoUrl, idx) => (
                  <div
                    key={idx}
                    className="relative group w-16 h-16 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-2xs"
                  >
                    <img
                      src={photoUrl}
                      alt={`Bill ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 hover:bg-rose-600 text-white transition-colors"
                      title="Remove Photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsManualModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submittingManual}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Save Purchase Bill
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PurchasesPage;
