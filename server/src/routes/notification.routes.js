import { Router } from 'express';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  respondToInvitation,
} from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Get current user's notifications (supports filter, search, page, limit)
router.get('/', getMyNotifications);

// Mark all notifications as read
router.put('/read-all', markAllAsRead);

// Clear all read notifications
router.delete('/clear-read', clearReadNotifications);

// Mark a single notification as read
router.put('/:id/read', markAsRead);

// Delete a single notification
router.delete('/:id', deleteNotification);

// Accept or reject an invitation from website notification
router.post('/invitations/:invitationId/respond', respondToInvitation);

export default router;
