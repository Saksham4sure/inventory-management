import crypto from 'crypto';
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
import { sendVerificationEmail } from '../services/email.service.js';
import { parseMapCoordinates, isValidCoordinates } from '../utils/mapCoordinates.js';
import {
  validateName,
  validateEmail,
  validatePassword,
  validateAgeOrDob,
  sanitizeString,
} from '../utils/inputValidator.js';
import { validateNepaliPhone } from '../utils/phoneValidator.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, dob, age, userType = 'BUSINESS' } = req.body;
  const selectedType = userType === 'CUSTOMER' ? 'CUSTOMER' : 'BUSINESS';
  const assignedRole = selectedType === 'CUSTOMER' ? ROLES.USER : ROLES.OWNER;

  // 1. Full Name validation (Must contain first and last name, valid characters, 3-70 chars)
  const nameResult = validateName(name);
  if (!nameResult.isValid) {
    throw new ApiError(400, nameResult.error);
  }
  const cleanName = nameResult.value;

  // 2. Email validation (Strict RFC syntax, max 254 chars, CRLF injection defense)
  const emailResult = validateEmail(email);
  if (!emailResult.isValid) {
    throw new ApiError(400, emailResult.error);
  }
  const cleanEmail = emailResult.value;

  // 3. Password validation (Production secure policy: min 8, max 128, uppercase, lowercase, number, special char)
  const passResult = validatePassword(password);
  if (!passResult.isValid) {
    throw new ApiError(400, passResult.error);
  }

  // 4. Age / Date of Birth validation (Integer 16-120 bounds, consistency verification)
  const ageDobResult = validateAgeOrDob({ age, dob, required: false });
  if (!ageDobResult.isValid) {
    throw new ApiError(400, ageDobResult.error);
  }
  const verifiedAge = ageDobResult.age;
  const verifiedDob = ageDobResult.dob;

  // 5. Contact Phone validation (Optional at initial registration, validated if provided)
  let trimmedPhone = '';
  if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
    const phoneResult = validateNepaliPhone(phone);
    if (!phoneResult.isValid) {
      throw new ApiError(400, phoneResult.error);
    }
    trimmedPhone = phoneResult.normalized;
  }

  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    if (existingUser.isEmailVerified) {
      throw new ApiError(409, 'A user with this email already exists');
    }

    // Account was created previously but email was never verified.
    // Refresh verification token, update credentials and resend verification email.
    const verificationToken = crypto.randomBytes(32).toString('hex');
    existingUser.name = cleanName;
    existingUser.password = password; // Will be hashed by pre('save') hook
    existingUser.phone = trimmedPhone;
    existingUser.dob = verifiedDob;
    existingUser.age = verifiedAge;
    existingUser.userType = selectedType;
    existingUser.role = assignedRole;
    existingUser.emailVerificationToken = verificationToken;
    existingUser.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    existingUser.onboardingStep = 1;
    existingUser.onboardingCompleted = false;
    await existingUser.save();

    try {
      await sendVerificationEmail({
        email: existingUser.email,
        name: existingUser.name,
        token: verificationToken,
      });
    } catch (emailError) {
      throw new ApiError(
        400,
        `Failed to send verification email via Brevo: ${emailError.message}`
      );
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          email: existingUser.email,
          requiresEmailVerification: true,
        },
        'A verification email has been resent to your email address. Please verify your email to proceed.'
      )
    );
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const user = await User.create({
    name: cleanName,
    email: cleanEmail,
    phone: trimmedPhone,
    dob: verifiedDob,
    age: verifiedAge,
    password,
    userType: selectedType,
    role: assignedRole,
    isEmailVerified: false,
    emailVerificationToken: verificationToken,
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    onboardingStep: 1,
    onboardingCompleted: false,
  });

  try {
    await sendVerificationEmail({
      email: user.email,
      name: user.name,
      token: verificationToken,
    });
  } catch (emailError) {
    // Clean up created record if verification email fails so user can retry
    await User.findByIdAndDelete(user._id);
    throw new ApiError(
      400,
      `Failed to send verification email via Brevo: ${emailError.message}`
    );
  }

  res.status(201).json(
    new ApiResponse(
      201,
      {
        email: user.email,
        requiresEmailVerification: true,
      },
      'Registration successful! We have sent a verification email to your address. Please verify your email to continue.'
    )
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if ((!email && !username) || !password) {
    throw new ApiError(400, 'Username or email and password are required');
  }

  if (typeof password !== 'string' || password.length > 128) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const rawId = typeof email === 'string' ? email : typeof username === 'string' ? username : '';
  const identifier = sanitizeString(rawId, 254).toLowerCase();

  if (!identifier) {
    throw new ApiError(400, 'Valid username or email is required');
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

  // Check email verification (Platform Super Admin is exempted)
  if (user.role !== ROLES.SUPER_ADMIN && user.isEmailVerified === false) {
    throw new ApiError(
      403,
      'Your email address has not been verified yet. Please check your inbox for the verification link.',
      {
        requiresEmailVerification: true,
        email: user.email,
      }
    );
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
  const { name, phone, location, dob, age, currentPassword, newPassword } = req.body;

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

  // Immutability Check: Location cannot be altered once KYC is verified
  const isKycVerified = req.user.kyc?.status === 'VERIFIED';
  if (isKycVerified && location !== undefined) {
    const existing = req.user.location || {};
    let isDifferent = false;
    if (typeof location === 'string') {
      isDifferent = location.trim() !== (existing.formattedAddress || '').trim();
    } else if (typeof location === 'object' && location !== null) {
      if (location.province !== undefined && location.province !== (existing.province || '')) isDifferent = true;
      if (location.district !== undefined && location.district !== (existing.district || '')) isDifferent = true;
      if (location.municipality !== undefined && location.municipality !== (existing.municipality || '')) isDifferent = true;
      if (location.ward !== undefined && String(location.ward) !== String(existing.ward || '')) isDifferent = true;
      if (location.street !== undefined && location.street !== (existing.street || '')) isDifferent = true;
    }
    if (isDifferent) {
      throw new ApiError(
        400,
        'Your residential location is permanently locked and cannot be changed after your KYC has been verified.'
      );
    }
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (name !== undefined) {
    const nameResult = validateName(name);
    if (!nameResult.isValid) {
      throw new ApiError(400, nameResult.error);
    }
    user.name = nameResult.value;
  }

  if (phone !== undefined && String(phone).trim() !== '') {
    const phoneResult = validateNepaliPhone(phone);
    if (!phoneResult.isValid) {
      throw new ApiError(400, phoneResult.error);
    }
    user.phone = phoneResult.normalized;
  }

  if (dob !== undefined || age !== undefined) {
    const ageDobResult = validateAgeOrDob({ age, dob, required: false });
    if (!ageDobResult.isValid) {
      throw new ApiError(400, ageDobResult.error);
    }
    if (ageDobResult.dob) user.dob = ageDobResult.dob;
    if (ageDobResult.age) user.age = ageDobResult.age;
  }

  if (location && !isKycVerified) {
    if (typeof location === 'string') {
      user.location = {
        province: user.location?.province || '',
        district: user.location?.district || '',
        municipality: user.location?.municipality || '',
        ward: user.location?.ward || '',
        street: user.location?.street || '',
        formattedAddress: sanitizeString(location, 250),
      };
    } else {
      user.location = {
        province: location.province !== undefined ? sanitizeString(location.province, 50) : user.location?.province || '',
        district: location.district !== undefined ? sanitizeString(location.district, 50) : user.location?.district || '',
        municipality: location.municipality !== undefined ? sanitizeString(location.municipality, 50) : user.location?.municipality || '',
        ward: location.ward !== undefined ? sanitizeString(location.ward, 20) : user.location?.ward || '',
        street: location.street !== undefined ? sanitizeString(location.street, 100) : user.location?.street || '',
        formattedAddress: sanitizeString(location.formattedAddress || user.location?.formattedAddress || '', 250),
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

    const passResult = validatePassword(newPassword);
    if (!passResult.isValid) {
      throw new ApiError(400, passResult.error);
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

  // STEP 1: Address & Contact Verification (Applied across the app where user address is needed)
  if (step === 1 || profile || location || address) {
    if (profile?.name) {
      const nameResult = validateName(profile.name);
      if (!nameResult.isValid) {
        throw new ApiError(400, nameResult.error);
      }
      user.name = nameResult.value;
    }

    const incomingPhone = profile?.phone || req.body.phone;
    if (incomingPhone !== undefined && incomingPhone !== null && String(incomingPhone).trim()) {
      const phoneResult = validateNepaliPhone(incomingPhone);
      if (!phoneResult.isValid) {
        throw new ApiError(400, phoneResult.error);
      }
      user.phone = phoneResult.normalized;
    }

    const incomingDob = profile?.dob || req.body.dob;
    const incomingAge = profile?.age || req.body.age;
    if (incomingDob !== undefined || incomingAge !== undefined) {
      const ageDobResult = validateAgeOrDob({ age: incomingAge, dob: incomingDob, required: false });
      if (!ageDobResult.isValid) {
        throw new ApiError(400, ageDobResult.error);
      }
      if (ageDobResult.dob) user.dob = ageDobResult.dob;
      if (ageDobResult.age) user.age = ageDobResult.age;
    }

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

/**
 * Verify user email address with the one-time token from Brevo email
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.query.token || req.body.token;

  if (!token || typeof token !== 'string' || !token.trim()) {
    throw new ApiError(400, 'Verification token is required.');
  }

  const cleanToken = token.trim();
  // Protection against malformed tokens
  if (cleanToken.length < 10 || cleanToken.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(cleanToken)) {
    throw new ApiError(400, 'Invalid verification token format.');
  }

  const user = await User.findOne({
    emailVerificationToken: cleanToken,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new ApiError(
      400,
      'The verification link is invalid or has expired. Please request a new verification email.'
    );
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpires = null;
  await user.save();

  const authToken = generateAuthToken(user);
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
        token: authToken,
        hasBusiness: Boolean(user.businessId),
        business,
      },
      'Email verified successfully. Welcome to StockPulse!'
    )
  );
});

/**
 * Resend verification email to user
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const emailResult = validateEmail(email);
  if (!emailResult.isValid) {
    throw new ApiError(400, emailResult.error);
  }

  const trimmedEmail = emailResult.value;
  const user = await User.findOne({ email: trimmedEmail });

  if (!user) {
    // Return friendly generic message to avoid email enumeration
    return res.status(200).json(
      new ApiResponse(
        200,
        null,
        'If an unverified account with this email exists, a new verification link has been sent.'
      )
    );
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, 'This account has already been verified. Please sign in directly.');
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  try {
    await sendVerificationEmail({
      email: user.email,
      name: user.name,
      token: verificationToken,
    });
  } catch (emailError) {
    throw new ApiError(
      400,
      `Failed to resend verification email via Brevo: ${emailError.message}`
    );
  }

  res.status(200).json(
    new ApiResponse(
      200,
      { email: user.email },
      'A new verification link has been sent to your email. Please check your inbox.'
    )
  );
});

