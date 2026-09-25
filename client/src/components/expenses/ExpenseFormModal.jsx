import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useSnackbar } from '../../hooks/useSnackbar';
import { expenseService } from '../../services/expenseService';
import { Receipt } from 'lucide-react';

const PERSONAL_CATEGORIES = [
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

const BUSINESS_CATEGORIES = [
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

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'ESEWA', label: 'eSewa' },
  { value: 'KHALTI', label: 'Khalti' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CARD', label: 'Credit / Debit Card' },
  { value: 'OTHER', label: 'Other' },
];

export const ExpenseFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  expenseToEdit = null,
  defaultType = 'PERSONAL',
  currency = 'NPR',
}) => {
  const { showSuccess, showError } = useSnackbar();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(
    defaultType === 'BUSINESS' ? 'Utilities & Power' : 'Groceries & Food'
  );
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const isBusiness = defaultType === 'BUSINESS';
  const categoryOptions = isBusiness ? BUSINESS_CATEGORIES : PERSONAL_CATEGORIES;

  useEffect(() => {
    if (expenseToEdit) {
      setTitle(expenseToEdit.title || '');
      setAmount(expenseToEdit.amount ? String(expenseToEdit.amount) : '');
      setCategory(expenseToEdit.category || (isBusiness ? 'Utilities & Power' : 'Groceries & Food'));
      setPaymentMethod(expenseToEdit.paymentMethod || 'CASH');
      setDate(
        expenseToEdit.date
          ? new Date(expenseToEdit.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setReferenceNumber(expenseToEdit.referenceNumber || '');
      setNotes(expenseToEdit.notes || '');
    } else {
      setTitle('');
      setAmount('');
      setCategory(isBusiness ? 'Utilities & Power' : 'Groceries & Food');
      setPaymentMethod('CASH');
      setDate(new Date().toISOString().split('T')[0]);
      setReferenceNumber('');
      setNotes('');
    }
  }, [expenseToEdit, isBusiness, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      showError('Please enter an expense title or description');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showError('Please enter a valid expense amount greater than 0');
      return;
    }

    const cleanCategory = typeof category === 'object' && category !== null
      ? (category.target?.value ?? category.value ?? '')
      : String(category || '').trim();
    const cleanPaymentMethod = typeof paymentMethod === 'object' && paymentMethod !== null
      ? (paymentMethod.target?.value ?? paymentMethod.value ?? 'CASH')
      : String(paymentMethod || 'CASH').trim();

    if (!cleanCategory) {
      showError('Please select an expense category');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: title.trim(),
        amount: numAmount,
        currency,
        category: cleanCategory,
        paymentMethod: cleanPaymentMethod,
        date,
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim(),
        type: defaultType,
      };

      if (expenseToEdit) {
        await expenseService.updateExpense(expenseToEdit._id, payload);
        showSuccess('Expense updated successfully');
      } else {
        await expenseService.createExpense(payload);
        showSuccess(
          isBusiness
            ? 'Business expense recorded successfully'
            : 'Personal expense recorded successfully'
        );
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showError(err.message || 'Failed to save expense record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        expenseToEdit
          ? 'Edit Expense Entry'
          : isBusiness
          ? 'Record Business Expense'
          : 'Record Personal Expense'
      }
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner */}
        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                {isBusiness ? 'Operating Expense' : 'Personal Outflow'}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {isBusiness
                  ? 'Track costs and expenditures for your business'
                  : 'Log and organize your day-to-day spending'}
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
            {currency}
          </span>
        </div>

        {/* Title / Description */}
        <Input
          label="Expense Title / Description *"
          placeholder={isBusiness ? "e.g. Monthly Internet Bill, Office Coffee, Generator Fuel" : "e.g. Weekly Groceries, Electric Bill, Coffee"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        {/* Amount & Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={`Amount (${currency}) *`}
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            rightElement={
              <span className="text-xs font-bold text-zinc-400 font-mono pr-2">
                {currency}
              </span>
            }
          />

          <Input
            label="Date of Expense *"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Category & Payment Method Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-30">
          <Select
            label="Category *"
            id="expense-category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e?.target?.value ?? e)}
            options={categoryOptions}
            searchable
          />

          <Select
            label="Payment Method"
            id="expense-payment-method"
            name="paymentMethod"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e?.target?.value ?? e)}
            options={PAYMENT_METHODS}
          />
        </div>

        {/* Reference / Invoice Number */}
        <Input
          label="Receipt / Bill / Reference # (Optional)"
          placeholder="e.g. INV-2026-9041, Bill #42, Txn-891"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
        />

        {/* Notes / Remarks */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Additional Notes / Remarks (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any extra details, supplier info, or context..."
            className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 resize-none focus:outline-hidden focus:ring-1 focus:ring-zinc-600"
          />
        </div>

        {/* Modal Actions */}
        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-black/[0.05] dark:border-white/[0.08]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="w-full justify-center rounded-xl text-xs py-2.5 font-medium"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full justify-center rounded-xl text-xs py-2.5 font-medium shadow-xs"
          >
            {expenseToEdit ? 'Save Changes' : 'Record Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
