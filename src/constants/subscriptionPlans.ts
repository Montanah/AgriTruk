// Subscription Plans for TRUK Platform
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'quarterly' | 'yearly';
  features: string[];
  limits: {
    drivers?: number;
    vehicles?: number;
    bookings?: number;
    apiCalls?: number;
  };
  isPopular?: boolean;
  isEnterprise?: boolean;
  savings?: string;
  color: string;
  icon: string;
}

// Individual and Broker Plans (Existing)
export const INDIVIDUAL_PLANS: SubscriptionPlan[] = [
  {
    id: 'individual_basic',
    name: 'Basic',
    description: 'Perfect for individual transporters',
    price: 299,
    currency: 'KES',
    billingPeriod: 'monthly',
    features: [
      'Up to 3 vehicles',
      'Unlimited bookings',
      'Basic tracking',
      'Email support',
      'Mobile app access'
    ],
    limits: {
      vehicles: 3,
      bookings: -1, // unlimited
    },
    color: '#27AE60',
    icon: 'truck'
  },
  {
    id: 'individual_pro',
    name: 'Pro',
    description: 'For growing transporters',
    price: 599,
    currency: 'KES',
    billingPeriod: 'monthly',
    features: [
      'Up to 10 vehicles',
      'Everything in Basic, plus:',
      'Advanced analytics',
      'Priority support',
      'Route optimization',
      'Driver performance tracking'
    ],
    limits: {
      vehicles: 10,
      bookings: -1,
    },
    isPopular: true,
    color: '#FF8C00',
    icon: 'truck-fast'
  },
  {
    id: 'individual_enterprise',
    name: 'Enterprise',
    description: 'For large operations',
    price: 999,
    currency: 'KES',
    billingPeriod: 'monthly',
    features: [
      'Unlimited vehicles',
      'Everything in Pro, plus:',
      'Custom integrations',
      'White-label solutions',
      '24/7 phone support',
      'Dedicated account manager'
    ],
    limits: {
      vehicles: -1, // unlimited
      bookings: -1,
    },
    isEnterprise: true,
    color: '#B00B1C',
    icon: 'truck-check'
  }
];

// Broker Plans — aligned with public website pricing
export const BROKER_PLANS: SubscriptionPlan[] = [
  {
    id: 'broker_monthly',
    name: 'Monthly',
    description: 'Flexible monthly access for brokers',
    price: 199,
    currency: 'KES',
    billingPeriod: 'monthly',
    features: [
      'Access to transporter network',
      'Real-time tracking',
      '24/7 support',
      'Commission management',
    ],
    limits: {
      bookings: -1,
    },
    color: '#B00B1C',
    icon: 'account-tie',
  },
  {
    id: 'broker_quarterly',
    name: 'Quarterly',
    description: 'Most popular plan — billed every 3 months',
    price: 499,
    currency: 'KES',
    billingPeriod: 'quarterly',
    features: [
      'Access to transporter network',
      'Real-time tracking',
      '24/7 priority support',
      'Commission management',
      'Analytics dashboard',
    ],
    limits: {
      bookings: -1,
    },
    isPopular: true,
    savings: 'Save KES 98',
    color: '#FF8C00',
    icon: 'account-tie-outline',
  },
  {
    id: 'broker_yearly',
    name: 'Yearly',
    description: 'Best value annual plan',
    price: 1599,
    currency: 'KES',
    billingPeriod: 'yearly',
    features: [
      'Access to transporter network',
      'Real-time tracking',
      '24/7 priority support',
      'Commission management',
      'Advanced analytics',
      'Dedicated account manager',
    ],
    limits: {
      bookings: -1,
    },
    savings: 'Save KES 789',
    color: '#0F2B04',
    icon: 'account-tie-hat',
  },
];

// Company Fleet Plans (New)
export const COMPANY_FLEET_PLANS: SubscriptionPlan[] = [
  {
    id: 'fleet_basic',
    name: 'Basic Fleet',
    description: 'Perfect for small transport companies',
    price: 999,
    currency: 'KES',
    billingPeriod: 'monthly',
    features: [
      'Up to 5 drivers',
      'Full app access for all drivers',
      'Unlimited bookings',
      'Central company dashboard',
      '24/7 support',
      'Basic reporting'
    ],
    limits: {
      drivers: 5,
      vehicles: 10,
      bookings: -1, // unlimited
    },
    color: '#27AE60',
    icon: 'truck'
  },
  {
    id: 'fleet_growing',
    name: 'Growing Fleet',
    description: 'For expanding transport companies',
    price: 1499,
    currency: 'KES',
    billingPeriod: 'monthly',
    features: [
      'Up to 15 drivers',
      'Save 20% per driver',
      'Everything in Basic, plus:',
      'Priority booking alerts',
      'Advanced analytics dashboard',
      'Driver performance tracking',
      'Route optimization',
      'Dedicated account manager',
      'Access to Driver Job Board'
    ],
    limits: {
      drivers: 15,
      vehicles: 30,
      bookings: -1,
    },
    isPopular: true,
    savings: 'Save 20% per driver',
    color: '#FF8C00',
    icon: 'truck-fast'
  },
  {
    id: 'fleet_enterprise',
    name: 'Unlimited Fleet',
    description: 'For large transport enterprises',
    price: 2999,
    currency: 'KES',
    billingPeriod: 'monthly',
    features: [
      'Unlimited drivers',
      'Maximum savings',
      'Everything in Growing, plus:',
      'Custom integrations (API access)',
      'White-label solutions',
      'Advanced security features',
      'Multi-location management',
      '24/7 premium phone support',
      'Custom training sessions'
    ],
    limits: {
      drivers: -1, // unlimited
      vehicles: -1,
      bookings: -1,
    },
    isEnterprise: true,
    savings: 'Maximum savings',
    color: '#B00B1C',
    icon: 'truck-check'
  }
];

// Helper function to get plans by user type
export const getPlansByUserType = (userType: 'individual' | 'broker' | 'company'): SubscriptionPlan[] => {
  switch (userType) {
    case 'individual':
      return INDIVIDUAL_PLANS;
    case 'broker':
      return BROKER_PLANS;
    case 'company':
      return COMPANY_FLEET_PLANS;
    default:
      return INDIVIDUAL_PLANS;
  }
};

// Helper function to get plan by ID
export const getPlanById = (planId: string): SubscriptionPlan | undefined => {
  const allPlans = [...INDIVIDUAL_PLANS, ...BROKER_PLANS, ...COMPANY_FLEET_PLANS];
  return allPlans.find(plan => plan.id === planId);
};

// Helper function to check if user can add more drivers
export const canAddDriver = (currentPlan: SubscriptionPlan, currentDriverCount: number): boolean => {
  if (currentPlan.limits.drivers === -1) return true; // unlimited
  return currentDriverCount < currentPlan.limits.drivers;
};

// Helper function to get plan usage percentage
export const getPlanUsagePercentage = (currentPlan: SubscriptionPlan, currentCount: number, limitType: 'drivers' | 'vehicles' | 'bookings'): number => {
  const limit = currentPlan.limits[limitType];
  if (limit === -1) return 0; // unlimited
  return Math.min((currentCount / limit) * 100, 100);
};