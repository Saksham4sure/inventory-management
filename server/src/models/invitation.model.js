import mongoose from 'mongoose';
import { ROLE_LIST, ROLES } from '../constants/roles.js';

const invitationSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invitee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    inviteeEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ROLE_LIST,
      default: ROLES.USER,
    },
    limits: {
      maxTransactionAmount: { type: Number, default: 0 }, // 0 = unlimited
      canRecordSale: { type: Boolean, default: true },
      canRecordPurchase: { type: Boolean, default: true },
      canManageProducts: { type: Boolean, default: false },
      canManageParties: { type: Boolean, default: false },
      canDeleteRecords: { type: Boolean, default: false },
      canViewReports: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
  },
  { timestamps: true }
);

export const Invitation = mongoose.model('Invitation', invitationSchema);
