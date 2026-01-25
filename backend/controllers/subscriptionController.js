const Subscribers = require('../models/Subscribers');
const Payment = require('../models/Payment');
const SubscriptionPlans = require('../models/SubscriptionsPlans');
const PaymentService = require('../services/PaymentService');
const { logAdminActivity, logActivity } = require('../utils/activityLogger');
const Users = require('../models/User');
const { processMpesaPayment, processCardPayment } = require('../services/pay');
const { formatTimestamps } = require('../utils/formatData');
const Action = require('../models/Action');
// controllers/subscriptionController.js
const SubscriptionService = require('../services/subscriptionService');

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
        
        // CRITICAL FIX: Calculate endDate correctly based on plan type
        const endDate = new Date();
        if (plan.price === 0) {
          // Trial plan
          const trialDays = plan.trialDays || plan.duration || 90;
          
          endDate.setDate(endDate.getDate() + trialDays);
        } else {
          // Paid plan: duration handling
          // If duration is in months (typically 1, 3, 12), multiply by 30
          // If duration is already in days (> 12), use directly
          const durationInDays = plan.duration > 12 ? plan.duration : plan.duration * 30;
          
          endDate.setDate(endDate.getDate() + durationInDays);
        }
        
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
    res.status(201).json({ success: true, message: 'Subscription plan created', data: formatTimestamps(plan) });
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
    res.status(200).json({ success: true, message: 'Subscription plan updated', data: formatTimestamps(plan) });
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
    res.status(200).json({ success: true, message: 'Subscription plans retrieved', data: formatTimestamps(plans) });
  } catch (error) {
    console.error('Subscription plan error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getSubscriptionPlan = async (req, res) => {
  try {
    const planId = req.query.planId;
    const plan = await SubscriptionPlans.getSubscriptionPlan(planId);
    res.status(200).json({ success: true, message: 'Subscription plan retrieved', data: formatTimestamps(plan) });
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
    if (!plan || !plan.isActive) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive plan' });
    }

    const startDate = new Date(Date.now());
    const endDate = new Date(startDate); // Create a new Date object
    // Robust handling for trial and paid plan durations
    if (plan.price === 0) {
      // Trial plan: use trialDays if available, otherwise use duration as days
      const trialDays = plan.trialDays || plan.duration || 90;
      endDate.setDate(endDate.getDate() + trialDays);
    } else {
      // Paid plan: duration is typically in months, need to convert
      // If duration is already in days (which it should be), add directly
      // If it's in months, multiply by 30
      const durationInDays = plan.duration > 12 ? plan.duration : plan.duration * 30;
      endDate.setDate(endDate.getDate() + durationInDays);
    }
    const isActive = true;
    const paymentStatus = 'pending';
    const transactionId = null;
    const autoRenew = req.body.autoRenew || false;
    const subData = { userId, planId, startDate, endDate, isActive, autoRenew, paymentStatus, transactionId, status: 'active' };
    const subscriber = await Subscribers.create(subData);
    await logActivity(userId, 'create_subscriber', req);
    // await logAdminActivity(req.user.uid, 'create_subscriber', req);
    await Action.create({
      type: "subscriber",
      entityId: userId,
      priority: "low",
      metadata: {
        userId: userId,
        subscriberId: subscriber.subscriberId
      },
      status: "New",
      message: 'New subscriber created',
    });

    res.status(201).json({ success: true, message: 'Subscriber created', data: formatTimestamps(subscriber), user: formatTimestamps(user), plan: formatTimestamps(plan) });
  } catch (error) {
    console.error('Subscriber error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getAllSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscribers.getAll();

    let activeCount = 0;
    let trialCount = 0;
    let totalRevenue = 0;
    let activeBrokers = 0;
    let activeTransporters = 0;

    for (const subscriber of subscribers) {
      // Get associated user
      const user = await Users.get(subscriber.userId);
      subscriber.user = formatTimestamps(user);

      // Get associated plan
      const plan = await SubscriptionPlans.getSubscriptionPlan(subscriber.planId);
      subscriber.plan = formatTimestamps(plan);

      // --- Analytics Computation ---
      if (subscriber.status === 'active') {
        activeCount++;

        // Calculate revenue if plan has a price
        if (plan?.price) {
          totalRevenue += plan.price;
        }

        // Count based on role
        if (user?.role === 'broker') activeBrokers++;
        if (user?.role === 'transporter') activeTransporters++;
      }

      if (plan.price === 0) {
        trialCount++;
      }
    }

    // --- Derive summary metrics ---
    const avgRevenue = activeCount > 0 ? totalRevenue / activeCount : 0;

    // --- Log admin action ---
    await logAdminActivity(req.user.uid, 'get_all_subscribers', req);

    // --- Response ---
    res.status(200).json({
      success: true,
      message: 'Subscribers retrieved',
      data: formatTimestamps(subscribers),
      summary: {
        activeSubscriptions: activeCount,
        trialUsers: trialCount,
        monthlyRevenue: `Ksh ${totalRevenue.toFixed(2)}`,
        avgRevenuePerUser: `Ksh ${avgRevenue.toFixed(2)}`,
        activeBrokers,
        activeTransporters
      }
    });
  } catch (error) {
    console.error('Subscribers error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


exports.getSubscriber = async (req, res) => {
  try {
    const subscriberId = req.params.id || req.query.subscriberId;
    
    const subscriber = await Subscribers.get(subscriberId);
    await logAdminActivity(req.user.uid, 'get_subscriber', req);
    res.status(200).json({ success: true, message: 'Subscriber retrieved', data: formatTimestamps(subscriber) });
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
        ...formatTimestamps(pendingPayment),
        gatewayResponse: paymentResult.data
      }
    });

  } catch (error) {
    console.error("Subscription creation error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSubcriberStatus = async (req, res) => {
  try {
    const userId = req.user.uid;

    let subscriptionStatus = {
      hasActiveSubscription: false,
      isTrialActive: false,
      needsTrialActivation: false,
      currentPlan: null,
      daysRemaining: 0,
      subscriptionStatus: 'none',
      isTrial: false,
      trialDaysRemaining: 0
    };

    const user = await Users.get(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get active subscriber first (cron job handles marking expired ones as inactive)
    const subscriber = await Subscribers.getByUserId(userId);
    
    // If no active subscriber exists, check if user has ever had a subscription (including expired)
    if (!subscriber) {
      // Check if user has ever used a trial before (even if expired)
      // Trial only works once - once expired, user must get paid subscription
      const hasUsedTrialBefore = await Subscribers.hasUsedTrial(userId);
      
      if (hasUsedTrialBefore) {
        // User has used trial before - they need paid subscription, not another trial
        subscriptionStatus.needsTrialActivation = false;
        subscriptionStatus.subscriptionStatus = 'expired'; // Guide to paid subscription
      } else {
        // User has never used trial - eligible for first-time trial
        subscriptionStatus.needsTrialActivation = true;
      }
      
      // Ensure all values are explicitly set to avoid any defaults
      subscriptionStatus.hasActiveSubscription = false;
      subscriptionStatus.isTrialActive = false;
      subscriptionStatus.daysRemaining = 0;
      subscriptionStatus.trialDaysRemaining = 0;
      subscriptionStatus.subscriptionStatus = subscriptionStatus.subscriptionStatus || 'none';
      subscriptionStatus.isTrial = false;
      
      return res.status(200).json({ 
        success: true, 
        message: 'Subscriber status retrieved', 
        data: formatTimestamps(subscriptionStatus),
        user: formatTimestamps(user)
      });
    }

    const plan = await SubscriptionPlans.getSubscriptionPlan(subscriber.planId);

    // Check if this is a trial subscription (price is 0)
    const isTrial = plan && plan.price === 0;
    
    // Calculate days remaining - handle Firestore timestamp properly
    let endDateMillis;
    if (subscriber.endDate && typeof subscriber.endDate.toMillis === 'function') {
      endDateMillis = subscriber.endDate.toMillis();
    } else if (subscriber.endDate && subscriber.endDate._seconds) {
      endDateMillis = (subscriber.endDate._seconds * 1000) + ((subscriber.endDate._nanoseconds || 0) / 1000000);
    } else if (subscriber.endDate && subscriber.endDate.seconds) {
      endDateMillis = (subscriber.endDate.seconds * 1000) + ((subscriber.endDate.nanoseconds || 0) / 1000000);
    } else {
      // If no valid endDate, treat as expired
      endDateMillis = 0;
    }
    
    const currentTime = Date.now();
    
    // Check if subscription is active (both flag and date validation)
    const isActive = subscriber.isActive && endDateMillis > currentTime;
    const daysRemaining = isActive ? Math.max(0, Math.ceil((endDateMillis - currentTime) / (1000 * 60 * 60 * 24))) : 0;
    
    // Check if trial is still active
    const isTrialActive = isTrial && isActive;
    
    // Trial only works once - once expired, user must get paid subscription
    // If subscription is expired, check if user needs trial activation
    let needsTrialActivation = false;
    if (!isActive) {
      // If expired and it was a trial, user needs paid subscription (not another trial)
      if (isTrial) {
        // Trial expired - user must get paid subscription, not another trial
        needsTrialActivation = false;
      } else {
        // Expired paid subscription - check if they're eligible for trial (if never used before)
        const isEligibleForTrial = await checkTrialEligibility(userId);
        needsTrialActivation = isEligibleForTrial;
      }
    }

    subscriptionStatus = {
      hasActiveSubscription: isActive && !isTrial, // Active subscription (not trial)
      isTrialActive: isTrialActive,
      needsTrialActivation: needsTrialActivation,
      currentPlan: plan ? plan.name : null,
      daysRemaining: daysRemaining,
      subscriptionStatus: isActive ? (isTrial ? 'trial' : 'active') : (isTrial ? 'expired' : 'inactive'),
      isTrial: isTrial,
      trialDaysRemaining: isTrialActive ? daysRemaining : 0,
      trialUsed: isTrial && !isActive // Trial was used but expired - user needs paid subscription
    }

    await logActivity(req.user.uid, 'get_subscriber_status', req);

    res.status(200).json({ 
      success: true, 
      message: 'Subscriber status retrieved', 
      data: formatTimestamps(subscriptionStatus),
      user: formatTimestamps(user),
      subscriber: formatTimestamps(subscriber),
      plan: formatTimestamps(plan)
    });
    
  } catch (error) {
    console.error('Error getting subscriber status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

// Helper function to check trial eligibility
async function checkTrialEligibility(userId) {
  try {
    // Check if user has ever had any subscription
    const hasPreviousSubscriptions = await Subscribers.hasAnySubscription(userId);
    
    // Check if user has already used a trial
    const hasUsedTrialBefore = await Subscribers.hasUsedTrial(userId);
    
    // User is eligible for trial if they have no previous subscriptions 
    // and haven't used a trial before
    return !hasPreviousSubscriptions && !hasUsedTrialBefore;
  } catch (error) {
    console.error('Error checking trial eligibility:', error);
    return false;
  }
}


async function hasUsedTrial(userId) {
  try {
    const subscriber = await Subscribers.getByUserId(userId);
    if (!subscriber) {
      return false;
    }
    return subscriber.some(async (sub) => {
      const plan = await SubscriptionPlans.getSubscriptionPlan(sub.planId);
      return plan && plan.price === 0;
    });
  } catch (error) {
    console.error('Error checking trial usage:', error);
    return false;
  }
};

exports.changePlan = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { newPlanId, action, paymentMethod, phoneNumber, currency } = req.body;

    // Validate input
    if (!newPlanId || !action) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: newPlanId and action'
      });
    }

    if (!['upgrade', 'downgrade'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "upgrade" or "downgrade"'
      });
    }

    // Get user and current subscription
    const user = await Users.get(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentSubscriber = await Subscribers.getByUserId(userId);
    if (!currentSubscriber) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active subscription found' 
      });
    }

    // Get current and new plan details
    const currentPlan = await SubscriptionPlans.getSubscriptionPlan(currentSubscriber.planId);
    const newPlan = await SubscriptionPlans.getSubscriptionPlan(newPlanId);

    if (!newPlan) {
      return res.status(404).json({ 
        success: false, 
        message: 'Requested plan not found' 
      });
    }

    // Validate plan change
    const validationError = validatePlanChange(currentPlan, newPlan, action);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    // Calculate prorated amount if needed
    const proratedAmount = calculateProratedAmount(currentSubscriber, currentPlan, newPlan);

    // Process payment if upgrade requires additional payment
    let paymentResult;
    if (proratedAmount > 0) {
      paymentResult = await processPayment(
        userId, 
        proratedAmount, 
        `Plan ${action} from ${currentPlan.name} to ${newPlan.name}`,
        {
          paymentMethod,
          phoneNumber,
          currency: currency || newPlan.currency,
          planId: newPlan.id
        }
      );

      if (!paymentResult.success) {
        return res.status(400).json({
          success: false,
          message: `Payment failed: ${paymentResult.message}`,
          paymentDetails: paymentResult
        });
      }
    }

    // Update subscription (only if payment was successful or not required)
    const updatedSubscription = await updateSubscription(
      currentSubscriber, 
      newPlan, 
      action,
      proratedAmount
    );

    await logActivity(userId, `plan_${action}`, req, {
      fromPlan: currentPlan.name,
      toPlan: newPlan.name,
      proratedAmount,
      paymentId: paymentResult?.paymentId
    });

    const response = {
      success: true,
      message: `Plan ${action} successful`,
      data: {
        previousPlan: formatTimestamps(currentPlan),
        newPlan: formatTimestamps(newPlan),
        updatedSubscription: formatTimestamps(updatedSubscription),
        proratedAmount,
        action
      }
    };

    // Add payment details to response if payment was processed
    if (paymentResult) {
      response.payment = {
        initiated: proratedAmount > 0,
        amount: proratedAmount,
        paymentId: paymentResult.paymentId,
        status: 'pending'
      };
    }

    res.status(200).json(response);

  } catch (error) {
    console.error(`Error in plan change:`, error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Helper functions
function validatePlanChange(currentPlan, newPlan, action) {
  if (currentPlan.id === newPlan.id) {
    return 'Cannot change to the same plan';
  }

  if (action === 'upgrade' && currentPlan.price >= newPlan.price) {
    return 'Upgrade requires a higher-priced plan';
  }

  if (action === 'downgrade' && currentPlan.price <= newPlan.price) {
    return 'Downgrade requires a lower-priced plan';
  }

  return null;
}

function calculateProratedAmount(currentSubscriber, currentPlan, newPlan) {
  // Convert Firestore timestamp to milliseconds
  const endDateMillis = currentSubscriber.endDate.toMillis ? 
    currentSubscriber.endDate.toMillis() : 
    (currentSubscriber.endDate._seconds * 1000) + (currentSubscriber.endDate._nanoseconds / 1000000);
  
  const currentTime = Date.now();
  const timeRemaining = endDateMillis - currentTime;
  const totalDuration = currentSubscriber.endDate - currentSubscriber.startDate;
  
  // Calculate unused portion of current plan
  const unusedPercentage = timeRemaining / totalDuration;
  const unusedAmount = currentPlan.price * unusedPercentage;
  
  // Calculate cost of new plan for remaining period
  const newPlanCostForRemaining = newPlan.price * unusedPercentage;
  
  // Return the difference (positive if upgrade, negative if downgrade)
  return Math.max(0, newPlanCostForRemaining - unusedAmount);
}

async function processPayment(userId, amount, description, paymentDetails = {}) {
  if (amount <= 0) {
    return { success: true, message: 'No payment required' };
  }

  try {
    const paymentMethod = paymentDetails.paymentMethod || 'card'; // Default to card
    const reference = `PLAN_CHANGE_${userId}_${Date.now()}`;
    
    let paymentResult;

    if (paymentMethod === "mpesa") {
      paymentResult = await processMpesaPayment({
        phone: paymentDetails.phoneNumber,
        amount: amount,
        accountRef: reference,
        description: description
      });
    } else if (paymentMethod === "card") {
      paymentResult = await processCardPayment({
        amount: amount,
        currency: paymentDetails.currency || "usd",
        reference: reference,
        description: description
      });
    } else {
      throw new Error("Invalid payment method");
    }

    // Create payment record
    const paymentRecord = await Payment.create({
      payerId: userId,
      payeeId: "TRUK SUBSCRIPTIONS", 
      amount: amount,
      phone: paymentDetails.phoneNumber || null,
      email: paymentDetails.email || null,
      currency: paymentDetails.currency || 'KES',
      method: paymentMethod,
      requestId: paymentResult.data.CheckoutRequestID || reference,
      planId: paymentDetails.planId || null,
      status: "pending",
      type: "plan_change",
      description: description
    });

    return {
      success: true,
      message: "Payment initiated successfully",
      paymentId: paymentRecord.id,
      gatewayResponse: paymentResult.data
    };

  } catch (error) {
    console.error('Payment processing error:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
};

async function updateSubscription(subscriber, newPlan, action, proratedAmount) {
  const updateData = {
    planId: newPlan.id,
    previousPlanId: subscriber.planId,
    lastChange: new Date(),
    changeType: action,
    proratedAmount: proratedAmount
  };

  // If downgrading to a free plan, adjust status
  if (newPlan.price === 0) {
    updateData.isActive = true;
  }

  return await Subscribers.update(subscriber.id, updateData);
};

exports.cancelPlan = async (req, res) => {
  try {
    const userId = req.user.uid || req.body.userId;
    const { cancellationReason } = req.body;

    const user = await Users.get(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const subscriber = await Subscribers.getByUserId(userId);
    if (!subscriber) {
      return res.status(404).json({ success: false, message: 'Subscriber not found' });
    }

    const result = await cancelSubscription(subscriber, cancellationReason);

    await logActivity(userId, 'plan_cancel', req, {
      planId: subscriber.planId,
      cancellationReason,
      refundAmount: result.refundAmount
    });

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: {
        cancellationDate: new Date(),
        refundAmount: result.refundAmount,
        cancellationReason,
        endDate: result.endDate
      }
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.AdminCancelSubscription = async (req, res) => {
  try {
    const { userId, cancellationReason } = req.body;
    const subscriber = await Subscribers.getByUserId(userId);
    if (!subscriber) {
      return res.status(404).json({ success: false, message: 'Subscriber not found' });
    }
    const result = await cancelSubscription(subscriber, cancellationReason);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

exports.reactivateSubscription = async (req, res) => {
  try {
    const { paymentMethod, phoneNumber, addTrialDays } = req.body;
    const userId = req.body.userId;

    // Get user and their expired subscription
    const user = await Users.get(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get the most recent subscription (even if expired)
    const allSubscriptions = await Subscribers.getAllByUserId(userId);
    const expiredSubscription = allSubscriptions
      .sort((a, b) => b.endDate - a.endDate)[0];

    if (!expiredSubscription) {
      return res.status(404).json({ 
        success: false, 
        message: 'No subscription found to reactivate' 
      });
    }

    // Get the plan details
    const plan = await SubscriptionPlans.getSubscriptionPlan(expiredSubscription.planId);
    if (!plan || !plan.isActive) {
      return res.status(400).json({ 
        success: false, 
        message: 'The subscription plan is no longer available' 
      });
    }

    const isTrial = plan.price === 0;
    const UsedTrial = await Subscribers.hasUsedTrial(userId);

    // **SCENARIO 1: Adding trial days to expired subscription**
    if (addTrialDays && typeof addTrialDays === 'number') {
      // Only allow adding trial days if user hasn't used trial before
      if (UsedTrial && !isTrial) {
        return res.status(400).json({
          success: false,
          message: 'Trial period already used. Please purchase a subscription.'
        });
      }

      // Admin can add trial days to any subscription
      const newStartDate = new Date();
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + addTrialDays);

      await Subscribers.update(expiredSubscription.id, {
        startDate: newStartDate,
        endDate: newEndDate,
        isActive: true,
        status: 'active',
        paymentStatus: 'trial_extension',
        reactivatedAt: new Date()
      });

      await logActivity(userId, 'subscription_trial_extension', req, {
        planId: plan.id,
        trialDays: addTrialDays
      });

      return res.status(200).json({
        success: true,
        message: `Subscription reactivated with ${addTrialDays} trial days`,
        data: {
          startDate: newStartDate,
          endDate: newEndDate,
          plan: formatTimestamps(plan)
        }
      });
    }

    // **SCENARIO 2: Reactivating a trial (not allowed - must upgrade)**
    if (isTrial) {
      return res.status(400).json({
        success: false,
        message: 'Trial period has expired. Please purchase a subscription to continue.',
        requiresPayment: true,
        availablePlans: await SubscriptionPlans.getAllSubscriptionPlans()
          .then(plans => plans.filter(p => p.isActive && p.price > 0))
      });
    }

    // **SCENARIO 3: Reactivating a paid subscription (requires payment)**
    if (plan.price > 0) {
      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'Payment method required to reactivate subscription',
          requiresPayment: true,
          plan: formatTimestamps(plan)
        });
      }

      // Calculate new subscription period
      const newStartDate = new Date();
      const newEndDate = new Date(newStartDate);
      
      if (plan.duration === 'monthly') {
        newEndDate.setMonth(newEndDate.getMonth() + 1);
      } else if (plan.duration === 'quarterly') {
        newEndDate.setMonth(newEndDate.getMonth() + 3);
      } else if (plan.duration === 'annual') {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      } else {
        // Fallback for numeric duration in days
        newEndDate.setDate(newEndDate.getDate() + (plan.duration || 30));
      }

      // Process payment
      const reference = `REACTIVATE_${userId}_${plan.id}_${Date.now()}`;
      let paymentResult;

      if (paymentMethod === "mpesa") {
        paymentResult = await processMpesaPayment({
          phone: phoneNumber,
          amount: plan.price,
          accountRef: reference,
          description: `Reactivate subscription: ${plan.name}`
        });
      } else if (paymentMethod === "card") {
        paymentResult = await processCardPayment({
          amount: plan.price,
          currency: plan.currency || "KES",
          reference,
          description: `Reactivate subscription: ${plan.name}`
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment method'
        });
      }

      // Create payment record
      const paymentRecord = await Payment.create({
        payerId: userId,
        payeeId: "TRUK",
        amount: plan.price,
        phone: phoneNumber || null,
        currency: plan.currency || 'KES',
        method: paymentMethod,
        requestId: paymentResult.data.CheckoutRequestID,
        planId: plan.id,
        status: "pending",
        type: "reactivation"
      });

      // Update subscription (pending payment confirmation)
      await Subscribers.update(expiredSubscription.id, {
        startDate: admin.firestore.Timestamp.fromDate(newStartDate),
        endDate: admin.firestore.Timestamp.fromDate(newEndDate),
        isActive: false, // Will be activated after payment confirmation
        status: 'pending_payment',
        paymentStatus: 'pending',
        paymentId: paymentRecord.id,
        transactionId: reference,
        reactivatedAt: admin.firestore.Timestamp.now()
      });

      await logActivity(userId, 'subscription_reactivation_initiated', req, {
        planId: plan.id,
        amount: plan.price,
        paymentMethod
      });

      return res.status(200).json({
        success: true,
        message: 'Payment initiated. Subscription will be reactivated upon payment confirmation.',
        data: {
          payment: formatTimestamps(paymentRecord),
          gatewayResponse: paymentResult.data,
          newStartDate,
          newEndDate,
          plan: formatTimestamps(plan)
        }
      });
    }

  } catch (error) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

async function cancelSubscription(subscriber, cancellationReason = 'User requested') {
  const currentPlan = await SubscriptionPlans.getSubscriptionPlan(subscriber.planId);
  
  // Calculate refund amount (prorated for unused time)
  const refundAmount = calculateRefundAmount(subscriber, currentPlan);
  
  // Update subscription status
  const updateData = {
    isActive: false,
    status: 'cancelled',
    cancellationDate: new Date(),
    cancellationReason: cancellationReason,
    refundAmount: refundAmount,
    endDate: new Date() // Set end date to now for immediate cancellation
  };

  const updatedSubscription = await Subscribers.update(subscriber.id, updateData);

  // Process refund if applicable
  if (refundAmount > 0) {
    await processRefund(subscriber.payerId, refundAmount, `Refund for cancelled subscription: ${currentPlan.name}`);
  }

  return {
    success: true,
    refundAmount: refundAmount,
    endDate: updateData.endDate,
    subscription: updatedSubscription
  };
};

// Calculate refund amount
function calculateRefundAmount(subscriber, plan) {
  if (plan.price === 0) {
    return 0; // No refund for free trials
  }

  const startDateMillis = convertFirestoreTimestampToMillis(subscriber.startDate);
  const endDateMillis = convertFirestoreTimestampToMillis(subscriber.endDate);
  const currentTime = Date.now();

  // If subscription has already ended or is invalid
  if (endDateMillis <= currentTime || startDateMillis >= currentTime) {
    return 0;
  }

  const totalDuration = endDateMillis - startDateMillis;
  const timeUsed = currentTime - startDateMillis;
  const timeRemaining = endDateMillis - currentTime;

  // Calculate unused percentage
  const unusedPercentage = timeRemaining / totalDuration;
  const refundAmount = plan.price * unusedPercentage;

  // Only refund if amount is significant (e.g., more than $1)
  return refundAmount > 1 ? Math.round(refundAmount * 100) / 100 : 0;
};

// Process refund
async function processRefund(userId, amount, description) {
  if (amount <= 0) {
    return { success: true, message: 'No refund required' };
  }

  try {
    // Implement your refund logic here
    
    // const refundResult = await PaymentProcessor.refund(userId, amount, description);
    
    // Record the refund in your database
    await Payment.create({
      payerId: "TRUK REFUNDS", 
      payeeId: userId,
      amount: amount,
      currency: 'KES',
      method: 'refund',
      status: "completed",
      type: "refund",
      description: description
    });

    return refundResult;
  } catch (error) {
    console.error('Refund processing error:', error);
    // Don't fail the cancellation if refund fails, just log it
    return { success: false, message: error.message };
  }
};

/**
 * GET /api/subscription/plans/active - Get active paid plans
 */
exports.getActivePlans = async function(req, res) {
  try {
    const plans = await SubscriptionPlans.getActivePlans();
    res.status(200).json({
      success: true,
      plans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching active plans',
      error: error.message,
    });
  }
};

/**
 * POST /api/subscription/start - Start a new subscription
 * Body: { userId, planId, paymentData }
 */
exports.startSubscription = async function (req, res)  {
  try {
    const { planId, paymentData } = req.body;

    const userId = req.user.uid || req.body.userId;

    if (!userId || !planId) {
      return res.status(400).json({
        success: false,
        message: 'userId and planId are required',
      });
    }

    const result = await SubscriptionService.startSubscription(
      userId,
      planId,
      paymentData
    );

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/subscription/status/:userId - Get subscription status
 */
exports.getStatus = async function(req, res) {
  try {
    const { userId } = req.params;
    const status = await SubscriptionService.getSubscriptionStatus(userId);

    res.status(200).json({
      success: true,
      ...status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription status',
      error: error.message,
    });
  }
},

/**
 * POST /api/subscription/upgrade - Upgrade subscription
 * Body: { userId, newPlanId, paymentData }
 */
exports.upgradeSubscription = async function(req, res) {
  try {
    const { newPlanId, paymentData } = req.body;

    const userId = req.user.uid || req.body.userId;

    if (!userId || !newPlanId) {
      return res.status(400).json({
        success: false,
        message: 'userId and newPlanId are required',
      });
    }

    const result = await SubscriptionService.upgradeSubscription(
      userId,
      newPlanId,
      paymentData
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/subscription/cancel - Cancel subscription
 * Body: { userId, reason }
 */
exports.cancelSubscription = async function(req, res) {
  try {
    const { reason } = req.body;

    userId = req.user.uid || req.body.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    const result = await SubscriptionService.cancelSubscription(userId, reason);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
},

/**
 * GET /api/subscription/validate/driver/:companyId - Check if can add driver
 */
exports.validateDriverLimit = async function(req, res) {
  try {
    const { companyId } = req.params;
    const validation = await SubscriptionService.canAddDriver(companyId);

    res.status(200).json({
      success: true,
      ...validation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating driver limit',
      error: error.message,
    });
  }
},

/**
 * GET /api/subscription/validate/vehicle/:companyId - Check if can add vehicle
 */
exports.validateVehicleLimit = async function(req, res) {
  try {
    const { companyId } = req.params;
    const validation = await SubscriptionService.canAddVehicle(companyId);

    res.status(200).json({
      success: true,
      ...validation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating vehicle limit',
      error: error.message,
    });
  }
};