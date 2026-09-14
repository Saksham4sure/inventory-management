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
    return { label: 'Out of Stock', color: 'bg-red-100 text-red-700 border-red-200' };
  }
  if (currentStock <= minStockLevel) {
    return { label: 'Low Stock', color: 'bg-amber-100 text-amber-700 border-amber-200' };
  }
  return { label: 'In Stock', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
};
