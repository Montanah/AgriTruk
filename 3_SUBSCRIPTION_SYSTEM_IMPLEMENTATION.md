# Subscription System - Backend Implementation

## 🎯 **Priority: HIGH - Subscription System Needs Implementation**

**Date:** September 3, 2025  
**Status:** Frontend ready, backend needs implementation  
**Estimated Time:** 2-3 days

---

## ❌ **Missing Endpoints That Need Implementation**

### **1. Subscription Status Endpoint**

**Frontend calls:** `GET /api/subscriptions/status`

**Add to `backend/routes/subscriptionRoutes.js`:**

```javascript
// Get current user's subscription status
router.get('/status', authenticateToken, subscriptionController.getSubscriptionStatus);
```

**Add to `backend/controllers/subscriptionController.js`:**

```javascript
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.uid;
    const user = await User.get(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get user's subscription
    const subscriber = await Subscribers.getByUserId(userId);

    let subscriptionStatus = {
      hasActiveSubscription: false,
      isTrialActive: false,
      needsTrialActivation: true,
      currentPlan: null,
      daysRemaining: 0,
      subscriptionStatus: 'none',
    };

    if (subscriber) {
      if (subscriber.paymentStatus === 'trial' && subscriber.isActive) {
        // Trial subscription
        const trialEnd = subscriber.endDate.toDate();
        const now = new Date();
        const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

        subscriptionStatus = {
          hasActiveSubscription: false,
          isTrialActive: daysRemaining > 0,
          needsTrialActivation: false,
          currentPlan: null,
          daysRemaining: Math.max(0, daysRemaining),
          subscriptionStatus: daysRemaining > 0 ? 'trial' : 'expired',
        };
      } else if (subscriber.paymentStatus === 'paid' && subscriber.isActive) {
        // Paid subscription
        const plan = await SubscriptionPlans.get(subscriber.planId);
        const subscriptionEnd = subscriber.endDate.toDate();
        const now = new Date();
        const daysRemaining = Math.ceil((subscriptionEnd - now) / (1000 * 60 * 60 * 24));

        subscriptionStatus = {
          hasActiveSubscription: true,
          isTrialActive: false,
          needsTrialActivation: false,
          currentPlan: plan,
          daysRemaining: Math.max(0, daysRemaining),
          subscriptionStatus: daysRemaining > 0 ? 'active' : 'expired',
        };
      }
    }

    res.status(200).json({
      success: true,
      ...subscriptionStatus,
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
```

---

### **2. Trial Activation Endpoint**

**Frontend calls:** `POST /api/subscriptions/activate-trial`

**Add to `backend/routes/subscriptionRoutes.js`:**

```javascript
// Activate trial subscription
router.post('/activate-trial', authenticateToken, subscriptionController.activateTrial);
```

**Add to `backend/controllers/subscriptionController.js`:**

```javascript
exports.activateTrial = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { userType } = req.body;

    if (!userType || !['transporter', 'broker'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type. Must be transporter or broker',
      });
    }

    // Check if user already has a subscription
    const existingSubscriber = await Subscribers.getByUserId(userId);
    if (existingSubscriber) {
      return res.status(400).json({
        success: false,
        message: 'User already has a subscription',
      });
    }

    // Get trial plan
    const trialPlanId = userType === 'transporter' ? 'trial-transporter' : 'trial-broker';
    const trialPlan = await SubscriptionPlans.get(trialPlanId);

    if (!trialPlan) {
      return res.status(404).json({
        success: false,
        message: 'Trial plan not found',
      });
    }

    // Create trial subscription
    const trialData = {
      userId: userId,
      planId: trialPlanId,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + trialPlan.duration * 24 * 60 * 60 * 1000),
      isActive: true,
      autoRenew: false,
      paymentStatus: 'trial',
      transactionId: `TRIAL_${userType.toUpperCase()}_${userId}`,
      currentUsage: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const subscriber = await Subscribers.create(trialData);

    res.status(200).json({
      success: true,
      message: 'Trial activated successfully',
      subscriber: subscriber,
    });
  } catch (error) {
    console.error('Activate trial error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
```

---

### **3. Plan Upgrade Endpoint**

**Frontend calls:** `POST /api/subscriptions/upgrade`

**Add to `backend/routes/subscriptionRoutes.js`:**

```javascript
// Upgrade subscription plan
router.post('/upgrade', authenticateToken, subscriptionController.upgradePlan);
```

**Add to `backend/controllers/subscriptionController.js`:**

```javascript
exports.upgradePlan = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { planId, paymentMethod } = req.body;

    if (!planId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID and payment method are required',
      });
    }

    // Get the new plan
    const newPlan = await SubscriptionPlans.get(planId);
    if (!newPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    // Get current subscription
    const currentSubscriber = await Subscribers.getByUserId(userId);

    // Process payment (implement your payment logic here)
    const paymentResult = await processPayment(userId, planId, paymentMethod);

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: paymentResult.message || 'Payment failed',
      });
    }

    // Update or create subscription
    const subscriptionData = {
      userId: userId,
      planId: planId,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + newPlan.duration * 24 * 60 * 60 * 1000),
      isActive: true,
      autoRenew: true,
      paymentStatus: 'paid',
      transactionId: paymentResult.transactionId,
      currentUsage: 0,
      updatedAt: new Date(),
    };

    let subscriber;
    if (currentSubscriber) {
      // Update existing subscription
      subscriber = await Subscribers.update(currentSubscriber.id, subscriptionData);
    } else {
      // Create new subscription
      subscriptionData.createdAt = new Date();
      subscriber = await Subscribers.create(subscriptionData);
    }

    res.status(200).json({
      success: true,
      message: 'Plan upgraded successfully',
      subscriber: subscriber,
    });
  } catch (error) {
    console.error('Upgrade plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
```

---

## 🗄️ **Database Setup Required**

### **1. Create Trial Plans**

**Add to `subscriptionPlans` collection:**

```javascript
// Trial plan for transporters
{
  "planId": "trial-transporter",
  "name": "Transporter Trial",
  "duration": 30,
  "price": 0,
  "currency": "KES",
  "features": [
    "Up to 10 job requests",
    "Basic route optimization",
    "Standard support",
    "Mobile app access"
  ],
  "isActive": true,
  "isTrial": true,
  "userType": "transporter",
  "createdAt": "2025-09-03T00:00:00.000Z",
  "updatedAt": "2025-09-03T00:00:00.000Z"
}

// Trial plan for brokers
{
  "planId": "trial-broker",
  "name": "Broker Trial",
  "duration": 30,
  "price": 0,
  "currency": "KES",
  "features": [
    "Up to 20 client requests",
    "Basic consolidation tools",
    "Standard support",
    "Mobile app access"
  ],
  "isActive": true,
  "isTrial": true,
  "userType": "broker",
  "createdAt": "2025-09-03T00:00:00.000Z",
  "updatedAt": "2025-09-03T00:00:00.000Z"
}
```

### **2. Auto-Activate Trial on Registration**

**Update `backend/controllers/authController.js` in `registerUser` function:**

```javascript
// Add after user creation in registerUser function
if (role === 'transporter' || role === 'broker') {
  const trialPlanId = role === 'transporter' ? 'trial-transporter' : 'trial-broker';

  const trialData = {
    userId: uid,
    planId: trialPlanId,
    status: 'active',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    isActive: true,
    autoRenew: false,
    paymentStatus: 'trial',
    transactionId: `TRIAL_${role.toUpperCase()}_${uid}`,
    currentUsage: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await Subscribers.create(trialData);
}
```

---

## ⏰ **Trial Expiry Cron Job**

**Create `backend/services/cronService.js`:**

```javascript
const cron = require('node-cron');
const admin = require('firebase-admin');
const Subscribers = require('../models/Subscribers');
const { sendEmail } = require('../services/emailService');

// Daily cron job to check for expired trials
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running trial expiry check...');

    const expiredTrials = await Subscribers.getExpiredTrials();

    for (const trial of expiredTrials) {
      // Deactivate expired trial
      await Subscribers.update(trial.id, {
        isActive: false,
        status: 'expired',
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Send expiry notification
      await sendEmail({
        to: trial.user.email,
        subject: 'Your TRUK Trial Has Expired',
        text: 'Your free trial has expired. Upgrade to continue using TRUK services.',
        html: '<h2>Trial Expired</h2><p>Your free trial has expired. Upgrade to continue using TRUK services.</p>',
      });

      console.log(`Deactivated expired trial for user: ${trial.userId}`);
    }

    console.log(`Processed ${expiredTrials.length} expired trials`);
  } catch (error) {
    console.error('Trial expiry cron job error:', error);
  }
});

module.exports = { cron };
```

**Add to `backend/app.js`:**

```javascript
// Add cron service
require('./services/cronService');
```

---

## 🧪 **Testing Checklist**

### **Subscription System Testing:**

- [ ] New transporters get trial automatically on registration
- [ ] New brokers get trial automatically on registration
- [ ] `/api/subscriptions/status` returns correct subscription status
- [ ] `/api/subscriptions/activate-trial` works for eligible users
- [ ] `/api/subscriptions/upgrade` processes plan upgrades
- [ ] Trial expiry cron job deactivates expired trials
- [ ] Payment processing works correctly
- [ ] Subscription status updates in real-time

---

## 📋 **Summary**

**What to implement:**

1. **3 subscription endpoints** - Status, trial activation, plan upgrade
2. **Trial plans** - Create trial plans in database
3. **Auto-trial activation** - Activate trial on user registration
4. **Trial expiry cron job** - Daily check for expired trials

**What's already working:**

- ✅ Subscription models and database structure
- ✅ Payment processing infrastructure
- ✅ User authentication and roles
- ✅ Email service for notifications

**Estimated time:** 2-3 days of focused work

---

**Backend Engineer**: The subscription system needs these endpoints and database setup to work with the frontend. The frontend is ready and waiting for these features.
