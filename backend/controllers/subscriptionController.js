const Subscribers = require('../models/Subscribers');
const SubscriptionPlans = require('../models/SubscriptionsPlans');
const PaymentService = require('../services/PaymentService');

exports.manageSubscription = async (req, res) => {
  try {
    const { action, planId } = req.body;
    const userId = req.user.uid;
    const userType = req.user.role; // 'transporter' or 'broker'

    if (!['subscribe', 'update', 'cancel', 'renew'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const existingSubscription = await Subscribers.getByUserId(userId);
    if (action === 'subscribe' && existingSubscription) {
      return res.status(400).json({ success: false, message: 'Subscription already exists' });
    }

    if (action === 'subscribe' || action === 'update') {
      const plan = await SubscriptionPlans.getSubscriptionPlan(planId);
      if (!plan || !plan.isActive) {
        return res.status(400).json({ success: false, message: 'Invalid or inactive plan' });
      }

      const paymentResult = await PaymentService.initializePayment({
        email: req.user.email, // Assume email is available in req.user
        amount: plan.price,
        planId: plan.planId,
        userId,
        callbackUrl: `${process.env.APP_URL}/api/subscriptions/callback`,
      });

      if (!paymentResult.success) {
        return res.status(400).json({ success: false, message: paymentResult.message });
      }

      // Store initial subscription data (pending payment)
      const subscriptionData = {
        userId,
        planId,
        startDate: new Date(),
        endDate: null, // To be updated after payment
        isActive: false,
        autoRenew: req.body.autoRenew || false,
        paymentStatus: 'pending',
        transactionId: paymentResult.data.reference,
      };
      const subscription = await Subscribers.create(subscriptionData);

      res.status(200).json({
        success: true,
        message: 'Payment initialized, please complete the transaction',
        data: { authorizationUrl: paymentResult.data.authorizationUrl, subscriptionId: subscription.id },
      });
    } else if (action === 'cancel') {
      if (!existingSubscription) {
        return res.status(404).json({ success: false, message: 'No active subscription' });
      }
      await Subscribers.update(existingSubscription.id, { isActive: false, paymentStatus: 'cancelled' });
      res.status(200).json({ success: true, message: 'Subscription cancelled' });
    } else if (action === 'renew') {
      if (!existingSubscription || !existingSubscription.autoRenew) {
        return res.status(400).json({ success: false, message: 'Auto-renew not enabled or no subscription' });
      }
      const plan = await SubscriptionPlans.getSubscriptionPlan(existingSubscription.planId);
      const paymentResult = await PaymentService.chargeAuthorization({
        email: req.user.email,
        amount: plan.price,
        authorizationCode: existingSubscription.authorizationCode, // Assume stored after first payment
      });
      if (!paymentResult.success) {
        return res.status(400).json({ success: false, message: paymentResult.message });
      }
      const newEndDate = new Date(existingSubscription.endDate.toDate().getTime() + plan.duration * 24 * 60 * 60 * 1000);
      await Subscribers.update(existingSubscription.id, {
        endDate: admin.firestore.Timestamp.fromDate(newEndDate),
        paymentStatus: 'paid',
        transactionId: paymentResult.data.reference,
      });
      res.status(200).json({ success: true, message: 'Subscription renewed' });
    }
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Callback handler for Paystack webhook
exports.paymentCallback = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference is required' });
    }

    const verification = await PaymentService.verifyPayment(reference);
    if (!verification.success) {
      return res.status(400).json({ success: false, message: verification.message });
    }

    const { status, amount, metadata } = verification.data;
    if (status === 'success') {
      const subscription = await Subscribers.getByUserId(metadata.userId);
      if (subscription && subscription.transactionId === reference) {
        const plan = await SubscriptionPlans.getSubscriptionPlan(metadata.planId);
        const endDate = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);
        await Subscribers.update(subscription.id, {
          endDate: admin.firestore.Timestamp.fromDate(endDate),
          isActive: true,
          paymentStatus: 'paid',
          authorizationCode: req.body.authorization_code, // From Paystack webhook
        });
        res.status(200).json({ success: true, message: 'Payment verified, subscription activated' });
      } else {
        res.status(404).json({ success: false, message: 'Subscription not found' });
      }
    } else {
      await Subscribers.update(subscription.id, { paymentStatus: 'failed' });
      res.status(400).json({ success: false, message: 'Payment failed' });
    }
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createSubscriptionPlan = async (req, res) => {
  try {
    if (!req.body.name || !req.body.duration || !req.body.price) {
      return res.status(400).json({ success: false, message: 'Name, duration, and price are required' });
    }

    const savings = calculateSavingsPercentage(req.body.price, req.body.savingsAmount);
    const planData = {
      name: req.body.name,
      duration: req.body.duration,
      price: req.body.price,
      currency: req.body.currency || "KES",
      features: req.body.features,
      isActive: req.body.isActive || false,
      savingsAmount: req.body.savingsAmount,
      savingsPercentage: savings
    }
    const plan = await SubscriptionPlans.createSubscriptionPlan(planData);
    res.status(201).json({ success: true, message: 'Subscription plan created', data: plan });
  } catch (error) {
    console.error('Subscription plan error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

function calculateSavingsPercentage(originalPrice, discountedPrice){
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
}


exports.updateSubscriptionPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlans.updateSubscriptionPlan(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Subscription plan updated', data: plan });
  } catch (error) {
    console.error('Subscription plan error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteSubscriptionPlan = async (req, res) => {
  try {
    await SubscriptionPlans.deleteSubscriptionPlan(req.params.id);
    res.status(200).json({ success: true, message: 'Subscription plan deleted' });
  } catch (error) {
    console.error('Subscription plan error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getAllSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlans.getAllSubscriptionPlans();
    res.status(200).json({ success: true, message: 'Subscription plans retrieved', data: plans });
  } catch (error) {
    console.error('Subscription plan error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getSubscriptionPlan = async (req, res) => {
  try {
    const planId = req.query.planId;
    const plan = await SubscriptionPlans.getSubscriptionPlan(planId);
    res.status(200).json({ success: true, message: 'Subscription plan retrieved', data: plan });
  } catch (error) {
    console.error('Subscription plan error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};