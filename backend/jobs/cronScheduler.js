const cron = require('node-cron');
const SubscriptionService = require('../services/subscriptionService');
const DocumentExpiryService = require('../services/companyDocumentExpiryService');
const RecruiterSubscriptionService = require('../services/RecruiterSubscriptionService');
const processPendingDeletions = require('../controllers/authController').processPendingDeletions;
/**
 * Cron job scheduler for automated tasks
 */
const CronScheduler = {
  /**
   * Initialize all cron jobs
   */
  init() {
    console.log('Initializing cron jobs...');

    // Check expired subscriptions daily at 2:00 AM
    this.checkExpiredSubscriptions();

    // Check expiring subscriptions daily at 9:00 AM
    this.checkExpiringSubscriptions();

    // Check document expiry daily at 8:00 AM
    this.checkDocumentExpiry();

    // Weekly summary on Monday at 10:00 AM
    this.weeklySummary();

    // check pending deletions every 15 minutes
    this.checkPendingDeletions();

    console.log('All cron jobs initialized');
  },

  /**
   * Check and update expired subscriptions
   * Runs daily at 2:00 AM
   */
  checkExpiredSubscriptions() {
    // Schedule: Every day at 2:00 AM
    // Format: second minute hour day month weekday
    cron.schedule('0 2 * * *', async () => {
      console.log('Running expired subscriptions check...');
      try {
        const count = await SubscriptionService.checkAndUpdateExpiredSubscriptions();
        console.log(`Processed ${count} expired subscriptions`);
      } catch (error) {
        console.error('Error in expired subscriptions check:', error);
      }
    });

    console.log('✓ Expired subscriptions check scheduled (Daily at 2:00 AM)');
  },

  /**
   * Check subscriptions expiring soon and send reminders
   * Runs daily at 9:00 AM
   */
  checkExpiringSubscriptions() {
    cron.schedule('0 9 * * *', async () => {
      console.log('Running expiring subscriptions check...');
      try {
        const Subscribers = require('../models/Subscribers');
        const admin = require('../config/firebase');

        // Check for subscriptions expiring in 7, 3, and 1 days
        const daysToCheck = [7, 3, 1];
        
        for (const days of daysToCheck) {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + days);
          targetDate.setHours(0, 0, 0, 0);

          const nextDay = new Date(targetDate);
          nextDay.setDate(nextDay.getDate() + 1);

          const snapshot = await admin.firestore()
            .collection('subscribers')
            .where('isActive', '==', true)
            .where('endDate', '>=', admin.firestore.Timestamp.fromDate(targetDate))
            .where('endDate', '<', admin.firestore.Timestamp.fromDate(nextDay))
            .get();

          for (const doc of snapshot.docs) {
            const subscription = { id: doc.id, ...doc.data() };
            await SubscriptionService.sendExpiringNotification(subscription, days);
          }

          console.log(`Sent ${snapshot.size} reminders for subscriptions expiring in ${days} days`);
        }
      } catch (error) {
        console.error('Error in expiring subscriptions check:', error);
      }
    });

    console.log('✓ Expiring subscriptions check scheduled (Daily at 9:00 AM)');
  },

  /**
   * Check document expiry for drivers and vehicles
   * Runs daily at 8:00 AM
   */
  checkDocumentExpiry() {
    cron.schedule('0 8 * * *', async () => {
      console.log('Running document expiry check...');
      try {
        await DocumentExpiryService.checkAllDocuments();
        console.log('Document expiry check completed');
      } catch (error) {
        console.error('Error in document expiry check:', error);
      }
    });

    console.log('✓ Document expiry check scheduled (Daily at 8:00 AM)');
  },

  /**
   * Send weekly summary report
   * Runs every Monday at 10:00 AM
   */
  weeklySummary() {
    cron.schedule('0 10 * * 1', async () => {
      console.log('Generating weekly summary...');
      try {
        // This can be expanded to generate comprehensive reports
        console.log('Weekly summary completed');
      } catch (error) {
        console.error('Error generating weekly summary:', error);
      }
    });

    console.log('✓ Weekly summary scheduled (Monday at 10:00 AM)');
  },
  /**
   * Check pending deletions
   * Runs every 15 minutes
   */
  checkPendingDeletions() {
    cron.schedule('*/01 * * * *', async () => {
      console.log('Checking pending deletions...');
      try {
        await processPendingDeletions();
        // This can be expanded to generate comprehensive reports
        console.log('Checked pending deletions');
      } catch (error) {
        console.error('Error checking pending deletions:', error);
      }
    });

    console.log('✓ Pending deletions check scheduled (Every 15 minutes)');
  },
  /**
   * Test all notification systems (manual trigger)
   */
  async testNotifications() {
    console.log('Testing notification systems...');
    
    try {
      // Test subscription expiry
      console.log('1. Testing subscription notifications...');
   //   await SubscriptionService.checkAndUpdateExpiredSubscriptions();
      await RecruiterSubscriptionService.checkAndUpdateExpiredSubscriptions();
      
      // Test document expiry
      console.log('2. Testing document expiry notifications...');
      await DocumentExpiryService.checkAllDocuments();
      
      console.log('✓ All notification tests completed');
    } catch (error) {
      console.error('Error testing notifications:', error);
    }
  },
};

module.exports = CronScheduler;