import { SubscriptionPlan } from '../components/common/SubscriptionPlanCard';

// Trial Plan - Free 30-day trial
export const trialPlan: SubscriptionPlan = {
  id: 'trial-plan',
  name: 'Free Trial',
  price: 0,
  period: 'monthly',
  features: [
    '30-day free trial',
    'Full access to all features',
    'Unlimited job requests',
    'Advanced route optimization',
    'Real-time tracking',
    'Priority customer support',
    'Advanced analytics & insights',
    'No commitment required',
  ],
};

export const transporterPlans: SubscriptionPlan[] = [
  {
    id: 'monthly-plan',
    name: 'Monthly Plan',
    price: 199,
    period: 'monthly',
    features: [
      'Unlimited job requests',
      'Advanced route optimization',
      'Priority customer support',
      'Real-time tracking',
      'Advanced analytics & insights',
      'Mobile app access',
    ],
  },
  {
    id: 'quarterly-plan',
    name: 'Quarterly Plan',
    price: 499,
    period: 'quarterly',
    popular: true,
    features: [
      'Unlimited job requests',
      'Advanced route optimization',
      'Priority customer support',
      'Real-time tracking',
      'Advanced analytics & insights',
      'Mobile app access',
      'Save 17% with quarterly billing',
    ],
  },
  {
    id: 'annual-plan',
    name: 'Annual Plan',
    price: 1599,
    period: 'annual',
    features: [
      'Unlimited job requests',
      'Advanced route optimization',
      'Priority customer support',
      'Real-time tracking',
      'Advanced analytics & insights',
      'Mobile app access',
      'Save 20% with annual billing',
    ],
  },
];

export const brokerPlans: SubscriptionPlan[] = [
  {
    id: 'monthly-plan',
    name: 'Monthly Plan',
    price: 199,
    period: 'monthly',
    features: [
      'Unlimited client requests',
      'Advanced consolidation tools',
      'Priority customer support',
      'Real-time tracking for all shipments',
      'Advanced analytics & insights',
      'Commission tracking',
      'Client management tools',
      'Mobile app access',
    ],
  },
  {
    id: 'quarterly-plan',
    name: 'Quarterly Plan',
    price: 499,
    period: 'quarterly',
    popular: true,
    features: [
      'Unlimited client requests',
      'Advanced consolidation tools',
      'Priority customer support',
      'Real-time tracking for all shipments',
      'Advanced analytics & insights',
      'Commission tracking',
      'Client management tools',
      'Mobile app access',
      'Save 17% with quarterly billing',
    ],
  },
  {
    id: 'annual-plan',
    name: 'Annual Plan',
    price: 1599,
    period: 'annual',
    features: [
      'Unlimited client requests',
      'Advanced consolidation tools',
      'Priority customer support',
      'Real-time tracking for all shipments',
      'Advanced analytics & insights',
      'Commission tracking',
      'Client management tools',
      'Mobile app access',
      'Save 20% with annual billing',
    ],
  },
];

// Yearly plans with discounts
export const transporterPlansYearly: SubscriptionPlan[] = transporterPlans.map((plan) => ({
  ...plan,
  id: plan.id + '-yearly',
  period: 'yearly' as const,
  price: Math.round(plan.price * 10), // 2 months free
  discount: 17,
}));

export const brokerPlansYearly: SubscriptionPlan[] = brokerPlans.map((plan) => ({
  ...plan,
  id: plan.id + '-yearly',
  period: 'yearly' as const,
  price: Math.round(plan.price * 10), // 2 months free
  discount: 17,
}));



