import mongoose from 'mongoose';
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LIST } from '../constants/transactionTypes.js';

const transactionItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false,
      default: null,
    },
    productName: {
      type: String,
      required: true,
      default: 'Manual Item',
    },
    sku: {
      type: String,
      required: false,
      default: 'MANUAL',
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative'],
    },
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: TRANSACTION_TYPE_LIST,
      required: true,
      index: true,
    },
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    items: {
      type: [transactionItemSchema],
      validate: [(val) => val.length > 0, 'Transaction must contain at least one item'],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'BANK_TRANSFER', 'CREDIT', 'OTHER'],
      default: 'CASH',
    },
    party: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      default: null,
    },
    partyName: {
      type: String,
      default: '',
    },
    partyPhone: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    scannedViaQR: {
      type: Boolean,
      default: false,
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

transactionSchema.index({ businessId: 1, createdAt: -1 });
transactionSchema.index({ businessId: 1, type: 1, createdAt: -1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);
