// ============================================
// controllers/paymentController.js - Payment Webhook Handler
// ============================================
const Subscribers = require('../models/Subscribers');

const paymentController = {
  /**
   * POST /api/payment/webhook - Handle payment webhook from M-Pesa
   */
  async handlePaymentWebhook(req, res) {
    try {
      const { 
        paymentId, 
        mpesaReference, 
        status, 
        amount, 
        phone,
        transDate 
      } = req.body;

      // Find the payment record
      let payment;
      if (paymentId) {
        payment = await Payment.get(paymentId);
      } else if (mpesaReference) {
        payment = await Payment.getByReference(mpesaReference);
      }

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment record not found',
        });
      }

      // Update payment status
      await Payment.updateStatus(payment.paymentId, status, {
        mpesaReference,
        transDate,
        ...(status === 'failed' ? { failureReason: req.body.failureReason } : {}),
      });

      // If payment successful and linked to subscription, activate subscription
      if ((status === 'completed' || status === 'success') && payment.subscriberId) {
        await Subscribers.update(payment.subscriberId, {
          paymentStatus: 'completed',
          isActive: true,
          status: 'active',
          transactionId: payment.paymentId,
        });

        // Send activation notification
        await this.sendSubscriptionActivationEmail(payment);
      }

      // If payment failed
      if (status === 'failed' && payment.subscriberId) {
        await Subscribers.update(payment.subscriberId, {
          paymentStatus: 'failed',
          isActive: false,
          status: 'payment_failed',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Payment webhook processed',
      });
    } catch (error) {
      console.error('Payment webhook error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing payment webhook',
        error: error.message,
      });
    }
  },

  /**
   * POST /api/payment/initiate - Initiate payment for subscription
   */
  async initiatePayment(req, res) {
    try {
      const { userId, planId, phone, email } = req.body;

      if (!userId || !planId || !phone) {
        return res.status(400).json({
          success: false,
          message: 'userId, planId, and phone are required',
        });
      }

      // Get plan details
      const SubscriptionPlans = require('../models/SubscriptionPlans');
      const plan = await SubscriptionPlans.getSubscriptionPlan(planId);

      // Create payment record
      const payment = await Payment.create({
        payerId: userId,
        planId,
        amount: plan.price,
        currency: plan.currency,
        phone,
        email,
        method: 'mpesa',
        status: 'pending',
      });

      // TODO: Integrate with actual M-Pesa STK Push API
      // const mpesaResponse = await initiateSTKPush({
      //   phone,
      //   amount: plan.price,
      //   reference: payment.paymentId,
      // });

      res.status(201).json({
        success: true,
        payment,
        message: 'Payment initiated. Please complete on your phone.',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error initiating payment',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/payment/:paymentId - Get payment details
   */
  async getPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const payment = await Payment.get(paymentId);

      res.status(200).json({
        success: true,
        payment,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: 'Payment not found',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/payment/user/:userId - Get user's payment history
   */
  async getUserPayments(req, res) {
    try {
      const { userId } = req.params;
      const payments = await Payment.getByPayer(userId);

      res.status(200).json({
        success: true,
        payments,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching payments',
        error: error.message,
      });
    }
  },

  async sendSubscriptionActivationEmail(payment) {
    // TODO: Implement email notification
    console.log(`Subscription activated for payment ${payment.paymentId}`);
  },
};

module.exports = paymentController;