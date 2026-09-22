import { Business } from '../models/business.model.js';
import { User } from '../models/user.model.js';
import { Invitation } from '../models/invitation.model.js';
import { Notification } from '../models/notification.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../constants/roles.js';
import { validateEmail } from '../utils/inputValidator.js';

export const getTeam = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.user.businessId)
    .populate('owner', 'name email role createdAt')
    .populate('members.user', 'name email role createdAt isActive');

  if (!business) {
    throw new ApiError(404, 'Business not found');
  }

  const invitations = await Invitation.find({
    businessId: business._id,
    status: 'PENDING',
  })
    .populate('invitee', 'name email')
    .populate('inviter', 'name email')
    .sort({ createdAt: -1 });

  // Exclude the owner from the members roster. The owner has unrestricted access and cannot have limits.
  const ownerIdStr = business.owner._id ? business.owner._id.toString() : business.owner.toString();
  const filteredMembers = (business.members || []).filter((m) => {
    if (!m.user) return false;
    const userIdStr = m.user._id ? m.user._id.toString() : m.user.toString();
    return userIdStr !== ownerIdStr && m.role !== ROLES.OWNER;
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        owner: business.owner,
        members: filteredMembers,
        invitations,
        currentUserRole: req.user.role,
        isOwner: ownerIdStr === req.user._id.toString(),
      },
      'Team members and invitations retrieved successfully'
    )
  );
});

export const inviteMember = asyncHandler(async (req, res) => {
  const { email, role = ROLES.USER, limits = {} } = req.body;

  const emailResult = validateEmail(email);
  if (!emailResult.isValid) {
    throw new ApiError(400, emailResult.error);
  }

  const cleanEmail = emailResult.value;
  const business = req.business;

  // 1. Check if user exists in the database
  const targetUser = await User.findOne({ email: cleanEmail });
  if (!targetUser) {
    throw new ApiError(
      404,
      'No user found with this email. Please make sure the person has registered an account first.'
    );
  }

  // 2. Prevent self-invite
  if (targetUser._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot invite yourself to your own business');
  }

  // 3. Check if already an active member of this business
  const isAlreadyMember = business.members.some(
    (m) => m.user && m.user.toString() === targetUser._id.toString()
  );
  if (isAlreadyMember) {
    throw new ApiError(400, 'This user is already an active member of your team');
  }

  // 4. Check if an active pending invitation exists
  const pendingInvite = await Invitation.findOne({
    businessId: business._id,
    invitee: targetUser._id,
    status: 'PENDING',
  });
  if (pendingInvite) {
    throw new ApiError(
      400,
      'An invitation is already pending for this user. You can cancel and resend if needed.'
    );
  }

  // 5. Role validation
  const allowedRoles = [ROLES.MANAGER, ROLES.USER, ROLES.STAFF];
  const assignedRole = allowedRoles.includes(role) ? role : ROLES.USER;

  // 6. Limits normalization
  const normalizedLimits = {
    maxTransactionAmount: Math.max(0, Number(limits.maxTransactionAmount) || 0),
    canRecordSale: limits.canRecordSale !== false,
    canRecordPurchase: limits.canRecordPurchase !== false,
    canManageProducts: assignedRole === ROLES.MANAGER ? limits.canManageProducts !== false : Boolean(limits.canManageProducts),
    canManageParties: assignedRole === ROLES.MANAGER ? limits.canManageParties !== false : Boolean(limits.canManageParties),
    canDeleteRecords: Boolean(limits.canDeleteRecords),
    canViewReports: assignedRole === ROLES.MANAGER ? limits.canViewReports !== false : Boolean(limits.canViewReports),
  };

  // 7. Create invitation
  const invitation = await Invitation.create({
    businessId: business._id,
    inviter: req.user._id,
    invitee: targetUser._id,
    inviteeEmail: targetUser.email,
    role: assignedRole,
    limits: normalizedLimits,
    status: 'PENDING',
  });

  // 8. Create in-app website notification for the invitee
  await Notification.create({
    recipient: targetUser._id,
    sender: req.user._id,
    businessId: business._id,
    title: 'Team Invitation',
    message: `${req.user.name} invited you to join "${business.name}" as a ${assignedRole}.`,
    type: 'TEAM_INVITATION',
    data: {
      invitationId: invitation._id,
      businessName: business.name,
      role: assignedRole,
    },
  });

  // 9. Notification for the inviter / business owner
  await Notification.create({
    recipient: req.user._id,
    sender: req.user._id,
    businessId: business._id,
    title: 'Invitation Sent',
    message: `Team invitation dispatched to ${targetUser.name} (${targetUser.email}) as ${assignedRole}.`,
    type: 'SYSTEM',
  });

  const populatedInvitation = await Invitation.findById(invitation._id)
    .populate('invitee', 'name email')
    .populate('inviter', 'name email');

  res.status(201).json(
    new ApiResponse(
      201,
      { invitation: populatedInvitation },
      `Invitation sent to ${targetUser.name} successfully`
    )
  );
});

export const updateMemberLimits = asyncHandler(async (req, res) => {
  const { memberId } = req.params;
  const { role, limits } = req.body;
  const business = req.business;

  // The business owner has full unrestricted access and cannot have limits
  const ownerIdStr = business.owner._id ? business.owner._id.toString() : business.owner.toString();
  if (ownerIdStr === memberId.toString()) {
    throw new ApiError(400, 'The business owner has full unrestricted access and cannot have limits');
  }

  const memberIndex = business.members.findIndex(
    (m) => m.user.toString() === memberId || m._id.toString() === memberId
  );

  if (memberIndex === -1) {
    throw new ApiError(404, 'Team member not found in this business');
  }

  const targetMember = business.members[memberIndex];
  if (targetMember.role === ROLES.OWNER) {
    throw new ApiError(400, 'The business owner has full unrestricted access and cannot have limits');
  }
  const targetUserId = targetMember.user.toString();

  if (role) {
    const allowedRoles = [ROLES.MANAGER, ROLES.USER, ROLES.STAFF];
    if (!allowedRoles.includes(role)) {
      throw new ApiError(400, 'Invalid role specified');
    }
    targetMember.role = role;
    await User.findByIdAndUpdate(targetUserId, { role });
  }

  if (limits) {
    targetMember.limits = {
      maxTransactionAmount:
        limits.maxTransactionAmount !== undefined
          ? Math.max(0, Number(limits.maxTransactionAmount) || 0)
          : targetMember.limits.maxTransactionAmount,
      canRecordSale:
        limits.canRecordSale !== undefined
          ? Boolean(limits.canRecordSale)
          : targetMember.limits.canRecordSale,
      canRecordPurchase:
        limits.canRecordPurchase !== undefined
          ? Boolean(limits.canRecordPurchase)
          : targetMember.limits.canRecordPurchase,
      canManageProducts:
        limits.canManageProducts !== undefined
          ? Boolean(limits.canManageProducts)
          : targetMember.limits.canManageProducts,
      canManageParties:
        limits.canManageParties !== undefined
          ? Boolean(limits.canManageParties)
          : targetMember.limits.canManageParties,
      canDeleteRecords:
        limits.canDeleteRecords !== undefined
          ? Boolean(limits.canDeleteRecords)
          : targetMember.limits.canDeleteRecords,
      canViewReports:
        limits.canViewReports !== undefined
          ? Boolean(limits.canViewReports)
          : targetMember.limits.canViewReports,
    };
  }

  await business.save();

  // Notify the updated member
  await Notification.create({
    recipient: targetUserId,
    sender: req.user._id,
    businessId: business._id,
    title: 'Permissions Updated',
    message: `Your permissions and role in "${business.name}" have been updated by ${req.user.name}.`,
    type: 'LIMITS_UPDATED',
    data: {
      businessName: business.name,
      role: targetMember.role,
    },
  });

  res.status(200).json(
    new ApiResponse(200, { member: targetMember }, 'Member limits and role updated successfully')
  );
});

export const removeMember = asyncHandler(async (req, res) => {
  const { memberId } = req.params;
  const business = req.business;

  if (business.owner.toString() === memberId) {
    throw new ApiError(400, 'Cannot remove the business owner from the team');
  }

  const memberIndex = business.members.findIndex(
    (m) => m.user.toString() === memberId || m._id.toString() === memberId
  );

  if (memberIndex === -1) {
    throw new ApiError(404, 'Team member not found');
  }

  const removedUserId = business.members[memberIndex].user.toString();
  const targetUser = await User.findById(removedUserId);

  business.members.splice(memberIndex, 1);
  await business.save();

  // If user was linked to this business, reset their businessId
  if (targetUser && targetUser.businessId?.toString() === business._id.toString()) {
    targetUser.businessId = null;
    targetUser.role = ROLES.USER;
    await targetUser.save();
  }

  // Notify the removed member
  await Notification.create({
    recipient: removedUserId,
    sender: req.user._id,
    businessId: business._id,
    title: 'Removed from Business Team',
    message: `You were removed from the team at "${business.name}".`,
    type: 'MEMBER_REMOVED',
    data: {
      businessName: business.name,
    },
  });

  // Notify the admin
  await Notification.create({
    recipient: req.user._id,
    sender: req.user._id,
    businessId: business._id,
    title: 'Team Member Removed',
    message: `${targetUser ? targetUser.name : 'A member'} was removed from your business.`,
    type: 'SYSTEM',
  });

  res.status(200).json(
    new ApiResponse(200, null, 'Team member removed from business successfully')
  );
});

export const cancelInvitation = asyncHandler(async (req, res) => {
  const { invitationId } = req.params;

  const invitation = await Invitation.findOne({
    _id: invitationId,
    businessId: req.user.businessId,
  });

  if (!invitation) {
    throw new ApiError(404, 'Pending invitation not found');
  }

  invitation.status = 'CANCELLED';
  await invitation.save();

  // Mark the invitation notification as read or notify
  await Notification.updateMany(
    {
      'data.invitationId': invitation._id,
      type: 'TEAM_INVITATION',
    },
    { isRead: true }
  );

  res.status(200).json(
    new ApiResponse(200, null, 'Invitation cancelled successfully')
  );
});
