// services/documentExpiryCronService.js
const Transporter = require('../models/Transporter');
const sendEmail  = require('../utils/sendEmail');
const User = require('../models/User');
const SMSService = require('../utils/sendSms');
const formatPhoneNumber = require("../utils/formatPhone");

const smsService = new SMSService(process.env.MOBILESASA_API_TOKEN);

class DocumentExpiryCronService {
  constructor() {
    this.notificationIntervals = {
      EXPIRING_SOON: [30, 15, 7, 3, 1], // Days before expiry: 30, 15, 7, 3, 1
      EXPIRED: [0], // On expiry day
      GRACE_PERIOD: [1, 7, 14] // Days after expiry: 1, 7, 14
    };
    
    this.documentTypes = {
      INSURANCE: 'insurance',
      DRIVER_LICENSE: 'driverLicense',
      ID: 'id'
    };
  }

  // Main cron job method
  async runDocumentExpiryNotifications() {
    try {
      console.log('🚀 Starting document expiry notification cron job...');
      
      const tasks = [
        this.checkExpiringDocuments(),
        this.checkExpiredDocuments(),
        this.checkGracePeriodDocuments(),
        this.deactivateNonCompliantTransporters()
      ];

      const results = await Promise.allSettled(tasks);
      
      console.log('✅ Document expiry cron job completed');
      return this.formatResults(results);
      
    } catch (error) {
      console.error('❌ Error in document expiry cron:', error);
      throw error;
    }
  }

  // Check for documents expiring soon
  async checkExpiringDocuments() {
    const notificationsSent = [];
    
    for (const daysBefore of this.notificationIntervals.EXPIRING_SOON) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBefore);
      
      // Check all three document types
      for (const docType of Object.values(this.documentTypes)) {
        const expiringDocs = await Transporter.getExpiringDocuments(docType, targetDate);
        
        for (const transporter of expiringDocs) {
          if (!this.hasNotificationBeenSent(transporter, docType, 'expiring', daysBefore)) {
            const user = await User.get(transporter.userId);
            
            if (user) {
              await this.sendExpiringNotification(user, transporter, docType, daysBefore);
              notificationsSent.push({
                userId: transporter.userId,
                docType,
                type: 'expiring',
                daysBefore,
                sentAt: new Date()
              });
            }
          }
        }
      }
    }
    
    return { type: 'expiring_documents', count: notificationsSent.length, notifications: notificationsSent };
  }

  // Check for expired documents
  async checkExpiredDocuments() {
    const notificationsSent = [];
    const today = new Date();
    
    for (const docType of Object.values(this.documentTypes)) {
      const expiredDocs = await Transporter.getExpiredDocuments(docType, today);
      
      for (const transporter of expiredDocs) {
        if (!this.hasNotificationBeenSent(transporter, docType, 'expired')) {
          const user = await User.get(transporter.userId);
          
          if (user) {
            await this.sendExpiredNotification(user, transporter, docType);
            notificationsSent.push({
              userId: transporter.userId,
              docType,
              type: 'expired',
              sentAt: new Date()
            });
          }
        }
      }
    }
    
    return { type: 'expired_documents', count: notificationsSent.length, notifications: notificationsSent };
  }

  // Check for documents in grace period
  async checkGracePeriodDocuments() {
    const notificationsSent = [];
    
    for (const daysAfter of this.notificationIntervals.GRACE_PERIOD) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - daysAfter);
      
      for (const docType of Object.values(this.documentTypes)) {
        const gracePeriodDocs = await Transporter.getGracePeriodDocuments(docType, targetDate);
        
        for (const transporter of gracePeriodDocs) {
          if (!this.hasNotificationBeenSent(transporter, docType, 'grace_period', daysAfter)) {
            const user = await User.get(transporter.userId);
            
            if (user) {
              await this.sendGracePeriodNotification(user, transporter, docType, daysAfter);
              notificationsSent.push({
                userId: transporter.userId,
                docType,
                type: 'grace_period',
                daysAfter,
                sentAt: new Date()
              });
            }
          }
        }
      }
    }
    
    return { type: 'grace_period_documents', count: notificationsSent.length, notifications: notificationsSent };
  }

  // Deactivate transporters with long-expired documents
  async deactivateNonCompliantTransporters() {
    const deactivated = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days grace period
    
    for (const docType of Object.values(this.documentTypes)) {
      const nonCompliant = await Transporter.getNonCompliantTransporters(docType, cutoffDate);
      
      for (const transporter of nonCompliant) {
        if (transporter.accountStatus !== false) {
          await Transporter.update(transporter.transporterId, {
            accountStatus: false,
            status: 'suspended',
            suspensionReason: `${this.getDocumentName(docType)} expired for more than 30 days`
          });
          
          const user = await User.get(transporter.userId);
          if (user) {
            await this.sendDeactivationNotification(user, transporter, docType);
          }
          
          deactivated.push({
            userId: transporter.userId,
            transporterId: transporter.transporterId,
            docType,
            deactivatedAt: new Date()
          });
        }
      }
    }
    
    return { type: 'deactivated_transporters', count: deactivated.length, deactivated };
  }

  // Notification methods
  async sendExpiringNotification(user, transporter, docType, daysBefore) {
    const docName = this.getDocumentName(docType);
    const expiryDate = this.getExpiryDate(transporter, docType);
    const message = `Your ${docName} expires in ${daysBefore} days (on ${expiryDate.toDateString()}). Please renew it to avoid service interruption.`;
    
    await this.sendNotification(user, message, `${docName} Expiring Soon`);
    await this.updateNotificationRecord(transporter.transporterId, docType, 'expiring', daysBefore);
  }

  async sendExpiredNotification(user, transporter, docType) {
    const docName = this.getDocumentName(docType);
    const message = `Your ${docName} has expired. Please renew it immediately to continue using our services.`;
    
    await this.sendNotification(user, message, `${docName} Expired`);
    await this.updateNotificationRecord(transporter.transporterId, docType, 'expired', true);
  }

  async sendGracePeriodNotification(user, transporter, docType, daysAfter) {
    const docName = this.getDocumentName(docType);
    const message = `Your ${docName} expired ${daysAfter} days ago. Renew now to avoid account deactivation.`;
    
    await this.sendNotification(user, message, `Urgent: ${docName} Renewal Required`);
    await this.updateNotificationRecord(transporter.transporterId, docType, 'grace_period', daysAfter);
  }

  async sendDeactivationNotification(user, transporter, docType) {
    const docName = this.getDocumentName(docType);
    const message = `Your account has been deactivated because your ${docName} has been expired for more than 30 days. Please renew your documents and contact support.`;
    
    await this.sendNotification(user, message, 'Account Deactivated');
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

      console.log(`📧 Document notification sent to user ${user.id}: ${subject}`);
    } catch (error) {
      console.error(`❌ Failed to send notification to user ${user.id}:`, error);
    }
  }

  // Helper methods
  getDocumentName(docType) {
    const names = {
      [this.documentTypes.INSURANCE]: 'Insurance',
      [this.documentTypes.DRIVER_LICENSE]: 'Driver License',
      [this.documentTypes.ID]: 'ID Document'
    };
    return names[docType] || 'Document';
  }

  getExpiryDate(transporter, docType) {
    const expiryFields = {
      [this.documentTypes.INSURANCE]: 'insuranceExpiryDate',
      [this.documentTypes.DRIVER_LICENSE]: 'driverLicenseExpiryDate',
      [this.documentTypes.ID]: 'idExpiryDate'
    };
    
    const expiryDate = transporter[expiryFields[docType]];
    return expiryDate ? expiryDate.toDate() : null;
  }

  hasNotificationBeenSent(transporter, docType, notificationType, value) {
    const notifications = transporter.documentNotifications || {};
    const docNotifications = notifications[docType] || {};
    
    if (notificationType === 'expiring' || notificationType === 'grace_period') {
      return docNotifications[notificationType]?.includes(value) || false;
    }
    
    return docNotifications[notificationType] || false;
  }

  async updateNotificationRecord(transporterId, docType, notificationType, value) {
    try {
      await Transporter.updateDocumentNotification(transporterId, docType, notificationType, value);
    } catch (error) {
      console.error('Error updating notification record:', error);
    }
  }

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
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .footer { background: #eee; padding: 10px; text-align: center; font-size: 12px; }
          .urgent { color: #dc3545; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${subject}</h1>
          </div>
          <div class="content">
            <p>Hello ${user.name || 'Valued Transporter'},</p>
            <p class="urgent">${message}</p>
            <p>Please log into your account to upload renewed documents and maintain your transporter status.</p>
            <p>If you have already renewed your documents, please ensure they are uploaded in your account.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  formatResults(results) {
    const summary = {
      totalNotifications: 0,
      deactivatedAccounts: 0,
      byType: {}
    };

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        if (result.value.type === 'deactivated_transporters') {
          summary.deactivatedAccounts += result.value.count;
        } else {
          summary.totalNotifications += result.value.count;
        }
        summary.byType[result.value.type] = result.value.count;
      }
    });

    return summary;
  }
}

module.exports = new DocumentExpiryCronService();