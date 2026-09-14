import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { productService } from '../services/productService';
import { transactionService } from '../services/transactionService';
import { useBusiness } from '../hooks/useBusiness';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../utils/formatters';
import {
  ScanLine,
  Camera,
  Keyboard,
  CheckCircle2,
  AlertTriangle,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Tag,
} from 'lucide-react';

export const QRScanPage = () => {
  const { business } = useBusiness();
  const currency = business?.currency || 'USD';

  const [scanMode, setScanMode] = useState('camera'); // 'camera' or 'manual'
  const [manualCode, setManualCode] = useState('');
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Transaction form states
  const [txnType, setTxnType] = useState('SALE'); // 'SALE' or 'PURCHASE'
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [processingTxn, setProcessingTxn] = useState(false);

  const scannerRef = useRef(null);
  const isScannerRunning = useRef(false);

  const lookupProduct = async (rawCode) => {
    if (!rawCode || !rawCode.trim()) return;
    try {
      setLoadingLookup(true);
      setError('');
      setSuccessMessage('');
      const product = await productService.getProductByQR(rawCode.trim());
      setScannedProduct(product);
      setQuantity(1);
      setCustomPrice(txnType === 'SALE' ? product.sellingPrice : product.costPrice);
    } catch (err) {
      setError(err.message || 'Product not found with this QR or SKU code');
      setScannedProduct(null);
    } finally {
      setLoadingLookup(false);
    }
  };

  // Setup html5-qrcode camera scanner
  useEffect(() => {
    if (scanMode !== 'camera') {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    const scannerId = 'qr-reader-container';
    const html5QrcodeScanner = new Html5QrcodeScanner(
      scannerId,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );

    html5QrcodeScanner.render(
      (decodedText) => {
        lookupProduct(decodedText);
      },
      () => {
        // scan failure / scanning frame - ignore to avoid spamming
      }
    );

    scannerRef.current = html5QrcodeScanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [scanMode]);

  // Update custom price when transaction type changes
  useEffect(() => {
    if (scannedProduct) {
      setCustomPrice(txnType === 'SALE' ? scannedProduct.sellingPrice : scannedProduct.costPrice);
    }
  }, [txnType, scannedProduct]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    lookupProduct(manualCode);
  };

  const handleProcessTransaction = async (e) => {
    e.preventDefault();
    if (!scannedProduct) return;

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError('Please enter a valid quantity greater than 0');
      return;
    }

    if (txnType === 'SALE' && scannedProduct.currentStock < qty) {
      setError(
        `Insufficient stock: Only ${scannedProduct.currentStock} ${scannedProduct.unit} available.`
      );
      return;
    }

    try {
      setProcessingTxn(true);
      setError('');
      const unitPrice = customPrice !== '' ? Number(customPrice) : scannedProduct.sellingPrice;

      const res = await transactionService.createTransaction({
        type: txnType,
        items: [
          {
            productId: scannedProduct._id,
            quantity: qty,
            unitPrice,
          },
        ],
        paymentMethod,
        notes: notes.trim(),
        scannedViaQR: true,
      });

      // Update local product stock
      const updatedStock =
        txnType === 'SALE'
          ? scannedProduct.currentStock - qty
          : scannedProduct.currentStock + qty;

      setScannedProduct((prev) => ({
        ...prev,
        currentStock: updatedStock,
      }));

      setSuccessMessage(
        `Successfully processed ${txnType === 'SALE' ? 'Sale' : 'Purchase'}! Ref #${res.referenceNumber}. Stock updated to ${updatedStock} ${scannedProduct.unit}.`
      );
      setQuantity(1);
      setNotes('');
    } catch (err) {
      setError(err.message || 'Transaction processing failed');
    } finally {
      setProcessingTxn(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          QR Scanner & Stock Tracker
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Scan QR labels to instantly record sales, receive purchases, or check live stock counts
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setScanMode('camera')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            scanMode === 'camera'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Camera className="h-4 w-4" /> Live Camera Scanner
        </button>
        <button
          type="button"
          onClick={() => setScanMode('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            scanMode === 'manual'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Keyboard className="h-4 w-4" /> Barcode Gun / Manual Input
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scanner Column */}
        <div className="lg:col-span-6 space-y-4">
          <Card>
            {scanMode === 'camera' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <ScanLine className="h-4 w-4 text-indigo-600" />
                    <span>Point Camera at Product QR</span>
                  </div>
                  <Badge variant="primary">Active</Badge>
                </div>

                <div
                  id="qr-reader-container"
                  className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 min-h-[300px]"
                ></div>
                <p className="text-xs text-slate-400 text-center">
                  Position the QR label within the scanner box
                </p>
              </div>
            ) : (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Keyboard className="h-4 w-4 text-indigo-600" />
                  <span>Enter QR Payload, SKU, or Barcode</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. SCAN-001 or INV:biz:SCAN-001"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  <Button type="submit" variant="primary" loading={loadingLookup}>
                    Lookup
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  Compatible with handheld USB/Bluetooth barcode guns or manual keyboard entry
                </p>
              </form>
            )}
          </Card>

          {/* Status feedback */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Product Details & Action Column */}
        <div className="lg:col-span-6">
          {scannedProduct ? (
            <Card className="border-indigo-100 shadow-md">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <Badge variant="primary" className="mb-1">
                    Scanned Product
                  </Badge>
                  <h3 className="text-xl font-bold text-slate-900">{scannedProduct.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-mono">
                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      SKU: {scannedProduct.sku}
                    </span>
                    <span>Category: {scannedProduct.category}</span>
                  </div>
                </div>

                {scannedProduct.qrCodeImage && (
                  <img
                    src={scannedProduct.qrCodeImage}
                    alt="QR"
                    className="h-16 w-16 rounded-lg border border-slate-200 bg-white p-1"
                  />
                )}
              </div>

              {/* Stock and Price highlight cards */}
              <div className="grid grid-cols-3 gap-3 my-4">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-center">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Current Stock</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">
                    {scannedProduct.currentStock} {scannedProduct.unit}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-center">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Cost Price</p>
                  <p className="text-lg font-black text-slate-700 mt-0.5">
                    {formatCurrency(scannedProduct.costPrice, currency)}
                  </p>
                </div>
                <div className="rounded-xl bg-indigo-50/70 p-3 border border-indigo-100 text-center">
                  <p className="text-[11px] font-semibold text-indigo-500 uppercase">Selling Price</p>
                  <p className="text-lg font-black text-indigo-700 mt-0.5">
                    {formatCurrency(scannedProduct.sellingPrice, currency)}
                  </p>
                </div>
              </div>

              {/* Action Form: SALE vs PURCHASE */}
              <form onSubmit={handleProcessTransaction} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Operation Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTxnType('SALE')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        txnType === 'SALE'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <TrendingDown className="h-4 w-4" /> Sale (Stock-Out)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxnType('PURCHASE')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        txnType === 'PURCHASE'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <TrendingUp className="h-4 w-4" /> Purchase (Stock-In)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Quantity ({scannedProduct.unit})
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Unit Price ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card / POS</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <span className="text-xs text-slate-400 font-semibold uppercase">
                      Total Transaction
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      {formatCurrency(Number(quantity || 0) * Number(customPrice || 0), currency)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Counter sale or Vendor restock batch"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <Button
                  type="submit"
                  variant={txnType === 'SALE' ? 'success' : 'primary'}
                  loading={processingTxn}
                  className="w-full py-2.5 text-base font-bold shadow-md"
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {txnType === 'SALE' ? 'Confirm Sale & Deduct Stock' : 'Confirm Purchase & Add Stock'}
                </Button>
              </form>
            </Card>
          ) : (
            <Card className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400 border-dashed">
              <ScanLine className="h-12 w-12 text-slate-300 mb-3" />
              <h4 className="text-base font-semibold text-slate-700">No Product Scanned Yet</h4>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Point your device camera at a product QR code or enter an SKU on the left to pull up
                its live inventory record.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
export default QRScanPage;
