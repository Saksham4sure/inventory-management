import mongoose from 'mongoose';

const partyCreditSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      required: true,
      index: true,
    },
    entryType: {
      type: String,
      enum: ['CREDIT_GIVEN', 'PAYMENT_RECEIVED', 'CREDIT_TAKEN', 'PAYMENT_MADE'],
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    referenceNumber: {
      type: String,
      default: '',
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'ONLINE', 'ONLINE_PAYMENT', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT', 'OTHER'],
      default: 'CASH',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
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

partyCreditSchema.index({ businessId: 1, partyId: 1, date: -1 });

export const PartyCredit = mongoose.model('PartyCredit', partyCreditSchema);
