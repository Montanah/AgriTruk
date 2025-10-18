const express = require('express');
const router = express.Router();
const { processMpesaPayment, processCardPayment, mpesaCallback, stripeCallback } = require('../services/pay');
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');
const PaymentService = require('../services/PaymentService');
/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment management endpoints
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         paymentId: 
 *           type: string
 *         requestId:
 *           type: string
 *         subscriberId:
 *           type: string
 *         amount:
 *           type: number
 *           format: float
 *         currency:
 *           type: string
 *         payerId:
 *           type: string
 *         phone:
 *           type: string
 *         method:
 *           type: string
 *         accountRef:
 *           type: string
 *         transDate:
 *           type: string
 *           format: date-time
 *         mpesaReference:
 *           type: string
 *         status:
 *           type: string 
 *         disputeId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         email:
 *           type: string
 *           format: email
 *         failureReason:
 *           type: string
 *         paidAt:
 *           type: string
 *           format: date-time
 *         receiptUrl:
 *           type: string
 *           format: uri
 */

/**
 * @swagger
 * /api/payments/mpesa:
 *   post:
 *     summary: Process M-Pesa payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               amount:
 *                 type: number
 *               accountRef:
 *                 type: string
 *     responses:
 *       200:
 *         description: M-Pesa payment processed successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 *       403:
 *         description: Access denied
 */
router.post("/mpesa", async (req, res) => {
  try {
    const { phone, amount, accountRef } = req.body;
    const response = await processMpesaPayment({ phone, amount, accountRef });
    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/stripe", async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const response = await processCardPayment({ amount, currency });
    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// router.post("/mpesa/callback", async (req, res) => {
//   try {
//     const response = await mpesaCallback(req, res);
//     res.json({ success: true, data: response });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

router.post("/mpesa/callback", mpesaCallback);

router.post("/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const response = await stripeCallback(req, res);
    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/payment/webhook:
 *   post:
 *     summary: Handle payment webhook from M-Pesa
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentId:
 *                 type: string
 *               mpesaReference:
 *                 type: string
 *               status:
 *                 type: string
 *               amount:
 *                 type: number
 *               phone:
 *                 type: string 
 *     responses:
 *       200:
 *         description: Payment webhook handled successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post("/webhook", paymentController.handlePaymentWebhook);

/**
 * @swagger
 * /api/payments/{paymentId}:
 *   get:
 *     summary: Get payment details
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: paymentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get('/:paymentId', authenticateToken, requireRole(['transporter', 'admin', 'broker']), paymentController.getPayment);

/**
 * @swagger
 * /api/payments/user/{userId}:
 *   get:
 *     summary: Get user's payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User's payment history retrieved successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get('/user/:userId', authenticateToken, requireRole(['transporter', 'admin', 'broker']), paymentController.getUserPayments);

/**
 * @swagger
 * /api/payments/paystack/initialize:
 *   post:
 *     summary: Initialize a Paystack payment
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               amount:
 *                 type: number
 *               planId:
 *                 type: string
 *               userId:
 *                 type: string
 *               callbackUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Paystack payment initialized successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/paystack/initialize', authenticateToken, async (req, res) => {
  try {
    const { email, amount, planId, callbackUrl } = req.body;
    const userId = req.user?.uid || req.body.userId;

    const result = await PaymentService.initializePayment({
      email,
      amount,
      planId,
      userId,
      callbackUrl,
    });

    if (!result.success) return res.status(400).json(result);
    res.status(200).json(result);
  } catch (error) {
    console.error('Payment initialization route error:', error);
    res.status(500).json({ success: false, message: 'Server error initializing payment' });
  }
});

// Verify payment
/**
 * @swagger
 * /api/payments/verify/{reference}:
 *   get:
 *     summary: Verify a payment transaction
 *     tags: [Payments]
 *     parameters:
 *       - name: reference
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment transaction verified successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get('/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const result = await PaymentService.verifyPayment(reference);

    if (!result.success) return res.status(400).json(result);
    res.status(200).json(result);
  } catch (error) {
    console.error('Payment verification route error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying payment' });
  }
});

// Create subscription (optional)
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { email, planId, authorizationCode } = req.body;
    const result = await PaymentService.createSubscription({ email, planId, authorizationCode });

    if (!result.success) return res.status(400).json(result);
    res.status(200).json(result);
  } catch (error) {
    console.error('Subscription route error:', error);
    res.status(500).json({ success: false, message: 'Server error creating subscription' });
  }
});

module.exports = router;