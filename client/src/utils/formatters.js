export const formatCurrency = (amount, currency = 'USD') => {
  const numeric = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(numeric);
};

export const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatStockBadge = (currentStock, minStockLevel) => {
  if (currentStock <= 0) {
    return { label: 'Out of Stock', color: 'bg-rose-500/10 text-rose-700 border-rose-500/25 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40 font-medium' };
  }
  if (currentStock <= minStockLevel) {
    return { label: 'Low Stock', color: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 font-medium' };
  }
  return { label: 'In Stock', color: 'bg-zinc-100 text-zinc-700 border-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60 font-medium' };
};

export const formatPaymentMethod = (method) => {
  if (!method) return 'Cash';
  const m = String(method).toUpperCase();
  if (m === 'CASH') return 'Cash';
  if (m === 'BANK_TRANSFER') return 'Bank Transfer';
  if (m === 'ONLINE' || m === 'ONLINE_PAYMENT') return 'Online Payment';
  if (m === 'CREDIT') return 'Credit';
  return method;
};

