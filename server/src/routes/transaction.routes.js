import { Router } from 'express';
import {
  createTransaction,
  getTransactions,
  getDashboardSummary,
  deleteTransaction,
} from '../controllers/transaction.controller.js';
import { authenticate, requireKyc } from '../middlewares/auth.middleware.js';
import { requireBusiness } from '../middlewares/business.middleware.js';

const router = Router();

router.use(authenticate, requireBusiness);

router.get('/dashboard', getDashboardSummary);
router.get('/', requireKyc, getTransactions);
router.post('/', requireKyc, createTransaction);
router.delete('/:id', requireKyc, deleteTransaction);

export default router;
