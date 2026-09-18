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
import {
  parseMapCoordinates,
  resolveGoogleMapsUrl,
  isValidCoordinates,
} from '../utils/mapCoordinates.js';

export const setupBusiness = asyncHandler(async (req, res) => {
  const {
    name,
    category,
    currency,
    address,
    phone,
    email,
    taxNumber,
    coordinates,
    googleMapsUrl,
  } = req.body;

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

  // Verify user KYC status before permitting business configuration
  if (req.user.kyc?.status !== 'VERIFIED') {
    throw new ApiError(
      403,
      'Your identity documents (KYC) must be verified by Platform Compliance before you can configure a business profile.'
    );
  }

  // Fetch dynamic platform trial settings
  const settings = await PlatformSettings.getSettings();
  const isTrialEnabled = settings.trialConfig?.enabled ?? true;
  const trialPlanId = settings.trialConfig?.trialPlanId || 'STARTER';
  const durationDays = settings.trialConfig?.durationDays || 14;

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  let parsedCoordinates = { latitude: null, longitude: null };
  let finalMapUrl = googleMapsUrl ? googleMapsUrl.trim() : '';

  if (coordinates) {
    if (typeof coordinates === 'string') {
      const parsed = parseMapCoordinates(coordinates);
      if (parsed) {
        parsedCoordinates = { latitude: parsed.latitude, longitude: parsed.longitude };
        if (!finalMapUrl) finalMapUrl = parsed.googleMapsUrl;
      }
    } else if (typeof coordinates === 'object' && coordinates !== null) {
      const lat = parseFloat(coordinates.latitude);
      const lng = parseFloat(coordinates.longitude);
      if (isValidCoordinates(lat, lng)) {
        parsedCoordinates = { latitude: lat, longitude: lng };
      }
    }
  }

  if (finalMapUrl && (parsedCoordinates.latitude === null || parsedCoordinates.longitude === null)) {
    const parsed = parseMapCoordinates(finalMapUrl);
    if (parsed) {
      parsedCoordinates = { latitude: parsed.latitude, longitude: parsed.longitude };
    }
  }

  const business = await Business.create({
    name: name.trim(),
    category: category ? category.trim() : 'General Retail',
    currency: (currency || 'USD').toUpperCase().trim(),
    address: address ? address.trim() : '',
    coordinates: parsedCoordinates,
    googleMapsUrl: finalMapUrl,
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
  const {
    name,
    category,
    currency,
    address,
    phone,
    email,
    taxNumber,
    coordinates,
    googleMapsUrl,
  } = req.body;

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

  // Coordinates and Google Maps URL handling
  if (coordinates !== undefined) {
    if (coordinates === null || coordinates === '') {
      updateFields.coordinates = { latitude: null, longitude: null };
    } else if (typeof coordinates === 'string') {
      const parsed = parseMapCoordinates(coordinates);
      if (parsed) {
        updateFields.coordinates = { latitude: parsed.latitude, longitude: parsed.longitude };
        if (!updateFields.googleMapsUrl && parsed.googleMapsUrl) {
          updateFields.googleMapsUrl = parsed.googleMapsUrl;
        }
      }
    } else if (typeof coordinates === 'object' && coordinates !== null) {
      const lat = parseFloat(coordinates.latitude);
      const lng = parseFloat(coordinates.longitude);
      if (isValidCoordinates(lat, lng)) {
        updateFields.coordinates = { latitude: lat, longitude: lng };
      } else {
        updateFields.coordinates = { latitude: null, longitude: null };
      }
    }
  }

  if (googleMapsUrl !== undefined) {
    const trimmedUrl = (googleMapsUrl || '').trim();
    updateFields.googleMapsUrl = trimmedUrl;
    if (trimmedUrl && (!updateFields.coordinates || updateFields.coordinates.latitude === null)) {
      const parsed = parseMapCoordinates(trimmedUrl);
      if (parsed) {
        updateFields.coordinates = { latitude: parsed.latitude, longitude: parsed.longitude };
      }
    }
  }

  const business = await Business.findByIdAndUpdate(req.user.businessId, updateFields, {
    new: true,
    runValidators: true,
  });

  res.status(200).json(new ApiResponse(200, { business }, 'Business updated successfully'));
});

export const resolveMapLink = asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new ApiError(400, 'Google Maps URL or coordinates string is required');
  }

  const result = await resolveGoogleMapsUrl(url.trim());
  if (!result) {
    throw new ApiError(
      400,
      'Could not extract valid GPS coordinates from the provided Google Maps link or coordinates'
    );
  }

  res.status(200).json(
    new ApiResponse(200, result, 'Coordinates extracted successfully from Google Maps link')
  );
});

export const getBusinessSubscription = asyncHandler(async (req, res) => {
  const [plans, settings] = await Promise.all([
    SubscriptionPlan.find({ isActive: true }).sort({ tierOrder: 1 }).lean(),
    PlatformSettings.getSettings(),
  ]);

  if (!req.user.businessId) {
    const pendingRequest = await SubscriptionRequest.findOne({
      requestedBy: req.user._id,
      status: 'PENDING',
    })
      .sort({ createdAt: -1 })
      .lean();

    const userHasActiveSub = Boolean(
      req.user.subscriptionPlan && req.user.subscriptionStatus === 'ACTIVE'
    );

    let userSubscription = null;
    if (req.user.subscriptionPlan) {
      let planDetails = plans.find((p) => p.planId === req.user.subscriptionPlan) || plans[0];
      const now = new Date();
      const endDate = req.user.subscriptionEndDate ? new Date(req.user.subscriptionEndDate) : null;
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

      userSubscription = {
        plan: req.user.subscriptionPlan,
        status: req.user.subscriptionStatus || 'ACTIVE',
        startDate: req.user.subscriptionStartDate || new Date(),
        endDate,
        daysRemaining,
        isExpired,
        isTrial: false,
        isActive: userHasActiveSub && !isExpired,
        planDetails,
        usage: {
          productsCount: 0,
          membersCount: 1,
        },
      };
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          hasBusiness: false,
          hasSubscribed: userHasActiveSub,
          isOwner: true,
          businessName: `${req.user.name}'s Account`,
          subscription: userSubscription,
          pendingRequest: pendingRequest || null,
          availablePlans: plans,
          trialConfig: settings?.trialConfig,
        },
        'No business configured - user account subscription status fetched'
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

  // Prevent sending request if the business is not configured
  if (!req.user.businessId) {
    throw new ApiError(
      400,
      'A configured business profile is required to apply for or extend subscription plans. Please configure your business first.'
    );
  }

  // 1. Strict Owner Verification: only the business owner can request subscription
  if (req.user.role && req.user.role !== ROLES.OWNER && req.user.role !== ROLES.SUPER_ADMIN) {
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
      'You already have a subscription request pending review by Platform Administration. Please wait for it to be processed or cancel it before submitting a new one.'
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

  const currentPlanId = business ? business.subscription?.plan || 'FREE_TRIAL' : req.user.subscriptionPlan || 'FREE_TRIAL';
  const requestedPlanId = targetPlan ? targetPlan.planId : currentPlanId;
  const requestedPlanName = targetPlan ? targetPlan.name : currentPlanId;
  const businessLabel = business ? business.name : `${req.user.name}'s Account`;

  // 4. Create the Subscription Request
  const subRequest = await SubscriptionRequest.create({
    businessId: business ? business._id : null,
    businessName: businessLabel,
    requestedBy: req.user._id,
    action,
    currentPlan: currentPlanId,
    requestedPlan: requestedPlanId,
    requestedPlanName,
    extendDays: Number(extendDays) || 14,
    note: note ? note.trim() : '',
    status: 'PENDING',
  });

  // 5. Notify all Platform Admins in platform admin panel
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
      businessId: business ? business._id : null,
      title: `Subscription Plan Request: ${businessLabel}`,
      message: `${req.user.name} (${business ? `Owner of "${business.name}"` : 'Personal Account'}) applied to ${actionText}.${
        note && note.trim() ? ` Note: "${note.trim()}"` : ''
      }`,
      type: 'SUBSCRIPTION_REQUEST',
      data: {
        requestId: subRequest._id,
        businessName: businessLabel,
        planId: requestedPlanId,
        planName: requestedPlanName,
        action,
      },
    }));

    await Notification.insertMany(notifications);
  }

  // [Note]: Email integration skipped for now as requested. Once email provider is integrated,
  // trigger email notification to platform admins here.

  res.status(201).json(
    new ApiResponse(
      201,
      {
        request: subRequest,
      },
      'Subscription application submitted successfully! Platform Administration has been notified and will review your request.'
    )
  );
});

export const cancelSubscriptionRequest = asyncHandler(async (req, res) => {
  const request = await SubscriptionRequest.findOne({
    $or: [
      req.user.businessId ? { businessId: req.user.businessId } : null,
      { requestedBy: req.user._id },
    ].filter(Boolean),
    status: 'PENDING',
  });

  if (!request) {
    throw new ApiError(404, 'No pending subscription request found to cancel');
  }

  request.status = 'CANCELLED';
  await request.save();

  // Mark platform admin notifications for this request as read
  await Notification.updateMany(
    { 'data.requestId': request._id },
    { isRead: true }
  );

  res.status(200).json(
    new ApiResponse(200, { request }, 'Subscription application cancelled successfully')
  );
});

