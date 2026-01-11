const Subscribers = require('../models/Subscribers');
const SubscriptionPlans = require('../models/SubscriptionsPlans');
const Company = require('../models/Company');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Payment = require('../models/Payment');
const NotificationService = require('./notificationService');

const SubscriptionService = {
  
  /**
   * Start a new subscription for a transporter/company
   */
  async startSubscription(userId, planId, paymentData = null) {
    try {
      // Get the plan details
      const plan = await SubscriptionPlans.getSubscriptionPlan(planId);
      if (!plan) throw new Error('Invalid plan');

      // Check if user has already used trial
      if (plan.billingCycle === 'trial') {
        const hasUsedTrial = await Subscribers.hasUsedTrial(userId);
        if (hasUsedTrial) {
          throw new Error('Trial already used. Please select a paid plan.');
        }
      }

      // Check for existing active subscription
      const existingSubscription = await Subscribers.getByUserId(userId);
      if (existingSubscription) {
        throw new Error('User already has an active subscription');
      }

      // Calculate dates
      const startDate = new Date();
      let endDate;
      if (plan.billingCycle === 'trial') {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (plan.trialDays || 14));
      } else {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + plan.duration);
      }

      // For paid plans, verify payment
      let paymentStatus = 'pending';
      let transactionId = null;

      if (plan.price > 0 && paymentData) {
        // Create payment record
        const payment = await Payment.create({
          payerId: userId,
          planId: planId,
          amount: plan.price,
          currency: plan.currency,
          ...paymentData,
        });
        transactionId = payment.paymentId;
        paymentStatus = payment.status;
      } else if (plan.price === 0) {
        paymentStatus = 'completed'; // Free trial
      }

      // Create subscriber record
      const subscriber = await Subscribers.create({
        userId,
        planId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isActive: paymentStatus === 'completed',
        autoRenew: plan.billingCycle !== 'trial',
        paymentStatus,
        transactionId,
        status: paymentStatus === 'completed' ? 'active' : 'pending',
      });

      return {
        success: true,
        subscriber,
        plan,
        message: plan.billingCycle === 'trial' 
          ? 'Trial started successfully' 
          : 'Subscription created. Awaiting payment confirmation.',
      };
    } catch (error) {
      console.error('Error starting subscription:', error);
      throw error;
    }
  },

  /**
   * Validate if user can add more drivers
   */
  async canAddDriver(companyId) {
    try {
      // Get company to find transporter
      const company = await Company.get(companyId);
      if (!company) throw new Error('Company not found');

      // Get transporter's subscription
      const subscription = await Subscribers.getByUserId(company.transporterId);
      if (!subscription || !subscription.isActive) {
        return { 
          allowed: false, 
          reason: 'No active subscription. Please subscribe to add drivers.' 
        };
      }

      // Get plan limits
      const plan = await SubscriptionPlans.getSubscriptionPlan(subscription.planId);
    
      const maxDrivers = plan.maxDrivers;
      

      // If unlimited
      if (SubscriptionPlans.isUnlimited(maxDrivers)) {
        return { allowed: true };
      }

      // Count current drivers for this company
      const drivers = await Driver.getByCompanyId(companyId);
      const currentDriverCount = drivers ? drivers.length : 0;
      console.log('Current driver count:', currentDriverCount);

      if (currentDriverCount >= maxDrivers) {
        return {
          allowed: false,
          reason: `Driver limit reached (${maxDrivers}). Upgrade your plan to add more drivers.`,
          currentCount: currentDriverCount,
          maxAllowed: maxDrivers,
        };
      }

      return { 
        allowed: true, 
        remaining: maxDrivers - currentDriverCount 
      };
    } catch (error) {
      console.error('Error checking driver limit:', error);
      throw error;
    }
  },

  /**
   * Validate if user can add more vehicles
   */
  async canAddVehicle(companyId) {
    try {
      const company = await Company.get(companyId);
      if (!company) throw new Error('Company not found');

      const subscription = await Subscribers.getByUserId(company.transporterId);
      if (!subscription || !subscription.isActive) {
        return { 
          allowed: false, 
          reason: 'No active subscription. Please subscribe to add vehicles.' 
        };
      }

      const plan = await SubscriptionPlans.getSubscriptionPlan(subscription.planId);
      const maxVehicles = plan.maxVehicles;

      if (SubscriptionPlans.isUnlimited(maxVehicles)) {
        return { allowed: true };
      }

      // Count current vehicles
      const vehicles = await Vehicle.getByCompanyId(companyId);
      const currentVehicleCount = vehicles ? vehicles.length : 0;

      if (currentVehicleCount >= maxVehicles) {
        return {
          allowed: false,
          reason: `Vehicle limit reached (${maxVehicles}). Upgrade your plan to add more vehicles.`,
          currentCount: currentVehicleCount,
          maxAllowed: maxVehicles,
        };
      }

      return { 
        allowed: true, 
        remaining: maxVehicles - currentVehicleCount 
      };
    } catch (error) {
      console.error('Error checking vehicle limit:', error);
      throw error;
    }
  },

  /**
   * Get subscription status for a transporter
   */
  async getSubscriptionStatus(userId) {
    try {
      const subscription = await Subscribers.getByUserId(userId);
      if (!subscription) {
        return {
          hasSubscription: false,
          message: 'No active subscription',
        };
      }

      const plan = await SubscriptionPlans.getSubscriptionPlan(subscription.planId);
      
      // Get all companies for this transporter
      const companies = await Company.getByTransporter(userId);
      
      // Count total drivers and vehicles across all companies
      let totalDrivers = 0;
      let totalVehicles = 0;
      
      for (const company of companies) {
        const drivers = await Driver.getByCompanyId(company.id);
        const vehicles = await Vehicle.getByCompanyId(company.id);
        totalDrivers += drivers ? drivers.length : 0;
        totalVehicles += vehicles ? vehicles.length : 0;
      }

      return {
        hasSubscription: true,
        subscription,
        plan,
        usage: {
          drivers: {
            current: totalDrivers,
            max: plan.features.maxDrivers,
            unlimited: SubscriptionPlans.isUnlimited(plan.features.maxDrivers),
          },
          vehicles: {
            current: totalVehicles,
            max: plan.features.maxVehicles,
            unlimited: SubscriptionPlans.isUnlimited(plan.features.maxVehicles),
          },
        },
        daysRemaining: this.calculateDaysRemaining(subscription.endDate),
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      throw error;
    }
  },

  /**
   * Upgrade subscription
   */
  async upgradeSubscription(userId, newPlanId, paymentData) {
    try {
      const currentSubscription = await Subscribers.getByUserId(userId);
      if (!currentSubscription) {
        throw new Error('No active subscription to upgrade');
      }

      const currentPlan = await SubscriptionPlans.getSubscriptionPlan(currentSubscription.planId);
      const newPlan = await SubscriptionPlans.getSubscriptionPlan(newPlanId);
     
      // Calculate prorated amount
      const daysRemaining = this.calculateDaysRemaining(currentSubscription.endDate);
      const dailyRate = currentPlan.price / 30;
      const refundAmount = dailyRate * daysRemaining;
      const proratedAmount = newPlan.price - refundAmount;

      // Create payment for prorated amount
      const payment = await Payment.create({
        payerId: userId,
        subscriberId: currentSubscription.subscriberId,
        planId: newPlanId,
        amount: proratedAmount > 0 ? proratedAmount : 0,
        currency: newPlan.currency,
        ...paymentData,
      });

      if (!payment) {
        throw new Error('Failed to create payment for prorated amount');
      }

      // Update subscription
      const updatedSubscription = await Subscribers.update(currentSubscription.subscriberId, {
        previousPlanId: currentSubscription.planId,
        planId: newPlanId,
        lastChange: new Date().toISOString(),
        changeType: 'upgrade',
        proratedAmount,
        paymentStatus: payment.status,
        transactionId: payment.paymentId,
      });

      return {
        success: true,
        subscription: updatedSubscription,
        payment,
        message: 'Subscription upgraded successfully',
      };
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      throw error;
    }
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId, reason) {
    try {
      const subscription = await Subscribers.getByUserId(userId);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      await Subscribers.update(subscription.subscriberId, {
        isActive: false,
        status: 'cancelled',
        cancellationDate: new Date().toISOString(),
        cancellationReason: reason,
        autoRenew: false,
      });

      return {
        success: true,
        message: 'Subscription cancelled. Access will continue until end date.',
        endDate: subscription.endDate,
      };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  },

  /**
   * Helper: Calculate days remaining
   */
  calculateDaysRemaining(endDate) {
    const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
    const now = new Date();
    const diff = end - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  },

  /**
   * Check if subscription has expired and update status
   */
  async checkAndUpdateExpiredSubscriptions() {
    try {
      const expiredSubscriptions = await Subscribers.getExpiredSubscriptions();
      
      for (const subscription of expiredSubscriptions) {
        await Subscribers.update(subscription.subscriberId, {
          isActive: false,
          status: 'expired',
        });
        
        // Send notification
        await this.sendExpiryNotification(subscription);
      }

      return expiredSubscriptions.length;
    } catch (error) {
      console.error('Error checking expired subscriptions:', error);
      throw error;
    }
  },

  /**
   * Send expiry notification
   */
  async sendExpiryNotification(subscription) {
    // TODO: Implement email/SMS notification
    console.log(`Subscription expired for user ${subscription.userId}`);
    await NotificationService.sendExpiryNotification(subscription);
  },

  /**
   * Send expiring soon notification
   */
  async sendExpiringNotification(subscription, daysRemaining) {
    // TODO: Implement email/SMS notification
    console.log(`Subscription expiring soon for user ${subscription.userId}`);
    await NotificationService.sendExpiringNotification(subscription, daysRemaining);
  },
  
};

module.exports = SubscriptionService;