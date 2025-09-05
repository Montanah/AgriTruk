// services/notificationCronService.js
const SubscriptionPlans = require('../models/SubscriptionsPlans');
const Subscribers = require('../models/Subscribers');
const User = require('../models/User');
const sendEmail  = require('../utils/sendEmail');
const SMSService = require('../utils/sendSms');
const formatPhoneNumber = require("../utils/formatPhone");

const smsService = new SMSService(process.env.MOBILESASA_API_TOKEN);

class NotificationCronService {
  constructor() {
    this.notificationIntervals = {
      TRIAL_EXPIRING: [3, 1], // 3 days and 1 day before trial ends
      SUBSCRIPTION_EXPIRING: [7, 3, 1], // 7, 3, 1 days before subscription ends
      SUBSCRIPTION_EXPIRED: [0], // On expiration day
      SUBSCRIPTION_RENEWAL: [1], // 1 day after expiration (failed renewal)
      TRIAL_STARTED: [0], // On trial start
      SUBSCRIPTION_ACTIVATED: [0] // On subscription activation
    };
  }

  // Main cron job method
  async runSubscriptionNotifications() {
    try {
      console.log('🚀 Starting subscription notification cron job...');
      
      const now = new Date();
      const tasks = [
        this.checkTrialExpiring(),
        this.checkSubscriptionExpiring(),
        this.checkExpiredSubscriptions(),
        this.checkFailedRenewals(),
        this.checkNewTrials(),
        this.checkNewSubscriptions()
      ];

      const results = await Promise.allSettled(tasks);
      
      console.log('✅ Subscription notification cron job completed');
      return this.formatResults(results);
      
    } catch (error) {
      console.error('❌ Error in subscription notification cron:', error);
      throw error;
    }
  }

  // Check for trials expiring soon
  async checkTrialExpiring() {
    const notificationsSent = [];
    
    for (const daysBefore of this.notificationIntervals.TRIAL_EXPIRING) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBefore);
      
      const expiringTrials = await Subscribers.getExpiringTrials(targetDate);
      
      for (const subscriber of expiringTrials) {
        if (!subscriber.notifications?.trialExpiring?.includes(daysBefore)) {
          const user = await User.get(subscriber.userId);
          const plan = await SubscriptionPlans.getSubscriptionPlan(subscriber.planId);
          
          if (user && plan) {
            await this.sendTrialExpiringNotification(user, subscriber, plan, daysBefore);
            notificationsSent.push({
              userId: subscriber.userId,
              type: 'trial_expiring',
              daysBefore,
              sentAt: new Date()
            });
          }
        }
      }
    }
    
    return { type: 'trial_expiring', count: notificationsSent.length, notifications: notificationsSent };
  }

  // Check for subscriptions expiring soon
  async checkSubscriptionExpiring() {
    const notificationsSent = [];
    
    for (const daysBefore of this.notificationIntervals.SUBSCRIPTION_EXPIRING) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBefore);
      
      const expiringSubscriptions = await Subscribers.getExpiringSubscriptions(targetDate);
      
      for (const subscriber of expiringSubscriptions) {
        if (!subscriber.notifications?.subscriptionExpiring?.includes(daysBefore)) {
          const user = await User.get(subscriber.userId);
          const plan = await SubscriptionPlans.getSubscriptionPlan(subscriber.planId);
          
          if (user && plan) {
            await this.sendSubscriptionExpiringNotification(user, subscriber, plan, daysBefore);
            notificationsSent.push({
              userId: subscriber.userId,
              type: 'subscription_expiring',
              daysBefore,
              sentAt: new Date()
            });
          }
        }
      }
    }
    
    return { type: 'subscription_expiring', count: notificationsSent.length, notifications: notificationsSent };
  }

  // Check for expired subscriptions
  async checkExpiredSubscriptions() {
    const notificationsSent = [];
    const expiredSubscriptions = await Subscribers.getExpiredSubscriptions();
    
    for (const subscriber of expiredSubscriptions) {
      if (!subscriber.notifications?.subscriptionExpired) {
        const user = await User.get(subscriber.userId);
        const plan = await SubscriptionPlans.getSubscriptionPlan(subscriber.planId);
        
        if (user && plan) {
          await this.sendSubscriptionExpiredNotification(user, subscriber, plan);
          notificationsSent.push({
            userId: subscriber.userId,
            type: 'subscription_expired',
            sentAt: new Date()
          });
        }
      }
    }
    
    return { type: 'subscription_expired', count: notificationsSent.length, notifications: notificationsSent };
  }

  // Check for failed renewals
  async checkFailedRenewals() {
    const notificationsSent = [];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const failedRenewals = await Subscribers.getFailedRenewals(yesterday);
    
    for (const subscriber of failedRenewals) {
      if (!subscriber.notifications?.renewalFailed) {
        const user = await User.get(subscriber.userId);
        const plan = await SubscriptionPlans.getSubscriptionPlan(subscriber.planId);
        
        if (user && plan) {
          await this.sendRenewalFailedNotification(user, subscriber, plan);
          notificationsSent.push({
            userId: subscriber.userId,
            type: 'renewal_failed',
            sentAt: new Date()
          });
        }
      }
    }
    
    return { type: 'renewal_failed', count: notificationsSent.length, notifications: notificationsSent };
  }

  // Check for new trials
  async checkNewTrials() {
    const notificationsSent = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newTrials = await Subscribers.getNewTrials(today);
    
    for (const subscriber of newTrials) {
      if (!subscriber.notifications?.trialStarted) {
        const user = await User.get(subscriber.userId);
        const plan = await SubscriptionPlans.getSubscriptionPlan(subscriber.planId);
        
        if (user && plan && plan.price === 0) {
          await this.sendTrialStartedNotification(user, subscriber, plan);
          notificationsSent.push({
            userId: subscriber.userId,
            type: 'trial_started',
            sentAt: new Date()
          });
        }
      }
    }
    
    return { type: 'trial_started', count: notificationsSent.length, notifications: notificationsSent };
  }

  // Check for new subscriptions
  async checkNewSubscriptions() {
    const notificationsSent = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newSubscriptions = await Subscribers.getNewSubscriptions(today);
    
    for (const subscriber of newSubscriptions) {
      if (!subscriber.notifications?.subscriptionActivated) {
        const user = await User.get(subscriber.userId);
        const plan = await SubscriptionPlans.getSubscriptionPlan(subscriber.planId);
        
        if (user && plan && plan.price > 0) {
          await this.sendSubscriptionActivatedNotification(user, subscriber, plan);
          notificationsSent.push({
            userId: subscriber.userId,
            type: 'subscription_activated',
            sentAt: new Date()
          });
        }
      }
    }
    
    return { type: 'subscription_activated', count: notificationsSent.length, notifications: notificationsSent };
  }

  // Notification methods
  async sendTrialExpiringNotification(user, subscriber, plan, daysBefore) {
    const daysText = daysBefore === 1 ? '1 day' : `${daysBefore} days`;
    const message = `Your ${plan.name} trial expires in ${daysText}. Upgrade now to continue enjoying our services.`;
    
    await this.sendNotification(user, message, 'Trial Expiring Soon');
    await this.updateNotificationRecord(subscriber.id, 'trialExpiring', daysBefore);
  }

  async sendSubscriptionExpiringNotification(user, subscriber, plan, daysBefore) {
    const daysText = daysBefore === 1 ? '1 day' : `${daysBefore} days`;
    const message = `Your ${plan.name} subscription expires in ${daysText}. Renew now to avoid service interruption.`;
    
    await this.sendNotification(user, message, 'Subscription Expiring Soon');
    await this.updateNotificationRecord(subscriber.id, 'subscriptionExpiring', daysBefore);
  }

  async sendSubscriptionExpiredNotification(user, subscriber, plan) {
    const message = `Your ${plan.name} subscription has expired. Renew now to restore access to our services.`;
    
    await this.sendNotification(user, message, 'Subscription Expired');
    await this.updateNotificationRecord(subscriber.id, 'subscriptionExpired', true);
  }

  async sendRenewalFailedNotification(user, subscriber, plan) {
    const message = `We couldn't process your ${plan.name} subscription renewal. Please update your payment method to avoid service interruption.`;
    
    await this.sendNotification(user, message, 'Renewal Failed');
    await this.updateNotificationRecord(subscriber.id, 'renewalFailed', true);
  }

  async sendTrialStartedNotification(user, subscriber, plan) {
    const endDate = new Date(subscriber.endDate.toMillis());
    const message = `Your ${plan.name} trial has started! Enjoy our services until ${endDate.toDateString()}.`;
    
    await this.sendNotification(user, message, 'Trial Started');
    await this.updateNotificationRecord(subscriber.id, 'trialStarted', true);
  }

  async sendSubscriptionActivatedNotification(user, subscriber, plan) {
    const message = `Your ${plan.name} subscription is now active! Thank you for choosing our services.`;
    
    await this.sendNotification(user, message, 'Subscription Activated');
    await this.updateNotificationRecord(subscriber.id, 'subscriptionActivated', true);
  }

  // Send notification via both email and SMS
  async sendNotification(user, message, subject) {
    try {
      // Send email
      if (user.email) {
        const emailTemplate = this.generateEmailTemplate(subject, message, user);
        await sendEmail({
          to: user.email,
          subject: subject,
          html: emailTemplate
        });
      }
      
      // Send SMS
      if (user.phone) {
        const formattedPhone = formatPhoneNumber(user.phone);
        await smsService.sendSMS(
          'TRUK LTD', 
          message,
          formattedPhone
        );
      }

      console.log(`📧 Notification sent to user ${user.id}: ${subject}`);
    } catch (error) {
      console.error(`❌ Failed to send notification to user ${user.id}:`, error);
    }
  }

  // Generate email template
  generateEmailTemplate(subject, message, user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .footer { background: #eee; padding: 10px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${subject}</h1>
          </div>
          <div class="content">
            <p>Hello ${user.name || 'Valued Customer'},</p>
            <p>${message}</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} TRUK LTD. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Update notification record in database
  async updateNotificationRecord(subscriberId, notificationType, value) {
    try {
      await Subscribers.updateNotification(subscriberId, notificationType, value);
    } catch (error) {
      console.error('Error updating notification record:', error);
    }
  }

  // Format results
  formatResults(results) {
    const summary = {
      totalNotifications: 0,
      byType: {}
    };

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        summary.totalNotifications += result.value.count;
        summary.byType[result.value.type] = result.value.count;
      }
    });

    return summary;
  }
}

module.exports = new NotificationCronService();