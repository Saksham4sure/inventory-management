import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { Html5Qrcode } from 'html5-qrcode';
import { productService } from '../services/productService';
import { transactionService } from '../services/transactionService';
import { partyService } from '../services/partyService';
import { authService } from '../services/authService';
import { useBusiness } from '../hooks/useBusiness';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
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
  RotateCcw,
  Package,
  Upload,
  X,
  RefreshCw,
  Users,
  UserCheck,
  Search,
  ExternalLink,
  Check,
  Loader2,
} from 'lucide-react';
import { useSnackbar } from '../hooks/useSnackbar';
import { useConfirm } from '../hooks/useConfirm';

export const QRScanPage = () => {
  const { business } = useBusiness();
  const navigate = useNavigate();
  const { alert } = useConfirm();
  const { showSuccess, showError } = useSnackbar();
  const currency = business?.currency || 'USD';

  // Transaction Mode is strictly SALE for QR Register
  const txnType = 'SALE';

  // Customer Selection state via unique Account ID or Email search
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [candidateCustomer, setCandidateCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null); // { _id, name, email, phone, accountId }
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState('');

  // Credit configuration state: FULL or PARTIAL
  const [creditType, setCreditType] = useState('FULL'); // 'FULL' | 'PARTIAL'
  const [creditPaidAmount, setCreditPaidAmount] = useState('');

  // Input Method: 'qr' or 'manual'
  const [inputMethod, setInputMethod] = useState('qr');

  // Stacked Cart items
  const [cart, setCart] = useState([]);

  // Notifications & State
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState(null); // { id, title, subtitle }
  const [submitting, setSubmitting] = useState(false);
  const [completedTxn, setCompletedTxn] = useState(null);
  const [scanFlash, setScanFlash] = useState(false);
  const [isScanningFile, setIsScanningFile] = useState(false);
  const [scannedPill, setScannedPill] = useState(null);

  // Transaction options
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  // Credit Party State (fallback / legacy party selection)
  const [creditParty, setCreditParty] = useState(null); // { _id, name, phone, type, currentBalance, isNew }
  const [isCreditPartyModalOpen, setIsCreditPartyModalOpen] = useState(false);
  const [existingParties, setExistingParties] = useState([]);
  const [loadingParties, setLoadingParties] = useState(false);
  const [partySearch, setPartySearch] = useState('');

  // Scanner refs & anti-loop controls
  const qrCodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const isProcessingRef = useRef(false);
  const lastScannedCodeRef = useRef(null);
  const lastScannedCooldownTimer = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  // Discount state
  const [discountAmount, setDiscountAmount] = useState('');

  // Simplified Manual Calculator state
  const [manualItemName, setManualItemName] = useState('');
  const [manualAmount, setManualAmount] = useState('0');

  // Auto-dismiss snackbar after 3.5 seconds
  useEffect(() => {
    if (!snackbar) return;
    const timer = setTimeout(() => {
      setSnackbar(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [snackbar]);

  // Sensory feedback
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

  // Add Manual / Non-Catalog Item to cart (Simplified 1-step calculator add)
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

    const cleanName =
      manualItemName.trim() ||
      (txnType === 'SALE' ? 'Manual Sale Item' : 'Manual Purchase Item');

    const newItem = {
      cartId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isManual: true,
      product: null,
      productName: cleanName,
      sku: 'MANUAL',
      quantity: 1,
      unitPrice: finalPrice,
    };

    setCart((prev) => [...prev, newItem]);
    showSuccessSnackbar(cleanName, 1, finalPrice);

    // Reset manual form
    setManualAmount('0');
    setManualItemName('');
    setError('');
  };

  // Handle QR Detection with ANTI-LOOP Protection
  const handleQRDetected = async (rawCode) => {
    if (!rawCode) return;
    const cleanCode = String(rawCode).trim();

    if (isProcessingRef.current) return;
    if (lastScannedCodeRef.current === cleanCode) return;

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

      if (lastScannedCooldownTimer.current) {
        clearTimeout(lastScannedCooldownTimer.current);
      }
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

  const handleResetScanLock = () => {
    lastScannedCodeRef.current = null;
    setScannedPill(null);
    if (lastScannedCooldownTimer.current) {
      clearTimeout(lastScannedCooldownTimer.current);
    }
  };

  // File upload scan
  const handleFileUploadScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanningFile(true);
      setError('');
      const html5QrCode = new Html5Qrcode('qr-temp-reader');
      const decodedText = await html5QrCode.scanFile(file, true);
      lastScannedCodeRef.current = null;
      await handleQRDetected(decodedText);
      html5QrCode.clear();
    } catch (err) {
      setError(err.message || 'Could not detect a QR code in the selected photo.');
    } finally {
      setIsScanningFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Stop camera
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

  // Start camera
  const startCamera = async () => {
    try {
      setIsStartingCamera(true);
      setError('');

      await stopCamera();

      const readerEl = document.getElementById('mobile-qr-reader');
      if (!readerEl) {
        throw new Error('Scanner container element not found');
      }
      readerEl.innerHTML = '';

      const qrCode = new Html5Qrcode('mobile-qr-reader');
      qrCodeRef.current = qrCode;

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
          () => {}
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

  // Simple Calculator button handler
  const handleCalcButton = (val) => {
    if (val === 'C') {
      setManualAmount('0');
      return;
    }

    if (val === '⌫') {
      const trimmed = manualAmount.length > 1 ? manualAmount.slice(0, -1) : '0';
      setManualAmount(trimmed);
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

    const nextStr = manualAmount === '0' && !isNaN(val) ? String(val) : manualAmount + val;
    setManualAmount(nextStr);
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
    const discountValue = Math.min(parseFloat(discountAmount) || 0, totalAmount);
    const discountedTotal = Math.max(0, totalAmount - discountValue);
    return { totalItems, totalAmount, discountedTotal, discountValue, linesCount: cart.length };
  }, [cart, discountAmount]);

  // Fetch Parties for Credit Selection
  const fetchPartiesForCredit = useCallback(async () => {
    try {
      setLoadingParties(true);
      const targetType = txnType === 'SALE' ? 'CUSTOMER' : 'SUPPLIER';
      const res = await partyService.getParties({
        type: targetType,
        limit: 100,
      });
      setExistingParties(res?.parties || []);
    } catch (err) {
      console.error('Failed to load parties for credit', err);
    } finally {
      setLoadingParties(false);
    }
  }, [txnType]);

  // Handle Payment Method Switch
  const handleSelectPaymentMethod = (method) => {
    setPaymentMethod(method);
    if (method === 'CREDIT') {
      setIsCreditPartyModalOpen(true);
      fetchPartiesForCredit();
    } else {
      setCreditParty(null);
    }
  };

  // Select an Existing Party for Credit
  const handleSelectExistingParty = (party) => {
    setCreditParty({
      _id: party._id,
      name: party.name,
      phone: party.phone,
      type: party.type,
      currentBalance: party.currentBalance || 0,
      isNew: false,
    });
    setPaymentMethod('CREDIT');
    setIsCreditPartyModalOpen(false);
  };

  const handleCloseCreditModal = () => {
    setIsCreditPartyModalOpen(false);
    if (!creditParty) {
      setPaymentMethod('CASH');
    }
  };

  // Filtered list of existing parties for credit modal
  const filteredExistingParties = useMemo(() => {
    if (!partySearch.trim()) return existingParties;
    const s = partySearch.toLowerCase().trim();
    return existingParties.filter(
      (p) =>
        p.name?.toLowerCase().includes(s) ||
        (p.phone && p.phone.toLowerCase().includes(s)) ||
        (p.accountId && p.accountId.toLowerCase().includes(s))
    );
  }, [existingParties, partySearch]);

  // Auto search customer by User ID or Email when completely typed
  useEffect(() => {
    const query = customerSearchInput.trim();

    if (!query) {
      setCandidateCustomer(null);
      setCustomerSearchError('');
      setSearchingCustomer(false);
      return;
    }

    // If query matches the currently selected customer, no need to re-search
    if (
      selectedCustomer &&
      (query === selectedCustomer.userId ||
        query === selectedCustomer.accountId ||
        query.toLowerCase() === (selectedCustomer.email || '').toLowerCase())
    ) {
      return;
    }

    const isEightDigitId = /^\d{8}$/.test(query);
    const isCompleteEmail = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(query);
    const isTenDigitPhone = /^9[678]\d{8}$/.test(query);
    const isCompleteFormat = isEightDigitId || isCompleteEmail || isTenDigitPhone;

    if (query.length < 4 && !isCompleteFormat) {
      setCandidateCustomer(null);
      return;
    }

    const delay = isCompleteFormat ? 200 : 500;

    const timer = setTimeout(async () => {
      try {
        setSearchingCustomer(true);
        setCustomerSearchError('');
        const res = await authService.searchUsers(query);
        if (res?.user) {
          setCandidateCustomer(res.user);
        } else {
          setCandidateCustomer(null);
          setCustomerSearchError('No registered customer found with this User ID or Email.');
        }
      } catch (err) {
        setCandidateCustomer(null);
        const errMsg =
          err?.response?.data?.message ||
          err.message ||
          'No registered customer found with this User ID or Email.';
        setCustomerSearchError(errMsg);
      } finally {
        setSearchingCustomer(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [customerSearchInput, selectedCustomer]);

  const handleConfirmCustomer = (cust) => {
    const c = cust || candidateCustomer;
    if (!c) return;
    setSelectedCustomer(c);
    setCandidateCustomer(null);
    setCustomerSearchError('');
    showSuccess(`Customer confirmed: ${c.name} (ID: ${c.userId || c.accountId || c.email})`);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCandidateCustomer(null);
    setCustomerSearchInput('');
    setCustomerSearchError('');
  };

  // Complete batch transaction
  const handleCompleteTransaction = async () => {
    if (cart.length === 0) {
      setError('Your stack is empty. Scan QR or enter amount before completing.');
      showError('Your stack is empty. Scan QR or enter amount before completing.');
      return;
    }

    // Check stock only for catalog inventory items on SALE
    for (const item of cart) {
      if (!item.isManual && item.product) {
        if (item.product.currentStock < item.quantity) {
          const stockMsg = `Cannot complete sale for "${item.product.name}". Available inventory is only ${item.product.currentStock} ${item.product.unit}, but you are trying to sell ${item.quantity} ${item.product.unit}.`;
          setError(stockMsg);
          showError(`Out of stock: Only ${item.product.currentStock} ${item.product.unit} available for "${item.product.name}"`);
          await alert({
            title: 'Stock Out of Bound Warning',
            message: stockMsg,
            buttonText: 'Understood',
            variant: 'warning',
          });
          return;
        }
      }
    }

    // If payment method is CREDIT, customer/party identity is required!
    if (paymentMethod === 'CREDIT' && !selectedCustomer && !creditParty) {
      const partyMsg = 'Please search & select a customer (using Account ID or Email) for this credit transaction.';
      setError(partyMsg);
      showError(partyMsg);
      return;
    }

    // Credit amount validations
    let effectivePaid = 0;
    let effectiveCredit = totals.discountedTotal;

    if (paymentMethod === 'CREDIT') {
      if (creditType === 'PARTIAL') {
        effectivePaid = parseFloat(creditPaidAmount) || 0;
        if (effectivePaid < 0 || effectivePaid >= totals.discountedTotal) {
          const err = `Partial paid amount must be between 0 and ${totals.discountedTotal - 1}`;
          setError(err);
          showError(err);
          return;
        }
        effectiveCredit = totals.discountedTotal - effectivePaid;
      } else {
        effectivePaid = 0;
        effectiveCredit = totals.discountedTotal;
      }
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        type: 'SALE',
        items: cart.map((item) => ({
          productId: item.isManual ? null : item.product?._id,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        paymentMethod,
        customerId: selectedCustomer?._id || null,
        customerUserQuery: selectedCustomer?.accountId || selectedCustomer?.email || '',
        partyId: creditParty?._id || null,
        partyName: selectedCustomer?.name || creditParty?.name || '',
        partyPhone: selectedCustomer?.phone || creditParty?.phone || '',
        creditType: paymentMethod === 'CREDIT' ? creditType : 'NONE',
        paidAmount: effectivePaid,
        creditAmount: effectiveCredit,
        discount: totals.discountValue,
        totalAmount: totals.discountedTotal,
        notes: notes.trim(),
        scannedViaQR: cart.some((i) => !i.isManual),
      };

      const result = await transactionService.createTransaction(payload);
      showSuccess(`Transaction #${result.referenceNumber} completed successfully`);
      setCompletedTxn(result);
      setCart([]);
      setNotes('');
      setDiscountAmount('');
      setCreditParty(null);
      setSelectedCustomer(null);
      setCreditPaidAmount('');
      setCreditType('FULL');
    } catch (err) {
      const msg = err.message || 'Failed to complete transaction';
      setError(msg);
      showError(msg);

      // If backend throws insufficient stock or out of bounds error, show popup warning
      const isStockError =
        msg.toLowerCase().includes('insufficient stock') ||
        msg.toLowerCase().includes('out of bound') ||
        msg.toLowerCase().includes('exceeds available');

      if (isStockError) {
        await alert({
          title: 'Stock Limit Exceeded',
          message: msg,
          buttonText: 'Review Stack',
          variant: 'warning',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 relative">
      {/* Floating Status Snackbar at bottom */}
      {snackbar && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/95 dark:bg-[#181b22]/95 text-white shadow-2xl backdrop-blur-xl border border-white/10 ring-1 ring-black/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-100 border border-zinc-700">
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

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              QR Scanner & POS
            </h1>
            <Badge variant="success" size="sm">
              Sale Only
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Continuous multi-scan register and fast manual sales checkout
          </p>
        </div>

        {/* Header Right */}
        <div className="flex items-center gap-2">
          {selectedCustomer && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800">
              {selectedCustomer.profilePicture || selectedCustomer.avatar ? (
                <div className="h-5 w-5 rounded-full overflow-hidden shrink-0 ring-1 ring-emerald-500/20">
                  <img
                    src={selectedCustomer.profilePicture || selectedCustomer.avatar}
                    alt={selectedCustomer.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              <div className="text-left">
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  {selectedCustomer.name}
                </p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                  ID: {selectedCustomer.userId || selectedCustomer.accountId || selectedCustomer.email}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearCustomer}
                className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-full text-emerald-700 dark:text-emerald-300 ml-1"
                title="Change Customer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

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
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
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
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
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
                  <ScanLine className="h-3.5 w-3.5 text-zinc-800 dark:text-zinc-200" />
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

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
                  <span>{error}</span>
                  <button type="button" onClick={() => setError('')} className="p-0.5 hover:bg-rose-500/20 rounded">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Viewfinder Container */}
              <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px] aspect-square rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-zinc-200/20 shadow-inner">
                <div id="mobile-qr-reader" className="absolute inset-0 w-full h-full pointer-events-none" />

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

                {isCameraActive && (
                  <div
                    className={`pointer-events-none absolute inset-6 sm:inset-8 rounded-2xl border border-white/20 transition-all duration-300 z-10 ${
                      scanFlash ? 'ring-4 ring-zinc-300/80 bg-zinc-300/10' : ''
                    }`}
                  >
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-zinc-300 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-zinc-300 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-zinc-300 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-zinc-300 rounded-br-lg" />

                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-zinc-200 to-transparent shadow-[0_0_10px_rgba(255,255,255,0.4)] animate-laser">
                      <div className="h-10 w-full bg-gradient-to-b from-white/15 to-transparent -translate-y-full pointer-events-none" />
                    </div>
                  </div>
                )}

                {isCameraActive && (
                  <>
                    {scannedPill ? (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-zinc-900/95 backdrop-blur-md text-[11px] font-semibold text-zinc-100 border border-zinc-700 flex items-center gap-2 shadow-lg whitespace-nowrap">
                        <span>✓ Scanned: {scannedPill.name}</span>
                        <button
                          type="button"
                          onClick={handleResetScanLock}
                          className="px-2 py-0.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-[10px] font-bold transition-colors inline-flex items-center gap-1 active:scale-95"
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

              {/* Photo Upload Action */}
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

          {/* VIEW 2: Simple Manual POS Calculator (Quantity/Amount toggle removed) */}
          {inputMethod === 'manual' && (
            <Card compact className="space-y-3 p-3.5 rounded-2xl">
              {/* Item Note Input */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Item Description / Note (Optional)
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
                    className="w-full rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-800 dark:focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 placeholder:text-zinc-400"
                  />
                </div>

                {/* Preset Chips */}
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

              {/* Simple Calculator Surface */}
              <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900 p-2.5 space-y-2">
                {/* Clean LCD Amount Display with direct keyboard input */}
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#181b22] border border-zinc-200 dark:border-zinc-800 shadow-inner">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 shrink-0">
                    Amount ({currency})
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={manualAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Allow digits, decimal points, and standard math operators: +, -, *, /, x, ÷
                      if (/^[0-9+\-*/.×÷\s]*$/.test(val)) {
                        setManualAmount(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (/[+\-*/×÷]/.test(manualAmount)) {
                          handleCalcButton('=');
                        } else {
                          addManualItemToCart();
                        }
                      }
                    }}
                    onFocus={() => {
                      if (manualAmount === '0') {
                        setManualAmount('');
                      }
                    }}
                    onBlur={() => {
                      if (!manualAmount.trim()) {
                        setManualAmount('0');
                      }
                    }}
                    placeholder="0"
                    className="w-full text-right text-xl font-black font-mono text-zinc-900 dark:text-zinc-100 bg-transparent border-none outline-none focus:ring-0 p-0"
                  />
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

              {/* Add to Stack Button */}
              <Button
                variant="primary"
                size="md"
                onClick={addManualItemToCart}
                className="w-full py-2.5 rounded-xl font-semibold"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add to Stack ({formatCurrency(Number(manualAmount) || 0, currency)})
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
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 my-2 max-h-[320px] overflow-y-auto pr-1 modal-scroll overscroll-contain">
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
                            className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 active:scale-90"
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
              {/* Payment Methods */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-1.5 select-none">
                  {[
                    { id: 'CASH', label: 'Cash' },
                    { id: 'BANK_TRANSFER', label: 'Bank Transfer' },
                    { id: 'ONLINE', label: 'Online Payment' },
                    { id: 'CREDIT', label: 'Credit' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectPaymentMethod(m.id)}
                      className={`py-2 px-1 rounded-xl border text-center text-[11px] sm:text-xs font-medium leading-tight flex items-center justify-center min-h-[38px] transition-all duration-150 active:scale-95 ${
                        paymentMethod === m.id
                          ? m.id === 'CREDIT'
                            ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold shadow-xs'
                            : 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 hover:text-zinc-900 dark:hover:border-zinc-700 dark:hover:text-zinc-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Customer / Credit Details (shown when paymentMethod is CREDIT) */}
              {paymentMethod === 'CREDIT' && (
                <div className="space-y-2.5 p-3 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-xs">
                  {/* Customer Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {selectedCustomer
                            ? selectedCustomer.name
                            : creditParty
                            ? creditParty.name
                            : 'No Customer Identified'}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                          {selectedCustomer
                            ? `ID: ${selectedCustomer.userId || selectedCustomer.accountId || selectedCustomer.email}`
                            : creditParty
                            ? `${creditParty.phone} • Bal: ${formatCurrency(creditParty.currentBalance || 0, currency)}`
                            : 'Search by User ID or Email above'}
                        </p>
                      </div>
                    </div>

                    {!selectedCustomer && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setIsCreditPartyModalOpen(true);
                          fetchPartiesForCredit();
                        }}
                        className="text-[11px] px-2.5 py-1 whitespace-nowrap"
                      >
                        {creditParty ? 'Change' : 'Pick Party'}
                      </Button>
                    )}
                  </div>

                  {/* Credit Type: FULL vs PARTIAL */}
                  <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                        Credit Payment Option:
                      </span>
                      <div className="flex rounded-lg bg-white dark:bg-zinc-900 p-0.5 border border-amber-300 dark:border-amber-800">
                        <button
                          type="button"
                          onClick={() => {
                            setCreditType('FULL');
                            setCreditPaidAmount('');
                          }}
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                            creditType === 'FULL'
                              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          Full Credit
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreditType('PARTIAL')}
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                            creditType === 'PARTIAL'
                              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          Partial Credit
                        </button>
                      </div>
                    </div>

                    {creditType === 'PARTIAL' && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-500 mb-0.5">
                            Amount Paid Now ({currency})
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={totals.totalAmount}
                            step="0.01"
                            placeholder="0.00"
                            value={creditPaidAmount}
                            onChange={(e) => setCreditPaidAmount(e.target.value)}
                            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-500 mb-0.5">
                            Remaining Due ({currency})
                          </label>
                          <div className="w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700">
                            {formatCurrency(
                              Math.max(
                                0,
                                totals.totalAmount - (parseFloat(creditPaidAmount) || 0)
                              ),
                              currency
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <input
                  type="text"
                  placeholder="Notes or invoice remark (optional)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400/20"
                />
              </div>

              {/* Customer ID / Email Finder - Automatic search & confirmation */}
              <div className="space-y-2">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  User ID / Email Lookup
                </label>

                {/* Candidate Customer Confirmation Card */}
                {candidateCustomer && !selectedCustomer && (
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-750 bg-zinc-50 dark:bg-zinc-850 p-3 space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Customer Found
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                        Confirm
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                        {candidateCustomer.profilePicture || candidateCustomer.avatar ? (
                          <img
                            src={candidateCustomer.profilePicture || candidateCustomer.avatar}
                            alt={candidateCustomer.name || 'Customer'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{candidateCustomer.name ? candidateCustomer.name.charAt(0).toUpperCase() : 'C'}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {candidateCustomer.name}
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                          ID: {candidateCustomer.userId || candidateCustomer.accountId || 'NO-ID'} • {candidateCustomer.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-750">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handleConfirmCustomer(candidateCustomer)}
                        className="flex-1 text-xs py-1.5 rounded-xl font-semibold"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Confirm Customer
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleClearCustomer}
                        className="text-xs py-1.5 rounded-xl"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Confirmed Selected Customer Card */}
                {selectedCustomer ? (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                        {selectedCustomer.profilePicture || selectedCustomer.avatar ? (
                          <img
                            src={selectedCustomer.profilePicture || selectedCustomer.avatar}
                            alt={selectedCustomer.name || 'Customer'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {selectedCustomer.name}
                          </p>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                            Confirmed
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                          ID: {selectedCustomer.userId || selectedCustomer.accountId || selectedCustomer.email}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearCustomer}
                      className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 underline underline-offset-2 shrink-0 ml-1"
                      title="Change Customer"
                    >
                      Change
                    </button>
                  </div>
                ) : !candidateCustomer && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Type 8-digit User ID or Email..."
                      value={customerSearchInput}
                      onChange={(e) => {
                        setCustomerSearchInput(e.target.value);
                        if (customerSearchError) setCustomerSearchError('');
                      }}
                      className="w-full rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-8 pr-8 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/20"
                    />
                    {searchingCustomer ? (
                      <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 animate-spin" />
                    ) : customerSearchInput ? (
                      <button
                        type="button"
                        onClick={handleClearCustomer}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                )}
                {customerSearchError && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {customerSearchError}
                  </p>
                )}
              </div>

              {/* Discount Price Input */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Discount ({currency})
                </label>
                <div className="relative">
                  <TrendingDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="number"
                    min="0"
                    max={totals.totalAmount}
                    step="0.01"
                    placeholder="0.00"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-8 pr-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/20"
                  />
                </div>
              </div>

              {/* Total Due */}
              <div className="space-y-1 py-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-zinc-500">
                    Subtotal ({totals.totalItems} pcs)
                  </span>
                  <span className="text-sm font-mono font-semibold text-zinc-600 dark:text-zinc-400">
                    {formatCurrency(totals.totalAmount, currency)}
                  </span>
                </div>
                {totals.discountValue > 0 && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-rose-600 dark:text-rose-400">
                      Discount
                    </span>
                    <span className="text-sm font-mono font-semibold text-rose-600 dark:text-rose-400">
                      −{formatCurrency(totals.discountValue, currency)}
                    </span>
                  </div>
                )}
                <div className="flex items-baseline justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Total Due
                  </span>
                  <div className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(totals.discountedTotal, currency)}
                  </div>
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
                  ? `Record Sale at Once (${formatCurrency(totals.discountedTotal, currency)})`
                  : `Record Purchase at Once (${formatCurrency(totals.discountedTotal, currency)})`}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* MODAL 1: Select or Create Party for Credit */}
      <Modal
        isOpen={isCreditPartyModalOpen}
        onClose={handleCloseCreditModal}
        title="Select Customer for Credit Sale"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {/* Existing Parties List */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search customers by name or phone..."
                value={partySearch}
                onChange={(e) => setPartySearch(e.target.value)}
                className="w-full rounded-xl border border-zinc-200/90 dark:border-zinc-750 bg-white dark:bg-zinc-900 pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <div className="border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-1.5 max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/50 modal-scroll overscroll-contain">
              {loadingParties ? (
                <div className="py-6 text-center text-xs text-zinc-400">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1" />
                  Loading contacts...
                </div>
              ) : filteredExistingParties.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-400 space-y-2">
                  <p>No customers found.</p>
                  <p className="text-[11px] text-zinc-400">
                    Create a new party from the Parties page first.
                  </p>
                </div>
              ) : (
                filteredExistingParties.map((party) => (
                  <div
                    key={party._id}
                    onClick={() => handleSelectExistingParty(party)}
                    className="p-2.5 rounded-lg flex items-center justify-between cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                        {party.name}
                      </p>
                      <p className="text-[11px] text-zinc-400 font-mono">{party.phone}</p>
                    </div>

                    <div className="text-right flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block font-mono">
                          Bal: {formatCurrency(party.currentBalance || 0, currency)}
                        </span>
                      </div>
                      <Button variant="secondary" size="sm" className="text-[11px] px-2 py-0.5">
                        Select
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Create New Party — Navigate to Parties Page */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2.5">
            <div className="text-xs text-zinc-600 dark:text-zinc-300">
              <p className="font-semibold">Party not listed?</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Create a new party from the Parties &amp; Credits page, then come back to select them.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsCreditPartyModalOpen(false);
                navigate(ROUTES.PARTIES);
              }}
              className="w-full text-xs font-semibold"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Go to Parties &amp; Credits Page
            </Button>
          </div>

          <div className="flex justify-end pt-1">
            <Button variant="secondary" size="sm" onClick={handleCloseCreditModal}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

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
              <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center mx-auto mb-2 shadow-xs">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {completedTxn.type === 'SALE' ? 'Sale Recorded' : 'Purchase Recorded'}
              </h4>
              <p className="text-xs font-mono font-bold text-zinc-500 mt-0.5">
                Ref #{completedTxn.referenceNumber}
              </p>
            </div>

            {completedTxn.partyName && (
              <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-xs flex justify-between items-center">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {completedTxn.type === 'SALE' ? 'Customer Account:' : 'Supplier Account:'}
                </span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {completedTxn.partyName} ({completedTxn.partyPhone})
                </span>
              </div>
            )}

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 bg-zinc-50/60 dark:bg-zinc-850/60 space-y-2 max-h-48 overflow-y-auto modal-scroll overscroll-contain">
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
