# Complete Trial Activation Flow for Transporters & Brokers

**Date:** January 27, 2026  
**Status:** IMPLEMENTATION ROADMAP  
**Priority:** CRITICAL - Driver Operations Depend on This

---

## Table of Contents
1. [Flow Overview](#flow-overview)
2. [Role-Specific Flows](#role-specific-flows)
3. [Backend Requirements](#backend-requirements)
4. [Frontend Implementation](#frontend-implementation)
5. [Driver Dependency Logic](#driver-dependency-logic)
6. [State Transitions](#state-transitions)
7. [Error Handling](#error-handling)

---

## Flow Overview

### The Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                    SIGNUP & APPROVAL PHASE                   │
└─────────────────────────────────────────────────────────────┘

1. USER SIGNS UP (Transporter or Broker)
   └─ Frontend: Create account
   └─ Backend: Create user record in Firestore
   └─ Status: `isVerified = false`

2. USER SUBMITS COMPANY PROFILE (Transporter Only)
   └─ Frontend: TransporterCompletionScreen
   └─ Backend: Create company record
   └─ Status: `status = 'pending'` or `'under_review'`

3. ADMIN APPROVES USER/COMPANY
   └─ Backend: Update status to `'approved'`
   └─ Firestore: Set `isVerified = true`
   └─ TRIGGER: CREATE TRIAL SUBSCRIPTION AUTOMATICALLY
   
┌─────────────────────────────────────────────────────────────┐
│              AUTO-CREATED TRIAL SUBSCRIPTION                 │
└─────────────────────────────────────────────────────────────┘

4. BACKEND AUTO-CREATES TRIAL SUBSCRIPTION
   └─ Plan: Free trial plan (price = 0)
   └─ Duration: 90 days
   └─ Start Date: Current timestamp
   └─ End Date: Current + 90 days
   └─ Status: 'active'
   └─ Auto-Renew: false

5. FRONTEND DETECTS SUBSCRIPTION STATUS
   └─ On App.tsx onAuthStateChanged:
      └─ Check isVerified = true
      └─ Check subscription status
      └─ If hasActiveSubscription = true
         └─ Route to role-appropriate dashboard
      
┌─────────────────────────────────────────────────────────────┐
│                    ACTIVE PHASE (90 DAYS)                    │
└─────────────────────────────────────────────────────────────┘

6. USER VIEWS DASHBOARD
   └─ Frontend: TransporterTabs or BrokerTabs
   └─ Display: "Trial: XX days remaining"
   └─ Transporter: Can recruit drivers
   └─ Driver: Depends on company subscription
   
┌─────────────────────────────────────────────────────────────┐
│                    EXPIRY DETECTION                          │
└─────────────────────────────────────────────────────────────┘

7. MONITOR SUBSCRIPTION STATUS
   └─ Frontend: Check remaining days
   └─ Backend: Calculate: daysRemaining = (endDate - now) / (1000*60*60*24)
   └─ When days ≤ 0:
      └─ Status changes to 'expired'
   
8. USER SEES EXPIRY SCREEN
   └─ Frontend: SubscriptionExpiredScreen
   └─ Message: "Your subscription has expired"
   └─ Action: "Renew Subscription" button
   └─ Navigate to: Plan selection screen
   
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT & RENEWAL                         │
└─────────────────────────────────────────────────────────────┘

9. USER PURCHASES PLAN
   └─ Frontend: Select plan
   └─ Transporter: Choose from COMPANY_FLEET_PLANS
   └─ Broker: Choose from BROKER_PLANS
   └─ Payment: M-PESA or Card
   
10. NEW SUBSCRIPTION CREATED
    └─ Plan: Selected paid plan
    └─ Duration: Based on billing period
    └─ Status: 'active' (after payment confirmed)
    └─ Auto-Renew: true (on payment method update)

11. DRIVER OPERATIONS ENABLED
    └─ Frontend: Can now recruit/manage drivers
    └─ Driver: Can accept jobs
    └─ Company: All features active
```

---

## Role-Specific Flows

### Transporter (Company) Flow

```
SIGNUP
  ↓
[Phone OTP Verification]
  ↓
[Email Verification]
  ↓
TransporterCompletionScreen (Company Profile)
  ├─ Company Name
  ├─ Contact Number
  ├─ Company Logo
  └─ (Registration Number - Optional)
  ↓
TransporterProcessingScreen (Waiting for Approval)
  ├─ Status: "pending" or "under_review"
  ├─ Message: "We're reviewing your application"
  └─ Auto-refresh status
  ↓
[ADMIN APPROVAL] → Backend auto-creates trial
  ↓
TransporterTabs (Dashboard)
  ├─ "Free Trial: 90 days remaining"
  ├─ Can recruit drivers
  ├─ Can assign vehicles
  └─ Can manage bookings
  ↓
[DAY 89, 88, ... 1] → Display remaining days
  ↓
[EXPIRY] → SubscriptionExpiredScreen
  ├─ "Trial expired"
  ├─ Cannot recruit new drivers
  ├─ Existing drivers can finish jobs
  └─ [Renew Subscription] button
  ↓
[SELECT PLAN] → Payment Screen
  ├─ BASIC_FLEET (5 drivers)
  ├─ GROWING_FLEET (15 drivers, 20% discount)
  └─ UNLIMITED_FLEET (unlimited drivers)
  ↓
[PAYMENT] → New subscription created
  ↓
TransporterTabs (Active Again)
  └─ "Plan: GROWING_FLEET - Active until [DATE]"
```

### Broker Flow

```
SIGNUP
  ↓
[Email Verification]
  ├─ Email code sent
  └─ User verifies email
  ↓
[Phone Verification]
  ├─ SMS code sent
  └─ User verifies phone
  ↓
VerifyIdentificationDocumentScreen (Broker Verification)
  ├─ ID Document upload
  ├─ Business registration (optional)
  └─ Face verification (optional)
  ↓
[ADMIN APPROVAL] → Backend auto-creates trial
  ↓
BrokerTabs (Dashboard)
  ├─ "Free Trial: 90 days remaining"
  ├─ Can create client requests
  ├─ Can consolidate requests
  └─ Can manage shipments
  ↓
[EXPIRY] → SubscriptionExpiredScreen
  ├─ "Trial expired"
  ├─ Cannot create new requests
  └─ [Renew Subscription] button
  ↓
[SELECT PLAN] → Payment Screen
  ├─ MONTHLY (KES 199)
  ├─ QUARTERLY (KES 499, save 98)
  └─ YEARLY (KES 1599, save 789)
  ↓
[PAYMENT] → New subscription created
  ↓
BrokerTabs (Active Again)
  └─ Plan active for selected period
```

---

## Backend Requirements

### 1. Admin Approval Endpoint

**Endpoint:** `PATCH /api/transporters/{transporterId}/approve` or `PATCH /api/brokers/{brokerId}/approve`

**Implementation:**
```javascript
async approveTransporter(transporterId) {
  // Step 1: Update transporter status
  await db.collection('companies').doc(transporterId).update({
    status: 'approved'
  });

  // Step 2: Get user associated with this transporter
  const userDoc = await db.collection('users')
    .where('companyId', '==', transporterId)
    .limit(1)
    .get();
  
  const userId = userDoc.docs[0].id;

  // Step 3: Update user verification status
  await db.collection('users').doc(userId).update({
    isVerified: true,
    verifiedAt: new Date().toISOString(),
    role: 'transporter'
  });

  // Step 4: CREATE TRIAL SUBSCRIPTION AUTOMATICALLY
  const trialPlan = await db.collection('plans')
    .where('price', '==', 0)
    .where('type', '==', 'trial')
    .limit(1)
    .get();
  
  const planId = trialPlan.docs[0].id;
  const now = new Date();
  const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  await db.collection('subscriptions').add({
    userId: userId,
    planId: planId,
    status: 'active',
    isTrial: true,
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    trialDaysRemaining: 90,
    autoRenew: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  });

  // Step 5: Send notification
  await NotificationService.sendNotification(userId, {
    type: 'trial_activated',
    title: 'Your Trial Has Been Activated',
    message: 'Enjoy 90 days of free access to TRUKAPP features',
    data: { trialDaysRemaining: 90 }
  });
}
```

### 2. Subscription Status Calculation

**Where:** Backend `/api/subscriptions/subscriber/status`

**Implementation:**
```javascript
async getSubscriptionStatus(userId) {
  const subscription = await db.collection('subscriptions')
    .where('userId', '==', userId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (!subscription.docs.length) {
    return {
      hasActiveSubscription: false,
      isTrialActive: false,
      needsTrialActivation: false,
      subscriptionStatus: 'none'
    };
  }

  const sub = subscription.docs[0].data();
  const now = new Date().getTime();
  const endDate = new Date(sub.endDate).getTime();
  const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    // Subscription expired - update status
    await subscription.docs[0].ref.update({
      status: 'expired'
    });
    
    return {
      hasActiveSubscription: false,
      isTrialActive: false,
      subscriptionStatus: 'expired',
      daysRemaining: 0
    };
  }

  const plan = await db.collection('plans').doc(sub.planId).get();

  return {
    hasActiveSubscription: true,
    isTrialActive: sub.isTrial === true,
    subscriptionStatus: 'active',
    daysRemaining: daysRemaining,
    currentPlan: {
      id: plan.id,
      name: plan.data().name,
      price: plan.data().price,
      features: plan.data().features
    },
    isTrial: sub.isTrial
  };
}
```

### 3. Driver Operations Validation

**Endpoint:** `POST /api/companies/{companyId}/drivers` (before creating driver)

**Implementation:**
```javascript
async validateCompanyCanAddDriver(companyId, userId) {
  // Step 1: Check if company owner
  const company = await db.collection('companies').doc(companyId).get();
  const owner = await db.collection('users')
    .where('companyId', '==', companyId)
    .where('role', '==', 'transporter')
    .limit(1)
    .get();

  if (!owner.docs.length) {
    throw new Error('Company not found or user is not company owner');
  }

  const ownerId = owner.docs[0].id;

  // Step 2: Check subscription status
  const subscriptionResponse = await this.getSubscriptionStatus(ownerId);

  if (!subscriptionResponse.hasActiveSubscription && !subscriptionResponse.isTrialActive) {
    throw new Error('Company subscription expired. Please renew to add drivers.');
  }

  // Step 3: Check driver limit based on plan
  if (subscriptionResponse.isTrialActive) {
    // Trial allows 3 drivers
    const currentDrivers = await db.collection('drivers')
      .where('companyId', '==', companyId)
      .where('status', '!=', 'deleted')
      .get();
    
    if (currentDrivers.docs.length >= 3) {
      throw new Error('Trial plan limited to 3 drivers. Upgrade to add more.');
    }
  } else {
    // Check paid plan limits
    const plan = subscriptionResponse.currentPlan;
    if (plan.limits.drivers !== -1) { // -1 = unlimited
      const currentDrivers = await db.collection('drivers')
        .where('companyId', '==', companyId)
        .get();
      
      if (currentDrivers.docs.length >= plan.limits.drivers) {
        throw new Error(`Your ${plan.name} plan is limited to ${plan.limits.drivers} drivers.`);
      }
    }
  }

  return true;
}
```

---

## Frontend Implementation

### 1. App.tsx Integration

**Location:** Lines 279-400 (Current routing logic)

**What's Missing:**
```typescript
// AFTER user verification status is loaded, check subscription
if (isVerified && role === 'transporter') {
  // BEFORE deciding navigation, check subscription status
  const subStatus = await checkSubscriptionStatus(user.uid, 'transporter');
  
  if (!subStatus.hasActiveSubscription && !subStatus.isTrialActive) {
    // Trial not created yet or already expired
    // Route to SubscriptionTrialScreen or SubscriptionExpiredScreen
  } else if (subStatus.isTrialActive) {
    // Trial active - show days remaining
    // Route to TransporterTabs with trial info
  }
}
```

### 2. TransporterProcessingScreen Enhancement

**Current:** Shows "Waiting for admin approval"  
**Needed:** Auto-refresh subscription status when approved

```typescript
// Add polling in useEffect
useEffect(() => {
  const checkSubscriptionTimer = setInterval(async () => {
    const status = await subscriptionService.getSubscriptionStatus();
    
    if (status.hasActiveSubscription || status.isTrialActive) {
      // Trial was auto-created! Navigate to dashboard
      navigation.reset({
        index: 0,
        routes: [{ name: 'TransporterTabs' }]
      });
    }
  }, 5000); // Check every 5 seconds
  
  return () => clearInterval(checkSubscriptionTimer);
}, []);
```

### 3. Dashboard Header Enhancement

**Location:** TransporterTabs / BrokerTabs

**Show:**
```typescript
if (subscriptionStatus.isTrialActive) {
  return (
    <TrialBanner
      daysRemaining={subscriptionStatus.daysRemaining}
      onUpgrade={() => navigation.navigate('SubscriptionScreen')}
    />
  );
} else if (subscriptionStatus.hasActiveSubscription) {
  return (
    <PaidSubscriptionBanner
      planName={subscriptionStatus.currentPlan.name}
      expiryDate={subscriptionStatus.expiryDate}
    />
  );
}
```

### 4. Driver Recruitment Guard

**Location:** Before `POST /api/companies/{companyId}/drivers`

```typescript
async handleRecruitDriver(jobSeekerId) {
  const subStatus = await subscriptionService.getSubscriptionStatus();
  
  if (!subStatus.hasActiveSubscription && !subStatus.isTrialActive) {
    Alert.alert(
      'Subscription Expired',
      'Please renew your subscription to recruit drivers.',
      [
        { text: 'Renew', onPress: () => navigation.navigate('SubscriptionScreen') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
    return;
  }
  
  if (subStatus.isTrialActive && driverCount >= 3) {
    Alert.alert(
      'Trial Limit Reached',
      'Trial plan allows up to 3 drivers. Upgrade to add more.',
      [
        { text: 'Upgrade', onPress: () => navigation.navigate('SubscriptionScreen') }
      ]
    );
    return;
  }
  
  // Proceed with recruitment
  await apiRequest('/api/companies/{companyId}/drivers', {
    method: 'POST',
    body: JSON.stringify({ jobSeekerId })
  });
}
```

---

## Driver Dependency Logic

### How Drivers Depend on Company Subscription

```typescript
// 1. DRIVER RECRUITMENT
Can recruit only if:
  ✓ Company has active subscription (trial or paid)
  ✓ Not exceeded driver limit for plan
  ✓ Job seeker is approved

// 2. DRIVER JOB ACCESS
Driver can accept jobs only if:
  ✓ Assigned to a vehicle
  ✓ Company has active subscription
  ✓ Company not exceeded vehicle limit

// 3. DRIVER JOB COMPLETION
Driver can complete job only if:
  ✓ Started before subscription expiry
  ✓ Company can still track (if mid-job)

// 4. ON SUBSCRIPTION EXPIRY
  • Cannot recruit NEW drivers
  • Existing drivers can FINISH current jobs
  • Cannot START new jobs
  • After 7 days: drivers inactive
```

### Implementation in Driver Jobs Screen

```typescript
async handleAcceptJob(jobId) {
  // 1. Get company subscription
  const subStatus = await subscriptionService.getSubscriptionStatus();
  
  if (!subStatus.hasActiveSubscription && !subStatus.isTrialActive) {
    Alert.alert(
      'Cannot Accept Job',
      'Company subscription expired. Manager must renew.',
      [{ text: 'OK' }]
    );
    return;
  }
  
  if (subStatus.isTrialActive && subStatus.daysRemaining <= 3) {
    // Warning for expiry soon
    Alert.alert(
      'Trial Expiring Soon',
      `Only ${subStatus.daysRemaining} days left. Manager will need to renew.`,
      [
        { text: 'Accept Anyway', onPress: () => acceptJob(jobId) },
        { text: 'Cancel' }
      ]
    );
    return;
  }
  
  // Proceed with job acceptance
  await acceptJob(jobId);
}
```

---

## State Transitions

### Subscription States

```
┌──────────────────────────────────────────────────────────────┐
│                    SUBSCRIPTION STATES                        │
└──────────────────────────────────────────────────────────────┘

'none'
  ├─ No subscription exists
  └─ Action: Create trial (admin) or purchase plan (user)
      ↓
'pending'
  ├─ Trial being created or payment processing
  ├─ Show: Loading state
  └─ Action: Wait for backend processing
      ↓
'active'
  ├─ Has valid subscription
  ├─ Show: "Trial: 45 days remaining" OR "Plan: Expires Jan 30"
  └─ Actions: Use all features
      ├─ daysRemaining > 7: Normal operations
      ├─ daysRemaining ≤ 7: Show warning "Days remaining"
      └─ daysRemaining ≤ 0: Transition to 'expired'
          ↓
'expired'
  ├─ Subscription past end date
  ├─ Show: SubscriptionExpiredScreen
  └─ Actions: Renew subscription
      ↓
'cancelled'
  ├─ User cancelled subscription
  ├─ Access: Can still use until next renewal
  └─ Action: Reactivate if within cancellation window
      ↓
'none' (cycle repeats)
```

---

## Error Handling

### Missing Scenario 1: Admin Forgets to Approve

**Problem:** User signs up, verifies, completes profile → No trial created

**Solution:**
```typescript
// In App.tsx routing logic
if (profileCompleted && isVerified && !hasActiveSubscription) {
  // Check if user is waiting for admin approval
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();
  
  if (userData.role === 'transporter' && userData.status !== 'approved') {
    // Still waiting for approval
    return <TransporterProcessingScreen />;
  } else if (userData.role === 'transporter' && userData.status === 'approved') {
    // Approved but no subscription - this is a bug!
    // Auto-trigger trial creation
    await apiRequest('/api/subscriptions/auto-create-trial', {
      method: 'POST'
    });
  }
}
```

### Missing Scenario 2: Trial Created but Not Detected

**Problem:** Backend created trial, but frontend shows "needs activation"

**Solution:**
```typescript
// In subscriptionService.ts
async getSubscriptionStatus() {
  // If trial check fails, force refresh from backend
  try {
    const status = await fetchFromBackend();
    return status;
  } catch (error) {
    // Network error - try local cache
    const cached = await getCachedStatus();
    if (cached) return cached;
    
    // No cache either - return safe default
    return {
      hasActiveSubscription: false,
      isTrialActive: false,
      needsTrialActivation: false,
      subscriptionStatus: 'error',
      isApiError: true
    };
  }
}
```

### Missing Scenario 3: Driver Recruitment During Expiry

**Problem:** User recruits driver day 89, it expires day 90

**Solution:**
```typescript
async recruitDriver(jobSeekerId) {
  const subStatus = await subscriptionService.getSubscriptionStatus();
  
  // Always re-check subscription immediately before critical action
  const freshStatus = await subscriptionService.fetchFromBackend();
  
  if (!freshStatus.hasActiveSubscription) {
    throw new Error('Subscription expired. Cannot recruit drivers.');
  }
  
  // Proceed with recruitment
}
```

---

## Testing Checklist

### Backend Tests
- [ ] Admin approves transporter → Trial created automatically
- [ ] Admin approves broker → Trial created automatically
- [ ] Trial duration calculated correctly (90 days)
- [ ] Days remaining decreases daily
- [ ] On day 90 expiry, status changes to 'expired'
- [ ] Cannot recruit drivers on expired subscription
- [ ] Can recruit drivers on active subscription
- [ ] Driver limit enforced (3 for trial, plan limit for paid)

### Frontend Tests
- [ ] User sees "Trial: 90 days remaining" after approval
- [ ] Days remaining updates daily
- [ ] On expiry, routed to SubscriptionExpiredScreen
- [ ] Can upgrade to paid plan
- [ ] Driver recruitment blocked on expiry
- [ ] Warning shown when ≤ 7 days remaining
- [ ] Dashboard shows correct plan name
- [ ] Switching between roles maintains subscription state

---

## Summary: What Needs to Happen

### For Trial Auto-Activation to Work:

**Backend:**
1. ✅ Create endpoint: `PATCH /api/transporters/{id}/approve`
2. ✅ Automatically create trial subscription in that endpoint
3. ✅ Calculate 90-day end date correctly
4. ✅ Set status to 'active'
5. ✅ Return subscription details to frontend

**Frontend:**
1. ✅ App.tsx: Detect verified status → check subscription
2. ✅ TransporterProcessingScreen: Poll for subscription creation
3. ✅ Route to TransporterTabs: Show days remaining
4. ✅ On expiry (daysRemaining ≤ 0): Route to SubscriptionExpiredScreen
5. ✅ Driver recruitment: Validate subscription before allowing

---

**Next Steps:**
1. Implement admin approval endpoint with auto trial creation
2. Verify frontend polling works
3. Test end-to-end flow: Signup → Approval → Trial Active
4. Test expiry flow: Day 90 → SubscriptionExpiredScreen
5. Test driver recruitment guards
