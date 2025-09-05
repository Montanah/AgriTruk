// jobs/documentExpiryJob.js
const cron = require('node-cron');
const documentExpiryCronService = require('../services/documentExpiryCronService');

// Run daily at 8:00 AM
const documentExpiryJob = cron.schedule('0 8 * * *', async () => {
  try {
    console.log('⏰ Running daily document expiry notifications...');
    const results = await documentExpiryCronService.runDocumentExpiryNotifications();
    console.log('📊 Document expiry results:', results);
  } catch (error) {
    console.error('❌ Document expiry cron job failed:', error);
  }
});
const testJob = cron.schedule('*/10 * * * *', async () => {
  console.log('🧪 Test run...');
  await documentExpiryCronService.runDocumentExpiryNotifications();
});

module.exports = {
  documentExpiryJob, testJob
};