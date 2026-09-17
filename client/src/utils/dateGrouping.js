export const DATE_FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom' },
];

export const getDateFilterBounds = (filterId, customStart, customEnd) => {
  const now = new Date();

  if (filterId === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  if (filterId === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
    const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  if (filterId === 'week') {
    const start = new Date(now);
    const day = now.getDay(); // 0 is Sunday
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  if (filterId === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  if (filterId === 'custom' && (customStart || customEnd)) {
    let start = null;
    let end = null;
    if (customStart) {
      const parts = customStart.split('-').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        const s = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
        start = s.toISOString();
      } else {
        const s = new Date(customStart);
        s.setHours(0, 0, 0, 0);
        start = s.toISOString();
      }
    }
    if (customEnd) {
      const parts = customEnd.split('-').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        const e = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
        end = e.toISOString();
      } else {
        const e = new Date(customEnd);
        e.setHours(23, 59, 59, 999);
        end = e.toISOString();
      }
    }
    return { startDate: start, endDate: end };
  }

  return { startDate: null, endDate: null };
};

export const formatDateOnly = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return `${datePart} at ${timePart}`;
};

export const formatTimeOnly = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

export const groupTransactionsByDate = (transactions = []) => {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const yDate = new Date(now);
  yDate.setDate(now.getDate() - 1);
  const yesterdayKey = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, '0')}-${String(yDate.getDate()).padStart(2, '0')}`;

  const groupsMap = new Map();

  for (const txn of transactions) {
    const d = new Date(txn.createdAt);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (!groupsMap.has(dateKey)) {
      let label;
      let subLabel;

      if (dateKey === todayKey) {
        label = 'Today';
        subLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(d);
      } else if (dateKey === yesterdayKey) {
        label = 'Yesterday';
        subLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(d);
      } else {
        label = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(d);
        subLabel = '';
      }

      groupsMap.set(dateKey, {
        dateKey,
        label,
        subLabel,
        rawDate: d,
        transactions: [],
        summary: {
          count: 0,
          totalQty: 0,
          netAmount: 0,
          primaryCount: 0,
          primaryAmount: 0,
          returnsCount: 0,
          returnsAmount: 0,
        },
      });
    }

    const group = groupsMap.get(dateKey);
    group.transactions.push(txn);

    const isReturn = txn.type === 'SALE_RETURN' || txn.type === 'PURCHASE_RETURN';
    const amount = Number(txn.totalAmount) || 0;
    const qty = (txn.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

    group.summary.count += 1;
    group.summary.totalQty += qty;

    if (isReturn) {
      group.summary.returnsCount += 1;
      group.summary.returnsAmount += amount;
      group.summary.netAmount -= amount;
    } else {
      group.summary.primaryCount += 1;
      group.summary.primaryAmount += amount;
      group.summary.netAmount += amount;
    }
  }

  // Sort groups descending by date
  return Array.from(groupsMap.values()).sort((a, b) => b.rawDate - a.rawDate);
};

export const calculateSummary = (transactions = []) => {
  let count = 0;
  let totalQty = 0;
  let primaryCount = 0;
  let primaryAmount = 0;
  let returnsCount = 0;
  let returnsAmount = 0;

  for (const txn of transactions) {
    const isReturn = txn.type === 'SALE_RETURN' || txn.type === 'PURCHASE_RETURN';
    const amount = Number(txn.totalAmount) || 0;
    const qty = (txn.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

    count += 1;
    totalQty += qty;

    if (isReturn) {
      returnsCount += 1;
      returnsAmount += amount;
    } else {
      primaryCount += 1;
      primaryAmount += amount;
    }
  }

  return {
    count,
    totalQty,
    primaryCount,
    primaryAmount,
    returnsCount,
    returnsAmount,
    netAmount: primaryAmount - returnsAmount,
  };
};
