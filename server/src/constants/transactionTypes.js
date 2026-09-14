export const TRANSACTION_TYPES = {
  PURCHASE: 'PURCHASE',       // Stock-In: Goods purchased from suppliers/vendors
  SALE: 'SALE',               // Stock-Out: Goods sold to customers
  ADJUSTMENT: 'ADJUSTMENT',   // Stock correction (inventory audit/damage/expiry)
  RETURN: 'RETURN',           // Stock return from customer or back to supplier
};

export const TRANSACTION_TYPE_LIST = Object.values(TRANSACTION_TYPES);
