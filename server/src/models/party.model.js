import mongoose from 'mongoose';

const partySchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Party name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Party phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    accountId: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['CUSTOMER', 'SUPPLIER'],
      default: 'CUSTOMER',
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: [0, 'Credit limit cannot be negative'],
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
partySchema.index({ businessId: 1, phone: 1 });
partySchema.index({ businessId: 1, type: 1, currentBalance: -1 });
partySchema.index({ businessId: 1, createdAt: -1 });

export const Party = mongoose.model('Party', partySchema);
