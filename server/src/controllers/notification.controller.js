import { Notification } from '../models/notification.model.js';
import { Invitation } from '../models/invitation.model.js';
import { Business } from '../models/business.model.js';
import { Party } from '../models/party.model.js';
import { User } from '../models/user.model.js';
import { SubscriptionRequest } from '../models/subscriptionRequest.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getMyNotifications = asyncHandler(async (req, res) => {
  const { filter = 'all', search = '', page = 1, limit = 50 } = req.query;

  const query = { recipient: req.user._id };

  if (filter === 'unread') {
    query.isRead = false;
  } else if (filter === 'read') {
    query.isRead = true;
  } else if (filter === 'subscriptions') {
    query.type = {
      $in: ['SUBSCRIPTION_REQUEST', 'SUBSCRIPTION_APPROVED', 'SUBSCRIPTION_REJECTED'],
    };
  } else if (filter === 'team') {
    query.type = {
      $in: [
        'TEAM_INVITATION',
        'INVITATION_ACCEPTED',
        'INVITATION_REJECTED',
        'INVITATION_CANCELLED',
        'MEMBER_REMOVED',
        'ROLE_UPDATED',
        'LIMITS_UPDATED',
      ],
    };
  } else if (filter === 'system') {
    query.type = 'SYSTEM';
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [{ title: searchRegex }, { message: searchRegex }];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const [notifications, totalCount, unreadCount] = await Promise.all([
    Notification.find(query)
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Notification.countDocuments(query),
    Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    }),
  ]);

  // Attach invitation status dynamically for pending invitations
  const enriched = await Promise.all(
    notifications.map(async (notif) => {
      const obj = notif.toObject();
      if (obj.data?.invitationId) {
        const inv = await Invitation.findById(obj.data.invitationId);
        obj.invitationStatus = inv ? inv.status : 'CANCELLED';
      }
      if (obj.data?.partyId) {
        const party = await Party.findById(obj.data.partyId);
        obj.partyStatus = party ? party.status : 'CANCELLED';
      }
      if (obj.type === 'SUBSCRIPTION_REQUEST' && obj.data?.requestId) {
        const subReq = await SubscriptionRequest.findById(obj.data.requestId);
        obj.subscriptionStatus = subReq ? subReq.status : 'CANCELLED';
      }
      if (obj.type === 'KYC_SUBMITTED' && obj.data?.targetUserId) {
        const targetUser = await User.findById(obj.data.targetUserId);
        obj.kycStatus = targetUser ? targetUser.kyc.status : 'NOT_SUBMITTED';
      }
      return obj;
    })
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications: enriched,
        totalCount,
        unreadCount,
        page: pageNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1,
      },
      'Notifications retrieved successfully'
    )
  );
});

export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notif = await Notification.findOneAndUpdate(
    { _id: id, recipient: req.user._id },
    { isRead: true },
    { new: true }
  );

  if (!notif) {
    throw new ApiError(404, 'Notification not found');
  }

  res.status(200).json(new ApiResponse(200, { notification: notif }, 'Marked as read'));
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });

  res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read'));
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await Notification.findOneAndDelete({
    _id: id,
    recipient: req.user._id,
  });

  if (!deleted) {
    throw new ApiError(404, 'Notification not found');
  }

  res.status(200).json(new ApiResponse(200, null, 'Notification deleted successfully'));
});

export const clearReadNotifications = asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({
    recipient: req.user._id,
    isRead: true,
  });

  res.status(200).json(
    new ApiResponse(200, { deletedCount: result.deletedCount }, 'Cleared all read notifications')
  );
});

export const respondToInvitation = asyncHandler(async (req, res) => {
  const { invitationId } = req.params;
  const { action } = req.body; // 'ACCEPT' or 'REJECT'

  if (!action || !['ACCEPT', 'REJECT'].includes(action)) {
    throw new ApiError(400, 'Action must be ACCEPT or REJECT');
  }

  const invitation = await Invitation.findById(invitationId).populate('businessId');
  if (!invitation || invitation.invitee.toString() !== req.user._id.toString()) {
    throw new ApiError(404, 'Invitation not found or unauthorized');
  }

  if (invitation.status !== 'PENDING') {
    throw new ApiError(400, `This invitation has already been ${invitation.status.toLowerCase()}`);
  }

  const business = await Business.findById(invitation.businessId._id || invitation.businessId);
  if (!business) {
    throw new ApiError(404, 'The business associated with this invitation is no longer available');
  }

  if (action === 'ACCEPT') {
    // 1. Check if already a member
    const alreadyMember = business.members.some(
      (m) => m.user && m.user.toString() === req.user._id.toString()
    );

    if (!alreadyMember) {
      business.members.push({
        user: req.user._id,
        role: invitation.role,
        limits: invitation.limits || {},
        joinedAt: new Date(),
      });
      await business.save();
    }

    // 2. Link user to this business and assign role
    await User.findByIdAndUpdate(req.user._id, {
      businessId: business._id,
      role: invitation.role,
    });

    invitation.status = 'ACCEPTED';
    await invitation.save();

    // 3. Mark notification as read
    await Notification.updateMany(
      { 'data.invitationId': invitation._id, recipient: req.user._id },
      { isRead: true }
    );

    // 4. Notify business inviter / admin
    await Notification.create({
      recipient: invitation.inviter,
      sender: req.user._id,
      businessId: business._id,
      title: 'Invitation Accepted 🎉',
      message: `${req.user.name} accepted your invitation to join "${business.name}" as ${invitation.role}.`,
      type: 'INVITATION_ACCEPTED',
      data: {
        businessName: business.name,
        role: invitation.role,
      },
    });

    // 5. Notify user
    await Notification.create({
      recipient: req.user._id,
      sender: invitation.inviter,
      businessId: business._id,
      title: 'Welcome to the Team!',
      message: `You have successfully joined "${business.name}" as ${invitation.role}.`,
      type: 'SYSTEM',
      data: {
        businessName: business.name,
        role: invitation.role,
      },
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          businessId: business._id,
          businessName: business.name,
          role: invitation.role,
        },
        `You have successfully joined ${business.name}`
      )
    );
  } else {
    // REJECT
    invitation.status = 'REJECTED';
    await invitation.save();

    await Notification.updateMany(
      { 'data.invitationId': invitation._id, recipient: req.user._id },
      { isRead: true }
    );

    // Notify inviter
    await Notification.create({
      recipient: invitation.inviter,
      sender: req.user._id,
      businessId: business._id,
      title: 'Invitation Declined',
      message: `${req.user.name} declined the invitation to join "${business.name}".`,
      type: 'INVITATION_REJECTED',
      data: {
        businessName: business.name,
      },
    });

    res.status(200).json(
      new ApiResponse(200, null, `Invitation to join ${business.name} was declined`)
    );
  }
});
