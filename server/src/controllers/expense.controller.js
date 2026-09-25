import { Expense } from '../models/expense.model.js';
import { Business } from '../models/business.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Validates business subscription status
 * Business users MUST have an active subscription or non-expired trial to use business expense tracking
 */
const validateBusinessSubscription = async (businessId) => {
  const business = await Business.findById(businessId).lean();
  if (!business) {
    throw new ApiError(404, 'Business profile not found');
  }

  const sub = business.subscription || {};
  const now = new Date();
  const endDate = sub.endDate ? new Date(sub.endDate) : null;
  const isExpired = endDate ? endDate.getTime() < now.getTime() : false;
  const isTrial = sub.status === 'TRIAL';
  const isActive = sub.status === 'ACTIVE';
  const hasSubscribed = Boolean(sub.plan && (isTrial || isActive) && !isExpired);

  if (!hasSubscribed) {
    throw new ApiError(
      403,
      'An active subscription is required to record and track business expenses. Please subscribe or renew your subscription plan.'
    );
  }

  return business;
};

/**
 * GET /api/expenses
 * Query params: type ('PERSONAL' | 'BUSINESS'), category, paymentMethod, search, startDate, endDate, page, limit
 */
export const getExpenses = asyncHandler(async (req, res) => {
  const {
    type = 'PERSONAL',
    category,
    paymentMethod,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = req.query;

  const query = {};

  if (type === 'BUSINESS') {
    if (!req.user.businessId) {
      throw new ApiError(400, 'You must be associated with a business to view business expenses.');
    }
    // Subscription check for business users
    await validateBusinessSubscription(req.user.businessId);
    query.businessId = req.user.businessId;
    query.type = 'BUSINESS';
  } else {
    // Personal expenses for normal user - NO subscription required
    query.user = req.user._id;
    query.type = 'PERSONAL';
  }

  if (category && category !== 'ALL') {
    query.category = category;
  }

  if (paymentMethod && paymentMethod !== 'ALL') {
    query.paymentMethod = paymentMethod;
  }

  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { title: { $regex: s, $options: 'i' } },
      { notes: { $regex: s, $options: 'i' } },
      { referenceNumber: { $regex: s, $options: 'i' } },
      { category: { $regex: s, $options: 'i' } },
    ];
  }

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) {
      const endD = new Date(endDate);
      endD.setHours(23, 59, 59, 999);
      query.date.$lte = endD;
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * pageLimit;

  const [expenses, totalCount, aggregateData] = await Promise.all([
    Expense.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean(),
    Expense.countDocuments(query),
    Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  // Calculate current month's expenses
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthQuery = {
    ...query,
    date: { $gte: startOfMonth },
  };

  const monthAgg = await Expense.aggregate([
    { $match: monthQuery },
    {
      $group: {
        _id: null,
        thisMonthAmount: { $sum: '$amount' },
      },
    },
  ]);

  const totalAmount = aggregateData[0]?.totalAmount || 0;
  const thisMonthAmount = monthAgg[0]?.thisMonthAmount || 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        expenses,
        pagination: {
          page: pageNum,
          limit: pageLimit,
          totalCount,
          totalPages: Math.ceil(totalCount / pageLimit) || 1,
        },
        summary: {
          totalAmount,
          thisMonthAmount,
          count: totalCount,
        },
      },
      'Expenses fetched successfully'
    )
  );
});

/**
 * GET /api/expenses/summary
 * Aggregates statistics & category breakdown
 */
export const getExpenseSummary = asyncHandler(async (req, res) => {
  const { type = 'PERSONAL' } = req.query;
  const match = {};

  if (type === 'BUSINESS') {
    if (!req.user.businessId) {
      throw new ApiError(400, 'Business ID is required for business expenses summary');
    }
    await validateBusinessSubscription(req.user.businessId);
    match.businessId = req.user.businessId;
    match.type = 'BUSINESS';
  } else {
    match.user = req.user._id;
    match.type = 'PERSONAL';
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [categoryBreakdown, overallStats, monthlyStats] = await Promise.all([
    Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]),
    Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalCount: { $sum: 1 },
          avgExpense: { $avg: '$amount' },
        },
      },
    ]),
    Expense.aggregate([
      {
        $match: {
          ...match,
          date: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          thisMonthAmount: { $sum: '$amount' },
          thisMonthCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalAmount: overallStats[0]?.totalAmount || 0,
        totalCount: overallStats[0]?.totalCount || 0,
        avgExpense: overallStats[0]?.avgExpense || 0,
        thisMonthAmount: monthlyStats[0]?.thisMonthAmount || 0,
        thisMonthCount: monthlyStats[0]?.thisMonthCount || 0,
        categoryBreakdown: categoryBreakdown.map((c) => ({
          category: c._id,
          total: c.total,
          count: c.count,
        })),
      },
      'Expense summary aggregated successfully'
    )
  );
});

/**
 * POST /api/expenses
 * Create a new expense
 */
export const createExpense = asyncHandler(async (req, res) => {
  const {
    title,
    amount,
    currency = 'NPR',
    category,
    paymentMethod = 'CASH',
    date = new Date(),
    notes = '',
    referenceNumber = '',
    type = 'PERSONAL',
  } = req.body;

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Expense title or description is required');
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new ApiError(400, 'Expense amount must be a positive number');
  }

  const cleanCategory = typeof category === 'object' && category !== null
    ? (category.target?.value || category.value || '')
    : String(category || '').trim();
  const cleanPaymentMethod = typeof paymentMethod === 'object' && paymentMethod !== null
    ? (paymentMethod.target?.value || paymentMethod.value || 'CASH')
    : String(paymentMethod || 'CASH').trim();

  if (!cleanCategory) {
    throw new ApiError(400, 'Expense category is required');
  }

  const isBusiness = type === 'BUSINESS';

  if (isBusiness) {
    if (!req.user.businessId) {
      throw new ApiError(400, 'Business setup required to record business expenses.');
    }
    // Subscription check: Business users must have active plan
    await validateBusinessSubscription(req.user.businessId);
  }

  const expense = await Expense.create({
    user: req.user._id,
    businessId: isBusiness ? req.user.businessId : null,
    type: isBusiness ? 'BUSINESS' : 'PERSONAL',
    title: title.trim(),
    amount: numAmount,
    currency: currency.toUpperCase(),
    category: cleanCategory,
    paymentMethod: cleanPaymentMethod,
    date: date ? new Date(date) : new Date(),
    notes: notes.trim(),
    referenceNumber: referenceNumber.trim(),
    recordedBy: {
      name: req.user.name || '',
      email: req.user.email || '',
      role: req.user.role || 'USER',
    },
  });

  return res.status(201).json(
    new ApiResponse(201, { expense }, 'Expense recorded successfully')
  );
});

/**
 * PUT /api/expenses/:id
 * Update an existing expense
 */
export const updateExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title,
    amount,
    currency,
    category,
    paymentMethod,
    date,
    notes,
    referenceNumber,
  } = req.body;

  const expense = await Expense.findById(id);
  if (!expense) {
    throw new ApiError(404, 'Expense record not found');
  }

  // Authorization check
  if (expense.type === 'BUSINESS') {
    if (!req.user.businessId || String(expense.businessId) !== String(req.user.businessId)) {
      throw new ApiError(403, 'You do not have permission to modify this business expense.');
    }
    // Subscription check for business
    await validateBusinessSubscription(req.user.businessId);
  } else {
    if (String(expense.user) !== String(req.user._id)) {
      throw new ApiError(403, 'You do not have permission to modify this personal expense.');
    }
  }

  if (title !== undefined) expense.title = title.trim();
  if (amount !== undefined) {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) throw new ApiError(400, 'Invalid amount');
    expense.amount = num;
  }
  if (currency !== undefined) expense.currency = currency.toUpperCase();
  if (category !== undefined) {
    const cleanCategory = typeof category === 'object' && category !== null
      ? (category.target?.value || category.value || '')
      : String(category || '').trim();
    if (!cleanCategory) throw new ApiError(400, 'Expense category cannot be empty');
    expense.category = cleanCategory;
  }
  if (paymentMethod !== undefined) {
    const cleanPayment = typeof paymentMethod === 'object' && paymentMethod !== null
      ? (paymentMethod.target?.value || paymentMethod.value || 'CASH')
      : String(paymentMethod || 'CASH').trim();
    expense.paymentMethod = cleanPayment;
  }
  if (date !== undefined) expense.date = new Date(date);
  if (notes !== undefined) expense.notes = notes.trim();
  if (referenceNumber !== undefined) expense.referenceNumber = referenceNumber.trim();

  await expense.save();

  return res.status(200).json(
    new ApiResponse(200, { expense }, 'Expense updated successfully')
  );
});

/**
 * DELETE /api/expenses/:id
 * Delete an expense
 */
export const deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const expense = await Expense.findById(id);
  if (!expense) {
    throw new ApiError(404, 'Expense record not found');
  }

  if (expense.type === 'BUSINESS') {
    if (!req.user.businessId || String(expense.businessId) !== String(req.user.businessId)) {
      throw new ApiError(403, 'You do not have permission to delete this business expense.');
    }
    // Subscription check
    await validateBusinessSubscription(req.user.businessId);
  } else {
    if (String(expense.user) !== String(req.user._id)) {
      throw new ApiError(403, 'You do not have permission to delete this personal expense.');
    }
  }

  await Expense.findByIdAndDelete(id);

  return res.status(200).json(
    new ApiResponse(200, { id }, 'Expense deleted successfully')
  );
});
