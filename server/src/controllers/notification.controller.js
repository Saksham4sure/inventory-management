import { Notification } from '../models/notification.model.js';
import { Invitation } from '../models/invitation.model.js';
import { Business } from '../models/business.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .populate('sender', 'name email')
    .sort({ createdAt: -1 })
    .limit(50);

  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });

  // Attach invitation status dynamically for pending invitations
  const enriched = await Promise.all(
    notifications.map(async (notif) => {
      const obj = notif.toObject();
      if (obj.data?.invitationId) {
        const inv = await Invitation.findById(obj.data.invitationId);
        obj.invitationStatus = inv ? inv.status : 'CANCELLED';
      }
      return obj;
    })
  );

  res.status(200).json(
    new ApiResponse(
      200,
      { notifications: enriched, unreadCount },
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
