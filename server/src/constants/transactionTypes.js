export const TRANSACTION_TYPES = {
  PURCHASE: 'PURCHASE',               // Stock-In: Goods purchased from suppliers
  SALE: 'SALE',                       // Stock-Out: Goods sold to customers
  SALE_RETURN: 'SALE_RETURN',         // Stock-In: Customer returned items (restock & refund)
  PURCHASE_RETURN: 'PURCHASE_RETURN', // Stock-Out: Return items back to vendor (deduct stock)
  ADJUSTMENT: 'ADJUSTMENT',           // Stock correction
  RETURN: 'RETURN',                   // Generic return
};

export const TRANSACTION_TYPE_LIST = Object.values(TRANSACTION_TYPES);
