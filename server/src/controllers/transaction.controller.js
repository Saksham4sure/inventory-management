import { Transaction } from '../models/transaction.model.js';
import { Product } from '../models/product.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { TRANSACTION_TYPES } from '../constants/transactionTypes.js';

export const createTransaction = asyncHandler(async (req, res) => {
  const { type, items, paymentMethod = 'CASH', notes = '', scannedViaQR = false } = req.body;

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
  const { type, categoryGroup, search, page = 1, limit = 50 } = req.query;

  const filter = { businessId: req.user.businessId };

  if (categoryGroup === 'sales') {
    filter.type = { $in: [TRANSACTION_TYPES.SALE, TRANSACTION_TYPES.SALE_RETURN] };
  } else if (categoryGroup === 'purchases') {
    filter.type = { $in: [TRANSACTION_TYPES.PURCHASE, TRANSACTION_TYPES.PURCHASE_RETURN] };
  } else if (type && type !== 'ALL') {
    filter.type = type;
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
      .limit(10)
      .select('name sku currentStock minStockLevel unit sellingPrice'),
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
      .limit(8)
      .populate('createdBy', 'name'),
  ]);

  let totalSalesAmount = 0;
  let totalSalesCount = 0;
  let totalSalesReturns = 0;
  let totalPurchasesAmount = 0;
  let totalPurchasesCount = 0;
  let totalPurchaseReturns = 0;

  for (const txn of allTransactions) {
    if (txn.type === TRANSACTION_TYPES.SALE) {
      totalSalesAmount += txn.totalAmount;
      totalSalesCount += 1;
    } else if (txn.type === TRANSACTION_TYPES.SALE_RETURN) {
      totalSalesReturns += txn.totalAmount;
    } else if (txn.type === TRANSACTION_TYPES.PURCHASE) {
      totalPurchasesAmount += txn.totalAmount;
      totalPurchasesCount += 1;
    } else if (txn.type === TRANSACTION_TYPES.PURCHASE_RETURN) {
      totalPurchaseReturns += txn.totalAmount;
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
