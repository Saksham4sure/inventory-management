import { Router } from 'express';
import {
  setupBusiness,
  getMyBusiness,
  updateBusiness,
  resolveMapLink,
  getBusinessSubscription,
  changeBusinessSubscription,
  cancelSubscriptionRequest,
} from '../controllers/business.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { requireBusiness } from '../middlewares/business.middleware.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Setup initial business after registration
router.post('/setup', authenticate, setupBusiness);

// Resolve Google Maps link to coordinates
router.post('/resolve-map-link', authenticate, resolveMapLink);

// Get current user's business profile
router.get('/my-business', authenticate, requireBusiness, getMyBusiness);

// Update business details (Owner and Admin only)
router.put(
  '/my-business',
  authenticate,
  requireBusiness,
  authorize(ROLES.OWNER, ROLES.ADMIN),
  updateBusiness
);

// Subscription details & plan switching for tenant users
// Strictly limited to Business OWNER only (no managers or members)
router.get('/subscription', authenticate, getBusinessSubscription);
router.post(
  '/subscription/change',
  authenticate,
  requireBusiness,
  authorize(ROLES.OWNER),
  changeBusinessSubscription
);
router.post(
  '/subscription/cancel-request',
  authenticate,
  requireBusiness,
  authorize(ROLES.OWNER),
  cancelSubscriptionRequest
);

export default router;
