const RecruiterSubscribers = require('../models/RecruiterSubscribers');
const RecruiterPlans = require('../models/RecruiterPlans');
const Payment = require('../models/Payment');
const NotificationService = require('./notificationService');

const RecruiterSubscriptionService = {
  
  /**
   * Start a new subscription for a recruiter
   */
  async startSubscription(userId, planId, paymentData = null) {
    try {
      // Get the plan details
      const plan = await RecruiterPlans.get(planId);
      if (!plan) throw new Error('Invalid plan');

      // Check if user has already used trial
      if (plan.billingCycle === 'trial') {
        const hasUsedTrial = await RecruiterSubscribers.hasUsedTrial(userId);
        if (hasUsedTrial) {
          throw new Error('Trial already used. Please select a paid plan.');
        }
      }

      // Check for existing active subscription
      const existingSubscription = await RecruiterSubscribers.getByUserId(userId);
      if (existingSubscription) {
        throw new Error('User already has an active subscription');
      }

      // Calculate dates
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + plan.duration);

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
      const subscriber = await RecruiterSubscribers.create({
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
   * Validate if user can contact more drivers
   */
  async canContactDriver(userId) {
    try {
      const subscription = await RecruiterSubscribers.getByUserId(userId);
      if (!subscription || !subscription.isActive) {
        return { 
          allowed: false, 
          reason: 'No active subscription. Please subscribe to contact drivers.' 
        };
      }

      // Check if subscription has expired
      const endDate = subscription.endDate.toDate ? subscription.endDate.toDate() : new Date(subscription.endDate);
      if (endDate < new Date()) {
        return {
          allowed: false,
          reason: 'Your subscription has expired. Please renew to continue.'
        };
      }

      const plan = await RecruiterPlans.get(subscription.planId);
      const maxContacts = plan.features.maxDriverContacts;

      // If unlimited
      if (RecruiterPlans.isUnlimited(maxContacts)) {
        return { allowed: true };
      }

      const currentContacts = subscription.currentUsage?.driverContacts || 0;

      if (currentContacts >= maxContacts) {
        return {
          allowed: false,
          reason: `Driver contact limit reached (${maxContacts}). Upgrade your plan to contact more drivers.`,
          currentCount: currentContacts,
          maxAllowed: maxContacts,
        };
      }

      return { 
        allowed: true, 
        remaining: maxContacts - currentContacts 
      };
    } catch (error) {
      console.error('Error checking driver contact limit:', error);
      throw error;
    }
  },

  /**
   * Validate if user can post more jobs
   */
  async canPostJob(userId) {
    try {
      const subscription = await RecruiterSubscribers.getByUserId(userId);
      if (!subscription || !subscription.isActive) {
        return { 
          allowed: false, 
          reason: 'No active subscription. Please subscribe to post jobs.' 
        };
      }

      // Check if subscription has expired
      const endDate = subscription.endDate.toDate ? subscription.endDate.toDate() : new Date(subscription.endDate);
      if (endDate < new Date()) {
        return {
          allowed: false,
          reason: 'Your subscription has expired. Please renew to continue.'
        };
      }

      const plan = await RecruiterPlans.get(subscription.planId);
      const maxJobPosts = plan.features.maxActiveJobPosts;

      if (RecruiterPlans.isUnlimited(maxJobPosts)) {
        return { allowed: true };
      }

      const currentJobPosts = subscription.currentUsage?.activeJobPosts || 0;

      if (currentJobPosts >= maxJobPosts) {
        return {
          allowed: false,
          reason: `Job posting limit reached (${maxJobPosts}). Upgrade your plan to post more jobs.`,
          currentCount: currentJobPosts,
          maxAllowed: maxJobPosts,
        };
      }

      return { 
        allowed: true, 
        remaining: maxJobPosts - currentJobPosts 
      };
    } catch (error) {
      console.error('Error checking job posting limit:', error);
      throw error;
    }
  },

  /**
   * Get subscription status for a recruiter
   */
  async getSubscriptionStatus(userId) {
    try {
      const subscription = await RecruiterSubscribers.getByUserId(userId);
      if (!subscription) {
        return {
          hasSubscription: false,
          message: 'No active subscription',
        };
      }

      const plan = await RecruiterPlans.get(subscription.planId);
      
      return {
        hasSubscription: true,
        subscription,
        plan,
        usage: {
          driverContacts: {
            current: subscription.currentUsage?.driverContacts || 0,
            max: plan.features.maxDriverContacts,
            unlimited: RecruiterPlans.isUnlimited(plan.features.maxDriverContacts),
          },
          jobPosts: {
            current: subscription.currentUsage?.activeJobPosts || 0,
            max: plan.features.maxActiveJobPosts,
            unlimited: RecruiterPlans.isUnlimited(plan.features.maxActiveJobPosts),
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
      const currentSubscription = await RecruiterSubscribers.getByUserId(userId);
      if (!currentSubscription) {
        throw new Error('No active subscription to upgrade');
      }

      const currentPlan = await RecruiterPlans.get(currentSubscription.planId);
      const newPlan = await RecruiterPlans.get(newPlanId);
      if (!currentPlan || !newPlan) {
        throw new Error('Invalid plan ID');
      }
     
      // Calculate prorated amount
      const daysRemaining = this.calculateDaysRemaining(currentSubscription.endDate);
      const dailyRate = currentPlan.price / currentPlan.duration;
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

      // Calculate new endDate based on new plan's duration
      const newStartDate = new Date(); // Start from today
      const newEndDate = new Date(newStartDate);
      const durationMs = newPlan.duration * 24 * 60 * 60 * 1000; // duration in days to ms
      newEndDate.setTime(newStartDate.getTime() + durationMs);
      // newEndDate.setDate(newStartDate.getDate() + newPlan.duration); // Extend by new plan's duration

      // Update subscription
      const updatedSubscription = await RecruiterSubscribers.update(currentSubscription.subscriberId, {
        previousPlanId: currentSubscription.planId,
        planId: newPlanId,
        lastChange: new Date().toISOString(),
        changeType: 'upgrade',
        proratedAmount,
        paymentStatus: payment.status,
        transactionId: payment.paymentId,
        endDate: newEndDate.toISOString(),
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
      const subscription = await RecruiterSubscribers.getByUserId(userId);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      await RecruiterSubscribers.update(subscription.subscriberId, {
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
    // const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    const now = new Date();
    const diff = end - now;
    if (diff <= 0) return 0;
    return diff / (1000 * 60 * 60 * 24); // Return fractional days
    // return Math.ceil(diff / (1000 * 60 * 60 * 24));
  },

  /**
   * Increment usage after action
   */
  async incrementUsage(userId, usageType) {
    try {
      const subscription = await RecruiterSubscribers.getByUserId(userId);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      await RecruiterSubscribers.incrementUsage(subscription.subscriberId, usageType);
      return { success: true };
    } catch (error) {
      console.error('Error incrementing usage:', error);
      throw error;
    }
  },

  /**
   * Decrement usage (e.g., when job post is closed)
   */
  async decrementUsage(userId, usageType) {
    try {
      const subscription = await RecruiterSubscribers.getByUserId(userId);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      await RecruiterSubscribers.decrementUsage(subscription.subscriberId, usageType);
      return { success: true };
    } catch (error) {
      console.error('Error decrementing usage:', error);
      throw error;
    }
  },

  /**
   * Check if subscription has expired and update status
   */
  async checkAndUpdateExpiredSubscriptions() {
    try {
      const expiredSubscriptions = await RecruiterSubscribers.getExpiredSubscriptions();
    
      for (const subscription of expiredSubscriptions) {
        await RecruiterSubscribers.update(subscription.subscriberId, {
          isActive: false,
          status: 'expired',
        });
        
        // Send notification
        await this.sendExpiryNotification(subscription);
        await this.sendExpiringNotification(subscription, this.calculateDaysRemaining(subscription.endDate));
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
    await NotificationService.sendExpiryNotification(subscription);
  },

  async sendExpiringNotification(subscription, daysRemaining) {
    // TODO: Implement email/SMS notification
    await NotificationService.sendExpiringNotification(subscription, daysRemaining);
  },
};

module.exports = RecruiterSubscriptionService;