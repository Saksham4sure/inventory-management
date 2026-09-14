import { Business } from '../models/business.model.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const requireBusiness = asyncHandler(async (req, res, next) => {
  if (!req.user.businessId) {
    throw new ApiError(
      400,
      'Business setup required. Please complete business setup before accessing inventory operations.'
    );
  }

  const business = await Business.findById(req.user.businessId);
  if (!business) {
    throw new ApiError(404, 'Associated business record not found');
  }

  req.business = business;
  next();
});
