/**
 * Subscription Plan Definitions (Architecture Placeholder)
 * As noted: Subscription billing/paywalls are not enforced yet,
 * but the schema & constants are defined here for future scalability.
 */
export const SUBSCRIPTION_PLANS = {
  FREE_TRIAL: {
    id: 'FREE_TRIAL',
    name: 'Free Trial',
    maxProducts: 100,
    maxMembers: 3,
    features: ['basic_inventory', 'qr_generation', 'qr_scanner'],
    durationDays: 14,
  },
  STARTER: {
    id: 'STARTER',
    name: 'Starter Business',
    maxProducts: 1000,
    maxMembers: 10,
    features: ['basic_inventory', 'qr_generation', 'qr_scanner', 'sales_reports'],
    monthlyPriceUSD: 19,
  },
  PRO: {
    id: 'PRO',
    name: 'Pro Enterprise',
    maxProducts: -1, // Unlimited
    maxMembers: -1,  // Unlimited
    features: ['full_inventory', 'batch_tracking', 'qr_generation', 'multi_warehouse', 'advanced_analytics', 'api_access'],
    monthlyPriceUSD: 49,
  },
};

export const SUBSCRIPTION_STATUS = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
};
