import { Business } from '../models/business.model.js';
import { User } from '../models/user.model.js';
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

  const business = await Business.create({
    name: name.trim(),
    category: category ? category.trim() : 'General Retail',
    currency: (currency || 'USD').toUpperCase().trim(),
    address: address ? address.trim() : '',
    phone: formattedPhone,
    email: email ? email.toLowerCase().trim() : req.user.email,
    taxNumber: taxNumber ? taxNumber.trim() : '',
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

  const business = await Business.findById(req.user.businessId).populate(
    'members.user',
    'name email role'
  );

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
