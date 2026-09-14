import { Transaction } from '../models/transaction.model.js';
import { Product } from '../models/product.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { TRANSACTION_TYPES } from '../constants/transactionTypes.js';

export const createTransaction = asyncHandler(async (req, res) => {
  const { type, items, paymentMethod = 'CASH', notes = '', scannedViaQR = false } = req.body;

  if (!type || ![TRANSACTION_TYPES.PURCHASE, TRANSACTION_TYPES.SALE].includes(type)) {
    throw new ApiError(400, 'Invalid transaction type. Must be PURCHASE or SALE.');
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Transaction must contain at least one item');
  }

  let totalAmount = 0;
  const processedItems = [];
  const productsToUpdate = [];

  // Validate all items and check stock availability
  for (const item of items) {
    const { productId, quantity, unitPrice } = item;

    if (!productId || !quantity || quantity <= 0) {
      throw new ApiError(400, 'Each item must have a valid productId and quantity > 0');
    }

    const product = await Product.findOne({
      _id: productId,
      businessId: req.user.businessId,
    });

    if (!product) {
      throw new ApiError(404, `Product with ID ${productId} not found in your inventory`);
    }

    const price = unitPrice !== undefined ? Number(unitPrice) : (type === TRANSACTION_TYPES.SALE ? product.sellingPrice : product.costPrice);
    const subtotal = price * Number(quantity);
    totalAmount += subtotal;

    if (type === TRANSACTION_TYPES.SALE) {
      if (product.currentStock < Number(quantity)) {
        throw new ApiError(
          400,
          `Insufficient stock for "${product.name}". Available: ${product.currentStock} ${product.unit}, Requested: ${quantity}`
        );
      }
      product.currentStock -= Number(quantity);
    } else if (type === TRANSACTION_TYPES.PURCHASE) {
      product.currentStock += Number(quantity);
      // Optionally update cost price if new purchase price is provided
      if (unitPrice && Number(unitPrice) > 0) {
        product.costPrice = Number(unitPrice);
      }
    }

    productsToUpdate.push(product);

    processedItems.push({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      quantity: Number(quantity),
      unitPrice: price,
      subtotal,
    });
  }

  // Generate readable reference number
  const prefix = type === TRANSACTION_TYPES.PURCHASE ? 'PUR' : 'SAL';
  const timestamp = Date.now().toString().slice(-6);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const referenceNumber = `${prefix}-${timestamp}-${randomSuffix}`;

  // Save stock updates
  await Promise.all(productsToUpdate.map((p) => p.save()));

  // Create transaction record
  const transaction = await Transaction.create({
    businessId: req.user.businessId,
    type,
    referenceNumber,
    items: processedItems,
    totalAmount,
    paymentMethod,
    notes,
    scannedViaQR: Boolean(scannedViaQR),
    createdBy: req.user._id,
  });

  res.status(201).json(
    new ApiResponse(
      201,
      { transaction },
      `${type === TRANSACTION_TYPES.PURCHASE ? 'Purchase (Stock-In)' : 'Sale (Stock-Out)'} recorded successfully`
    )
  );
});

export const getTransactions = asyncHandler(async (req, res) => {
  const { type, search, page = 1, limit = 20 } = req.query;

  const filter = { businessId: req.user.businessId };

  if (type && type !== 'ALL') {
    filter.type = type;
  }

  if (search) {
    filter.referenceNumber = new RegExp(search.trim(), 'i');
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'name email'),
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

  const [
    totalProducts,
    lowStockProducts,
    allTransactions,
    todaySalesAgg,
    recentTransactions,
  ] = await Promise.all([
    Product.countDocuments({ businessId }),
    Product.find({
      businessId,
      $expr: { $lte: ['$currentStock', '$minStockLevel'] },
    })
      .limit(5)
      .select('name sku currentStock minStockLevel unit'),
    Transaction.find({ businessId }),
    Transaction.aggregate([
      {
        $match: {
          businessId,
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
      .limit(5)
      .populate('createdBy', 'name'),
  ]);

  let totalSalesAmount = 0;
  let totalPurchasesAmount = 0;
  let totalSalesCount = 0;
  let totalPurchasesCount = 0;

  for (const txn of allTransactions) {
    if (txn.type === TRANSACTION_TYPES.SALE) {
      totalSalesAmount += txn.totalAmount;
      totalSalesCount += 1;
    } else if (txn.type === TRANSACTION_TYPES.PURCHASE) {
      totalPurchasesAmount += txn.totalAmount;
      totalPurchasesCount += 1;
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
          totalPurchasesAmount,
          totalPurchasesCount,
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
