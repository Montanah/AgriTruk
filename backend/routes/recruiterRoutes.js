const express = require('express');
const router = express.Router();
const RecruiterAuthController = require('../controllers/recruiterAuthController');
const RecruiterSubscriptionController = require('../controllers/recruiterSubscriptionController');
const { authenticateToken } = require("../middlewares/authMiddleware");
const { requireRole } = require('../middlewares/requireRole');
const { authorize } = require('../middlewares/adminAuth');
const { subscriptionAccess } = require('../middlewares/SubscriptionAccess');
const jobSeekerController = require('../controllers/jobSeekerController');

/**
 * @swagger
 * tags:
 *   name: Recruiter
 *   description: Recruiter routes
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     RecruiterPlans:
 *       type: object
 *       properties:
 *         planId:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         billingCycle:
 *           type: string
 *         duration:
 *           type: number
 *         trialDays:
 *           type: number
 *         features:
 *           type: object
 *           properties:
 *             accessDuration:
 *               type: string
 *             maxDriverContacts:
 *               type: string
 *             maxActiveJobPosts:
 *               type: string
 *             driverProfileViewing:
 *               type: boolean
 *             documentsAccess:
 *               type: boolean
 *             featuredListings:
 *               type: boolean
 *             supportLevel:
 *               type: string
 *         isActive:
 *           type: boolean
 *         isPopular:
 *           type: boolean
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 */
// ============================================
// AUTHENTICATION ROUTES (Public)
// ============================================

/**
 * @swagger
 * /api/recruiter/register:
 *   post:
 *     summary: Register a new recruiter
 *     tags: [Recruiter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 example: +254712345678
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Recruiter registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */
router.post('/register', RecruiterAuthController.registerRecruiter);

/**
 * @route   POST /api/recruiter/login
 * @desc    Login recruiter (additional server-side checks)
 * @access  Public
 */
/**
 * @swagger
 * /api/recruiter/login:
 *   post:
 *     summary: Login recruiter
 *     tags: [Recruiter]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uid
 *     responses:
 *       200:
 *         description: Recruiter logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.post('/login', authenticateToken, RecruiterAuthController.loginRecruiter);

/**
 * @route   POST /api/recruiter/verify
 * @desc    Verify recruiter account
 * @access  Public
 */
router.post('/verify', RecruiterAuthController.verifyAccount);

/**
 * @route   POST /api/recruiter/resend-verification
 * @desc    Resend verification code    
 * @access  Public
 */
router.post('/resend-verification', RecruiterAuthController.resendVerificationCode);

// ============================================
// SUBSCRIPTION PLANS ROUTES (Public)
// ============================================

/**
 * @route   GET /api/recruiter/plans
 * @desc    Get all available subscription plans
 * @access  Public
 */
/**
 * @swagger
 * /api/recruiter/plans:
 *   get:
 *     summary: Get all available subscription plans
 *     tags: [Recruiter]
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plans:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RecruiterPlans'
 *       500:
 *         description: Internal server error
 */
router.get('/plans', RecruiterSubscriptionController.getPlans);

/**
 * @route   GET /api/recruiter/plans/:planId
 * @desc    Get a specific plan
 * @access  Public
 */
/**
 * @swagger
 * /api/recruiter/plans/{planId}:
 *   get:
 *     summary: Get a specific subscription plan
 *     tags: [Recruiter]
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         description: ID of the plan
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecruiterPlans'
 *       404:
 *         description: Plan not found
 */
router.get('/plans/:planId', RecruiterSubscriptionController.getPlan);

// ============================================
// SUBSCRIPTION MANAGEMENT ROUTES (Protected)
// ============================================

/**
 * @route   POST /api/recruiter/subscription/start
 * @desc    Start a new subscription
 * @access  Private
 */

/**
 * @swagger
 * /api/recruiter/subscription/start:
 *   post:
 *     summary: Start a new subscription
 *     description: Initiates a new subscription plan for a recruiter, including payment information.
 *     tags:
 *       - Recruiter
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
 *               - planId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The unique ID of the recruiter
 *               planId:
 *                 type: string
 *                 description: The ID of the subscription plan
 *               paymentData:
 *                 type: object
 *                 description: Payment details
 *                 required:
 *                   - paymentMethod
 *                 properties:
 *                   paymentMethod:
 *                     type: string
 *                     description: The payment method to use
 *                     enum: [card, mpesa]
 *                     example: mpesa
 *                   phoneNumber:
 *                     type: string
 *                     description: Phone number used for payment (E.164 format)
 *                     example: "+254712345678"
 *                   email:
 *                     type: string
 *                     description: Email associated with the payment
 *                     example: "user@example.com"
 *     responses:
 *       200:
 *         description: Subscription started successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscriber'
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */
router.post(
  '/subscription/start',
  authenticateToken,
  requireRole('recruiter'),
  RecruiterSubscriptionController.startSubscription
);


/**
 * @route   GET /api/recruiter/subscription/status/:userId
 * @desc    Get subscription status
 * @access  Private
 */
/**
 * @swagger
 * /api/recruiter/subscription/status/{userId}:
 *   get:
 *     summary: Get subscription status
 *     tags: [Recruiter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: ID of the user
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscription status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscriber'
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */
router.get(
  '/subscription/status/:userId',
  authenticateToken,
  RecruiterSubscriptionController.getSubscriptionStatus
);

/**
 * @route   GET /api/recruiter/subscription/history/:userId
 * @desc    Get subscription history
 * @access  Private
 */
/**
 * @swagger
 * /api/recruiter/subscription/history/{userId}:
 *   get:
 *     summary: Get subscription history
 *     tags: [Recruiter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: ID of the user
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscription history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscriber'
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */ 
router.get(
  '/subscription/history/:userId',
  authenticateToken,
  requireRole(['recruiter', 'admin']),
  authorize(['manage_subscriptions', 'super_admin']),
  RecruiterSubscriptionController.getSubscriptionHistory
);

/**
 * @route   PUT /api/recruiter/subscription/upgrade
 * @desc    Upgrade subscription
 * @access  Private
 */
/**
 * @swagger
 * /api/recruiter/subscription/upgrade:
 *   put:
 *     summary: Upgrade subscription
 *     tags: [Recruiter]
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
 *               - newPlanId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The unique ID of the recruiter
 *               newPlanId:
 *                 type: string
 *                 description: The ID of the new subscription plan
 *     responses:
 *       200:
 *         description: Subscription upgraded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscriber'
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */
router.put(
  '/subscription/upgrade',
  authenticateToken,
  requireRole('recruiter'),
  RecruiterSubscriptionController.upgradeSubscription
);

/**
 * @route   PUT /api/recruiter/subscription/cancel/:userId
 * @desc    Cancel subscription
 * @access  Private
 */
/**
 * @swagger
 * /api/recruiter/subscription/cancel/{userId}:
 *   put:
 *     summary: Cancel subscription
 *     tags: [Recruiter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: ID of the user
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscription canceled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscriber'
 *       400:
 *         description: Invalid input
 *       500:   
 *         description: Internal server error
 */
router.put(
  '/subscription/cancel/:userId',
  authenticateToken,
  requireRole('recruiter'),
  RecruiterSubscriptionController.cancelSubscription
);

// ============================================
// USAGE TRACKING ROUTES (Protected)
// ============================================

/**
 * @route   GET /api/recruiter/limits/driver-contact/:userId
 * @desc    Check if user can contact more drivers
 * @access  Private
 */
router.get(
  '/limits/driver-contact/:userId',
  authenticateToken,
  RecruiterSubscriptionController.checkDriverContactLimit
);

/**
 * @route   POST /api/recruiter/usage/driver-contact
 * @desc    Record a driver contact (increment usage)
 * @access  Private
 */
router.post(
  '/usage/driver-contact',
  authenticateToken,
  RecruiterSubscriptionController.recordDriverContact
);

// ============================================
// ADMIN ROUTES (Protected - Admin only)
// ============================================

/**
 * @route   POST /api/recruiter/admin/plans
 * @desc    Create a new plan (Admin only)
 * @access  Private/Admin
 */
/**
 * @swagger
 * /api/recruiter/admin/plans:
 *   post:
 *     summary: Create a new subscription plan
 *     tags: [Recruiter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecruiterPlans'
 *     responses:
 *       201:
 *         description: Plan created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecruiterPlans'
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */

router.post(
  '/admin/plans',
  authenticateToken,
  requireRole('admin'),
  authorize(['manage_subscriptions', 'super_admin']),
  RecruiterSubscriptionController.createPlan
);

/**
 * @route   PUT /api/recruiter/admin/plans/:planId
 * @desc    Update a plan (Admin only)
 * @access  Private/Admin
 */
/**
 * @swagger
 * /api/recruiter/admin/plans/{planId}:
 *   put:
 *     summary: Update a subscription plan
 *     tags: [Recruiter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         description: ID of the plan
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecruiterPlans'
 *     responses:
 *       200:
 *         description: Plan updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecruiterPlans'
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */
router.put(
  '/admin/plans/:planId',
  authenticateToken,
  requireRole('admin'),
  authorize(['manage_subscriptions', 'super_admin']),
  RecruiterSubscriptionController.updatePlan
);

/**
 * @swagger
 * /api/recruiter/admin/plans/{planId}:
 *   delete:
 *     summary: Delete a subscription plan
 *     tags: [Recruiter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         description: ID of the plan
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Plan deleted successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/admin/plans/:planId',
  authenticateToken,
  requireRole('admin'),
  authorize(['manage_subscriptions', 'super_admin']),
  RecruiterSubscriptionController.deletePlan
)

/**
 * @swagger
 * /api/recruiter/drivers/approved:
 *   get:
 *     summary: Get approved job seekers
 *     tags: [Recruiter]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of approved job seekers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/JobSeeker'
 *       500:
 *         description: Internal server error
 */
router.get('/drivers/approved', authenticateToken, requireRole(['recruiter', 'admin']), subscriptionAccess, jobSeekerController.getApprovedDrivers);

module.exports = router;