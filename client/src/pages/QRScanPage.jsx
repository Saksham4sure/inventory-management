import { useState, useEffect, useRef, useMemo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { productService } from '../services/productService';
import { transactionService } from '../services/transactionService';
import { useBusiness } from '../hooks/useBusiness';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { formatCurrency } from '../utils/formatters';
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
  RotateCcw,
  Package,
  Upload,
  X,
  RefreshCw,
} from 'lucide-react';

export const QRScanPage = () => {
  const { business } = useBusiness();
  const currency = business?.currency || 'USD';

  // Transaction Mode: SALE or PURCHASE
  const [txnType, setTxnType] = useState('SALE');

  // Input Method: 'qr' or 'manual'
  const [inputMethod, setInputMethod] = useState('qr');

  // Stacked Cart items: each item is { cartId, isManual, product, productName, sku, quantity, unitPrice }
  const [cart, setCart] = useState([]);

  // Notifications & State
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState(null); // { id, title, subtitle }
  const [submitting, setSubmitting] = useState(false);
  const [completedTxn, setCompletedTxn] = useState(null);
  const [scanFlash, setScanFlash] = useState(false);
  const [isScanningFile, setIsScanningFile] = useState(false);
  const [scannedPill, setScannedPill] = useState(null); // { name, code }

  // Transaction options
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  // Scanner refs & anti-loop controls
  const qrCodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const isProcessingRef = useRef(false);
  const lastScannedCodeRef = useRef(null);
  const lastScannedCooldownTimer = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  // Manual Calculator state
  const [manualItemName, setManualItemName] = useState('');
  const [manualAmount, setManualAmount] = useState('0');
  const [manualQty, setManualQty] = useState(1);
  const [calcTarget, setCalcTarget] = useState('amount'); // 'amount' | 'qty'

  // Auto-dismiss snackbar after 3.5 seconds
  useEffect(() => {
    if (!snackbar) return;
    const timer = setTimeout(() => {
      setSnackbar(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [snackbar]);

  // Trigger sensory feedback (vibration + viewfinder flash + snackbar)
  const showSuccessSnackbar = (itemName, qty, price) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 30, 40]);
      } catch {
        // silent
      }
    }
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 500);

    const subtotal = qty * price;
    setSnackbar({
      id: Date.now(),
      title: `Added "${itemName}" to stack`,
      subtitle: `+${qty} pcs @ ${formatCurrency(price, currency)} • Item total: ${formatCurrency(subtotal, currency)}`,
    });
  };

  // Add QR Catalog Product to cart
  const addProductToCart = (product, addQty = 1) => {
    const unitPrice =
      txnType === 'SALE' ? product.sellingPrice : product.costPrice;

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => !item.isManual && item.product?._id === product._id
      );
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
            cartId: `prod-${product._id}`,
            isManual: false,
            product,
            productName: product.name,
            sku: product.sku,
            quantity: addQty,
            unitPrice,
          },
        ];
      }
    });

    showSuccessSnackbar(product.name, addQty, unitPrice);
  };

  // Add Manual / Non-Catalog Item to cart
  const addManualItemToCart = () => {
    let finalPrice = 0;
    try {
      const sanitized = String(manualAmount).replace(/×/g, '*').replace(/÷/g, '/');
      const evaluated = Function(`'use strict'; return (${sanitized})`)();
      if (!isNaN(evaluated) && evaluated >= 0) {
        finalPrice = Math.round(evaluated * 100) / 100;
      }
    } catch {
      finalPrice = Number(manualAmount) || 0;
    }

    if (finalPrice <= 0) {
      setError('Please calculate or enter an amount greater than 0');
      return;
    }

    const qty = Math.max(1, Number(manualQty) || 1);
    const cleanName =
      manualItemName.trim() ||
      (txnType === 'SALE' ? 'General Sale Item' : 'General Purchase Item');

    const newItem = {
      cartId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isManual: true,
      product: null,
      productName: cleanName,
      sku: 'MANUAL',
      quantity: qty,
      unitPrice: finalPrice,
    };

    setCart((prev) => [...prev, newItem]);
    showSuccessSnackbar(cleanName, qty, finalPrice);

    // Reset manual form
    setManualAmount('0');
    setManualQty(1);
    setManualItemName('');
    setError('');
  };

  // Handle QR Detection with ANTI-LOOP Protection
  const handleQRDetected = async (rawCode) => {
    if (!rawCode) return;
    const cleanCode = String(rawCode).trim();

    // 1. Prevent concurrent frame resolution
    if (isProcessingRef.current) return;

    // 2. PREVENT LOOP SCANNING: If the camera is still viewing the same QR code, IGNORE it!
    if (lastScannedCodeRef.current === cleanCode) {
      return;
    }

    try {
      isProcessingRef.current = true;
      lastScannedCodeRef.current = cleanCode;

      const product = await productService.getProductByQR(cleanCode);
      addProductToCart(product, 1);
      setError('');

      setScannedPill({
        name: product.name,
        code: cleanCode,
      });

      // Clear existing reset timer
      if (lastScannedCooldownTimer.current) {
        clearTimeout(lastScannedCooldownTimer.current);
      }
      // Allow re-scanning the same code after 6 seconds or if moved away
      lastScannedCooldownTimer.current = setTimeout(() => {
        lastScannedCodeRef.current = null;
        setScannedPill(null);
      }, 6000);
    } catch (err) {
      setError(err.message || `Unrecognized QR: "${cleanCode}"`);
      lastScannedCodeRef.current = cleanCode;
      setTimeout(() => {
        setError('');
        lastScannedCodeRef.current = null;
      }, 3500);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Force allow scanning the same item again immediately
  const handleResetScanLock = () => {
    lastScannedCodeRef.current = null;
    setScannedPill(null);
    if (lastScannedCooldownTimer.current) {
      clearTimeout(lastScannedCooldownTimer.current);
    }
  };

  // Handle file / photo upload QR scan
  const handleFileUploadScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanningFile(true);
      setError('');
      const html5QrCode = new Html5Qrcode('qr-temp-reader');
      const decodedText = await html5QrCode.scanFile(file, true);
      lastScannedCodeRef.current = null; // reset lock for file scan
      await handleQRDetected(decodedText);
      html5QrCode.clear();
    } catch (err) {
      setError(err.message || 'Could not detect a QR code in the selected photo.');
    } finally {
      setIsScanningFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Stop camera stream completely and release device media tracks immediately
  const stopCamera = async () => {
    if (qrCodeRef.current) {
      const scanner = qrCodeRef.current;
      qrCodeRef.current = null;
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch (err) {
        console.error('Error stopping camera:', err);
      }
    }

    // Direct MediaStream track cutoff to guarantee camera hardware shuts down immediately:
    const readerEl = document.getElementById('mobile-qr-reader');
    if (readerEl) {
      const videos = readerEl.querySelectorAll('video');
      videos.forEach((video) => {
        if (video.srcObject && typeof video.srcObject.getTracks === 'function') {
          video.srcObject.getTracks().forEach((track) => track.stop());
          video.srcObject = null;
        }
      });
      readerEl.innerHTML = '';
    }

    setIsCameraActive(false);
    setIsStartingCamera(false);
  };

  // Request camera permission and start scanning only after user clicks button
  const startCamera = async () => {
    try {
      setIsStartingCamera(true);
      setError('');

      // Stop any prior instance
      await stopCamera();

      // Ensure target element is mounted
      const readerEl = document.getElementById('mobile-qr-reader');
      if (!readerEl) {
        throw new Error('Scanner container element not found');
      }
      readerEl.innerHTML = '';

      const qrCode = new Html5Qrcode('mobile-qr-reader');
      qrCodeRef.current = qrCode;

      // Detect best available camera (rear/environment preferred, webcam fallback)
      let cameraConfig = { facingMode: 'environment' };
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const rearCamera = cameras.find((cam) =>
            /back|rear|environment/i.test(cam.label)
          );
          cameraConfig = rearCamera
            ? { deviceId: { exact: rearCamera.id } }
            : { deviceId: { exact: cameras[0].id } };
        }
      } catch {
        // Fallback to environment facingMode if enumeration not supported before permission
        cameraConfig = { facingMode: 'environment' };
      }

      const scanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edge = Math.max(140, Math.min(230, Math.floor(minEdge * 0.72)));
          return { width: edge, height: edge };
        },
        aspectRatio: 1.0,
      };

      try {
        await qrCode.start(
          cameraConfig,
          scanConfig,
          handleQRDetected,
          () => {} // Frame non-detection callback
        );
      } catch (firstErr) {
        console.warn('Primary camera config rejected, trying user-facing fallback:', firstErr);
        await qrCode.start(
          { facingMode: 'user' },
          scanConfig,
          handleQRDetected,
          () => {}
        );
      }

      setIsCameraActive(true);
    } catch (err) {
      console.error('Camera start error:', err);
      const errMsg = err?.message || String(err);
      if (
        errMsg.toLowerCase().includes('permission') ||
        errMsg.toLowerCase().includes('notallowed')
      ) {
        setError('Camera permission was denied. Please allow camera access in your browser settings to scan QR codes.');
      } else {
        setError(errMsg || 'Could not access camera. Please check camera permissions.');
      }
      await stopCamera();
    } finally {
      setIsStartingCamera(false);
    }
  };

  // Ensure camera hardware is immediately stopped whenever leaving this page or unmounting
  useEffect(() => {
    return () => {
      if (qrCodeRef.current) {
        try {
          if (qrCodeRef.current.isScanning) {
            qrCodeRef.current.stop().catch(() => {});
          }
          qrCodeRef.current.clear();
        } catch {
          // silent
        }
        qrCodeRef.current = null;
      }

      const readerEl = document.getElementById('mobile-qr-reader');
      if (readerEl) {
        const videos = readerEl.querySelectorAll('video');
        videos.forEach((video) => {
          if (video.srcObject && typeof video.srcObject.getTracks === 'function') {
            video.srcObject.getTracks().forEach((track) => track.stop());
            video.srcObject = null;
          }
        });
      }

      if (lastScannedCooldownTimer.current) {
        clearTimeout(lastScannedCooldownTimer.current);
      }
    };
  }, []);

  // Calculator button handler
  const handleCalcButton = (val) => {
    if (val === 'C') {
      if (calcTarget === 'qty') {
        setManualQty(1);
      } else {
        setManualAmount('0');
      }
      return;
    }

    if (val === '⌫') {
      if (calcTarget === 'qty') {
        const str = String(manualQty);
        const trimmed = str.length > 1 ? str.slice(0, -1) : '1';
        setManualQty(Math.max(1, Number(trimmed) || 1));
      } else {
        const trimmed = manualAmount.length > 1 ? manualAmount.slice(0, -1) : '0';
        setManualAmount(trimmed);
      }
      return;
    }

    if (val === '=') {
      try {
        const sanitized = manualAmount.replace(/×/g, '*').replace(/÷/g, '/');
        const evaluated = Function(`'use strict'; return (${sanitized})`)();
        const resultStr = String(Math.round(evaluated * 100) / 100);
        setManualAmount(resultStr);
      } catch {
        // expression incomplete
      }
      return;
    }

    if (calcTarget === 'qty') {
      if (!isNaN(val)) {
        const nextQty = Number(String(manualQty) + val);
        setManualQty(Math.min(9999, Math.max(1, nextQty)));
      }
    } else {
      let nextStr = manualAmount === '0' && !isNaN(val) ? String(val) : manualAmount + val;
      setManualAmount(nextStr);
    }
  };

  // Cart operations
  const updateCartQty = (cartId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartId === cartId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeCartItem = (cartId) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
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

  // Complete batch transaction
  const handleCompleteTransaction = async () => {
    if (cart.length === 0) {
      setError('Your stack is empty. Scan QR or enter amount before completing.');
      return;
    }

    // Check stock only for catalog inventory items on SALE
    if (txnType === 'SALE') {
      for (const item of cart) {
        if (!item.isManual && item.product) {
          if (item.product.currentStock < item.quantity) {
            setError(
              `Insufficient stock for "${item.product.name}". Available: ${item.product.currentStock} ${item.product.unit}, in stack: ${item.quantity}`
            );
            return;
          }
        }
      }
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        type: txnType,
        items: cart.map((item) => ({
          productId: item.isManual ? null : item.product?._id,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        paymentMethod,
        notes: notes.trim(),
        scannedViaQR: cart.some((i) => !i.isManual),
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
    <div className="space-y-4 sm:space-y-5 relative">
      {/* Floating Status Snackbar */}
      {snackbar && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/95 dark:bg-[#181b22]/95 text-white shadow-2xl backdrop-blur-xl border border-white/10 ring-1 ring-black/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DBFE80]/20 text-[#DBFE80] border border-[#DBFE80]/30">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {snackbar.title}
                </p>
                <p className="text-[11px] text-zinc-300 font-mono truncate">
                  {snackbar.subtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSnackbar(null)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Sale/Purchase Segmented Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            QR Scanner & POS
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Continuous multi-scan register and fast manual amount calculator
          </p>
        </div>

        {/* Segmented Pill: SALE vs PURCHASE */}
        <div className="flex p-1 rounded-full bg-zinc-200/70 dark:bg-zinc-850 self-start sm:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setTxnType('SALE')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 ${
              txnType === 'SALE'
                ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" /> Sale
          </button>
          <button
            type="button"
            onClick={() => setTxnType('PURCHASE')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 ${
              txnType === 'PURCHASE'
                ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" /> Purchase
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Left = Scanner/Manual, Right = Live Item Register */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Switchable Input Form (Camera View OR Manual Keypad) */}
        <div className="lg:col-span-6 space-y-3.5">
          {/* Segmented Mode Selector */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-zinc-200/60 dark:bg-zinc-850 border border-black/[0.04] dark:border-white/[0.05]">
            <button
              type="button"
              onClick={() => setInputMethod('qr')}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-98 ${
                inputMethod === 'qr'
                  ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
              }`}
            >
              <Camera className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
              <span>Camera Multi-QR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopCamera();
                setInputMethod('manual');
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-98 ${
                inputMethod === 'manual'
                  ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
              }`}
            >
              <Calculator className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
              <span>Manual Amount</span>
            </button>
          </div>

          {/* VIEW 1: Camera Scanner with Anti-Loop & Laser Animation */}
          {inputMethod === 'qr' && (
            <Card compact className="relative overflow-hidden p-3.5 rounded-2xl">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <ScanLine className="h-3.5 w-3.5 text-zinc-800 dark:text-[#DBFE80]" />
                  <span>Aim Camera at QR Label</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  {isCameraActive ? (
                    <>
                      <Badge variant="primary" size="sm" dot>
                        Live View
                      </Badge>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="text-[10px] font-semibold text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 active:scale-95 transition-colors"
                      >
                        Turn Off
                      </button>
                    </>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      Camera Off
                    </Badge>
                  )}
                </div>
              </div>

              {/* Viewfinder Container - perfectly centered in card */}
              <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px] aspect-square rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-zinc-200/20 shadow-inner">
                {/* HTML5 QR Code Mount Target */}
                <div id="mobile-qr-reader" className="absolute inset-0 w-full h-full pointer-events-none" />

                {/* Prompt State: When camera is not active, display centered permission / start button */}
                {!isCameraActive && (
                  <div className="relative z-10 flex flex-col items-center justify-center gap-3 p-4 text-center animate-in fade-in duration-200">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white border border-white/15 shadow-inner">
                      <Camera className="h-6 w-6" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-white">
                        Camera is Idle
                      </p>
                      <p className="text-[11px] text-zinc-400 max-w-[200px] leading-tight">
                        Click below to grant camera permission and scan QR codes
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={startCamera}
                      loading={isStartingCamera}
                      className="rounded-xl px-4 py-2 text-xs font-semibold shadow-md active:scale-95"
                    >
                      <Camera className="h-3.5 w-3.5 mr-1.5" />
                      {isStartingCamera ? 'Requesting Permission...' : 'Start Camera'}
                    </Button>
                  </div>
                )}

                {/* Viewfinder Overlay Frame: Target Brackets & Laser Beam (Only active when scanning) */}
                {isCameraActive && (
                  <div
                    className={`pointer-events-none absolute inset-6 sm:inset-8 rounded-2xl border border-white/20 transition-all duration-300 z-10 ${
                      scanFlash ? 'ring-4 ring-[#DBFE80]/80 bg-[#DBFE80]/10' : ''
                    }`}
                  >
                    {/* Corner Target Brackets */}
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-[#DBFE80] rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-[#DBFE80] rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-[#DBFE80] rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-[#DBFE80] rounded-br-lg" />

                    {/* Laser Scanning Beam */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#DBFE80] to-transparent shadow-[0_0_12px_#DBFE80] animate-laser">
                      <div className="h-10 w-full bg-gradient-to-b from-[#DBFE80]/20 to-transparent -translate-y-full pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Loop Prevention Pill / Next Scan Hint */}
                {isCameraActive && (
                  <>
                    {scannedPill ? (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-zinc-900/95 backdrop-blur-md text-[11px] font-semibold text-[#DBFE80] border border-[#DBFE80]/40 flex items-center gap-2 shadow-lg whitespace-nowrap">
                        <span>✓ Scanned: {scannedPill.name}</span>
                        <button
                          type="button"
                          onClick={handleResetScanLock}
                          className="px-2 py-0.5 rounded-full bg-[#DBFE80] hover:bg-[#ccf569] text-zinc-950 text-[10px] font-bold transition-colors inline-flex items-center gap-1 active:scale-95"
                        >
                          <RefreshCw className="h-2.5 w-2.5" /> Scan Again
                        </button>
                      </div>
                    ) : (
                      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-medium text-white/90 border border-white/10 whitespace-nowrap">
                        Auto-stacks items into cart • No loop scanning
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Photo & Image Fallback Action */}
              <div className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUploadScan}
                  className="hidden"
                />
                <div id="qr-temp-reader" className="hidden" />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanningFile}
                  className="w-full flex items-center justify-center gap-2 text-xs py-2 rounded-xl"
                >
                  <Upload className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{isScanningFile ? 'Scanning Image...' : 'Snap Photo / Choose Image'}</span>
                </Button>
              </div>
            </Card>
          )}

          {/* VIEW 2: Fast Manual POS Amount Calculator */}
          {inputMethod === 'manual' && (
            <Card compact className="space-y-3 p-3.5 rounded-2xl">
              {/* Item Name / Description Input */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Item Description or Note (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualItemName}
                    onChange={(e) => setManualItemName(e.target.value)}
                    placeholder={
                      txnType === 'SALE'
                        ? 'e.g. General Item, Custom Sale, Service'
                        : 'e.g. Supplies, Inventory Restock, Expense'
                    }
                    className="w-full rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-800 dark:focus:border-[#DBFE80] focus:outline-none focus:ring-2 focus:ring-[#DBFE80]/25 placeholder:text-zinc-400"
                  />
                </div>

                {/* Fast One-Tap Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['General Item', 'Custom Sale', 'Repair / Service', 'Beverages', 'Miscellaneous'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setManualItemName(preset)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium transition-colors active:scale-95"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount and Quantity Selectors */}
              <div className="grid grid-cols-2 gap-2">
                <div
                  onClick={() => setCalcTarget('amount')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all active:scale-98 ${
                    calcTarget === 'amount'
                      ? 'border-zinc-900 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 ring-2 ring-zinc-900/10 dark:ring-white/10'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider block">
                    Amount ({currency})
                  </span>
                  <span className="text-base font-bold font-mono">
                    {manualAmount || '0'}
                  </span>
                </div>

                <div
                  onClick={() => setCalcTarget('qty')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all active:scale-98 ${
                    calcTarget === 'qty'
                      ? 'border-zinc-900 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 ring-2 ring-zinc-900/10 dark:ring-white/10'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider block">
                    Quantity
                  </span>
                  <span className="text-base font-bold font-mono">{manualQty}</span>
                </div>
              </div>

              {/* Calculator Surface */}
              <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900 p-2.5 space-y-2">
                {/* LCD Display */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-[#181b22] border border-zinc-200 dark:border-zinc-800 shadow-inner">
                  <span className="text-[10px] uppercase font-semibold text-zinc-400">
                    {calcTarget === 'qty' ? 'Set Quantity:' : 'Set Amount:'}
                  </span>
                  <span className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {calcTarget === 'qty' ? manualQty : manualAmount}
                  </span>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-4 gap-1.5 text-sm font-semibold select-none">
                  {['7', '8', '9', '÷'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => handleCalcButton(b)}
                      className="py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 active:opacity-60 transition-opacity shadow-2xs"
                    >
                      {b}
                    </button>
                  ))}
                  {['4', '5', '6', '×'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => handleCalcButton(b)}
                      className="py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 active:opacity-60 transition-opacity shadow-2xs"
                    >
                      {b}
                    </button>
                  ))}
                  {['1', '2', '3', '-'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => handleCalcButton(b)}
                      className="py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 active:opacity-60 transition-opacity shadow-2xs"
                    >
                      {b}
                    </button>
                  ))}
                  {['C', '0', '.', '+'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => handleCalcButton(b)}
                      className={`py-2.5 rounded-xl border active:opacity-60 transition-opacity shadow-2xs ${
                        b === 'C'
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
                          : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCalcButton('⌫')}
                    className="py-2 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold active:opacity-60"
                  >
                    Delete ⌫
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCalcButton('=')}
                    className="py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold active:opacity-75"
                  >
                    Calculate =
                  </button>
                </div>
              </div>

              {/* Add to Stack Action Button */}
              <Button
                variant="primary"
                size="md"
                onClick={addManualItemToCart}
                className="w-full py-2.5 rounded-xl font-semibold"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add to Stack ({manualQty}x @ {formatCurrency(Number(manualAmount) || 0, currency)})
              </Button>
            </Card>
          )}
        </div>

        {/* Right: Stacked Register (Cart) */}
        <div className="lg:col-span-6">
          <Card compact className="flex flex-col justify-between h-full rounded-2xl">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Stacked Order List
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
                    className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1 active:opacity-70"
                  >
                    <RotateCcw className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 my-2 max-h-[320px] overflow-y-auto pr-1">
                {cart.length > 0 ? (
                  cart.map((item) => {
                    const subtotal = item.quantity * item.unitPrice;
                    return (
                      <div
                        key={item.cartId}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                              {item.productName}
                            </h4>
                            {item.isManual && (
                              <Badge variant="neutral" size="sm">
                                Manual
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                            <span>{item.sku}</span>
                            <span>•</span>
                            <span>{formatCurrency(item.unitPrice, currency)}</span>
                            {!item.isManual && item.product && (
                              <>
                                <span>•</span>
                                <span className="text-zinc-500">
                                  Avail: {item.product.currentStock}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Quantity Stepper & Subtotal */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center border border-zinc-200 dark:border-zinc-750 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-850">
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.cartId, -1)}
                              className="px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 active:scale-95"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-2 font-bold font-mono text-zinc-900 dark:text-zinc-100">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.cartId, 1)}
                              className="px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 active:scale-95"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100 min-w-[65px] text-right">
                            {formatCurrency(subtotal, currency)}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeCartItem(item.cartId)}
                            className="p-1 text-zinc-400 hover:text-rose-600 active:scale-90"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 text-center text-zinc-400 dark:text-zinc-500">
                    <Package className="h-7 w-7 mx-auto text-zinc-300 dark:text-zinc-700 mb-1.5" />
                    <p className="text-xs font-medium">Cart is currently empty</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Items stack here as you scan QR tags or add manual amounts
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Form & Action */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Select
                    label="Payment Method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    options={[
                      { value: 'CASH', label: 'Cash' },
                      { value: 'CARD', label: 'Card / POS' },
                      { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                      { value: 'CREDIT', label: 'Credit' },
                    ]}
                    compact
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium uppercase text-zinc-400 mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. In-store customer"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Total Due */}
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

              {/* Complete Action Button */}
              <Button
                variant="primary"
                size="lg"
                loading={submitting}
                disabled={cart.length === 0}
                onClick={handleCompleteTransaction}
                className="w-full py-3 text-sm font-bold rounded-2xl shadow-sm active:scale-[0.98]"
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

      {/* Transaction Success Receipt Modal */}
      <Modal
        isOpen={Boolean(completedTxn)}
        onClose={() => setCompletedTxn(null)}
        title="Transaction Completed"
        maxWidth="max-w-md"
      >
        {completedTxn && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <div className="h-12 w-12 rounded-full bg-[#DBFE80]/15 text-zinc-900 dark:text-[#DBFE80] flex items-center justify-center mx-auto mb-2 shadow-xs">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {completedTxn.type === 'SALE' ? 'Sale Recorded' : 'Purchase Recorded'}
              </h4>
              <p className="text-xs font-mono font-bold text-zinc-500 mt-0.5">
                Ref #{completedTxn.referenceNumber}
              </p>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 bg-zinc-50/60 dark:bg-zinc-850/60 space-y-2 max-h-48 overflow-y-auto">
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
              <span className="font-mono text-base text-zinc-900 dark:text-zinc-100 font-bold">
                {formatCurrency(completedTxn.totalAmount, currency)}
              </span>
            </div>

            <Button
              variant="primary"
              className="w-full rounded-2xl"
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
