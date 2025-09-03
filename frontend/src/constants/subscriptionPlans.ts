import { SubscriptionPlan } from '../components/common/SubscriptionPlanCard';

export const transporterPlans: SubscriptionPlan[] = [
  {
    id: 'transporter-basic',
    name: 'Basic',
    price: 2500,
    period: 'monthly',
    features: [
      'Up to 50 job requests per month',
      'Basic route optimization',
      'Standard customer support',
      'Mobile app access',
      'Basic analytics',
    ],
  },
  {
    id: 'transporter-pro',
    name: 'Professional',
    price: 5000,
    period: 'monthly',
    popular: true,
    features: [
      'Unlimited job requests',
      'Advanced route optimization',
      'Priority customer support',
      'Real-time tracking',
      'Advanced analytics & insights',
      'Bulk booking discounts',
      'Insurance coverage',
    ],
  },
  {
    id: 'transporter-enterprise',
    name: 'Enterprise',
    price: 12000,
    period: 'monthly',
    features: [
      'Everything in Professional',
      'Fleet management tools',
      'Custom integrations',
      'Dedicated account manager',
      'White-label solutions',
      'API access',
      'Advanced reporting',
    ],
  },
];

export const brokerPlans: SubscriptionPlan[] = [
  {
    id: 'broker-starter',
    name: 'Starter',
    price: 5000,
    period: 'monthly',
    features: [
      'Up to 100 client requests per month',
      'Basic consolidation tools',
      'Standard customer support',
      'Mobile app access',
      'Basic reporting',
    ],
  },
  {
    id: 'broker-professional',
    name: 'Professional',
    price: 10000,
    period: 'monthly',
    popular: true,
    features: [
      'Unlimited client requests',
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
    price: 25000,
    period: 'monthly',
    features: [
      'Everything in Professional',
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



