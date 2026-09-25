import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, ROLE_LIST } from '../constants/roles.js';
import { ENV } from '../config/env.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    accountId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    userType: {
      type: String,
      enum: ['CUSTOMER', 'BUSINESS'],
      default: 'BUSINESS',
      index: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailVerificationToken: {
      type: String,
      default: null,
      index: true,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    age: {
      type: Number,
      min: [16, 'You must be at least 16 years old'],
      max: [120, 'Age must not exceed 120 years'],
      default: null,
    },
    dob: {
      type: Date,
      default: null,
    },
    avatar: {
      type: String,
      default: '',
    },
    profilePicture: {
      type: String,
      default: '',
    },
    location: {
      province: { type: String, default: '' },
      district: { type: String, default: '' },
      municipality: { type: String, default: '' },
      ward: { type: String, default: '' },
      street: { type: String, default: '' },
      formattedAddress: { type: String, default: '' },
    },
    kyc: {
      documentType: {
        type: String,
        enum: ['CITIZENSHIP', 'DRIVING_LICENSE', 'PASSPORT', 'NONE'],
        default: 'NONE',
      },
      documentNumber: { type: String, default: '', trim: true },
      frontImage: { type: String, default: '' },
      backImage: { type: String, default: '' },
      status: {
        type: String,
        enum: ['PENDING', 'VERIFIED', 'REJECTED', 'NOT_SUBMITTED'],
        default: 'NOT_SUBMITTED',
      },
      submittedAt: { type: Date, default: null },
      reviewedAt: { type: Date, default: null },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      rejectionReason: { type: String, default: '', trim: true },
    },
    subscriptionPlan: {
      type: String,
      default: null,
    },
    subscriptionStatus: {
      type: String,
      enum: ['NONE', 'TRIAL', 'ACTIVE', 'EXPIRED'],
      default: 'NONE',
    },
    subscriptionStartDate: {
      type: Date,
      default: null,
    },
    subscriptionEndDate: {
      type: Date,
      default: null,
    },
    onboardingStep: {
      type: Number,
      default: 1,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    kycSkipped: {
      type: Boolean,
      default: false,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
      index: true,
    },
    role: {
      type: String,
      enum: ROLE_LIST,
      default: ROLES.OWNER,
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

userSchema.pre('save', async function (next) {
  if (!this.userId && !this.accountId) {
    let isUnique = false;
    let rand8 = '';
    while (!isUnique) {
      rand8 = Math.floor(10000000 + Math.random() * 90000000).toString();
      const existing = await mongoose.models.User?.findOne({
        $or: [{ userId: rand8 }, { accountId: rand8 }],
        _id: { $ne: this._id },
      });
      if (!existing) isUnique = true;
    }
    this.userId = rand8;
    this.accountId = rand8;
  } else if (!this.userId && this.accountId) {
    if (/^\d{8}$/.test(this.accountId)) {
      this.userId = this.accountId;
    } else {
      let isUnique = false;
      let rand8 = '';
      while (!isUnique) {
        rand8 = Math.floor(10000000 + Math.random() * 90000000).toString();
        const existing = await mongoose.models.User?.findOne({
          $or: [{ userId: rand8 }, { accountId: rand8 }],
          _id: { $ne: this._id },
        });
        if (!existing) isUnique = true;
      }
      this.userId = rand8;
      this.accountId = rand8;
    }
  } else if (this.userId && !this.accountId) {
    this.accountId = this.userId;
  }

  // Synchronize age and dob if one is updated
  if (this.dob && (this.isModified('dob') || !this.age)) {
    const today = new Date();
    let computedAge = today.getFullYear() - this.dob.getFullYear();
    const m = today.getMonth() - this.dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < this.dob.getDate())) {
      computedAge--;
    }
    this.age = computedAge;
  } else if (this.age && (this.isModified('age') || !this.dob)) {
    const currentYear = new Date().getFullYear();
    this.dob = new Date(Date.UTC(currentYear - this.age, 0, 1));
  }

  // Synchronize avatar and profilePicture
  if (this.isModified('avatar') && !this.isModified('profilePicture')) {
    this.profilePicture = this.avatar;
  } else if (this.isModified('profilePicture') && !this.isModified('avatar')) {
    this.avatar = this.profilePicture;
  }

  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(ENV.BCRYPT_SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);
