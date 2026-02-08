// jobs/companyDocumentExpiryJob.js
const cron = require('node-cron');
const CompanyDocumentExpiryCronService = require('../services/companyDocumentExpiryCronService');

// Run daily at 8:00 AM
const companyDocumentExpiryJob = cron.schedule('0 8 * * *', async () => {
  try {
    console.log('⏰ Running daily document expiry notifications...');
    const results = await CompanyDocumentExpiryCronService.runDocumentExpiryNotifications();
    console.log('📊 Company Document expiry results:', results);
  } catch (error) {
    console.error('❌ Company Document expiry cron job failed:', error);
  }
});
const testJob = cron.schedule('*/1 * * * *', async () => {
  //  console.log('🧪 Test run...');
//   const results = await CompanyDocumentExpiryCronService.runDocumentExpiryNotifications();
//   // const results_2 = await processExpiryNotifications();
//   // TODO: send notifications or deactivate transporters
//   console.log("✅ Completed cron run", results);
});

module.exports = {
  companyDocumentExpiryJob, testJob
};

