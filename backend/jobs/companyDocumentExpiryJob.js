// jobs/companyDocumentExpiryJob.js
const cron = require('node-cron');
const CompanyDocumentExpiryCronService = require('../services/companyDocumentExpiryCronService');

// Run daily at 8:00 AM
const companyDocumentExpiryJob = cron.schedule('0 8 * * *', async () => {
  try {
   
    const results = await CompanyDocumentExpiryCronService.runDocumentExpiryNotifications();
    
  } catch (error) {
    console.error('❌ Company Document expiry cron job failed:', error);
  }
});
const testJob = cron.schedule('*/1 * * * *', async () => {
//   const results = await CompanyDocumentExpiryCronService.runDocumentExpiryNotifications();
//   // const results_2 = await processExpiryNotifications();
//   // TODO: send notifications or deactivate transporters

});

module.exports = {
  companyDocumentExpiryJob, testJob
};

