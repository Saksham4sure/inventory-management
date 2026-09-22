import { Router } from 'express';
import {
  register,
  login,
  verifyEmail,
  resendVerification,
  getMe,
  updateProfile,
  updateOnboarding,
  uploadKyc,
  searchUsers,
  getCustomerPurchases,
  getCustomerCredits,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authRateLimiter, emailRateLimiter } from '../middlewares/security.middleware.js';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.get('/verify-email', verifyEmail);
router.post('/verify-email', emailRateLimiter, verifyEmail);
router.post('/resend-verification', emailRateLimiter, resendVerification);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/onboarding', authenticate, updateOnboarding);
router.post('/kyc', authenticate, uploadKyc);
router.get('/users/search', authenticate, searchUsers);
router.get('/customer/purchases', authenticate, getCustomerPurchases);
router.get('/customer/credits', authenticate, getCustomerCredits);

export default router;
