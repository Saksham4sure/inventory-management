import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  updateOnboarding,
  uploadKyc,
  searchUsers,
  getCustomerPurchases,
  getCustomerCredits,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/onboarding', authenticate, updateOnboarding);
router.post('/kyc', authenticate, uploadKyc);
router.get('/users/search', authenticate, searchUsers);
router.get('/customer/purchases', authenticate, getCustomerPurchases);
router.get('/customer/credits', authenticate, getCustomerCredits);

export default router;
