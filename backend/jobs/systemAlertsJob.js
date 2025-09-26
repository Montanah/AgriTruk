// jobs/systemAlertsJob.js
const cron = require('node-cron');
const AlertService = require('../services/alertService');

// Run every 15 minutes to check system alerts
const systemAlertsJob = cron.schedule('0 3 * * *', async () => {
  try {
    console.log('⏰ Running system alert checks...');
    await AlertService.checkSystemAlerts();
  } catch (error) {
    console.error('❌ System alert check failed:', error);
  }
});

// Run document expiry check daily at 2:00 AM
const documentExpiryJobAlert = cron.schedule('0 2 * * *', async () => {
  try {
    console.log('⏰ Running document expiry checks...');
    await AlertService.checkDocumentExpiry();
  } catch (error) {
    console.error('❌ Document expiry check failed:', error);
  }
});

module.exports = {
  systemAlertsJob,
  documentExpiryJobAlert
};