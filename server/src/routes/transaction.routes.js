import { Router } from 'express';
import {
  createTransaction,
  getTransactions,
  getDashboardSummary,
} from '../controllers/transaction.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireBusiness } from '../middlewares/business.middleware.js';

const router = Router();

router.use(authenticate, requireBusiness);

router.get('/dashboard', getDashboardSummary);
router.get('/', getTransactions);
router.post('/', createTransaction);

export default router;
