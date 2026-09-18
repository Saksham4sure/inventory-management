import { User } from '../models/user.model.js';
import { SubscriptionPlan } from '../models/subscriptionPlan.model.js';
import { PlatformSettings } from '../models/platformSettings.model.js';
import { ROLES } from '../constants/roles.js';

export const seedInitialAdminAndPlans = async () => {
  try {
    // 1. Seed or sync Platform Super Admin user
    let adminUser = await User.findOne({
      $or: [{ username: 'admin' }, { email: 'admin@stockpulse.local' }],
    });

    if (!adminUser) {
      await User.create({
        name: 'Platform Administrator',
        username: 'admin',
        email: 'admin@stockpulse.local',
        password: 'password',
        role: ROLES.SUPER_ADMIN,
        isActive: true,
      });
      console.log('✅ [Seed] Platform Super Admin created (user: "admin", pass: "password")');
    } else {
      let updated = false;
      if (adminUser.role !== ROLES.SUPER_ADMIN) {
        adminUser.role = ROLES.SUPER_ADMIN;
        updated = true;
      }
      if (!adminUser.username) {
        adminUser.username = 'admin';
        updated = true;
      }
      if (updated) {
        await adminUser.save();
        console.log('✅ [Seed] Super Admin role and username updated for existing admin user');
      }
    }

    // 2. Seed default 3 Subscription Tiers in Nepalese Rupees (NPR)
    const plansCount = await SubscriptionPlan.countDocuments();
    if (plansCount === 0) {
      const defaultTiers = [
        {
          planId: 'STARTER',
          name: 'Starter Plan',
          description: 'Essential inventory tracking for emerging stores & small businesses',
          tierOrder: 1,
          currency: 'NPR',
          monthlyPriceNPR: 1499,
          monthlyPriceUSD: 1499,
          yearlyPriceUSD: 14990,
          maxProducts: 250,
          maxMembers: 3,
          features: [
            'Basic Inventory & Real-time Stock Tracking',
            'QR Code Generation & Printable Labels',
            'Camera & Optical QR Scanner',
            'Customer & Supplier Ledgers',
            'Standard Sales & Purchase Reports',
            'Single Warehouse / Store Location',
          ],
          badgeText: '14-Day Free Trial',
          isDefaultTrial: true,
          isActive: true,
        },
        {
          planId: 'PRO',
          name: 'Growth Pro Plan',
          description: 'Advanced stock control, team management, and detailed analytics',
          tierOrder: 2,
          currency: 'NPR',
          monthlyPriceNPR: 3499,
          monthlyPriceUSD: 3499,
          yearlyPriceUSD: 34990,
          maxProducts: 2500,
          maxMembers: 15,
          features: [
            'Everything in Starter Plan',
            'Batch & Lot Number Tracking',
            'Multi-member Team Access & Granular Permissions',
            'Export to Excel & PDF Audit Logs',
            'Low Stock Automated Alerts',
            'Advanced Sales & Profit Analytics',
            'Multi-location Inventory Management',
          ],
          badgeText: 'Most Popular',
          isDefaultTrial: false,
          isActive: true,
        },
        {
          planId: 'ENTERPRISE',
          name: 'Enterprise Scale',
          description: 'Unlimited scale, multi-warehouse control, and priority API access',
          tierOrder: 3,
          currency: 'NPR',
          monthlyPriceNPR: 7999,
          monthlyPriceUSD: 7999,
          yearlyPriceUSD: 79990,
          maxProducts: -1,
          maxMembers: -1,
          features: [
            'Everything in Growth Pro Plan',
            'Unlimited Products & SKU Database',
            'Unlimited Team Members & Managers',
            'Full REST API & Webhook Integrations',
            'Multi-Warehouse Logistics & Transfer Notes',
            'Custom Invoice Branding & QR Watermarking',
            'Dedicated 24/7 Account Specialist & SLA',
          ],
          badgeText: 'Unlimited Power',
          isDefaultTrial: false,
          isActive: true,
        },
      ];

      await SubscriptionPlan.insertMany(defaultTiers);
      console.log('✅ [Seed] Default 3 subscription tiers created in NPR (Starter Rs. 1,499, Pro Rs. 3,499, Enterprise Rs. 7,999)');
    } else {
      // Sync existing plans to Nepalese Rupees (NPR) if they still have old USD values
      await SubscriptionPlan.updateMany(
        { planId: 'STARTER', $or: [{ monthlyPriceUSD: { $lt: 500 } }, { currency: { $ne: 'NPR' } }] },
        { $set: { currency: 'NPR', monthlyPriceNPR: 1499, monthlyPriceUSD: 1499, yearlyPriceUSD: 14990 } }
      );
      await SubscriptionPlan.updateMany(
        { planId: 'PRO', $or: [{ monthlyPriceUSD: { $lt: 500 } }, { currency: { $ne: 'NPR' } }] },
        { $set: { currency: 'NPR', monthlyPriceNPR: 3499, monthlyPriceUSD: 3499, yearlyPriceUSD: 34990 } }
      );
      await SubscriptionPlan.updateMany(
        { planId: 'ENTERPRISE', $or: [{ monthlyPriceUSD: { $lt: 500 } }, { currency: { $ne: 'NPR' } }] },
        { $set: { currency: 'NPR', monthlyPriceNPR: 7999, monthlyPriceUSD: 7999, yearlyPriceUSD: 79990 } }
      );
    }

    // 3. Seed or verify Platform Settings
    const settings = await PlatformSettings.getSettings();
    if (!settings.trialConfig.trialPlanId) {
      settings.trialConfig.trialPlanId = 'STARTER';
      settings.trialConfig.trialTierOrder = 1;
      settings.trialConfig.durationDays = 14;
      await settings.save();
    }
    console.log(`✅ [Seed] Platform Settings synced (Trial: ${settings.trialConfig.durationDays} days on tier ${settings.trialConfig.trialTierOrder})`);
  } catch (error) {
    console.error('⚠️ [Seed] Error running initial platform seeds:', error.message);
  }
};
