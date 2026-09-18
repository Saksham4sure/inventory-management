import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      uppercase: true,
      trim: true,
    },
    qrCodeData: {
      type: String,
      required: true,
    },
    qrCodeImage: {
      type: String, // base64 Data URL for quick rendering and printing
    },
    barcode: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    costPrice: {
      type: Number,
      default: 0,
      min: [0, 'Cost price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      default: 0,
      min: [0, 'Selling price cannot be negative'],
    },
    currentStock: {
      type: Number,
      default: 0,
    },
    minStockLevel: {
      type: Number,
      default: 5,
      min: [0, 'Minimum stock level cannot be negative'],
    },
    unit: {
      type: String,
      default: 'pcs',
      trim: true,
    },
    productType: {
      type: String,
      enum: ['NON_BIODEGRADABLE', 'BIODEGRADABLE'],
      default: 'NON_BIODEGRADABLE',
    },
    manufacturedDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index so SKU is unique within a specific business
productSchema.index({ businessId: 1, sku: 1 }, { unique: true });
productSchema.index({ businessId: 1, qrCodeData: 1 });
productSchema.index({ businessId: 1, createdAt: -1 });

export const Product = mongoose.model('Product', productSchema);
