// jobs/subscriptionNotificationsJob.js
const cron = require('node-cron');
const notificationCronService = require('../services/subscriberService');

// Run daily at 9:00 AM
const subscriptionNotificationsJob = cron.schedule('0 9 * * *', async () => {
  try {
    console.log('⏰ Running daily subscription notifications...');
    const results = await notificationCronService.runSubscriptionNotifications();
    console.log('📊 Notification results:', results);
  } catch (error) {
    console.error('❌ Cron job failed:', error);
  }
});

// Optional: Run more frequently for testing (every 10 minutes)
// const testJob = cron.schedule('*/1 * * * *', async () => {
//   console.log('🧪 Test run...');
//   const results = await notificationCronService.runSubscriptionNotifications();
//   console.log('✅ Completed cron run', results);
// });

module.exports = {
  subscriptionNotificationsJob,
  // testJob
};