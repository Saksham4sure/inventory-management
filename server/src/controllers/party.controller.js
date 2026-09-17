import mongoose from 'mongoose';
import { Party } from '../models/party.model.js';
import { PartyCredit } from '../models/partyCredit.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateNepaliPhone, extractNepaliLocalDigits } from '../utils/phoneValidator.js';

// Get parties list with filtering, searching, and pagination
export const getParties = asyncHandler(async (req, res) => {
  const { search, type, filterBalance, page = 1, limit = 100 } = req.query;
  const businessId = req.user.businessId;

  const filter = { businessId };

  if (type && type !== 'ALL') {
    filter.type = type;
  }

  if (search && search.trim()) {
    const s = search.trim();
    const rawDigits = extractNepaliLocalDigits(s);
    filter.$or = [
      { name: new RegExp(s, 'i') },
      { phone: new RegExp(s, 'i') },
      ...(rawDigits ? [{ phone: new RegExp(rawDigits, 'i') }] : []),
      { email: new RegExp(s, 'i') },
    ];
  }

  if (filterBalance === 'CREDIT') {
    // Only parties with non-zero credit balance
    filter.currentBalance = { $ne: 0 };
  } else if (filterBalance === 'RECEIVABLE') {
    filter.currentBalance = { $gt: 0 };
  } else if (filterBalance === 'PAYABLE') {
    filter.currentBalance = { $lt: 0 };
  } else if (filterBalance === 'CLEAR') {
    filter.currentBalance = 0;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [parties, total] = await Promise.all([
    Party.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'name')
      .lean(),
    Party.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        parties,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)) || 1,
        },
      },
      'Parties retrieved successfully'
    )
  );
});

// Get single party by ID with recent ledger
export const getPartyById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const businessId = req.user.businessId;

  const party = await Party.findOne({ _id: id, businessId }).populate('createdBy', 'name');
  if (!party) {
    throw new ApiError(404, 'Party not found');
  }

  const recentTransactions = await PartyCredit.find({ partyId: id, businessId })
    .sort({ date: -1, createdAt: -1 })
    .limit(10)
    .populate('createdBy', 'name')
    .lean();

  res.status(200).json(
    new ApiResponse(200, { party, recentTransactions }, 'Party details retrieved')
  );
});

// Create a new party
export const createParty = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    email = '',
    type = 'CUSTOMER',
    address = '',
    creditLimit = 0,
    openingBalance = 0,
    notes = '',
  } = req.body;

  const businessId = req.user.businessId;

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Party name is required');
  }

  const phoneValidation = validateNepaliPhone(phone);
  if (!phoneValidation.isValid) {
    throw new ApiError(400, phoneValidation.error);
  }
  const cleanPhone = phoneValidation.normalized;
  const rawDigits = phoneValidation.localDigits;

  // Check if a party with this phone already exists in this business
  const existing = await Party.findOne({
    businessId,
    phone: { $in: [cleanPhone, rawDigits, `+977${rawDigits}`, `+977 ${rawDigits}`] },
  });

  if (existing) {
    throw new ApiError(409, `A party with phone number ${cleanPhone} already exists: "${existing.name}"`);
  }

  const numericOpeningBalance = Number(openingBalance) || 0;

  const party = await Party.create({
    businessId,
    name: name.trim(),
    phone: cleanPhone,
    email: email.trim(),
    type: ['CUSTOMER', 'SUPPLIER'].includes(type) ? type : 'CUSTOMER',
    address: address.trim(),
    creditLimit: Number(creditLimit) || 0,
    currentBalance: numericOpeningBalance,
    notes: notes.trim(),
    createdBy: req.user._id,
  });

  // If there was an opening balance, log initial ledger entry
  if (numericOpeningBalance !== 0) {
    let entryType = 'CREDIT_GIVEN';
    if (party.type === 'CUSTOMER') {
      entryType = numericOpeningBalance > 0 ? 'CREDIT_GIVEN' : 'PAYMENT_RECEIVED';
    } else {
      entryType = numericOpeningBalance < 0 ? 'CREDIT_TAKEN' : 'PAYMENT_MADE';
    }

    await PartyCredit.create({
      businessId,
      partyId: party._id,
      entryType,
      amount: Math.abs(numericOpeningBalance),
      balanceAfter: numericOpeningBalance,
      referenceNumber: 'OPENING-BAL',
      notes: 'Initial opening balance',
      date: new Date(),
      createdBy: req.user._id,
    });
  }

  res.status(201).json(new ApiResponse(201, { party }, 'Party created successfully'));
});

// Update party details
export const updateParty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const businessId = req.user.businessId;
  const { name, phone, email, type, address, creditLimit, notes } = req.body;

  const party = await Party.findOne({ _id: id, businessId });
  if (!party) {
    throw new ApiError(404, 'Party not found');
  }

  if (name !== undefined) party.name = name.trim();
  if (email !== undefined) party.email = email.trim();
  if (address !== undefined) party.address = address.trim();
  if (notes !== undefined) party.notes = notes.trim();
  if (creditLimit !== undefined) party.creditLimit = Number(creditLimit) || 0;

  if (type !== undefined && ['CUSTOMER', 'SUPPLIER'].includes(type)) {
    party.type = type;
  }

  if (phone !== undefined) {
    const phoneValidation = validateNepaliPhone(phone);
    if (!phoneValidation.isValid) {
      throw new ApiError(400, phoneValidation.error);
    }
    const cleanPhone = phoneValidation.normalized;
    const rawDigits = phoneValidation.localDigits;

    if (cleanPhone !== party.phone) {
      const existing = await Party.findOne({
        businessId,
        phone: { $in: [cleanPhone, rawDigits, `+977${rawDigits}`, `+977 ${rawDigits}`] },
        _id: { $ne: id },
      });
      if (existing) {
        throw new ApiError(409, `Phone number already assigned to another party: "${existing.name}"`);
      }
      party.phone = cleanPhone;
    }
  }

  await party.save();

  res.status(200).json(new ApiResponse(200, { party }, 'Party updated successfully'));
});

// Delete a party and associated credit ledger
export const deleteParty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const businessId = req.user.businessId;

  const party = await Party.findOneAndDelete({ _id: id, businessId });
  if (!party) {
    throw new ApiError(404, 'Party not found');
  }

  await PartyCredit.deleteMany({ partyId: id, businessId });

  res.status(200).json(new ApiResponse(200, { id }, 'Party and credit ledger deleted successfully'));
});

// Record a credit transaction (Give credit or receive payment)
export const recordCreditTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params; // partyId
  const businessId = req.user.businessId;
  const {
    entryType,
    amount,
    paymentMethod = 'CASH',
    referenceNumber = '',
    notes = '',
    date,
  } = req.body;

  const validTypes = ['CREDIT_GIVEN', 'PAYMENT_RECEIVED', 'CREDIT_TAKEN', 'PAYMENT_MADE'];
  if (!entryType || !validTypes.includes(entryType)) {
    throw new ApiError(400, `Invalid entry type. Allowed: ${validTypes.join(', ')}`);
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new ApiError(400, 'Amount must be a positive number greater than 0');
  }

  const party = await Party.findOne({ _id: id, businessId });
  if (!party) {
    throw new ApiError(404, 'Party not found');
  }

  // Calculate new balance based on entry type
  let newBalance = party.currentBalance;
  if (entryType === 'CREDIT_GIVEN') {
    newBalance += numAmount; // You gave credit to customer (Receivable increases)
  } else if (entryType === 'PAYMENT_RECEIVED') {
    newBalance -= numAmount; // Customer paid money (Receivable decreases)
  } else if (entryType === 'CREDIT_TAKEN') {
    newBalance -= numAmount; // You took goods on credit from vendor (Payable increases)
  } else if (entryType === 'PAYMENT_MADE') {
    newBalance += numAmount; // You paid vendor (Payable decreases)
  }

  // Create ledger entry
  const creditEntry = await PartyCredit.create({
    businessId,
    partyId: party._id,
    entryType,
    amount: numAmount,
    balanceAfter: newBalance,
    paymentMethod,
    referenceNumber: referenceNumber.trim(),
    notes: notes.trim(),
    date: date ? new Date(date) : new Date(),
    createdBy: req.user._id,
  });

  party.currentBalance = newBalance;
  await party.save();

  res.status(201).json(
    new ApiResponse(
      201,
      { creditEntry, party },
      'Credit transaction recorded successfully'
    )
  );
});

// Get party credit history (ledger)
export const getPartyCreditHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const businessId = req.user.businessId;
  const { page = 1, limit = 50 } = req.query;

  const party = await Party.findOne({ _id: id, businessId }).select('name phone type currentBalance creditLimit').lean();
  if (!party) {
    throw new ApiError(404, 'Party not found');
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [history, total] = await Promise.all([
    PartyCredit.find({ partyId: id, businessId })
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'name')
      .lean(),
    PartyCredit.countDocuments({ partyId: id, businessId }),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        party,
        history,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)) || 1,
        },
      },
      'Credit history retrieved successfully'
    )
  );
});

// Get aggregated credit summary
export const getPartiesCreditSummary = asyncHandler(async (req, res) => {
  const businessId = req.user.businessId;
  const businessObjectId = new mongoose.Types.ObjectId(businessId);

  const [partiesAgg, countStats] = await Promise.all([
    Party.aggregate([
      { $match: { businessId: businessObjectId } },
      {
        $group: {
          _id: '$type',
          totalPositive: {
            $sum: {
              $cond: [{ $gt: ['$currentBalance', 0] }, '$currentBalance', 0],
            },
          },
          totalNegative: {
            $sum: {
              $cond: [{ $lt: ['$currentBalance', 0] }, { $abs: '$currentBalance' }, 0],
            },
          },
          countWithCredit: {
            $sum: {
              $cond: [{ $ne: ['$currentBalance', 0] }, 1, 0],
            },
          },
          receivableCount: {
            $sum: {
              $cond: [{ $gt: ['$currentBalance', 0] }, 1, 0],
            },
          },
          payableCount: {
            $sum: {
              $cond: [{ $lt: ['$currentBalance', 0] }, 1, 0],
            },
          },
          settledCount: {
            $sum: {
              $cond: [{ $eq: ['$currentBalance', 0] }, 1, 0],
            },
          },
          totalCount: { $sum: 1 },
        },
      },
    ]),
    Party.countDocuments({ businessId }),
  ]);

  let totalReceivable = 0; // Money to collect from customers
  let totalPayable = 0;    // Money to pay to suppliers
  let customersCount = 0;
  let suppliersCount = 0;
  let creditActiveCount = 0;
  let receivableCount = 0;
  let payableCount = 0;
  let settledCount = 0;

  const breakdown = {
    ALL: { total: countStats, receivable: 0, payable: 0, settled: 0 },
    CUSTOMER: { total: 0, receivable: 0, payable: 0, settled: 0 },
    SUPPLIER: { total: 0, receivable: 0, payable: 0, settled: 0 },
  };

  for (const group of partiesAgg) {
    receivableCount += group.receivableCount || 0;
    payableCount += group.payableCount || 0;
    settledCount += group.settledCount || 0;

    if (group._id === 'CUSTOMER') {
      totalReceivable += group.totalPositive;
      totalPayable += group.totalNegative;
      customersCount = group.totalCount;
      creditActiveCount += group.countWithCredit;
      breakdown.CUSTOMER = {
        total: group.totalCount,
        receivable: group.receivableCount || 0,
        payable: group.payableCount || 0,
        settled: group.settledCount || 0,
      };
    } else if (group._id === 'SUPPLIER') {
      totalPayable += group.totalNegative;
      totalReceivable += group.totalPositive;
      suppliersCount = group.totalCount;
      creditActiveCount += group.countWithCredit;
      breakdown.SUPPLIER = {
        total: group.totalCount,
        receivable: group.receivableCount || 0,
        payable: group.payableCount || 0,
        settled: group.settledCount || 0,
      };
    }
  }

  breakdown.ALL = {
    total: countStats,
    receivable: receivableCount,
    payable: payableCount,
    settled: settledCount,
  };

  res.status(200).json(
    new ApiResponse(
      200,
      {
        totalReceivable,
        totalPayable,
        netBalance: totalReceivable - totalPayable,
        totalParties: countStats,
        customersCount,
        suppliersCount,
        creditActiveCount,
        receivableCount,
        payableCount,
        settledCount,
        breakdown,
      },
      'Credit summary calculated successfully'
    )
  );
});
