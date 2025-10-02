const express = require('express');
const router = express.Router();

console.log('🚀 BROKER ROUTES FILE LOADED - Routes should be available');
const BrokerController = require('../controllers/brokerController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const loadUserProfile = require('../middlewares/loadUserProfile');
const { requireRole } = require('../middlewares/requireRole');
const { authorize } = require("../middlewares/adminAuth");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); 

const uploadAny = upload.any();

// Test endpoint to verify broker routes are working (no auth required) - MUST BE FIRST
router.get('/test', (req, res) => {
  console.log('🧪 Test route /api/brokers/test hit successfully');
  res.json({ success: true, message: 'Broker routes are working', timestamp: new Date().toISOString() });
});

// Add early debug middleware to catch ALL requests to broker router
router.use((req, res, next) => {
  console.log('🎯 BROKER ROUTER MIDDLEWARE HIT - Path:', req.path, 'OriginalUrl:', req.originalUrl, 'Method:', req.method);
  
  // Special debugging for /requests and /clients-with-requests
  if (req.path === '/requests' || req.path === '/clients-with-requests') {
    console.log('🚨 CRITICAL ROUTE HIT - This should match a handler!');
  }
  
  next();
});

// Simple test route to verify route registration works at this location
router.get('/debug-test', (req, res) => {
  console.log('🧪 DEBUG TEST ROUTE HIT - Route registration works here!');
  res.json({ success: true, message: 'Debug test route working', path: req.path });
});

// Debug middleware to see if ANY requests reach broker router (moved to after routes)
// This will be moved to the end of the file

/**
 * @swagger
 * tags:
 *   - name: Broker
 *     description: Broker management endpoints
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Broker:
 *       type: object
 *       properties:
 *         brokerId:
 *           type: string
 *         userId: 
 *           type: string
 *         brokerIdUrl:
 *           type: string
 *         rejectionReason:
 *           type: string
 *         status:
 *           type: string
 */
/**
 * @swagger
 * /api/brokers:
 *   post:
 *     summary: Create a new broker
 *     tags: [Broker]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               idImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Broker created successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/', authenticateToken, requireRole(['broker', 'admin']), upload.single('idImage'), BrokerController.createBroker);

/**
 * @swagger
 * /api/brokers/clients:
 *   get:
 *     summary: Get all clients under a broker
 *     tags: [Broker]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Clients retrieved successfully
 *       400:
 *         description: Broker ID is required
 *       500:
 *         description: Server error
 */
router.get('/clients', authenticateToken, requireRole('broker'), BrokerController.getClients);

/**
 * @swagger
 * /api/brokers/user/{userId}:
 *   get:
 *     summary: Get broker details by user ID
 *     tags: [Broker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Broker retrieved successfully
 *       404:
 *         description: Broker not found
 *       500:
 *         description: Server error
 */
router.get('/user/:userId', authenticateToken, requireRole(['broker', 'admin']), BrokerController.getBrokerByUserId);

// MOVED /:brokerId route to end of file to avoid catching specific routes

/**
 * @swagger
 * /api/brokers/clients:
 *   post:
 *     summary: Add a client under a broker
 *     tags: [Broker]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [business, individual]
 *               region:
 *                 type: string
 *     responses:
 *       201:
 *         description: Client created successfully
 *       400:
 *         description: Broker ID is required
 *       500:
 *         description: Server error
 */
router.post('/clients', authenticateToken, requireRole('broker'), BrokerController.addClient);

/**
 * @swagger
 * /api/brokers/clients/{clientId}:
 *   put:
 *     summary: Update client profile
 *     tags: [Broker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               region:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: No valid fields to update
 *       500:
 *         description: Server error
 */
router.put('/clients/:clientId', authenticateToken, requireRole('broker'), BrokerController.updateProfile);

/**
 * @swagger
 * /api/brokers/deactivate/{clientId}:
 *   delete:
 *     summary: Deactivate a client
 *     tags: [Broker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client deactivated successfully
 *       404:
 *         description: Client not found
 *       500:
 *         description: Server error
 */
router.delete('/deactivate/:clientId', authenticateToken, requireRole('broker'), BrokerController.deactivateClient);

/**
 * @swagger
 * /api/brokers/clients/{clientId}:
 *   delete:
 *     summary: Delete a client (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client deleted successfully
 *       404:
 *         description: Client not found
 *       500:
 *         description: Server error
 */
router.delete('/clients/:clientId', authenticateToken, requireRole('admin'), authorize(['manage_brokers', 'super_admin']), BrokerController.deleteClient);

/**
 * @swagger
 * /api/brokers/restore/{clientId}:
 *   put:
 *     summary: Restore a deactivated client
 *     tags: [Broker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client restored successfully
 *       404:
 *         description: Client not found
 *       500:
 *         description: Server error
 */
router.put('/restore/:clientId', authenticateToken, requireRole('broker'), BrokerController.restoreClient);

/**
 * @swagger
 * /api/brokers/requests:
 *   post:
 *     summary: Create a new request for a client
 *     tags: [Broker]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientId:
 *                 type: string
 *               category:
 *                 type: string
 *               type:
 *                 type: string
 *               pickUpLocation:
 *                 type: string
 *               dropOffLocation:
 *                 type: string
 *               productType:
 *                 type: string
 *               weightKg:
 *                 type: number
 *               value:
 *                 type: number
 *               additionalRequest:
 *                 type: string
 *     responses:
 *       201:
 *         description: Request created successfully
 *       400:
 *         description: Client ID is required
 *       500:
 *         description: Server error
 */
router.post('/requests', authenticateToken, requireRole(['user', 'broker']), BrokerController.createRequest);

/**
 * @swagger
 * /api/brokers/requests/consolidate:
 *   post:
 *     summary: Consolidate multiple requests
 *     tags: [Broker]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requestIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Requests consolidated successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
// router.post('/requests/consolidate', authenticateToken, requireRole(['broker', 'admin']), BrokerController.consolidateRequests);
router.post('/requests/consolidate', authenticateToken, requireRole(['broker', 'admin']), BrokerController.consolidateAndMatch);
/**
 * @swagger
 * /api/brokers/clients/{clientId}/requests:
 *   get:
 *     summary: Get all requests for a client
 *     tags: [Broker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Requests retrieved successfully
 *       400:
 *         description: Client ID is required
 *       500:
 *         description: Server error
 */
/**
 * @swagger
 * /api/brokers/requests:
 *   get:
 *     summary: Get all requests for a broker
 *     tags: [Broker]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All broker requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 requests:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Broker ID not found
 *       500:
 *         description: Server error
 */

// Syntax check route to verify parsing works up to this point
router.get('/syntax-check', (req, res) => {
  console.log('🧪 SYNTAX CHECK ROUTE HIT - File parsing works up to this point');
  res.json({ success: true, message: 'Syntax check passed', location: 'before-requests-route' });
});

// Super simple test route with NO middleware to isolate the issue
router.get('/no-middleware-test', (req, res) => {
  console.log('🧪 NO MIDDLEWARE TEST ROUTE HIT - This should work without any middleware!');
  res.json({ success: true, message: 'No middleware route working!', timestamp: new Date().toISOString() });
});

// Debug middleware specifically for /requests route
router.get('/requests', 
  (req, res, next) => {
    console.log('🔍 STEP 1: Entering /requests route handler');
    next();
  },
  authenticateToken,
  (req, res, next) => {
    console.log('🔍 STEP 2: After authenticateToken middleware');
    next();
  },
  requireRole('broker'),
  (req, res, next) => {
    console.log('🔍 STEP 3: After requireRole middleware');
    next();
  },
  (req, res) => {
    console.log('🔍🔍🔍 STEP 4: FINAL HANDLER - INLINE BROKER REQUESTS ROUTE HIT - URL:', req.originalUrl);
    res.json({ 
      success: true, 
      message: 'Inline route working - controller reference was the issue!',
      requests: [],
      timestamp: new Date().toISOString() 
    });
  }
);

/**
 * @swagger
 * /api/brokers/clients/{clientId}/requests:
 *   get:
 *     summary: Get requests for a specific client
 *     tags: [Broker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *         description: The client ID
 *     responses:
 *       200:
 *         description: Client requests retrieved successfully
 *       400:
 *         description: Client ID is required
 *       500:
 *         description: Server error
 */
router.get('/clients/:clientId/requests', authenticateToken, requireRole(['broker', 'admin']), BrokerController.getRequestsByClient);

/**
 * @swagger
 * /api/brokers/clients-with-requests:
 *   get:
 *     summary: Get all clients with their request statistics
 *     tags: [Broker]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Clients with request statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       company:
 *                         type: string
 *                       totalRequests:
 *                         type: number
 *                       activeRequests:
 *                         type: number
 *                       instantRequests:
 *                         type: number
 *                       bookingRequests:
 *                         type: number
 *                       lastRequest:
 *                         type: string
 *                       latestRequestStatus:
 *                         type: string
 *                       latestRequestType:
 *                         type: string
 *       400:
 *         description: Broker ID not found
 *       500:
 *         description: Server error
 */
// Test route with inline handler to isolate controller reference issue
router.get('/clients-with-requests', authenticateToken, requireRole('broker'), (req, res) => {
  console.log('🔍🔍🔍 INLINE BROKER CLIENTS ROUTE HIT - URL:', req.originalUrl);
  res.json({ 
    success: true, 
    message: 'Inline route working - controller reference was the issue!',
    data: [],
    timestamp: new Date().toISOString() 
  });
});

/**
 * @swagger
 * /api/brokers/{brokerId}:
 *   delete:
 *     summary: Delete a broker (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: brokerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Broker deleted successfully
 *       404:
 *         description: Broker not found
 *       500:
 *         description: Server error
 */
router.delete('/:brokerId', authenticateToken, requireRole('admin'), authorize(['manage_brokers', 'super_admin']), BrokerController.deleteBroker);

/**
 * @swagger
 * /api/brokers/{brokerId}/review:
 *   patch:
 *     summary: Review a broker (admin only)
 *     tags: [Admin Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: brokerId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject, suspend, unsuspend, deactivate]
 *                 description: Action to take on the broker (approve or reject)
 *               reason:
 *                 type: string
 *                 description: Reason for action (optional)
 *               idExpiryDate:
 *                 type: string
 *                 format: date-time
 *                 description: ID expiry date (optional)
 *     responses:
 *       200:
 *         description: Broker reviewed successfully
 *       404:
 *         description: Broker not found
 *       500:
 *         description: Server error
 */
router.patch('/:brokerId/review', authenticateToken, requireRole('admin'), authorize(['manage_brokers', 'super_admin']), BrokerController.reviewBroker);

/**
 * @swagger
 * /api/brokers/{brokerId}/upload:
 *   patch:
 *     summary: Upload documents for a broker
 *     tags: [Broker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: brokerId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               idImage:
 *                 type: string
 *                 format: binary
 *                 description: The ID image of the broker
 *     responses:
 *       200:
 *         description: Documents uploaded successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.patch('/:brokerId/upload', authenticateToken, requireRole(['broker', 'admin']), upload.single('idImage'), BrokerController.uploadDocuments);

/**
 * @swagger
 * /api/brokers/{brokerId}:
 *   get:
 *     summary: Get broker details
 *     tags: [Broker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: brokerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Broker retrieved successfully
 *       404:
 *         description: Broker not found
 *       500:
 *         description: Server error
 */
// MOVED FROM LINE 160 - This catch-all route must be LAST to avoid intercepting specific routes
router.get('/:brokerId', authenticateToken, requireRole(['broker', 'admin']), BrokerController.getBroker);

// Debug middleware for unmatched routes - MUST BE LAST
router.use((req, res, next) => {
  console.log('🚨 UNMATCHED BROKER ROUTE - Path:', req.originalUrl, 'Method:', req.method);
  console.log('🚨 Available routes should include /requests and /clients-with-requests');
  next(); // This will eventually hit the 404 handler
});

module.exports = router;