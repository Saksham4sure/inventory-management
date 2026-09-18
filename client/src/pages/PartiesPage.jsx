import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../hooks/useBusiness';
import { useConfirm } from '../hooks/useConfirm';
import { useSnackbar } from '../hooks/useSnackbar';
import { partyService } from '../services/partyService';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PhoneInput } from '../components/ui/PhoneInput';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { validateNepaliPhone } from '../utils/phoneValidator';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  MapPin,
  DollarSign,
  Trash2,
  Edit2,
  RefreshCw,
  AlertCircle,
  X,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Eye,
} from 'lucide-react';

export const PartiesPage = () => {
  const { business } = useBusiness();
  const { confirm, alert } = useConfirm();
  const { showSuccess, showError } = useSnackbar();
  const currency = business?.currency || 'USD';

  // State
  const [parties, setParties] = useState([]);
  const [summary, setSummary] = useState({
    totalReceivable: 0,
    totalPayable: 0,
    netBalance: 0,
    totalParties: 0,
    customersCount: 0,
    suppliersCount: 0,
    creditActiveCount: 0,
    receivableCount: 0,
    payableCount: 0,
    settledCount: 0,
    breakdown: {
      ALL: { total: 0, receivable: 0, payable: 0, settled: 0 },
      CUSTOMER: { total: 0, receivable: 0, payable: 0, settled: 0 },
      SUPPLIER: { total: 0, receivable: 0, payable: 0, settled: 0 },
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'CUSTOMER' | 'SUPPLIER' | 'CREDIT'
  const [balanceFilter, setBalanceFilter] = useState('ALL'); // 'ALL' | 'RECEIVABLE' | 'PAYABLE' | 'CLEAR'

  // Modals
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [partyFormData, setPartyFormData] = useState({
    name: '',
    phone: '',
    email: '',
    type: 'CUSTOMER',
    address: '',
    creditLimit: '',
    openingBalance: '',
    notes: '',
  });
  const [submittingParty, setSubmittingParty] = useState(false);

  // Credit Transaction Modal
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [selectedPartyForCredit, setSelectedPartyForCredit] = useState(null);
  const [creditFormData, setCreditFormData] = useState({
    entryType: 'CREDIT_GIVEN',
    amount: '',
    paymentMethod: 'CASH',
    referenceNumber: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [submittingCredit, setSubmittingCredit] = useState(false);

  // Ledger / History Modal
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [ledgerParty, setLedgerParty] = useState(null);
  const [ledgerHistory, setLedgerHistory] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Fetch Parties & Summary
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = {};
      if (activeTab === 'CUSTOMER' || activeTab === 'SUPPLIER') {
        params.type = activeTab;
      }
      if (activeTab === 'CREDIT') {
        params.filterBalance = 'CREDIT';
      } else if (balanceFilter !== 'ALL') {
        params.filterBalance = balanceFilter;
      }
      if (search.trim()) {
        params.search = search.trim();
      }

      const [partiesRes, summaryRes] = await Promise.all([
        partyService.getParties(params),
        partyService.getPartiesCreditSummary(),
      ]);

      setParties(partiesRes?.parties || []);
      if (summaryRes) {
        setSummary(summaryRes);
      }
    } catch (err) {
      showError(err.message || 'Failed to load parties data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, balanceFilter, search, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingParty(null);
    setPartyFormData({
      name: '',
      phone: '',
      email: '',
      type: 'CUSTOMER',
      address: '',
      creditLimit: '',
      openingBalance: '',
      notes: '',
    });
    setIsPartyModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (party, e) => {
    if (e) e.stopPropagation();
    setEditingParty(party);
    setPartyFormData({
      name: party.name || '',
      phone: party.phone || '',
      email: party.email || '',
      type: party.type || 'CUSTOMER',
      address: party.address || '',
      creditLimit: party.creditLimit || '',
      openingBalance: '', // Cannot edit opening balance directly
      notes: party.notes || '',
    });
    setIsPartyModalOpen(true);
  };

  // Submit Create or Edit Party
  const handleSubmitParty = async (e) => {
    e.preventDefault();
    if (!partyFormData.name.trim() || !partyFormData.phone.trim()) {
      showError('Name and Phone number are required.');
      return;
    }

    const phoneCheck = validateNepaliPhone(partyFormData.phone);
    if (!phoneCheck.isValid) {
      showError(phoneCheck.error || 'Please enter a valid Nepali contact number.');
      return;
    }

    try {
      setSubmittingParty(true);
      if (editingParty) {
        await partyService.updateParty(editingParty._id, partyFormData);
        showSuccess('Party details updated successfully');
      } else {
        await partyService.createParty(partyFormData);
        showSuccess('Party registered successfully');
      }
      setIsPartyModalOpen(false);
      fetchData();
    } catch (err) {
      showError(err.message || 'Failed to save party record');
    } finally {
      setSubmittingParty(false);
    }
  };

  // Delete Party
  const handleDeleteParty = async (party, e) => {
    if (e) e.stopPropagation();
    const isConfirmed = await confirm({
      title: 'Delete Party Record',
      message: `Are you sure you want to delete "${party.name}" (${party.phone})? All associated credit ledger transactions will also be permanently removed.`,
      confirmText: 'Delete Party',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!isConfirmed) return;

    try {
      await partyService.deleteParty(party._id);
      showSuccess(`Party "${party.name}" deleted`);
      setParties((prev) => prev.filter((p) => p._id !== party._id));
      if (ledgerParty?._id === party._id) {
        setIsLedgerModalOpen(false);
      }
      partyService.getPartiesCreditSummary().then((res) => setSummary(res));
    } catch (err) {
      showError(err.message || 'Failed to delete party');
    }
  };

  // Open Credit Transaction Modal
  const handleOpenCreditModal = (party, defaultType = null, e) => {
    if (e) e.stopPropagation();
    setSelectedPartyForCredit(party);

    let entryType = 'CREDIT_GIVEN';
    if (defaultType) {
      entryType = defaultType;
    } else if (party.type === 'SUPPLIER') {
      entryType = 'CREDIT_TAKEN';
    }

    setCreditFormData({
      entryType,
      amount: '',
      paymentMethod: 'CASH',
      referenceNumber: '',
      notes: '',
      date: new Date().toISOString().split('T')[0],
    });
    setIsCreditModalOpen(true);
  };

  // Submit Credit Transaction
  const handleSubmitCredit = async (e) => {
    e.preventDefault();
    if (!selectedPartyForCredit || !creditFormData.amount || Number(creditFormData.amount) <= 0) {
      showError('Please provide a valid transaction amount greater than 0.');
      return;
    }

    try {
      setSubmittingCredit(true);
      await partyService.recordCreditTransaction(selectedPartyForCredit._id, creditFormData);
      showSuccess('Credit entry successfully recorded');
      setIsCreditModalOpen(false);
      fetchData();

      // If ledger modal is open, reload it too
      if (isLedgerModalOpen && ledgerParty?._id === selectedPartyForCredit._id) {
        openLedger(selectedPartyForCredit);
      }
    } catch (err) {
      showError(err.message || 'Failed to record credit transaction');
    } finally {
      setSubmittingCredit(false);
    }
  };

  // Open Ledger Modal
  const openLedger = async (party, e) => {
    if (e) e.stopPropagation();
    setLedgerParty(party);
    setIsLedgerModalOpen(true);
    try {
      setLoadingLedger(true);
      const res = await partyService.getPartyCreditHistory(party._id);
      setLedgerHistory(res?.history || []);
      if (res?.party) {
        setLedgerParty(res.party);
      }
    } catch (err) {
      console.error('Failed to load ledger', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  // Format Helper for Initials
  const getInitials = (name) => {
    if (!name) return 'P';
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const currentBalanceCounts = summary.breakdown?.[activeTab] || {
    total: summary.totalParties || 0,
    receivable: summary.receivableCount || 0,
    payable: summary.payableCount || 0,
    settled: summary.settledCount || 0,
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Parties & Credit Hub
            </h1>
            <Badge variant="accent" dot>
              Ledger
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Customer identities, supplier accounts, credit ledger & receivables tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            title="Refresh parties"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
            <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add Party
          </Button>
        </div>
      </div>

      {/* Credit Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <Card compact className="relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-semibold tracking-wider">
              To Collect (Receivable)
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(summary.totalReceivable, currency)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
            Money customers owe you
          </span>
        </Card>

        <Card compact className="relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-semibold tracking-wider">
              To Pay (Payable)
            </span>
            <ArrowDownLeft className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(summary.totalPayable, currency)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
            Money you owe suppliers
          </span>
        </Card>

        <Card compact className="relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Net Position</span>
            <DollarSign className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <div
            className={`text-lg sm:text-2xl font-black font-mono mt-1 ${
              summary.netBalance >= 0
                ? 'text-zinc-900 dark:text-zinc-100'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {formatCurrency(summary.netBalance, currency)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
            {summary.netBalance >= 0 ? 'Net positive credit' : 'Net payable balance'}
          </span>
        </Card>

        <Card compact className="relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-semibold tracking-wider">
              Total Contacts
            </span>
            <Users className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {summary.totalParties}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
            {summary.customersCount} customers · {summary.suppliersCount} suppliers
          </span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2.5 p-3 rounded-2xl bg-zinc-100/60 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-xs font-medium overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all duration-150 active:scale-95 ${
                activeTab === 'ALL'
                  ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-zinc-100 font-semibold scale-[1.02]'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              All Parties
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CUSTOMER')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all duration-150 active:scale-95 ${
                activeTab === 'CUSTOMER'
                  ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-zinc-100 font-semibold scale-[1.02]'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              Customers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SUPPLIER')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all duration-150 active:scale-95 ${
                activeTab === 'SUPPLIER'
                  ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-zinc-100 font-semibold scale-[1.02]'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              Suppliers / Vendors
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CREDIT')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all duration-150 active:scale-95 ${
                activeTab === 'CREDIT'
                  ? 'bg-white text-amber-700 shadow-xs dark:bg-zinc-800 dark:text-amber-400 font-semibold scale-[1.02]'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              Credits Only
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, phone, email..."
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

        {/* Balance Sub-Filters */}
        {activeTab !== 'CREDIT' && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-200/50 dark:border-zinc-700/40 text-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mr-1">
              Balance:
            </span>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setBalanceFilter('ALL')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  balanceFilter === 'ALL'
                    ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-zinc-100 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                All ({currentBalanceCounts.total})
              </button>
              <button
                type="button"
                onClick={() => setBalanceFilter('RECEIVABLE')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  balanceFilter === 'RECEIVABLE'
                    ? 'bg-white text-emerald-700 shadow-xs dark:bg-zinc-800 dark:text-emerald-400 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                To Collect ({currentBalanceCounts.receivable})
              </button>
              <button
                type="button"
                onClick={() => setBalanceFilter('PAYABLE')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  balanceFilter === 'PAYABLE'
                    ? 'bg-white text-amber-700 shadow-xs dark:bg-zinc-800 dark:text-amber-400 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                To Pay ({currentBalanceCounts.payable})
              </button>
              <button
                type="button"
                onClick={() => setBalanceFilter('CLEAR')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  balanceFilter === 'CLEAR'
                    ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-zinc-100 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                Settled ({currentBalanceCounts.settled})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Parties List */}
      <div className="space-y-3">
        {loading && parties.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-xs">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-zinc-400" />
            Loading parties and credit records...
          </div>
        ) : parties.length === 0 ? (
          <Card className="py-12 text-center text-zinc-400 text-xs">
            <div className="max-w-xs mx-auto space-y-2">
              <Users className="h-8 w-8 mx-auto text-zinc-300 dark:text-zinc-600" />
              <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">
                No parties found
              </p>
              <p className="text-zinc-500">
                {search
                  ? 'No contacts match your search query.'
                  : 'Start by creating your first customer or vendor profile with phone number identity.'}
              </p>
              <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="mt-3">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Create Party
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Phone Cards (Mobile View) */}
            <div className="block lg:hidden space-y-2.5">
              {parties.map((party) => {
                const isCustomer = party.type === 'CUSTOMER';
                const bal = party.currentBalance || 0;
                return (
                  <div
                    key={party._id}
                    onClick={(e) => openLedger(party, e)}
                    className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs cursor-pointer active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-start justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                          {getInitials(party.name)}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                            {party.name}
                          </p>
                          <a
                            href={`tel:${party.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                          >
                            <Phone className="h-3 w-3 text-zinc-400" />
                            <span>{party.phone}</span>
                          </a>
                        </div>
                      </div>

                      <Badge variant={isCustomer ? 'accent' : 'default'} size="sm">
                        {isCustomer ? 'Customer' : 'Supplier'}
                      </Badge>
                    </div>

                    {/* Balance Info */}
                    <div className="flex items-center justify-between pt-2.5">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
                          Credit Balance
                        </span>
                        <div
                          className={`font-mono font-bold text-sm ${
                            bal > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : bal < 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {bal > 0 ? `To Collect: +${formatCurrency(bal, currency)}` : ''}
                          {bal < 0 ? `To Pay: ${formatCurrency(bal, currency)}` : ''}
                          {bal === 0 ? 'All Clear (0.00)' : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => handleOpenCreditModal(party, null, e)}
                          className="text-[11px] px-2.5 py-1"
                        >
                          Record Entry
                        </Button>
                      </div>
                    </div>

                    {/* Bottom row: Address/Notes & Actions */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                      <div className="truncate max-w-[65%]">
                        {party.address || party.email || party.notes || 'No extra notes'}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditModal(party, e)}
                          className="p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                          title="Edit Party"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteParty(party, e)}
                          className="p-1 text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400"
                          title="Delete Party"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <Card className="hidden lg:block p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50/80 dark:bg-zinc-850/80 border-b border-zinc-200/80 dark:border-zinc-800 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="px-5 py-3">Party Identity</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Contact & Details</th>
                      <th className="px-4 py-3">Current Balance</th>
                      <th className="px-4 py-3">Credit Limit</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {parties.map((party) => {
                      const isCustomer = party.type === 'CUSTOMER';
                      const bal = party.currentBalance || 0;
                      return (
                        <tr
                          key={party._id}
                          onClick={(e) => openLedger(party, e)}
                          className="hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl font-bold text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                                {getInitials(party.name)}
                              </div>
                              <div>
                                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                                  {party.name}
                                </div>
                                <div className="font-mono text-[11px] text-zinc-400 flex items-center gap-1">
                                  <Phone className="h-2.5 w-2.5" />
                                  <span>{party.phone}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <Badge variant={isCustomer ? 'accent' : 'default'} size="sm" dot>
                              {isCustomer ? 'Customer' : 'Supplier'}
                            </Badge>
                          </td>

                          <td className="px-4 py-3.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {party.email && <div>{party.email}</div>}
                            {party.address && (
                              <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {party.address}
                              </div>
                            )}
                            {!party.email && !party.address && <span>—</span>}
                          </td>

                          <td className="px-4 py-3.5 font-mono text-xs">
                            {bal > 0 && (
                              <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                                +{formatCurrency(bal, currency)}
                                <span className="text-[10px] text-zinc-400 font-normal block">
                                  (To Collect)
                                </span>
                              </div>
                            )}
                            {bal < 0 && (
                              <div className="text-amber-600 dark:text-amber-400 font-bold">
                                {formatCurrency(bal, currency)}
                                <span className="text-[10px] text-zinc-400 font-normal block">
                                  (To Pay)
                                </span>
                              </div>
                            )}
                            {bal === 0 && (
                              <div className="text-zinc-400">
                                {formatCurrency(0, currency)}
                                <span className="text-[10px] block">Clear</span>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-xs font-mono text-zinc-500">
                            {party.creditLimit > 0
                              ? formatCurrency(party.creditLimit, currency)
                              : 'No limit'}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => handleOpenCreditModal(party, null, e)}
                                className="text-[11px] px-2.5 py-1"
                              >
                                Record Entry
                              </Button>
                              <button
                                type="button"
                                onClick={(e) => openLedger(party, e)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] dark:hover:text-zinc-200 transition-colors"
                                title="View Credit Ledger"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleOpenEditModal(party, e)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] dark:hover:text-zinc-200 transition-colors"
                                title="Edit Party"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteParty(party, e)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:bg-rose-500/15 transition-colors"
                                title="Delete Party"
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
          </>
        )}
      </div>

      {/* MODAL 1: Create or Edit Party */}
      <Modal
        isOpen={isPartyModalOpen}
        onClose={() => setIsPartyModalOpen(false)}
        title={editingParty ? 'Edit Party Identity' : 'Create New Party Profile'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitParty} className="space-y-3.5">
          <Input
            label="Party Name"
            placeholder="e.g. John Doe / Apex Retailers"
            required
            value={partyFormData.name}
            onChange={(e) => setPartyFormData({ ...partyFormData, name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PhoneInput
              label="Phone Number"
              required
              value={partyFormData.phone}
              onChange={(e) => setPartyFormData({ ...partyFormData, phone: e.target.value })}
            />

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Party Type *
              </label>
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setPartyFormData({ ...partyFormData, type: 'CUSTOMER' })}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    partyFormData.type === 'CUSTOMER'
                      ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => setPartyFormData({ ...partyFormData, type: 'SUPPLIER' })}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    partyFormData.type === 'SUPPLIER'
                      ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  Supplier
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address (Optional)"
              type="email"
              placeholder="contact@party.com"
              value={partyFormData.email}
              onChange={(e) => setPartyFormData({ ...partyFormData, email: e.target.value })}
            />

            <Input
              label={`Credit Limit (${currency})`}
              type="number"
              placeholder="e.g. 5000"
              value={partyFormData.creditLimit}
              onChange={(e) => setPartyFormData({ ...partyFormData, creditLimit: e.target.value })}
            />
          </div>

          {!editingParty && (
            <Input
              label={`Opening Credit Balance (${currency})`}
              type="number"
              placeholder="0.00 (Positive if they owe you)"
              helperText="Positive = Customer owes you · Negative = You owe supplier"
              value={partyFormData.openingBalance}
              onChange={(e) =>
                setPartyFormData({ ...partyFormData, openingBalance: e.target.value })
              }
            />
          )}

          <Input
            label="Address / Location"
            placeholder="Street, City, Building"
            value={partyFormData.address}
            onChange={(e) => setPartyFormData({ ...partyFormData, address: e.target.value })}
          />

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Internal Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Special credit terms, business remarks..."
              value={partyFormData.notes}
              onChange={(e) => setPartyFormData({ ...partyFormData, notes: e.target.value })}
              className="w-full rounded-xl border border-zinc-200/90 dark:border-zinc-750 bg-white dark:bg-zinc-900 p-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:focus:ring-zinc-600/30"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setIsPartyModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submittingParty}>
              {editingParty ? 'Save Changes' : 'Create Party'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Record Credit Transaction */}
      <Modal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        title={
          selectedPartyForCredit
            ? `Record Transaction: ${selectedPartyForCredit.name}`
            : 'Record Credit Entry'
        }
        maxWidth="max-w-md"
      >
        {selectedPartyForCredit && (
          <form onSubmit={handleSubmitCredit} className="space-y-3.5">
            {/* Current Balance Notice */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-750">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                  Current Balance
                </span>
                <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(selectedPartyForCredit.currentBalance, currency)}
                </span>
              </div>
              <Badge
                variant={selectedPartyForCredit.type === 'CUSTOMER' ? 'accent' : 'default'}
                size="sm"
              >
                {selectedPartyForCredit.type}
              </Badge>
            </div>

            {/* Entry Type Selector */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Transaction Direction *
              </label>
              {selectedPartyForCredit.type === 'CUSTOMER' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCreditFormData({ ...creditFormData, entryType: 'CREDIT_GIVEN' })
                    }
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      creditFormData.entryType === 'CREDIT_GIVEN'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      <ArrowUpRight className="h-3.5 w-3.5" /> Give Credit
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Customer owes you</p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCreditFormData({ ...creditFormData, entryType: 'PAYMENT_RECEIVED' })
                    }
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      creditFormData.entryType === 'PAYMENT_RECEIVED'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 font-bold'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Receive Payment
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Customer pays cash/online</p>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCreditFormData({ ...creditFormData, entryType: 'CREDIT_TAKEN' })
                    }
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      creditFormData.entryType === 'CREDIT_TAKEN'
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 font-bold'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      <ArrowDownLeft className="h-3.5 w-3.5" /> Purchase on Credit
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5">You owe supplier</p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCreditFormData({ ...creditFormData, entryType: 'PAYMENT_MADE' })
                    }
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      creditFormData.entryType === 'PAYMENT_MADE'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Pay Supplier
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5">You cleared payment</p>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label={`Amount (${currency}) *`}
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={creditFormData.amount}
                onChange={(e) => setCreditFormData({ ...creditFormData, amount: e.target.value })}
              />

              <Input
                label="Date *"
                type="date"
                required
                value={creditFormData.date}
                onChange={(e) => setCreditFormData({ ...creditFormData, date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Payment Method"
                value={creditFormData.paymentMethod}
                onChange={(e) =>
                  setCreditFormData({ ...creditFormData, paymentMethod: e.target.value })
                }
                options={[
                  { value: 'CASH', label: 'Cash' },
                  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                  { value: 'ONLINE', label: 'Online Payment' },
                  { value: 'CREDIT', label: 'Credit' },
                ]}
              />

              <Input
                label="Reference / Receipt #"
                placeholder="INV-001 or Slip #"
                value={creditFormData.referenceNumber}
                onChange={(e) =>
                  setCreditFormData({ ...creditFormData, referenceNumber: e.target.value })
                }
              />
            </div>

            <Input
              label="Notes / Description"
              placeholder="e.g. Cleared pending invoice for batch 4"
              value={creditFormData.notes}
              onChange={(e) => setCreditFormData({ ...creditFormData, notes: e.target.value })}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsCreditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={submittingCredit}>
                Save Transaction
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 3: Party Ledger / Credit History */}
      <Modal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        title={ledgerParty ? `${ledgerParty.name} — Credit Ledger` : 'Party Ledger'}
        maxWidth="max-w-xl"
      >
        {ledgerParty && (
          <div className="space-y-4">
            {/* Ledger Header Card */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-100/90 dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-750">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 font-bold text-sm">
                  {getInitials(ledgerParty.name)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {ledgerParty.name}
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">{ledgerParty.phone}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                  Net Balance
                </span>
                <span
                  className={`font-mono font-bold text-sm sm:text-base ${
                    (ledgerParty.currentBalance || 0) > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : (ledgerParty.currentBalance || 0) < 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-zinc-500'
                  }`}
                >
                  {formatCurrency(ledgerParty.currentBalance || 0, currency)}
                </span>
              </div>
            </div>

            {/* Quick Action inside Ledger */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Transaction History
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => handleOpenCreditModal(ledgerParty, null, e)}
                className="text-xs"
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add Entry
              </Button>
            </div>

            {/* Transactions Timeline */}
            <div className="border rounded-2xl p-2 bg-zinc-50/50 dark:bg-zinc-900/50 max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {loadingLedger ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Loading ledger entries...
                </div>
              ) : ledgerHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  No credit transactions recorded yet for this party.
                </div>
              ) : (
                ledgerHistory.map((entry) => (
                  <div key={entry._id} className="p-2.5 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              entry.entryType.includes('PAYMENT') ? 'accent' : 'warning'
                            }
                            size="sm"
                          >
                            {entry.entryType.replace('_', ' ')}
                          </Badge>
                          {entry.referenceNumber && (
                            <span className="font-mono text-[11px] text-zinc-400">
                              #{entry.referenceNumber}
                            </span>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {entry.notes}
                          </p>
                        )}
                        <span className="text-[10px] text-zinc-400 block font-mono">
                          {formatDate(entry.date || entry.createdAt)}
                        </span>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-mono font-bold text-xs ${
                            entry.entryType.includes('PAYMENT')
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {formatCurrency(entry.amount, currency)}
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono block">
                          Bal: {formatCurrency(entry.balanceAfter, currency)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
            </div>

            <div className="flex justify-end pt-1">
              <Button variant="secondary" size="sm" onClick={() => setIsLedgerModalOpen(false)}>
                Close Ledger
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PartiesPage;
