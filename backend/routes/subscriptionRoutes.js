const subscriptionController = require('../controllers/subscriptionController');
const router = require('express').Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');
const { authorize, authenticate } = require("../middlewares/adminAuth");

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Manage subscriptions
 */

/**
 * @swagger
 * /api/subscriptions:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get all subscriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: planId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscriptions found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 subscriptions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subscription'     
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:             
 *             schema:
 *               $ref: '#/components/schemas/Error'     
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'     
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authenticateToken, async (req, res) => {
    const { planId} = req.query;

    if (planId) {
        return subscriptionController.getSubscription(req, res);
    }
    return subscriptionController.getAllSubscriptions(req, res);    
});


/**
 * @swagger
 * /api/subscriptions/admin/:
 *   get:
 *     tags: [Admin Views]
 *     summary: Get all subscriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: planId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscriptions found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 subscriptions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subscription'     
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:             
 *             schema:
 *               $ref: '#/components/schemas/Error'     
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'     
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/admin/', authenticate, requireRole('admin'), 
authorize(['view_subscriptions', 'manage_subscriptions', 'super_admin']), 
async (req, res) => {
    const {planId} = req.query;

    if (planId) {
        return subscriptionController.getSubscriptionPlan(req, res);
    }
    return subscriptionController.getAllSubscriptionPlans(req, res);    
});

/**
 * @swagger
 * /api/subscriptions/admin/:
 *   post:
 *     tags: [Admin Actions]
 *     summary: Create a new subscription
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - duration
 *               - features
 *               - isActive
 *               - savingsAmount
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the subscription
 *               price:
 *                 type: number
 *                 description: The price of the subscription
 *               duration:
 *                 type: number
 *                 description: The duration of the subscription in months
 *               features:
 *                 type: array
 *                 description: An array of features for the subscription
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *                 description: The status of the subscription
 *               savingsAmount:
 *                 type: number
 *                 description: The savings amount for the subscription
 *     responses:
 *       201:
 *         description: Subscription created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscription'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/admin/',
  authenticate,
  requireRole('admin'),
  authorize(['manage_subscriptions', 'super_admin']),
  subscriptionController.createSubscriptionPlan
);

/** 
 * @swagger
 * /api/subscriptions/admin/{id}:
 *   put:
 *     tags: [Admin Actions]
 *     summary: Update a subscription
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the subscription
 *               price:
 *                 type: number
 *                 description: The price of the subscription
 *               duration:
 *                 type: number
 *                 description: The duration of the subscription in months
 *               features:
 *                 type: array
 *                 description: An array of features for the subscription
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *                 description: The status of the subscription
 *               savingsAmount:
 *                 type: number
 *                 description: The savings amount for the subscription
 *     responses:
 *       201:
 *         description: Subscription created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscription'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/admin/:id', authenticate, requireRole('admin'), authorize(['manage_subscriptions', 'super_admin']), subscriptionController.updateSubscriptionPlan);

/**
 * @swagger
 * /api/subscriptions/admin/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a subscription
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:   
 *       204:
 *         description: Subscription deleted
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/admin/:id', authenticate, requireRole('admin'), authorize(['manage_subscriptions', 'super_admin']), subscriptionController.deleteSubscriptionPlan);

module.exports = router;