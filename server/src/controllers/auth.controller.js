import { User } from '../models/user.model.js';
import { Business } from '../models/business.model.js';
import { Transaction } from '../models/transaction.model.js';
import { Party } from '../models/party.model.js';
import { SubscriptionPlan } from '../models/subscriptionPlan.model.js';
import { Notification } from '../models/notification.model.js';
import { ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadImageToCloudinary } from '../config/cloudinary.js';
import { generateAuthToken, sanitizeUser } from '../services/auth.service.js';
import { parseMapCoordinates, isValidCoordinates } from '../utils/mapCoordinates.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, dob, userType = 'BUSINESS' } = req.body;
  const selectedType = userType === 'CUSTOMER' ? 'CUSTOMER' : 'BUSINESS';
  const assignedRole = selectedType === 'CUSTOMER' ? ROLES.USER : ROLES.OWNER;

  // 1. Full Name validation (Must contain first and last name, letters/spaces/periods/hyphens)
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new ApiError(400, 'Full name is required');
  }
  const trimmedName = name.trim();
  const nameParts = trimmedName.split(/\s+/).filter(Boolean);
  const nameRegex = /^[a-zA-Z\s.'-]+$/;

  if (trimmedName.length < 3 || nameParts.length < 2 || !nameRegex.test(trimmedName)) {
    throw new ApiError(
      400,
      'Please enter a valid full name containing both first and last name (letters only).'
    );
  }

  // 2. Email validation
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new ApiError(400, 'Email address is required');
  }
  const trimmedEmail = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    throw new ApiError(400, 'Please enter a valid email address.');
  }

  // 3. Contact Phone validation
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    throw new ApiError(400, 'Contact phone number is required');
  }
  const trimmedPhone = phone.trim();
  const phoneRegex = /^[0-9+\s()-]{7,20}$/;
  if (!phoneRegex.test(trimmedPhone)) {
    throw new ApiError(400, 'Please enter a valid contact phone number.');
  }

  // 4. Password validation
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long.');
  }

  // 5. Date of Birth (DOB) validation
  if (!dob) {
    throw new ApiError(400, 'Date of birth is required.');
  }
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) {
    throw new ApiError(400, 'Please provide a valid date of birth.');
  }
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (birthDate > today) {
    throw new ApiError(400, 'Date of birth cannot be in the future.');
  }
  if (age < 16) {
    throw new ApiError(400, 'You must be at least 16 years old to create an account.');
  }

  const existingUser = await User.findOne({ email: trimmedEmail });
  if (existingUser) {
    throw new ApiError(409, 'A user with this email already exists');
  }

  const user = await User.create({
    name: trimmedName,
    email: trimmedEmail,
    phone: trimmedPhone,
    dob: birthDate,
    password,
    userType: selectedType,
    role: assignedRole,
    onboardingStep: 1,
    onboardingCompleted: selectedType === 'CUSTOMER',
  });

  const token = generateAuthToken(user);
  const safeUser = sanitizeUser(user);

  res.status(201).json(
    new ApiResponse(
      201,
      { user: safeUser, token, hasBusiness: false },
      'User registered successfully. Please proceed to complete your profile.'
    )
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  const identifier = (email || username || '').toLowerCase().trim();

  if (!identifier || !password) {
    throw new ApiError(400, 'Username or email and password are required');
  }

  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = generateAuthToken(user);
  const safeUser = sanitizeUser(user);

  let business = null;
  if (user.businessId) {
    business = await Business.findById(user.businessId);
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: safeUser,
        token,
        hasBusiness: Boolean(user.businessId),
        business,
      },
      'Logged in successfully'
    )
  );
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  let business = null;

  if (user.businessId) {
    business = await Business.findById(user.businessId);
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: sanitizeUser(user),
        hasBusiness: Boolean(user.businessId),
        business,
      },
      'User profile fetched successfully'
    )
  );
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, location, dob, currentPassword, newPassword } = req.body;

  // Immutability Check: Email cannot be changed
  if (req.body.email && req.body.email.toLowerCase().trim() !== req.user.email) {
    throw new ApiError(400, 'Email address is permanent and cannot be changed.');
  }

  // Immutability Check: KYC document cannot be altered if already verified
  if (req.body.kyc && req.user.kyc?.frontImage && req.user.kyc?.backImage && req.user.kyc?.status === 'VERIFIED') {
    throw new ApiError(
      400,
      'Your verified identity document (Citizenship / Driving License) is immutable and cannot be changed.'
    );
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (name && name.trim()) {
    user.name = name.trim();
  }

  if (phone !== undefined) {
    user.phone = phone.trim();
  }

  if (dob) {
    const birthDate = new Date(dob);
    if (!isNaN(birthDate.getTime())) {
      user.dob = birthDate;
    }
  }

  if (location) {
    if (typeof location === 'string') {
      user.location = {
        province: user.location?.province || '',
        district: user.location?.district || '',
        municipality: user.location?.municipality || '',
        ward: user.location?.ward || '',
        street: user.location?.street || '',
        formattedAddress: location,
      };
    } else {
      user.location = {
        province: location.province !== undefined ? location.province : user.location?.province || '',
        district: location.district !== undefined ? location.district : user.location?.district || '',
        municipality: location.municipality !== undefined ? location.municipality : user.location?.municipality || '',
        ward: location.ward !== undefined ? location.ward : user.location?.ward || '',
        street: location.street !== undefined ? location.street : user.location?.street || '',
        formattedAddress: location.formattedAddress || user.location?.formattedAddress || '',
      };
    }
  }

  // If user wants to change password
  if (newPassword) {
    if (!currentPassword) {
      throw new ApiError(400, 'Current password is required to set a new password');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new ApiError(400, 'Current password does not match');
    }

    if (newPassword.length < 6) {
      throw new ApiError(400, 'New password must be at least 6 characters');
    }

    user.password = newPassword;
  }

  await user.save();

  res.status(200).json(
    new ApiResponse(200, { user: sanitizeUser(user) }, 'Profile updated successfully')
  );
});

export const uploadKyc = asyncHandler(async (req, res) => {
  const { documentType, documentNumber, frontImage, backImage } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Strict check: if already verified, it is permanent and cannot be modified
  if (user.kyc?.status === 'VERIFIED') {
    throw new ApiError(
      400,
      'Your identity document (Citizenship / Driving License) has already been verified and cannot be changed.'
    );
  }

  if (!documentNumber || !documentNumber.trim()) {
    throw new ApiError(400, 'Document identification number is required.');
  }

  if (!frontImage) {
    throw new ApiError(400, 'Front side document photo is required.');
  }

  if (!backImage) {
    throw new ApiError(400, 'Back side document photo is required.');
  }

  const isReupload = user.kyc?.status === 'REJECTED';

  // Upload to Cloudinary if configured (otherwise retains base64 or url)
  const [frontImageUrl, backImageUrl] = await Promise.all([
    uploadImageToCloudinary(frontImage, 'stockpulse_kyc'),
    uploadImageToCloudinary(backImage, 'stockpulse_kyc'),
  ]);

  user.kyc = {
    documentType: documentType === 'DRIVING_LICENSE' ? 'DRIVING_LICENSE' : 'CITIZENSHIP',
    documentNumber: documentNumber.trim(),
    frontImage: frontImageUrl,
    backImage: backImageUrl,
    status: 'PENDING',
    submittedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: '',
  };
  user.onboardingStep = Math.max(user.onboardingStep || 1, 3);

  await user.save();

  // Notify all Platform Admins about the KYC submission
  const superAdmins = await User.find({
    role: ROLES.SUPER_ADMIN,
    isActive: true,
  }).select('_id');

  const docLabel = user.kyc.documentType === 'DRIVING_LICENSE' ? 'Driving License' : 'Citizenship';

  if (superAdmins.length > 0) {
    const notifications = superAdmins.map((admin) => ({
      recipient: admin._id,
      sender: user._id,
      businessId: user.businessId || null,
      title: isReupload ? 'KYC Document Re-submitted' : 'KYC Document Submitted for Verification',
      message: `${user.name} (${user.email}) ${isReupload ? 're-submitted' : 'submitted'} their ${docLabel} (ID: ${user.kyc.documentNumber}) for identity verification.`,
      type: 'KYC_SUBMITTED',
      data: {
        targetUserId: user._id,
        userName: user.name,
        documentType: user.kyc.documentType,
        kycStatus: 'PENDING',
      },
    }));
    await Notification.insertMany(notifications);
  }

  res.status(200).json(
    new ApiResponse(
      200,
      { user: sanitizeUser(user) },
      'Identity document submitted for verification. Platform Compliance will review and validate your documents.'
    )
  );
});

export const updateOnboarding = asyncHandler(async (req, res) => {
  const { step, profile, kyc, business, skipBusiness, location, address } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // STEP 1: Address Verification (Applied across the app where user address is needed)
  if (step === 1 || profile || location || address) {
    if (profile?.name && profile.name.trim()) user.name = profile.name.trim();
    if (profile?.phone && profile.phone.trim()) user.phone = profile.phone.trim();

    const incomingLoc = profile?.location || location || address;
    if (incomingLoc) {
      if (typeof incomingLoc === 'string') {
        user.location = {
          province: user.location?.province || '',
          district: user.location?.district || '',
          municipality: user.location?.municipality || '',
          ward: user.location?.ward || '',
          street: user.location?.street || '',
          formattedAddress: incomingLoc.trim(),
        };
      } else {
        user.location = {
          province: incomingLoc.province !== undefined ? incomingLoc.province : user.location?.province || '',
          district: incomingLoc.district !== undefined ? incomingLoc.district : user.location?.district || '',
          municipality: incomingLoc.municipality !== undefined ? incomingLoc.municipality : user.location?.municipality || '',
          ward: incomingLoc.ward !== undefined ? incomingLoc.ward : user.location?.ward || '',
          street: incomingLoc.street !== undefined ? incomingLoc.street : user.location?.street || '',
          formattedAddress: incomingLoc.formattedAddress || user.location?.formattedAddress || '',
        };
      }

      // If user already has a business linked, propagate verified address to business
      if (user.businessId && user.location?.formattedAddress) {
        await Business.findByIdAndUpdate(user.businessId, {
          address: user.location.formattedAddress,
        });
      }
    }
    user.onboardingStep = Math.max(user.onboardingStep || 1, 2);
  }

  // STEP 2: KYC Details Upload
  if (step === 2 || kyc) {
    if (kyc && kyc.frontImage && kyc.backImage) {
      // Upload images to Cloudinary if configured
      const [frontImageUrl, backImageUrl] = await Promise.all([
        uploadImageToCloudinary(kyc.frontImage, 'stockpulse_kyc'),
        uploadImageToCloudinary(kyc.backImage, 'stockpulse_kyc'),
      ]);

      user.kyc = {
        documentType: kyc.documentType || 'CITIZENSHIP',
        documentNumber: (kyc.documentNumber || '').trim(),
        frontImage: frontImageUrl,
        backImage: backImageUrl,
        status: 'PENDING',
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: '',
      };

      user.onboardingCompleted = true;
      user.onboardingStep = 2;

      // Ensure business entity exists for business user with this verified address
      if (user.userType === 'BUSINESS' && !user.businessId) {
        const defaultTrialPlan =
          (await SubscriptionPlan.findOne({
            isDefaultTrial: true,
            isActive: true,
          })) ||
          (await SubscriptionPlan.findOne({ isActive: true }).sort({ tierOrder: 1 }));

        const now = new Date();
        const trialDays = 14;
        const trialEndDate = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

        const newBiz = await Business.create({
          name: `${user.name}'s Business`,
          owner: user._id,
          category: 'General Retail',
          currency: 'NPR',
          phone: user.phone || '',
          email: user.email,
          address: user.location?.formattedAddress || '',
          subscription: {
            plan: defaultTrialPlan ? defaultTrialPlan.planId : 'STARTER',
            status: 'TRIAL',
            startDate: now,
            endDate: trialEndDate,
            isTrial: true,
          },
          members: [
            {
              user: user._id,
              role: ROLES.OWNER,
              joinedAt: now,
            },
          ],
        });
        user.businessId = newBiz._id;
      }

      // Notify Platform Administrators
      const platformAdmins = await User.find({
        role: ROLES.SUPER_ADMIN,
        isActive: true,
      }).select('_id');

      const docLabel =
        user.kyc.documentType === 'DRIVING_LICENSE'
          ? 'Driving License'
          : user.kyc.documentType === 'PASSPORT'
          ? 'Passport'
          : 'Citizenship';

      if (platformAdmins.length > 0) {
        const notifications = platformAdmins.map((admin) => ({
          recipient: admin._id,
          sender: user._id,
          businessId: user.businessId || null,
          title: 'KYC Document Submitted for Verification',
          message: `${user.name} (${user.email}) submitted their ${docLabel} (ID: ${user.kyc.documentNumber}) for identity verification.`,
          type: 'KYC_SUBMITTED',
          data: {
            targetUserId: user._id,
            userName: user.name,
            documentType: user.kyc.documentType,
            kycStatus: 'PENDING',
          },
        }));
        await Notification.insertMany(notifications);
      }
    }
  }

  // Step 3: Business creation OR Skip business
  let createdBusiness = null;
  if (step === 3 || skipBusiness || business) {
    if (skipBusiness) {
      user.onboardingCompleted = true;
      user.onboardingStep = 4;
    } else if (business && business.name && business.name.trim()) {
      // Prevent business profile creation if user KYC is not verified
      if (user.kyc?.status !== 'VERIFIED') {
        throw new ApiError(
          403,
          'Your identity documents (KYC) must be verified by Platform Compliance before you can configure a business profile.'
        );
      }

      // Find default trial plan for seeding subscription
      const defaultTrialPlan =
        (await SubscriptionPlan.findOne({
          isDefaultTrial: true,
          isActive: true,
        })) ||
        (await SubscriptionPlan.findOne({ isActive: true }).sort({ tierOrder: 1 }));

      const now = new Date();
      const trialDays = 14;
      const trialEndDate = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

      let bizCoordinates = { latitude: null, longitude: null };
      let bizMapUrl = business.googleMapsUrl ? business.googleMapsUrl.trim() : '';

      if (business.coordinates) {
        if (typeof business.coordinates === 'string') {
          const parsed = parseMapCoordinates(business.coordinates);
          if (parsed) {
            bizCoordinates = { latitude: parsed.latitude, longitude: parsed.longitude };
            if (!bizMapUrl) bizMapUrl = parsed.googleMapsUrl;
          }
        } else if (typeof business.coordinates === 'object') {
          const lat = parseFloat(business.coordinates.latitude);
          const lng = parseFloat(business.coordinates.longitude);
          if (isValidCoordinates(lat, lng)) {
            bizCoordinates = { latitude: lat, longitude: lng };
          }
        }
      }

      if (bizMapUrl && (bizCoordinates.latitude === null || bizCoordinates.longitude === null)) {
        const parsed = parseMapCoordinates(bizMapUrl);
        if (parsed) {
          bizCoordinates = { latitude: parsed.latitude, longitude: parsed.longitude };
        }
      }

      // Check if user pre-subscribed to a plan prior to business creation
      const hasUserSub = Boolean(user.subscriptionPlan && user.subscriptionStatus === 'ACTIVE');

      createdBusiness = await Business.create({
        name: business.name.trim(),
        owner: user._id,
        category: business.category || 'Retail Store',
        currency: business.currency || 'NPR',
        phone: business.phone || user.phone || '',
        email: business.email || user.email,
        address: business.address || user.location?.formattedAddress || '',
        coordinates: bizCoordinates,
        googleMapsUrl: bizMapUrl,
        taxNumber: business.taxNumber || '',
        subscription: {
          plan: hasUserSub
            ? user.subscriptionPlan
            : defaultTrialPlan
            ? defaultTrialPlan.planId
            : 'STARTER',
          status: hasUserSub ? 'ACTIVE' : 'TRIAL',
          startDate: hasUserSub ? user.subscriptionStartDate || now : now,
          endDate: hasUserSub ? user.subscriptionEndDate || trialEndDate : trialEndDate,
          isTrial: !hasUserSub,
        },
        members: [
          {
            user: user._id,
            role: ROLES.OWNER,
            joinedAt: now,
          },
        ],
      });

      user.businessId = createdBusiness._id;
      user.role = ROLES.OWNER;
      user.onboardingCompleted = true;
      user.onboardingStep = 4;
    }
  }

  await user.save();

  const safeUser = sanitizeUser(user);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: safeUser,
        hasBusiness: Boolean(user.businessId),
        business:
          createdBusiness ||
          (user.businessId ? await Business.findById(user.businessId) : null),
        onboardingCompleted: user.onboardingCompleted,
      },
      'Onboarding step updated successfully'
    )
  );
});

/**
 * Search user by unique accountId or email
 * Used by POS Sale and Party creation to validate user existence
 */
export const searchUsers = asyncHandler(async (req, res) => {
  const { query } = req.query;
  if (!query || !query.trim()) {
    throw new ApiError(400, 'Search query (User ID, Account ID, or Email) is required');
  }

  const cleanQuery = query.trim();
  const normalizedUpper = cleanQuery.toUpperCase();
  const normalizedLower = cleanQuery.toLowerCase();

  const orConditions = [
    { userId: cleanQuery },
    { accountId: cleanQuery },
    { accountId: normalizedUpper },
    { email: normalizedLower },
    { username: normalizedLower },
    { phone: cleanQuery },
  ];

  if (/^[0-9a-fA-F]{24}$/.test(cleanQuery)) {
    orConditions.push({ _id: cleanQuery });
  }

  let user = await User.findOne({
    $or: orConditions,
  }).select('name email phone accountId userId userType role location');

  // Fallback: If cleanQuery matches the end of ObjectId (e.g. hex "75baa101")
  if (!user && /^[0-9a-fA-F]{6,12}$/.test(cleanQuery)) {
    const allUsers = await User.find({}).select('name email phone accountId userId userType role location');
    const matchedBySlice = allUsers.find(
      (u) => u._id.toString().toLowerCase().endsWith(normalizedLower)
    );
    if (matchedBySlice) {
      user = matchedBySlice;
    }
  }

  if (!user) {
    throw new ApiError(404, `No registered user found with User ID or email "${cleanQuery}"`);
  }

  const userObj = user.toObject ? user.toObject() : { ...user };
  if (!userObj.userId && userObj.accountId) {
    userObj.userId = userObj.accountId;
  }
  if (!userObj.accountId && userObj.userId) {
    userObj.accountId = userObj.userId;
  }

  res.status(200).json(
    new ApiResponse(200, { user: userObj }, 'User found successfully')
  );
});

/**
 * Customer Portal: Get purchases made by customer user
 */
export const getCustomerPurchases = asyncHandler(async (req, res) => {
  const user = req.user;

  // Find transactions where customer is this user or customerEmail/customerAccountId matches
  const orConditions = [
    { customer: user._id },
    { customerEmail: user.email.toLowerCase() },
  ];
  if (user.accountId) {
    orConditions.push({ customerAccountId: user.accountId });
    orConditions.push({ customerAccountId: user.accountId.toUpperCase() });
  }
  if (user.userId) {
    orConditions.push({ customerAccountId: user.userId });
  }

  const purchases = await Transaction.find({
    type: 'SALE',
    $or: orConditions,
  })
    .sort({ createdAt: -1 })
    .populate('businessId', 'name email phone currency address')
    .lean();

  res.status(200).json(
    new ApiResponse(200, { purchases }, 'Customer purchases retrieved')
  );
});

/**
 * Customer Portal: Get left-to-pay credits and ledger for customer user
 */
export const getCustomerCredits = asyncHandler(async (req, res) => {
  const user = req.user;

  // Find parties where this customer user is linked
  const partyConditions = [
    { user: user._id },
    { email: user.email.toLowerCase() },
  ];
  if (user.accountId) {
    partyConditions.push({ accountId: user.accountId });
    partyConditions.push({ accountId: user.accountId.toUpperCase() });
  }
  if (user.userId) {
    partyConditions.push({ accountId: user.userId });
  }

  const parties = await Party.find({
    $or: partyConditions,
  })
    .populate('businessId', 'name email phone currency')
    .lean();

  // Find all credit sale transactions
  const txnConditions = [
    { customer: user._id },
    { customerEmail: user.email.toLowerCase() },
  ];
  if (user.accountId) {
    txnConditions.push({ customerAccountId: user.accountId });
    txnConditions.push({ customerAccountId: user.accountId.toUpperCase() });
  }
  if (user.userId) {
    txnConditions.push({ customerAccountId: user.userId });
  }

  const creditTransactions = await Transaction.find({
    paymentMethod: 'CREDIT',
    $or: txnConditions,
  })
    .sort({ createdAt: -1 })
    .populate('businessId', 'name email phone currency')
    .lean();

  // Compute total left to pay across businesses
  const totalLeftToPay = parties.reduce((sum, p) => {
    // For customers, positive balance means they owe money to the business
    return sum + (p.currentBalance > 0 ? p.currentBalance : 0);
  }, 0);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        parties,
        creditTransactions,
        totalLeftToPay,
      },
      'Customer credits retrieved'
    )
  );
});
