import mongoose from 'mongoose';

const platformSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      default: 'global_settings',
    },
    platformName: {
      type: String,
      default: 'StockPulse',
      trim: true,
    },
    allowRegistrations: {
      type: Boolean,
      default: true,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    supportEmail: {
      type: String,
      default: 'support@stockpulse.com',
      trim: true,
      lowercase: true,
    },
    trialConfig: {
      enabled: {
        type: Boolean,
        default: true,
      },
      trialTierOrder: {
        type: Number,
        default: 1, // 1st tier by default
      },
      trialPlanId: {
        type: String,
        default: 'STARTER',
      },
      durationDays: {
        type: Number,
        default: 14, // 14 days by default
        min: 1,
        max: 365,
      },
    },
    noticeBanner: {
      active: {
        type: Boolean,
        default: false,
      },
      message: {
        type: String,
        default: '',
        trim: true,
      },
      level: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'info',
      },
    },
  },
  {
    timestamps: true,
  }
);

platformSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ key: 'global_settings' });
  if (!settings) {
    settings = await this.create({ key: 'global_settings' });
  }
  return settings;
};

export const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema);
