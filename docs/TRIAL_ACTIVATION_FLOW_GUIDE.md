# TRUKAPP Trial Activation Flow - Complete Implementation Guide

**Date:** January 27, 2026  
**Status:** Analysis & Documentation Complete  
**Current Implementation:** Hybrid Model (Backend-Driven + Admin-Managed)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current Architecture](#current-architecture)
3. [Trial Activation Flow](#trial-activation-flow)
4. [Key Components & Their Roles](#key-components--their-roles)
5. [State Management](#state-management)
6. [Routing Logic](#routing-logic)
7. [Backend Requirements](#backend-requirements)
8. [Frontend Implementation Status](#frontend-implementation-status)
9. [Issues & Resolutions](#issues--resolutions)
10. [Testing Procedures](#testing-procedures)

---

## Executive Summary

The TRUKAPP trial activation system uses a **hybrid model**:

### Design Philosophy
- **Admin-Driven Creation**: Backend/Admin creates trial subscriptions automatically
- **User-Transparent Activation**: Users see trial status, don't manually activate
- **Automatic Routing**: Frontend detects subscription status and routes appropriately
- **PlayStore Compliant**: Prominent disclosure for paid renewals only

### Current State
✅ **Frontend**: 100% Complete - All components, routing, and UI ready  
❌ **Backend**: Needs full implementation of subscription creation logic  
⏳ **Integration**: Waiting for backend endpoints

---

## Current Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     TRUKAPP Architecture                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend (React Native Expo)          Backend (Node.js)    │
│  ─────────────────────────            ─────────────────     │
│  • App.tsx (Routing)                   • subscriptionController
│  • SubscriptionTrialScreen             • SubscriptionModel  
│  • SubscriptionService                 • Database           │
│  • TransporterProcessingScreen         • Payment Processor  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Firebase Firestore                       │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ users/{uid}                                    │  │  │
│  │  │  ├── role (transporter, broker, etc.)          │  │  │
│  │  │  ├── isVerified (email/phone verified)         │  │  │
│  │  │  ├── profileCompleted                          │  │  │
│  │  │  ├── transporterStatus (approved, pending)     │  │  │
│  │  │  └── transporterType (company, individual)     │  │  │
│  │  │                                                 │  │  │
│  │  │ subscriptions/{subscriberId}                   │  │  │
│  │  │  ├── userId (Firebase UID)                     │  │  │
│  │  │  ├── planId (trial or paid)                    │  │  │
│  │  │  ├── status (active, expired, inactive)        │  │  │
│  │  │  ├── startDate (subscription start)            │  │  │
│  │  │  ├── endDate (expiration date)                 │  │  │
│  │  │  ├── isActive (boolean)                        │  │  │
│  │  │  ├── paymentStatus (pending, completed)        │  │  │
│  │  │  └── transactionId (payment reference)         │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Trial Activation Flow

### Complete User Journey

```
User Signup
    ↓
Select Role (Transporter/Broker)
    ↓
Firebase Auth & Email/Phone Verification
    ↓
Profile Completion (TransporterCompletionScreen)
    ↓
TransporterProcessingScreen (approval check)
    ├─ IF APPROVED
    │  ├─ Check subscription status via API
    │  │  ├─ HAS ACTIVE TRIAL/SUBSCRIPTION → TransporterTabs (Dashboard)
    │  │  ├─ SUBSCRIPTION EXPIRED → SubscriptionExpiredScreen
    │  │  ├─ NO SUBSCRIPTION (needs activation)
    │  │  │  └─ ADMIN CREATES TRIAL AUTOMATICALLY
    │  │  │     └─ User will see trial next time they check status
    │  │  └─ API ERROR → Route to dashboard (admin creates when ready)
    │  │
    │  └─ Navigate to TransporterTabs (Dashboard)
    │     └─ Background location disclosure (if not already consented)
    │
    └─ IF NOT APPROVED → Show processing screen
       └─ Wait for admin approval
          └─ Retry subscription check
```

### Admin Workflow (Backend)

```
User Profile Approved (transporterStatus = 'approved')
    ↓
Admin/Backend System Checks:
    ├─ Does user have existing subscription? → YES → Done
    ├─ Has user already used trial? → YES → Offer paid plan
    └─ First time user? → YES
       ├─ Create trial subscription
       │  ├─ planId: trial_plan_id (price = 0)
       │  ├─ startDate: now
       │  ├─ endDate: now + 90 days
       │  ├─ isActive: true
       │  ├─ paymentStatus: 'pending' (no payment for trial)
       │  └─ status: 'active'
       │
       └─ User will see active trial on next subscription check
```

### Payment Flow (Renewal/Paid Plans)

```
User Wants to Renew or Upgrade
    ↓
SubscriptionExpiredScreen or BrokerHomeScreen
    ↓
[ACTIVATE RENEWAL] Button
    ↓
SubscriptionTrialDisclosureModal (if payment needed)
    ├─ Show prominent terms
    ├─ Show auto-renewal warning
    ├─ Show cancellation instructions
    └─ User accepts/declines
       │
       ├─ ACCEPT
       │  ↓
       │  Select Payment Method (M-PESA or Card)
       │  ↓
       │  Process Payment
       │  │  ├─ M-PESA: Initiate STK push
       │  │  └─ Card: Process via Stripe
       │  │
       │  └─ Payment Success → Create Subscription → Dashboard
       │
       └─ DECLINE
          ↓
          Return to payment method selection
          (No charge, user can try different method)
```

---

## Key Components & Their Roles

### 1. **SubscriptionService** (`subscriptionService.ts`)

**Responsibilities:**
- Get current subscription status from backend
- Cache subscription status (30-second TTL)
- Prevent race conditions with pending requests
- Format subscription data for UI
- Manage retry logic

**Key Methods:**

```typescript
// Get subscription status with caching
async getSubscriptionStatus(): Promise<SubscriptionStatus>

// Fetch from backend with retry logic
private async fetchSubscriptionStatus(userId: string): Promise<SubscriptionStatus>

// Activate trial (for manual activation if needed)
async activateTrial(userType: 'transporter' | 'broker'): Promise<...>

// Clear cache
clearCache(userId?: string): void

// Check trial eligibility
async checkTrialEligibility(): Promise<{needsTrial, canActivate}>
```

**Current Behavior:**
- Checks `/api/subscriptions/subscriber/status` endpoint
- Returns complete subscription details
- Handles API errors gracefully
- Returns fallback status if API unavailable

### 2. **App.tsx** (Main Routing)

**Responsibilities:**
- Listen to Firebase Auth state changes
- Fetch user data from Firestore
- Check subscription status for verified users
- Route users based on role, verification, and subscription status
- Handle global background location disclosure

**Key Routing Logic:**

```typescript
// For transporters with approved profiles:
const hasActiveSubscription = subscriptionStatus?.hasActiveSubscription === true;
const isTrialActive = subscriptionStatus?.isTrialActive === true;
const needsTrialActivation = subscriptionStatus?.needsTrialActivation === true;
const isExpired = subscriptionStatus?.subscriptionStatus === 'expired';

// Route decisions:
if (isExpired) → SubscriptionExpiredScreen
else if (needsTrialActivation) → TransporterTabs (admin will create)
else if (hasActiveSubscription || isTrialActive) → TransporterTabs
else → TransporterTabs (admin will create)
```

### 3. **SubscriptionTrialScreen** (`SubscriptionTrialScreen.tsx`)

**Responsibilities:**
- Display trial status to user
- Show available plans (for renewals)
- Not for initial trial activation (admin-driven)
- Used for paid plan upgrades/renewals
- Integrates with SubscriptionTrialDisclosureModal

**Current Implementation:**
- Shows benefits and features
- Indicates admin creates trial
- Routes to SubscriptionTrialDisclosureModal for paid plans
- Displays plan options for renewals

### 4. **TransporterProcessingScreen** (`TransporterProcessingScreen.tsx`)

**Responsibilities:**
- Check subscription status after profile approval
- Route to appropriate next screen based on subscription
- Handle errors gracefully
- Provide retry mechanism

**Logic Flow:**

```typescript
if (has active subscription) → TransporterTabs
else if (expired) → SubscriptionExpiredScreen
else if (needs activation) → SubscriptionTrial
else → TransporterTabs (admin creates)
```

### 5. **SubscriptionTrialDisclosureModal** (New Component)

**Responsibilities:**
- Show prominent trial terms before payment
- Explain auto-renewal explicitly
- Provide cancellation instructions
- Get explicit user consent
- Required for PlayStore compliance

**Display Conditions:**
- Only for PAID plans (price > 0)
- Only for RENEWAL/UPGRADE (not initial trial)
- Only if user proceeds with payment

---

## State Management

### Subscription Status Object

```typescript
interface SubscriptionStatus {
  // Trial indicators
  hasActiveSubscription: boolean;    // Has paid subscription
  isTrialActive: boolean;             // Active trial period
  needsTrialActivation: boolean;      // Needs trial to be created
  
  // Details
  currentPlan: SubscriptionPlan | null;
  daysRemaining: number;              // Days until expiration
  subscriptionStatus: 'active' | 'expired' | 'trial' | 'none' | 'inactive';
  subscription?: any;                 // Raw subscription object
  
  // Trial-specific
  isTrial?: boolean;
  trialDaysRemaining?: number;
  
  // Timestamps
  // (startDate, endDate typically in subscription object)
}
```

### State Flow in App.tsx

```
onAuthStateChanged (Firebase Auth)
    ↓
Fetch user from Firestore
    ↓
Check verification status
    ↓
FOR TRANSPORTERS/BROKERS:
    Check subscription status
    ↓
    Store in subscriptionStatus state
    ↓
    Routing decision based on:
    ├─ profileCompleted
    ├─ transporterStatus
    ├─ hasActiveSubscription
    ├─ isTrialActive
    ├─ subscriptionStatus (active/expired/none)
    └─ isApiError
```

### Subscription Status Check Interval

```typescript
// Every 5 seconds for transporters/brokers
const subscriptionCheckInterval = setInterval(async () => {
  const currentStatus = await checkSubscriptionStatus(user.uid, role);
  setSubscriptionStatus(currentStatus);
}, 5000);
```

---

## Routing Logic

### Transporter Route Decision Tree

```
User is TRANSPORTER and VERIFIED
    ├─ Profile NOT Complete
    │  └─ → TransporterCompletionScreen
    │
    ├─ Profile Complete, NOT Approved (pending/under_review)
    │  └─ → TransporterProcessingScreen
    │
    └─ Profile Complete AND Approved
       └─ Check Subscription Status
          │
          ├─ API ERROR
          │  └─ → TransporterTabs (admin will create)
          │
          ├─ EXPIRED
          │  └─ → SubscriptionExpiredScreen
          │
          ├─ NO SUBSCRIPTION (needsTrialActivation OR no active sub)
          │  └─ → TransporterTabs (admin will create, user sees it soon)
          │
          └─ HAS ACTIVE (active or trial)
             └─ If Driver
                └─ → DriverTabs
                Else
                └─ → TransporterTabs
```

### Broker Route Decision Tree

```
User is BROKER and VERIFIED
    ├─ NOT Verified (docs not approved)
    │  └─ → VerifyIdentificationDocumentScreen
    │
    └─ Verified
       └─ Check Subscription Status
          │
          ├─ EXPIRED
          │  └─ → SubscriptionExpiredScreen
          │
          ├─ NO SUBSCRIPTION (needsTrialActivation)
          │  └─ → SubscriptionTrialScreen
          │     (Disclosure shown if proceeding with payment)
          │
          └─ HAS ACTIVE (active or trial)
             └─ → BrokerTabs
```

---

## Backend Requirements

### Critical API Endpoints Needed

#### 1. **Get Subscription Status**
```
GET /api/subscriptions/subscriber/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasActiveSubscription": true,
    "isTrialActive": false,
    "needsTrialActivation": false,
    "currentPlan": {
      "id": "individual_pro",
      "name": "Pro Plan",
      "price": 599,
      "duration": 30
    },
    "daysRemaining": 25,
    "subscriptionStatus": "active",
    "subscriber": {
      "id": "sub_123",
      "userId": "user_uid",
      "planId": "individual_pro",
      "status": "active",
      "startDate": "2026-01-01T00:00:00Z",
      "endDate": "2026-02-01T00:00:00Z",
      "isActive": true,
      "paymentStatus": "completed"
    }
  }
}
```

#### 2. **Create Subscription (Admin Endpoint)**
```
POST /api/subscriptions/subscriber
```

**Request:**
```json
{
  "userId": "user_uid",
  "planId": "trial_plan_90d",
  "paymentStatus": "pending",
  "autoRenew": false
}
```

**Automatically:**
- Set startDate to current time
- Set endDate to startDate + plan.trialDays (90)
- Set isActive to true
- Set status to 'active'

#### 3. **Process Payment (Renewal/Upgrade)**
```
POST /api/subscriptions/subscriber/pay
```

**Request:**
```json
{
  "planId": "individual_pro",
  "paymentMethod": "mpesa",
  "phoneNumber": "+254712345678"
}
```

#### 4. **Get Plans**
```
GET /api/subscriptions
```

**Returns:** Array of SubscriptionPlan objects

### Key Backend Logic

#### Trial Creation Trigger
```typescript
// When transporter profile is approved:
if (transporterStatus === 'approved' && !hasSubscription) {
  // Check if trial already used
  if (!userHasUsedTrialBefore) {
    // Create trial subscription automatically
    const trialPlan = getTrialPlan(); // price = 0
    const subscription = {
      userId: user.uid,
      planId: trialPlan.id,
      startDate: Date.now(),
      endDate: Date.now() + (90 * 24 * 60 * 60 * 1000), // 90 days
      isActive: true,
      paymentStatus: 'pending', // No payment for trial
      status: 'active',
      autoRenew: false
    };
    
    return subscriptionCollection.add(subscription);
  }
}
```

#### Subscription Status Calculation
```typescript
function getSubscriptionStatus(subscription) {
  if (!subscription) {
    return {
      hasActiveSubscription: false,
      isTrialActive: false,
      needsTrialActivation: true,
      subscriptionStatus: 'none'
    };
  }
  
  const now = Date.now();
  const isExpired = subscription.endDate < now;
  const isPriceZero = subscription.plan.price === 0;
  
  if (isExpired) {
    return {
      hasActiveSubscription: false,
      isTrialActive: false,
      needsTrialActivation: false,
      subscriptionStatus: 'expired',
      daysRemaining: 0
    };
  }
  
  return {
    hasActiveSubscription: !isPriceZero && subscription.isActive,
    isTrialActive: isPriceZero && subscription.isActive,
    needsTrialActivation: false,
    subscriptionStatus: 'active',
    daysRemaining: Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24))
  };
}
```

---

## Frontend Implementation Status

### ✅ Completed Features

| Component | Status | Details |
|-----------|--------|---------|
| **SubscriptionService** | ✅ Complete | Full status checking, retry logic, caching |
| **App.tsx Routing** | ✅ Complete | All role-based routing logic implemented |
| **TransporterProcessingScreen** | ✅ Complete | Status check and routing |
| **SubscriptionTrialScreen** | ✅ Complete | Display trial status, plan selection |
| **SubscriptionExpiredScreen** | ✅ Complete | Renewal flow |
| **SubscriptionTrialDisclosureModal** | ✅ Complete | PlayStore compliance |
| **Background Location Disclosure** | ✅ Complete | PlayStore compliance |
| **State Management** | ✅ Complete | Proper state handling and caching |
| **Error Handling** | ✅ Complete | Graceful fallbacks, retry logic |

### 🔧 Configuration Files

| File | Status |
|------|--------|
| `subscriptionPlans.ts` | ✅ Complete with all plans |
| `api.ts` | ✅ Endpoints configured |
| `subscriptionService.ts` | ✅ Full implementation |
| `App.tsx` | ✅ Complete routing logic |
| `eas.json` | ✅ All profiles configured |

---

## Issues & Resolutions

### Issue #1: Trial Duration Confusion
**Problem:** Comments mentioned "CRITICAL: Never change trial duration from 90 days"  
**Solution:** Trial duration is backend-driven via `plan.trialDays`  
**Current:** Frontend expects 90 days (calculated from endDate - startDate)  
**Resolution:** Backend automatically sets endDate = startDate + 90 days

### Issue #2: Admin Creates vs User Activates
**Problem:** Original implementation had user-activated trials  
**Solution:** Changed to admin-driven creation  
**Why:** Better control, prevents activation errors, simpler UX  
**Current:** Backend creates trial automatically when profile is approved

### Issue #3: Subscription Status Not Updating
**Problem:** Frontend cached subscription for 30 seconds  
**Solution:** Added 5-second check interval for transporters/brokers  
**Current:** Subscription status refreshes every 5 seconds while user is on app

### Issue #4: Multiple Routing Checks
**Problem:** App.tsx checked subscription in multiple places  
**Solution:** Unified routing logic in main auth listener  
**Current:** Single source of truth for subscription routing

### Issue #5: Error Handling Gaps
**Problem:** API errors could leave users in inconsistent state  
**Solution:** Graceful fallback routing (assume admin will create)  
**Current:** Routes to dashboard when API errors, user checks again in 5s

---

## Testing Procedures

### Unit Tests

#### 1. Subscription Status Checking
```typescript
describe('SubscriptionService', () => {
  it('should return trial status when subscription is trial', async () => {
    // Mock API response
    const mockStatus: SubscriptionStatus = {
      hasActiveSubscription: false,
      isTrialActive: true,
      needsTrialActivation: false,
      subscriptionStatus: 'active',
      daysRemaining: 45
    };
    
    const status = await subscriptionService.getSubscriptionStatus();
    expect(status.isTrialActive).toBe(true);
    expect(status.daysRemaining).toBe(45);
  });
  
  it('should cache subscription status', async () => {
    // First call - should fetch
    await subscriptionService.getSubscriptionStatus();
    // Second call within 30s - should use cache
    await subscriptionService.getSubscriptionStatus();
    // Should have made only 1 API call
  });
  
  it('should handle API errors gracefully', async () => {
    // Mock API error
    const status = await subscriptionService.getSubscriptionStatus();
    expect(status.needsTrialActivation).toBe(true); // Fallback
  });
});
```

#### 2. Routing Logic
```typescript
describe('App.tsx Routing', () => {
  it('should route approved transporter with trial to dashboard', () => {
    // Setup: transporter, verified, profile approved, trial active
    // Expected: TransporterTabs
  });
  
  it('should route approved transporter without subscription to dashboard', () => {
    // Setup: transporter, verified, profile approved, no subscription
    // Expected: TransporterTabs (admin will create)
  });
  
  it('should route expired subscription to expired screen', () => {
    // Setup: transporter, verified, profile approved, subscription expired
    // Expected: SubscriptionExpiredScreen
  });
});
```

### Integration Tests

#### 1. Complete Trial Flow
```typescript
describe('Trial Activation Flow', () => {
  it('should complete full flow: signup → approval → trial', async () => {
    // 1. User signs up
    // 2. Admin approves profile
    // 3. Backend creates trial subscription
    // 4. Frontend detects trial on next subscription check
    // 5. User routed to TransporterTabs
  });
});
```

#### 2. Renewal Flow
```typescript
describe('Subscription Renewal Flow', () => {
  it('should show expired screen when subscription expired', async () => {
    // 1. User has expired subscription
    // 2. Frontend detects expiration
    // 3. Routes to SubscriptionExpiredScreen
    // 4. User can upgrade
  });
  
  it('should show disclosure modal for paid renewal', async () => {
    // 1. User clicks renew
    // 2. Selects payment method
    // 3. Disclosure modal appears
    // 4. User accepts → Payment
    // 5. Subscription created
  });
});
```

### E2E Tests (Manual)

#### Test Case 1: Transporter Trial Activation
**Steps:**
1. Sign up as transporter
2. Complete profile
3. Wait for admin approval (manually approve in Firebase)
4. Refresh app
5. Verify subscription status shows trial active
6. Check daysRemaining = 90

**Expected:** Dashboard accessible, background location disclosure shown

#### Test Case 2: Broker Trial Renewal
**Steps:**
1. Sign up as broker
2. Complete identification
3. Wait for approval
4. Check subscription status (should show needs activation)
5. Click "Activate Trial"
6. Disclosure modal appears
7. Select payment method
8. Complete payment
9. Verify subscription active

**Expected:** BrokerTabs accessible after payment

#### Test Case 3: Expired Subscription
**Steps:**
1. Create subscription with endDate = yesterday (backend)
2. Refresh app
3. Verify routed to SubscriptionExpiredScreen
4. Click "Renew Subscription"
5. Verify SubscriptionTrialScreen appears

**Expected:** Can select plans and proceed with payment

#### Test Case 4: Background Location Disclosure
**Steps:**
1. Complete profile as transporter
2. Profile approved
3. Refresh app
4. Verify background location disclosure appears
5. Accept disclosure
6. Verify disclosure doesn't appear again
7. Clear AsyncStorage
8. Refresh app
9. Verify disclosure appears again

**Expected:** Disclosure shown only once per session

---

## Implementation Timeline

### Phase 1: Backend (Required First)
- [ ] Implement subscription endpoints
- [ ] Create trial creation logic on profile approval
- [ ] Implement subscription status calculation
- [ ] Setup payment processing (M-PESA, Stripe)
- [ ] Database schema for subscriptions

### Phase 2: Integration
- [ ] Connect frontend to backend endpoints
- [ ] Test all routing scenarios
- [ ] Fix any API/frontend mismatches
- [ ] Performance optimization

### Phase 3: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E manual tests
- [ ] Load testing
- [ ] Security testing

### Phase 4: Deployment
- [ ] Internal testing build
- [ ] Beta testing
- [ ] PlayStore submission
- [ ] Production release

---

## Summary

The TRUKAPP trial system is **frontend-complete** and **backend-ready**:

### Frontend Provides:
✅ Complete UI and routing  
✅ State management and caching  
✅ Error handling and fallbacks  
✅ PlayStore compliance (disclosures)  
✅ All user flows implemented  

### Backend Needs To Provide:
❌ Trial creation logic on profile approval  
❌ Subscription status API  
❌ Payment processing  
❌ Subscription database operations  

### Key Principles:
1. **Admin-Driven**: Backend creates trials, not users
2. **Simple UX**: Users just see their status
3. **Resilient**: Graceful fallbacks on errors
4. **Compliant**: PlayStore disclosure requirements met
5. **Cached**: 30-second cache + 5-second refresh for real-time updates

The system is ready for backend implementation!

---

**Questions or Issues?** Reference this guide for complete context.
