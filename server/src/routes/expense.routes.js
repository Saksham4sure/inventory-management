import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  getExpenses,
  getExpenseSummary,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../controllers/expense.controller.js';

const router = Router();

// All expense routes require standard authentication
router.use(authenticate);

router.get('/', getExpenses);
router.get('/summary', getExpenseSummary);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;
