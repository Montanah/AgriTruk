const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { subscriptionNotificationsJob } = require('./jobs/subscriptionNotificationsJob');
const cronService = require('./services/cronService');
const { documentExpiryJob } = require('./jobs/documentExpiryJob');
const { systemAlertsJob, documentExpiryJobAlert } = require('./jobs/systemAlertsJob');

const transporterRoutes = require('./routes/transportRoutes');
const authRoutes = require('./routes/authRoutes');
const activityRoutes = require('./routes/activityLog');
const bookingRoutes = require('./routes/bookingRoutes');
const companyRoutes = require('./routes/companyRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const driverRoutes = require('./routes/driverRoutes');
const reportRoutes = require('./routes/reportRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const disputeRoutes = require('./routes/disputeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const brokerRoutes = require('./routes/brokerRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatRoutes = require('./routes/chatRoutes');
// const agriBookingRoutes = require('./routes/agriBookingRoutes');
// const cargoBookingRoutes = require('./routes/cargoBookingRoutes');
const subRoutes = require('./routes/subscriptionRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const paymentRoutes = require('./routes/paymentsRoute');
const transRoutes = require('./routes/transRoutes');
const alertRoutes = require('./routes/alertRoutes');

const app = express();
const { swaggerUi, specs } = require('./config/swagger');
const requestMetadata = require('./middlewares/requestMetadata');
const healthMonitor = require('./utils/healthMonitor');

//app.use(helmet());
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestMetadata);

app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests, please try again later',
        validate: {
            trustProxy: false
        }
    })
);

// Register API routes FIRST
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use('/api/transporters', transporterRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/brokers', brokerRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/chats', chatRoutes);
// app.use('/api/agri', agriBookingRoutes);
// app.use('/api/cargo', cargoBookingRoutes);
app.use('/api/subscriptions', subRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/transactions', transRoutes);
app.use('/api/alerts', alertRoutes);

// Health and test endpoints
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString()
    });
});

// Debug endpoint removed - issue was broker route ordering, not global auth



// Root endpoint
app.get('/', (req, res) => {
    res.status(200).send('Welcome to root URL of Server');
});

// Health cron endpoint
app.get('/health/cron', (req, res) => {
  res.json({
    status: 'healthy',
    ...healthMonitor.getStats(),
    currentTime: Date.now()
  })
})

// 404 handler MUST be LAST
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Page not found'
    });
});

// Initialize cron jobs when server starts
cronService.init();

subscriptionNotificationsJob.start();
console.log('✅ Subscription notification cron job started');

systemAlertsJob.start();
documentExpiryJobAlert.start();
console.log('✅ System alert cron job started');

documentExpiryJob.start();
console.log('✅ Document expiry cron job started');

// Graceful shutdown
process.on('SIGINT', () => {
  subscriptionNotificationsJob.stop();
  documentExpiryJob.stop();
  console.log('❌ Subscription notification and document expiry cron job stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  subscriptionNotificationsJob.stop();
  documentExpiryJob.stop();
  console.log('❌ Subscription notification and document expiry cron job stopped');
  process.exit(0);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  cronService.stopAllJobs();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  cronService.stopAllJobs();
  process.exit(0);
});



module.exports = app;