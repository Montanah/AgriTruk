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
    id: 'transporter-starter',
    name: 'Starter',
    price: 199,
    period: 'monthly',
    features: [
      'Up to 20 job requests per month',
      'Basic route optimization',
      'Standard customer support',
      'Mobile app access',
      'Basic analytics',
    ],
  },
  {
    id: 'transporter-professional',
    name: 'Professional',
    price: 499,
    period: 'monthly',
    popular: true,
    features: [
      'Up to 100 job requests per month',
      'Advanced route optimization',
      'Priority customer support',
      'Real-time tracking',
      'Advanced analytics & insights',
      'Bulk booking discounts',
    ],
  },
  {
    id: 'transporter-enterprise',
    name: 'Enterprise',
    price: 1599,
    period: 'monthly',
    features: [
      'Unlimited job requests',
      'Advanced route optimization',
      'Priority customer support',
      'Real-time tracking',
      'Advanced analytics & insights',
      'Bulk booking discounts',
      'Insurance coverage',
      'Fleet management tools',
      'Custom integrations',
      'Dedicated account manager',
      'API access',
      'Advanced reporting',
    ],
  },
];

export const brokerPlans: SubscriptionPlan[] = [
  {
    id: 'broker-starter',
    name: 'Starter',
    price: 199,
    period: 'monthly',
    features: [
      'Up to 50 client requests per month',
      'Basic consolidation tools',
      'Standard customer support',
      'Mobile app access',
      'Basic reporting',
    ],
  },
  {
    id: 'broker-professional',
    name: 'Professional',
    price: 499,
    period: 'monthly',
    popular: true,
    features: [
      'Up to 200 client requests per month',
      'Advanced consolidation tools',
      'Priority customer support',
      'Real-time tracking for all shipments',
      'Advanced analytics & insights',
      'Commission tracking',
      'Client management tools',
    ],
  },
  {
    id: 'broker-enterprise',
    name: 'Enterprise',
    price: 1599,
    period: 'monthly',
    features: [
      'Unlimited client requests',
      'Advanced consolidation tools',
      'Priority customer support',
      'Real-time tracking for all shipments',
      'Advanced analytics & insights',
      'Commission tracking',
      'Client management tools',
      'Multi-client dashboard',
      'Custom integrations',
      'Dedicated account manager',
      'White-label solutions',
      'API access',
      'Advanced reporting & analytics',
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



