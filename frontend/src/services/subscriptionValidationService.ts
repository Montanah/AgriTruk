import { Alert } from 'react-native';
import { getPlanById, canAddDriver, getPlanUsagePercentage, type SubscriptionPlan } from '../constants/subscriptionPlans';

export interface CompanySubscription {
  planId: string;
  plan: SubscriptionPlan;
  currentDriverCount: number;
  currentVehicleCount: number;
  isActive: boolean;
  expiresAt: string;
  features: {
    driverRecruitment: boolean;
    advancedAnalytics: boolean;
    routeOptimization: boolean;
    prioritySupport: boolean;
    customIntegrations: boolean;
    whiteLabel: boolean;
  };
}

export interface ValidationResult {
  canProceed: boolean;
  message?: string;
  upgradeRequired?: boolean;
  currentUsage: {
    drivers: { current: number; limit: number; percentage: number };
    vehicles: { current: number; limit: number; percentage: number };
  };
}

class SubscriptionValidationService {
  private static instance: SubscriptionValidationService;

  private constructor() {}

  public static getInstance(): SubscriptionValidationService {
    if (!SubscriptionValidationService.instance) {
      SubscriptionValidationService.instance = new SubscriptionValidationService();
    }
    return SubscriptionValidationService.instance;
  }

  /**
   * Validates if a company can add a new driver based on their subscription plan
   */
  public validateDriverAddition(
    subscription: CompanySubscription,
    additionalDrivers: number = 1
  ): ValidationResult {
    const { plan, currentDriverCount } = subscription;
    
    const canAdd = canAddDriver(plan, currentDriverCount + additionalDrivers - 1);
    const newDriverCount = currentDriverCount + additionalDrivers;
    const driverLimit = plan.limits.drivers || 0;
    const driverPercentage = getPlanUsagePercentage(plan, newDriverCount, 'drivers');

    const result: ValidationResult = {
      canProceed: canAdd,
      currentUsage: {
        drivers: {
          current: currentDriverCount,
          limit: driverLimit === -1 ? -1 : driverLimit,
          percentage: getPlanUsagePercentage(plan, currentDriverCount, 'drivers')
        },
        vehicles: {
          current: subscription.currentVehicleCount,
          limit: plan.limits.vehicles === -1 ? -1 : (plan.limits.vehicles || 0),
          percentage: getPlanUsagePercentage(plan, subscription.currentVehicleCount, 'vehicles')
        }
      }
    };

    if (!canAdd) {
      result.message = `You have reached the driver limit for your ${plan.name} plan (${driverLimit === -1 ? 'unlimited' : driverLimit} drivers). Please upgrade to add more drivers.`;
      result.upgradeRequired = true;
    } else if (driverPercentage >= 80) {
      result.message = `You're using ${Math.round(driverPercentage)}% of your driver limit. Consider upgrading your plan for better scalability.`;
    }

    return result;
  }

  /**
   * Validates if a company can add a new vehicle based on their subscription plan
   */
  public validateVehicleAddition(
    subscription: CompanySubscription,
    additionalVehicles: number = 1
  ): ValidationResult {
    const { plan, currentVehicleCount } = subscription;
    
    const vehicleLimit = plan.limits.vehicles || 0;
    const canAdd = vehicleLimit === -1 || (currentVehicleCount + additionalVehicles) <= vehicleLimit;
    const newVehicleCount = currentVehicleCount + additionalVehicles;
    const vehiclePercentage = getPlanUsagePercentage(plan, newVehicleCount, 'vehicles');

    const result: ValidationResult = {
      canProceed: canAdd,
      currentUsage: {
        drivers: {
          current: subscription.currentDriverCount,
          limit: plan.limits.drivers === -1 ? -1 : (plan.limits.drivers || 0),
          percentage: getPlanUsagePercentage(plan, subscription.currentDriverCount, 'drivers')
        },
        vehicles: {
          current: currentVehicleCount,
          limit: vehicleLimit === -1 ? -1 : vehicleLimit,
          percentage: getPlanUsagePercentage(plan, currentVehicleCount, 'vehicles')
        }
      }
    };

    if (!canAdd) {
      result.message = `You have reached the vehicle limit for your ${plan.name} plan (${vehicleLimit === -1 ? 'unlimited' : vehicleLimit} vehicles). Please upgrade to add more vehicles.`;
      result.upgradeRequired = true;
    } else if (vehiclePercentage >= 80) {
      result.message = `You're using ${Math.round(vehiclePercentage)}% of your vehicle limit. Consider upgrading your plan for better scalability.`;
    }

    return result;
  }

  /**
   * Shows an alert for subscription limit violations
   */
  public showLimitAlert(
    validation: ValidationResult,
    onUpgrade?: () => void,
    onCancel?: () => void
  ) {
    if (!validation.canProceed && validation.upgradeRequired) {
      Alert.alert(
        'Subscription Limit Reached',
        validation.message || 'You have reached your subscription limit.',
        [
          { text: 'Cancel', style: 'cancel', onPress: onCancel },
          { text: 'Upgrade Plan', style: 'default', onPress: onUpgrade }
        ],
        { cancelable: false }
      );
    } else if (validation.message) {
      Alert.alert(
        'Subscription Usage',
        validation.message,
        [{ text: 'OK', style: 'default' }]
      );
    }
  }

  /**
   * Gets the recommended plan upgrade based on current usage
   */
  public getRecommendedUpgrade(currentPlan: SubscriptionPlan): SubscriptionPlan | null {
    // This would typically fetch from a backend service
    // For now, we'll use a simple logic based on plan hierarchy
    
    const planHierarchy = ['fleet_basic', 'fleet_growing', 'fleet_enterprise'];
    const currentIndex = planHierarchy.indexOf(currentPlan.id);
    
    if (currentIndex < planHierarchy.length - 1) {
      const nextPlanId = planHierarchy[currentIndex + 1];
      return getPlanById(nextPlanId) || null;
    }
    
    return null;
  }

  /**
   * Checks if a company has access to a specific feature
   */
  public hasFeatureAccess(subscription: CompanySubscription, feature: keyof CompanySubscription['features']): boolean {
    return subscription.features[feature];
  }

  /**
   * Gets subscription usage summary for dashboard display
   */
  public getUsageSummary(subscription: CompanySubscription) {
    const driverUsage = getPlanUsagePercentage(subscription.plan, subscription.currentDriverCount, 'drivers');
    const vehicleUsage = getPlanUsagePercentage(subscription.plan, subscription.currentVehicleCount, 'vehicles');
    
    return {
      drivers: {
        current: subscription.currentDriverCount,
        limit: subscription.plan.limits.drivers === -1 ? 'Unlimited' : subscription.plan.limits.drivers,
        percentage: driverUsage,
        status: driverUsage >= 90 ? 'critical' : driverUsage >= 80 ? 'warning' : 'good'
      },
      vehicles: {
        current: subscription.currentVehicleCount,
        limit: subscription.plan.limits.vehicles === -1 ? 'Unlimited' : subscription.plan.limits.vehicles,
        percentage: vehicleUsage,
        status: vehicleUsage >= 90 ? 'critical' : vehicleUsage >= 80 ? 'warning' : 'good'
      },
      plan: {
        name: subscription.plan.name,
        price: subscription.plan.price,
        currency: subscription.plan.currency,
        billingPeriod: subscription.plan.billingPeriod
      }
    };
  }
}

export const subscriptionValidationService = SubscriptionValidationService.getInstance();
