const express = require('express');
const router = express.Router();
const { processMpesaPayment, processCardPayment, mpesaCallback, stripeCallback } = require('../services/pay');

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
 *         currency:
 *           type: string
 *         payerId:
 *           type: string
 *         phone:
 *           type:string
 *         method:
 *           type:string
 *         accountRef:
 *           type:string
 *         transDate:
 *           type:string
 *         mpesaReference:
 *           type:string
 *         status:
 *           type:string 
 *         disputeId:
 *           type: string
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 *         email:
 *           type: string
 *         faiureReason:
 *           type: string
 *         disputeid:
 *           type: string
 *         paidAt:
 *           type: string
 *         receiptUrl:
 *           type: string
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


module.exports = router;