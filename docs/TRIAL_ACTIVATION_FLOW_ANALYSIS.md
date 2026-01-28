# Trial Activation Flow Analysis

**Date:** January 27, 2026  
**Status:** Analyzed & Documented  
**User Roles:** Transporter (Company) + Broker

---

## Executive Summary

The current implementation has **TWO SEPARATE TRIAL SYSTEMS**:

1. **Recruiter Subscription System** (for Brokers)
   - Uses `RecruiterPlans`, `RecruiterSubscribers`, `RecruiterSubscriptionService`
   - Automatically activated in `brokerController.js` when admin approves broker

2. **Standard Subscription System** (for Transporters)
   - Uses `SubscriptionPlans`, `Subscribers`, `subscriptionController.js`
   - **NOT** automatically activated when admin approves transporter
   - **⚠️ ISSUE: Manual activation required - user must go to SubscriptionTrialScreen**

---

## Current Flow - BROKER (Working ✅)

```
1. User Signs Up → createBroker()
   Status: 'pending'
   
2. Admin Reviews → reviewBroker(action='approve')
   ↓
3. AUTO-ACTIVATE TRIAL
   - Checks if broker used trial before
   - Gets trial plan from RecruiterPlans
   - Calls RecruiterSubscriptionService.startSubscription()
   
4. Broker sees trial subscription
   - RecruiterSubscribers record created with:
     * 90-day trial (or plan.trialDays)
     * endDate = now + 90 days
     * paymentStatus: 'pending'
     * isActive: true
   
5. Days Remaining Calculation
   - daysRemaining = ceil((endDate - now) / (1000*60*60*24))
   - Returned by /api/subscriptions/subscriber/status
   
6. On Expiry (Day 91+)
   - Cron job marks subscription as inactive
   - User routed to renewal/upgrade screen
```

**Location:** [brokerController.js](https://github.com/Montanah/AgriTruk/blob/backend/backend/controllers/brokerController.js#L1234-L1250)
```javascript
// Auto-activate trial subscription for broker if eligible
try {
  const RecruiterPlans = require('../models/RecruiterPlans');
  const RecruiterSubscribers = require('../models/RecruiterSubscribers');
  const RecruiterSubscriptionService = require('../services/RecruiterSubscriptionService');
  
  const hasUsedTrial = await RecruiterSubscribers.hasUsedTrial(user.id);
  if (!hasUsedTrial) {
    const trialPlan = await RecruiterPlans.getTrialPlan();
    if (trialPlan && trialPlan.id) {
      await RecruiterSubscriptionService.startSubscription(user.id, trialPlan.id);
    }
  }
} catch (trialErr) {
  console.error('Error auto-activating broker trial:', trialErr);
}
```

---

## Current Flow - TRANSPORTER (Incomplete ⚠️)

```
1. User Signs Up → createTransporter() / TransporterCompletionScreen
   Status: 'pending'
   
2. Admin Reviews → reviewTransporter(action='approve-dl|approve-insurance|approve-id')
   ↓
3. Status Changed to 'approved'
   ⚠️ BUT NO TRIAL SUBSCRIPTION CREATED
   
4. User Logs In
   ↓
5. App.tsx Checks Subscription Status
   - subscriptionService.getSubscriptionStatus()
   - NO subscriber record found
   - Returned status: {
       hasActiveSubscription: false,
       isTrialActive: false,
       needsTrialActivation: true,  ← User directed to SubscriptionTrialScreen
       subscriptionStatus: 'none'
     }
   
6. User Navigated to SubscriptionTrialScreen
   - Shows "Your Free Trial Status"
   - Message: "Trial will be activated by admin team"
   ⚠️ BUT USER MUST WAIT OR MANUALLY ACTIVATE
   
7. Manual Trial Activation (Current Workaround)
   - User sees disclosure modal
   - Clicks Accept
   - Backend activates trial via subscriptionController.activateTrial()
   - Subscriber record created with 90-day trial
   
8. Days Remaining
   - Once active, daysRemaining calculated same as broker
   - Shown in frontend subscription screens
   
9. On Expiry
   - User sees SubscriptionExpiredScreen
   - Prompted to pay for plan
```

**Location:** [SubscriptionTrialScreen.tsx](https://github.com/Montanah/AgriTruk/blob/main/frontend/src/screens/SubscriptionTrialScreen.tsx)

---

## The Problem - Incomplete Implementation

### What's Missing in Transporter Flow:

1. **No Auto-Activation on Admin Approval**
   - Broker: ✅ Auto-trial when admin approves
   - Transporter: ❌ No auto-trial creation
   - File: [adminController.js reviewTransporter()](https://github.com/Montanah/AgriTruk/blob/backend/backend/controllers/adminController.js) - NO trial creation code

2. **User Experience Gap**
   - After admin approval, user sees "admin will activate"
   - **User doesn't understand why they're waiting**
   - Creates confusion about next steps

3. **Backend Logic Missing**
   - `reviewTransporter()` doesn't call trial activation
   - Should check if transporter used trial before
   - Should create `Subscribers` record with 90-day trial
   - Should mark `status: 'approved'` AND `isActive: true`

---

## Subscription System Structure

### Trial Plan Definition
```javascript
// Backend - SubscriptionPlans collection
{
  planId: "plan-trial-transporter",
  name: "Free Trial",
  duration: 90,           // In days
  trialDays: 90,          // Explicit trial duration
  price: 0,               // FREE
  billingPeriod: "monthly",
  features: [...]
  isActive: true
}
```

### Subscriber Record (When Trial Activated)
```javascript
// Subscribers collection
{
  id: "subscriber-123",
  userId: "transporter-uid",
  planId: "plan-trial-transporter",
  status: "active",
  startDate: Timestamp(Jan 27, 2026),
  endDate: Timestamp(Apr 27, 2026),     // 90 days later
  isActive: true,
  paymentStatus: "pending",
  autoRenew: false,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
}
```

### Days Remaining Calculation
```javascript
// subscriptionController.js - getSubscriberStatus()
const endDateMillis = subscriber.endDate.toMillis();
const currentTime = Date.now();
const daysRemaining = Math.ceil((endDateMillis - currentTime) / (1000 * 60 * 60 * 24));
```

---

## Company Transporter - Driver Dependency

### Current Implementation
- Company has `status: 'approved'` → Can create drivers
- Drivers assigned to vehicles
- Drivers manage jobs

### With Subscription
- Company `subscription.isActive = true` → Drivers active
- Company `subscription.isActive = false` → Drivers inactive
- **Backend should validate:** Driver operations require company subscription

### Problem
- **No validation** that company has active subscription before driver operates
- Drivers can still accept jobs even if company subscription expired
- Need: Subscription check before job acceptance

---

## Implementation Checklist

### Backend Changes Required

#### 1. **adminController.js** - reviewTransporter() function
```javascript
if (action === 'approve-dl|approve-insurance|approve-id') {
  // ... existing code ...
  
  // When all documents approved and status = 'approved'
  try {
    const Subscribers = require('../models/Subscribers');
    const SubscriptionPlans = require('../models/SubscriptionPlans');
    
    // Check if transporter used trial before
    const hasUsedTrial = await Subscribers.hasUsedTrial(userId);
    
    if (!hasUsedTrial) {
      // Get trial plan
      const trialPlan = await SubscriptionPlans.getTrialPlan();
      
      if (trialPlan && trialPlan.id) {
        // Create subscriber with 90-day trial
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (trialPlan.trialDays || 90));
        
        await Subscribers.create({
          userId: transporter.userId,
          planId: trialPlan.id,
          status: 'active',
          startDate: admin.firestore.Timestamp.fromDate(startDate),
          endDate: admin.firestore.Timestamp.fromDate(endDate),
          isActive: true,
          paymentStatus: 'pending',
          autoRenew: false
        });
      }
    }
  } catch (trialErr) {
    console.error('Error auto-activating transporter trial:', trialErr);
    // Don't block approval if trial activation fails
  }
}
```

#### 2. **subscriptionController.js** - Add driver subscription validation
```javascript
// Before driver accepts job or performs operation
exports.validateCompanySubscription = async (req, res) => {
  try {
    const { companyId } = req.body;
    
    const company = await Company.get(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    
    const subscriber = await Subscribers.getByUserId(company.userId);
    
    if (!subscriber || !subscriber.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Company subscription expired or inactive',
        subscriptionStatus: subscriber?.status || 'inactive'
      });
    }
    
    // Check if subscription expired
    const endDateMillis = subscriber.endDate.toMillis();
    if (endDateMillis <= Date.now()) {
      return res.status(403).json({
        success: false,
        message: 'Company subscription has expired',
        daysRemaining: 0
      });
    }
    
    const daysRemaining = Math.ceil((endDateMillis - Date.now()) / (1000 * 60 * 60 * 24));
    
    res.status(200).json({
      success: true,
      isActive: true,
      daysRemaining: daysRemaining
    });
  } catch (error) {
    console.error('Subscription validation error:', error);
    res.status(500).json({ success: false, message: 'Validation failed' });
  }
};
```

#### 3. **Driver Operations** - Add subscription check
```javascript
// In driverController.js or jobController.js
// Before accepting job, starting delivery, etc.

const subscriptionStatus = await subscriptionController.validateCompanySubscription({
  body: { companyId: driver.companyId }
});

if (!subscriptionStatus.success) {
  throw new Error('Company subscription required for this operation');
}
```

### Frontend Changes Required

#### 1. **SubscriptionTrialScreen.tsx** - Update messaging
```typescript
// Current (Confusing)
"Your Free Trial Status"
"Trial will be activated by admin team"

// Should be (Clear)
"Trial automatically activated by admin"
"Your 90-day trial is now active"
```

#### 2. **App.tsx** - Subscription Check
```typescript
// When approved transporter logs in
const subscriptionStatus = await subscriptionService.getSubscriptionStatus();

if (subscriptionStatus.needsTrialActivation) {
  // This should NOT happen if admin activated trial
  // If it does, show: "Your trial was not activated - contact support"
} else {
  // Navigate to TransporterTabs
  // Show days remaining in dashboard
}
```

#### 3. **Driver Operations** - Show subscription expiry warning
```typescript
// In driver job acceptance screen
if (daysRemaining <= 7) {
  showAlert(`Company subscription expires in ${daysRemaining} days. Renew to continue operations.`);
}

if (daysRemaining <= 0) {
  showAlert('Company subscription has expired. Cannot accept jobs.');
}
```

---

## Timeline & Flow

### Day 1: User Signup
```
10:00 AM - User signs up as company transporter
         - Status: 'pending' in transporters collection
         - No subscription record
```

### Day 2: Admin Review
```
09:00 AM - Admin approves all documents
         - Status changed to 'approved' ← SHOULD AUTO-CREATE TRIAL HERE
         - Email sent: "Account approved, trial activated"
         - Subscriber record should be created with:
           * startDate: Jan 28, 2026, 9:00 AM
           * endDate: Apr 28, 2026, 9:00 AM (90 days)
           * isActive: true
```

### Day 2: User Logs In
```
03:00 PM - User logs into app
         - App.tsx calls subscriptionService.getSubscriptionStatus()
         - Returns: {
             hasActiveSubscription: false,
             isTrialActive: true,
             daysRemaining: 90,
             currentPlan: "Free Trial",
             subscriptionStatus: "trial"
           }
         - Routes to TransporterTabs
         - Dashboard shows: "Trial Expires: Apr 28, 2026 (90 days)"
```

### Days 3-89: Active Operation
```
- Company can:
  * Manage drivers
  * Assign vehicles
  * Accept jobs
  * Track shipments
  
- Dashboard shows countdown: "89 days remaining"
```

### Day 90: Warning Phase
```
- Dashboard shows warning: "7 days until trial expires"
- "Renew subscription to continue" button highlighted
```

### Day 91+: Expiry
```
- Cron job (daily) marks subscription as inactive
- subscriptionStatus.isTrialActive = false
- App routes user to SubscriptionExpiredScreen
- User sees: "Trial Expired: Renew your subscription"
- Company & drivers cannot perform new operations
```

---

## Database Operations

### When Admin Approves Transporter

**Before (Current):**
```javascript
// adminController.js
await Transporter.update(transporterId, {
  status: 'approved',
  // ... other fields
});
// ⚠️ NO subscription created
```

**After (Fixed):**
```javascript
// adminController.js
await Transporter.update(transporterId, {
  status: 'approved',
  // ... other fields
});

// NEW: Auto-activate trial
const user = await User.get(transporter.userId);
const hasUsedTrial = await Subscribers.hasUsedTrial(user.uid);

if (!hasUsedTrial) {
  const trialPlan = await SubscriptionPlans.getTrialPlan();
  if (trialPlan) {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (trialPlan.trialDays || 90));
    
    const subscriber = await Subscribers.create({
      userId: user.uid,
      planId: trialPlan.id,
      status: 'active',
      startDate: admin.firestore.Timestamp.fromDate(startDate),
      endDate: admin.firestore.Timestamp.fromDate(endDate),
      isActive: true,
      paymentStatus: 'pending',
      autoRenew: false,
      createdAt: admin.firestore.Timestamp.now()
    });
    
    console.log(`✅ Trial activated for transporter: ${user.uid}, expires: ${endDate}`);
  }
}
```

---

## Files to Modify

### Backend
1. **adminController.js** - Add trial creation in reviewTransporter()
2. **subscriptionController.js** - Add validateCompanySubscription()
3. **driverController.js** / **jobController.js** - Add subscription validation before operations
4. **Subscribers.js** model - Ensure hasUsedTrial() works for both Subscribers tables

### Frontend
1. **App.tsx** - Update subscription check messaging
2. **SubscriptionTrialScreen.tsx** - Update messaging for auto-activated trials
3. **TransporterHomeScreen.tsx** - Add subscription expiry warning
4. **ManageTransporterScreen.tsx** - Show subscription status
5. **Driver job acceptance screens** - Check subscription before allowing operations

---

## Testing Scenarios

### Scenario 1: Auto-Trial Activation
1. Company transporter signs up ✓
2. Admin approves all documents ✓
3. Trial should be created with 90-day expiry
4. Frontend should show "90 days remaining"

### Scenario 2: Trial Already Used
1. Company transporter 1 signs up, uses 90-day trial, expires
2. Company transporter 2 (same user) tries to re-register
3. Backend should check `hasUsedTrial()` = true
4. NO new trial created, prompt to upgrade

### Scenario 3: Driver Operations with Active Trial
1. Company has active trial
2. Driver assigned, vehicle assigned
3. Driver can accept jobs ✓

### Scenario 4: Driver Operations with Expired Trial
1. Company trial expired on Apr 28
2. Driver tries to accept job on Apr 29
3. Backend rejects: "Company subscription expired"
4. Driver sees: "Company subscription expired, contact admin"

### Scenario 5: Renewal Before Expiry
1. Trial expires Apr 28 (10 days remaining)
2. Company pays for plan on Apr 25
3. New subscription created, starts Apr 25
4. Old trial is replaced
5. Days remaining reset to plan duration

---

## Current State vs. Desired State

| Aspect | Current (Transporter) | Desired |
|--------|----------------------|---------|
| Auto-Trial on Approval | ❌ No | ✅ Yes |
| Trial Duration | Manual | 90 days (automatic) |
| Days Shown | N/A | ✅ In dashboard |
| Expiry Routing | N/A | ✅ To SubscriptionExpiredScreen |
| Driver Validation | ❌ No check | ✅ Check before ops |
| Broker (Reference) | ✅ Works | ✅ Already correct |

---

## Summary

**Root Cause:** Trial subscription creation is NOT automatic when admin approves transporters, unlike brokers.

**Fix Required:** Add same auto-trial activation logic from `brokerController.reviewBroker()` to `adminController.reviewTransporter()`.

**Impact:** Once fixed, users will have seamless trial experience without manual activation or confusion.

