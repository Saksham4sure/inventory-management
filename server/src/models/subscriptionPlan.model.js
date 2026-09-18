import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      required: [true, 'Plan ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    tierOrder: {
      type: Number,
      required: true,
      default: 1,
    },
    monthlyPriceUSD: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    yearlyPriceUSD: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxProducts: {
      type: Number,
      default: 100, // -1 denotes unlimited
    },
    maxMembers: {
      type: Number,
      default: 3, // -1 denotes unlimited
    },
    features: {
      type: [String],
      default: [],
    },
    badgeText: {
      type: String,
      default: '',
      trim: true,
    },
    isDefaultTrial: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
