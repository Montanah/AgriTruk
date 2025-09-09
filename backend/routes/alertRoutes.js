const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Manage alerts
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Alert:
 *       type: object
 *       properties:
 *         alertId:
 *           type: string
 *         severity:
 *           type: string
 *         type:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         entityType:
 *           type: string
 *         entityId:
 *           type: string
 *         status:
 *           type: string
 *         metadata:
 *           type: object
 *         triggeredBy:
 *           type: string
 *         acknowledgedBy:
 *           type: string
 *         acknowledgedAt:
 *           type: string
 *         resolvedBy:
 *           type: string
 *         resolvedAt:
 *           type: string
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 *         expiresAt:
 *           type: string
 */

// Get alerts with optional filtering
/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Get alerts
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by alert status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by alert type
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by alert severity
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by alert entity type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         description: Limit the number of alerts returned
 *     responses:
 *       200:
 *         description: A list of alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Alert'
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateToken, requireRole('admin'), alertController.getAlerts);

// Get alert by ID
/**
 * @swagger
 * /api/alerts/{id}:
 *   get:
 *     summary: Get an alert by ID
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: The alert
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Alert'
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticateToken, requireRole('admin'), alertController.getAlert);

// Get alert statistics
/**
 * @swagger
 * /api/alerts/stats/summary:
 *   get:
 *     summary: Get alert statistics
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alert statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Alert'
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get('/stats/summary', authenticateToken, requireRole('admin'), alertController.getAlertStats);

// Acknowledge alert
/** 
 * @swagger
 * /api/alerts/{id}/acknowledge:
 *   patch:
 *     summary: Acknowledge an alert
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: Alert acknowledged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Alert'
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
*/
router.patch('/:id/acknowledge', authenticateToken, requireRole('admin'), alertController.acknowledgeAlert);

// Resolve alert
/** 
 * @swagger
 * /api/alerts/{id}/resolve:
 *   patch:
 *     summary: Resolve an alert
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: Alert resolved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Alert'
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error   
*/
router.patch('/:id/resolve', authenticateToken, requireRole('admin'), alertController.resolveAlert);

// Trigger test alert (admin only)
// /** 
//  * @swagger
//  * /api/alerts/test:
//  *   post:
//  *     summary: Trigger a test alert
//  *     tags: [Alerts]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: Test alert triggered
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Alert'
//  *       401:
//  *         description: User not authenticated
//  *       403:
//  *         description: Access denied
//  *       500:
//  *         description: Internal server error   
// */
router.post('/test', authenticateToken, requireRole('admin'), alertController.triggerTestAlert);

module.exports = router;