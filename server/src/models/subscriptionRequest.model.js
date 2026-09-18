import mongoose from 'mongoose';

const subscriptionRequestSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
      index: true,
    },
    businessName: {
      type: String,
      default: '',
      trim: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['CHANGE', 'EXTEND', 'ACTIVATE'],
      default: 'CHANGE',
    },
    currentPlan: {
      type: String,
      required: true,
      default: 'FREE_TRIAL',
    },
    requestedPlan: {
      type: String,
      required: true,
    },
    requestedPlanName: {
      type: String,
      default: '',
    },
    extendDays: {
      type: Number,
      default: 14,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    adminNotes: {
      type: String,
      default: '',
      trim: true,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const SubscriptionRequest = mongoose.model(
  'SubscriptionRequest',
  subscriptionRequestSchema
);
