const subscriptionController = require("../controllers/subscriptionController");
const router = require("express").Router();
const { authenticateToken } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/requireRole");
const { authorize } = require("../middlewares/adminAuth");

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Manage subscriptions
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Subscription:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         planId:
 *           type: string
 *         name:
 *           type: string
 *         duration:
 *           type: number
 *         price:
 *           type: number
 *         features:
 *           type: array
 *           items:
 *             type: string
 *         isActive:
 *           type: boolean
 *         savingsAmount:
 *           type: number
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Subscriber:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *         subscriberId:
 *           type: string
 *         planId:
 *           type: string
 *         status:
 *           type: string
 *         startDate:
 *           type: string
 *         endDate:
 *           type: string
 *         isActive:
 *           type: boolean
 *         autorenew:
 *           type: boolean
 *         paymentStatus:
 *           type: string
 *         transactionId:
 *           type: string
 *         currentUsage:
 *           type: number
 *         updatedAt:
 *           type: string
 *         createdAt:
 *           type: string
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
router.get("/", authenticateToken, async (req, res) => {
  const { planId } = req.query;

  if (planId) {
    return subscriptionController.getSubscriptionPlan(req, res);
  }
  return subscriptionController.getAllSubscriptionPlans(req, res);
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
router.get(
  "/admin/",
  authenticateToken,
  requireRole("admin"),
  authorize(["view_subscriptions", "manage_subscriptions", "super_admin"]),
  async (req, res) => {
    const { planId } = req.query;

    if (planId) {
      return subscriptionController.getSubscriptionPlan(req, res);
    }
    return subscriptionController.getAllSubscriptionPlans(req, res);
  },
);

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
  "/admin/",
  authenticateToken,
  requireRole("admin"),
  authorize(["manage_subscriptions", "super_admin"]),
  subscriptionController.createSubscriptionPlan,
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
router.put(
  "/admin/:id",
  authenticateToken,
  requireRole("admin"),
  authorize(["manage_subscriptions", "super_admin"]),
  subscriptionController.updateSubscriptionPlan,
);

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
router.delete(
  "/admin/:id",
  authenticateToken,
  requireRole("admin"),
  authorize(["manage_subscriptions", "super_admin"]),
  subscriptionController.deleteSubscriptionPlan,
);

// Subscriber
/**
 * @swagger
 * /api/subscriptions/subscriber/:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Create a new subscriber
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Subscriber'
 *     responses:
 *       201:
 *         description: Subscriber created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscriber'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
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
  "/subscriber/",
  authenticateToken,
  requireRole(["transporter", "broker", "business", "admin"]),
  subscriptionController.createSubscriber,
);
/**
 * @swagger
 * /api/subscriptions/subscriber/pay:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Pay for a subscription
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the subscriber
 *               planId:
 *                 type: string
 *                 description: The ID of the subscription plan
 *               paymentMethod:
 *                 type: string
 *                 description: The type of the payment method
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number to be charged
 *     responses:
 *       201:
 *         description: Subscriber Payment Request sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
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
  "/subscriber/pay",
  authenticateToken,
  requireRole(["transporter", "broker", "business", "admin"]),
  subscriptionController.createSubscriberPayment,
);

/**
 * @swagger
 * /api/subscriptions/subscriber/status:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get subscriber status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscriber status retrieved
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Internal server error
 */
router.get(
  "/subscriber/status",
  authenticateToken,
  requireRole(["transporter", "broker", "business", "admin"]),
  subscriptionController.getSubcriberStatus,
);

/**
 * @swagger
 * /api/subscriptions/subscriber/{id}:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get a subscriber
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscriber retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscriber'
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
router.get(
  "/subscriber/:id",
  authenticateToken,
  requireRole(["transporter", "broker", "business", "admin"]),
  subscriptionController.getSubscriber,
);

/**
 * @swagger
 * /api/subscriptions/admin/subscribers/:
 *   get:
 *     tags: [Admin Views]
 *     summary: Get all subscribers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: subscriberId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscribers found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 subscribers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subscriber'
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Internal server error
 */
router.get(
  "/admin/subscribers/",
  authenticateToken,
  requireRole("admin"),
  authorize(["manage_subscriptions", "super_admin"]),
  async (req, res) => {
    const { subscriberId } = req.query;

    if (subscriberId) {
      return subscriptionController.getSubscriber(req, res);
    }
    return subscriptionController.getAllSubscribers(req, res);
  },
);

/**
 * @swagger
 * /api/subscriptions/change-plan:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Change subscription plan
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPlanId
 *             properties:
 *               newPlanId:
 *                 type: string
 *                 description: ID of the plan to change to
 *               action:
 *                 type: string
 *                 enum: [upgrade, downgrade]
 *                 description: Action to perform
 *     responses:
 *       200:
 *         description: Subscription plan changed
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.post(
  "/change-plan",
  authenticateToken,
  requireRole(["transporter", "broker", "business", "admin"]),
  subscriptionController.changePlan,
);

/**
 * @swagger
 * /api/subscriptions/cancel:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Cancel subscription
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cancellationReason
 *             properties:
 *               cancellationReason:
 *                 type: string
 *                 description: Reason for cancellation
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
router.post(
  "/cancel",
  authenticateToken,
  requireRole(["transporter", "broker", "business", "admin"]),
  subscriptionController.cancelPlan,
);

/**
 * @swagger
 * /api/subscriptions/trial/validate-eligibility:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Validate if user is eligible for trial subscription
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planId:
 *                 type: string
 *                 description: Optional trial plan ID to validate
 *     responses:
 *       200:
 *         description: Eligibility validation result
 *       400:
 *         description: User not eligible (already has subscription or used trial)
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Internal server error
 */
router.post(
  "/trial/validate-eligibility",
  authenticateToken,
  requireRole(["transporter", "broker", "business", "admin"]),
  subscriptionController.validateTrialEligibility,
);

/**
 * @swagger
 * /api/subscriptions/trial/activate-payment-method:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Register payment method for trial activation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethod
 *               - paymentDetails
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [mpesa, stripe]
 *               paymentDetails:
 *                 type: object
 *                 description: Payment details (phoneNumber for M-PESA, tokenId for Stripe)
 *     responses:
 *       200:
 *         description: Payment method registered
 *       400:
 *         description: Invalid payment method
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Internal server error
 */
router.post(
  "/trial/activate-payment-method",
  authenticateToken,
  requireRole(["transporter", "broker", "business", "admin"]),
  subscriptionController.activatePaymentMethod,
);

/**
 * @swagger
 * /api/subscriptions/trial/activate:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Activate trial subscription
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
 *                 description: Trial plan ID (optional, uses default if not provided)
 *               paymentMethod:
 *                 type: string
 *                 enum: [mpesa, stripe]
 *               paymentData:
 *                 type: object
 *                 description: Payment data (phoneNumber for M-PESA, tokenId for Stripe)
 *               isForRenewal:
 *                 type: boolean
 *                 description: Skip eligibility check for renewals
 *     responses:
 *       201:
 *         description: Trial subscription activated
 *       400:
 *         description: Payment failed or eligibility check failed
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Internal server error
 */
router.post(
  "/trial/activate",
  authenticateToken,
  requireRole(["transporter", "broker", "business", "admin"]),
  subscriptionController.activateTrial,
);

/**
 * @swagger
 * /api/subscriptions/trial/status:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get current trial subscription status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trial status information
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Internal server error
 */
router.get(
  "/trial/status",
  authenticateToken,
  requireRole(["transporter", "broker", "business", "admin"]),
  subscriptionController.getTrialStatus,
);

module.exports = router;
