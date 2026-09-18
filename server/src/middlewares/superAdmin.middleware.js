import { ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/apiError.js';

export const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication token required'));
  }

  if (req.user.role !== ROLES.SUPER_ADMIN) {
    return next(
      new ApiError(403, 'Forbidden: Platform Administrator privileges required. Access is strictly restricted.')
    );
  }

  next();
};
