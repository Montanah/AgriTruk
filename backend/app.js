const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const listEndpoints = require('express-list-endpoints'); 

const transporterRoutes = require('./routes/transportRoutes');
const authRoutes = require('./routes/authRoutes');
const activityRoutes = require('./routes/activityLog');
// const bookingRoutes = require('./mine/bookingRoutes');
const companyRoutes = require('./routes/companyRoutes');
const disputeRoutes = require('./routes/disputeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const brokerRoutes = require('./routes/brokerRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatRoutes = require('./routes/chatRoutes');
const agriBookingRoutes = require('./routes/agriBookingRoutes');
const cargoBookingRoutes = require('./routes/cargoBookingRoutes');
const subRoutes = require('./routes/subscriptionRoutes');

const app = express();
const { swaggerUi, specs } = require('./config/swagger');
const requestMetadata = require('./middlewares/requestMetadata');

//app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestMetadata);

app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests, please try again later'
    })
);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use('/api/transporters', transporterRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/activity', activityRoutes);
// app.use('/api/bookings', bookingRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/brokers', brokerRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/agri', agriBookingRoutes);
app.use('/api/cargo', cargoBookingRoutes);
app.use('/api/subscriptions', subRoutes);

app.get('/', (req, res) => {
    res.status(200).send('Welcome to root URL of Server');
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString()
    });
});
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Page not found'
    });
});
// Log all routes
//console.log('Registered routes:', listEndpoints(app));

module.exports = app;