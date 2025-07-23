const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminManagementController');
const AnalyticsController = require('../controllers/analyticsController');
const {
  authenticate,
  authorize,
  requireSuperAdmin,
  requireSelfOrSuperAdmin,
  loginRateLimit,
} = require('../middlewares/adminAuth');

/**
 * @swagger
 * tags:
 *   - name: Analytics
 *     description: Analytics management endpoints
 *   - name: Analytics
 *     description: Analytics management endpoints for admin dashboard
 */
// Analytics routes
/**
 * @swagger
 * /api/admin/analytics/{date}:
 *   post:
 *     summary: Process and create analytics data for a specific date
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *         description: Date for analytics data (e.g., 2025-07-22)
 *     responses:
 *       201:
 *         description: Analytics data processed and created successfully
 *       400:
 *         description: Invalid date format
 *       500:
 *         description: Server error
 */
router.post('/analytics/:date', authorize(['manage_analytics', 'super_admin']), AnalyticsController.createAnalytics);

/**
 * @swagger
 * /api/admin/analytics/{date}:
 *   get:
 *     summary: Get analytics data for a specific date
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *         description: Date for analytics data (e.g., 2025-07-22)
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 *       404:
 *         description: Analytics not found
 *       500:
 *         description: Server error
 */
router.get('/analytics/:date', authorize(['view_analytics', 'super_admin']), AnalyticsController.getAnalytics);

/**
 * @swagger
 * /api/admin/analytics/{date}:
 *   put:
 *     summary: Update analytics data for a specific date
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *         description: Date for analytics data (e.g., 2025-07-22)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dailyActiveUsers:
 *                 type: number
 *               bookingCompletionRate:
 *                 type: number
 *               totalRevenue:
 *                 type: number
 *               failedPayments:
 *                 type: number
 *               activeTransporters:
 *                 type: number
 *               pendingRequests:
 *                 type: number
 *               activeBookings:
 *                 type: number
 *               activeSubscribers:
 *                 type: number
 *               newUsers:
 *                 type: number
 *               mpesaSuccessRate:
 *                 type: number
 *               airtelSuccessRate:
 *                 type: number
 *               paystackSuccessRate:
 *                 type: number
 *               avgCompletionTime:
 *                 type: number
 *     responses:
 *       200:
 *         description: Analytics data updated successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.put('/analytics/:date', authorize(['manage_analytics', 'super_admin']), AnalyticsController.updateAnalytics);

/**
 * @swagger
 * /api/admin/analytics:
 *   get:
 *     summary: Get analytics data for a date range
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *         description: Start date for range (e.g., 2025-07-01)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *         description: End date for range (e.g., 2025-07-22)
 *     responses:
 *       200:
 *         description: Analytics data for range retrieved successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.get('/analytics', authorize(['view_analytics', 'super_admin']), AnalyticsController.getAnalyticsRange);

module.exports = router;