import { SubscriptionStatus } from './subscriptionService';
import { COMPANY_FLEET_PLANS, getPlanById } from '../constants/subscriptionPlans';

export interface FleetValidationResult {
  canAdd: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  currentCount: number;
  limit: number;
  percentage: number;
  suggestedPlan?: string;
}

export interface FeatureAccessResult {
  hasAccess: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  featureName: string;
  suggestedPlan?: string;
}

class CompanyFleetValidationService {
  /**
   * Validate if company can add more drivers
   */
  validateDriverAddition(
    subscriptionStatus: SubscriptionStatus,
    additionalDrivers: number = 1
  ): FleetValidationResult {
    const currentCount = subscriptionStatus.currentDriverCount || 0;
    const requestedTotal = currentCount + additionalDrivers;
    
    console.log('🔍 CompanyFleetValidationService - Driver validation input:', {
      subscriptionStatus: JSON.stringify(subscriptionStatus, null, 2),
      additionalDrivers,
      currentCount,
      requestedTotal
    });
    
    // Free trial limits
    if (subscriptionStatus.freeTrialActive || subscriptionStatus.isTrialActive || subscriptionStatus.isTrial) {
      const trialLimit = 3;
      console.log('✅ Using free trial limit for drivers:', trialLimit);
      if (requestedTotal > trialLimit) {
        return {
          canAdd: false,
          reason: `Free trial allows up to ${trialLimit} drivers. You have ${currentCount} drivers.`,
          upgradeRequired: true,
          currentCount,
          limit: trialLimit,
          percentage: Math.min((currentCount / trialLimit) * 100, 100),
          suggestedPlan: 'fleet_basic'
        };
      }
    }
    
    // Plan limits
    const driverLimit = subscriptionStatus.driverLimit || 0;
    console.log('🔍 Using driverLimit from subscription:', driverLimit);
    
    if (driverLimit === -1) {
      // Unlimited drivers
      return {
        canAdd: true,
        currentCount,
        limit: -1,
        percentage: 0
      };
    }
    
    if (requestedTotal > driverLimit) {
      const currentPlan = subscriptionStatus.currentPlan;
      const suggestedPlan = this.getNextPlanWithHigherDriverLimit(currentPlan?.id);
      
      return {
        canAdd: false,
        reason: `Your current plan allows up to ${driverLimit} drivers. You have ${currentCount} drivers.`,
        upgradeRequired: true,
        currentCount,
        limit: driverLimit,
        percentage: Math.min((currentCount / driverLimit) * 100, 100),
        suggestedPlan
      };
    }
    
    return {
      canAdd: true,
      currentCount,
      limit: driverLimit,
      percentage: Math.min((currentCount / driverLimit) * 100, 100)
    };
  }

  /**
   * Validate if company can add more vehicles
   */
  validateVehicleAddition(
    subscriptionStatus: SubscriptionStatus,
    additionalVehicles: number = 1
  ): FleetValidationResult {
    const currentCount = subscriptionStatus.currentVehicleCount || 0;
    const requestedTotal = currentCount + additionalVehicles;
    
    console.log('🔍 CompanyFleetValidationService - Vehicle validation input:', {
      subscriptionStatus: JSON.stringify(subscriptionStatus, null, 2),
      additionalVehicles,
      currentCount,
      requestedTotal
    });
    
    // Free trial limits
    if (subscriptionStatus.freeTrialActive || subscriptionStatus.isTrialActive || subscriptionStatus.isTrial) {
      const trialLimit = 3;
      console.log('✅ Using free trial limit for vehicles:', trialLimit);
      if (requestedTotal > trialLimit) {
        return {
          canAdd: false,
          reason: `Free trial allows up to ${trialLimit} vehicles. You have ${currentCount} vehicles.`,
          upgradeRequired: true,
          currentCount,
          limit: trialLimit,
          percentage: Math.min((currentCount / trialLimit) * 100, 100),
          suggestedPlan: 'fleet_basic'
        };
      }
    }
    
    // Plan limits
    const vehicleLimit = subscriptionStatus.vehicleLimit || 0;
    console.log('🔍 Using vehicleLimit from subscription:', vehicleLimit);
    
    if (vehicleLimit === -1) {
      // Unlimited vehicles
      return {
        canAdd: true,
        currentCount,
        limit: -1,
        percentage: 0
      };
    }
    
    if (requestedTotal > vehicleLimit) {
      const currentPlan = subscriptionStatus.currentPlan;
      const suggestedPlan = this.getNextPlanWithHigherVehicleLimit(currentPlan?.id);
      
      return {
        canAdd: false,
        reason: `Your current plan allows up to ${vehicleLimit} vehicles. You have ${currentCount} vehicles.`,
        upgradeRequired: true,
        currentCount,
        limit: vehicleLimit,
        percentage: Math.min((currentCount / vehicleLimit) * 100, 100),
        suggestedPlan
      };
    }
    
    return {
      canAdd: true,
      currentCount,
      limit: vehicleLimit,
      percentage: Math.min((currentCount / vehicleLimit) * 100, 100)
    };
  }

  /**
   * Check if company has access to job seekers marketplace
   */
  validateJobSeekersAccess(subscriptionStatus: SubscriptionStatus): FeatureAccessResult {
    const currentPlan = subscriptionStatus.currentPlan;
    
    // Free trial doesn't have access to job seekers marketplace
    if (subscriptionStatus.freeTrialActive) {
      return {
        hasAccess: false,
        reason: 'Job Seekers Marketplace is not available during free trial.',
        upgradeRequired: true,
        featureName: 'Job Seekers Marketplace',
        suggestedPlan: 'fleet_growing'
      };
    }
    
    // Only Growing Fleet and Unlimited Fleet have access
    if (currentPlan?.id === 'fleet_basic') {
      return {
        hasAccess: false,
        reason: 'Job Seekers Marketplace is available in Growing Fleet plan and above.',
        upgradeRequired: true,
        featureName: 'Job Seekers Marketplace',
        suggestedPlan: 'fleet_growing'
      };
    }
    
    return {
      hasAccess: true,
      featureName: 'Job Seekers Marketplace'
    };
  }

  /**
   * Check if company has access to advanced analytics
   */
  validateAdvancedAnalyticsAccess(subscriptionStatus: SubscriptionStatus): FeatureAccessResult {
    const currentPlan = subscriptionStatus.currentPlan;
    
    // Free trial doesn't have access to advanced analytics
    if (subscriptionStatus.freeTrialActive) {
      return {
        hasAccess: false,
        reason: 'Advanced Analytics is not available during free trial.',
        upgradeRequired: true,
        featureName: 'Advanced Analytics',
        suggestedPlan: 'fleet_growing'
      };
    }
    
    // Only Growing Fleet and Unlimited Fleet have access
    if (currentPlan?.id === 'fleet_basic') {
      return {
        hasAccess: false,
        reason: 'Advanced Analytics is available in Growing Fleet plan and above.',
        upgradeRequired: true,
        featureName: 'Advanced Analytics',
        suggestedPlan: 'fleet_growing'
      };
    }
    
    return {
      hasAccess: true,
      featureName: 'Advanced Analytics'
    };
  }

  /**
   * Check if company has access to route optimization
   */
  validateRouteOptimizationAccess(subscriptionStatus: SubscriptionStatus): FeatureAccessResult {
    const currentPlan = subscriptionStatus.currentPlan;
    
    // Free trial doesn't have access to route optimization
    if (subscriptionStatus.freeTrialActive) {
      return {
        hasAccess: false,
        reason: 'Route Optimization is not available during free trial.',
        upgradeRequired: true,
        featureName: 'Route Optimization',
        suggestedPlan: 'fleet_growing'
      };
    }
    
    // Only Growing Fleet and Unlimited Fleet have access
    if (currentPlan?.id === 'fleet_basic') {
      return {
        hasAccess: false,
        reason: 'Route Optimization is available in Growing Fleet plan and above.',
        upgradeRequired: true,
        featureName: 'Route Optimization',
        suggestedPlan: 'fleet_growing'
      };
    }
    
    return {
      hasAccess: true,
      featureName: 'Route Optimization'
    };
  }

  /**
   * Check if company has access to dedicated account manager
   */
  validateAccountManagerAccess(subscriptionStatus: SubscriptionStatus): FeatureAccessResult {
    const currentPlan = subscriptionStatus.currentPlan;
    
    // Only Growing Fleet and Unlimited Fleet have access
    if (currentPlan?.id === 'fleet_basic' || subscriptionStatus.freeTrialActive) {
      return {
        hasAccess: false,
        reason: 'Dedicated Account Manager is available in Growing Fleet plan and above.',
        upgradeRequired: true,
        featureName: 'Dedicated Account Manager',
        suggestedPlan: 'fleet_growing'
      };
    }
    
    return {
      hasAccess: true,
      featureName: 'Dedicated Account Manager'
    };
  }

  /**
   * Check if company has access to custom integrations
   */
  validateCustomIntegrationsAccess(subscriptionStatus: SubscriptionStatus): FeatureAccessResult {
    const currentPlan = subscriptionStatus.currentPlan;
    
    // Only Unlimited Fleet has access
    if (currentPlan?.id !== 'fleet_enterprise') {
      return {
        hasAccess: false,
        reason: 'Custom Integrations are available in Unlimited Fleet plan only.',
        upgradeRequired: true,
        featureName: 'Custom Integrations',
        suggestedPlan: 'fleet_enterprise'
      };
    }
    
    return {
      hasAccess: true,
      featureName: 'Custom Integrations'
    };
  }

  /**
   * Get the next plan with higher driver limit
   */
  private getNextPlanWithHigherDriverLimit(currentPlanId?: string): string {
    const plans = COMPANY_FLEET_PLANS;
    const currentIndex = plans.findIndex(plan => plan.id === currentPlanId);
    
    if (currentIndex === -1 || currentIndex >= plans.length - 1) {
      return 'fleet_enterprise'; // Default to highest plan
    }
    
    return plans[currentIndex + 1].id;
  }

  /**
   * Get the next plan with higher vehicle limit
   */
  private getNextPlanWithHigherVehicleLimit(currentPlanId?: string): string {
    const plans = COMPANY_FLEET_PLANS;
    const currentIndex = plans.findIndex(plan => plan.id === currentPlanId);
    
    if (currentIndex === -1 || currentIndex >= plans.length - 1) {
      return 'fleet_enterprise'; // Default to highest plan
    }
    
    return plans[currentIndex + 1].id;
  }

  /**
   * Get plan details by ID
   */
  getPlanDetails(planId: string) {
    return getPlanById(planId);
  }

  /**
   * Get all available plans
   */
  getAllPlans() {
    return COMPANY_FLEET_PLANS;
  }

  /**
   * Get usage statistics for display
   */
  getUsageStatistics(subscriptionStatus: SubscriptionStatus) {
    const driverValidation = this.validateDriverAddition(subscriptionStatus, 0);
    const vehicleValidation = this.validateVehicleAddition(subscriptionStatus, 0);
    
    return {
      drivers: {
        current: driverValidation.currentCount,
        limit: driverValidation.limit,
        percentage: driverValidation.percentage,
        canAdd: driverValidation.canAdd
      },
      vehicles: {
        current: vehicleValidation.currentCount,
        limit: vehicleValidation.limit,
        percentage: vehicleValidation.percentage,
        canAdd: vehicleValidation.canAdd
      },
      features: {
        jobSeekers: this.validateJobSeekersAccess(subscriptionStatus),
        analytics: this.validateAdvancedAnalyticsAccess(subscriptionStatus),
        routeOptimization: this.validateRouteOptimizationAccess(subscriptionStatus),
        accountManager: this.validateAccountManagerAccess(subscriptionStatus),
        customIntegrations: this.validateCustomIntegrationsAccess(subscriptionStatus)
      }
    };
  }
}

export default new CompanyFleetValidationService();

