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
  TrendingDown,
  TrendingUp,
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
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      },
      false
    );

    html5QrcodeScanner.render(
      (decodedText) => {
        lookupProduct(decodedText);
      },
      () => {
        // frame scanning callback - quiet
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

      const updatedStock =
        txnType === 'SALE'
          ? scannedProduct.currentStock - qty
          : scannedProduct.currentStock + qty;

      setScannedProduct((prev) => ({
        ...prev,
        currentStock: updatedStock,
      }));

      setSuccessMessage(
        `Processed ${txnType === 'SALE' ? 'Sale' : 'Purchase'}! Ref #${res.referenceNumber}. New stock: ${updatedStock} ${scannedProduct.unit}.`
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
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          QR Scanner & Stock Operations
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Scan QR shelf labels to verify counts and log instant sales or stock-in orders
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-1.5 p-1 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900 w-fit text-xs font-medium">
        <button
          type="button"
          onClick={() => setScanMode('camera')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
            scanMode === 'camera'
              ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          <Camera className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Camera Scanner
        </button>
        <button
          type="button"
          onClick={() => setScanMode('manual')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
            scanMode === 'manual'
              ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          <Keyboard className="h-3.5 w-3.5" /> Barcode Gun / Manual
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Scanner Card */}
        <div className="lg:col-span-6 space-y-3.5">
          <Card compact>
            {scanMode === 'camera' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    <ScanLine className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Position Label in Frame</span>
                  </div>
                  <Badge variant="accent" size="sm" dot>
                    Ready
                  </Badge>
                </div>

                <div
                  id="qr-reader-container"
                  className="rounded-xl overflow-hidden border border-zinc-200/90 dark:border-zinc-800 bg-zinc-100/40 dark:bg-zinc-950 min-h-[280px]"
                ></div>
                <p className="text-[11px] text-zinc-400 text-center">
                  Supports device webcam, phone back cameras, and screen scans
                </p>
              </div>
            ) : (
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <Keyboard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Enter Scanned Code or SKU</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. SCAN-101 or INV:biz:SCAN-101"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                    autoFocus
                  />
                  <Button type="submit" variant="primary" size="sm" loading={loadingLookup}>
                    Lookup
                  </Button>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Connect any USB/Bluetooth hardware barcode scanner or type manually
                </p>
              </form>
            )}
          </Card>

          {/* Status feedback */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50/80 border border-rose-200/80 p-3 text-xs text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50/80 border border-emerald-200/80 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Product Scanned Detail & Action */}
        <div className="lg:col-span-6">
          {scannedProduct ? (
            <Card compact className="border-zinc-300 dark:border-zinc-700">
              <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                <div>
                  <Badge variant="accent" size="sm" className="mb-1">
                    Scanned Active Item
                  </Badge>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {scannedProduct.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400 font-mono">
                    <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                      SKU: {scannedProduct.sku}
                    </span>
                    <span>{scannedProduct.category}</span>
                  </div>
                </div>

                {scannedProduct.qrCodeImage && (
                  <img
                    src={scannedProduct.qrCodeImage}
                    alt="QR"
                    className="h-14 w-14 rounded-lg border border-zinc-200 bg-white p-1"
                  />
                )}
              </div>

              {/* Current stock and prices strip */}
              <div className="grid grid-cols-3 gap-2 my-3.5">
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-850 p-2.5 border border-zinc-100 dark:border-zinc-800 text-center">
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">
                    Current Stock
                  </span>
                  <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {scannedProduct.currentStock} {scannedProduct.unit}
                  </span>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-850 p-2.5 border border-zinc-100 dark:border-zinc-800 text-center">
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">
                    Cost
                  </span>
                  <span className="text-base font-bold font-mono text-zinc-600 dark:text-zinc-400">
                    {formatCurrency(scannedProduct.costPrice, currency)}
                  </span>
                </div>
                <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 p-2.5 border border-emerald-100 dark:border-emerald-900/40 text-center">
                  <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                    Sale Price
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(scannedProduct.sellingPrice, currency)}
                  </span>
                </div>
              </div>

              {/* Action Form */}
              <form onSubmit={handleProcessTransaction} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium tracking-wide uppercase text-zinc-400 mb-1">
                    Action Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTxnType('SALE')}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        txnType === 'SALE'
                          ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800'
                      }`}
                    >
                      <TrendingDown className="h-3.5 w-3.5 text-emerald-400" /> Sale (Stock-Out)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxnType('PURCHASE')}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        txnType === 'PURCHASE'
                          ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800'
                      }`}
                    >
                      <TrendingUp className="h-3.5 w-3.5 text-blue-400" /> Purchase (Stock-In)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium tracking-wide uppercase text-zinc-400 mb-1">
                      Qty ({scannedProduct.unit})
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium tracking-wide uppercase text-zinc-400 mb-1">
                      Price ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium tracking-wide uppercase text-zinc-400 mb-1">
                      Payment
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card / POS</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <span className="text-[10px] text-zinc-400 uppercase font-medium">Subtotal</span>
                    <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(Number(quantity || 0) * Number(customPrice || 0), currency)}
                    </span>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Transaction note (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  loading={processingTxn}
                  className="w-full py-2.5 font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {txnType === 'SALE' ? 'Execute Sale & Deduct Stock' : 'Execute Purchase & Replenish Stock'}
                </Button>
              </form>
            </Card>
          ) : (
            <Card
              compact
              className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center text-zinc-400 border-dashed"
            >
              <ScanLine className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-2.5" />
              <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Awaiting Product Scan
              </h4>
              <p className="text-xs text-zinc-400 max-w-xs mt-1">
                Scan a product QR code label or enter an SKU on the left to pull up live inventory
                records and process stock movements.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
export default QRScanPage;
