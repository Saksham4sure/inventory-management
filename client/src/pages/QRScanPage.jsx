import { useState, useEffect, useRef, useMemo } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { productService } from '../services/productService';
import { transactionService } from '../services/transactionService';
import { useBusiness } from '../hooks/useBusiness';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  ScanLine,
  Camera,
  Calculator,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Receipt,
  RotateCcw,
  Sparkles,
  Package,
} from 'lucide-react';

export const QRScanPage = () => {
  const { business } = useBusiness();
  const currency = business?.currency || 'USD';

  // Transaction Mode: SALE or PURCHASE
  const [txnType, setTxnType] = useState('SALE'); // 'SALE' or 'PURCHASE'

  // Input Method: 'qr' or 'manual'
  const [inputMethod, setInputMethod] = useState('qr');

  // Products catalog for fast manual selection & QR matching
  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Stacked Cart items: array of { product, quantity, unitPrice }
  const [cart, setCart] = useState([]);

  // General state
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedTxn, setCompletedTxn] = useState(null);

  // Transaction options
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  // Scanner ref & throttling
  const scannerRef = useRef(null);
  const lastScannedTime = useRef({});

  // Manual & Calculator state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [calcDisplay, setCalcDisplay] = useState('1');
  const [calcTarget, setCalcTarget] = useState('qty'); // 'qty' or 'price'
  const [manualQty, setManualQty] = useState(1);
  const [manualPrice, setManualPrice] = useState('');

  // Fetch all products once
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoadingProducts(true);
        const data = await productService.getProducts({ limit: 200 });
        setAllProducts(data.products || []);
        if (data.products?.length > 0) {
          setSelectedProductId(data.products[0]._id);
          setManualPrice(
            txnType === 'SALE' ? data.products[0].sellingPrice : data.products[0].costPrice
          );
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchCatalog();
  }, []);

  // Sync manual price when product or txnType changes
  useEffect(() => {
    const prod = allProducts.find((p) => p._id === selectedProductId);
    if (prod) {
      setManualPrice(txnType === 'SALE' ? prod.sellingPrice : prod.costPrice);
    }
  }, [selectedProductId, txnType, allProducts]);

  // Haptic feedback & sound
  const triggerScanFeedback = (productName) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 30, 40]);
      } catch {
        // quiet ignore
      }
    }
    setToastMessage(`Added +1 "${productName}" to stack`);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Add or increment item in stacked cart
  const addItemToCart = (product, addQty = 1, priceOverride = null) => {
    const unitPrice =
      priceOverride !== null && !isNaN(Number(priceOverride))
        ? Number(priceOverride)
        : txnType === 'SALE'
        ? product.sellingPrice
        : product.costPrice;

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product._id === product._id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + addQty;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          unitPrice,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            quantity: addQty,
            unitPrice,
          },
        ];
      }
    });

    triggerScanFeedback(product.name);
  };

  // QR Scanning Engine
  const handleQRDetected = async (rawCode) => {
    if (!rawCode) return;
    const now = Date.now();
    // Debounce duplicate scans of same code within 1.8 seconds
    if (lastScannedTime.current[rawCode] && now - lastScannedTime.current[rawCode] < 1800) {
      return;
    }
    lastScannedTime.current[rawCode] = now;

    try {
      const product = await productService.getProductByQR(rawCode);
      addItemToCart(product, 1);
      setError('');
    } catch (err) {
      setError(err.message || `Unrecognized QR tag: "${rawCode}"`);
      setTimeout(() => setError(''), 4000);
    }
  };

  // Mount html5-qrcode scanner when in 'qr' tab
  useEffect(() => {
    if (inputMethod !== 'qr') {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    const scannerId = 'mobile-qr-reader';
    const scanner = new Html5QrcodeScanner(
      scannerId,
      {
        fps: 12,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      },
      false
    );

    scanner.render(handleQRDetected, () => {});
    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [inputMethod, txnType]);

  // Calculator Logic
  const handleCalcButton = (val) => {
    if (val === 'C') {
      setCalcDisplay('0');
      if (calcTarget === 'qty') setManualQty(1);
      return;
    }

    if (val === '⌫') {
      const trimmed = calcDisplay.length > 1 ? calcDisplay.slice(0, -1) : '0';
      setCalcDisplay(trimmed);
      syncCalcToTarget(trimmed);
      return;
    }

    // Evaluate on '='
    if (val === '=') {
      try {
        // Safe evaluation of simple math expressions (+, -, *, /)
        const sanitized = calcDisplay.replace(/×/g, '*').replace(/÷/g, '/');
        const evaluated = Function(`'use strict'; return (${sanitized})`)();
        const resultStr = String(Math.round(evaluated * 100) / 100);
        setCalcDisplay(resultStr);
        syncCalcToTarget(resultStr);
      } catch {
        // ignore syntax error in calculator
      }
      return;
    }

    // Append number or operator
    let nextStr = calcDisplay === '0' && !isNaN(val) ? String(val) : calcDisplay + val;
    setCalcDisplay(nextStr);
    syncCalcToTarget(nextStr);
  };

  const syncCalcToTarget = (strVal) => {
    try {
      const sanitized = strVal.replace(/×/g, '*').replace(/÷/g, '/');
      const val = Function(`'use strict'; return (${sanitized})`)();
      if (!isNaN(val) && val >= 0) {
        if (calcTarget === 'qty') {
          setManualQty(Math.max(1, Math.floor(val)));
        } else {
          setManualPrice(val);
        }
      }
    } catch {
      // mid-expression, do not update yet
    }
  };

  const handleAddManualItem = () => {
    const product = allProducts.find((p) => p._id === selectedProductId);
    if (!product) {
      setError('Please select a product');
      return;
    }

    const qty = Number(manualQty);
    if (qty <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    addItemToCart(product, qty, Number(manualPrice));
    setError('');
  };

  // Cart Management
  const updateCartQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product._id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeCartItem = (productId) => {
    setCart((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Totals calculation
  const totals = useMemo(() => {
    let totalItems = 0;
    let totalAmount = 0;
    for (const item of cart) {
      totalItems += item.quantity;
      totalAmount += item.quantity * item.unitPrice;
    }
    return { totalItems, totalAmount, linesCount: cart.length };
  }, [cart]);

  // Submit stacked transaction at once
  const handleCompleteTransaction = async () => {
    if (cart.length === 0) {
      setError('Your stack is empty. Scan QR or add manual items before completing.');
      return;
    }

    // Pre-validate stock for sales
    if (txnType === 'SALE') {
      for (const item of cart) {
        if (item.product.currentStock < item.quantity) {
          setError(
            `Insufficient stock for "${item.product.name}". Available: ${item.product.currentStock} ${item.product.unit}, in stack: ${item.quantity}`
          );
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        type: txnType,
        items: cart.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        paymentMethod,
        notes: notes.trim(),
        scannedViaQR: inputMethod === 'qr',
      };

      const result = await transactionService.createTransaction(payload);
      setCompletedTxn(result);
      setCart([]);
      setNotes('');
    } catch (err) {
      setError(err.message || 'Failed to complete transaction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Bar: Title & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              QR POS & Multi-Stack Register
            </h1>
            <Badge variant={txnType === 'SALE' ? 'accent' : 'default'} dot>
              {txnType === 'SALE' ? 'Sales Mode' : 'Purchase Mode'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Scan multiple products or use manual calculator to stack items and record at once
          </p>
        </div>

        {/* Transaction Mode Selector: Sale vs Purchase */}
        <div className="inline-flex rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900 p-1">
          <button
            type="button"
            onClick={() => setTxnType('SALE')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              txnType === 'SALE'
                ? 'bg-white text-emerald-700 shadow-xs dark:bg-zinc-800 dark:text-emerald-400'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" /> Sale (Stock-Out)
          </button>
          <button
            type="button"
            onClick={() => setTxnType('PURCHASE')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              txnType === 'PURCHASE'
                ? 'bg-white text-blue-700 shadow-xs dark:bg-zinc-800 dark:text-blue-400'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" /> Purchase (Stock-In)
          </button>
        </div>
      </div>

      {/* Notifications / Feedback */}
      {toastMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs text-emerald-800 dark:text-emerald-300 font-medium animate-in fade-in slide-in-from-top-2">
          <Sparkles className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50/80 border border-rose-200/80 p-3 text-xs text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Input Column (QR or Manual + Calc) & Stacked Cart Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Input Selection (QR / Manual Calculator) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Sub-tab pills: QR vs Manual Calculator */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setInputMethod('qr')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                inputMethod === 'qr'
                  ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
              }`}
            >
              <Camera className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Camera QR Scanner</span>
            </button>

            <button
              type="button"
              onClick={() => setInputMethod('manual')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                inputMethod === 'manual'
                  ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
              }`}
            >
              <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Manual + Calculator</span>
            </button>
          </div>

          {/* Tab Content A: QR Scanner */}
          {inputMethod === 'qr' && (
            <Card compact className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <ScanLine className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Continuous Multi-QR Scanner</span>
                </div>
                <Badge variant="accent" size="sm" dot>
                  Scanning Live
                </Badge>
              </div>

              <div
                id="mobile-qr-reader"
                className="rounded-xl overflow-hidden border border-zinc-200/90 dark:border-zinc-800 bg-zinc-100/40 dark:bg-zinc-950 min-h-[260px]"
              ></div>

              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-850 p-2.5 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                <span>Scan labels one by one. Items automatically stack in the cart.</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                  {cart.length} items
                </span>
              </div>
            </Card>
          )}

          {/* Tab Content B: Manual Selector + Embedded Calculator */}
          {inputMethod === 'manual' && (
            <Card compact className="space-y-3.5">
              {/* Product Selector */}
              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-zinc-400 mb-1">
                  Select Product Item
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                >
                  {allProducts.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.sku}) — Stock: {p.currentStock} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target & Value display */}
              <div className="grid grid-cols-2 gap-2">
                <div
                  onClick={() => {
                    setCalcTarget('qty');
                    setCalcDisplay(String(manualQty));
                  }}
                  className={`p-2 rounded-lg border cursor-pointer transition-all ${
                    calcTarget === 'qty'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <span className="text-[10px] uppercase font-semibold block">Quantity Target</span>
                  <span className="text-base font-bold font-mono">{manualQty}</span>
                </div>

                <div
                  onClick={() => {
                    setCalcTarget('price');
                    setCalcDisplay(String(manualPrice || '0'));
                  }}
                  className={`p-2 rounded-lg border cursor-pointer transition-all ${
                    calcTarget === 'price'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <span className="text-[10px] uppercase font-semibold block">Unit Price Target</span>
                  <span className="text-base font-bold font-mono">
                    {formatCurrency(manualPrice || 0, currency)}
                  </span>
                </div>
              </div>

              {/* Calculator Keypad */}
              <div className="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900 p-2.5 space-y-2">
                {/* Calculator Screen */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] uppercase font-semibold text-zinc-400">
                    Input for {calcTarget === 'qty' ? 'Quantity' : 'Unit Price'}:
                  </span>
                  <span className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {calcDisplay}
                  </span>
                </div>

                {/* Keypad Buttons Grid */}
                <div className="grid grid-cols-4 gap-1.5 text-sm font-semibold">
                  {['7', '8', '9', '÷'].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => handleCalcButton(btn)}
                      className="py-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 active:scale-95 transition-all"
                    >
                      {btn}
                    </button>
                  ))}
                  {['4', '5', '6', '×'].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => handleCalcButton(btn)}
                      className="py-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 active:scale-95 transition-all"
                    >
                      {btn}
                    </button>
                  ))}
                  {['1', '2', '3', '-'].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => handleCalcButton(btn)}
                      className="py-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 active:scale-95 transition-all"
                    >
                      {btn}
                    </button>
                  ))}
                  {['C', '0', '.', '+'].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => handleCalcButton(btn)}
                      className={`py-2.5 rounded-lg border active:scale-95 transition-all ${
                        btn === 'C'
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
                          : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      {btn}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCalcButton('⌫')}
                    className="py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-300 active:scale-95"
                  >
                    Backspace ⌫
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCalcButton('=')}
                    className="py-2 rounded-lg bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950 text-xs font-semibold hover:bg-emerald-500 active:scale-95"
                  >
                    Calculate =
                  </button>
                </div>
              </div>

              {/* Add to Stack Button */}
              <Button
                variant="primary"
                size="md"
                onClick={handleAddManualItem}
                className="w-full py-2.5"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Item to Stack ({manualQty}x @ {formatCurrency(manualPrice || 0, currency)})
              </Button>
            </Card>
          )}
        </div>

        {/* Right: Stacked Cart / Complete at Once */}
        <div className="lg:col-span-6 space-y-4">
          <Card compact className="flex flex-col justify-between h-full">
            <div>
              {/* Stack Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Stacked Register Cart
                    </h3>
                    <span className="text-[11px] text-zinc-400">
                      {totals.linesCount} line {totals.linesCount === 1 ? 'item' : 'items'} •{' '}
                      {totals.totalItems} total pcs
                    </span>
                  </div>
                </div>

                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 my-2 max-h-[340px] overflow-y-auto pr-1">
                {cart.length > 0 ? (
                  cart.map((item) => {
                    const subtotal = item.quantity * item.unitPrice;
                    return (
                      <div
                        key={item.product._id}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {item.product.name}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                            <span>{item.product.sku}</span>
                            <span>•</span>
                            <span>{formatCurrency(item.unitPrice, currency)} / ea</span>
                            <span>•</span>
                            <span className="text-zinc-500">
                              Avail: {item.product.currentStock}
                            </span>
                          </div>
                        </div>

                        {/* Stepper buttons & subtotal */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center border border-zinc-200 dark:border-zinc-750 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-850">
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.product._id, -1)}
                              className="px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-2 font-bold font-mono text-zinc-900 dark:text-zinc-100">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.product._id, 1)}
                              className="px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100 min-w-[65px] text-right">
                            {formatCurrency(subtotal, currency)}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeCartItem(item.product._id)}
                            className="p-1 text-zinc-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-zinc-400 dark:text-zinc-500">
                    <Package className="h-8 w-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                    <p className="text-xs font-medium">Cart is currently empty</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Scan QR labels or add items with the manual calculator on the left
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Cart Footer: Summary & Complete Action */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-3">
              {/* Payment & Notes */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium uppercase text-zinc-400 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card / POS</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium uppercase text-zinc-400 mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Counter sale #104"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Total Row */}
              <div className="flex items-baseline justify-between py-1">
                <div>
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Total Due
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    {totals.totalItems} pcs in stack
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(totals.totalAmount, currency)}
                </div>
              </div>

              {/* Complete Transaction at once */}
              <Button
                variant="primary"
                size="lg"
                loading={submitting}
                disabled={cart.length === 0}
                onClick={handleCompleteTransaction}
                className="w-full py-3 text-sm font-bold shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {txnType === 'SALE'
                  ? `Record Sale at Once (${formatCurrency(totals.totalAmount, currency)})`
                  : `Record Purchase at Once (${formatCurrency(totals.totalAmount, currency)})`}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Success Receipt Modal */}
      <Modal
        isOpen={Boolean(completedTxn)}
        onClose={() => setCompletedTxn(null)}
        title="Transaction Completed"
        maxWidth="max-w-md"
      >
        {completedTxn && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <div className="h-11 w-11 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {completedTxn.type === 'SALE' ? 'Sale Recorded' : 'Purchase Recorded'}
              </h4>
              <p className="text-xs font-mono font-bold text-zinc-500 mt-0.5">
                Ref #{completedTxn.referenceNumber}
              </p>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/60 dark:bg-zinc-850/60 space-y-2 max-h-48 overflow-y-auto">
              {completedTxn.items?.map((it, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {it.quantity}x {it.productName}
                  </span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(it.subtotal, currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-sm font-bold border-t border-zinc-100 dark:border-zinc-800 pt-2">
              <span>Grand Total:</span>
              <span className="font-mono text-base text-emerald-600 dark:text-emerald-400">
                {formatCurrency(completedTxn.totalAmount, currency)}
              </span>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => setCompletedTxn(null)}
            >
              Start New Order / Scan
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default QRScanPage;
