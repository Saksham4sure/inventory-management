import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireSuperAdmin } from '../middlewares/superAdmin.middleware.js';
import {
  getPlatformOverview,
  getAllBusinesses,
  getBusinessById,
  updateBusiness,
  updateBusinessSubscription,
  deleteBusiness,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  setDefaultTrialPlan,
  getPlatformSettings,
  updatePlatformSettings,
  getAllSubscriptionRequests,
  approveSubscriptionRequest,
  rejectSubscriptionRequest,
  getUserKyc,
  verifyUserKyc,
} from '../controllers/admin.controller.js';

const router = Router();

// Strict security: all platform admin routes require valid authentication & SUPER_ADMIN role
router.use(authenticate, requireSuperAdmin);

// 1. Overview & Metrics
router.get('/overview', getPlatformOverview);

// 2. Businesses Management
router.get('/businesses', getAllBusinesses);
router.get('/businesses/:id', getBusinessById);
router.patch('/businesses/:id', updateBusiness);
router.patch('/businesses/:id/subscription', updateBusinessSubscription);
router.delete('/businesses/:id', deleteBusiness);

// 3. Users Management & Identity KYC Validation
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.get('/users/:id/kyc', getUserKyc);
router.post('/users/:id/verify-kyc', verifyUserKyc);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// 4. Dynamic Subscription Tiers Management
router.get('/plans', getAllPlans);
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);
router.post('/plans/:id/make-trial', setDefaultTrialPlan);

// 5. Dynamic Platform Settings & Trial System
router.get('/settings', getPlatformSettings);
router.put('/settings', updatePlatformSettings);

// 6. Subscription Applications & Approval Workflow
router.get('/subscription-requests', getAllSubscriptionRequests);
router.post('/subscription-requests/:id/approve', approveSubscriptionRequest);
router.post('/subscription-requests/:id/reject', rejectSubscriptionRequest);

export default router;
