import { Router } from 'express';
import {
  getTeam,
  inviteMember,
  updateMemberLimits,
  removeMember,
  cancelInvitation,
} from '../controllers/team.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { requireBusiness } from '../middlewares/business.middleware.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticate, requireBusiness);

// Get team members and invitations
router.get('/', getTeam);

// Invite a new member by email with limits
router.post('/invite', authorize(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER), inviteMember);

// Update member limits and role
router.put('/members/:memberId/limits', authorize(ROLES.OWNER, ROLES.ADMIN), updateMemberLimits);

// Remove member from team
router.delete('/members/:memberId', authorize(ROLES.OWNER, ROLES.ADMIN), removeMember);

// Cancel pending invitation
router.delete('/invitations/:invitationId', authorize(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER), cancelInvitation);

export default router;
