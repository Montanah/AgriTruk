const Subscribers = require('../models/Subscribers');
const Payment = require('../models/Payment');
const SubscriptionPlans = require('../models/SubscriptionsPlans');
const PaymentService = require('../services/PaymentService');
const { logAdminActivity, logActivity } = require('../utils/activityLogger');
const Users = require('../models/User');
const { processMpesaPayment, processCardPayment } = require('../services/pay');
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
    const { name, duration, price, currency, features, isActive, savingsAmount } = req.body;

    // Validation (price=0 allowed, duration=0 not allowed unless intended)
    if (!name || duration == null || price == null) {
      return res.status(400).json({ success: false, message: 'Name, duration, and price are required' });
    }
    
    const savings = calculateSavingsPercentage(req.body.price, req.body.savingsAmount);
    const planData = {
      name: name,
      duration: duration,
      price: price,
      currency: currency || "KES",
      features: features,
      isActive: isActive || false,
      savingsAmount: savingsAmount,
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

exports.createSubscriber = async (req, res) => {
  try {
    const userId = req.body.userId || req.user.uid;
    // check user exists
    const user = await Users.get(userId);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid user' });
    }
    // check subscriber exists
    const sub = await Subscribers.getByUserId(userId);
    if (sub) {
      return res.status(400).json({ success: false, message: 'Subscriber already exists' });
    }
    const planId = req.body.planId;
    // check plan exists
    const plan = await SubscriptionPlans.getSubscriptionPlan(planId);
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }

    const startDate = new Date(Date.now());
    const endDate = new Date(startDate); // Create a new Date object
    endDate.setMonth(endDate.getMonth() + plan.duration);
    const isActive = true;
    const paymentStatus = 'pending';
    const transactionId = null;
    const autoRenew = req.body.autoRenew || false;
    const subData = { userId, planId, startDate, endDate, isActive, autoRenew, paymentStatus, transactionId, status: 'active' };
    console.log(subData);
    const subscriber = await Subscribers.create(subData);
    await logActivity(userId, 'create_subscriber', req);
    // await logAdminActivity(req.user.uid, 'create_subscriber', req);
    res.status(201).json({ success: true, message: 'Subscriber created', data: subscriber, user, plan });
  } catch (error) {
    console.error('Subscriber error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getAllSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscribers.getAll();
    await logAdminActivity(req.user.uid, 'get_all_subscribers', req);
    res.status(200).json({ success: true, message: 'Subscribers retrieved', data: subscribers });
  } catch (error) {
    console.error('Subscribers error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getSubscriber = async (req, res) => {
  try {
    const subscriberId = req.params.id || req.query.subscriberId;
    console.log(subscriberId);
    const subscriber = await Subscribers.get(subscriberId);
    await logAdminActivity(req.user.uid, 'get_subscriber', req);
    res.status(200).json({ success: true, message: 'Subscriber retrieved', data: subscriber });
  } catch (error) {
    console.error('Subscriber error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createSubscriberPayment = async (req, res) => {
  try {
    const userId = req.body.userId || req.user.uid;
    const planId = req.body.planId;

    const plan = await SubscriptionPlans.getSubscriptionPlan(planId);
    
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }

    let startDate = new Date();
    let endDate = new Date(startDate);

    if (plan.duration === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan.duration === 'quarterly') {
      endDate.setMonth(endDate.getMonth() + 3);
    } else if (plan.duration === 'annual') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const paymentMethod = req.body.paymentMethod;
    const reference = `SUB_${userId}_${planId}_${Date.now()}`;
    
    let paymentResult;
    if (paymentMethod === "mpesa") {
      paymentResult = await processMpesaPayment({
        phone: req.body.phoneNumber,
        amount: plan.price,
        accountRef: reference
      });
    } else if (paymentMethod === "card") {
      paymentResult = await processCardPayment({
        amount: plan.price,
        currency: plan.currency || "usd",
        reference
      });
    } else {
      throw new Error("Invalid payment method");
    }

    const pendingPayment = await Payment.create({
      payerId: userId,
      payeeId: "TRUK", 
      amount: plan.price,
      phone: req.body.phoneNumber || null,
      email: req.body.email || null,
      currency: plan.currency || 'KES',
      method: paymentMethod,
      requestId: paymentResult.data.CheckoutRequestID,
      planId,
      status: "pending"
    });

    return res.json({
      success: true,
      message: "Payment initiated. Awaiting confirmation.",
      payment: {
        ...pendingPayment,
        gatewayResponse: paymentResult.data
      }
    });

  } catch (error) {
    console.error("Subscription creation error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};