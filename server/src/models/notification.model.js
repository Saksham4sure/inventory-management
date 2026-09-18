import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'TEAM_INVITATION',
        'INVITATION_ACCEPTED',
        'INVITATION_REJECTED',
        'INVITATION_CANCELLED',
        'MEMBER_REMOVED',
        'ROLE_UPDATED',
        'LIMITS_UPDATED',
        'SUBSCRIPTION_REQUEST',
        'SUBSCRIPTION_APPROVED',
        'SUBSCRIPTION_REJECTED',
        'KYC_SUBMITTED',
        'KYC_APPROVED',
        'KYC_REJECTED',
        'SYSTEM',
      ],
      default: 'SYSTEM',
    },
    data: {
      invitationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invitation',
        default: null,
      },
      requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionRequest',
        default: null,
      },
      targetUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      businessName: { type: String, default: '' },
      role: { type: String, default: '' },
      planId: { type: String, default: '' },
      planName: { type: String, default: '' },
      action: { type: String, default: '' },
      kycStatus: { type: String, default: '' },
      documentType: { type: String, default: '' },
      rejectionReason: { type: String, default: '' },
      userName: { type: String, default: '' },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);
