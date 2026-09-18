import mongoose from 'mongoose';
import { ROLES } from '../constants/roles.js';

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
    },
    category: {
      type: String,
      default: 'General Retail',
      trim: true,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    coordinates: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
    },
    googleMapsUrl: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },
    taxNumber: {
      type: String,
      default: '',
      trim: true,
    },
    // Noted requirement: subscription-based app (no billing logic enforced yet)
    subscription: {
      plan: {
        type: String,
        default: 'FREE_TRIAL',
      },
      status: {
        type: String,
        default: 'TRIAL',
      },
      startDate: {
        type: Date,
        default: Date.now,
      },
      endDate: {
        type: Date,
        default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days default trial
      },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          default: ROLES.STAFF,
        },
        limits: {
          maxTransactionAmount: { type: Number, default: 0 },
          canRecordSale: { type: Boolean, default: true },
          canRecordPurchase: { type: Boolean, default: true },
          canManageProducts: { type: Boolean, default: false },
          canManageParties: { type: Boolean, default: false },
          canDeleteRecords: { type: Boolean, default: false },
          canViewReports: { type: Boolean, default: false },
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Business = mongoose.model('Business', businessSchema);
