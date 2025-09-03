const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');
const { authorize } = require('../middlewares/adminAuth');
const reportsController = require('../controllers/reportsController');

/**
 * @swagger
 * tags:
 *   - name: Reports
 *     description: Report management endpoints
 */
/**
 * @swagger
 * /api/reports/pdf/bookings:
 *   get:
 *     summary: Get a list of all bookings as a PDF
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: Start date for report filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: End date for report filtering
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *         required: false
 *         description: View for report filtering
 *     responses:
 *       200:
 *         description: List of bookings
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */

router.get('/pdf/bookings', authenticateToken, requireRole('admin'), authorize(['view_bookings', 'super_admin']), reportsController.generateBookingPdf);

/**
 * @swagger
 * /api/reports/csv/bookings:
 *   get:
 *     summary: Get a list of all bookings as a CSV
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: Start date for report filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: End date for report filtering
 *     responses:
 *       200:
 *         description: List of bookings
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */

router.get('/csv/bookings', authenticateToken, requireRole('admin'), authorize(['view_bookings', 'super_admin']), reportsController.generateBookingCsv);

module.exports = router;