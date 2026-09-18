import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  updateOnboarding,
  uploadKyc,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/onboarding', authenticate, updateOnboarding);
router.post('/kyc', authenticate, uploadKyc);

export default router;
