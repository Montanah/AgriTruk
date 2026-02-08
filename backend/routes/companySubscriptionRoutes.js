
const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');

/**
 * @swagger 
 * tags:
 *   name: Company Subscribers
 *   description: Manage company subscriptions
 */
/**
 * @swagger
 * /api/subscriber/start:
 *   post:
 *     tags: [Company Subscribers]
 *     summary: Start a new subscription
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planId:
 *                 type: string
 *                 description: The ID of the subscription plan
 *     responses:
 *       200:
 *         description: Subscription started
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.post('/start', authenticateToken, requireRole('transporter'), subscriptionController.startSubscription);

/**
 * @swagger
 * /api/subscriber/status/{userId}:
 *   get:
 *     tags: [Company Subscribers]
 *     summary: Get subscription status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user
 *     responses:
 *       200:
 *         description: Subscription status retrieved
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get('/status/:userId', authenticateToken, requireRole('transporter'), subscriptionController.getStatus);

/**
 * @swagger
 * /api/subscriber/upgrade:
 *   post:
 *     tags: [Company Subscribers]
 *     summary: Upgrade subscription
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPlanId:
 *                 type: string
 *                 description: The ID of the new subscription plan
 *               paymentData:
 *                 type: object
 *                 properties:
 *                   method:
 *                     type: string
 *                     description: The payment method
 *                     enum: [card, mpesa]
 *                     default: mpesa
 *                   phone:
 *                     type: string
 *                     description: The phone number
 *     responses:
 *       200:     
 *         description: Subscription upgraded
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.post('/upgrade', authenticateToken, requireRole('transporter'), subscriptionController.upgradeSubscription);

/**
 * @swagger
 * /api/subscriber/cancel:
 *   post:
 *     tags: [Company Subscribers]
 *     summary: Cancel subscription
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscription canceled
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.post('/cancel', authenticateToken, requireRole('transporter'), subscriptionController.cancelSubscription);

/**
 * @swagger
 * /api/subscriber/validate/driver/{companyId}:
 *   get:
 *     tags: [Company Subscribers]
 *     summary: Validate driver limit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: companyId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the company
 *     responses:
 *       200:
 *         description: Driver limit validated
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get('/validate/driver/:companyId', authenticateToken, requireRole('transporter'), subscriptionController.validateDriverLimit);
router.get('/validate/vehicle/:companyId', authenticateToken, requireRole('transporter'), subscriptionController.validateVehicleLimit);


module.exports = router;