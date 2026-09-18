import mongoose from 'mongoose';
import { Transaction } from '../models/transaction.model.js';
import { Product } from '../models/product.model.js';
import { Party } from '../models/party.model.js';
import { PartyCredit } from '../models/partyCredit.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { TRANSACTION_TYPES } from '../constants/transactionTypes.js';
import { ROLES } from '../constants/roles.js';
import { validateNepaliPhone, extractNepaliLocalDigits } from '../utils/phoneValidator.js';
import { uploadImageToCloudinary } from '../config/cloudinary.js';

export const createTransaction = asyncHandler(async (req, res) => {
  const {
    type,
    items,
    paymentMethod = 'CASH',
    notes = '',
    scannedViaQR = false,
    partyId,
    partyName,
    partyPhone,
    // Customer search / account ID / email
    customerUserQuery,
    customerId,
    // Credit options: FULL or PARTIAL
    creditType = 'NONE', // 'NONE' | 'FULL' | 'PARTIAL'
    paidAmount = 0,
    creditAmount = 0,
    // Manual bill details (for Purchase)
    manualBillDetails,
  } = req.body;

  const validTypes = [
    TRANSACTION_TYPES.PURCHASE,
    TRANSACTION_TYPES.SALE,
    TRANSACTION_TYPES.SALE_RETURN,
    TRANSACTION_TYPES.PURCHASE_RETURN,
  ];

  if (!type || !validTypes.includes(type)) {
    throw new ApiError(
      400,
      `Invalid transaction type. Allowed types: ${validTypes.join(', ')}`
    );
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Transaction must contain at least one line item');
  }

  let totalAmount = 0;
  const processedItems = [];
  const productsToUpdate = [];

  // Validate all items and update stock
  for (const item of items) {
    const { productId, productName, sku, quantity, unitPrice } = item;

    const qty = Number(quantity);
    if (!quantity || isNaN(qty) || qty <= 0) {
      throw new ApiError(400, 'Each item must have a quantity greater than 0');
    }

    let price = Number(unitPrice);
    if (isNaN(price) || price < 0) {
      price = 0;
    }

    if (productId) {
      const product = await Product.findOne({
        _id: productId,
        businessId: req.user.businessId,
      });

      if (!product) {
        throw new ApiError(404, `Product with ID ${productId} not found in your inventory`);
      }

      if (isNaN(Number(unitPrice))) {
        price =
          type === TRANSACTION_TYPES.SALE || type === TRANSACTION_TYPES.SALE_RETURN
            ? product.sellingPrice
            : product.costPrice;
      }

      const subtotal = price * qty;
      totalAmount += subtotal;

      // Stock adjustments for catalog items:
      if (type === TRANSACTION_TYPES.SALE || type === TRANSACTION_TYPES.PURCHASE_RETURN) {
        if (product.currentStock < qty) {
          throw new ApiError(
            400,
            `Insufficient stock for "${product.name}". Available: ${product.currentStock} ${product.unit}, Requested: ${qty}`
          );
        }
        product.currentStock -= qty;
      } else if (type === TRANSACTION_TYPES.PURCHASE || type === TRANSACTION_TYPES.SALE_RETURN) {
        product.currentStock += qty;
        if (type === TRANSACTION_TYPES.PURCHASE && price > 0) {
          product.costPrice = price;
        }
      }

      productsToUpdate.push(product);

      processedItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: qty,
        unitPrice: price,
        subtotal,
      });
    } else {
      // Manual / non-catalog entry
      const subtotal = price * qty;
      totalAmount += subtotal;

      processedItems.push({
        product: null,
        productName: (productName || 'Manual Entry').trim(),
        sku: (sku || 'MANUAL').trim(),
        quantity: qty,
        unitPrice: price,
        subtotal,
      });
    }
  }

  // Generate readable reference number
  const prefixMap = {
    [TRANSACTION_TYPES.SALE]: 'SAL',
    [TRANSACTION_TYPES.PURCHASE]: 'PUR',
    [TRANSACTION_TYPES.SALE_RETURN]: 'SRT',
    [TRANSACTION_TYPES.PURCHASE_RETURN]: 'PRT',
  };
  const prefix = prefixMap[type] || 'TXN';
  const timestamp = Date.now().toString().slice(-6);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const referenceNumber = `${prefix}-${timestamp}-${randomSuffix}`;

  // Enforce member limits if not business owner or admin
  if (req.user.role !== ROLES.OWNER && req.user.role !== ROLES.ADMIN) {
    const memberRecord = req.business?.members?.find(
      (m) => m.user && m.user.toString() === req.user._id.toString()
    );
    if (memberRecord && memberRecord.limits) {
      if (type === TRANSACTION_TYPES.SALE && memberRecord.limits.canRecordSale === false) {
        throw new ApiError(403, 'Your account does not have permission to record sales');
      }
      if (type === TRANSACTION_TYPES.PURCHASE && memberRecord.limits.canRecordPurchase === false) {
        throw new ApiError(403, 'Your account does not have permission to record purchases');
      }
      if (
        memberRecord.limits.maxTransactionAmount > 0 &&
        totalAmount > memberRecord.limits.maxTransactionAmount
      ) {
        throw new ApiError(
          403,
          `Transaction amount (${totalAmount}) exceeds your authorized limit of ${memberRecord.limits.maxTransactionAmount}`
        );
      }
    }
  }

  // Save stock updates
  await Promise.all(productsToUpdate.map((p) => p.save()));

  // Resolve User Account (Customer) if provided
  let matchedCustomerUser = null;
  if (customerId) {
    matchedCustomerUser = await User.findById(customerId);
  } else if (customerUserQuery && customerUserQuery.trim()) {
    const q = customerUserQuery.trim();
    matchedCustomerUser = await User.findOne({
      $or: [
        { accountId: q.toUpperCase() },
        { email: q.toLowerCase() },
        { username: q.toLowerCase() },
      ],
    });
    if (!matchedCustomerUser) {
      throw new ApiError(404, `Customer with account ID or email "${q}" does not exist`);
    }
  }

  // Resolve or create Party
  let resolvedParty = null;
  if (partyId) {
    resolvedParty = await Party.findOne({ _id: partyId, businessId: req.user.businessId });
  } else if (matchedCustomerUser) {
    // Check if Party exists for this customer in this business
    resolvedParty = await Party.findOne({
      businessId: req.user.businessId,
      $or: [
        { user: matchedCustomerUser._id },
        { email: matchedCustomerUser.email.toLowerCase() },
        ...(matchedCustomerUser.accountId ? [{ accountId: matchedCustomerUser.accountId }] : []),
      ],
    });

    if (!resolvedParty) {
      throw new ApiError(
        400,
        `Customer "${matchedCustomerUser.name}" has not been added as an accepted party by your business. Send party request and await their acceptance before recording transactions.`
      );
    }

    if (resolvedParty.status === 'PENDING') {
      throw new ApiError(
        400,
        `Party invitation for "${matchedCustomerUser.name}" is pending. The customer must accept the invitation from their notifications before transactions can begin.`
      );
    }

    if (resolvedParty.status === 'REJECTED') {
      throw new ApiError(
        400,
        `Party request was declined by "${matchedCustomerUser.name}". Transactions cannot be recorded.`
      );
    }
  } else if (partyId) {
    if (resolvedParty?.status === 'PENDING') {
      throw new ApiError(
        400,
        `Party invitation for "${resolvedParty.name}" is still pending. The user must accept the notification before transactions can begin.`
      );
    }
    if (resolvedParty?.status === 'REJECTED') {
      throw new ApiError(
        400,
        `Party invitation for "${resolvedParty.name}" was declined. Transactions cannot be recorded.`
      );
    }
  } else if (partyPhone && partyPhone.trim()) {
    const rawDigits = extractNepaliLocalDigits(partyPhone);
    const phoneValidation = validateNepaliPhone(partyPhone);
    const cleanPhone = phoneValidation.isValid ? phoneValidation.normalized : partyPhone.trim();

    resolvedParty = await Party.findOne({
      businessId: req.user.businessId,
      phone: { $in: [cleanPhone, partyPhone.trim(), rawDigits, `+977${rawDigits}`, `+977 ${rawDigits}`] },
    });

    if (!resolvedParty && partyName && partyName.trim()) {
      if (!phoneValidation.isValid) {
        throw new ApiError(400, phoneValidation.error);
      }
      resolvedParty = await Party.create({
        businessId: req.user.businessId,
        name: partyName.trim(),
        phone: cleanPhone,
        type: type === TRANSACTION_TYPES.SALE ? 'CUSTOMER' : 'SUPPLIER',
        currentBalance: 0,
        createdBy: req.user._id,
      });
    }
  }

  // Handle Credit configuration (FULL vs PARTIAL)
  const isCreditTxn = paymentMethod === 'CREDIT';
  let effectiveCreditAmount = 0;
  let effectivePaidAmount = 0;

  if (isCreditTxn) {
    if (creditType === 'PARTIAL') {
      const parsedPaid = Number(paidAmount) || 0;
      effectivePaidAmount = Math.max(0, Math.min(totalAmount, parsedPaid));
      effectiveCreditAmount = totalAmount - effectivePaidAmount;
    } else {
      // FULL credit
      effectivePaidAmount = 0;
      effectiveCreditAmount = totalAmount;
    }
  }

  // Process manual bill photos if uploaded
  let processedBillPhotos = [];
  if (manualBillDetails?.billPhotos && Array.isArray(manualBillDetails.billPhotos)) {
    for (const photo of manualBillDetails.billPhotos) {
      if (photo) {
        const uploaded = await uploadImageToCloudinary(photo, 'purchase_bills');
        processedBillPhotos.push(uploaded);
      }
    }
  }

  // Create transaction record
  const transaction = await Transaction.create({
    businessId: req.user.businessId,
    type,
    referenceNumber,
    items: processedItems,
    totalAmount,
    paymentMethod,
    customer: matchedCustomerUser?._id || null,
    customerAccountId: matchedCustomerUser?.accountId || '',
    customerEmail: matchedCustomerUser?.email || '',
    creditDetails: {
      isCredit: isCreditTxn,
      creditType: isCreditTxn ? creditType : 'NONE',
      paidAmount: effectivePaidAmount,
      creditAmount: effectiveCreditAmount,
    },
    manualBillDetails: manualBillDetails
      ? {
          sellerName: manualBillDetails.sellerName?.trim() || '',
          vendorPanVat: manualBillDetails.vendorPanVat?.trim() || '',
          billNumber: manualBillDetails.billNumber?.trim() || '',
          billCategory: manualBillDetails.billCategory?.trim() || '',
          contactNumber: manualBillDetails.contactNumber?.trim() || '',
          billPhotos: processedBillPhotos,
        }
      : undefined,
    party: resolvedParty?._id || null,
    partyName: resolvedParty?.name || (partyName ? partyName.trim() : matchedCustomerUser?.name || ''),
    partyPhone: resolvedParty?.phone || (partyPhone ? partyPhone.trim() : matchedCustomerUser?.phone || ''),
    notes,
    scannedViaQR: Boolean(scannedViaQR),
    createdBy: req.user._id,
  });

  // If credit transaction with a party, update party balance and log ledger entry!
  if (resolvedParty && isCreditTxn && effectiveCreditAmount > 0) {
    let entryType = 'CREDIT_GIVEN';
    if (type === TRANSACTION_TYPES.SALE) {
      entryType = 'CREDIT_GIVEN';
      resolvedParty.currentBalance += effectiveCreditAmount;
    } else if (type === TRANSACTION_TYPES.PURCHASE) {
      entryType = 'CREDIT_TAKEN';
      resolvedParty.currentBalance -= effectiveCreditAmount;
    } else if (type === TRANSACTION_TYPES.SALE_RETURN) {
      entryType = 'PAYMENT_RECEIVED';
      resolvedParty.currentBalance -= effectiveCreditAmount;
    } else if (type === TRANSACTION_TYPES.PURCHASE_RETURN) {
      entryType = 'PAYMENT_MADE';
      resolvedParty.currentBalance += effectiveCreditAmount;
    }

    await Promise.all([
      resolvedParty.save(),
      PartyCredit.create({
        businessId: req.user.businessId,
        partyId: resolvedParty._id,
        entryType,
        amount: effectiveCreditAmount,
        balanceAfter: resolvedParty.currentBalance,
        referenceNumber,
        paymentMethod: 'CREDIT',
        notes: `Credit ${type === TRANSACTION_TYPES.SALE ? 'sale' : 'purchase'} #${referenceNumber}${
          creditType === 'PARTIAL' ? ` (Partial: Paid ${effectivePaidAmount}, Credit ${effectiveCreditAmount})` : ''
        }`,
        date: new Date(),
        createdBy: req.user._id,
      }),
    ]);
  }

  const typeLabels = {
    [TRANSACTION_TYPES.SALE]: 'Sale',
    [TRANSACTION_TYPES.PURCHASE]: 'Purchase',
    [TRANSACTION_TYPES.SALE_RETURN]: 'Customer Return',
    [TRANSACTION_TYPES.PURCHASE_RETURN]: 'Vendor Return',
  };

  res.status(201).json(
    new ApiResponse(
      201,
      { transaction },
      `${typeLabels[type] || type} recorded successfully. Reference #${referenceNumber}.`
    )
  );
});

export const getTransactions = asyncHandler(async (req, res) => {
  const { type, categoryGroup, search, startDate, endDate, page = 1, limit = 150 } = req.query;

  const filter = { businessId: req.user.businessId };

  if (categoryGroup === 'sales') {
    if (type && type !== 'ALL') {
      filter.type = type;
    } else {
      filter.type = { $in: [TRANSACTION_TYPES.SALE, TRANSACTION_TYPES.SALE_RETURN] };
    }
  } else if (categoryGroup === 'purchases') {
    if (type && type !== 'ALL') {
      filter.type = type;
    } else {
      filter.type = { $in: [TRANSACTION_TYPES.PURCHASE, TRANSACTION_TYPES.PURCHASE_RETURN] };
    }
  } else if (type && type !== 'ALL') {
    filter.type = type;
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      if (typeof endDate === 'string' && endDate.length <= 10) {
        end.setHours(23, 59, 59, 999);
      }
      filter.createdAt.$lte = end;
    }
  }

  if (search) {
    filter.$or = [
      { referenceNumber: new RegExp(search.trim(), 'i') },
      { 'items.productName': new RegExp(search.trim(), 'i') },
      { 'items.sku': new RegExp(search.trim(), 'i') },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'name email')
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        transactions,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)) || 1,
        },
      },
      'Transactions retrieved successfully'
    )
  );
});

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const businessId = req.user.businessId;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const businessObjectId = new mongoose.Types.ObjectId(businessId);

  const [
    totalProducts,
    lowStockProducts,
    txnSummaryAgg,
    todaySalesAgg,
    recentTransactions,
  ] = await Promise.all([
    Product.countDocuments({ businessId }),
    Product.find({
      businessId,
      $expr: { $lte: ['$currentStock', '$minStockLevel'] },
    })
      .limit(10)
      .select('name sku currentStock minStockLevel unit sellingPrice')
      .lean(),
    Transaction.aggregate([
      { $match: { businessId: businessObjectId } },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]),
    Transaction.aggregate([
      {
        $match: {
          businessId: businessObjectId,
          type: TRANSACTION_TYPES.SALE,
          createdAt: { $gte: startOfToday },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]),
    Transaction.find({ businessId })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('createdBy', 'name')
      .lean(),
  ]);

  let totalSalesAmount = 0;
  let totalSalesCount = 0;
  let totalSalesReturns = 0;
  let totalPurchasesAmount = 0;
  let totalPurchasesCount = 0;
  let totalPurchaseReturns = 0;

  for (const group of txnSummaryAgg) {
    if (group._id === TRANSACTION_TYPES.SALE) {
      totalSalesAmount = group.totalAmount || 0;
      totalSalesCount = group.count || 0;
    } else if (group._id === TRANSACTION_TYPES.SALE_RETURN) {
      totalSalesReturns = group.totalAmount || 0;
    } else if (group._id === TRANSACTION_TYPES.PURCHASE) {
      totalPurchasesAmount = group.totalAmount || 0;
      totalPurchasesCount = group.count || 0;
    } else if (group._id === TRANSACTION_TYPES.PURCHASE_RETURN) {
      totalPurchaseReturns = group.totalAmount || 0;
    }
  }

  const todaySalesAmount = todaySalesAgg[0]?.total || 0;
  const todaySalesCount = todaySalesAgg[0]?.count || 0;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        metrics: {
          totalProducts,
          lowStockCount: lowStockProducts.length,
          totalSalesAmount,
          totalSalesCount,
          totalSalesReturns,
          netSales: totalSalesAmount - totalSalesReturns,
          totalPurchasesAmount,
          totalPurchasesCount,
          totalPurchaseReturns,
          netPurchases: totalPurchasesAmount - totalPurchaseReturns,
          todaySalesAmount,
          todaySalesCount,
        },
        lowStockAlerts: lowStockProducts,
        recentTransactions,
      },
      'Dashboard metrics retrieved'
    )
  );
});

export const deleteTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== ROLES.OWNER && req.user.role !== ROLES.ADMIN) {
    const memberRecord = req.business?.members?.find(
      (m) => m.user && m.user.toString() === req.user._id.toString()
    );
    if (memberRecord && memberRecord.limits?.canDeleteRecords === false) {
      throw new ApiError(403, 'Your account does not have permission to delete transactions');
    }
  }

  const transaction = await Transaction.findOne({
    _id: id,
    businessId: req.user.businessId,
  });

  if (!transaction) {
    throw new ApiError(404, 'Transaction audit record not found');
  }

  await Transaction.findByIdAndDelete(id);

  res.status(200).json(
    new ApiResponse(200, { deletedId: id }, 'Transaction record deleted successfully')
  );
});
