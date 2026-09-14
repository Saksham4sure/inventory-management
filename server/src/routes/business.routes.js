import { Router } from 'express';
import {
  setupBusiness,
  getMyBusiness,
  updateBusiness,
} from '../controllers/business.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { requireBusiness } from '../middlewares/business.middleware.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Setup initial business after registration
router.post('/setup', authenticate, setupBusiness);

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

export default router;
