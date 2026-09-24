import { Router } from 'express';
import {
  getParties,
  getPartyById,
  createParty,
  updateParty,
  deleteParty,
  recordCreditTransaction,
  getPartyCreditHistory,
  getPartiesCreditSummary,
  respondToPartyInvitation,
} from '../controllers/party.controller.js';
import { authenticate, requireKyc } from '../middlewares/auth.middleware.js';
import { requireBusiness } from '../middlewares/business.middleware.js';

const router = Router();

// User can respond to party invitation without having a business
router.post('/:partyId/respond', authenticate, respondToPartyInvitation);

router.use(authenticate, requireBusiness, requireKyc);

router.get('/summary', getPartiesCreditSummary);
router.get('/', getParties);
router.post('/', createParty);
router.get('/:id', getPartyById);
router.put('/:id', updateParty);
router.delete('/:id', deleteParty);
router.post('/:id/credit', recordCreditTransaction);
router.get('/:id/history', getPartyCreditHistory);

export default router;
