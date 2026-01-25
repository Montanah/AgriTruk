const admin = require('../config/firebase');
const RecruiterPlans = require('../models/RecruiterPlans');
const User = require('../models/User');
const { sendEmail } = require('../utils/sendEmail');
const formatPhoneNumber = require('../utils/formatPhone');
const SMSService = require('../utils/sendSms');
const smsService = new SMSService(process.env.MOBILESASA_API_TOKEN);

const NotificationService = {
  /**
   * Send subscription expiry notification
   */
  async sendExpiryNotification(subscription) {
    try {
      // Get user details
      const user = await User.get(subscription.userId);

      if (!user) {
        console.error('User not found for subscription:', subscription.userId);
        return;
      }

      const email = user.email;
      const phone = user.phone;
      const name = user.name || user.firstName || 'Valued Customer';

      // Get plan details
      const plan = await RecruiterPlans.get(subscription.planId);

      // Prepare notification content
      const subject = 'Your Subscription Has Expired';
      const message = `
        Dear ${name},
        
        Your ${plan.name} subscription has expired as of ${new Date(subscription.endDate).toLocaleDateString()}.
        
        To continue enjoying our services, please renew your subscription.
        
        Visit your dashboard to renew: ${process.env.APP_URL}/subscription/renew
        
        If you have any questions, please contact our support team.
        
        Best regards,
        The Team
      `;

      // Send email notification
      if (email) {
        await sendEmail({
          to: email,
          subject,
          text: message,
          html: this.generateExpiryEmailHTML(name, plan, subscription),
        });
      }

      // Send SMS notification (optional)
      if (phone) {
        const formattedPhone = formatPhoneNumber(phone);
        const message= `Hi ${name}, your ${plan.name} subscription has expired. Please renew to continue using our services. Visit ${process.env.APP_URL}/subscription/renew`;
        await smsService.sendSMS(
          'TRUK LTD', 
          message,
          formattedPhone
        );
      }

      // Log notification
      await Notification.create({
        userId: subscription.userId,
        type: 'subscription_expired',
        channel: ['email', phone ? 'sms' : null].filter(Boolean),
        subscriptionId: subscription.subscriberId,
        sentAt: new Date(),
      });

    } catch (error) {
      console.error('Error sending expiry notification:', error);
      throw error;
    }
  },

  /**
   * Send subscription expiring soon notification
   */
  async sendExpiringNotification(subscription, daysRemaining) {
    try {
      const user = await User.get(subscription.userId);

      if (!user) {
        console.error('User not found for subscription:', subscription.userId);
        return;
      }

      const plan = await RecruiterPlans.get(subscription.planId);

      const subject = `Your Subscription Expires in ${daysRemaining} Days`;
      const message = `
        Dear ${user.name || 'Valued Customer'},
        
        Your ${plan.name} subscription will expire in ${daysRemaining} days on ${new Date(subscription.endDate).toLocaleDateString()}.
        
        Renew now to avoid service interruption: ${process.env.APP_URL}/subscription/renew
        
        Best regards,
        The Team
      `;

      if (user.email) {
        await sendEmail({
          to: user.email,
          subject,
          text: message,
          html: this.generateExpiringEmailHTML(user.name || 'Valued Customer', plan, subscription, daysRemaining),
        });
      }

      await Notification.create({
        userId: subscription.userId,
        type: 'subscription_expiring',
        channel: ['email'],
        subscriptionId: subscription.subscriberId,
        metadata: { daysRemaining },
        sentAt: new Date(),
      });
    } catch (error) {
      console.error('Error sending expiring notification:', error);
    }
  },

  /**
   * Generate HTML for expiry email
   */
  generateExpiryEmailHTML(name, plan, subscription) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Subscription Expired</h1>
          </div>
          <div class="content">
            <p>Dear ${name},</p>
            <p>Your <strong>${plan.name}</strong> subscription has expired as of <strong>${new Date(subscription.endDate).toLocaleDateString()}</strong>.</p>
            <p>To continue enjoying our services without interruption, please renew your subscription now.</p>
            <div style="text-align: center;">
              <a href="${process.env.APP_URL}/subscription/renew" class="button">Renew Subscription</a>
            </div>
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Generate HTML for expiring soon email
   */
  generateExpiringEmailHTML(name, plan, subscription, daysRemaining) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Subscription Expiring Soon</h1>
          </div>
          <div class="content">
            <p>Dear ${name},</p>
            <div class="warning">
              <strong>⚠️ Important Notice:</strong> Your <strong>${plan.name}</strong> subscription will expire in <strong>${daysRemaining} days</strong> on <strong>${new Date(subscription.endDate).toLocaleDateString()}</strong>.
            </div>
            <p>Don't lose access to your account and services. Renew your subscription today to ensure uninterrupted service.</p>
            <div style="text-align: center;">
              <a href="${process.env.APP_URL}/subscription/renew" class="button">Renew Now</a>
            </div>
            <p>Need help choosing a plan? Contact our support team for assistance.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },
};

module.exports = NotificationService;