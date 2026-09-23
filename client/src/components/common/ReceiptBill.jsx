import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Printer } from 'lucide-react';
import { Button } from '../ui/Button';

const ReceiptBill = ({ transaction, business, currency }) => {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const isSale = transaction.type === 'SALE' || transaction.type === 'SALE_RETURN';
  const isReturn = transaction.type === 'SALE_RETURN' || transaction.type === 'PURCHASE_RETURN';
  
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex justify-end print-hide">
        <Button variant="secondary" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print / Save PDF
        </Button>
      </div>
      
      <div id="printable-receipt" className="bg-white text-black p-6 rounded-lg border border-zinc-200 shadow-sm max-w-md mx-auto w-full">
        {/* Header */}
        <div className="text-center border-b border-zinc-200 pb-4 mb-4">
          <h2 className="text-xl font-bold uppercase tracking-widest text-black">
            {business?.name || 'STORE'}
          </h2>
          {business?.phone && <p className="text-sm text-zinc-600">Phone: {business.phone}</p>}
          <h3 className="text-lg font-bold mt-2">
            {isSale ? (isReturn ? 'RETURN RECEIPT' : 'SALES RECEIPT') : (isReturn ? 'PURCHASE RETURN' : 'PURCHASE RECEIPT')}
          </h3>
        </div>

        {/* Info */}
        <div className="flex justify-between text-sm mb-4 text-zinc-800">
          <div>
            <p><span className="font-semibold">Ref:</span> {transaction.referenceNumber}</p>
            <p><span className="font-semibold">Date:</span> {formatDate(transaction.createdAt)}</p>
          </div>
          {transaction.partyId?.name && (
            <div className="text-right">
              <p className="font-semibold">{isSale ? 'Customer:' : 'Supplier:'}</p>
              <p>{transaction.partyId.name}</p>
            </div>
          )}
        </div>

        {/* Items */}
        <table className="w-full text-sm mb-4 border-t border-b border-zinc-200">
          <thead>
            <tr className="border-b border-zinc-200 text-left">
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Price</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {transaction.items?.map((it, i) => (
              <tr key={i} className="border-b border-zinc-100 last:border-0">
                <td className="py-2">{it.productName}</td>
                <td className="py-2 text-right">{it.quantity}</td>
                <td className="py-2 text-right">{formatCurrency(it.unitPrice, currency)}</td>
                <td className="py-2 text-right">{formatCurrency(it.subtotal, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end text-sm mb-6">
          <div className="w-1/2">
            <div className="flex justify-between font-bold text-base border-t-2 border-zinc-900 pt-1">
              <span>TOTAL</span>
              <span>
                {isReturn ? '-' : ''}{formatCurrency(transaction.totalAmount, currency)}
              </span>
            </div>
          </div>
        </div>

        {transaction.notes && (
          <div className="text-xs text-zinc-600 italic mb-4">
            <p>Notes: {transaction.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-zinc-500 mt-8 pt-4 border-t border-zinc-200 border-dashed">
          <p>Thank you for your business!</p>
        </div>
      </div>
    </div>
  );
};

export default ReceiptBill;
