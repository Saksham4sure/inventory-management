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
    return { label: 'Out of Stock', color: 'bg-rose-500/10 text-rose-700 border-rose-500/25 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40' };
  }
  if (currentStock <= minStockLevel) {
    return { label: 'Low Stock', color: 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40' };
  }
  return { label: 'In Stock', color: 'bg-[#DBFE80]/15 text-zinc-900 border-[#DBFE80]/35 dark:bg-[#DBFE80]/12 dark:text-[#DBFE80] dark:border-[#DBFE80]/25 font-medium' };
};
