import { Business } from '../models/business.model.js';
import { User } from '../models/user.model.js';
import { Product } from '../models/product.model.js';
import { SubscriptionPlan } from '../models/subscriptionPlan.model.js';
import { PlatformSettings } from '../models/platformSettings.model.js';
import { SubscriptionRequest } from '../models/subscriptionRequest.model.js';
import { Notification } from '../models/notification.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../constants/roles.js';
import { sanitizeUser } from '../services/auth.service.js';
import { validateNepaliPhone } from '../utils/phoneValidator.js';

export const setupBusiness = asyncHandler(async (req, res) => {
  const { name, category, currency, address, phone, email, taxNumber } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Business name is required');
  }

  let formattedPhone = '';
  if (phone && phone.trim()) {
    const phoneValidation = validateNepaliPhone(phone, false);
    if (!phoneValidation.isValid) {
      throw new ApiError(400, phoneValidation.error);
    }
    formattedPhone = phoneValidation.normalized;
  }

  // If user already has a business, prevent duplicate setup unless explicitly invited
  if (req.user.businessId) {
    throw new ApiError(400, 'You have already configured a business');
  }

  // Fetch dynamic platform trial settings
  const settings = await PlatformSettings.getSettings();
  const isTrialEnabled = settings.trialConfig?.enabled ?? true;
  const trialPlanId = settings.trialConfig?.trialPlanId || 'STARTER';
  const durationDays = settings.trialConfig?.durationDays || 14;

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const business = await Business.create({
    name: name.trim(),
    category: category ? category.trim() : 'General Retail',
    currency: (currency || 'USD').toUpperCase().trim(),
    address: address ? address.trim() : '',
    phone: formattedPhone,
    email: email ? email.toLowerCase().trim() : req.user.email,
    taxNumber: taxNumber ? taxNumber.trim() : '',
    subscription: {
      plan: trialPlanId,
      status: isTrialEnabled ? 'TRIAL' : 'ACTIVE',
      startDate,
      endDate,
    },
    owner: req.user._id,
    members: [
      {
        user: req.user._id,
        role: ROLES.OWNER,
        joinedAt: new Date(),
      },
    ],
  });

  // Link business to user
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      businessId: business._id,
      role: ROLES.OWNER,
    },
    { new: true }
  );

  res.status(201).json(
    new ApiResponse(
      201,
      {
        business,
        user: sanitizeUser(updatedUser),
      },
      'Business profile created successfully'
    )
  );
});

export const getMyBusiness = asyncHandler(async (req, res) => {
  if (!req.user.businessId) {
    throw new ApiError(404, 'No business configured for this user yet');
  }

  const business = await Business.findById(req.user.businessId)
    .populate('owner', 'name email role')
    .populate('members.user', 'name email role');

  if (!business) {
    throw new ApiError(404, 'Business not found');
  }

  res.status(200).json(new ApiResponse(200, { business }, 'Business details fetched'));
});

export const updateBusiness = asyncHandler(async (req, res) => {
  const { name, category, currency, address, phone, email, taxNumber } = req.body;

  const updateFields = {};
  if (name) updateFields.name = name.trim();
  if (category) updateFields.category = category.trim();
  if (currency) updateFields.currency = currency.toUpperCase().trim();
  if (address !== undefined) updateFields.address = address.trim();
  if (phone !== undefined) {
    if (phone.trim()) {
      const phoneValidation = validateNepaliPhone(phone, false);
      if (!phoneValidation.isValid) {
        throw new ApiError(400, phoneValidation.error);
      }
      updateFields.phone = phoneValidation.normalized;
    } else {
      updateFields.phone = '';
    }
  }
  if (email !== undefined) updateFields.email = email.toLowerCase().trim();
  if (taxNumber !== undefined) updateFields.taxNumber = taxNumber.trim();

  const business = await Business.findByIdAndUpdate(req.user.businessId, updateFields, {
    new: true,
    runValidators: true,
  });

  res.status(200).json(new ApiResponse(200, { business }, 'Business updated successfully'));
});

export const getBusinessSubscription = asyncHandler(async (req, res) => {
  const [plans, settings] = await Promise.all([
    SubscriptionPlan.find({ isActive: true }).sort({ tierOrder: 1 }).lean(),
    PlatformSettings.getSettings(),
  ]);

  if (!req.user.businessId) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          hasBusiness: false,
          hasSubscribed: false,
          subscription: null,
          availablePlans: plans,
          trialConfig: settings?.trialConfig,
        },
        'No business configured'
      )
    );
  }

  const business = await Business.findById(req.user.businessId).lean();
  if (!business) {
    throw new ApiError(404, 'Business not found');
  }

  const now = new Date();
  const sub = business.subscription || {};
  const currentPlanId = sub.plan || 'STARTER';

  // Find matching plan details, fallback to Tier 1 / STARTER if FREE_TRIAL or unrecognized
  let planDetails = plans.find((p) => p.planId === currentPlanId);
  if (!planDetails) {
    planDetails = plans.find((p) => p.planId === 'STARTER') || plans[0];
  }

  const endDate = sub.endDate ? new Date(sub.endDate) : null;
  const startDate = sub.startDate ? new Date(sub.startDate) : new Date(business.createdAt);

  let daysRemaining = 0;
  let isExpired = false;

  if (endDate) {
    const diffMs = endDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 0) {
      isExpired = true;
      daysRemaining = 0;
    }
  }

  const isTrial = sub.status === 'TRIAL';
  const isActive = sub.status === 'ACTIVE';
  // Has subscribed if they have an active plan or are currently in trial and not expired
  const hasSubscribed = Boolean(sub.plan && (isTrial || isActive) && !isExpired);

  const [productsCount, pendingRequest] = await Promise.all([
    Product.countDocuments({ businessId: business._id }),
    SubscriptionRequest.findOne({
      businessId: business._id,
      status: 'PENDING',
    })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const isOwner =
    req.user.role === ROLES.OWNER ||
    (business.owner && business.owner.toString() === req.user._id.toString());

  res.status(200).json(
    new ApiResponse(
      200,
      {
        hasBusiness: true,
        hasSubscribed,
        isOwner,
        businessName: business.name,
        subscription: {
          plan: currentPlanId,
          status: sub.status || 'TRIAL',
          startDate,
          endDate,
          daysRemaining,
          isExpired,
          isTrial,
          isActive,
          planDetails,
          usage: {
            productsCount,
            membersCount: business.members?.length || 1,
          },
        },
        pendingRequest: pendingRequest || null,
        availablePlans: plans,
        trialConfig: settings?.trialConfig,
      },
      'Subscription details fetched'
    )
  );
});

export const changeBusinessSubscription = asyncHandler(async (req, res) => {
  const { planId, action = 'CHANGE', extendDays = 14, note = '' } = req.body;

  // 1. Strict Owner Verification: only the business owner can request or change subscription
  if (req.user.role !== ROLES.OWNER) {
    throw new ApiError(
      403,
      'Subscription plan can be changed or extended only by the business owner. Members and managers cannot perform this action.'
    );
  }

  const business = await Business.findById(req.user.businessId);
  if (!business) {
    throw new ApiError(404, 'Business not found');
  }

  if (business.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      'Only the registered business owner is authorized to manage subscription plans.'
    );
  }

  // 2. Prevent duplicate pending requests
  const existingPending = await SubscriptionRequest.findOne({
    businessId: business._id,
    status: 'PENDING',
  });

  if (existingPending) {
    throw new ApiError(
      400,
      'You already have a subscription request pending super admin review. Please wait for it to be processed or cancel it before submitting a new one.'
    );
  }

  // 3. Validate target plan if action is CHANGE or ACTIVATE
  let targetPlan = null;
  if (planId) {
    targetPlan = await SubscriptionPlan.findOne({
      planId: planId.toUpperCase().trim(),
      isActive: true,
    });
  }

  if (!targetPlan && action !== 'EXTEND') {
    throw new ApiError(404, 'Subscription plan not found or inactive');
  }

  const currentPlanId = business.subscription?.plan || 'FREE_TRIAL';
  const requestedPlanId = targetPlan ? targetPlan.planId : currentPlanId;
  const requestedPlanName = targetPlan ? targetPlan.name : currentPlanId;

  // 4. Create the Subscription Request
  const subRequest = await SubscriptionRequest.create({
    businessId: business._id,
    businessName: business.name,
    requestedBy: req.user._id,
    action,
    currentPlan: currentPlanId,
    requestedPlan: requestedPlanId,
    requestedPlanName,
    extendDays: Number(extendDays) || 14,
    note: note ? note.trim() : '',
    status: 'PENDING',
  });

  // 5. Notify all Super Admins in platform admin panel
  const superAdmins = await User.find({
    role: ROLES.SUPER_ADMIN,
    isActive: true,
  }).select('_id email name');

  const actionText =
    action === 'EXTEND'
      ? `extend subscription (+${extendDays || 14} days)`
      : `switch plan to ${requestedPlanName}`;

  if (superAdmins.length > 0) {
    const notifications = superAdmins.map((admin) => ({
      recipient: admin._id,
      sender: req.user._id,
      businessId: business._id,
      title: `Subscription Plan Request: ${business.name}`,
      message: `${req.user.name} (Owner of "${business.name}") applied to ${actionText}.${
        note && note.trim() ? ` Note: "${note.trim()}"` : ''
      }`,
      type: 'SUBSCRIPTION_REQUEST',
      data: {
        requestId: subRequest._id,
        businessName: business.name,
        planId: requestedPlanId,
        planName: requestedPlanName,
        action,
      },
    }));

    await Notification.insertMany(notifications);
  }

  // [Note]: Email integration skipped for now as requested. Once email provider is integrated,
  // trigger email notification to platform super admins here.

  res.status(201).json(
    new ApiResponse(
      201,
      {
        request: subRequest,
      },
      'Subscription application submitted successfully! Super admin has been notified and will review your request.'
    )
  );
});

export const cancelSubscriptionRequest = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.OWNER) {
    throw new ApiError(
      403,
      'Only the business owner is authorized to cancel subscription applications.'
    );
  }

  const request = await SubscriptionRequest.findOne({
    businessId: req.user.businessId,
    status: 'PENDING',
  });

  if (!request) {
    throw new ApiError(404, 'No pending subscription request found to cancel');
  }

  request.status = 'CANCELLED';
  await request.save();

  // Mark super admin notifications for this request as read
  await Notification.updateMany(
    { 'data.requestId': request._id },
    { isRead: true }
  );

  res.status(200).json(
    new ApiResponse(200, { request }, 'Subscription application cancelled successfully')
  );
});

