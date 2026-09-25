import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ['PERSONAL', 'BUSINESS'],
      default: 'PERSONAL',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Expense title or description is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    currency: {
      type: String,
      default: 'NPR',
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      default: 'General',
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'ESEWA', 'KHALTI', 'BANK_TRANSFER', 'CARD', 'OTHER'],
      default: 'CASH',
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    referenceNumber: {
      type: String,
      default: '',
      trim: true,
    },
    receiptUrl: {
      type: String,
      default: null,
    },
    recordedBy: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      role: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

expenseSchema.index({ user: 1, type: 1, date: -1 });
expenseSchema.index({ businessId: 1, type: 1, date: -1 });

export const Expense = mongoose.model('Expense', expenseSchema);
