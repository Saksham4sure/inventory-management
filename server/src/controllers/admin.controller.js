import { Business } from '../models/business.model.js';
import { User } from '../models/user.model.js';
import { Product } from '../models/product.model.js';
import { Transaction } from '../models/transaction.model.js';
import { SubscriptionPlan } from '../models/subscriptionPlan.model.js';
import { PlatformSettings } from '../models/platformSettings.model.js';
import { SubscriptionRequest } from '../models/subscriptionRequest.model.js';
import { Notification } from '../models/notification.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sanitizeUser } from '../services/auth.service.js';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env.js';

// =========================================================================
// 1. OVERVIEW & METRICS
// =========================================================================

export const getPlatformOverview = asyncHandler(async (req, res) => {
  const now = new Date();

  // Run aggregation & counts in parallel
  const [
    totalBusinesses,
    totalUsers,
    totalProducts,
    totalTransactions,
    settings,
    plans,
    allBusinesses,
    pendingRequestsCount,
    pendingSubscriptionRequests,
    expiringTrials,
  ] = await Promise.all([
    Business.countDocuments(),
    User.countDocuments(),
    Product.countDocuments(),
    Transaction.countDocuments(),
    PlatformSettings.getSettings(),
    SubscriptionPlan.find().sort({ tierOrder: 1 }),
    Business.find({}, 'subscription createdAt').lean(),
    SubscriptionRequest.countDocuments({ status: 'PENDING' }),
    SubscriptionRequest.find({ status: 'PENDING' })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('requestedBy', 'name email username')
      .populate('businessId', 'name subscription phone address email')
      .lean(),
    Business.find({
      'subscription.status': 'TRIAL',
      'subscription.endDate': {
        $gte: now,
        $lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // Next 3 days
      },
    })
      .limit(5)
      .populate('owner', 'name email')
      .lean(),
  ]);

  // Subscription breakdown calculations
  let activeTrials = 0;
  let expiredTrials = 0;
  let activePaid = 0;
  let canceledOrPastDue = 0;

  const planDistribution = {};
  plans.forEach((p) => {
    planDistribution[p.planId] = 0;
  });

  allBusinesses.forEach((b) => {
    const planId = b.subscription?.plan || 'FREE_TRIAL';
    planDistribution[planId] = (planDistribution[planId] || 0) + 1;

    const status = b.subscription?.status || 'TRIAL';
    const endDate = b.subscription?.endDate ? new Date(b.subscription.endDate) : null;

    if (status === 'TRIAL') {
      if (endDate && endDate < now) {
        expiredTrials++;
      } else {
        activeTrials++;
      }
    } else if (status === 'ACTIVE') {
      activePaid++;
    } else {
      canceledOrPastDue++;
    }
  });

  // Recent 5 businesses & users
  const [recentBusinesses, recentUsers] = await Promise.all([
    Business.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('owner', 'name email')
      .lean(),
    User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('-password')
      .lean(),
  ]);

  // Build dynamic headlines for platform admin dashboard
  const headlines = [];

  if (pendingRequestsCount > 0) {
    headlines.push({
      id: 'pending-subscription-requests',
      type: 'ALERT',
      category: 'SUBSCRIPTION_REQUEST',
      title: `${pendingRequestsCount} Subscription Plan ${pendingRequestsCount === 1 ? 'Application' : 'Applications'} Pending`,
      description: `${pendingRequestsCount} business owner${pendingRequestsCount === 1 ? '' : 's'} applied for subscription plan changes or extensions awaiting approval.`,
      count: pendingRequestsCount,
      priority: 'HIGH',
      link: '/admin/subscriptions',
    });
  }

  if (expiringTrials.length > 0) {
    headlines.push({
      id: 'expiring-trials',
      type: 'WARNING',
      category: 'TRIAL_EXPIRY',
      title: `${expiringTrials.length} Free Trial${expiringTrials.length === 1 ? '' : 's'} Expiring in 72 Hours`,
      description: `${expiringTrials.length} tenant business${expiringTrials.length === 1 ? '' : 'es'} have evaluation trials concluding within the next 3 days.`,
      count: expiringTrials.length,
      priority: 'MEDIUM',
      link: '/admin/businesses?status=TRIAL',
    });
  }

  if (expiredTrials > 0) {
    headlines.push({
      id: 'expired-trials',
      type: 'INFO',
      category: 'TRIAL_EXPIRED',
      title: `${expiredTrials} Expired Trial${expiredTrials.length === 1 ? '' : 's'}`,
      description: `${expiredTrials} business${expiredTrials === 1 ? '' : 'es'} with lapsed evaluation periods requiring upgrade or outreach.`,
      count: expiredTrials,
      priority: 'LOW',
      link: '/admin/businesses?status=TRIAL',
    });
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        metrics: {
          totalBusinesses,
          totalUsers,
          totalProducts,
          totalTransactions,
          activeTrials,
          expiredTrials,
          activePaid,
          canceledOrPastDue,
        },
        planDistribution,
        settings,
        plans,
        recentBusinesses,
        recentUsers,
        headlines,
        pendingRequestsCount,
        pendingSubscriptionRequests,
        expiringTrials,
      },
      'Platform overview metrics fetched successfully'
    )
  );
});

// =========================================================================
// 2. BUSINESS MANAGEMENT
// =========================================================================

export const getAllBusinesses = asyncHandler(async (req, res) => {
  const { search, status, plan, page = 1, limit = 50 } = req.query;

  const query = {};

  if (search && search.trim()) {
    query.$or = [
      { name: { $regex: search.trim(), $options: 'i' } },
      { email: { $regex: search.trim(), $options: 'i' } },
      { category: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  if (status && status.trim() !== 'ALL') {
    query['subscription.status'] = status.trim().toUpperCase();
  }

  if (plan && plan.trim() !== 'ALL') {
    query['subscription.plan'] = plan.trim().toUpperCase();
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [businesses, total] = await Promise.all([
    Business.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('owner', 'name email username role')
      .lean(),
    Business.countDocuments(query),
  ]);

  // Enrich with product count and remaining trial days
  const now = new Date();
  const enriched = await Promise.all(
    businesses.map(async (b) => {
      const productCount = await Product.countDocuments({ businessId: b._id });
      const endDate = b.subscription?.endDate ? new Date(b.subscription.endDate) : null;
      let daysRemaining = 0;
      let isExpired = false;

      if (endDate) {
        const diffMs = endDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysRemaining < 0) {
          isExpired = true;
          daysRemaining = 0;
        }
      }

      return {
        ...b,
        productCount,
        memberCount: b.members?.length || 0,
        daysRemaining,
        isExpired,
      };
    })
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        businesses: enriched,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      'Businesses fetched successfully'
    )
  );
});

export const getBusinessById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const business = await Business.findById(id)
    .populate('owner', 'name email username role')
    .populate('members.user', 'name email username role')
    .lean();

  if (!business) {
    throw new ApiError(404, 'Business not found');
  }

  const [productCount, transactionCount] = await Promise.all([
    Product.countDocuments({ businessId: business._id }),
    Transaction.countDocuments({ businessId: business._id }),
  ]);

  const now = new Date();
  const endDate = business.subscription?.endDate ? new Date(business.subscription.endDate) : null;
  let daysRemaining = 0;
  let isExpired = false;

  if (endDate) {
    const diffMs = endDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) {
      isExpired = true;
      daysRemaining = 0;
    }
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        business: {
          ...business,
          productCount,
          transactionCount,
          daysRemaining,
          isExpired,
        },
      },
      'Business details fetched successfully'
    )
  );
});

export const updateBusiness = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, category, currency, address, phone, email, taxNumber } = req.body;

  const updateFields = {};
  if (name) updateFields.name = name.trim();
  if (category) updateFields.category = category.trim();
  if (currency) updateFields.currency = currency.toUpperCase().trim();
  if (address !== undefined) updateFields.address = address.trim();
  if (phone !== undefined) updateFields.phone = phone.trim();
  if (email !== undefined) updateFields.email = email.toLowerCase().trim();
  if (taxNumber !== undefined) updateFields.taxNumber = taxNumber.trim();

  const business = await Business.findByIdAndUpdate(id, updateFields, {
    new: true,
    runValidators: true,
  }).populate('owner', 'name email username');

  if (!business) {
    throw new ApiError(404, 'Business not found');
  }

  res.status(200).json(new ApiResponse(200, { business }, 'Business updated successfully'));
});

export const updateBusinessSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { plan, status, extendDays, customEndDate, startDate } = req.body;

  const business = await Business.findById(id);
  if (!business) {
    throw new ApiError(404, 'Business not found');
  }

  if (plan) {
    business.subscription.plan = plan.toUpperCase().trim();
  }

  if (status) {
    business.subscription.status = status.toUpperCase().trim();
  }

  if (startDate) {
    business.subscription.startDate = new Date(startDate);
  }

  // Handle trial extension or date change
  if (extendDays && Number(extendDays) > 0) {
    const currentEnd = business.subscription.endDate
      ? new Date(business.subscription.endDate)
      : new Date();
    // If already expired in past, extend starting from now
    const baseDate = currentEnd > new Date() ? currentEnd : new Date();
    business.subscription.endDate = new Date(
      baseDate.getTime() + Number(extendDays) * 24 * 60 * 60 * 1000
    );
  } else if (customEndDate) {
    business.subscription.endDate = new Date(customEndDate);
  }

  await business.save();

  res.status(200).json(
    new ApiResponse(200, { business }, 'Business subscription updated successfully')
  );
});

export const deleteBusiness = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const business = await Business.findById(id);
  if (!business) {
    throw new ApiError(404, 'Business not found');
  }

  // Clean up references from users associated with this business
  await User.updateMany({ businessId: business._id }, { $set: { businessId: null } });

  // Delete business products & transactions for clean multi-tenant isolation
  await Product.deleteMany({ businessId: business._id });
  await Transaction.deleteMany({ businessId: business._id });
  await Business.findByIdAndDelete(id);

  res.status(200).json(new ApiResponse(200, null, 'Business and associated records deleted'));
});

// =========================================================================
// 3. USER MANAGEMENT
// =========================================================================

export const getAllUsers = asyncHandler(async (req, res) => {
  const { search, role, isActive, kycStatus, page = 1, limit = 50 } = req.query;

  const query = {};

  if (search && search.trim()) {
    query.$or = [
      { name: { $regex: search.trim(), $options: 'i' } },
      { email: { $regex: search.trim(), $options: 'i' } },
      { username: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  if (role && role.trim() !== 'ALL') {
    query.role = role.trim().toUpperCase();
  }

  if (isActive !== undefined && isActive !== 'ALL') {
    query.isActive = isActive === 'true' || isActive === true;
  }

  if (kycStatus && kycStatus.trim() !== 'ALL') {
    query['kyc.status'] = kycStatus.trim().toUpperCase();
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('businessId', 'name category subscription')
      .lean(),
    User.countDocuments(query),
  ]);

  const sanitizedUsers = users.map(sanitizeUser);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        users: sanitizedUsers,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      'Users fetched successfully'
    )
  );
});

export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).populate('businessId').lean();

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json(new ApiResponse(200, { user: sanitizeUser(user) }, 'User details fetched'));
});

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, username, role, isActive, newPassword } = req.body;

  const user = await User.findById(id).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (name) user.name = name.trim();
  if (email) user.email = email.toLowerCase().trim();
  if (username !== undefined) user.username = username ? username.toLowerCase().trim() : undefined;
  if (role) user.role = role.toUpperCase();
  if (isActive !== undefined) user.isActive = Boolean(isActive);

  if (newPassword) {
    if (newPassword.length < 6) {
      throw new ApiError(400, 'New password must be at least 6 characters');
    }
    const salt = await bcrypt.genSalt(ENV.BCRYPT_SALT_ROUNDS);
    user.password = await bcrypt.hash(newPassword, salt);
  }

  await user.save();

  res.status(200).json(
    new ApiResponse(200, { user: sanitizeUser(user) }, 'User updated successfully')
  );
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user._id.toString() === id) {
    throw new ApiError(400, 'Cannot delete your own platform administrator account');
  }

  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json(new ApiResponse(200, null, 'User deleted successfully'));
});

// =========================================================================
// 4. SUBSCRIPTION PLANS (DYNAMIC 3+ TIERS MANAGEMENT)
// =========================================================================

export const getAllPlans = asyncHandler(async (req, res) => {
  const plans = await SubscriptionPlan.find().sort({ tierOrder: 1 }).lean();
  res.status(200).json(new ApiResponse(200, { plans }, 'Subscription plans fetched'));
});

export const createPlan = asyncHandler(async (req, res) => {
  const {
    planId,
    name,
    description,
    tierOrder,
    currency = 'NPR',
    monthlyPriceNPR,
    monthlyPriceUSD,
    yearlyPriceUSD,
    maxProducts,
    maxMembers,
    features,
    badgeText,
    isDefaultTrial,
    isActive,
  } = req.body;

  if (!planId || !name) {
    throw new ApiError(400, 'planId and name are required');
  }

  const existing = await SubscriptionPlan.findOne({
    planId: planId.toUpperCase().trim(),
  });
  if (existing) {
    throw new ApiError(409, 'A plan with this ID already exists');
  }

  if (isDefaultTrial) {
    await SubscriptionPlan.updateMany({}, { isDefaultTrial: false });
  }

  const resolvedPrice = Number(monthlyPriceNPR) || Number(monthlyPriceUSD) || 0;

  const plan = await SubscriptionPlan.create({
    planId: planId.toUpperCase().trim(),
    name: name.trim(),
    description: description ? description.trim() : '',
    tierOrder: Number(tierOrder) || 1,
    currency: currency || 'NPR',
    monthlyPriceNPR: resolvedPrice,
    monthlyPriceUSD: resolvedPrice,
    yearlyPriceUSD: Number(yearlyPriceUSD) || resolvedPrice * 10,
    maxProducts: Number(maxProducts) ?? 100,
    maxMembers: Number(maxMembers) ?? 3,
    features: Array.isArray(features) ? features : [],
    badgeText: badgeText ? badgeText.trim() : '',
    isDefaultTrial: Boolean(isDefaultTrial),
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  if (isDefaultTrial) {
    const settings = await PlatformSettings.getSettings();
    settings.trialConfig.trialPlanId = plan.planId;
    settings.trialConfig.trialTierOrder = plan.tierOrder;
    await settings.save();
  }

  res.status(201).json(new ApiResponse(201, { plan }, 'Subscription plan created successfully'));
});

export const updatePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    tierOrder,
    currency,
    monthlyPriceNPR,
    monthlyPriceUSD,
    yearlyPriceUSD,
    maxProducts,
    maxMembers,
    features,
    badgeText,
    isDefaultTrial,
    isActive,
  } = req.body;

  const plan = await SubscriptionPlan.findById(id);
  if (!plan) {
    throw new ApiError(404, 'Subscription plan not found');
  }

  if (name) plan.name = name.trim();
  if (description !== undefined) plan.description = description.trim();
  if (tierOrder !== undefined) plan.tierOrder = Number(tierOrder);
  if (currency) plan.currency = currency;
  if (monthlyPriceNPR !== undefined) {
    plan.monthlyPriceNPR = Number(monthlyPriceNPR);
    plan.monthlyPriceUSD = Number(monthlyPriceNPR);
  } else if (monthlyPriceUSD !== undefined) {
    plan.monthlyPriceUSD = Number(monthlyPriceUSD);
    plan.monthlyPriceNPR = Number(monthlyPriceUSD);
  }
  if (yearlyPriceUSD !== undefined) plan.yearlyPriceUSD = Number(yearlyPriceUSD);
  if (maxProducts !== undefined) plan.maxProducts = Number(maxProducts);
  if (maxMembers !== undefined) plan.maxMembers = Number(maxMembers);
  if (features && Array.isArray(features)) plan.features = features;
  if (badgeText !== undefined) plan.badgeText = badgeText.trim();
  if (isActive !== undefined) plan.isActive = Boolean(isActive);

  if (isDefaultTrial) {
    await SubscriptionPlan.updateMany({ _id: { $ne: plan._id } }, { isDefaultTrial: false });
    plan.isDefaultTrial = true;

    // Synchronize with platform settings
    const settings = await PlatformSettings.getSettings();
    settings.trialConfig.trialPlanId = plan.planId;
    settings.trialConfig.trialTierOrder = plan.tierOrder;
    await settings.save();
  }

  await plan.save();

  res.status(200).json(new ApiResponse(200, { plan }, 'Subscription plan updated successfully'));
});

export const deletePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const plan = await SubscriptionPlan.findById(id);

  if (!plan) {
    throw new ApiError(404, 'Subscription plan not found');
  }

  // Prevent deleting if businesses are actively assigned to it
  const activeCount = await Business.countDocuments({ 'subscription.plan': plan.planId });
  if (activeCount > 0) {
    throw new ApiError(
      400,
      `Cannot delete this plan because ${activeCount} business(es) are currently subscribed to it. You can mark it inactive instead.`
    );
  }

  await SubscriptionPlan.findByIdAndDelete(id);
  res.status(200).json(new ApiResponse(200, null, 'Subscription plan removed'));
});

export const setDefaultTrialPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const plan = await SubscriptionPlan.findById(id);

  if (!plan) {
    throw new ApiError(404, 'Subscription plan not found');
  }

  // Reset all and set this one
  await SubscriptionPlan.updateMany({}, { isDefaultTrial: false });
  plan.isDefaultTrial = true;
  await plan.save();

  // Sync to Platform Settings
  const settings = await PlatformSettings.getSettings();
  settings.trialConfig.trialPlanId = plan.planId;
  settings.trialConfig.trialTierOrder = plan.tierOrder;
  await settings.save();

  res.status(200).json(
    new ApiResponse(
      200,
      { plan, trialConfig: settings.trialConfig },
      `Default trial tier updated to: ${plan.name}`
    )
  );
});

// =========================================================================
// 5. PLATFORM SETTINGS & TRIAL SYSTEM CONFIGURATION
// =========================================================================

export const getPlatformSettings = asyncHandler(async (req, res) => {
  const settings = await PlatformSettings.getSettings();
  const plans = await SubscriptionPlan.find({ isActive: true }).sort({ tierOrder: 1 }).lean();

  res.status(200).json(
    new ApiResponse(200, { settings, availablePlans: plans }, 'Platform settings fetched')
  );
});

export const updatePlatformSettings = asyncHandler(async (req, res) => {
  const {
    platformName,
    allowRegistrations,
    maintenanceMode,
    supportEmail,
    noticeBanner,
    trialConfig,
  } = req.body;

  const settings = await PlatformSettings.getSettings();

  if (platformName) settings.platformName = platformName.trim();
  if (allowRegistrations !== undefined) settings.allowRegistrations = Boolean(allowRegistrations);
  if (maintenanceMode !== undefined) settings.maintenanceMode = Boolean(maintenanceMode);
  if (supportEmail) settings.supportEmail = supportEmail.toLowerCase().trim();

  if (noticeBanner) {
    settings.noticeBanner = {
      active: Boolean(noticeBanner.active),
      message: noticeBanner.message ? noticeBanner.message.trim() : '',
      level: noticeBanner.level || 'info',
    };
  }

  // Dynamic Trial System updates
  if (trialConfig) {
    if (trialConfig.enabled !== undefined) {
      settings.trialConfig.enabled = Boolean(trialConfig.enabled);
    }
    if (trialConfig.durationDays !== undefined) {
      const days = Number(trialConfig.durationDays);
      if (days < 1 || days > 365) {
        throw new ApiError(400, 'Trial duration must be between 1 and 365 days');
      }
      settings.trialConfig.durationDays = days;
    }
    if (trialConfig.trialPlanId) {
      const plan = await SubscriptionPlan.findOne({
        planId: trialConfig.trialPlanId.toUpperCase().trim(),
      });
      if (!plan) {
        throw new ApiError(400, `Plan '${trialConfig.trialPlanId}' does not exist`);
      }
      settings.trialConfig.trialPlanId = plan.planId;
      settings.trialConfig.trialTierOrder = plan.tierOrder;

      // Update isDefaultTrial on plans
      await SubscriptionPlan.updateMany({}, { isDefaultTrial: false });
      plan.isDefaultTrial = true;
      await plan.save();
    } else if (trialConfig.trialTierOrder !== undefined) {
      const plan = await SubscriptionPlan.findOne({
        tierOrder: Number(trialConfig.trialTierOrder),
      });
      if (plan) {
        settings.trialConfig.trialTierOrder = plan.tierOrder;
        settings.trialConfig.trialPlanId = plan.planId;

        await SubscriptionPlan.updateMany({}, { isDefaultTrial: false });
        plan.isDefaultTrial = true;
        await plan.save();
      }
    }
  }

  await settings.save();

  res.status(200).json(
    new ApiResponse(200, { settings }, 'Platform settings and trial configuration updated')
  );
});

// =========================================================================
// 6. PUBLIC ACTIVE PLANS ENDPOINT (FOR TENANT CLIENTS)
// =========================================================================

export const getPublicPlans = asyncHandler(async (req, res) => {
  const [plans, settings] = await Promise.all([
    SubscriptionPlan.find({ isActive: true }).sort({ tierOrder: 1 }).lean(),
    PlatformSettings.getSettings(),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        plans,
        trial: settings.trialConfig,
      },
      'Active plans fetched'
    )
  );
});

// =========================================================================
// 7. SUBSCRIPTION APPLICATIONS & APPROVAL WORKFLOW
// =========================================================================

export const getAllSubscriptionRequests = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 50 } = req.query;

  const query = {};

  if (status && status.trim() !== 'ALL') {
    query.status = status.trim().toUpperCase();
  }

  if (search && search.trim()) {
    query.$or = [
      { businessName: { $regex: search.trim(), $options: 'i' } },
      { requestedPlan: { $regex: search.trim(), $options: 'i' } },
      { requestedPlanName: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [requests, total] = await Promise.all([
    SubscriptionRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('requestedBy', 'name email username')
      .populate('businessId', 'name category subscription phone address email')
      .populate('processedBy', 'name email username')
      .lean(),
    SubscriptionRequest.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        requests,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      'Subscription requests fetched successfully'
    )
  );
});

export const approveSubscriptionRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { adminNotes } = req.body;

  const request = await SubscriptionRequest.findById(id);
  if (!request) {
    throw new ApiError(404, 'Subscription request not found');
  }

  if (request.status !== 'PENDING') {
    throw new ApiError(400, `This request has already been ${request.status.toLowerCase()}`);
  }

  const now = new Date();
  let business = null;

  if (request.businessId) {
    business = await Business.findById(request.businessId);
    if (business) {
      if (request.action === 'EXTEND') {
        const days = Number(request.extendDays) || 14;
        const currentEnd = business.subscription?.endDate
          ? new Date(business.subscription.endDate)
          : now;
        const baseDate = currentEnd > now ? currentEnd : now;
        business.subscription.endDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
        if (business.subscription.status === 'PAST_DUE' || business.subscription.status === 'CANCELED') {
          business.subscription.status = 'ACTIVE';
        }
      } else {
        // CHANGE or ACTIVATE
        business.subscription.plan = request.requestedPlan;
        business.subscription.status = 'ACTIVE';
        business.subscription.startDate = now;
        // 30 days subscription duration
        business.subscription.endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
      await business.save();
    }
  }

  // Also update user's account-level subscription
  const user = await User.findById(request.requestedBy);
  if (user) {
    user.subscriptionPlan = request.requestedPlan;
    user.subscriptionStatus = 'ACTIVE';
    user.subscriptionStartDate = user.subscriptionStartDate || now;
    const durationDays = request.action === 'EXTEND' ? (Number(request.extendDays) || 14) : 30;
    const baseDate = user.subscriptionEndDate && new Date(user.subscriptionEndDate) > now ? new Date(user.subscriptionEndDate) : now;
    user.subscriptionEndDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    await user.save();
  }

  // Mark request approved
  request.status = 'APPROVED';
  request.processedBy = req.user._id;
  request.processedAt = now;
  if (adminNotes && adminNotes.trim()) {
    request.adminNotes = adminNotes.trim();
  }
  await request.save();

  // Mark related platform admin notifications for this request as read
  await Notification.updateMany(
    { 'data.requestId': request._id, recipient: req.user._id },
    { isRead: true }
  );

  // Notify the subscriber
  await Notification.create({
    recipient: request.requestedBy,
    sender: req.user._id,
    businessId: business ? business._id : null,
    title: 'Subscription Request Approved 🎉',
    message: `Your request to ${
      request.action === 'EXTEND'
        ? `extend your subscription by ${request.extendDays} days`
        : `switch plan to ${request.requestedPlanName || request.requestedPlan}`
    } has been approved by the platform administrator.`,
    type: 'SUBSCRIPTION_APPROVED',
    data: {
      requestId: request._id,
      businessName: request.businessName,
      planId: request.requestedPlan,
      planName: request.requestedPlanName,
      action: request.action,
    },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      { request, business, user: user ? sanitizeUser(user) : null },
      `Subscription request approved. ${request.businessName} plan updated successfully.`
    )
  );
});

export const rejectSubscriptionRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { adminNotes } = req.body;

  const request = await SubscriptionRequest.findById(id);
  if (!request) {
    throw new ApiError(404, 'Subscription request not found');
  }

  if (request.status !== 'PENDING') {
    throw new ApiError(400, `This request has already been ${request.status.toLowerCase()}`);
  }

  const now = new Date();
  request.status = 'REJECTED';
  request.processedBy = req.user._id;
  request.processedAt = now;
  if (adminNotes && adminNotes.trim()) {
    request.adminNotes = adminNotes.trim();
  }
  await request.save();

  // Mark related platform admin notifications for this request as read
  await Notification.updateMany(
    { 'data.requestId': request._id, recipient: req.user._id },
    { isRead: true }
  );

  // Notify the subscriber
  await Notification.create({
    recipient: request.requestedBy,
    sender: req.user._id,
    businessId: request.businessId || null,
    title: 'Subscription Request Declined',
    message: `Your subscription request for "${request.requestedPlanName || request.requestedPlan}" was declined.${
      adminNotes && adminNotes.trim() ? ` Note: "${adminNotes.trim()}"` : ' Please contact support for details.'
    }`,
    type: 'SUBSCRIPTION_REJECTED',
    data: {
      requestId: request._id,
      businessName: request.businessName,
      planId: request.requestedPlan,
      planName: request.requestedPlanName,
      action: request.action,
    },
  });

  res.status(200).json(
    new ApiResponse(200, { request }, 'Subscription request has been declined.')
  );
});

// =========================================================================
// 8. USER KYC DOCUMENT VALIDATION (PLATFORM COMPLIANCE APPROVAL / REJECTION)
// =========================================================================

export const getUserKyc = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id)
    .populate('businessId', 'name category')
    .populate('kyc.reviewedBy', 'name email')
    .lean();

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: sanitizeUser(user),
        kyc: user.kyc,
      },
      'User KYC details fetched successfully'
    )
  );
});

export const verifyUserKyc = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  if (!['VERIFIED', 'REJECTED'].includes(status)) {
    throw new ApiError(400, 'Invalid status. Must be VERIFIED or REJECTED');
  }

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!user.kyc || (!user.kyc.frontImage && !user.kyc.backImage)) {
    throw new ApiError(400, 'User has not submitted identity documents for verification.');
  }

  const now = new Date();
  const docTypeLabel =
    user.kyc.documentType === 'DRIVING_LICENSE' ? 'Driving License' : 'Citizenship';

  user.kyc.status = status;
  user.kyc.reviewedAt = now;
  user.kyc.reviewedBy = req.user._id;

  if (status === 'VERIFIED') {
    user.kyc.rejectionReason = '';
  } else {
    user.kyc.rejectionReason = rejectionReason && rejectionReason.trim()
      ? rejectionReason.trim()
      : 'Document image quality or identification number could not be validated.';
  }

  await user.save();

  // Notify the user
  if (status === 'VERIFIED') {
    await Notification.create({
      recipient: user._id,
      sender: req.user._id,
      businessId: user.businessId || null,
      title: 'Identity Verification Approved ✅',
      message: `Congratulations! Your ${docTypeLabel} (ID: ${user.kyc.documentNumber || 'N/A'}) has been verified and approved by the platform administrator. You can now operate StockPulse with full verified status.`,
      type: 'KYC_APPROVED',
      data: {
        targetUserId: user._id,
        documentType: user.kyc.documentType,
        kycStatus: 'VERIFIED',
      },
    });
  } else {
    await Notification.create({
      recipient: user._id,
      sender: req.user._id,
      businessId: user.businessId || null,
      title: 'Identity Verification Rejected ⚠️',
      message: `Your ${docTypeLabel} verification was not approved. Reason: "${user.kyc.rejectionReason}". Please go to your profile to review and re-upload valid documents.`,
      type: 'KYC_REJECTED',
      data: {
        targetUserId: user._id,
        documentType: user.kyc.documentType,
        kycStatus: 'REJECTED',
        rejectionReason: user.kyc.rejectionReason,
      },
    });
  }

  // Mark all pending KYC notifications for this user as read
  await Notification.updateMany(
    { 'data.targetUserId': user._id, type: 'KYC_SUBMITTED' },
    { isRead: true }
  );

  res.status(200).json(
    new ApiResponse(
      200,
      { user: sanitizeUser(user) },
      `User identity document has been ${status === 'VERIFIED' ? 'approved' : 'rejected'}. Notification dispatched to user.`
    )
  );
});
