import { Router } from 'express';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  respondToInvitation,
} from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Get current user's notifications
router.get('/', getMyNotifications);

// Mark all notifications as read
router.put('/read-all', markAllAsRead);

// Mark a single notification as read
router.put('/:id/read', markAsRead);

// Accept or reject an invitation from website notification
router.post('/invitations/:invitationId/respond', respondToInvitation);

export default router;
